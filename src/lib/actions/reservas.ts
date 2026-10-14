"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { avisarCliente, avisarNegocio } from "@/lib/avisos";
import { CAPTCHA_FALLIDO, verificarCaptcha } from "@/lib/captcha";
import { huellaConexion, ipCliente, secretoServidor } from "@/lib/servidor";
import { EMAIL_INVALIDO, TELEFONO_INVALIDO, emailValido, telefonoEspanolValido } from "@/lib/validacion";

export type CrearReservaInput = {
  nombre: string;
  telefono: string;
  email: string;
  servicioIds: string[];
  inicioISO: string;
  notas?: string;
  aceptaPrivacidad: boolean;
  captchaToken?: string;
};

export type CrearReservaResult =
  | { ok: true; reservaId: string; token: string }
  | { ok: false; error: string };

const PRIVACIDAD_PENDIENTE = "Tienes que aceptar el aviso de privacidad para reservar.";
const SIN_CONFIGURAR = "La reserva online no está disponible ahora mismo. Llama a la barbería, por favor.";

export async function crearReserva(input: CrearReservaInput): Promise<CrearReservaResult> {
  // La validación del asistente es solo de conveniencia: quien llame a esta
  // acción directamente se la salta.
  if (!emailValido(input.email)) return { ok: false, error: EMAIL_INVALIDO };
  if (!telefonoEspanolValido(input.telefono)) return { ok: false, error: TELEFONO_INVALIDO };
  if (!input.aceptaPrivacidad) return { ok: false, error: PRIVACIDAD_PENDIENTE };

  const secret = secretoServidor();
  if (!secret) {
    console.error("Falta CRON_SECRET: sin él la base rechaza las reservas públicas.");
    return { ok: false, error: SIN_CONFIGURAR };
  }
  if (!(await verificarCaptcha(input.captchaToken, await ipCliente()))) {
    return { ok: false, error: CAPTCHA_FALLIDO };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_reserva_publica", {
    p_nombre: input.nombre,
    p_telefono: input.telefono,
    p_email: input.email,
    p_servicio_ids: input.servicioIds,
    p_inicio: input.inicioISO,
    p_notas: input.notas,
    p_secret: secret,
    p_origen: (await huellaConexion()) ?? undefined,
    p_acepta_privacidad: true,
  });
  if (error) return { ok: false, error: error.code === "42501" ? SIN_CONFIGURAR : error.message };
  const row = data?.[0];
  if (!row) return { ok: false, error: "No se pudo crear la reserva" };

  // Después de responder: un fallo de email nunca deshace una reserva.
  after(async () => {
    await Promise.all([
      input.email.trim() ? avisarCliente("confirmacion", row.reserva_id) : null,
      avisarNegocio("nueva", row.reserva_id),
    ]);
  });

  return { ok: true, reservaId: row.reserva_id, token: row.token };
}

export type ReservaPorToken = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_total_cents: number;
  notas: string | null;
  cliente_nombre: string;
  tiene_email: boolean;
  duracion_min: number;
  puede_cambiar: boolean;
  servicios: { nombre: string; precio_cents: number; duracion_min: number }[] | null;
  resena: { estrellas: number; comentario: string | null } | null;
};

export async function obtenerReservaPorToken(token: string): Promise<ReservaPorToken | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obtener_reserva_por_token", { p_token: token });
  if (error) {
    // Un token mal formado (no es un uuid) es simplemente "no existe".
    if (error.code === "22P02") return null;
    throw error;
  }
  return data as ReservaPorToken | null;
}

export async function dejarResena(token: string, estrellas: number, comentario: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("dejar_resena_por_token", {
    p_token: token,
    p_estrellas: estrellas,
    p_comentario: comentario || undefined,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function cancelarReservaPorToken(token: string) {
  const reserva = await obtenerReservaPorToken(token);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_reserva_por_token", { p_token: token });
  if (error) return { ok: false as const, error: error.message };
  if (reserva) {
    after(async () => {
      await Promise.all([
        avisarCliente("cancelacion_cliente", reserva.id),
        avisarNegocio("cancelada", reserva.id),
      ]);
    });
  }
  return { ok: true as const };
}

// Huecos para cambiar de hora: los mismos que vería al reservar, pero sin
// contar su propia cita como ocupada.
export async function obtenerSlotsCambio(token: string, fechaISO: string, duracionMin: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("slots_disponibles_excluyendo", {
    p_fecha: fechaISO,
    p_duracion_min: duracionMin,
    p_excluir_token: token,
    p_respetar_antelacion: true,
  });
  if (error) throw error;
  return data.map((r) => r.inicio);
}

export async function reprogramarReservaPorToken(token: string, nuevoInicioISO: string) {
  const reserva = await obtenerReservaPorToken(token);
  if (!reserva) return { ok: false as const, error: "Reserva no encontrada" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reprogramar_reserva_por_token", {
    p_token: token,
    p_inicio: nuevoInicioISO,
  });
  if (error) return { ok: false as const, error: error.message };
  after(async () => {
    await Promise.all([
      avisarCliente("cambio", reserva.id, { inicioAnterior: reserva.inicio }),
      avisarNegocio("cambiada", reserva.id, { inicioAnterior: reserva.inicio }),
    ]);
  });
  return { ok: true as const };
}
