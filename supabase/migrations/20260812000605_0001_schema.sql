-- FG Hair Studio — esquema base (ver README.md del handoff de diseño)
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ── barbero (negocio de un solo sillón: una fila) ──────────────────────────
create table barbero (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  nombre text not null default 'Francíso',
  rol text not null default 'Barbero · fundador',
  bio text not null default 'Corte, barba y degradados',
  foto_url text,
  avatar_url text
);

-- ── configuración del negocio (una fila) ────────────────────────────────────
create table configuracion (
  id uuid primary key default gen_random_uuid(),
  nombre_negocio text not null default 'Francíso García Barbershop',
  direccion text not null default 'Carrer exemple 24, baixos, 08003 Barcelona',
  antelacion_min_horas int not null default 2,
  antelacion_max_dias int not null default 60,
  politica_cancelacion text not null default 'Cancelación gratuita hasta 24 h antes. Después se cobra el 50 %.'
);

-- ── catálogo ────────────────────────────────────────────────────────────────
create table servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,              -- 'Corte', 'Barba', 'Combos', 'Otros'
  duracion_min int not null check (duracion_min > 0 and duracion_min % 30 = 0),
  precio_cents int not null check (precio_cents >= 0),
  activo boolean not null default true,
  orden int not null default 0
);

-- ── clientes ────────────────────────────────────────────────────────────────
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null unique,
  email text,
  notas_internas text,
  user_id uuid references auth.users,
  created_at timestamptz not null default now()
);

-- ── horario semanal del barbero (plantilla) ─────────────────────────────────
create table horario_barbero (
  id uuid primary key default gen_random_uuid(),
  dia_semana int not null check (dia_semana between 0 and 6), -- 0=domingo … 6=sábado
  abre time not null,
  cierra time not null,
  check (cierra > abre)
);

-- ── cierres puntuales (vacaciones, festivos, ausencias) ─────────────────────
create table cierres (
  id uuid primary key default gen_random_uuid(),
  rango tstzrange not null,
  motivo text
);

-- ── reservas ─────────────────────────────────────────────────────────────────
create table reservas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes,
  inicio timestamptz not null,
  fin timestamptz not null,
  rango tstzrange generated always as (tstzrange(inicio, fin, '[)')) stored,
  estado text not null default 'confirmada'
    check (estado in ('confirmada', 'completada', 'no_show', 'cancelada')),
  precio_total_cents int not null check (precio_total_cents >= 0),
  notas text,
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint sin_solape exclude using gist (rango with &&)
    where (estado in ('confirmada', 'completada'))
);
create index reservas_cliente_idx on reservas (cliente_id);
create index reservas_token_idx on reservas (token);
create index reservas_inicio_idx on reservas (inicio);

create table reserva_servicios (
  reserva_id uuid references reservas on delete cascade,
  servicio_id uuid references servicios,
  precio_cents int not null,
  duracion_min int not null,
  primary key (reserva_id, servicio_id)
);

-- seed: horario L–V 10:00–14:00 y 16:30–21:00, sábado 10:00–14:00, domingo cerrado
insert into horario_barbero (dia_semana, abre, cierra) values
  (1, '10:00', '14:00'), (1, '16:30', '21:00'),
  (2, '10:00', '14:00'), (2, '16:30', '21:00'),
  (3, '10:00', '14:00'), (3, '16:30', '21:00'),
  (4, '10:00', '14:00'), (4, '16:30', '21:00'),
  (5, '10:00', '14:00'), (5, '16:30', '21:00'),
  (6, '10:00', '14:00');

insert into servicios (nombre, categoria, duracion_min, precio_cents, orden) values
  ('Corte', 'Corte', 30, 900, 1),
  ('Niños', 'Corte', 30, 600, 2),
  ('Corte + Barba', 'Combos', 60, 1300, 3),
  ('Corte + Lavado', 'Combos', 30, 1500, 4),
  ('Corte + Barba + Lavado', 'Combos', 60, 1700, 5),
  ('Barba', 'Barba', 30, 400, 6);

insert into barbero (nombre, rol, bio) values
  ('Francíso', 'Barbero · fundador', 'Corte, barba y degradados');

insert into configuracion default values;
