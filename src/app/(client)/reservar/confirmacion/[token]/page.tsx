import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, XCircle } from "@phosphor-icons/react/ssr";
import { obtenerReservaPorToken } from "@/lib/actions/reservas";
import { getConfiguracion } from "@/lib/data/negocio";
import { Confetti } from "@/components/client/Confetti";
import { AccionesConfirmacion } from "@/components/client/AccionesConfirmacion";
import { CancelarReserva } from "@/components/client/CancelarReserva";

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

  return (
    <div className="relative flex min-h-dvh flex-col justify-center gap-[22px] overflow-hidden px-6 pt-[env(safe-area-inset-top)] pb-[60px]">
      {!cancelada && <Confetti />}
      <div
        className="grid h-14 w-14 place-items-center rounded-full"
        style={{
          border: `1px solid ${cancelada ? "color-mix(in srgb, var(--color-text) 40%, transparent)" : "var(--color-accent)"}`,
          color: cancelada ? "color-mix(in srgb, var(--color-text) 55%, transparent)" : "var(--color-accent)",
        }}
      >
        {cancelada ? <XCircle size={26} weight="regular" /> : <CheckCircle size={26} weight="regular" />}
      </div>
      <div>
        <h3 className="mb-2">{cancelada ? "Cita cancelada" : "Cita confirmada"}</h3>
        <p
          className="m-0 text-sm leading-relaxed"
          style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}
        >
          {cuando}
          <br />
          {serviciosTxt}
          <br />
          {config?.nombre_negocio}
        </p>
      </div>
      {!cancelada && (
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
      )}
      {!cancelada && (
        <p className="m-0 text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 40%, transparent)" }}>
          Te enviamos la confirmación por email y un recordatorio 24 h antes.
        </p>
      )}
    </div>
  );
}
