import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarBlank, CheckCircle, MapPin, Scissors, XCircle } from "@phosphor-icons/react/ssr";
import { obtenerReservaPorToken } from "@/lib/actions/reservas";
import { getConfiguracion } from "@/lib/data/negocio";
import { telHref } from "@/lib/contacto";
import { TZ } from "@/lib/format";
import { Confetti } from "@/components/client/Confetti";
import { AccionesConfirmacion } from "@/components/client/AccionesConfirmacion";
import { CancelarReserva } from "@/components/client/CancelarReserva";
import { CambiarCita } from "@/components/client/CambiarCita";
import { DejarResena } from "@/components/client/DejarResena";

export const revalidate = 0;

export const metadata = { title: "Tu cita", robots: { index: false } };

// Fuera del componente: la página se renderiza en cada petición
// (revalidate = 0), así que "ahora" es el momento de la petición.
function yaPaso(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

const muted = (pct: number) => `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`;

export default async function ConfirmacionPage({
  params,
}: PageProps<"/reservar/confirmacion/[token]">) {
  const { token } = await params;
  const [reserva, config] = await Promise.all([obtenerReservaPorToken(token), getConfiguracion()]);
  if (!reserva) notFound();

  const serviciosTxt = (reserva.servicios ?? []).map((s) => s.nombre).join(", ");
  const cuando = new Date(reserva.inicio).toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

  const cancelada = reserva.estado === "cancelada";
  const completada = reserva.estado === "completada";
  const noShow = reserva.estado === "no_show";
  const pendiente = reserva.estado === "confirmada";
  const pasada = yaPaso(reserva.inicio);
  const horasLimite = config?.horas_limite_cambio ?? 24;
  const nombreNegocio = config?.nombre_negocio ?? "";
  const titulo = cancelada ? "Cita cancelada" : completada ? "Cita realizada" : noShow ? "Cita no realizada" : "Cita confirmada";

  return (
    <div className="relative flex min-h-dvh flex-col justify-center gap-6 overflow-hidden px-6 pt-[env(safe-area-inset-top)] pb-[60px]">
      {pendiente && !pasada && <Confetti />}
      <div
        className="grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: cancelada || noShow ? muted(10) : "color-mix(in srgb, var(--color-accent) 16%, transparent)",
          color: cancelada || noShow ? muted(60) : "var(--color-accent)",
        }}
      >
        {cancelada || noShow ? <XCircle size={30} weight="regular" /> : <CheckCircle size={30} weight="fill" />}
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="m-0 text-[25px]" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>{titulo}</h1>

        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] p-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2.5">
            <CalendarBlank size={17} color={cancelada ? muted(50) : "var(--color-accent)"} />
            <span className="text-sm first-letter:uppercase">{cuando}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Scissors size={17} color={cancelada ? muted(50) : "var(--color-accent)"} />
            <span className="text-sm">{serviciosTxt}</span>
          </div>
          {config?.direccion && (
            <a
              className="flex items-center gap-2.5"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.direccion)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-text)" }}
            >
              <MapPin size={17} color={cancelada ? muted(50) : "var(--color-accent)"} />
              <span className="text-sm">{config.direccion}</span>
            </a>
          )}
        </div>

        {nombreNegocio && <span className="text-xs" style={{ color: muted(60) }}>{nombreNegocio}</span>}
      </div>

      {/* Una cita ya realizada no se puede cancelar ni añadir al calendario:
          en su lugar se pide la valoración. */}
      {completada && <DejarResena token={token} resenaExistente={reserva.resena} />}

      {pendiente && !pasada && (
        <div className="flex flex-col gap-2">
          <Link href="/cuenta" className="btn btn-primary btn-block" style={{ height: 44 }}>
            Ver en mi cuenta
          </Link>
          <AccionesConfirmacion
            titulo={nombreNegocio ? `Cita en ${nombreNegocio}` : "Cita"}
            descripcion={serviciosTxt}
            ubicacion={config?.direccion ?? ""}
            inicioISO={reserva.inicio}
            finISO={reserva.fin}
          />
          {reserva.puede_cambiar ? (
            <>
              <CambiarCita token={token} duracionMin={reserva.duracion_min} inicioActual={reserva.inicio} />
              <CancelarReserva token={token} politica={config?.politica_cancelacion ?? ""} />
            </>
          ) : (
            // Pasado el límite la base rechaza el cambio y la cancelación:
            // mejor decirlo antes que dejar pulsar un botón que va a fallar.
            <p className="m-0 mt-2 text-center text-xs" style={{ color: muted(70) }}>
              Faltan menos de {horasLimite} h para tu cita. Para cambiarla o cancelarla,{" "}
              {config?.telefono ? (
                <a href={telHref(config.telefono)}>llama al {config.telefono}</a>
              ) : (
                "llama a la barbería"
              )}
              .
            </p>
          )}
        </div>
      )}

      {pendiente && !pasada && (
        <p className="m-0 text-[11px]" style={{ color: muted(55) }}>
          {reserva.tiene_email
            ? "Te hemos enviado la confirmación por email y te mandaremos un recordatorio antes de la cita."
            : "No dejaste email, así que no recibirás confirmación ni recordatorio: guarda esta página (o añádela al calendario) para poder cambiar o cancelar la cita."}
        </p>
      )}
    </div>
  );
}
