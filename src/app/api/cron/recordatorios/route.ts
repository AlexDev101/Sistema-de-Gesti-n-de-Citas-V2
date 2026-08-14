import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarRecordatorio } from "@/lib/email";

export const dynamic = "force-dynamic";

// Vercel Cron llama a esta ruta (ver vercel.ts) con
// `Authorization: Bearer $CRON_SECRET` cuando CRON_SECRET está configurada.
// Recorre las reservas confirmadas que empiezan en las próximas ~24h y
// todavía no tienen recordatorio_enviado_at.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const desde = new Date();
  const hasta = new Date(desde.getTime() + 25 * 60 * 60 * 1000);

  const { data: reservas, error } = await supabase
    .from("reservas")
    .select("id, token, inicio, clientes(nombre, email), reserva_servicios(servicios(nombre))")
    .eq("estado", "confirmada")
    .is("recordatorio_enviado_at", null)
    .gte("inicio", desde.toISOString())
    .lte("inicio", hasta.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: configuracion } = await supabase.from("configuracion").select("*").limit(1).maybeSingle();
  const origin = `https://${request.headers.get("host")}`;

  let enviados = 0;
  for (const r of reservas ?? []) {
    const cliente = r.clientes as unknown as { nombre: string; email: string | null } | null;
    if (!cliente?.email) continue;
    const servicios = (r.reserva_servicios as unknown as { servicios: { nombre: string } | null }[])
      .map((rs) => rs.servicios?.nombre)
      .filter(Boolean)
      .join(", ");

    const res = await enviarRecordatorio({
      email: cliente.email,
      nombreCliente: cliente.nombre,
      cuando: new Date(r.inicio).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" }),
      servicios,
      direccion: configuracion?.direccion ?? "",
      nombreNegocio: configuracion?.nombre_negocio ?? "FG Hair Studio",
      gestionUrl: `${origin}/reservar/confirmacion/${r.token}`,
    });
    if (res.ok) {
      await supabase.from("reservas").update({ recordatorio_enviado_at: new Date().toISOString() }).eq("id", r.id);
      enviados++;
    }
  }

  return NextResponse.json({ ok: true, revisadas: reservas?.length ?? 0, enviados });
}
