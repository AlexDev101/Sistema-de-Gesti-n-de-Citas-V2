// Búsqueda de barberías en OpenStreetMap (datos abiertos, sin clave de API):
// Nominatim localiza la ciudad y Overpass devuelve los negocios de peluquería
// que hay dentro. Sólo se usan datos que el propio negocio o la comunidad han
// publicado (nombre, dirección, teléfono, web). No se consulta Booksy ni
// ninguna otra plataforma.
//
// Uso razonable: una consulta a cada servicio por ciudad (política de uso de
// ambos). Los datos son ODbL: © colaboradores de OpenStreetMap.

import { parseTelefonos, mejorTelefono } from "./telefono.mjs";

export const AGENTE = "prospeccion-barberias/1.0 (herramienta personal de ventas)";

const REDES = /(^|\.)(instagram|facebook|linktr\.ee|linktree|tiktok|wa\.me|booksy|treatwell|fresha)\./i;

export function hostDe(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// «www.mibarberia.es» → «https://www.mibarberia.es»; descarta lo que no sea http(s).
export function normalizarWeb(valor) {
  if (!valor) return null;
  let v = String(valor).trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

// ¿Es una barbería (y no una peluquería de señoras)? Con `todas` entra cualquier peluquería.
export function esBarberia(tags, todas = false) {
  if (todas) return true;
  if (tags.shop === "barber" || tags.craft === "barber" || tags.hairdressing === "barber") return true;
  const nombre = (tags.name ?? "").toLowerCase();
  if (/barber|barbería|barberia|caballero|hombre|gentleman|\bmen\b|\bman\b/.test(nombre)) return true;
  return tags.male === "yes" && tags.female !== "yes";
}

export function parseElementos(json, { todas = false } = {}) {
  const vistos = new Set();
  const leads = [];
  for (const el of json?.elements ?? []) {
    const t = el.tags ?? {};
    if (!t.name || !esBarberia(t, todas)) continue;
    const telefonos = parseTelefonos(
      [t.phone, t["contact:phone"], t.mobile, t["contact:mobile"], t["contact:whatsapp"]].filter(Boolean).join(";"),
    );
    const web = normalizarWeb(t.website ?? t["contact:website"] ?? t.url);
    const clave = `${t.name.trim().toLowerCase()}|${mejorTelefono(telefonos)?.e164 ?? web ?? el.id}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const calle = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
    leads.push({
      id: `${el.type}/${el.id}`,
      nombre: t.name.trim(),
      direccion: [calle, t["addr:postcode"], t["addr:city"]].filter(Boolean).join(", "),
      telefonos,
      web,
      instagram: instagramDe(t["contact:instagram"]) ?? (web ? instagramDe(web) : null),
      horario: t.opening_hours ?? null,
      osm: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    });
  }
  return leads;
}

export function instagramDe(valor) {
  if (!valor) return null;
  const m = String(valor).match(/instagram\.com\/([A-Za-z0-9._]{2,30})/i) ?? String(valor).match(/^@?([A-Za-z0-9._]{2,30})$/);
  const usuario = m?.[1];
  return usuario && !["p", "reel", "reels", "explore", "accounts", "stories"].includes(usuario.toLowerCase()) ? usuario : null;
}

export function esRedOMarketplace(web) {
  return !!web && REDES.test(hostDe(web) + ".");
}

export async function geocodificar(ciudad, fetchFn = fetch) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=es&q=${encodeURIComponent(ciudad)}`;
  const res = await fetchFn(url, { headers: { "User-Agent": AGENTE, "Accept-Language": "es" } });
  if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
  const r = (await res.json())[0];
  if (!r) throw new Error(`No encuentro «${ciudad}» en España. Prueba con «Ciudad, Provincia».`);
  const [sur, norte, oeste, este] = r.boundingbox.map(Number);
  return { nombre: r.display_name, sur, norte, oeste, este };
}

export function consultaOverpass({ sur, norte, oeste, este }) {
  const caja = `${sur},${oeste},${norte},${este}`;
  return `[out:json][timeout:60];(nwr["shop"="hairdresser"](${caja});nwr["shop"="barber"](${caja});nwr["craft"="barber"](${caja}););out tags center 1000;`;
}

export async function buscarEnOsm(ciudad, { fetchFn = fetch, todas = false } = {}) {
  const zona = await geocodificar(ciudad, fetchFn);
  const res = await fetchFn("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "User-Agent": AGENTE, "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(consultaOverpass(zona)),
  });
  if (!res.ok) throw new Error(`Overpass respondió ${res.status} (si es 429 o 504, espera un minuto y repite)`);
  return { zona, leads: parseElementos(await res.json(), { todas }) };
}
