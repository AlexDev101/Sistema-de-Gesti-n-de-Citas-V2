-- Galería del panel admin: secciones (p.ej. "Fade", "Barba", "Clásicos") con
-- fotos y vídeos, para mostrar los distintos tipos de corte/servicio.
-- Lectura pública (la pinta la portada), escritura sólo admin, mismo patrón
-- que servicios/horario/cierres. Sin DROP: idempotente.

create table if not exists galeria_secciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists galeria_items (
  id uuid primary key default gen_random_uuid(),
  seccion_id uuid references galeria_secciones(id) on delete set null,
  tipo text not null check (tipo in ('foto','video')),
  url text not null,
  titulo text,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists galeria_items_seccion_idx on galeria_items(seccion_id);

alter table galeria_secciones enable row level security;
alter table galeria_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'galeria_secciones' and policyname = 'galeria_secciones_select_publico') then
    create policy galeria_secciones_select_publico on galeria_secciones for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'galeria_secciones' and policyname = 'galeria_secciones_write_admin') then
    create policy galeria_secciones_write_admin on galeria_secciones for insert with check (es_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'galeria_secciones' and policyname = 'galeria_secciones_update_admin') then
    create policy galeria_secciones_update_admin on galeria_secciones for update using (es_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'galeria_secciones' and policyname = 'galeria_secciones_delete_admin') then
    create policy galeria_secciones_delete_admin on galeria_secciones for delete using (es_admin());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'galeria_items' and policyname = 'galeria_items_select_publico') then
    create policy galeria_items_select_publico on galeria_items for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'galeria_items' and policyname = 'galeria_items_write_admin') then
    create policy galeria_items_write_admin on galeria_items for insert with check (es_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'galeria_items' and policyname = 'galeria_items_update_admin') then
    create policy galeria_items_update_admin on galeria_items for update using (es_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'galeria_items' and policyname = 'galeria_items_delete_admin') then
    create policy galeria_items_delete_admin on galeria_items for delete using (es_admin());
  end if;
end $$;

-- Bucket público para subir fotos y vídeos desde el panel.
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'galeria_storage_select_publico') then
    create policy galeria_storage_select_publico on storage.objects for select using (bucket_id = 'galeria');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'galeria_storage_insert_admin') then
    create policy galeria_storage_insert_admin on storage.objects for insert with check (bucket_id = 'galeria' and es_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'galeria_storage_update_admin') then
    create policy galeria_storage_update_admin on storage.objects for update using (bucket_id = 'galeria' and es_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'galeria_storage_delete_admin') then
    create policy galeria_storage_delete_admin on storage.objects for delete using (bucket_id = 'galeria' and es_admin());
  end if;
end $$;

-- Semilla: mantiene visibles las fotos que ya había en la portada hasta que
-- el admin organice su propia galería.
do $$
declare
  v_seccion_id uuid;
begin
  if not exists (select 1 from galeria_secciones) then
    insert into galeria_secciones (nombre, orden) values ('Trabajos recientes', 1)
    returning id into v_seccion_id;

    insert into galeria_items (seccion_id, tipo, url, orden) values
      (v_seccion_id, 'foto', '/uploads/trabajo-1.jpeg', 1),
      (v_seccion_id, 'foto', '/uploads/trabajo-2.jpeg', 2),
      (v_seccion_id, 'foto', '/uploads/trabajo-3.jpeg', 3),
      (v_seccion_id, 'foto', '/uploads/trabajo-4.jpeg', 4);
  end if;
end $$;
