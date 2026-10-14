"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { obtenerSlotsCambio, reprogramarReservaPorToken } from "@/lib/actions/reservas";
import { SelectorFechaHora } from "@/components/shared/SelectorFechaHora";
import { Dialogo } from "@/components/ui/Dialogo";
import { hhmm, TZ } from "@/lib/format";

// «Cambiar fecha u hora» desde la página de la cita. El recordatorio ya lo
// prometía y no existía: había que cancelar y volver a reservar, o llamar.
export function CambiarCita({ token, duracionMin, inicioActual }: { token: string; duracionMin: number; inicioActual: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [enviando, startTransition] = useTransition();

  if (hecho) {
    return (
      <p role="status" className="m-0 text-center text-sm" style={{ color: "var(--color-accent-300)" }}>
        Hora cambiada. Te hemos enviado los nuevos datos si dejaste tu email.
      </p>
    );
  }

  return (
    <>
      <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={() => setAbierto(true)}>
        Cambiar fecha u hora
      </button>
      {abierto && (
        <Dialogo titulo="Cambiar fecha u hora" onClose={() => setAbierto(false)} ancho={440}>
          <p className="m-0 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
            Ahora: {new Date(inicioActual).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short", timeZone: TZ })}
          </p>
          <SelectorFechaHora
            duracionMin={duracionMin}
            fecha={fecha}
            onFecha={setFecha}
            hora={hora}
            onHora={(h) => { setHora(h); setError(null); }}
            cargarSlots={(f, d) => obtenerSlotsCambio(token, f, d)}
          />
          {error && <p role="alert" className="m-0 text-[13px]" style={{ color: "var(--color-state-alta)" }}>{error}</p>}
          <button
            className="btn btn-primary btn-block"
            style={{ height: 44 }}
            disabled={!hora || enviando}
            onClick={() =>
              startTransition(async () => {
                if (!hora) return;
                const res = await reprogramarReservaPorToken(token, hora);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setAbierto(false);
                setHecho(true);
                router.refresh();
              })
            }
          >
            {enviando ? "Cambiando…" : hora ? `Cambiar a las ${hhmm(hora)}` : "Elige día y hora"}
          </button>
        </Dialogo>
      )}
    </>
  );
}
