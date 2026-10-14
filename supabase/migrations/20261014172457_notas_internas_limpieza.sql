-- Crítico 6 de la revisión del 2 oct 2026 (parte 2 de 2: limpieza).
--
-- Aplicada el 14 oct 2026 desde el editor SQL de Supabase: la confirmación
-- que pide Supabase por borrar datos no llegaba por la herramienta.
--
-- notas_internas_solo_admin ya copió las notas a las tablas protegidas. Aquí
-- se retira lo que quedaba al alcance del cliente: las notas internas que
-- seguían en reservas.notas y la columna clientes.notas_internas.

update public.reservas r set notas = null
  where exists (select 1 from public.notas_internas_reserva n where n.reserva_id = r.id);

alter table public.clientes drop column if exists notas_internas;
