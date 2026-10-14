import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

// El remitente por defecto de Resend (onboarding@resend.dev) solo entrega al
// email de la propia cuenta de Resend: para escribir a clientes reales hay que
// verificar un dominio propio en Resend y fijar RESEND_FROM_EMAIL, por ejemplo
// "Barbería Ejemplo <citas@barberiaejemplo.es>".
function remitente(nombreNegocio: string): string {
  if (process.env.RESEND_FROM_EMAIL) return process.env.RESEND_FROM_EMAIL;
  const nombre = nombreNegocio.replace(/[<>"]/g, "").trim() || "Reservas";
  return `${nombre} <onboarding@resend.dev>`;
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string };

export async function enviarEmail(params: {
  to: string;
  subject: string;
  react: ReactElement;
  nombreNegocio: string;
  replyTo?: string | null;
}): Promise<ResultadoEnvio> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "RESEND_API_KEY no configurada" };
  try {
    const { error } = await resend.emails.send({
      from: remitente(params.nombreNegocio),
      to: params.to,
      subject: params.subject,
      react: params.react,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
