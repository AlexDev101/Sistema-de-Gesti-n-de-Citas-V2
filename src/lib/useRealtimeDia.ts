"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Escucha el aviso "algo cambió ese día" (Realtime Broadcast, disparado por
// el trigger reservas_broadcast) y llama a onCambio para refrescar — el
// payload no lleva datos del cliente, sólo es la señal para re-pedir por
// los canales ya protegidos por RLS.
export function useRealtimeDia(fecha: string | null, onCambio: () => void) {
  const onCambioRef = useRef(onCambio);
  useEffect(() => {
    onCambioRef.current = onCambio;
  });

  useEffect(() => {
    if (!fecha) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dia:${fecha}`)
      .on("broadcast", { event: "cambio" }, () => onCambioRef.current())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fecha]);
}
