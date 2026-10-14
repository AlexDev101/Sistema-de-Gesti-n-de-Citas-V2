-- Crítico 4 de la revisión del 2 oct 2026.
--
-- Antes: crear_reserva aceptaba cualquier texto como teléfono, sin tope de
-- citas ni de longitud. Con la clave anónima se podía llenar la agenda, y
-- «600 111 222», «600-111-222» y «+34600111222» creaban tres clientes.
--
-- Ahora:
--   * el teléfono se guarda normalizado (solo dígitos, sin +34 / 0034);
--   * la reserva pública exige un teléfono español de 9 dígitos;
--   * un mismo teléfono puede tener 2 citas pendientes como máximo desde la
--     web (decidido por Alex el 2 oct 2026); el barbero puede crear más desde
--     el panel;
--   * nombre, email y notas tienen longitud máxima.

create or replace function public.normalizar_telefono(p text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select regexp_replace(
    regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g'),
    '^(\+34|0034)', ''
  );
$function$;

create or replace function public.crear_reserva(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_servicio_ids uuid[],
  p_inicio timestamp with time zone,
  p_notas text default null::text
)
returns table(reserva_id uuid, token uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cliente_id uuid;
  v_duracion int;
  v_precio int;
  v_fin timestamptz;
  v_cfg configuracion%rowtype;
  v_reserva_id uuid;
  v_token uuid;
  v_email text := nullif(trim(p_email), '');
  v_tel text := normalizar_telefono(p_telefono);
  c_max_pendientes constant int := 2;
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
  if v_tel !~ '^[6-9][0-9]{8}$' then
    raise exception 'Revisa el teléfono: deben ser 9 dígitos' using errcode = '22023';
  end if;
  if length(trim(p_nombre)) > 80
     or length(coalesce(v_email, '')) > 254
     or length(coalesce(p_notas, '')) > 500 then
    raise exception 'Alguno de los textos es demasiado largo' using errcode = '22023';
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

  if (
    select count(*) from reservas r
    join clientes c on c.id = r.cliente_id
    where c.telefono = v_tel and r.estado = 'confirmada' and r.inicio > now()
  ) >= c_max_pendientes then
    raise exception 'Ya tienes % citas pendientes con este teléfono. Cancela una o llama a la barbería.', c_max_pendientes
      using errcode = '22023';
  end if;

  -- Cliente nuevo: se crea con los datos escritos. Cliente existente: no se
  -- toca nada (el `do update` es un no-op, solo está para que RETURNING
  -- devuelva su id). Cambiar nombre o email de una ficha es cosa del barbero.
  insert into clientes (nombre, telefono, email)
    values (trim(p_nombre), v_tel, v_email)
    on conflict (telefono) do update
      set telefono = excluded.telefono
    returning clientes.id into v_cliente_id;

  begin
    insert into reservas (cliente_id, inicio, fin, precio_total_cents, notas, email_contacto)
      values (v_cliente_id, p_inicio, v_fin, v_precio, p_notas, v_email)
      returning reservas.id, reservas.token into v_reserva_id, v_token;
  exception when exclusion_violation then
    raise exception 'Ese hueco se acaba de ocupar — elige otro' using errcode = '22023';
  end;

  insert into reserva_servicios (reserva_id, servicio_id, precio_cents, duracion_min)
    select v_reserva_id, s.id, s.precio_cents, s.duracion_min
    from servicios s where s.id = any(p_servicio_ids) and s.activo;

  return query select v_reserva_id, v_token;
end;
$function$;

-- Panel: misma normalización para que web y panel compartan ficha, pero sin
-- exigir formato español ni tope (el barbero puede apuntar a un extranjero o
-- una tercera cita).
create or replace function public.crear_reserva_admin(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_servicio_ids uuid[],
  p_inicio timestamp with time zone,
  p_notas text default null::text
)
returns table(reserva_id uuid, token uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cliente_id uuid;
  v_duracion int;
  v_precio int;
  v_fin timestamptz;
  v_reserva_id uuid;
  v_token uuid;
  v_email text := nullif(trim(p_email), '');
  v_tel text := normalizar_telefono(p_telefono);
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_servicio_ids is null or array_length(p_servicio_ids, 1) is null then
    raise exception 'Selecciona al menos un servicio' using errcode = '22023';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre' using errcode = '22023';
  end if;
  if coalesce(trim(p_telefono), '') = '' then
    raise exception 'Falta el teléfono' using errcode = '22023';
  end if;
  if v_tel !~ '^\+?[0-9]{9,15}$' then
    raise exception 'Revisa el teléfono: entre 9 y 15 dígitos' using errcode = '22023';
  end if;
  if length(trim(p_nombre)) > 80
     or length(coalesce(v_email, '')) > 254
     or length(coalesce(p_notas, '')) > 500 then
    raise exception 'Alguno de los textos es demasiado largo' using errcode = '22023';
  end if;

  select coalesce(sum(duracion_min), 0), coalesce(sum(precio_cents), 0)
    into v_duracion, v_precio
    from servicios where id = any(p_servicio_ids) and activo;

  if v_duracion = 0 then
    raise exception 'Los servicios seleccionados ya no están disponibles' using errcode = '22023';
  end if;

  v_fin := p_inicio + (v_duracion || ' minutes')::interval;

  insert into clientes (nombre, telefono, email)
    values (trim(p_nombre), v_tel, v_email)
    on conflict (telefono) do update
      set nombre = excluded.nombre,
          email = coalesce(excluded.email, clientes.email)
    returning clientes.id into v_cliente_id;

  begin
    insert into reservas (cliente_id, inicio, fin, precio_total_cents, notas, email_contacto)
      values (v_cliente_id, p_inicio, v_fin, v_precio, p_notas, v_email)
      returning reservas.id, reservas.token into v_reserva_id, v_token;
  exception when exclusion_violation then
    raise exception 'Ese hueco ya está ocupado' using errcode = '22023';
  end;

  insert into reserva_servicios (reserva_id, servicio_id, precio_cents, duracion_min)
    select v_reserva_id, s.id, s.precio_cents, s.duracion_min
    from servicios s where s.id = any(p_servicio_ids) and s.activo;

  return query select v_reserva_id, v_token;
end;
$function$;
