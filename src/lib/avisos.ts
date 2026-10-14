import "server-only";
import { createElement } from "react";
import { ConfirmacionCita } from "@/emails/ConfirmacionCita";
import { AvisoCita } from "@/emails/AvisoCita";
import { enviarEmail } from "@/lib/email";
import { eur, TZ } from "@/lib/format";
import { getConfiguracion } from "@/lib/data/negocio";
import { origenSitio, secretoServidor } from "@/lib/servidor";
import { createClient } from "@/lib/supabase/server";

// Avisos por email de todo el ciclo de una cita. Se llaman siempre dentro de
// `after()`: un fallo de email nunca debe deshacer ni retrasar una reserva ya
// guardada. Si algo falla, queda en `envios_fallidos` y el panel lo enseña en
// «Hoy» (antes solo quedaba una línea en los registros del hosting).

type DatosReserva = {
  id: string;
  token: string;
  inicio: string;
  estado: string;
  precio_total_cents: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string | null;
  servicios: string | null;
};

export type AvisoCliente = "confirmacion" | "cambio" | "cancelacion_negocio" | "cancelacion_cliente";
export type AvisoNegocio = "nueva" | "cancelada" | "cambiada";

function cuandoTxt(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short", timeZone: TZ });
}

async function datosReserva(reservaId: string): Promise<DatosReserva | null> {
  const secret = secretoServidor();
  if (!secret) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("datos_aviso_reserva", { p_secret: secret, p_reserva_id: reservaId });
  if (error) throw error;
  return data as DatosReserva | null;
}

export async function registrarFallo(tipo: string, reservaId: string | null, detalle: string) {
  console.error(`Aviso "${tipo}" no enviado:`, detalle);
  const secret = secretoServidor();
  if (!secret) return;
  try {
    const supabase = await createClient();
    await supabase.rpc("registrar_envio_fallido", {
      p_secret: secret,
      p_tipo: tipo,
      p_reserva_id: reservaId as string,
      p_detalle: detalle,
    });
  } catch (err) {
    console.error("Tampoco se pudo registrar el fallo:", err);
  }
}

export async function avisarCliente(tipo: AvisoCliente, reservaId: string, extra?: { inicioAnterior?: string }) {
  try {
    const [r, config, origen] = await Promise.all([datosReserva(reservaId), getConfiguracion(), origenSitio()]);
    if (!r || !r.cliente_email) return;
    const nombreNegocio = config?.nombre_negocio ?? "";
    const direccion = config?.direccion ?? "";
    const gestionUrl = `${origen}/reservar/confirmacion/${r.token}`;
    const servicios = r.servicios ?? "";

    let subject: string;
    let react;
    if (tipo === "confirmacion") {
      subject = `Cita confirmada — ${cuandoTxt(r.inicio)}`;
      react = createElement(ConfirmacionCita, {
        nombreCliente: r.cliente_nombre,
        cuando: cuandoTxt(r.inicio),
        servicios,
        totalTxt: eur(r.precio_total_cents),
        direccion,
        nombreNegocio,
        gestionUrl,
      });
    } else if (tipo === "cambio") {
      subject = `Tu cita ha cambiado — ${cuandoTxt(r.inicio)}`;
      react = createElement(AvisoCita, {
        preview: `Nueva hora: ${cuandoTxt(r.inicio)}`,
        titulo: "Tu cita ha cambiado",
        saludo: `Hola ${r.cliente_nombre}, tu cita tiene nueva fecha u hora:`,
        filas: [
          ...(extra?.inicioAnterior ? [{ etiqueta: "Antes", valor: cuandoTxt(extra.inicioAnterior) }] : []),
          { etiqueta: "Ahora", valor: cuandoTxt(r.inicio) },
          { etiqueta: "Servicios", valor: servicios },
          { etiqueta: "Dónde", valor: direccion },
        ],
        texto: "¿No te va bien?",
        enlace: { href: gestionUrl, label: "Gestionar mi cita" },
        nombreNegocio,
        direccion,
      });
    } else {
      const porNegocio = tipo === "cancelacion_negocio";
      subject = `Cita cancelada — ${cuandoTxt(r.inicio)}`;
      react = createElement(AvisoCita, {
        preview: `Cita cancelada: ${cuandoTxt(r.inicio)}`,
        titulo: "Cita cancelada",
        saludo: porNegocio
          ? `Hola ${r.cliente_nombre}, sentimos avisarte de que hemos tenido que cancelar tu cita:`
          : `Hola ${r.cliente_nombre}, hemos cancelado tu cita como pediste:`,
        filas: [
          { etiqueta: "Cuándo", valor: cuandoTxt(r.inicio) },
          { etiqueta: "Servicios", valor: servicios },
        ],
        texto: porNegocio
          ? `Si quieres otra hora, puedes reservar de nuevo${config?.telefono ? ` o llamarnos al ${config.telefono}` : ""}.`
          : "Cuando quieras volver, aquí tienes la agenda.",
        enlace: { href: `${origen}/reservar`, label: "Reservar otra cita" },
        nombreNegocio,
        direccion,
      });
    }

    const res = await enviarEmail({
      to: r.cliente_email,
      subject,
      react,
      nombreNegocio,
      replyTo: config?.legal_email,
    });
    if (!res.ok) await registrarFallo(`cliente:${tipo}`, reservaId, res.error);
  } catch (err) {
    await registrarFallo(`cliente:${tipo}`, reservaId, err instanceof Error ? err.message : String(err));
  }
}

export async function avisarNegocio(tipo: AvisoNegocio, reservaId: string, extra?: { inicioAnterior?: string }) {
  try {
    const secret = secretoServidor();
    if (!secret) return;
    const supabase = await createClient();
    const { data: destino } = await supabase.rpc("email_avisos_negocio", { p_secret: secret });
    if (!destino) return;

    const [r, config, origen] = await Promise.all([datosReserva(reservaId), getConfiguracion(), origenSitio()]);
    if (!r) return;
    const nombreNegocio = config?.nombre_negocio ?? "";
    const titulos: Record<AvisoNegocio, string> = {
      nueva: "Nueva cita",
      cancelada: "Cita cancelada por el cliente",
      cambiada: "Cita cambiada por el cliente",
    };

    const res = await enviarEmail({
      to: destino,
      subject: `${titulos[tipo]}: ${r.cliente_nombre} — ${cuandoTxt(r.inicio)}`,
      react: createElement(AvisoCita, {
        preview: `${titulos[tipo]}: ${cuandoTxt(r.inicio)}`,
        titulo: titulos[tipo],
        filas: [
          { etiqueta: "Cliente", valor: r.cliente_nombre },
          { etiqueta: "Teléfono", valor: r.cliente_telefono },
          ...(extra?.inicioAnterior ? [{ etiqueta: "Antes", valor: cuandoTxt(extra.inicioAnterior) }] : []),
          { etiqueta: tipo === "cambiada" ? "Ahora" : "Cuándo", valor: cuandoTxt(r.inicio) },
          { etiqueta: "Servicios", valor: r.servicios ?? "" },
          { etiqueta: "Importe", valor: eur(r.precio_total_cents) },
        ],
        enlace: { href: `${origen}/admin/agenda`, label: "Abrir la agenda" },
        nombreNegocio,
        direccion: config?.direccion ?? "",
      }),
      nombreNegocio,
    });
    if (!res.ok) await registrarFallo(`negocio:${tipo}`, reservaId, res.error);
  } catch (err) {
    await registrarFallo(`negocio:${tipo}`, reservaId, err instanceof Error ? err.message : String(err));
  }
}
