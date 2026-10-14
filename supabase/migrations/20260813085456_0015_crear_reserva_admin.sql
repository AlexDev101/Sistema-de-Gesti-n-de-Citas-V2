-- Reserva creada por el propio admin (cita en persona / por teléfono).
-- A diferencia de crear_reserva(): sin antelación mínima/máxima (un cliente
-- puede entrar por la puerta y pedir hora ya mismo) y sin exigir que el
-- inicio caiga exactamente en la rejilla de slots_disponibles (el admin
-- puede ajustar a mano). La restricción EXCLUDE sin_solape sigue siendo la
-- única garantía real contra dobles reservas, igual que en el flujo público.
create or replace function crear_reserva_admin(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_servicio_ids uuid[],
  p_inicio timestamptz,
  p_notas text default null
)
returns table(reserva_id uuid, token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_duracion int;
  v_precio int;
  v_fin timestamptz;
  v_reserva_id uuid;
  v_token uuid;
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

  select coalesce(sum(duracion_min), 0), coalesce(sum(precio_cents), 0)
    into v_duracion, v_precio
    from servicios where id = any(p_servicio_ids) and activo;

  if v_duracion = 0 then
    raise exception 'Los servicios seleccionados ya no están disponibles' using errcode = '22023';
  end if;

  v_fin := p_inicio + (v_duracion || ' minutes')::interval;

  insert into clientes (nombre, telefono, email)
    values (trim(p_nombre), trim(p_telefono), nullif(trim(p_email), ''))
    on conflict (telefono) do update
      set nombre = excluded.nombre,
          email = coalesce(excluded.email, clientes.email)
    returning clientes.id into v_cliente_id;

  begin
    insert into reservas (cliente_id, inicio, fin, precio_total_cents, notas)
      values (v_cliente_id, p_inicio, v_fin, v_precio, p_notas)
      returning reservas.id, reservas.token into v_reserva_id, v_token;
  exception when exclusion_violation then
    raise exception 'Ese hueco ya está ocupado' using errcode = '22023';
  end;

  insert into reserva_servicios (reserva_id, servicio_id, precio_cents, duracion_min)
    select v_reserva_id, s.id, s.precio_cents, s.duracion_min
    from servicios s where s.id = any(p_servicio_ids) and s.activo;

  return query select v_reserva_id, v_token;
end;
$$;

grant execute on function crear_reserva_admin(text, text, text, uuid[], timestamptz, text) to authenticated;
