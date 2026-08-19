import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarRecordatorio } from "@/lib/email";

export const dynamic = "force-dynamic";

type ReservaPendiente = {
  id: string;
  token: string;
  inicio: string;
  cliente_nombre: string;
  cliente_email: string;
  servicios: string | null;
};

// Vercel Cron llama a esta ruta (ver vercel.ts) con
// `Authorization: Bearer $CRON_SECRET`. Ese mismo secreto viaja además a las
// funciones SECURITY DEFINER del lado de Postgres, que son las que leen las
// reservas saltando RLS — así esta ruta no necesita la service_role key.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Falta CRON_SECRET" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reservas_pendientes_recordatorio", {
    p_secret: secret,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reservas = (data ?? []) as unknown as ReservaPendiente[];

  const { data: configuracion } = await supabase.from("configuracion").select("*").limit(1).maybeSingle();
  const origin = `https://${request.headers.get("host")}`;

  let enviados = 0;
  for (const r of reservas) {
    const res = await enviarRecordatorio({
      email: r.cliente_email,
      nombreCliente: r.cliente_nombre,
      cuando: new Date(r.inicio).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" }),
      servicios: r.servicios ?? "",
      direccion: configuracion?.direccion ?? "",
      nombreNegocio: configuracion?.nombre_negocio ?? "FG Hair Studio",
      gestionUrl: `${origin}/reservar/confirmacion/${r.token}`,
    });
    if (res.ok) {
      await supabase.rpc("marcar_recordatorio_enviado", { p_secret: secret, p_id: r.id });
      enviados++;
    }
  }

  return NextResponse.json({ ok: true, revisadas: reservas.length, enviados });
}
