-- Resumen de ocupación por día para pintar el calendario mensual del
-- asistente de reserva y de la vista Mes del admin, en una sola llamada.
create or replace function ocupacion_mes(p_anio int, p_mes int)
returns table(fecha date, ocupados int, cap int)
language sql
stable
security definer
set search_path = public
as $$
  with dias as (
    select d::date as fecha
    from generate_series(
      make_date(p_anio, p_mes, 1),
      (make_date(p_anio, p_mes, 1) + interval '1 month - 1 day')::date,
      interval '1 day'
    ) as d
  ),
  franjas as (
    select dias.fecha, h.abre, h.cierra
    from dias
    join horario_barbero h on h.dia_semana = extract(dow from dias.fecha)
  ),
  bloques as (
    select f.fecha, (ts) at time zone 'Europe/Madrid' as inicio_ts
    from franjas f,
    lateral generate_series(f.fecha + f.abre, f.fecha + f.cierra - interval '30 min', interval '30 min') as ts
  ),
  bloques_validos as (
    select b.* from bloques b
    where not exists (
      select 1 from cierres c
      where c.rango && tstzrange(b.inicio_ts, b.inicio_ts + interval '30 min', '[)')
    )
  )
  select
    d.fecha,
    count(*) filter (
      where exists (
        select 1 from reservas r
        where r.estado in ('confirmada', 'completada')
          and r.rango && tstzrange(bv.inicio_ts, bv.inicio_ts + interval '30 min', '[)')
      )
    )::int as ocupados,
    count(bv.inicio_ts)::int as cap
  from dias d
  left join bloques_validos bv on bv.fecha = d.fecha
  group by d.fecha
  order by d.fecha;
$$;

grant execute on function ocupacion_mes(int, int) to anon, authenticated;
