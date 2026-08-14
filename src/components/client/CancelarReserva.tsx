"use client";

import { useState, useTransition } from "react";
import { cancelarReservaPorToken } from "@/lib/actions/reservas";

export function CancelarReserva({ token, politica }: { token: string; politica: string }) {
  const [pidiendo, setPidiendo] = useState(false);
  const [cancelada, setCancelada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  if (cancelada) {
    return (
      <p className="m-0 text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
        Cita cancelada.
      </p>
    );
  }

  if (!pidiendo) {
    return (
      <button className="btn btn-ghost self-center" onClick={() => setPidiendo(true)}>
        Cancelar cita
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="m-0 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
        {politica}
      </p>
      <div className="flex gap-2">
        <button className="btn btn-secondary" onClick={() => setPidiendo(false)}>
          Volver
        </button>
        <button
          className="btn btn-primary"
          disabled={enviando}
          onClick={() =>
            startTransition(async () => {
              const res = await cancelarReservaPorToken(token);
              if (res.ok) setCancelada(true);
              else setError(res.error);
            })
          }
        >
          {enviando ? "Cancelando…" : "Confirmar cancelación"}
        </button>
      </div>
      {error && <p className="m-0 text-xs" style={{ color: "var(--color-state-alta)" }}>{error}</p>}
    </div>
  );
}
