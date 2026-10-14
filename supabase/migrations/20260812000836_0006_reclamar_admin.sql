-- Primer arranque: el primer usuario autenticado que llama a esta función se
-- vincula como admin (fila `barbero`, que hasta entonces tiene user_id null).
-- Idempotente y de un solo uso: no hace nada si ya hay alguien vinculado.
create or replace function reclamar_admin()
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
  update barbero set user_id = auth.uid() where user_id is null;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function reclamar_admin() to authenticated;
