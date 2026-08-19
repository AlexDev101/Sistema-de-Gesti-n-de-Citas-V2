"use client";

import { useCallback, useState } from "react";
import type { Resultado } from "@/lib/actions/resultado";

type Estado = { msg: string; err?: boolean } | null;

// Aviso flotante compartido por todo el panel. Antes solo lo tenía la agenda,
// así que el resto de pantallas descartaban en silencio el error que las
// acciones ya devolvían.
export function useAviso() {
  const [aviso, setAviso] = useState<Estado>(null);

  const avisar = useCallback((msg: string, err = false) => {
    setAviso({ msg, err });
    setTimeout(() => setAviso(null), 3200);
  }, []);

  // Envuelve una acción de escritura: calla si fue bien (o confirma con
  // `exito`), y habla siempre que falle.
  const guardando = useCallback(
    async (accion: Promise<Resultado>, exito?: string) => {
      const res = await accion;
      if (!res.ok) avisar(res.error, true);
      else if (exito) avisar(exito);
      return res.ok;
    },
    [avisar]
  );

  return { aviso, avisar, guardando };
}

export function AvisoHost({ aviso }: { aviso: Estado }) {
  if (!aviso) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[26px] left-1/2 z-[90] flex max-w-[min(92vw,420px)] -translate-x-1/2 items-center gap-2.5 rounded-[var(--radius-md)] px-4 py-2.5 text-[13px]"
      style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)", animation: "fgIn .2s ease both" }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: aviso.err ? "var(--color-state-alta)" : "var(--color-state-libre)" }}
      />
      {aviso.msg}
    </div>
  );
}
