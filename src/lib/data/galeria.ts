import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { agrupar, type GaleriaSeccion } from "@/lib/galeria";

export type { GaleriaItem, GaleriaSeccion, TipoMedia } from "@/lib/galeria";

// Lectura pública (RLS: select using true). El panel y la portada leen lo mismo;
// la portada descarta las secciones vacías.
export const getGaleria = cache(async (): Promise<GaleriaSeccion[]> => {
  const supabase = await createClient();
  const [secciones, items] = await Promise.all([
    supabase.from("galeria_secciones").select("id, nombre, orden").order("orden"),
    supabase.from("galeria_items").select("id, seccion_id, tipo, url, titulo, orden, ancho, alto").order("orden"),
  ]);
  if (secciones.error) throw secciones.error;
  if (items.error) throw items.error;
  return agrupar(secciones.data, items.data);
});
