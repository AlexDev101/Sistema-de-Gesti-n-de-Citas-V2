-- Resumen por cliente para el panel admin (visitas, gasto, segmento).
-- SECURITY INVOKER (por defecto): corre con los permisos del admin que
-- llama, así que las políticas RLS de `clientes`/`reservas` (es_admin())
-- siguen aplicando — nadie sin rol admin ve la lista completa.
create or replace function clientes_resumen()
returns table(
  id uuid,
  nombre text,
  telefono text,
  email text,
  notas_internas text,
  visitas int,
  ultima_visita timestamptz,
  gasto_total_cents bigint,
  segmento text
)
language sql
stable
set search_path = public
as $$
  select
    c.id, c.nombre, c.telefono, c.email, c.notas_internas,
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
  left join reservas r on r.cliente_id = c.id
  group by c.id
  order by max(r.inicio) desc nulls last;
$$;

grant execute on function clientes_resumen() to authenticated;
