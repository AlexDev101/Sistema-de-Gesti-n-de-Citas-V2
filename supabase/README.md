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

## Estado

Desde el 14 de octubre de 2026 el repositorio tiene **todas** las migraciones
aplicadas en producción (30), y con ellas se reproduce la base desde cero (ver
`docs/INSTALACION.md`). `pendiente/notas_internas_limpieza.sql` se aplicó ese
día y pasó a `migrations/` con su versión.

Regla: todo cambio de esquema entra por un fichero nuevo en esta carpeta. Nada
de SQL suelto contra producción.

Nota: las migraciones de esa fecha evitan `drop` a propósito (las funciones que
cambian de firma tienen nombre nuevo: `crear_reserva_publica`,
`reclamar_admin_con_codigo`, `slots_disponibles_excluyendo`). Las antiguas
siguen existiendo sin permiso de ejecución para `anon`.

## Negocio nuevo

El primer administrador se da de alta con un código de un solo uso:

```sql
insert into alta_admin (codigo) values ('<código largo>');
```

En `/admin/login`, mientras nadie ha reclamado el panel, se pide ese código y
un email; al verificarlo, esa cuenta queda como administradora y el código se
marca como usado.

## Pruebas

`tests/funciones.sql` crea reservas de prueba, las mueve, prueba el límite de
24 h, los cierres, el límite por conexión y la anonimización, y lo deshace
todo con `rollback`. Debe devolver todas las filas con `ok = true`.
