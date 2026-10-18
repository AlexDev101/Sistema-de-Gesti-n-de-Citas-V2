// De «una ciudad» a la lista ordenada de negocios con su mensaje. Sin acceso a
// disco: la red entra por `fetchFn` para poder probarlo con datos de prueba.

import { buscarEnOsm } from "./osm.mjs";
import { analizarSitio } from "./sitio.mjs";
import { puntuar } from "./puntuar.mjs";
import { crearMensajes } from "./mensajes.mjs";
import { mejorTelefono } from "./telefono.mjs";

export function leerExcluidos(texto) {
  return String(texto ?? "")
    .split(/\r?\n/)
    .map((l) => l.split("#")[0].trim().toLowerCase())
    .filter(Boolean);
}

// Un negocio queda fuera si su nombre contiene una línea de la lista o si
// coincide con un teléfono de ella (se comparan los últimos 9 dígitos).
export function estaExcluido(lead, excluidos) {
  const nombre = lead.nombre.toLowerCase();
  return excluidos.some((x) => {
    const digitos = x.replace(/\D/g, "");
    if (digitos.length >= 9) return lead.telefonos.some((t) => t.e164.endsWith(digitos.slice(-9)));
    return nombre.includes(x);
  });
}

export async function enParalelo(items, n, fn) {
  const salida = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        salida[k] = await fn(items[k], k);
      }
    }),
  );
  return salida;
}

/**
 * @param {{
 *   ciudad: string,
 *   max?: number,
 *   todas?: boolean,
 *   excluidos?: string[],
 *   analizarWebs?: boolean,
 *   nombre?: string,
 *   demo?: string,
 *   fetchFn?: typeof fetch,
 *   alProgresar?: (hechos: number, total: number) => void,
 * }} opciones
 */
export async function prospectar({
  ciudad,
  max = 60,
  todas = false,
  excluidos = [],
  analizarWebs = true,
  nombre,
  demo,
  fetchFn = fetch,
  alProgresar = () => {},
}) {
  const { zona, leads: encontrados } = await buscarEnOsm(ciudad, { fetchFn, todas });
  const candidatos = encontrados.filter((l) => !estaExcluido(l, excluidos));
  // Primero los que se pueden contactar de alguna forma; si hay más que `max`, el resto se deja.
  const contactable = (l) => l.telefonos.length > 0 || !!l.web || !!l.instagram;
  const elegidos = [...candidatos].sort((a, b) => Number(contactable(b)) - Number(contactable(a))).slice(0, max);

  let hechos = 0;
  const leads = await enParalelo(elegidos, 4, async (lead) => {
    const sitio = analizarWebs ? await analizarSitio(lead.web, { fetchFn }) : await analizarSitio(null);
    const { puntuacion, segmento, motivos } = puntuar(lead, sitio);
    const completo = {
      ...lead,
      instagram: lead.instagram ?? sitio.instagram,
      telefono: mejorTelefono(lead.telefonos),
      sitio,
      puntuacion,
      segmento,
      motivos,
    };
    completo.mensajes = crearMensajes(lead, sitio, segmento, { nombre, demo });
    alProgresar(++hechos, elegidos.length);
    return completo;
  });

  leads.sort((a, b) => b.puntuacion - a.puntuacion || a.nombre.localeCompare(b.nombre, "es"));
  return { zona, encontrados: encontrados.length, excluidos: encontrados.length - candidatos.length, leads };
}
