"use server";

import { createClient } from "@/lib/supabase/server";

// `respetarAntelacion` false solo lo usa "Nueva cita" del admin, que sí puede
// reservar sin antelación (crear_reserva_admin no la comprueba). En el flujo
// público va siempre en true para que el calendario, la rejilla de horas y
// crear_reserva ofrezcan y acepten exactamente lo mismo.
export async function obtenerSlots(fechaISO: string, duracionMin: number, respetarAntelacion = true) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("slots_disponibles", {
    p_fecha: fechaISO,
    p_duracion_min: duracionMin,
    p_respetar_antelacion: respetarAntelacion,
  });
  if (error) throw error;
  return data.map((r) => r.inicio);
}

export async function obtenerOcupacionMes(anio: number, mes1a12: number, respetarAntelacion = true) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ocupacion_mes", {
    p_anio: anio,
    p_mes: mes1a12,
    p_respetar_antelacion: respetarAntelacion,
  });
  if (error) throw error;
  return data;
}
