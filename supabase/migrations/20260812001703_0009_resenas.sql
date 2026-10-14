create table resenas (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null unique references reservas on delete cascade,
  estrellas int not null check (estrellas between 1 and 5),
  comentario text,
  created_at timestamptz not null default now()
);

alter table resenas enable row level security;

create policy resenas_select on resenas for select using (
  es_admin() or exists (
    select 1 from reservas r
    where r.id = reserva_id and r.cliente_id in (select id from clientes where user_id = auth.uid())
  )
);

create policy resenas_insert on resenas for insert with check (
  exists (
    select 1 from reservas r
    where r.id = reserva_id and r.estado = 'completada'
      and r.cliente_id in (select id from clientes where user_id = auth.uid())
  )
);
