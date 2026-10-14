"use server";

import { createClient } from "@/lib/supabase/server";
import { fallo, OK, resultado, type Resultado } from "@/lib/actions/resultado";

export async function crearFranja(diaSemana: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("horario_barbero")
    .insert({ dia_semana: diaSemana, abre: "10:00", cierra: "14:00" })
    .select("id");
  return resultado(error, data);
}

export async function actualizarFranja(id: string, abre: string, cierra: string) {
  if (cierra <= abre) return fallo("La hora de cierre tiene que ser posterior a la de apertura");
  const supabase = await createClient();
  const { data, error } = await supabase.from("horario_barbero").update({ abre, cierra }).eq("id", id).select("id");
  return resultado(error, data);
}

export async function eliminarFranja(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("horario_barbero").delete().eq("id", id).select("id");
  return resultado(error, data);
}

// ── cierres (vacaciones, festivos, días libres) ──────────────────────────────
// La tabla `cierres` existía y la disponibilidad pública ya la respetaba, pero
// ninguna pantalla escribía en ella.

export type ResultadoCierre = { ok: true; citasAfectadas: number } | { ok: false; error: string };

export async function crearCierre(desdeISO: string, hastaISO: string, motivo: string): Promise<ResultadoCierre> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_cierre", {
    p_desde: desdeISO,
    p_hasta: hastaISO || desdeISO,
    p_motivo: motivo,
  });
  if (error) {
    const r = resultado(error, null);
    return { ok: false, error: r.ok ? "" : r.error };
  }
  return { ok: true, citasAfectadas: data ?? 0 };
}

export async function eliminarCierre(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cierres").delete().eq("id", id).select("id");
  const r = resultado(error, data);
  return r.ok ? OK : r;
}
