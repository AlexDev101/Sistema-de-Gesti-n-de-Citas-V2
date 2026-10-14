import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { Cierre, FilaHorario } from "@/lib/horario";

export type { Cierre } from "@/lib/horario";

export type Barbero = Tables<"barbero">;
export type Configuracion = Tables<"configuracion">;

// `cache` evita repetir la misma consulta cuando el layout (metadatos, color
// de marca) y la página la piden en el mismo render.
export const getBarbero = cache(async (): Promise<Barbero | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("barbero").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
});

export const getConfiguracion = cache(async (): Promise<Configuracion | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("configuracion").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
});

export const getHorario = cache(async (): Promise<FilaHorario[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("horario_barbero")
    .select("dia_semana, abre, cierra")
    .order("dia_semana")
    .order("abre");
  if (error) throw error;
  return data;
});

/** Cierres que terminan a partir de `desdeISO` (por defecto, hoy). */
export async function getCierres(desdeISO?: string): Promise<Cierre[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cierres_listado", desdeISO ? { p_desde: desdeISO } : {});
  if (error) throw error;
  return data;
}
