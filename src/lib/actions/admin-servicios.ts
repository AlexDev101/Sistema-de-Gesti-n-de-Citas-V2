"use server";

import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";

export async function crearServicio() {
  const supabase = await createClient();
  const { data: existentes } = await supabase.from("servicios").select("orden").order("orden", { ascending: false }).limit(1);
  const orden = (existentes?.[0]?.orden ?? 0) + 1;
  const { error } = await supabase
    .from("servicios")
    .insert({ nombre: "Nuevo servicio", categoria: "Otros", duracion_min: 30, precio_cents: 1000, orden });
  return { ok: !error, error: error?.message };
}

export async function duplicarServicio(id: string) {
  const supabase = await createClient();
  const { data: s } = await supabase.from("servicios").select("*").eq("id", id).single();
  if (!s) return { ok: false, error: "No encontrado" };
  const { error } = await supabase.from("servicios").insert({
    nombre: `${s.nombre} (copia)`,
    categoria: s.categoria,
    duracion_min: s.duracion_min,
    precio_cents: s.precio_cents,
    activo: s.activo,
    orden: s.orden + 1,
  });
  return { ok: !error, error: error?.message };
}

export async function actualizarServicio(id: string, cambios: TablesUpdate<"servicios">) {
  const supabase = await createClient();
  const { error } = await supabase.from("servicios").update(cambios).eq("id", id);
  return { ok: !error, error: error?.message };
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
  if (!vecino) return { ok: false };
  await supabase.from("servicios").update({ orden: vecino.orden }).eq("id", id);
  await supabase.from("servicios").update({ orden: ordenActual }).eq("id", vecino.id);
  return { ok: true };
}
