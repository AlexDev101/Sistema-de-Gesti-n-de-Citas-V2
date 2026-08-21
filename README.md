# FG Hair Studio — Sistema de Reserva de Citas

Aplicación de reservas online para una barbería real (Francíso García, Niebla, Huelva). Los clientes reservan sin cuenta desde el móvil, y el barbero gestiona el día a día desde un panel de administración.

**Demo en producción:** https://fg-barbershop.vercel.app

## Capturas

_Pendiente: añade aquí 2-3 capturas (por ejemplo en `docs/screenshots/`) y se incrustan._

## Funcionalidades

### Cliente (`/`, `/reservar`, `/cuenta`)
- Reserva en 3 pasos (servicio → fecha/hora con ocupación en vivo → confirmación), sin necesidad de cuenta.
- Anti-doble-reserva a nivel de base de datos (constraint `EXCLUDE` en Postgres), no solo en la app.
- Email de confirmación y recordatorio a las 24 h antes de la cita (Resend + cron).
- Cancelación desde el enlace del email de confirmación.
- Programa de fidelización (1 sello por visita completada, canjeable cada 10) y reseñas post-cita, todo sin login.
- Página de inicio con carrusel de trabajos recientes (deslizable, sin recortar fotos).

### Administración (`/admin`)
- **Agenda**: vista día/semana/mes, reprogramar citas arrastrando.
- **Hoy**: check-in rápido — marcar cita como asistida o no asistida.
- **Nueva cita**: reservas por teléfono/walk-in, sin la antelación mínima que aplica al público.
- **Servicios**, **Horario**, **Clientes**, **Métricas** y **Ajustes**.
- Login solo con email + contraseña; sin `service_role` en ningún punto de la app (las tareas privilegiadas usan funciones `SECURITY DEFINER` en Postgres, acotadas con un secreto propio).

## Stack

- **Next.js 16** (App Router, Server Actions, Route Handlers) + **React 19** + **TypeScript**
- **Supabase** (Postgres, Auth, RLS, funciones `SECURITY DEFINER`, cron)
- **Tailwind CSS v4** con tokens de diseño propios ("Nocturne", ver `src/styles/nocturne.css`)
- **Resend** para email transaccional
- Desplegado en **Vercel**

## Desarrollo local

```bash
npm install
npm run dev
```

Necesita un `.env.local` con las credenciales de Supabase y Resend (no incluido en el repositorio).

```bash
npm run build   # build de producción
npm run lint     # eslint
```

## Estructura

```
src/app/(client)/     páginas públicas: landing, reservar, cuenta
src/app/admin/        panel de administración (protegido)
src/components/       componentes de cliente, admin y compartidos
src/lib/              acciones de servidor, acceso a datos, utilidades
supabase/migrations/  esquema y funciones de la base de datos
```
