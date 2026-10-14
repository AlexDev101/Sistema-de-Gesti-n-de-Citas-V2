-- crear_reserva — valida horario/cierres/antelación y confía en la restricción
-- EXCLUDE de la tabla `reservas` como fuente de verdad real contra dobles reservas.
create or replace function crear_reserva(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_servicio_ids uuid[],
  p_inicio timestamptz,
  p_notas text default null
)
returns table(reserva_id uuid, token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_duracion int;
  v_precio int;
  v_fin timestamptz;
  v_cfg configuracion%rowtype;
  v_reserva_id uuid;
  v_token uuid;
begin
  if p_servicio_ids is null or array_length(p_servicio_ids, 1) is null then
    raise exception 'Selecciona al menos un servicio' using errcode = '22023';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre' using errcode = '22023';
  end if;
  if coalesce(trim(p_telefono), '') = '' then
    raise exception 'Falta el teléfono' using errcode = '22023';
  end if;

  select coalesce(sum(duracion_min), 0), coalesce(sum(precio_cents), 0)
    into v_duracion, v_precio
    from servicios where id = any(p_servicio_ids) and activo;

  if v_duracion = 0 then
    raise exception 'Los servicios seleccionados ya no están disponibles' using errcode = '22023';
  end if;

  v_fin := p_inicio + (v_duracion || ' minutes')::interval;
  select * into v_cfg from configuracion limit 1;

  if p_inicio < now() + (coalesce(v_cfg.antelacion_min_horas, 2) || ' hours')::interval then
    raise exception 'Ese hueco ya no tiene la antelación mínima requerida' using errcode = '22023';
  end if;
  if p_inicio > now() + (coalesce(v_cfg.antelacion_max_dias, 60) || ' days')::interval then
    raise exception 'Esa fecha está fuera del rango de reserva' using errcode = '22023';
  end if;
  if not exists (
    select 1 from slots_disponibles((p_inicio at time zone 'Europe/Madrid')::date, v_duracion) s
    where s.inicio = p_inicio
  ) then
    raise exception 'Ese hueco ya no está disponible' using errcode = '22023';
  end if;

  insert into clientes (nombre, telefono, email)
    values (trim(p_nombre), trim(p_telefono), nullif(trim(p_email), ''))
    on conflict (telefono) do update
      set nombre = excluded.nombre,
          email = coalesce(excluded.email, clientes.email)
    returning id into v_cliente_id;

  begin
    insert into reservas (cliente_id, inicio, fin, precio_total_cents, notas)
      values (v_cliente_id, p_inicio, v_fin, v_precio, p_notas)
      returning id, token into v_reserva_id, v_token;
  exception when exclusion_violation then
    raise exception 'Ese hueco se acaba de ocupar — elige otro' using errcode = '22023';
  end;

  insert into reserva_servicios (reserva_id, servicio_id, precio_cents, duracion_min)
    select v_reserva_id, s.id, s.precio_cents, s.duracion_min
    from servicios s where s.id = any(p_servicio_ids) and s.activo;

  return query select v_reserva_id, v_token;
end;
$$;

grant execute on function crear_reserva(text, text, text, uuid[], timestamptz, text) to anon, authenticated;

-- lectura pública de una reserva por su token (enlace de gestión sin cuenta)
create or replace function obtener_reserva_por_token(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id,
    'inicio', r.inicio,
    'fin', r.fin,
    'estado', r.estado,
    'precio_total_cents', r.precio_total_cents,
    'notas', r.notas,
    'cliente_nombre', c.nombre,
    'servicios', (
      select jsonb_agg(jsonb_build_object(
        'nombre', s.nombre, 'precio_cents', rs.precio_cents, 'duracion_min', rs.duracion_min
      ) order by s.orden)
      from reserva_servicios rs join servicios s on s.id = rs.servicio_id
      where rs.reserva_id = r.id
    )
  )
  from reservas r join clientes c on c.id = r.cliente_id
  where r.token = p_token;
$$;

grant execute on function obtener_reserva_por_token(uuid) to anon, authenticated;

-- cancelación sin cuenta vía token (política de cancelación en `configuracion`)
create or replace function cancelar_reserva_por_token(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio timestamptz;
begin
  select inicio into v_inicio from reservas where token = p_token and estado in ('confirmada');
  if v_inicio is null then
    raise exception 'Reserva no encontrada o ya cancelada' using errcode = '22023';
  end if;
  update reservas set estado = 'cancelada' where token = p_token;
  return true;
end;
$$;

grant execute on function cancelar_reserva_por_token(uuid) to anon, authenticated;
