// Mira la PORTADA pública de la web de un negocio (una sola petición, respetando
// su robots.txt) para saber tres cosas: si ya reserva con alguna plataforma,
// si tiene WhatsApp y cuál es su Instagram. No entra en redes sociales ni en
// Booksy: si la «web» del negocio es una de ellas, se deduce sólo de la dirección.

import { AGENTE, instagramDe, esRedOMarketplace } from "./osm.mjs";
import { extraerPerfil } from "./perfil.mjs";

// «marketplace»: el cliente reserva dentro de una plataforma ajena.
// «herramienta»: tiene un sistema de citas propio (más difícil de vender).
export const PLATAFORMAS = [
  { nombre: "Booksy", tipo: "marketplace", re: /booksy\.com/i },
  { nombre: "Treatwell", tipo: "marketplace", re: /treatwell\.[a-z.]+/i },
  { nombre: "Fresha", tipo: "marketplace", re: /fresha\.com/i },
  { nombre: "Calendly", tipo: "herramienta", re: /calendly\.com/i },
  { nombre: "Reservio", tipo: "herramienta", re: /reservio\.com/i },
  { nombre: "Setmore", tipo: "herramienta", re: /setmore\.com/i },
  { nombre: "SimplyBook", tipo: "herramienta", re: /simplybook\.(me|it)/i },
  { nombre: "AgendaPro", tipo: "herramienta", re: /agendapro\.com/i },
  { nombre: "Timify", tipo: "herramienta", re: /timify\.com/i },
  { nombre: "Bookio", tipo: "herramienta", re: /bookio\.com/i },
];

const TEXTO_RESERVA = /reserva(?:r)?\s+(?:tu\s+)?cita|cita\s+(?:previa\s+)?online|pide\s+(?:tu\s+)?cita|reserva\s+online|book\s+(?:now|online|an?\s+appointment)/i;
const WHATSAPP = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|whatsapp:\/\/send\?phone=)\+?(\d{9,15})/i;
const MAX_BYTES = 1_500_000;

export function plataformasEn(texto) {
  return PLATAFORMAS.filter((p) => p.re.test(texto)).map(({ nombre, tipo }) => ({ nombre, tipo }));
}

// Pura (sin red): qué se deduce del HTML de una portada. Con `base` (la dirección
// de la página) también extrae el perfil: textos, servicios, horario e imágenes.
export function analizarHtml(html, base) {
  const wa = html.match(WHATSAPP);
  const ig = [...html.matchAll(/instagram\.com\/([A-Za-z0-9._]{2,30})/gi)].map((m) => instagramDe(m[0])).find(Boolean);
  return {
    plataformas: plataformasEn(html),
    whatsapp: wa ? wa[1] : null,
    instagram: ig ?? null,
    textoReserva: TEXTO_RESERVA.test(html),
    ...(base ? { perfil: extraerPerfil(html, base) } : {}),
  };
}

// robots.txt: sólo se comprueba si el sitio prohíbe TODO a los robots («Disallow: /»),
// que es lo que afecta a una portada. Sin robots.txt o si falla, se entiende permitido.
export function robotsPermiteInicio(robotsTxt) {
  let aplica = false;
  let prohibido = false;
  for (const linea of String(robotsTxt).split(/\r?\n/)) {
    const [campo, ...resto] = linea.split("#")[0].split(":");
    const valor = resto.join(":").trim();
    const nombre = campo.trim().toLowerCase();
    if (nombre === "user-agent") aplica = valor === "*" || /prospeccion/i.test(valor);
    else if (nombre === "disallow" && aplica && valor === "/") prohibido = true;
  }
  return !prohibido;
}

async function leerLimitado(res, max = MAX_BYTES) {
  const lector = res.body?.getReader();
  if (!lector) return (await res.text()).slice(0, max);
  const trozos = [];
  let total = 0;
  while (total < max) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(value);
    total += value.length;
  }
  lector.cancel().catch(() => {});
  return Buffer.concat(trozos.map((t) => Buffer.from(t))).toString("utf8");
}

/** @type {{ web: string | null, motivo: string | null, plataformas: { nombre: string, tipo: string }[], whatsapp: string | null, instagram: string | null, textoReserva: boolean, perfil: ReturnType<typeof extraerPerfil> | null }} */
const SIN_WEB = { web: null, motivo: null, plataformas: [], whatsapp: null, instagram: null, textoReserva: false, perfil: null };

// Devuelve siempre un objeto; si algo falla, `motivo` dice por qué y el resto va vacío.
export async function analizarSitio(web, { fetchFn = fetch, timeoutMs = 10_000 } = {}) {
  if (!web) return { ...SIN_WEB };
  const base = { ...SIN_WEB, web };

  // La «web» es una red social o un marketplace: no se abre; se deduce de la dirección.
  if (esRedOMarketplace(web)) {
    return { ...base, motivo: "red-o-marketplace", plataformas: plataformasEn(web), instagram: instagramDe(web) };
  }

  try {
    const origen = new URL(web).origin;
    const cab = { headers: { "User-Agent": AGENTE, Accept: "text/html" }, signal: AbortSignal.timeout(timeoutMs) };
    const robots = await fetchFn(origen + "/robots.txt", { ...cab, signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (robots?.ok && !robotsPermiteInicio(await robots.text())) return { ...base, motivo: "robots" };

    const res = await fetchFn(web, cab);
    if (!res.ok) return { ...base, motivo: `http-${res.status}` };
    if (!/html/i.test(res.headers.get("content-type") ?? "")) return { ...base, motivo: "no-html" };
    return { ...base, ...analizarHtml(await leerLimitado(res), res.url || web), motivo: null };
  } catch (e) {
    return { ...base, motivo: e?.name === "TimeoutError" ? "tiempo-agotado" : "no-responde" };
  }
}
