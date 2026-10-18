// Una carpeta por negocio con lo que publica en su web: perfil.json (textos,
// servicios, horario, redes) y, si se pide, sus imágenes. La carpeta de cada
// negocio se llama como él, en minúsculas y sin símbolos, más su id de OSM.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { descargarImagenes } from "./imagenes.mjs";
import { enParalelo } from "./pipeline.mjs";
import { formatoNacional } from "./telefono.mjs";

export function slugDe(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export const carpetaDe = (lead) => `negocios/${slugDe(lead.nombre) || "negocio"}-${slugDe(lead.id)}`;

// Perfil listo para guardar o mostrar: el horario de OpenStreetMap sirve de respaldo.
export function perfilCompleto(lead) {
  const p = lead.sitio?.perfil;
  if (!p) return null;
  const horario = p.horario.length ? p.horario : lead.horario ? [lead.horario] : [];
  return { ...p, horario };
}

/**
 * @param {any[]} leads
 * @param {string} raiz
 * @param {{ descargar?: boolean, maxGaleria?: number, alProgresar?: (hechos: number, total: number) => void, fetchFn?: typeof fetch, esPublico?: (host: string) => Promise<boolean> }} [opciones]
 *
 * Escribe negocios/<nombre>/perfil.json de cada negocio con web legible y, con
 * `descargar`, sus imágenes. Añade `lead.ficha = { carpeta, logo, galeria }`.
 */
export async function guardarFichas(leads, raiz, { descargar = true, maxGaleria = 6, alProgresar = () => {}, ...opciones } = {}) {
  const conPerfil = leads.filter((l) => l.sitio?.perfil && !l.sitio.perfil.vacio);
  let hechos = 0;
  await enParalelo(conPerfil, 3, async (lead) => {
    const carpeta = carpetaDe(lead);
    const dir = join(raiz, carpeta);
    await mkdir(dir, { recursive: true });
    const perfil = perfilCompleto(lead);
    const imagenes = descargar ? await descargarImagenes(perfil, dir, { maxGaleria, ...opciones }) : { logo: null, galeria: [], fallidas: 0 };
    lead.ficha = { carpeta, logo: imagenes.logo, galeria: imagenes.galeria };
    const ficha = {
      negocio: lead.nombre,
      direccion: lead.direccion || null,
      telefono: lead.telefono ? formatoNacional(lead.telefono.e164) : null,
      web: lead.web,
      instagram: lead.instagram ? `https://www.instagram.com/${lead.instagram}/` : null,
      openstreetmap: lead.osm,
      leidoEn: new Date().toISOString(),
      aviso: "Contenido publicado por el propio negocio en su web. Úsalo solo para preparar una demostración para él.",
      perfil,
      imagenesGuardadas: imagenes,
    };
    await writeFile(join(dir, "perfil.json"), JSON.stringify(ficha, null, 2));
    alProgresar(++hechos, conPerfil.length);
  });
  return leads;
}
