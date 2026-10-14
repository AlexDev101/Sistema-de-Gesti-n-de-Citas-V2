-- Análisis del 12 oct 2026 — "Para quien reserva": el recordatorio prometía
-- reprogramar y no se podía, y la política de cancelación era solo texto.
--
-- Decisión del 13 oct: el cliente puede cancelar o cambiar la hora desde la
-- web hasta `configuracion.horas_limite_cambio` horas antes (24 por defecto).
-- Pasado ese límite, las funciones lo rechazan y la web le pide que llame.

-- Huecos excluyendo una cita concreta: al cambiar de hora, la propia cita no
-- debe contar como ocupada (si no, moverla 30 min dentro de su propio hueco
-- sería imposible). Solo excluye la reserva cuyo token conoces.
-- `slots_disponibles` se queda con su firma (la usan crear_reserva y la web)
-- y pasa a ser un envoltorio de esta.
create or replace function public.slots_disponibles_excluyendo(
  p_fecha date,
  p_duracion_min integer,
  p_excluir_token uuid,
  p_respetar_antelacion boolean default true
)
returns table (inicio timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with corte as (
    select now() + case
      when p_respetar_antelacion then
        (coalesce((select antelacion_min_horas from configuracion limit 1), 2) || ' hours')::interval
      else interval '0'
    end as desde
  ),
  franjas as (
    select abre, cierra
    from horario_barbero
    where dia_semana = extract(dow from p_fecha)
  ),
  bloques as (
    select (ts) at time zone 'Europe/Madrid' as inicio_ts
    from franjas f,
    lateral generate_series(
      p_fecha + f.abre,
      p_fecha + f.cierra - (p_duracion_min || ' minutes')::interval,
      interval '30 min'
    ) as ts
  )
  select b.inicio_ts
  from bloques b, corte
  where not exists (
      select 1 from cierres c
      where c.rango && tstzrange(b.inicio_ts, b.inicio_ts + (p_duracion_min || ' minutes')::interval, '[)')
    )
    and not exists (
      select 1 from reservas r
      where r.estado in ('confirmada', 'completada')
        and (p_excluir_token is null or r.token <> p_excluir_token)
        and r.rango && tstzrange(b.inicio_ts, b.inicio_ts + (p_duracion_min || ' minutes')::interval, '[)')
    )
    and b.inicio_ts > corte.desde
  order by b.inicio_ts;
$$;

create or replace function public.slots_disponibles(
  p_fecha date,
  p_duracion_min integer,
  p_respetar_antelacion boolean default true
)
returns table (inicio timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.inicio from public.slots_disponibles_excluyendo(p_fecha, p_duracion_min, null, p_respetar_antelacion) s;
$$;

-- ── cancelar con ventana ─────────────────────────────────────────────────────
create or replace function public.cancelar_reserva_por_token(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio timestamptz;
  v_horas int;
begin
  select inicio into v_inicio from reservas where token = p_token and estado = 'confirmada' for update;
  if v_inicio is null then
    raise exception 'Reserva no encontrada o ya cancelada' using errcode = '22023';
  end if;
  select coalesce(horas_limite_cambio, 24) into v_horas from configuracion limit 1;
  if v_inicio < now() + make_interval(hours => coalesce(v_horas, 24)) then
    raise exception 'Faltan menos de % h para la cita: para cancelarla, llama a la barbería.', coalesce(v_horas, 24)
      using errcode = '22023';
  end if;
  update reservas set estado = 'cancelada' where token = p_token;
  return true;
end;
$$;

-- ── cambiar de hora (cliente) ────────────────────────────────────────────────
create or replace function public.reprogramar_reserva_por_token(p_token uuid, p_inicio timestamptz)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r reservas%rowtype;
  v_cfg configuracion%rowtype;
  v_dur int;
  v_horas int;
begin
  select * into v_r from reservas where token = p_token for update;
  if not found or v_r.estado <> 'confirmada' then
    raise exception 'Reserva no encontrada o ya cancelada' using errcode = '22023';
  end if;

  select * into v_cfg from configuracion limit 1;
  v_horas := coalesce(v_cfg.horas_limite_cambio, 24);
  if v_r.inicio < now() + make_interval(hours => v_horas) then
    raise exception 'Faltan menos de % h para la cita: para cambiarla, llama a la barbería.', v_horas
      using errcode = '22023';
  end if;
  if p_inicio = v_r.inicio then
    return true;
  end if;
  if p_inicio > now() + make_interval(days => coalesce(v_cfg.antelacion_max_dias, 60)) then
    raise exception 'Esa fecha está fuera del rango de reserva' using errcode = '22023';
  end if;

  select coalesce(sum(duracion_min), 0) into v_dur from reserva_servicios where reserva_id = v_r.id;
  if v_dur = 0 then
    raise exception 'La cita no tiene servicios' using errcode = '22023';
  end if;

  if not exists (
    select 1 from slots_disponibles_excluyendo((p_inicio at time zone 'Europe/Madrid')::date, v_dur, p_token, true) s
    where s.inicio = p_inicio
  ) then
    raise exception 'Ese hueco ya no está disponible' using errcode = '22023';
  end if;

  begin
    update reservas
      set inicio = p_inicio,
          fin = p_inicio + make_interval(mins => v_dur),
          recordatorio_enviado_at = null
      where id = v_r.id;
  exception when exclusion_violation then
    raise exception 'Ese hueco se acaba de ocupar — elige otro' using errcode = '22023';
  end;
  return true;
end;
$$;

-- ── lo que ve la página de la cita ───────────────────────────────────────────
-- Añade lo que la página necesita para decidir qué ofrecer: si hay email (sin
-- devolverlo), la duración y si todavía se puede cambiar o cancelar online.
create or replace function public.obtener_reserva_por_token(p_token uuid)
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
    'tiene_email', coalesce(r.email_contacto, c.email) is not null,
    'duracion_min', (select coalesce(sum(rs.duracion_min), 0) from reserva_servicios rs where rs.reserva_id = r.id),
    'puede_cambiar', r.estado = 'confirmada'
      and r.inicio >= now() + make_interval(hours => coalesce((select horas_limite_cambio from configuracion limit 1), 24)),
    'servicios', (
      select jsonb_agg(jsonb_build_object(
        'nombre', s.nombre, 'precio_cents', rs.precio_cents, 'duracion_min', rs.duracion_min
      ) order by s.orden)
      from reserva_servicios rs join servicios s on s.id = rs.servicio_id
      where rs.reserva_id = r.id
    ),
    'resena', (
      select jsonb_build_object('estrellas', rs.estrellas, 'comentario', rs.comentario)
      from resenas rs where rs.reserva_id = r.id
    )
  )
  from reservas r join clientes c on c.id = r.cliente_id
  where r.token = p_token;
$$;

-- Datos para avisar por email tras un cambio (cliente o barbero). Con el
-- secreto de servidor, igual que los recordatorios: el email del cliente no
-- sale nunca hacia el navegador.
create or replace function public.datos_aviso_reserva(p_secret text, p_reserva_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from cron_secreto where secreto = p_secret) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'id', r.id,
      'token', r.token,
      'inicio', r.inicio,
      'estado', r.estado,
      'precio_total_cents', r.precio_total_cents,
      'cliente_nombre', c.nombre,
      'cliente_telefono', c.telefono,
      'cliente_email', coalesce(r.email_contacto, c.email),
      'servicios', (
        select string_agg(s.nombre, ', ' order by s.orden)
        from reserva_servicios rs join servicios s on s.id = rs.servicio_id
        where rs.reserva_id = r.id
      )
    )
    from reservas r join clientes c on c.id = r.cliente_id
    where r.id = p_reserva_id
  );
end;
$$;

-- El panel también usa el token para pedir huecos excluyendo la propia cita.
-- Mover una cita desde el panel deja el recordatorio pendiente otra vez.
create or replace function public.reservas_reset_recordatorio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.inicio is distinct from old.inicio then
    new.recordatorio_enviado_at := null;
  end if;
  return new;
end;
$$;

create or replace trigger reservas_reset_recordatorio
  before update of inicio on public.reservas
  for each row execute function public.reservas_reset_recordatorio();
