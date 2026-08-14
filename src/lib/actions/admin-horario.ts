"use server";

import { createClient } from "@/lib/supabase/server";

export async function crearFranja(diaSemana: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("horario_barbero").insert({ dia_semana: diaSemana, abre: "10:00", cierra: "14:00" });
  return { ok: !error, error: error?.message };
}

export async function actualizarFranja(id: string, abre: string, cierra: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("horario_barbero").update({ abre, cierra }).eq("id", id);
  return { ok: !error, error: error?.message };
}

export async function eliminarFranja(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("horario_barbero").delete().eq("id", id);
  return { ok: !error, error: error?.message };
}
