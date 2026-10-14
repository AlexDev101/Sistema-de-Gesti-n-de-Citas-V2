"use client";

import { useRouter } from "next/navigation";
import { actualizarEstadoReserva } from "@/lib/actions/admin-agenda";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";

// Antes, marcar «No asistido» por error hacía desaparecer la cita de «Hoy» sin
// forma de volver atrás. Ahora el aviso trae «Deshacer» y las citas ya
// marcadas siguen en la lista con un botón para devolverlas a pendiente.
export function HoyCheckin({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const { aviso, guardando, avisar, cerrar } = useAviso();

  async function marcar(nuevoEstado: string, mensaje: string) {
    const anterior = estado;
    const ok = await guardando(actualizarEstadoReserva(id, nuevoEstado), mensaje, {
      label: "Deshacer",
      onClick: async () => {
        const r = await actualizarEstadoReserva(id, anterior);
        if (!r.ok) avisar(r.error, true);
        router.refresh();
      },
    });
    if (ok) router.refresh();
  }

  return (
    <>
      {estado === "confirmada" ? (
        <div className="flex gap-1.5">
          <button className="btn btn-secondary" style={{ minWidth: 88 }} onClick={() => marcar("completada", "Marcada como asistida")}>
            Asistido
          </button>
          <button
            className="btn btn-ghost"
            style={{ minWidth: 88, color: "var(--color-state-alta)" }}
            onClick={() => marcar("no_show", "Marcada como no asistida")}
          >
            No asistido
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => marcar("confirmada", "Vuelve a estar pendiente")}>
          Volver a pendiente
        </button>
      )}
      <AvisoHost aviso={aviso} onCerrar={cerrar} />
    </>
  );
}
