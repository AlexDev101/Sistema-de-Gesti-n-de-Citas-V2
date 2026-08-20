"use client";

import { useRouter } from "next/navigation";
import { actualizarEstadoReserva } from "@/lib/actions/admin-agenda";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";

export function HoyCheckin({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const { aviso, guardando } = useAviso();
  if (estado !== "confirmada") return null;

  async function marcar(nuevoEstado: "completada" | "no_show", mensaje: string) {
    if (await guardando(actualizarEstadoReserva(id, nuevoEstado), mensaje)) router.refresh();
  }

  return (
    <>
      <div className="flex gap-1.5">
        <button className="btn btn-secondary" style={{ minWidth: 88 }} onClick={() => marcar("completada", "Cita marcada como asistida")}>
          Asistido
        </button>
        <button
          className="btn btn-ghost"
          style={{ minWidth: 88, color: "var(--color-state-alta)" }}
          onClick={() => marcar("no_show", "Cita marcada como no asistida")}
        >
          No asistido
        </button>
      </div>
      <AvisoHost aviso={aviso} />
    </>
  );
}
