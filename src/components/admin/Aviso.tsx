"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Resultado } from "@/lib/actions/resultado";

type Accion = { label: string; onClick: () => void };
type Estado = { msg: string; err?: boolean; accion?: Accion } | null;

// Aviso flotante compartido por todo el panel. Puede llevar una acción
// («Deshacer»): con ella el aviso dura más, para dar tiempo a pulsarla.
export function useAviso() {
  const [aviso, setAviso] = useState<Estado>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const avisar = useCallback((msg: string, err = false, accion?: Accion) => {
    if (timer.current) clearTimeout(timer.current);
    setAviso({ msg, err, accion });
    timer.current = setTimeout(() => setAviso(null), accion ? 7000 : 3200);
  }, []);

  const cerrar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setAviso(null);
  }, []);

  // Envuelve una acción de escritura: calla si fue bien (o confirma con
  // `exito`), y habla siempre que falle.
  const guardando = useCallback(
    async (accion: Promise<Resultado>, exito?: string, deshacer?: Accion) => {
      const res = await accion;
      if (!res.ok) avisar(res.error, true);
      else if (exito) avisar(exito, false, deshacer);
      return res.ok;
    },
    [avisar]
  );

  return { aviso, avisar, guardando, cerrar };
}

export function AvisoHost({ aviso, onCerrar }: { aviso: Estado; onCerrar?: () => void }) {
  if (!aviso) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+26px)] left-1/2 z-[90] flex max-w-[min(92vw,460px)] -translate-x-1/2 items-center gap-2.5 rounded-[var(--radius-md)] px-4 py-2.5 text-[13px]"
      style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)", animation: "fgIn .2s ease both" }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: aviso.err ? "var(--color-state-alta)" : "var(--color-state-libre)" }}
      />
      <span className="flex-1">{aviso.msg}</span>
      {aviso.accion && (
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: "4px 8px", color: "var(--color-accent-300)" }}
          onClick={() => {
            aviso.accion?.onClick();
            onCerrar?.();
          }}
        >
          {aviso.accion.label}
        </button>
      )}
    </div>
  );
}
