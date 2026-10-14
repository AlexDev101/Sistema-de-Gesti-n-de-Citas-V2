# Instalar el sistema para un negocio nuevo

Guía de entrega: de cero a una web de reservas funcionando con la marca del
cliente. Unas 2 horas la primera vez. No hace falta tocar código.

Necesitas cuentas (gratuitas para empezar) en **GitHub**, **Supabase**,
**Netlify**, **Resend** y **Cloudflare** (solo para el captcha).

> **Coste y planes.** El plan gratuito de Supabase **pausa el proyecto tras
> unos días sin actividad** y no incluye copias de seguridad automáticas; para
> un negocio real conviene Supabase Pro. Netlify gratuito admite uso comercial
> con límites de tráfico holgados para una barbería. Decide antes de vender
> quién paga cada servicio y a nombre de quién quedan las cuentas.

## 1. Copia del código

1. Crea un repositorio nuevo en GitHub a partir de este (Use this template, o
   un fork privado).
2. Clónalo y comprueba que arranca:

   ```bash
   npm ci
   cp .env.example .env.local   # se rellena en los pasos siguientes
   npm test
   ```

## 2. Base de datos (Supabase)

1. Crea un proyecto en Supabase en la región **eu-west** (Irlanda/Fráncfort).
2. Aplica todas las migraciones del repositorio, en orden:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```

   Si no usas la CLI, pega uno a uno los ficheros de
   `supabase/migrations/` en el editor SQL, por orden de nombre.

   > Las migraciones crean datos de ejemplo de la barbería original (nombre,
   > dirección, servicios, horario). Se cambian todos desde el panel en el
   > paso 6.

3. Genera el **secreto de servidor** y guárdalo en la base. Es el mismo valor
   que irá en `CRON_SECRET`:

   ```bash
   openssl rand -hex 32
   ```

   ```sql
   insert into cron_secreto (secreto, endpoint)
   values ('<secreto>', 'https://<dominio-de-la-web>/api/cron/recordatorios')
   on conflict (unico) do update
     set secreto = excluded.secreto, endpoint = excluded.endpoint;
   ```

   Con eso, la base llama cada hora a la web para enviar los recordatorios
   (`pg_cron`, ya programado por las migraciones). Si aún no sabes el dominio,
   pon el de Netlify (`https://<sitio>.netlify.app`) y cámbialo luego.

4. Crea el **código de alta** del primer administrador (de un solo uso):

   ```sql
   insert into alta_admin (codigo) values ('<un código largo que le darás al dueño>');
   ```

5. En *Authentication → URL Configuration* pon la URL de la web como *Site URL*.
   En *Authentication → Emails* comprueba que la plantilla de recuperación de
   contraseña apunta a `{{ .SiteURL }}/auth/confirm`.

6. Comprueba que todo responde: pega `supabase/tests/funciones.sql` en el
   editor SQL. Tiene que devolver todas las filas con `ok = true` (no deja
   nada guardado).

## 3. Emails (Resend)

1. Crea una API key en Resend.
2. **Verifica el dominio del negocio** (registros DNS que te da Resend). Sin
   esto, los emails solo llegan a la dirección de tu cuenta de Resend.
3. Anota el remitente, por ejemplo `Barbería Ejemplo <citas@barberiaejemplo.es>`.

## 4. Captcha (Cloudflare Turnstile)

En el panel de Cloudflare → *Turnstile* → *Add widget*, con el dominio de la
web (y `localhost` si quieres probar en local). Guarda la *site key* y la
*secret key*.

## 5. Web (Netlify)

1. *Add new site → Import an existing project →* el repositorio de GitHub.
   Netlify detecta Next.js solo (`netlify.toml` ya está en el repo).
2. En *Site configuration → Environment variables* añade:

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ídem (clave *anon* / *publishable*) |
   | `CRON_SECRET` | el secreto del paso 2.3 |
   | `RESEND_API_KEY` | paso 3 |
   | `RESEND_FROM_EMAIL` | paso 3 |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | paso 4 |
   | `TURNSTILE_SECRET_KEY` | paso 4 |
   | `SITE_URL` | `https://www.dominio-del-cliente.es` (opcional en Netlify) |

3. *Deploy*. Después, en *Domain management*, añade el dominio del cliente.
4. Si el dominio final es distinto del que pusiste en el paso 2.3, actualiza
   `cron_secreto.endpoint`.

## 6. Primer arranque y personalización

1. Entra en `https://<dominio>/admin/login`. Como nadie ha reclamado el panel,
   pide **código de alta** + email. Tras verificar el email, esa cuenta queda
   como administradora y el código deja de valer.
2. En *Ajustes → Cambiar contraseña*, elige una contraseña.
3. En *Ajustes* rellena: nombre del negocio, ciudad, dirección, teléfono,
   barbero, color y logo, límite para cambiar/cancelar, **email de avisos** y
   **datos legales** (titular, NIF, email). Mientras falten los datos legales,
   las páginas de privacidad y aviso legal muestran un aviso de «plantilla».
4. En *Servicios* y *Horario* deja los del negocio. En *Horario* también se
   cierran días (vacaciones, festivos).
5. Las fotos de la portada están en `public/uploads/` (`hero-local.jpeg`,
   `barbero-retrato.jpeg`, `trabajo-1…4.jpeg`): sustitúyelas en el repositorio
   y vuelve a desplegar.
6. Si el negocio viene de otra agenda (Booksy, Treatwell…), exporta sus
   clientes a CSV e impórtalos en *Clientes → Importar CSV*.

## 7. Comprobación final

- [ ] Reserva de prueba desde el móvil con tu propio email: llega la confirmación.
- [ ] Cambia la hora desde el enlace del email: llega el aviso de cambio
      (al cliente y al email de avisos).
- [ ] Mueve la cita desde la Agenda: llega el aviso al cliente.
- [ ] Cancélala: el hueco vuelve a aparecer en la web.
- [ ] Cierra un día en *Horario*: la web deja de ofrecerlo.
- [ ] Revisa los textos de `/privacidad` y `/aviso-legal` con el dueño.
      **Son una plantilla**: si hay dudas, que los revise un asesor.

## Mantenimiento

- **Recordatorios**: la base los lanza cada hora. Para ver si van:
  `select * from cron.job_run_details order by start_time desc limit 10;`
- **Emails que fallan**: aparecen en *Hoy* con un aviso naranja.
- **Cambios de esquema**: siempre con un fichero nuevo en `supabase/migrations/`
  (ver `supabase/README.md`), nunca SQL suelto en producción.
