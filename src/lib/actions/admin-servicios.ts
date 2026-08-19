"use server";

import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { fallo, resultado } from "@/lib/actions/resultado";

export async function crearServicio() {
  const supabase = await createClient();
  const { data: existentes } = await supabase.from("servicios").select("orden").order("orden", { ascending: false }).limit(1);
  const orden = (existentes?.[0]?.orden ?? 0) + 1;
  const { data, error } = await supabase
    .from("servicios")
    .insert({ nombre: "Nuevo servicio", categoria: "Otros", duracion_min: 30, precio_cents: 1000, orden })
    .select("id");
  return resultado(error, data);
}

export async function duplicarServicio(id: string) {
  const supabase = await createClient();
  const { data: s } = await supabase.from("servicios").select("*").eq("id", id).single();
  if (!s) return fallo("No encontrado");
  const { data, error } = await supabase
    .from("servicios")
    .insert({
      nombre: `${s.nombre} (copia)`,
      categoria: s.categoria,
      duracion_min: s.duracion_min,
      precio_cents: s.precio_cents,
      activo: s.activo,
      orden: s.orden + 1,
    })
    .select("id");
  return resultado(error, data);
}

export async function actualizarServicio(id: string, cambios: TablesUpdate<"servicios">) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("servicios").update(cambios).eq("id", id).select("id");
  return resultado(error, data);
}

export async function moverServicio(id: string, ordenActual: number, dir: 1 | -1) {
  const supabase = await createClient();
  const { data: vecino } = await supabase
    .from("servicios")
    .select("id, orden")
    .order("orden", { ascending: dir === -1 })
    .gt("orden", dir === 1 ? ordenActual : -1)
    .lt("orden", dir === -1 ? ordenActual : 999999)
    .limit(1)
    .maybeSingle();
  if (!vecino) return fallo("No hay ningún servicio en esa dirección");

  // Dos updates que se intercambian el orden. Se comprueban los dos: si RLS
  // deja pasar cero filas en el primero, el segundo dejaría el orden a medias.
  const primero = await supabase.from("servicios").update({ orden: vecino.orden }).eq("id", id).select("id");
  const r1 = resultado(primero.error, primero.data);
  if (!r1.ok) return r1;

  const segundo = await supabase.from("servicios").update({ orden: ordenActual }).eq("id", vecino.id).select("id");
  return resultado(segundo.error, segundo.data);
}
