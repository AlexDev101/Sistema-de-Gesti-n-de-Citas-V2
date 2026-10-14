-- Crítico 2 de la revisión del 2 oct 2026.
--
-- Antes: ventana de 25 h desde las 08:00 UTC del cron diario. Solo cubría hasta
-- las 11:00 del día siguiente (10:00 en invierno), así que casi todas las citas
-- recibían el aviso el mismo día con el texto «tu cita es mañana».
--
-- Ahora: se eligen las citas cuya fecha en Madrid es mañana. Con el cron diario
-- cada una recibe su aviso el día anterior, sea cual sea la hora.
--
-- De paso el aviso sale hacia el email escrito en la reserva (email_contacto,
-- ver 01) y, si no hay, hacia el de la ficha.
--
-- Efecto a tener en cuenta: una cita reservada después del cron para el día
-- siguiente ya no recibe recordatorio (sí su confirmación).

create or replace function public.reservas_pendientes_recordatorio(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
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
      and (r.inicio at time zone 'Europe/Madrid')::date
          = (now() at time zone 'Europe/Madrid')::date + 1
  ), '[]'::jsonb);
end;
$function$;
