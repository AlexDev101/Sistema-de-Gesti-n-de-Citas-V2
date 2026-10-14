-- ============================================================
-- Reseñas: la tabla resenas ya existía en el esquema (RLS activada,
-- sin políticas) pero ningún flujo la usaba. Se abre solo a través de
-- una función SECURITY DEFINER con el mismo patrón que
-- cancelar_reserva_por_token — el cliente valora desde el enlace de su
-- propia confirmación, sin necesitar cuenta.
-- ============================================================
revoke all on resenas from anon, authenticated;

create or replace function dejar_resena_por_token(p_token uuid, p_estrellas int, p_comentario text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva_id uuid;
  v_estado text;
begin
  select id, estado into v_reserva_id, v_estado from reservas where token = p_token;
  if v_reserva_id is null then
    raise exception 'Reserva no encontrada' using errcode = '22023';
  end if;
  if v_estado <> 'completada' then
    raise exception 'Solo se puede valorar una cita ya realizada' using errcode = '22023';
  end if;
  if p_estrellas < 1 or p_estrellas > 5 then
    raise exception 'La valoración debe ser de 1 a 5 estrellas' using errcode = '22023';
  end if;

  begin
    insert into resenas (reserva_id, estrellas, comentario)
      values (v_reserva_id, p_estrellas, nullif(trim(coalesce(p_comentario, '')), ''));
  exception when unique_violation then
    raise exception 'Ya has valorado esta cita' using errcode = '22023';
  end;

  return true;
end;
$$;

grant execute on function dejar_resena_por_token(uuid, int, text) to anon, authenticated;

-- La página de confirmación necesita saber si ya se dejó una reseña, para no
-- volver a pedirla. Mismo cambio que se hizo antes con slots_disponibles /
-- ocupacion_mes: la firma no cambia, así que basta con reemplazar.
create or replace function obtener_reserva_por_token(p_token uuid)
returns jsonb
language sql
stable security definer
set search_path = 'public'
as $function$
  select jsonb_build_object(
    'id', r.id,
    'inicio', r.inicio,
    'fin', r.fin,
    'estado', r.estado,
    'precio_total_cents', r.precio_total_cents,
    'notas', r.notas,
    'cliente_nombre', c.nombre,
    'servicios', (
      select jsonb_agg(jsonb_build_object(
        'nombre', s.nombre, 'precio_cents', rs.precio_cents, 'duracion_min', rs.duracion_min
      ) order by s.orden)
      from reserva_servicios rs join servicios s on s.id = rs.servicio_id
      where rs.reserva_id = r.id
    ),
    'resena', (
      select jsonb_build_object('estrellas', rs.estrellas, 'comentario', rs.comentario)
      from resenas rs where rs.reserva_id = r.id
    )
  )
  from reservas r join clientes c on c.id = r.cliente_id
  where r.token = p_token;
$function$;

-- Listado para el admin (Métricas). Mismo estilo que crear_reserva_admin:
-- comprobación explícita de es_admin() con excepción, no depende de RLS.
create or replace function resenas_recientes(p_limite int default 200)
returns table(
  id uuid, estrellas int, comentario text, creado_at timestamptz,
  cliente_nombre text, servicios text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
  select r.id, r.estrellas, r.comentario, r.created_at, c.nombre,
    (select string_agg(s.nombre, ', ' order by s.orden)
       from reserva_servicios rs join servicios s on s.id = rs.servicio_id
       where rs.reserva_id = res.id)
  from resenas r
  join reservas res on res.id = r.reserva_id
  join clientes c on c.id = res.cliente_id
  order by r.created_at desc
  limit p_limite;
end;
$$;

grant execute on function resenas_recientes(int) to authenticated;

-- ============================================================
-- Fidelización: un sello por cita marcada "completada" (no por reservar,
-- por presentarse). Cada 10 sellos se puede canjear un servicio gratis.
-- Los canjes se registran en vez de restar sellos, para conservar el
-- historial de cuántos premios ha recibido cada cliente.
-- ============================================================
create table fidelizacion_canjes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  creado_at timestamptz not null default now()
);
alter table fidelizacion_canjes enable row level security;
revoke all on fidelizacion_canjes from anon, authenticated;
create index fidelizacion_canjes_cliente_idx on fidelizacion_canjes (cliente_id);

-- Progreso del cliente logueado — mismo patrón que vincular_cliente_actual:
-- usa auth.uid() en vez de recibir el id por parámetro, así que no puede
-- consultarse el de otro cliente.
create or replace function mi_fidelizacion()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_completadas int;
  v_canjes int;
begin
  select id into v_cliente_id from clientes where user_id = auth.uid();
  if v_cliente_id is null then
    return jsonb_build_object('sellos_disponibles', 0, 'puede_canjear', false);
  end if;

  select count(*) into v_completadas from reservas where cliente_id = v_cliente_id and estado = 'completada';
  select count(*) into v_canjes from fidelizacion_canjes where cliente_id = v_cliente_id;

  return jsonb_build_object(
    'sellos_disponibles', greatest(v_completadas - v_canjes * 10, 0),
    'puede_canjear', (v_completadas - v_canjes * 10) >= 10
  );
end;
$$;

grant execute on function mi_fidelizacion() to authenticated;

-- Progreso de todos los clientes, para el admin. Separada de
-- clientes_resumen() a propósito: esa función NO es SECURITY DEFINER —se
-- apoya en RLS para que un cliente normal autenticado solo vea su propia
-- fila— y convertirla habría debilitado esa protección. Esta es nueva y
-- explícitamente solo para admin.
create or replace function fidelizacion_clientes()
returns table(cliente_id uuid, sellos_disponibles int, puede_canjear boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    greatest(count(r.id) filter (where r.estado = 'completada')::int - coalesce(ca.n, 0) * 10, 0),
    (count(r.id) filter (where r.estado = 'completada')::int - coalesce(ca.n, 0) * 10) >= 10
  from clientes c
  left join reservas r on r.cliente_id = c.id
  left join (select fc.cliente_id as cid, count(*)::int as n from fidelizacion_canjes fc group by fc.cliente_id) ca
    on ca.cid = c.id
  group by c.id, ca.n;
end;
$$;

grant execute on function fidelizacion_clientes() to authenticated;

create or replace function canjear_fidelizacion(p_cliente_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completadas int;
  v_canjes int;
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select count(*) into v_completadas from reservas where cliente_id = p_cliente_id and estado = 'completada';
  select count(*) into v_canjes from fidelizacion_canjes where cliente_id = p_cliente_id;

  if (v_completadas - v_canjes * 10) < 10 then
    raise exception 'Este cliente todavía no tiene 10 sellos' using errcode = '22023';
  end if;

  insert into fidelizacion_canjes (cliente_id) values (p_cliente_id);
  return true;
end;
$$;

grant execute on function canjear_fidelizacion(uuid) to authenticated;
