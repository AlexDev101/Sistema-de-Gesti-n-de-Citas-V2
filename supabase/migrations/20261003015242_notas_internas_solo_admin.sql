-- Crítico 6 de la revisión del 2 oct 2026 (parte 1 de 2: sin borrar nada).
--
-- Antes: las notas del barbero vivían en clientes.notas_internas y en
-- reservas.notas. RLS protege filas, no columnas, así que un cliente con
-- cuenta podía leer por la API las notas de su propia ficha y de sus citas, y
-- obtener_reserva_por_token devolvía reservas.notas a quien tuviera el enlace.
--
-- Ahora las notas internas están en dos tablas a las que solo llega el
-- administrador (política es_admin() para todo). reservas.notas queda para lo
-- que escriba el cliente al reservar, que sí es suyo.
--
-- La limpieza de las columnas antiguas va aparte, en
-- notas_internas_limpieza, porque borra datos.

create table if not exists public.notas_internas_cliente (
  cliente_id uuid primary key references public.clientes(id) on delete cascade,
  texto text not null default ''
);

create table if not exists public.notas_internas_reserva (
  reserva_id uuid primary key references public.reservas(id) on delete cascade,
  texto text not null default ''
);

alter table public.notas_internas_cliente enable row level security;
alter table public.notas_internas_reserva enable row level security;

revoke all on public.notas_internas_cliente from anon, authenticated;
revoke all on public.notas_internas_reserva from anon, authenticated;
grant select, insert, update, delete on public.notas_internas_cliente to authenticated;
grant select, insert, update, delete on public.notas_internas_reserva to authenticated;

create policy notas_internas_cliente_admin on public.notas_internas_cliente
  for all to authenticated
  using ((select es_admin())) with check ((select es_admin()));

create policy notas_internas_reserva_admin on public.notas_internas_reserva
  for all to authenticated
  using ((select es_admin())) with check ((select es_admin()));

-- Lo que ya hubiera escrito se conserva. Hasta hoy reservas.notas solo la
-- escribía el panel (la web no tiene campo de notas), así que todo lo que hay
-- ahí es nota interna.
insert into public.notas_internas_cliente (cliente_id, texto)
  select id, notas_internas from public.clientes
  where coalesce(trim(notas_internas), '') <> ''
  on conflict (cliente_id) do nothing;

insert into public.notas_internas_reserva (reserva_id, texto)
  select id, notas from public.reservas
  where coalesce(trim(notas), '') <> ''
  on conflict (reserva_id) do nothing;

-- Misma firma que antes: el panel sigue recibiendo notas_internas, ahora
-- leída de la tabla protegida (para quien no es admin sale vacía).
create or replace function public.clientes_resumen()
returns table(id uuid, nombre text, telefono text, email text, notas_internas text, visitas integer, ultima_visita timestamp with time zone, gasto_total_cents bigint, segmento text)
language sql
stable
set search_path to 'public'
as $function$
  select
    c.id, c.nombre, c.telefono, c.email, n.texto as notas_internas,
    count(r.id) filter (where r.estado in ('completada', 'confirmada'))::int as visitas,
    max(r.inicio) as ultima_visita,
    coalesce(sum(r.precio_total_cents) filter (where r.estado in ('completada', 'confirmada')), 0) as gasto_total_cents,
    case
      when count(r.id) filter (where r.estado in ('completada', 'confirmada')) <= 1 then 'Nuevo'
      when coalesce(sum(r.precio_total_cents) filter (where r.estado in ('completada', 'confirmada')), 0) >= 50000 then 'VIP'
      when max(r.inicio) < now() - interval '90 days' then 'En riesgo'
      else 'Recurrente'
    end as segmento
  from clientes c
  left join notas_internas_cliente n on n.cliente_id = c.id
  left join reservas r on r.cliente_id = c.id
  group by c.id, n.texto
  order by max(r.inicio) desc nulls last;
$function$;

-- "Nueva cita" del panel: la nota que escribe el barbero va a la tabla
-- protegida, no a reservas.notas.
create or replace function public.crear_reserva_admin(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_servicio_ids uuid[],
  p_inicio timestamp with time zone,
  p_notas text default null::text
)
returns table(reserva_id uuid, token uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cliente_id uuid;
  v_duracion int;
  v_precio int;
  v_fin timestamptz;
  v_reserva_id uuid;
  v_token uuid;
  v_email text := nullif(trim(p_email), '');
  v_tel text := normalizar_telefono(p_telefono);
  v_nota text := nullif(trim(p_notas), '');
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_servicio_ids is null or array_length(p_servicio_ids, 1) is null then
    raise exception 'Selecciona al menos un servicio' using errcode = '22023';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre' using errcode = '22023';
  end if;
  if coalesce(trim(p_telefono), '') = '' then
    raise exception 'Falta el teléfono' using errcode = '22023';
  end if;
  if v_tel !~ '^\+?[0-9]{9,15}$' then
    raise exception 'Revisa el teléfono: entre 9 y 15 dígitos' using errcode = '22023';
  end if;
  if length(trim(p_nombre)) > 80
     or length(coalesce(v_email, '')) > 254
     or length(coalesce(p_notas, '')) > 500 then
    raise exception 'Alguno de los textos es demasiado largo' using errcode = '22023';
  end if;

  select coalesce(sum(duracion_min), 0), coalesce(sum(precio_cents), 0)
    into v_duracion, v_precio
    from servicios where id = any(p_servicio_ids) and activo;

  if v_duracion = 0 then
    raise exception 'Los servicios seleccionados ya no están disponibles' using errcode = '22023';
  end if;

  v_fin := p_inicio + (v_duracion || ' minutes')::interval;

  insert into clientes (nombre, telefono, email)
    values (trim(p_nombre), v_tel, v_email)
    on conflict (telefono) do update
      set nombre = excluded.nombre,
          email = coalesce(excluded.email, clientes.email)
    returning clientes.id into v_cliente_id;

  begin
    insert into reservas (cliente_id, inicio, fin, precio_total_cents, email_contacto)
      values (v_cliente_id, p_inicio, v_fin, v_precio, v_email)
      returning reservas.id, reservas.token into v_reserva_id, v_token;
  exception when exclusion_violation then
    raise exception 'Ese hueco ya está ocupado' using errcode = '22023';
  end;

  if v_nota is not null then
    insert into notas_internas_reserva (reserva_id, texto) values (v_reserva_id, v_nota);
  end if;

  insert into reserva_servicios (reserva_id, servicio_id, precio_cents, duracion_min)
    select v_reserva_id, s.id, s.precio_cents, s.duracion_min
    from servicios s where s.id = any(p_servicio_ids) and s.activo;

  return query select v_reserva_id, v_token;
end;
$function$;
