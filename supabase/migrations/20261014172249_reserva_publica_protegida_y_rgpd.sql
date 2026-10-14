-- Análisis del 12 oct 2026 — S1 (antispam) y S2 (RGPD).
--
-- S1. El captcha se comprueba en el servidor de Next, pero `crear_reserva`
-- se podía llamar directamente con la clave anon (que va en el navegador),
-- saltándose el captcha. Ahora exige el secreto de servidor: solo la acción
-- de Next, que antes ha validado el captcha, puede crear reservas públicas.
-- Además se limita a 3 reservas por hora desde la misma conexión (`p_origen`
-- es un hash de la IP; la IP en claro no se guarda).
--
-- S2. La reserva exige aceptar el aviso de privacidad y guarda cuándo se
-- aceptó. El barbero puede borrar (anonimizar) a un cliente y el cliente con
-- cuenta puede borrar sus propios datos.

alter table public.reservas add column if not exists origen text;
alter table public.clientes add column if not exists privacidad_aceptada_at timestamptz;
create index if not exists reservas_origen_idx on public.reservas (origen, created_at) where origen is not null;

-- Función nueva (`crear_reserva_publica`) en vez de cambiar la firma de
-- `crear_reserva`: la antigua queda sin EXECUTE para anon y authenticated al
-- final de este fichero, así que ya no sirve como puerta trasera.
create or replace function public.crear_reserva_publica(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_servicio_ids uuid[],
  p_inicio timestamptz,
  p_notas text default null,
  p_secret text default null,
  p_origen text default null,
  p_acepta_privacidad boolean default false
)
returns table (reserva_id uuid, token uuid)
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
  v_email text := nullif(trim(p_email), '');
  v_tel text := normalizar_telefono(p_telefono);
  c_max_pendientes constant int := 2;
  c_max_por_origen_hora constant int := 3;
begin
  if not exists (select 1 from cron_secreto where secreto = p_secret) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not coalesce(p_acepta_privacidad, false) then
    raise exception 'Tienes que aceptar el aviso de privacidad para reservar' using errcode = '22023';
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
  if v_tel !~ '^[6-9][0-9]{8}$' then
    raise exception 'Revisa el teléfono: deben ser 9 dígitos' using errcode = '22023';
  end if;
  if length(trim(p_nombre)) > 80
     or length(coalesce(v_email, '')) > 254
     or length(coalesce(p_notas, '')) > 500 then
    raise exception 'Alguno de los textos es demasiado largo' using errcode = '22023';
  end if;

  if p_origen is not null and (
    select count(*) from reservas
    where origen = p_origen and created_at > now() - interval '1 hour'
  ) >= c_max_por_origen_hora then
    raise exception 'Demasiadas reservas seguidas desde esta conexión. Espera un rato o llama a la barbería.'
      using errcode = '22023';
  end if;

  select coalesce(sum(duracion_min), 0), coalesce(sum(precio_cents), 0)
    into v_duracion, v_precio
    from servicios where id = any(p_servicio_ids) and activo;

  if v_duracion = 0 then
    raise exception 'Los servicios seleccionados ya no están disponibles' using errcode = '22023';
  end if;

  v_fin := p_inicio + make_interval(mins => v_duracion);
  select * into v_cfg from configuracion limit 1;

  if p_inicio < now() + make_interval(hours => coalesce(v_cfg.antelacion_min_horas, 2)) then
    raise exception 'Ese hueco ya no tiene la antelación mínima requerida' using errcode = '22023';
  end if;
  if p_inicio > now() + make_interval(days => coalesce(v_cfg.antelacion_max_dias, 60)) then
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

  -- Cliente nuevo: se crea con los datos escritos. Cliente existente: solo se
  -- anota la aceptación de privacidad si no la tenía; nombre y email de una
  -- ficha existente los cambia el barbero, no quien reserva.
  insert into clientes (nombre, telefono, email, privacidad_aceptada_at)
    values (trim(p_nombre), v_tel, v_email, now())
    on conflict (telefono) do update
      set privacidad_aceptada_at = coalesce(clientes.privacidad_aceptada_at, excluded.privacidad_aceptada_at)
    returning clientes.id into v_cliente_id;

  begin
    insert into reservas (cliente_id, inicio, fin, precio_total_cents, notas, email_contacto, origen)
      values (v_cliente_id, p_inicio, v_fin, v_precio, p_notas, v_email, p_origen)
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

-- ── borrado (anonimización) ──────────────────────────────────────────────────
-- Se anonimiza en vez de borrar la fila: las reservas pasadas siguen contando
-- en las métricas e ingresos, pero ya no apuntan a nadie identificable. Las
-- citas futuras pendientes se cancelan.
create or replace function public.anonimizar_cliente_interno(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update reservas
    set estado = 'cancelada'
    where cliente_id = p_cliente_id and estado = 'confirmada' and inicio > now();
  update reservas
    set notas = null, email_contacto = null, origen = null
    where cliente_id = p_cliente_id;
  update notas_internas_reserva set texto = ''
    where reserva_id in (select id from reservas where cliente_id = p_cliente_id);
  update notas_internas_cliente set texto = '' where cliente_id = p_cliente_id;
  update clientes
    set nombre = 'Cliente borrado',
        telefono = 'borrado-' || id::text,
        email = null,
        user_id = null,
        privacidad_aceptada_at = null
    where id = p_cliente_id;
end;
$$;
revoke execute on function public.anonimizar_cliente_interno(uuid) from public, anon, authenticated;

create or replace function public.anonimizar_cliente(p_cliente_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not exists (select 1 from clientes where id = p_cliente_id) then
    return false;
  end if;
  perform anonimizar_cliente_interno(p_cliente_id);
  return true;
end;
$$;

create or replace function public.borrar_mis_datos()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;
  for v_id in select id from clientes where user_id = auth.uid() loop
    perform anonimizar_cliente_interno(v_id);
  end loop;
  return true;
end;
$$;

-- ── avisos que no salieron (S7) ──────────────────────────────────────────────
-- Un fallo de Resend solo dejaba una línea en los registros del hosting. Ahora
-- queda aquí y el panel lo enseña en «Hoy».
create table if not exists public.envios_fallidos (
  id uuid primary key default gen_random_uuid(),
  creado_at timestamptz not null default now(),
  tipo text not null,
  reserva_id uuid references public.reservas,
  detalle text,
  visto_at timestamptz
);
create index if not exists envios_fallidos_reserva_idx on public.envios_fallidos (reserva_id);
alter table public.envios_fallidos enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'envios_fallidos' and policyname = 'envios_fallidos_admin_select') then
    create policy envios_fallidos_admin_select on public.envios_fallidos for select using ((select public.es_admin()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'envios_fallidos' and policyname = 'envios_fallidos_admin_update') then
    create policy envios_fallidos_admin_update on public.envios_fallidos for update using ((select public.es_admin()));
  end if;
end $$;

create or replace function public.registrar_envio_fallido(p_secret text, p_tipo text, p_reserva_id uuid, p_detalle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from cron_secreto where secreto = p_secret) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  insert into envios_fallidos (tipo, reserva_id, detalle)
    values (left(p_tipo, 40), p_reserva_id, left(p_detalle, 500));
end;
$$;

revoke execute on function public.crear_reserva(text, text, text, uuid[], timestamptz, text) from public, anon, authenticated;
