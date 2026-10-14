-- Crítico 5 de la revisión del 2 oct 2026.
--
-- El panel ya está reclamado, pero reclamar_admin() seguía ejecutable por
-- cualquier usuario con sesión y barbero.user_id era `on delete set null`:
-- borrar el usuario administrador dejaba el panel libre para el primero que
-- llamara a la función.
--
-- Ahora la función solo la puede ejecutar el propietario (SQL desde el panel
-- de Supabase) y no se puede borrar el usuario administrador mientras siga
-- enlazado al barbero.
--
-- Para un negocio nuevo (barbero.user_id vacío) hay que volver a dar el
-- permiso durante el primer arranque:
--   grant execute on function public.reclamar_admin() to authenticated;
-- y retirarlo otra vez cuando el panel esté reclamado.

revoke execute on function public.reclamar_admin() from public, anon, authenticated;

alter table public.barbero
  drop constraint barbero_user_id_fkey,
  add constraint barbero_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete restrict;
