"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiciosActivos } from "@/lib/data/servicios";
import { avisarCliente } from "@/lib/avisos";
import { EMAIL_INVALIDO, emailValido, normalizarTelefono } from "@/lib/validacion";

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

  // El cliente recibe la misma confirmación tanto si reservó él como si la
  // apuntó el barbero. Después de responder: un fallo de email no deshace nada.
  if (input.email.trim()) after(() => avisarCliente("confirmacion", row.reserva_id));

  return { ok: true, reservaId: row.reserva_id };
}

export async function buscarClientePorTelefono(telefono: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("nombre, email")
    // Los teléfonos se guardan normalizados (ver normalizar_telefono en la
    // base): sin esto, escribir "600 111 222" no encontraba al cliente.
    .eq("telefono", normalizarTelefono(telefono))
    .maybeSingle();
  return data;
}
