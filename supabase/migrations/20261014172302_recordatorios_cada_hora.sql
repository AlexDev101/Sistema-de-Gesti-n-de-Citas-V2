-- Análisis del 12 oct 2026 — recordatorios fiables (decisión del 13 oct:
-- pg_cron en Supabase). Antes había un único cron diario de Vercel Hobby a las
-- 08:00 UTC: una cita reservada después para el día siguiente no recibía aviso
-- y no había aviso el mismo día.
--
-- Ahora la base llama cada hora a /api/cron/recordatorios (la ruta de la web,
-- que es quien sabe enviar los emails) con el mismo Bearer que antes mandaba
-- Vercel. El hosting deja de importar: sirve igual en Netlify que en Vercel.
--
-- Puesta en marcha en una instalación nueva (ver docs/INSTALACION.md):
--   update cron_secreto set endpoint = 'https://<dominio>/api/cron/recordatorios';

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

alter table public.cron_secreto add column if not exists endpoint text;

-- Ventana nueva: citas confirmadas que empiezan dentro de las próximas 24 h
-- (y al menos dentro de 2 h, para que el aviso sirva de algo), sin recordatorio
-- todavía y reservadas hace más de 1 h (quien reserva para dentro de un rato
-- acaba de recibir la confirmación; un recordatorio encima sobra).
create or replace function public.reservas_pendientes_recordatorio(p_secret text)
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

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'token', r.token,
      'inicio', r.inicio,
      'cliente_nombre', c.nombre,
      'cliente_email', coalesce(r.email_contacto, c.email),
      'servicios', (
        select string_agg(s.nombre, ', ' order by s.orden)
        from reserva_servicios rs join servicios s on s.id = rs.servicio_id
        where rs.reserva_id = r.id
      )
    ) order by r.inicio)
    from reservas r
    join clientes c on c.id = r.cliente_id
    where r.estado = 'confirmada'
      and r.recordatorio_enviado_at is null
      and coalesce(r.email_contacto, c.email) is not null
      and r.inicio > now() + interval '2 hours'
      and r.inicio <= now() + interval '24 hours'
      and r.created_at < now() - interval '1 hour'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.lanzar_recordatorios()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secreto text;
  v_endpoint text;
begin
  select secreto, endpoint into v_secreto, v_endpoint from cron_secreto limit 1;
  if v_endpoint is null or v_secreto is null then
    return null;
  end if;
  return net.http_get(
    url := v_endpoint,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secreto),
    timeout_milliseconds := 20000
  );
end;
$$;
revoke execute on function public.lanzar_recordatorios() from public, anon, authenticated;

-- Cada hora, al minuto 7 (lejos del :00, donde se amontonan los crons).
select cron.schedule('recordatorios-cada-hora', '7 * * * *', $$select public.lanzar_recordatorios()$$);
