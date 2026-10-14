-- Análisis del 12 oct 2026 — B4 (alta del primer admin), B8 (importar
-- clientes) y S4/S9 (endurecer la base).

-- ── B4: alta del primer administrador ────────────────────────────────────────
-- reclamar_admin() estaba cerrada a todo el mundo (bien: abierta, el primero
-- que llegara a una instalación nueva se quedaba el panel), así que una
-- instalación nueva no tenía forma de crear al primer admin. Ahora exige un
-- código de alta de un solo uso que se fija al instalar:
--   insert into alta_admin (codigo) values ('<código largo>');
create table if not exists public.alta_admin (
  codigo text primary key,
  creado_at timestamptz not null default now(),
  usado_at timestamptz
);
alter table public.alta_admin enable row level security;
revoke all on public.alta_admin from anon, authenticated;

-- Función nueva: la antigua `reclamar_admin()` sigue cerrada (sin EXECUTE).
create or replace function public.reclamar_admin_con_codigo(p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión' using errcode = '22023';
  end if;
  if coalesce(trim(p_codigo), '') = '' or not exists (select 1 from alta_admin where codigo = trim(p_codigo) and usado_at is null) then
    raise exception 'El código de alta no es válido' using errcode = '42501';
  end if;
  update barbero set user_id = auth.uid() where user_id is null;
  get diagnostics v_updated = row_count;
  if v_updated > 0 then
    update alta_admin set usado_at = now() where usado_at is null;
  end if;
  return v_updated > 0;
end;
$$;
revoke execute on function public.reclamar_admin_con_codigo(text) from public, anon;
grant execute on function public.reclamar_admin_con_codigo(text) to authenticated;

-- ── B8: importar clientes ────────────────────────────────────────────────────
-- Recibe filas ya leídas del CSV en el navegador: [{nombre, telefono, email, notas}].
-- No pisa fichas existentes (mismo teléfono): solo completa el email si faltaba.
create or replace function public.importar_clientes(p_filas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila jsonb;
  v_tel text;
  v_nombre text;
  v_email text;
  v_notas text;
  v_id uuid;
  v_creados int := 0;
  v_existentes int := 0;
  v_invalidos int := 0;
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) > 5000 then
    raise exception 'Formato no válido o demasiadas filas (máximo 5000)' using errcode = '22023';
  end if;

  for v_fila in select * from jsonb_array_elements(p_filas) loop
    v_tel := normalizar_telefono(v_fila->>'telefono');
    v_nombre := left(nullif(trim(v_fila->>'nombre'), ''), 80);
    v_email := nullif(lower(trim(v_fila->>'email')), '');
    v_notas := left(nullif(trim(v_fila->>'notas'), ''), 2000);
    if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$' then
      v_email := null;
    end if;
    if v_nombre is null or v_tel !~ '^\+?[0-9]{9,15}$' then
      v_invalidos := v_invalidos + 1;
      continue;
    end if;

    select id into v_id from clientes where telefono = v_tel;
    if v_id is null then
      insert into clientes (nombre, telefono, email) values (v_nombre, v_tel, v_email) returning id into v_id;
      v_creados := v_creados + 1;
    else
      update clientes set email = coalesce(email, v_email) where id = v_id;
      v_existentes := v_existentes + 1;
    end if;
    if v_notas is not null then
      insert into notas_internas_cliente (cliente_id, texto) values (v_id, v_notas)
        on conflict (cliente_id) do nothing;
    end if;
    v_id := null;
  end loop;

  return jsonb_build_object('creados', v_creados, 'existentes', v_existentes, 'invalidos', v_invalidos);
end;
$$;

-- ── S4: EXECUTE solo donde toca ──────────────────────────────────────────────
-- Las de administración ya comprobaban es_admin() por dentro; esto es defensa
-- en profundidad. Las de servidor (secreto) y las del flujo público se quedan.
revoke execute on function public.canjear_fidelizacion(uuid) from public, anon;
revoke execute on function public.fidelizacion_clientes() from public, anon;
revoke execute on function public.resenas_recientes(integer) from public, anon;
revoke execute on function public.crear_reserva_admin(text, text, text, uuid[], timestamptz, text) from public, anon;
revoke execute on function public.anonimizar_cliente(uuid) from public, anon;
revoke execute on function public.importar_clientes(jsonb) from public, anon;
revoke execute on function public.crear_cierre(date, date, text) from public, anon;
revoke execute on function public.mi_fidelizacion() from public, anon;
revoke execute on function public.vincular_cliente_actual() from public, anon;
revoke execute on function public.borrar_mis_datos() from public, anon;
grant execute on function public.canjear_fidelizacion(uuid) to authenticated;
grant execute on function public.fidelizacion_clientes() to authenticated;
grant execute on function public.resenas_recientes(integer) to authenticated;
grant execute on function public.crear_reserva_admin(text, text, text, uuid[], timestamptz, text) to authenticated;
grant execute on function public.anonimizar_cliente(uuid) to authenticated;
grant execute on function public.importar_clientes(jsonb) to authenticated;
grant execute on function public.crear_cierre(date, date, text) to authenticated;
grant execute on function public.mi_fidelizacion() to authenticated;
grant execute on function public.vincular_cliente_actual() to authenticated;
grant execute on function public.borrar_mis_datos() to authenticated;

-- Función de disparador: nadie tiene por qué llamarla por la API.
revoke execute on function public.reservas_broadcast() from public, anon, authenticated;

-- ── S9: índices de claves foráneas y RLS sin reevaluar auth.uid() por fila ──
create index if not exists barbero_user_id_idx on public.barbero (user_id);
create index if not exists clientes_user_id_idx on public.clientes (user_id);
create index if not exists reserva_servicios_servicio_idx on public.reserva_servicios (servicio_id);

alter policy clientes_select_propio on public.clientes using (
  (select public.es_admin()) or user_id = (select auth.uid())
);

alter policy reservas_select_propia on public.reservas using (
  (select public.es_admin())
  or cliente_id in (select id from public.clientes where user_id = (select auth.uid()))
);

alter policy reserva_servicios_select on public.reserva_servicios using (
  exists (
    select 1 from public.reservas r where r.id = reserva_servicios.reserva_id
      and ((select public.es_admin())
           or r.cliente_id in (select id from public.clientes where user_id = (select auth.uid())))
  )
);

alter policy resenas_select on public.resenas using (
  (select public.es_admin()) or exists (
    select 1 from public.reservas r
    where r.id = resenas.reserva_id
      and r.cliente_id in (select id from public.clientes where user_id = (select auth.uid()))
  )
);

alter policy resenas_insert on public.resenas with check (
  exists (
    select 1 from public.reservas r
    where r.id = resenas.reserva_id
      and r.estado = 'completada'
      and r.cliente_id in (select id from public.clientes where user_id = (select auth.uid()))
  )
);
