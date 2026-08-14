"use client";

import { useRouter } from "next/navigation";
import { actualizarEstadoReserva } from "@/lib/actions/admin-agenda";

export function HoyCheckin({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  if (estado !== "confirmada") return null;
  return (
    <button
      className="btn btn-secondary"
      style={{ minWidth: 96 }}
      onClick={async () => {
        await actualizarEstadoReserva(id, "completada");
        router.refresh();
      }}
    >
      Marcar hecha
    </button>
  );
}
