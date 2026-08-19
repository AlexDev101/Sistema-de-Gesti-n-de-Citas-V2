"use server";

import { waitUntil } from "@vercel/functions";
import { createClient } from "@/lib/supabase/server";
import { enviarEmailConfirmacion } from "@/lib/actions/email-confirmacion";
import { EMAIL_INVALIDO, emailValido } from "@/lib/validacion";

export type CrearReservaInput = {
  nombre: string;
  telefono: string;
  email: string;
  servicioIds: string[];
  inicioISO: string;
  notas?: string;
};

export type CrearReservaResult =
  | { ok: true; reservaId: string; token: string }
  | { ok: false; error: string };

export async function crearReserva(input: CrearReservaInput): Promise<CrearReservaResult> {
  // La validación del asistente es solo de conveniencia: quien llame a esta
  // acción directamente se la salta, y un email mal escrito significa que el
  // cliente nunca recibe confirmación ni recordatorio.
  if (!emailValido(input.email)) return { ok: false, error: EMAIL_INVALIDO };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_reserva", {
    p_nombre: input.nombre,
    p_telefono: input.telefono,
    p_email: input.email,
    p_servicio_ids: input.servicioIds,
    p_inicio: input.inicioISO,
    p_notas: input.notas,
  });
  if (error) return { ok: false, error: error.message };
  const row = data?.[0];
  if (!row) return { ok: false, error: "No se pudo crear la reserva" };

  if (input.email) {
    // Best-effort: un fallo de email nunca debe deshacer una reserva ya
    // confirmada en la base de datos. waitUntil evita que Vercel congele la
    // función serverless antes de que la petición HTTP a Resend salga.
    waitUntil(
      enviarEmailConfirmacion(row.token, input.email).catch((err) => {
        console.error("No se pudo enviar el email de confirmación:", err);
      })
    );
  }

  return { ok: true, reservaId: row.reserva_id, token: row.token };
}

export async function obtenerReservaPorToken(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obtener_reserva_por_token", { p_token: token });
  if (error) throw error;
  return data as {
    id: string;
    inicio: string;
    fin: string;
    estado: string;
    precio_total_cents: number;
    notas: string | null;
    cliente_nombre: string;
    servicios: { nombre: string; precio_cents: number; duracion_min: number }[] | null;
  } | null;
}

export async function cancelarReservaPorToken(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_reserva_por_token", { p_token: token });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
