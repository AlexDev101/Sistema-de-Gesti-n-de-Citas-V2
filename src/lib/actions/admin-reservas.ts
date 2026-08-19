"use server";

import { waitUntil } from "@vercel/functions";
import { createClient } from "@/lib/supabase/server";
import { getServiciosActivos } from "@/lib/data/servicios";
import { enviarEmailConfirmacion } from "@/lib/actions/email-confirmacion";
import { EMAIL_INVALIDO, emailValido } from "@/lib/validacion";

export async function listarServiciosActivos() {
  return getServiciosActivos();
}

export type CrearReservaAdminInput = {
  nombre: string;
  telefono: string;
  email: string;
  servicioIds: string[];
  inicioISO: string;
  notas?: string;
};

export type CrearReservaAdminResult =
  | { ok: true; reservaId: string }
  | { ok: false; error: string };

export async function crearReservaAdmin(input: CrearReservaAdminInput): Promise<CrearReservaAdminResult> {
  if (!emailValido(input.email)) return { ok: false, error: EMAIL_INVALIDO };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_reserva_admin", {
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
    // Best-effort, igual que en el flujo público: un fallo de email nunca
    // debe deshacer una reserva ya confirmada en la base de datos. waitUntil
    // evita que Vercel congele la función antes de que la petición a Resend salga.
    waitUntil(
      enviarEmailConfirmacion(row.token, input.email).catch((err) => {
        console.error("No se pudo enviar el email de confirmación:", err);
      })
    );
  }

  return { ok: true, reservaId: row.reserva_id };
}

export async function buscarClientePorTelefono(telefono: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("nombre, email")
    .eq("telefono", telefono.trim())
    .maybeSingle();
  return data;
}
