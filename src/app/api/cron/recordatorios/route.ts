import { createElement } from "react";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email";
import { registrarFallo } from "@/lib/avisos";
import { RecordatorioCita } from "@/emails/RecordatorioCita";
import { fechaMadrid } from "@/lib/agenda-grid";
import { hoyMadridISO } from "@/lib/wizard-helpers";
import { origenSitio } from "@/lib/servidor";
import { TZ } from "@/lib/format";

export const dynamic = "force-dynamic";

type ReservaPendiente = {
  id: string;
  token: string;
  inicio: string;
  cliente_nombre: string;
  cliente_email: string;
  servicios: string | null;
};

// La llama la propia base cada hora (pg_cron + pg_net, ver la migración
// recordatorios_cada_hora) con `Authorization: Bearer <secreto>`. Ese mismo
// secreto viaja a las funciones SECURITY DEFINER que leen las reservas
// saltando RLS — así esta ruta no necesita la service_role key. Ya no depende
// del cron del hosting: funciona igual en Netlify, Vercel o donde sea.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Falta CRON_SECRET" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reservas_pendientes_recordatorio", { p_secret: secret });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reservas = (data ?? []) as unknown as ReservaPendiente[];
  if (reservas.length === 0) return NextResponse.json({ ok: true, revisadas: 0, enviados: 0 });

  const [{ data: configuracion }, origen] = await Promise.all([
    supabase.from("configuracion").select("*").limit(1).maybeSingle(),
    origenSitio(),
  ]);
  const nombreNegocio = configuracion?.nombre_negocio ?? "";
  const hoy = hoyMadridISO();

  let enviados = 0;
  for (const r of reservas) {
    const cuando = new Date(r.inicio).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: TZ });
    const diaRelativo = fechaMadrid(r.inicio) === hoy ? "hoy" : "mañana";
    const res = await enviarEmail({
      to: r.cliente_email,
      subject: `Recordatorio: tu cita es ${diaRelativo} — ${cuando}`,
      react: createElement(RecordatorioCita, {
        nombreCliente: r.cliente_nombre,
        cuando,
        servicios: r.servicios ?? "",
        direccion: configuracion?.direccion ?? "",
        nombreNegocio,
        gestionUrl: `${origen}/reservar/confirmacion/${r.token}`,
        diaRelativo,
      }),
      nombreNegocio,
      replyTo: configuracion?.legal_email,
    });
    if (res.ok) {
      await supabase.rpc("marcar_recordatorio_enviado", { p_secret: secret, p_id: r.id });
      enviados++;
    } else {
      // Se marca igualmente para no reintentar cada hora un email que va a
      // seguir fallando; el fallo queda a la vista en «Hoy».
      await registrarFallo("cliente:recordatorio", r.id, res.error);
      await supabase.rpc("marcar_recordatorio_enviado", { p_secret: secret, p_id: r.id });
    }
  }

  return NextResponse.json({ ok: true, revisadas: reservas.length, enviados });
}
