"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fallo, resultado, OK, type Resultado } from "@/lib/actions/resultado";
import { BUCKET_GALERIA, enlaceVideoValido, rutaEnBucket, urlMediaValida, vecino, type TipoMedia } from "@/lib/galeria";

// Todas las escrituras van con la sesión del admin: RLS (es_admin()) decide,
// tanto en las tablas como en el bucket. Ver *_galeria.sql.

function refrescar() {
  revalidatePath("/");
  revalidatePath("/admin/galeria");
}

const MAX_NOMBRE = 60;
const MAX_TITULO = 80;

// Borra del bucket los archivos subidos; lo de /uploads/ o YouTube no se toca.
async function borrarArchivos(urls: string[]) {
  const rutas = urls.map(rutaEnBucket).filter((r): r is string => !!r);
  if (rutas.length === 0) return;
  const supabase = await createClient();
  // Si falla, el registro ya no existe y el archivo queda huérfano en el
  // bucket: molesto pero inofensivo. No se bloquea el borrado por eso.
  await supabase.storage.from(BUCKET_GALERIA).remove(rutas);
}

// ---------- Secciones ----------

export async function crearSeccion(nombre: string): Promise<Resultado> {
  const n = nombre.trim();
  if (!n) return fallo("Ponle un nombre a la sección");
  if (n.length > MAX_NOMBRE) return fallo(`El nombre admite hasta ${MAX_NOMBRE} caracteres`);
  const supabase = await createClient();
  const { data: ultima } = await supabase.from("galeria_secciones").select("orden").order("orden", { ascending: false }).limit(1);
  const orden = (ultima?.[0]?.orden ?? 0) + 1;
  const { data, error } = await supabase.from("galeria_secciones").insert({ nombre: n, orden }).select("id");
  const res = resultado(error, data);
  if (res.ok) refrescar();
  return res;
}

export async function renombrarSeccion(id: string, nombre: string): Promise<Resultado> {
  const n = nombre.trim();
  if (!n) return fallo("El nombre no puede quedar vacío");
  if (n.length > MAX_NOMBRE) return fallo(`El nombre admite hasta ${MAX_NOMBRE} caracteres`);
  const supabase = await createClient();
  const { data, error } = await supabase.from("galeria_secciones").update({ nombre: n }).eq("id", id).select("id");
  const res = resultado(error, data);
  if (res.ok) refrescar();
  return res;
}

export async function moverSeccion(id: string, dir: 1 | -1): Promise<Resultado> {
  const supabase = await createClient();
  const { data: lista, error } = await supabase.from("galeria_secciones").select("id, orden").order("orden");
  if (error) return fallo(error.message);
  const actual = lista.find((s) => s.id === id);
  const otro = vecino(lista, id, dir);
  if (!actual || !otro) return fallo("No hay ninguna sección en esa dirección");
  return intercambiar("galeria_secciones", actual, otro, dir);
}

export async function borrarSeccion(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data: items, error: e1 } = await supabase.from("galeria_items").select("id, url").eq("seccion_id", id);
  if (e1) return fallo(e1.message);
  if (items.length > 0) {
    const { data, error } = await supabase.from("galeria_items").delete().eq("seccion_id", id).select("id");
    const r = resultado(error, data);
    if (!r.ok) return r;
  }
  const { data, error } = await supabase.from("galeria_secciones").delete().eq("id", id).select("id");
  const res = resultado(error, data);
  if (res.ok) {
    await borrarArchivos(items.map((i) => i.url));
    refrescar();
  }
  return res;
}

// ---------- Fotos y vídeos ----------

