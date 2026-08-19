"use server";

import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/actions/resultado";

export async function crearFranja(diaSemana: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("horario_barbero")
    .insert({ dia_semana: diaSemana, abre: "10:00", cierra: "14:00" })
    .select("id");
  return resultado(error, data);
}

export async function actualizarFranja(id: string, abre: string, cierra: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("horario_barbero").update({ abre, cierra }).eq("id", id).select("id");
  return resultado(error, data);
}

export async function eliminarFranja(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("horario_barbero").delete().eq("id", id).select("id");
  return resultado(error, data);
}
