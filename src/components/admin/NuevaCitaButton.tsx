"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NuevaCitaDialog } from "@/components/admin/NuevaCitaDialog";

export function NuevaCitaButton({ onCreada }: { onCreada?: () => void }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setAbierto(true)}>
        Nueva cita
      </button>
      {abierto && (
        <NuevaCitaDialog
          onClose={() => setAbierto(false)}
          onCreada={() => {
            setAbierto(false);
            if (onCreada) onCreada();
            else router.refresh();
          }}
        />
      )}
    </>
  );
}
