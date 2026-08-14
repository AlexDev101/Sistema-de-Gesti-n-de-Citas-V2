-- Motor de disponibilidad — ver README "Motor de disponibilidad"
create or replace function slots_disponibles(p_fecha date, p_duracion_min int)
returns table(inicio timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with franjas as (
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
  from bloques b
  where not exists (
      select 1 from cierres c
      where c.rango && tstzrange(b.inicio_ts, b.inicio_ts + (p_duracion_min || ' minutes')::interval, '[)')
    )
    and not exists (
      select 1 from reservas r
      where r.estado in ('confirmada', 'completada')
        and r.rango && tstzrange(b.inicio_ts, b.inicio_ts + (p_duracion_min || ' minutes')::interval, '[)')
    )
    and b.inicio_ts > now()
  order by b.inicio_ts;
$$;

grant execute on function slots_disponibles(date, int) to anon, authenticated;
