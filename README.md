# Sistema de Reserva de Citas para barberías y peluquerías

Reservas online para un negocio de un sillón: los clientes reservan sin cuenta
desde el móvil y el profesional gestiona el día desde un panel. Todo lo que
cambia de un negocio a otro (nombre, barbero, horario, color, logo, textos
legales) se edita desde el panel, sin tocar código.

Instancia actual: barbería de Francíso García (Niebla, Huelva), desplegada en
Netlify. Para montar una instancia nueva: **[docs/INSTALACION.md](docs/INSTALACION.md)**.

## Funcionalidades

### Cliente (`/`, `/reservar`, `/cuenta`)
- Reserva en 3 pasos (servicio → fecha y hora con ocupación en vivo → datos),
  sin cuenta. Captcha invisible (Cloudflare Turnstile) y aceptación del aviso
  de privacidad.
- Imposible reservar dos veces el mismo hueco: lo impide la base de datos
  (restricción `EXCLUDE`), no solo la app. Límite de citas pendientes por
  teléfono y de reservas por hora desde la misma conexión.
- Emails de confirmación, de cambio y de cancelación, y **recordatorio** entre
  2 y 24 h antes (cada hora, lanzado desde la base con `pg_cron`).
- **Cambiar fecha u hora** o **cancelar** desde el enlace de la cita, hasta el
  límite configurado (24 h por defecto, aplicado en la base).
- Mi cuenta con código por email: próximas citas, historial, «Repetir»,
  tarjeta de fidelización y **borrar mis datos**.
- Páginas de privacidad y aviso legal (plantilla que se completa en Ajustes).

### Panel (`/admin`)
- **Hoy**: citas del día con llamar/WhatsApp, «Asistido / No asistido» con
  deshacer, huecos libres y ocupación sobre el horario real, y aviso de emails
  que no salieron.
- **Agenda**: día/semana/mes con el horario real, arrastrar para mover (en
  escritorio) y **Mover a…** (en el móvil), cancelación con confirmación y
  aviso al cliente.
- **Horario** semanal y **días cerrados** (vacaciones, festivos).
- **Clientes**: segmentos, fidelización, notas, exportar e **importar CSV**
  (Booksy, Treatwell, hojas de cálculo) y borrado de datos a petición (RGPD).
- **Métricas**: cobrado, ticket medio, **tasa de plantones**, previsto y
  comparación con los 30 días anteriores.
- **Ajustes**: datos del negocio y del barbero, color y logo, reglas de
  reserva, email de avisos y datos legales.
- Funciona en el móvil (navegación superior, paneles como hojas inferiores).

## Stack

- **Next.js 16** (App Router, Server Actions, `after()`) + **React 19** + **TypeScript**
- **Supabase**: Postgres con RLS, funciones `SECURITY DEFINER`, Auth, Realtime, `pg_cron` + `pg_net`
- **Tailwind CSS v4** con los tokens de diseño «Nocturne» (`src/styles/nocturne.css`)
- **Resend** para el email transaccional, **Cloudflare Turnstile** para el captcha
- Desplegado en **Netlify**

Sin `service_role` en ningún punto de la app: lo que necesita saltarse RLS
(crear una reserva pública, leer el email de un cliente para avisarle, los
recordatorios) pasa por funciones de Postgres que exigen un secreto de servidor
(`CRON_SECRET`) que nunca llega al navegador.

## Desarrollo

```bash
npm ci
cp .env.example .env.local   # y rellénalo
npm run dev
```

```bash
npm test            # Vitest: horario, métricas, CSV, validaciones, fechas
npm run lint
npm run typecheck
npm run build
```

`supabase/tests/funciones.sql` prueba las funciones de reserva contra una base
real sin dejar nada guardado. GitHub Actions ejecuta lint, tipos, tests y build
en cada push (`.github/workflows/ci.yml`).

## Estructura

```
src/app/(client)/      web pública: portada, reservar, cuenta, cita, legales
src/app/admin/         panel (protegido)
src/app/api/cron/      recordatorios (los llama la base cada hora)
src/components/        cliente, panel, compartidos y UI (Dialogo)
src/lib/               acciones de servidor, datos, avisos por email, utilidades puras (+ tests)
src/emails/            plantillas de email (React Email)
supabase/migrations/   esquema completo y reproducible
supabase/tests/        prueba de humo de las funciones
docs/INSTALACION.md    guía de entrega para un negocio nuevo
```
