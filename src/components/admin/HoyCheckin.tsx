"use client";

import { useRouter } from "next/navigation";
import { actualizarEstadoReserva } from "@/lib/actions/admin-agenda";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";

export function HoyCheckin({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const { aviso, guardando } = useAviso();
  if (estado !== "confirmada") return null;
  return (
    <>
      <button
        className="btn btn-secondary"
        style={{ minWidth: 96 }}
        onClick={async () => {
          if (await guardando(actualizarEstadoReserva(id, "completada"), "Cita marcada como hecha")) router.refresh();
        }}
      >
        Marcar hecha
      </button>
      <AvisoHost aviso={aviso} />
    </>
  );
}
