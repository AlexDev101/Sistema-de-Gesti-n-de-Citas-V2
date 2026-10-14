-- Prueba de humo de las funciones de reserva contra una base real.
-- Lo deja todo como estaba (termina en ROLLBACK) y devuelve una fila por
-- comprobación con ok = true/false. Ejecutar en el editor SQL de Supabase o
-- con `psql "$DATABASE_URL" -f supabase/tests/funciones.sql`.
-- Necesita: horario con algún día abierto, al menos un servicio activo y el
-- secreto de servidor en cron_secreto.
-- Última ejecución: 14 oct 2026, 16/16 en verde.

begin;
create temp table _r (paso text, ok boolean, detalle text) on commit drop;
do $$
declare
  v_secret text := (select secreto from cron_secreto limit 1);
  v_dia date := (now() at time zone 'Europe/Madrid')::date + 3;
  v_slot timestamptz;
  v_slot2 timestamptz;
  v_res record;
  v_tok uuid;
  v_id uuid;
  v_serv uuid := (select id from servicios where activo order by orden limit 1);
begin
  while not exists (select 1 from slots_disponibles(v_dia, 30)) loop v_dia := v_dia + 1; end loop;
  select inicio into v_slot from slots_disponibles(v_dia, 30) limit 1;
  select inicio into v_slot2 from slots_disponibles(v_dia, 30) offset 2 limit 1;

  begin perform crear_reserva_publica('Test', '600111222', '', array[v_serv], v_slot, null, 'mal', null, true);
    insert into _r values ('secreto incorrecto rechazado', false, 'se creó');
  exception when others then insert into _r values ('secreto incorrecto rechazado', sqlerrm = 'No autorizado', sqlerrm); end;

  begin perform crear_reserva_publica('Test', '600111222', '', array[v_serv], v_slot, null, v_secret, null, false);
    insert into _r values ('sin privacidad rechazado', false, 'se creó');
  exception when others then insert into _r values ('sin privacidad rechazado', sqlerrm like 'Tienes que aceptar%', sqlerrm); end;

  select * into v_res from crear_reserva_publica('Test', '600111222', 't@e.es', array[v_serv], v_slot, null, v_secret, 'h1', true);
  v_tok := v_res.token; v_id := v_res.reserva_id;
  insert into _r values ('reserva pública creada', v_id is not null, v_slot::text);

  insert into _r values ('obtener por token: puede_cambiar', (obtener_reserva_por_token(v_tok)->>'puede_cambiar')::boolean, obtener_reserva_por_token(v_tok)->>'tiene_email');
  insert into _r values ('su hueco aparece al excluirse', exists(select 1 from slots_disponibles_excluyendo(v_dia,30,v_tok) s where s.inicio=v_slot), '');
  insert into _r values ('su hueco no aparece para otros', not exists(select 1 from slots_disponibles(v_dia,30) s where s.inicio=v_slot), '');

  perform reprogramar_reserva_por_token(v_tok, v_slot2);
  insert into _r values ('reprogramada', (select inicio from reservas where id=v_id) = v_slot2, '');

  update reservas set inicio = now() + interval '3 hours', fin = now() + interval '3 hours 30 min' where id = v_id;
  begin perform cancelar_reserva_por_token(v_tok); insert into _r values ('cancelar <24h rechazado', false, 'canceló');
  exception when others then insert into _r values ('cancelar <24h rechazado', sqlerrm like 'Faltan menos%', sqlerrm); end;
  insert into _r values ('puede_cambiar false <24h', not (obtener_reserva_por_token(v_tok)->>'puede_cambiar')::boolean, '');

  insert into cierres(rango, motivo) values (tstzrange((v_dia::timestamp at time zone 'Europe/Madrid'), ((v_dia+1)::timestamp at time zone 'Europe/Madrid'), '[)'), 'test');
  insert into _r values ('cierre quita huecos', not exists(select 1 from slots_disponibles(v_dia,30)), '');
  insert into _r values ('cierres_listado', exists(select 1 from cierres_listado() where desde=v_dia and hasta=v_dia), '');

  update reservas set inicio = v_slot, fin = v_slot + interval '30 min', estado='cancelada' where id=v_id;
  insert into reservas (cliente_id, inicio, fin, precio_total_cents, origen, estado) select cliente_id, v_slot + interval '30 day', v_slot + interval '30 day 30 min', 0, 'h1', 'cancelada' from reservas where id=v_id;
  insert into reservas (cliente_id, inicio, fin, precio_total_cents, origen, estado) select cliente_id, v_slot + interval '31 day', v_slot + interval '31 day 30 min', 0, 'h1', 'cancelada' from reservas where id=v_id;
  begin perform crear_reserva_publica('Test', '611111222', '', array[v_serv], v_slot2, null, v_secret, 'h1', true);
    insert into _r values ('4ª reserva/hora misma conexión rechazada', false, 'creó');
  exception when others then insert into _r values ('4ª reserva/hora misma conexión rechazada', sqlerrm like 'Demasiadas%', sqlerrm); end;

  insert into _r values ('recordatorios ejecuta', jsonb_typeof(reservas_pendientes_recordatorio(v_secret)) = 'array', '');
  insert into _r values ('datos_aviso devuelve email', datos_aviso_reserva(v_secret, v_id)->>'cliente_email' = 't@e.es', '');

  perform anonimizar_cliente_interno((select cliente_id from reservas where id=v_id));
  insert into _r values ('anonimizado', (select nombre from clientes c join reservas r on r.cliente_id=c.id where r.id=v_id) = 'Cliente borrado', '');

  begin perform importar_clientes('[]'::jsonb); insert into _r values ('importar sin admin rechazado', false, '');
  exception when others then insert into _r values ('importar sin admin rechazado', sqlerrm='No autorizado', sqlerrm); end;
end $$;
select * from _r;
rollback;
