-- Crítico 6 de la revisión del 2 oct 2026 (parte 2 de 2: limpieza).
--
-- PENDIENTE DE APLICAR: borra datos, así que Supabase pide confirmación y esa
-- confirmación no llegó a darse el 3 oct 2026. Aplicar después de desplegar el
-- código que escribe en las tablas nuevas.
--
-- notas_internas_solo_admin ya copió las notas a las tablas protegidas. Aquí
-- se retira lo que quedaba al alcance del cliente: las notas internas que
-- seguían en reservas.notas y la columna clientes.notas_internas.

update public.reservas r set notas = null
  where exists (select 1 from public.notas_internas_reserva n where n.reserva_id = r.id);

alter table public.clientes drop column if exists notas_internas;
