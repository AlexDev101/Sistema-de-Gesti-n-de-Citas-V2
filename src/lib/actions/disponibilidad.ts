"use server";

import { createClient } from "@/lib/supabase/server";

export async function obtenerSlots(fechaISO: string, duracionMin: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("slots_disponibles", {
    p_fecha: fechaISO,
    p_duracion_min: duracionMin,
  });
  if (error) throw error;
  return data.map((r) => r.inicio);
}

export async function obtenerOcupacionMes(anio: number, mes1a12: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ocupacion_mes", {
    p_anio: anio,
    p_mes: mes1a12,
  });
  if (error) throw error;
  return data;
}
