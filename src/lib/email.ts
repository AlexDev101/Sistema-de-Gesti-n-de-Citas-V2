import "server-only";
import { Resend } from "resend";
import { ConfirmacionCita } from "@/emails/ConfirmacionCita";
import { RecordatorioCita } from "@/emails/RecordatorioCita";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

// Remitente por defecto de Resend (onboarding@resend.dev) sólo entrega al
// email de la propia cuenta de Resend — para enviar a clientes reales hace
// falta verificar un dominio propio en Resend y fijar RESEND_FROM_EMAIL.
const FROM = process.env.RESEND_FROM_EMAIL ?? "FG Hair Studio <onboarding@resend.dev>";

export async function enviarConfirmacion(params: {
  email: string;
  nombreCliente: string;
  cuando: string;
  servicios: string;
  totalTxt: string;
  direccion: string;
  nombreNegocio: string;
  gestionUrl: string;
}) {
  const resend = getResend();
  if (!resend) return { ok: false as const, error: "RESEND_API_KEY no configurada" };
  const { error } = await resend.emails.send({
    from: FROM,
    to: params.email,
    subject: `Cita confirmada — ${params.cuando}`,
    react: ConfirmacionCita(params),
  });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function enviarRecordatorio(params: {
  email: string;
  nombreCliente: string;
  cuando: string;
  servicios: string;
  direccion: string;
  nombreNegocio: string;
  gestionUrl: string;
}) {
  const resend = getResend();
  if (!resend) return { ok: false as const, error: "RESEND_API_KEY no configurada" };
  const { error } = await resend.emails.send({
    from: FROM,
    to: params.email,
    subject: `Recordatorio: tu cita es mañana`,
    react: RecordatorioCita(params),
  });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
