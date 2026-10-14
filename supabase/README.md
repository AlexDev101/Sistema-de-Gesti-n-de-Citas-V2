# Migraciones

`migrations/` refleja el historial aplicado en el proyecto de Supabase
(`supabase_migrations.schema_migrations`): un fichero por migración, con el
nombre `<versión>_<nombre>.sql` que usa la CLI de Supabase.

Hasta el 2 de octubre de 2026 aquí solo había 7 ficheros numerados a mano
(`0001`–`0007`), mientras que la base tenía 19 migraciones aplicadas: las que
faltaban se habían ejecutado directamente contra la base. Ese día se trajeron
todas y se renombraron las existentes para que coincidan con la base.

Todos los ficheros son idénticos, byte a byte, a lo que se aplicó, salvo tres
que conservan la versión del repo porque tiene comentarios más completos:

- `20260819125911_cron_recordatorios_sin_service_role.sql`
- `20260819220516_antelacion_en_disponibilidad.sql` (solo cambian comentarios)
- `20260820122936_fidelizacion_y_resenas.sql`

## Pendiente de aplicar

`pendiente/notas_internas_limpieza.sql` es la segunda parte de
`20261003015242_notas_internas_solo_admin.sql`: borra la columna
`clientes.notas_internas` y vacía las notas internas que quedaran en
`reservas.notas`. Supabase pide confirmación para ejecutarla porque borra
datos. Hay que aplicarla después de desplegar el código que escribe en las
tablas nuevas, y entonces mover el fichero a `migrations/` con su versión.

Regla a partir de ahora: todo cambio de esquema entra por un fichero nuevo en
esta carpeta. Nada de SQL suelto contra producción.

## Negocio nuevo

`reclamar_admin()` tiene el permiso de ejecución retirado
(`20261002210213_cerrar_reclamar_admin.sql`). Para reclamar el panel en una
instalación nueva hay que darlo durante el primer arranque y retirarlo después:

```sql
grant execute on function public.reclamar_admin() to authenticated;
-- ...el barbero verifica su email en /admin/login...
revoke execute on function public.reclamar_admin() from authenticated;
```
