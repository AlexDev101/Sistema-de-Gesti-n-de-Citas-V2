-- Crítico 1 de la revisión del 2 oct 2026.
--
-- Antes: crear_reserva (anónima) hacía `on conflict (telefono) do update` y
-- sobrescribía nombre y email del cliente existente. Quien conociera el
-- teléfono de un cliente podía poner su propio email en la ficha y, al entrar
-- en /cuenta, vincular_cliente_actual le entregaba el historial.
--
-- Ahora: el flujo anónimo nunca modifica un cliente que ya existe. El email
-- que se escribe al reservar se guarda en la propia reserva (email_contacto)
-- y solo sirve para la confirmación y el recordatorio de esa cita.

alter table public.reservas add column if not exists email_contacto text;

comment on column public.reservas.email_contacto is
  'Email escrito al reservar. Solo para avisos de esta cita; no identifica al cliente.';

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

  -- Cliente nuevo: se crea con los datos escritos. Cliente existente: no se
  -- toca nada (el `do update` es un no-op, solo está para que RETURNING
  -- devuelva su id). Cambiar nombre o email de una ficha es cosa del barbero.
  insert into clientes (nombre, telefono, email)
    values (trim(p_nombre), trim(p_telefono), v_email)
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

-- "Nueva cita" del panel: aquí quien escribe es el barbero, así que sigue
-- pudiendo actualizar la ficha. Solo se añade email_contacto a la reserva.
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

  select coalesce(sum(duracion_min), 0), coalesce(sum(precio_cents), 0)
    into v_duracion, v_precio
    from servicios where id = any(p_servicio_ids) and activo;

  if v_duracion = 0 then
    raise exception 'Los servicios seleccionados ya no están disponibles' using errcode = '22023';
  end if;

  v_fin := p_inicio + (v_duracion || ' minutes')::interval;

  insert into clientes (nombre, telefono, email)
    values (trim(p_nombre), trim(p_telefono), v_email)
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

-- /cuenta solo vincula fichas con un email que Supabase Auth haya confirmado.
create or replace function public.vincular_cliente_actual()
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
  v_updated int;
begin
  if auth.uid() is null then
    return false;
  end if;
  select email into v_email from auth.users
    where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then
    return false;
  end if;
  update clientes set user_id = auth.uid()
    where lower(email) = lower(v_email) and user_id is null;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$function$;