export async function crearItem(entrada: {
  seccionId: string;
  tipo: TipoMedia;
  url: string;
  titulo?: string;
}): Promise<Resultado> {
  const url = entrada.url.trim();
  if (entrada.tipo !== "foto" && entrada.tipo !== "video") return fallo("Tipo no válido");
  if (!urlMediaValida(url)) return fallo("La dirección tiene que empezar por https://");
  // Un vídeo subido al bucket siempre vale; uno por enlace tiene que ser
  // YouTube o un archivo de vídeo que el navegador sepa reproducir.
  if (entrada.tipo === "video" && !rutaEnBucket(url) && !enlaceVideoValido(url)) {
    return fallo("Pega un enlace de YouTube o de un archivo .mp4 / .webm");
  }
  const titulo = entrada.titulo?.trim().slice(0, MAX_TITULO) || null;
  const supabase = await createClient();
  const { data: ultimo } = await supabase
    .from("galeria_items")
    .select("orden")
    .eq("seccion_id", entrada.seccionId)
    .order("orden", { ascending: false })
    .limit(1);
  const orden = (ultimo?.[0]?.orden ?? 0) + 1;
  const { data, error } = await supabase
    .from("galeria_items")
    .insert({ seccion_id: entrada.seccionId, tipo: entrada.tipo, url, titulo, orden })
    .select("id");
  const res = resultado(error, data);
  if (res.ok) refrescar();
  return res;
}

export async function actualizarItem(id: string, cambios: { titulo?: string | null; seccionId?: string }): Promise<Resultado> {
  const supabase = await createClient();
  const update: { titulo?: string | null; seccion_id?: string; orden?: number } = {};
  if (cambios.titulo !== undefined) update.titulo = cambios.titulo?.trim().slice(0, MAX_TITULO) || null;
  if (cambios.seccionId) {
    // Al cambiar de sección, se coloca al final de la nueva.
    const { data: ultimo } = await supabase
      .from("galeria_items")
      .select("orden")
      .eq("seccion_id", cambios.seccionId)
      .order("orden", { ascending: false })
      .limit(1);
    update.seccion_id = cambios.seccionId;
    update.orden = (ultimo?.[0]?.orden ?? 0) + 1;
  }
  const { data, error } = await supabase.from("galeria_items").update(update).eq("id", id).select("id");
  const res = resultado(error, data);
  if (res.ok) refrescar();
  return res;
}

export async function moverItem(id: string, dir: 1 | -1): Promise<Resultado> {
  const supabase = await createClient();
  const { data: item, error: e1 } = await supabase.from("galeria_items").select("seccion_id").eq("id", id).maybeSingle();
  if (e1) return fallo(e1.message);
  if (!item?.seccion_id) return fallo("No encontrado");
  const { data: lista, error } = await supabase
    .from("galeria_items")
    .select("id, orden")
    .eq("seccion_id", item.seccion_id)
    .order("orden");
  if (error) return fallo(error.message);
  const actual = lista.find((x) => x.id === id);
  const otro = vecino(lista, id, dir);
  if (!actual || !otro) return fallo("Ya está en el extremo");
  return intercambiar("galeria_items", actual, otro, dir);
}

export async function borrarItem(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("galeria_items").delete().eq("id", id).select("id, url");
  const res = resultado(error, data);
  if (res.ok && data) {
    await borrarArchivos(data.map((d) => d.url));
    refrescar();
  }
  return res;
}

// Si la subida al bucket fue bien pero no se pudo guardar el registro, se
// borra el archivo para no dejarlo huérfano.
export async function descartarSubida(url: string): Promise<Resultado> {
  await borrarArchivos([url]);
  return OK;
}

async function intercambiar(
  tabla: "galeria_secciones" | "galeria_items",
  a: { id: string; orden: number },
  b: { id: string; orden: number },
  dir: 1 | -1
): Promise<Resultado> {
  const supabase = await createClient();
  // Con el mismo orden (p.ej. tras mover entre secciones) basta con colocar
  // `a` justo al otro lado de `b`.
  if (a.orden === b.orden) {
    const r = await supabase.from(tabla).update({ orden: b.orden + dir }).eq("id", a.id).select("id");
    const res = resultado(r.error, r.data);
    if (res.ok) refrescar();
    return res;
  }
  // Dos updates que se intercambian el orden. Se comprueban los dos: si RLS
  // deja pasar cero filas en el primero, el segundo dejaría el orden a medias.
  const r1 = await supabase.from(tabla).update({ orden: b.orden }).eq("id", a.id).select("id");
  const ok1 = resultado(r1.error, r1.data);
  if (!ok1.ok) return ok1;
  const r2 = await supabase.from(tabla).update({ orden: a.orden }).eq("id", b.id).select("id");
  const res = resultado(r2.error, r2.data);
  if (res.ok) refrescar();
  return res;
}
