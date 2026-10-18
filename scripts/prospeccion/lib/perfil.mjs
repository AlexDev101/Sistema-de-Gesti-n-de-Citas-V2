// Qué publica el propio negocio en la portada de su web: descripción, textos,
// servicios con precio, horario, dirección, redes e imágenes (logo, portada y
// galería). Sin red: recibe el HTML ya descargado y devuelve datos limpios.
// Todo lo que sale es TEXTO plano o direcciones http(s); nunca HTML.

import { instagramDe } from "./osm.mjs";

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", euro: "€", ntilde: "ñ", Ntilde: "Ñ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", uuml: "ü", iexcl: "¡", iquest: "¿", hellip: "…", ndash: "–", mdash: "—" };

export function decodificar(t) {
  return String(t ?? "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 8 && n < 0x110000 ? String.fromCodePoint(n) : " ";
    }
    return ENTIDADES[e] ?? m;
  });
}

const limpio = (t) => decodificar(t).replace(/\s+/g, " ").trim();
const recorte = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

function atributos(etiqueta) {
  const a = {};
  for (const m of etiqueta.matchAll(/([a-zA-Z_:][-\w:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const k = m[1].toLowerCase();
    if (!(k in a)) a[k] = decodificar(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return a;
}

// Dirección absoluta http(s) o null. Descarta data:, javascript:, etc.
export function absoluta(valor, base) {
  if (!valor) return null;
  try {
    const u = new URL(String(valor).trim(), base || undefined);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

// ── Datos estructurados (JSON-LD) ──────────────────────────────────────────

const TIPOS_NEGOCIO = /barber|hairsalon|beautysalon|localbusiness|healthandbeauty|store|professionalservice/i;

function aLista(x) {
  return x == null ? [] : Array.isArray(x) ? x : [x];
}

function nodosJsonLd(html) {
  const nodos = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/ld\+json/i.test(m[1])) continue;
    let json;
    try {
      json = JSON.parse(m[2].trim());
    } catch {
      continue;
    }
    const pila = [json];
    while (pila.length && nodos.length < 60) {
      const x = pila.pop();
      if (Array.isArray(x)) pila.push(...x);
      else if (x && typeof x === "object") {
        nodos.push(x);
        if (x["@graph"]) pila.push(...aLista(x["@graph"]));
      }
    }
  }
  return nodos;
}

const DIAS = { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" };

function datosNegocioJsonLd(html, base) {
  const nodo = nodosJsonLd(html).find((n) => aLista(n["@type"]).some((t) => TIPOS_NEGOCIO.test(String(t))));
  if (!nodo) return null;
  const texto = (v) => (typeof v === "string" ? limpio(v) : "");
  const dir = typeof nodo.address === "object" && nodo.address ? nodo.address : null;
  const direccion = dir
    ? [texto(dir.streetAddress), texto(dir.postalCode), texto(dir.addressLocality)].filter(Boolean).join(", ")
    : texto(nodo.address);
  const horario = [
    ...aLista(nodo.openingHours).map(texto).filter(Boolean),
    ...aLista(nodo.openingHoursSpecification)
      .filter((h) => h && typeof h === "object")
      .map((h) => {
        const dias = aLista(h.dayOfWeek).map((d) => DIAS[String(d).split("/").pop().toLowerCase()] ?? texto(String(d))).join(", ");
        return [dias, texto(h.opens) && texto(h.closes) ? `${texto(h.opens)}–${texto(h.closes)}` : ""].filter(Boolean).join(" ");
      })
      .filter(Boolean),
  ];
  const servicios = [];
  for (const oferta of [...aLista(nodo.makesOffer), ...aLista(nodo.hasOfferCatalog?.itemListElement)]) {
    const item = oferta?.itemOffered ?? oferta;
    const nombre = texto(item?.name);
    if (nombre) servicios.push({ servicio: recorte(nombre, 80), precio: texto(String(oferta?.price ?? item?.price ?? "")) || null });
  }
  const urlImagen = (v) => absoluta(typeof v === "string" ? v : v?.url ?? v?.contentUrl, base);
  return {
    nombre: texto(nodo.name),
    descripcion: texto(nodo.description),
    direccion,
    horario,
    servicios,
    rango: texto(nodo.priceRange),
    logo: urlImagen(nodo.logo),
    imagenes: aLista(nodo.image).map(urlImagen).filter(Boolean),
    redes: aLista(nodo.sameAs).map((u) => absoluta(u, base)).filter(Boolean),
  };
}

// ── Texto visible ──────────────────────────────────────────────────────────

// El HTML sin comentarios, scripts, estilos ni cabecera: sólo lo que ve el visitante.
function soloVisible(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<head\b[\s\S]*?<\/head\s*>/gi, " ");
}

function cuerpoComoTexto(visible) {
  return visible
    .replace(/<\/?(?:p|div|li|ul|ol|tr|td|th|h[1-6]|br|section|article|header|footer|main|nav|address|dd|dt|table)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map(limpio)
    .filter(Boolean);
}

const RUIDO_LEGAL = /cookies?|aviso legal|pol[ií]tica de|privacidad|todos los derechos|copyright|©|javascript|suscr[ií]b|newsletter/i;

function bloques(html, etiquetas, { min = 0, max = 400 } = {}) {
  const salida = [];
  const re = new RegExp(`<(${etiquetas})\\b[^>]*>([\\s\\S]*?)</\\1\\s*>`, "gi");
  for (const m of html.matchAll(re)) {
    const t = limpio(m[2].replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1\s*>/gi, " ").replace(/<[^>]+>/g, " "));
    if (t.length >= min && t.length <= max && !RUIDO_LEGAL.test(t)) salida.push(t);
  }
  return salida;
}

const unicos = (lista, n) => [...new Set(lista)].slice(0, n);

// «Corte de pelo ........ 15 €», «Barba 8,50€», «Corte + barba: 20 euros»
const LINEA_PRECIO = /^(.{3,70}?)[\s.:·\-–—…_|]*(?:desde\s+)?(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:€|eur\b|euros?\b)|^(.{3,70}?)[\s.:·\-–—…_|]*€\s*(\d{1,3}(?:[.,]\d{1,2})?)/i;

export function serviciosDe(lineas) {
  const salida = [];
  const vistos = new Set();
  for (const linea of lineas) {
    if (linea.length > 110 || RUIDO_LEGAL.test(linea)) continue;
    const m = linea.match(LINEA_PRECIO);
    if (!m) continue;
    const servicio = limpio((m[1] ?? m[3]).replace(/[.:·\-–—…_|]+$/g, ""));
    const precio = Number((m[2] ?? m[4]).replace(",", "."));
    if (!/[a-záéíóúñ]{3}/i.test(servicio) || !(precio >= 1 && precio <= 500)) continue;
    const clave = servicio.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({ servicio: recorte(servicio, 80), precio: `${precio.toString().replace(".", ",")} €` });
    if (salida.length >= 25) break;
  }
  return salida;
}

const LINEA_HORARIO = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\b[^\n]{0,80}\d{1,2}\s*[:.h]\s*\d{0,2}/i;

// ── Redes ──────────────────────────────────────────────────────────────────

const RED_POR_HOST = [
  ["instagram", /(^|\.)instagram\.com$/i],
  ["facebook", /(^|\.)facebook\.com$/i],
  ["tiktok", /(^|\.)tiktok\.com$/i],
  ["youtube", /(^|\.)youtube\.com$/i],
  ["x", /(^|\.)(x|twitter)\.com$/i],
];
const RUTAS_NO_PERFIL = /^\/(sharer|share|plugins|tr|dialog|intent|watch|embed|p\/|reel|explore|hashtag)/i;

export function redesDe(enlaces) {
  const redes = {};
  for (const e of enlaces) {
    let u;
    try {
      u = new URL(e);
    } catch {
      continue;
    }
    const red = RED_POR_HOST.find(([, re]) => re.test(u.hostname))?.[0];
    if (!red || redes[red] || RUTAS_NO_PERFIL.test(u.pathname) || u.pathname.length < 2) continue;
    if (red === "instagram") {
      const usuario = instagramDe(u.href);
      if (usuario) redes[red] = `https://www.instagram.com/${usuario}/`;
    } else {
      redes[red] = `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
    }
  }
  return redes;
}

// ── Imágenes ───────────────────────────────────────────────────────────────

const IMAGEN_DESCARTABLE = /sprite|pixel|tracking|spacer|blank|loader|spinner|emoji|gravatar|favicon|\/icons?\/|[/_-]icon[-_.]|flag|badge|payment|visa|mastercard|whatsapp|facebook\.com\/tr|googleusercontent\.com\/a\/|maps\.(google|gstatic)|doubleclick|stats\.|analytics/i;
const EXT_VALIDA = /\.(jpe?g|png|webp|avif|gif)(?:$|[?#])/i;

// De un srcset («a.jpg 400w, b.jpg 800w») se toma el candidato más grande.
export function mayorDeSrcset(srcset) {
  let mejor = null;
  let peso = -1;
  for (const parte of String(srcset ?? "").split(",")) {
    const [url, tam] = parte.trim().split(/\s+/);
    if (!url) continue;
    const n = Number.parseFloat(tam ?? "1") || 1;
    if (n > peso) {
      peso = n;
      mejor = url;
    }
  }
  return mejor;
}

function imagenesDe(html, base, jsonLd) {
  const metas = {};
  for (const m of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const a = atributos(m[1]);
    const k = (a.property ?? a.name ?? "").toLowerCase();
    if (k && a.content && !(k in metas)) metas[k] = a.content;
  }
  const portada = absoluta(metas["og:image"] ?? metas["og:image:url"] ?? metas["twitter:image"], base) ?? jsonLd?.imagenes?.[0] ?? null;

  let logo = jsonLd?.logo ?? null;
  const galeria = [];
  const visto = new Set();
  const añadir = (crudo, a = {}) => {
    const url = absoluta(crudo, base);
    if (!url || visto.has(url)) return;
    visto.add(url);
    const marcas = `${url} ${a.alt ?? ""} ${a.class ?? ""} ${a.id ?? ""}`;
    if (/logo/i.test(marcas)) {
      logo ??= url; // el primero es el del negocio; los demás (socios, marcas) no son galería
      return;
    }
    if (IMAGEN_DESCARTABLE.test(marcas.replace(/\s+/g, " "))) return;
    if (!EXT_VALIDA.test(url) && /\.[a-z0-9]{2,4}(?:$|\?)/i.test(new URL(url).pathname + new URL(url).search)) return; // .svg, .php…
    const ancho = Number.parseInt(a.width ?? "", 10);
    const alto = Number.parseInt(a.height ?? "", 10);
    if ((ancho && ancho < 120) || (alto && alto < 120)) return;
    galeria.push(url);
  };

  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const a = atributos(m[1]);
    const srcset = mayorDeSrcset(a.srcset ?? a["data-srcset"]);
    añadir(srcset ?? a["data-src"] ?? a["data-lazy-src"] ?? a["data-original"] ?? a.src, a);
  }
  for (const m of html.matchAll(/<source\b([^>]*)>/gi)) {
    const a = atributos(m[1]);
    añadir(mayorDeSrcset(a.srcset ?? a["data-srcset"]));
  }
  for (const m of html.matchAll(/background(?:-image)?\s*:[^;"'}]*url\(\s*["']?([^"')]+)["']?\s*\)/gi)) añadir(decodificar(m[1]));

  if (!logo) {
    const icono = [...html.matchAll(/<link\b([^>]*)>/gi)].map((m) => atributos(m[1])).find((a) => /apple-touch-icon/i.test(a.rel ?? ""));
    logo = absoluta(icono?.href, base);
  }
  const sinRepetir = galeria.filter((u) => u !== portada && u !== logo);
  return { logo, portada, galeria: portada ? [portada, ...sinRepetir].slice(0, 12) : sinRepetir.slice(0, 12), _metas: metas };
}

// ── Todo junto ─────────────────────────────────────────────────────────────

/**
 * @param {string} html
 * @param {string} base dirección de la página, para completar las rutas relativas
 */
export function extraerPerfil(html, base) {
  const ld = datosNegocioJsonLd(html, base);
  const imgs = imagenesDe(html, base, ld);
  const metas = imgs._metas;
  const visible = soloVisible(html);
  const lineas = cuerpoComoTexto(visible);

  const titulo = limpio(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const enlaces = [...html.matchAll(/<a\b([^>]*)>/gi)].map((m) => absoluta(atributos(m[1]).href, base)).filter(Boolean);

  const horarioTexto = lineas.filter((l) => l.length <= 110 && LINEA_HORARIO.test(l)).slice(0, 8);
  const servicios = ld?.servicios?.length ? ld.servicios : serviciosDe(lineas);
  const descripcion = limpio(metas["og:description"] ?? metas.description ?? "") || ld?.descripcion || "";

  const perfil = {
    nombre: recorte(limpio(metas["og:site_name"] ?? "") || ld?.nombre || titulo.split(/[|\-–—·]/)[0].trim(), 120),
    titulo: recorte(titulo, 160),
    descripcion: recorte(descripcion, 400),
    titulares: unicos(bloques(visible, "h1|h2|h3", { min: 3, max: 120 }), 10),
    textos: unicos(bloques(visible, "p", { min: 50, max: 400 }), 6),
    servicios,
    rangoPrecios: ld?.rango || null,
    horario: ld?.horario?.length ? ld.horario : horarioTexto,
    direccion: ld?.direccion || null,
    redes: redesDe([...(ld?.redes ?? []), ...enlaces]),
    imagenes: { logo: imgs.logo, portada: imgs.portada, galeria: imgs.galeria },
    vacio: false,
  };
  perfil.vacio = !perfil.descripcion && !perfil.textos.length && !perfil.servicios.length && !perfil.imagenes.galeria.length;
  return perfil;
}
