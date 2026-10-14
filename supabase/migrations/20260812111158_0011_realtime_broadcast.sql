-- Avisa por Realtime Broadcast (canal público, sin RLS) cuando una reserva
-- cambia, para que el asistente de reserva y la agenda admin refresquen en
-- vivo. El payload NO lleva datos del cliente — sólo "algo cambió ese día",
-- y quien escucha vuelve a pedir los datos por los canales ya protegidos
-- por RLS (slots_disponibles / getReservasRango).
create or replace function reservas_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_fecha_nueva date;
  v_fecha_vieja date;
begin
  if TG_OP in ('INSERT', 'UPDATE') then
    v_fecha_nueva := (new.inicio at time zone 'Europe/Madrid')::date;
    perform realtime.send(jsonb_build_object('id', new.id), 'cambio', 'dia:' || v_fecha_nueva::text, false);
  end if;
  if TG_OP in ('UPDATE', 'DELETE') then
    v_fecha_vieja := (old.inicio at time zone 'Europe/Madrid')::date;
    if TG_OP = 'DELETE' or v_fecha_vieja <> v_fecha_nueva then
      perform realtime.send(jsonb_build_object('id', old.id), 'cambio', 'dia:' || v_fecha_vieja::text, false);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_reservas_broadcast
after insert or update or delete on reservas
for each row execute function reservas_broadcast();
