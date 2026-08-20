import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarBlank, CheckCircle, Scissors, XCircle } from "@phosphor-icons/react/ssr";
import { obtenerReservaPorToken } from "@/lib/actions/reservas";
import { getConfiguracion } from "@/lib/data/negocio";
import { Confetti } from "@/components/client/Confetti";
import { AccionesConfirmacion } from "@/components/client/AccionesConfirmacion";
import { CancelarReserva } from "@/components/client/CancelarReserva";
import { DejarResena } from "@/components/client/DejarResena";

export const revalidate = 0;

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
    timeZone: "Europe/Madrid",
  });

  const cancelada = reserva.estado === "cancelada";
  const completada = reserva.estado === "completada";

  return (
    <div className="relative flex min-h-dvh flex-col justify-center gap-6 overflow-hidden px-6 pt-[env(safe-area-inset-top)] pb-[60px]">
      {!cancelada && <Confetti />}
      <div
        className="grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: cancelada
            ? "color-mix(in srgb, var(--color-text) 10%, transparent)"
            : "color-mix(in srgb, var(--color-accent) 16%, transparent)",
          color: cancelada ? "color-mix(in srgb, var(--color-text) 55%, transparent)" : "var(--color-accent)",
        }}
      >
        {cancelada ? <XCircle size={30} weight="regular" /> : <CheckCircle size={30} weight="fill" />}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="m-0">{cancelada ? "Cita cancelada" : completada ? "Cita realizada" : "Cita confirmada"}</h3>

        <div
          className="flex flex-col gap-3 rounded-[var(--radius-lg)] p-4"
          style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center gap-2.5">
            <CalendarBlank size={17} color={cancelada ? "color-mix(in srgb, var(--color-text) 45%, transparent)" : "var(--color-accent)"} />
            <span className="text-sm">{cuando}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Scissors size={17} color={cancelada ? "color-mix(in srgb, var(--color-text) 45%, transparent)" : "var(--color-accent)"} />
            <span className="text-sm">{serviciosTxt}</span>
          </div>
        </div>

        {config?.nombre_negocio && (
          <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
            {config.nombre_negocio}
          </span>
        )}
      </div>

      {/* Una cita ya realizada no se puede cancelar ni tiene sentido añadirla
          al calendario — en su lugar se pide la valoración. */}
      {completada ? (
        <DejarResena token={token} resenaExistente={reserva.resena} />
      ) : (
        !cancelada && (
          <div className="flex flex-col gap-2">
            <Link href="/cuenta" className="btn btn-primary btn-block" style={{ height: 44 }}>
              Ver en mi cuenta
            </Link>
            <AccionesConfirmacion
              titulo={`Cita en ${config?.nombre_negocio ?? "FG Hair Studio"}`}
              descripcion={serviciosTxt}
              ubicacion={config?.direccion ?? ""}
              inicioISO={reserva.inicio}
              finISO={reserva.fin}
            />
            <CancelarReserva token={token} politica={config?.politica_cancelacion ?? ""} />
          </div>
        )
      )}
      {!cancelada && !completada && (
        <p className="m-0 text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 40%, transparent)" }}>
          Te enviamos la confirmación por email y un recordatorio 24 h antes.
        </p>
      )}
    </div>
  );
}
