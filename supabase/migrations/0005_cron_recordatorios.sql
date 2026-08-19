-- El cron de recordatorios (/api/cron/recordatorios) leía las reservas con la
-- service_role key, que salta RLS por completo. Se sustituye por dos funciones
-- SECURITY DEFINER — el mismo patrón que crear_reserva o slots_disponibles —
-- llamables con la clave anon.
--
-- Esa clave viaja en el bundle del navegador, así que ambas funciones exigen un
-- secreto compartido: sin él, cualquiera podría volcar nombres, teléfonos y
-- emails de los clientes de las próximas 25 h. El mismo valor vive en la
-- variable de entorno CRON_SECRET, que Vercel Cron manda como Bearer.

create table if not exists cron_secreto (
  unico   boolean primary key default true check (unico),
  secreto text not null
);

-- RLS activada y deliberadamente sin políticas: PostgREST nunca puede leer esta
-- tabla. Solo la alcanzan las funciones de abajo, que corren como su propietario.
alter table cron_secreto enable row level security;
revoke all on cron_secreto from anon, authenticated;

-- Reservas confirmadas que empiezan en las próximas ~25 h y aún no tienen
-- recordatorio. La ventana cubre todo "mañana" en una sola pasada diaria, que
-- es lo único que permite el plan Hobby de Vercel (ver vercel.ts).
create or replace function reservas_pendientes_recordatorio(p_secret text)
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
      'cliente_email', c.email,
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
      and c.email is not null
      and r.inicio >= now()
      and r.inicio <= now() + interval '25 hours'
  ), '[]'::jsonb);
end;
$$;

-- Marcar como enviado hace la ruta idempotente: si el cron se reintenta, la
-- segunda pasada no encuentra nada y no se duplican correos.
create or replace function marcar_recordatorio_enviado(p_secret text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from cron_secreto where secreto = p_secret) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update reservas set recordatorio_enviado_at = now() where id = p_id;
  return found;
end;
$$;

grant execute on function reservas_pendientes_recordatorio(text) to anon, authenticated;
grant execute on function marcar_recordatorio_enviado(text, uuid) to anon, authenticated;

-- El valor de cron_secreto NO se versiona aquí. Se inserta a mano y debe
-- coincidir con la variable de entorno CRON_SECRET:
--   insert into cron_secreto (unico, secreto) values (true, '<CRON_SECRET>')
--   on conflict (unico) do update set secreto = excluded.secreto;
