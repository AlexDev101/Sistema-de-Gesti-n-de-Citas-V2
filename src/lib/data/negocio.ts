import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Barbero = Tables<"barbero">;
export type Configuracion = Tables<"configuracion">;

export async function getBarbero(): Promise<Barbero | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("barbero").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getConfiguracion(): Promise<Configuracion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("configuracion").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export const HORARIO_NEGOCIO = [
  { dias: "Lun – Vie", horas: "10:00–13:30, 16:30–20:30" },
  { dias: "Sábado", horas: "10:00–13:30" },
  { dias: "Domingo", horas: "Cerrado" },
];
