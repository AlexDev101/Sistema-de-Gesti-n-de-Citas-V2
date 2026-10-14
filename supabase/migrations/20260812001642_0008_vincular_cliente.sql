-- Tras iniciar sesión con el código por email (Supabase Auth OTP), vincula
-- la ficha de cliente existente que comparte ese email — así "Mi cuenta"
-- puede ver sus reservas por RLS (clientes.user_id = auth.uid()).
create or replace function vincular_cliente_actual()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_updated int;
begin
  if auth.uid() is null then
    return false;
  end if;
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return false;
  end if;
  update clientes set user_id = auth.uid()
    where lower(email) = lower(v_email) and user_id is null;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function vincular_cliente_actual() to authenticated;
