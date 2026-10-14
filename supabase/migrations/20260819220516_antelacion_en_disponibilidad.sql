-- El calendario y la rejilla de horas no conocían la antelación mínima que sí
-- aplica crear_reserva, y eso producía dos incoherencias:
--
--   1. slots_disponibles solo filtraba `inicio_ts > now()`, así que el asistente
--      podía ofrecer un hueco dentro de las 2 h siguientes que crear_reserva
--      rechazaba después.
--   2. ocupacion_mes calculaba `cap` sobre el día entero, así que hoy salía
--      seleccionable en el calendario aunque ya no quedara ningún hueco
--      reservable — contradiciendo la leyenda "los días atenuados no tienen
--      hueco".
--
-- Ambas pasan a filtrar por el mismo corte. El admin reserva sin antelación
-- (crear_reserva_admin no la comprueba), así que puede pedir el corte en now().

drop function if exists slots_disponibles(date, integer);
drop function if exists ocupacion_mes(integer, integer);

create or replace function slots_disponibles(
  p_fecha date,
  p_duracion_min integer,
  p_respetar_antelacion boolean default true
)
returns table(inicio timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with corte as (
    select now() + case
      when p_respetar_antelacion then
        (coalesce((select antelacion_min_horas from configuracion limit 1), 2) || ' hours')::interval
      else interval '0'
    end as desde
  ),
  franjas as (
    select abre, cierra
    from horario_barbero
    where dia_semana = extract(dow from p_fecha)
  ),
  bloques as (
    select (ts) at time zone 'Europe/Madrid' as inicio_ts
    from franjas f,
    lateral generate_series(
      p_fecha + f.abre,
      p_fecha + f.cierra - (p_duracion_min || ' minutes')::interval,
      interval '30 min'
    ) as ts
  )
  select b.inicio_ts
  from bloques b, corte
  where not exists (
      select 1 from cierres c
      where c.rango && tstzrange(b.inicio_ts, b.inicio_ts + (p_duracion_min || ' minutes')::interval, '[)')
    )
    and not exists (
      select 1 from reservas r
      where r.estado in ('confirmada', 'completada')
        and r.rango && tstzrange(b.inicio_ts, b.inicio_ts + (p_duracion_min || ' minutes')::interval, '[)')
    )
    and b.inicio_ts > corte.desde
  order by b.inicio_ts;
$$;

create or replace function ocupacion_mes(
  p_anio integer,
  p_mes integer,
  p_respetar_antelacion boolean default true
)
returns table(fecha date, ocupados integer, cap integer)
language sql
stable
security definer
set search_path = public
as $$
  with corte as (
    select now() + case
      when p_respetar_antelacion then
        (coalesce((select antelacion_min_horas from configuracion limit 1), 2) || ' hours')::interval
      else interval '0'
    end as desde
  ),
  dias as (
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
  -- `cap` cuenta solo bloques todavía reservables: si hoy ya no queda ninguno,
  -- cap = 0, el día se pinta como cerrado y deja de ser seleccionable.
  bloques_validos as (
    select b.* from bloques b, corte
    where b.inicio_ts > corte.desde
      and not exists (
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

grant execute on function slots_disponibles(date, integer, boolean) to anon, authenticated;
grant execute on function ocupacion_mes(integer, integer, boolean) to anon, authenticated;
