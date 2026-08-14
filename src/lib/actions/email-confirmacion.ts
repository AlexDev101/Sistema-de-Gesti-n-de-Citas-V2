"use server";

import { headers } from "next/headers";
import { enviarConfirmacion } from "@/lib/email";
import { getConfiguracion } from "@/lib/data/negocio";
import { eur } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type ReservaParaEmail = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_total_cents: number;
  notas: string | null;
  cliente_nombre: string;
  servicios: { nombre: string; precio_cents: number; duracion_min: number }[] | null;
};

// No importa obtenerReservaPorToken de reservas.ts a propósito — evita un
// ciclo de módulos "use server" entre reservas.ts y este archivo.
async function obtenerReserva(token: string): Promise<ReservaParaEmail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obtener_reserva_por_token", { p_token: token });
  if (error) throw error;
  return data as ReservaParaEmail | null;
}

// Compartido entre el flujo público (crearReserva) y "Nueva cita" del admin
// (crearReservaAdmin) — un cliente debe recibir el mismo email de
// confirmación sin importar quién creó la reserva.
export async function enviarEmailConfirmacion(token: string, email: string) {
  const [reserva, configuracion, hdrs] = await Promise.all([
    obtenerReserva(token),
    getConfiguracion(),
    headers(),
  ]);
  if (!reserva) return;
  const host = hdrs.get("host") ?? "";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const res = await enviarConfirmacion({
    email,
    nombreCliente: reserva.cliente_nombre,
    cuando: new Date(reserva.inicio).toLocaleString("es-ES", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Madrid",
    }),
    servicios: (reserva.servicios ?? []).map((s) => s.nombre).join(", "),
    totalTxt: eur(reserva.precio_total_cents),
    direccion: configuracion?.direccion ?? "",
    nombreNegocio: configuracion?.nombre_negocio ?? "FG Hair Studio",
    gestionUrl: `${origin}/reservar/confirmacion/${token}`,
  });
  if (!res.ok) console.error("No se pudo enviar el email de confirmación:", res.error);
}
