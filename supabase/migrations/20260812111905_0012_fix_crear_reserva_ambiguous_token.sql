-- RETURNS TABLE(reserva_id uuid, token uuid) crea variables PL/pgSQL
-- llamadas reserva_id/token en todo el cuerpo de la función, que chocaban
-- con la columna reservas.token dentro de "returning id, token" — se
-- cualifican las columnas para desambiguar.
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
    returning clientes.id into v_cliente_id;

  begin
    insert into reservas (cliente_id, inicio, fin, precio_total_cents, notas)
      values (v_cliente_id, p_inicio, v_fin, v_precio, p_notas)
      returning reservas.id, reservas.token into v_reserva_id, v_token;
  exception when exclusion_violation then
    raise exception 'Ese hueco se acaba de ocupar — elige otro' using errcode = '22023';
  end;

  insert into reserva_servicios (reserva_id, servicio_id, precio_cents, duracion_min)
    select v_reserva_id, s.id, s.precio_cents, s.duracion_min
    from servicios s where s.id = any(p_servicio_ids) and s.activo;

  return query select v_reserva_id, v_token;
end;
$$;
