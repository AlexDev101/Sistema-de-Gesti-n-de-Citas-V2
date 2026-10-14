-- Análisis del 12 oct 2026 — A1, A2, B2, B6 y decisión de reprogramación.
--
-- 1. Ajustes nuevos en `configuracion` (lectura pública: todo lo que hay aquí
--    puede verlo cualquiera, porque la web pública lo pinta).
-- 2. `configuracion_privada`: lo que no debe ser público (email de avisos del
--    barbero). Solo admin por RLS; el servidor lo lee con el secreto compartido.
-- 3. Cierres de calendario (vacaciones, festivos) con funciones que traducen
--    días enteros de Madrid a `tstzrange`, que es como los guarda `cierres`.

alter table public.configuracion
  add column if not exists horas_limite_cambio int not null default 24,
  add column if not exists color_acento text,
  add column if not exists logo_url text,
  add column if not exists legal_titular text,
  add column if not exists legal_nif text,
  add column if not exists legal_email text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'configuracion_horas_limite_cambio_check') then
    alter table public.configuracion
      add constraint configuracion_horas_limite_cambio_check check (horas_limite_cambio between 0 and 168);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'configuracion_color_acento_check') then
    alter table public.configuracion
      add constraint configuracion_color_acento_check check (color_acento is null or color_acento ~ '^#[0-9a-fA-F]{6}$');
  end if;
end $$;

comment on column public.configuracion.horas_limite_cambio is
  'Horas antes de la cita hasta las que el cliente puede cancelar o cambiar la hora desde la web.';

-- ── configuración privada (una fila) ─────────────────────────────────────────
create table if not exists public.configuracion_privada (
  unico boolean primary key default true check (unico),
  email_avisos text
);
insert into public.configuracion_privada (unico) values (true) on conflict do nothing;

alter table public.configuracion_privada enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'configuracion_privada' and policyname = 'configuracion_privada_admin') then
    create policy configuracion_privada_admin on public.configuracion_privada
      for all using ((select public.es_admin())) with check ((select public.es_admin()));
  end if;
end $$;

-- El servidor (sin sesión de admin) necesita saber a quién avisar cuando un
-- cliente reserva, cancela o cambia su cita. Mismo patrón que los
-- recordatorios: solo responde a quien conoce el secreto de servidor.
create or replace function public.email_avisos_negocio(p_secret text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from cron_secreto where secreto = p_secret) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return (select nullif(trim(email_avisos), '') from configuracion_privada limit 1);
end;
$$;

-- ── cierres ──────────────────────────────────────────────────────────────────
-- Días enteros en hora de Madrid: [desde 00:00, hasta+1 00:00).
create or replace function public.cierres_listado(p_desde date default null)
returns table (id uuid, desde date, hasta date, motivo text, citas_afectadas int)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    (lower(c.rango) at time zone 'Europe/Madrid')::date,
    ((upper(c.rango) - interval '1 microsecond') at time zone 'Europe/Madrid')::date,
    c.motivo,
    -- RLS de `reservas`: para un visitante anónimo esto es siempre 0.
    (select count(*)::int from reservas r where r.estado = 'confirmada' and r.rango && c.rango)
  from cierres c
  where upper(c.rango) > (coalesce(p_desde, (now() at time zone 'Europe/Madrid')::date)::timestamp at time zone 'Europe/Madrid')
  order by lower(c.rango);
$$;

-- Devuelve cuántas citas confirmadas caen dentro del cierre: el cierre no las
-- cancela solo (puede que el barbero quiera atenderlas igualmente), pero el
-- panel tiene que avisar de que existen.
create or replace function public.crear_cierre(p_desde date, p_hasta date, p_motivo text default null)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rango tstzrange;
  v_afectadas int;
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_desde is null or p_hasta is null then
    raise exception 'Indica el primer y el último día' using errcode = '22023';
  end if;
  if p_hasta < p_desde then
    raise exception 'El último día no puede ser anterior al primero' using errcode = '22023';
  end if;
  if p_hasta - p_desde > 366 then
    raise exception 'Un cierre no puede durar más de un año' using errcode = '22023';
  end if;

  v_rango := tstzrange(
    p_desde::timestamp at time zone 'Europe/Madrid',
    (p_hasta + 1)::timestamp at time zone 'Europe/Madrid',
    '[)'
  );
  insert into cierres (rango, motivo) values (v_rango, nullif(trim(p_motivo), ''));

  select count(*)::int into v_afectadas
    from reservas r where r.estado = 'confirmada' and r.rango && v_rango;
  return v_afectadas;
end;
$$;
