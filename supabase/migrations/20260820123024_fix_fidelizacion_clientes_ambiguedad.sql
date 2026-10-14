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