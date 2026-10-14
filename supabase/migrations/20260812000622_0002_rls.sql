-- RLS — lectura pública de catálogo/horario, todo lo demás sólo admin o vía RPC.
alter table barbero enable row level security;
alter table configuracion enable row level security;
alter table servicios enable row level security;
alter table clientes enable row level security;
alter table horario_barbero enable row level security;
alter table cierres enable row level security;
alter table reservas enable row level security;
alter table reserva_servicios enable row level security;

create or replace function es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from barbero where user_id = auth.uid()
  );
$$;

-- barbero: lectura pública (landing lo muestra), escritura sólo admin
create policy barbero_select_publico on barbero for select using (true);
create policy barbero_update_admin on barbero for update using (es_admin());

-- configuracion: lectura pública, escritura sólo admin
create policy configuracion_select_publico on configuracion for select using (true);
create policy configuracion_update_admin on configuracion for update using (es_admin());

-- servicios: lectura pública, escritura sólo admin
create policy servicios_select_publico on servicios for select using (true);
create policy servicios_write_admin on servicios for insert with check (es_admin());
create policy servicios_update_admin on servicios for update using (es_admin());
create policy servicios_delete_admin on servicios for delete using (es_admin());

-- horario_barbero: lectura pública, escritura sólo admin
create policy horario_select_publico on horario_barbero for select using (true);
create policy horario_write_admin on horario_barbero for insert with check (es_admin());
create policy horario_update_admin on horario_barbero for update using (es_admin());
create policy horario_delete_admin on horario_barbero for delete using (es_admin());

-- cierres: lectura pública (se usa para pintar el calendario), escritura sólo admin
create policy cierres_select_publico on cierres for select using (true);
create policy cierres_write_admin on cierres for insert with check (es_admin());
create policy cierres_update_admin on cierres for update using (es_admin());
create policy cierres_delete_admin on cierres for delete using (es_admin());

-- clientes: sin lectura pública directa; el propio cliente registrado ve su ficha; admin ve todo
create policy clientes_select_propio on clientes for select using (
  es_admin() or user_id = auth.uid()
);
create policy clientes_update_admin on clientes for update using (es_admin());

-- reservas: inserción sólo vía rpc (security definer, sin policy de insert público);
-- lectura: admin, el cliente registrado dueño, o vía obtener_reserva_por_token()
create policy reservas_select_propia on reservas for select using (
  es_admin() or cliente_id in (select id from clientes where user_id = auth.uid())
);
create policy reservas_update_admin on reservas for update using (es_admin());

create policy reserva_servicios_select on reserva_servicios for select using (
  exists (
    select 1 from reservas r where r.id = reserva_id
      and (es_admin() or r.cliente_id in (select id from clientes where user_id = auth.uid()))
  )
);
