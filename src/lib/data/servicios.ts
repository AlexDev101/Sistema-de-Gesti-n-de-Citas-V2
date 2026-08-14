import { createClient } from "@/lib/supabase/server";
import type { Servicio } from "@/lib/servicios-shared";

export type { Servicio } from "@/lib/servicios-shared";
export { agruparPorCategoria } from "@/lib/servicios-shared";

export async function getServiciosActivos(): Promise<Servicio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("servicios")
    .select("*")
    .eq("activo", true)
    .order("orden");
  if (error) throw error;
  return data;
}

export async function getServiciosAdmin(): Promise<Servicio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("servicios").select("*").order("orden");
  if (error) throw error;
  return data;
}
