// Descarga las imágenes que el propio negocio publica en su portada (logo, foto
// de portada y unas pocas de la galería) para tenerlas en local.
// Salvaguardas: sólo http(s), nunca direcciones internas o privadas (ni siquiera
// por una redirección), tope de tamaño por archivo, sólo tipos de imagen y
// nombres de archivo que genera la herramienta (nunca los de la web).

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AGENTE } from "./osm.mjs";

export const MAX_IMAGEN_BYTES = 3_000_000;
const MIN_GALERIA_BYTES = 4_000; // por debajo suelen ser iconos o píxeles
const MAX_REDIRECCIONES = 3;

const EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

// ¿Es una dirección IP que no sale a internet (local, privada, enlace local…)?
export function ipPrivada(ip) {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (v === 6) {
    const t = ip.toLowerCase();
    if (t === "::" || t === "::1") return true;
    const mapeada = t.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapeada) return ipPrivada(mapeada[1]);
    return /^(fc|fd|fe[89ab])/.test(t);
  }
  return true;
}

async function resolverPublico(host) {
  const limpio = host.replace(/^\[|\]$/g, "");
  if (isIP(limpio)) return !ipPrivada(limpio);
  if (/^localhost$|\.localhost$|\.local$|\.internal$/i.test(limpio)) return false;
  try {
    const direcciones = await lookup(limpio, { all: true });
    return direcciones.length > 0 && direcciones.every((d) => !ipPrivada(d.address));
  } catch {
    return false;
  }
}

async function leerHasta(res, max) {
  const declarado = Number(res.headers.get("content-length"));
  if (declarado > max) return null;
  const lector = res.body?.getReader();
  if (!lector) {
    const b = Buffer.from(await res.arrayBuffer());
    return b.length <= max ? b : null;
  }
  const trozos = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      lector.cancel().catch(() => {});
      return null;
    }
    trozos.push(value);
  }
  return Buffer.concat(trozos.map((t) => Buffer.from(t)));
}

/**
 * Descarga UNA imagen. Devuelve { datos, extension } o null si no es válida.
 * `esPublico` se puede sustituir en las pruebas (un servidor local no lo es).
 */
export async function bajarImagen(url, { fetchFn = fetch, esPublico = resolverPublico, max = MAX_IMAGEN_BYTES, min = 0, svg = false, timeoutMs = 12_000 } = {}) {
  let actual = url;
  try {
    for (let salto = 0; salto <= MAX_REDIRECCIONES; salto++) {
      const u = new URL(actual);
      if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password) return null;
      if (!(await esPublico(u.hostname))) return null;
      const res = await fetchFn(actual, {
        redirect: "manual",
        headers: { "User-Agent": AGENTE, Accept: "image/avif,image/webp,image/*" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        actual = new URL(res.headers.get("location"), actual).href;
        continue;
      }
      if (!res.ok) return null;
      const tipo = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const extension = EXTENSION[tipo];
      if (!extension || (extension === "svg" && !svg)) return null;
      const datos = await leerHasta(res, max);
      if (!datos || datos.length < min || datos.length === 0) return null;
      return { datos, extension };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Guarda en `carpeta/imagenes/` el logo y las primeras `maxGaleria` fotos del perfil.
 * Devuelve las rutas relativas a `carpeta` (nunca falla: lo que no se pueda bajar se salta).
 */
export async function descargarImagenes(perfil, carpeta, { maxGaleria = 6, ...opciones } = {}) {
  const resultado = { logo: null, galeria: [], fallidas: 0 };
  const destino = join(carpeta, "imagenes");
  const guardar = async (nombre, img) => {
    await mkdir(destino, { recursive: true });
    const archivo = `${nombre}.${img.extension}`;
    await writeFile(join(destino, archivo), img.datos);
    return `imagenes/${archivo}`;
  };

  const { logo, galeria } = perfil.imagenes ?? {};
  if (logo) {
    const img = await bajarImagen(logo, { ...opciones, svg: true });
    if (img) resultado.logo = await guardar("logo", img);
    else resultado.fallidas++;
  }
  for (const url of (galeria ?? []).slice(0, maxGaleria + 4)) {
    if (resultado.galeria.length >= maxGaleria) break;
    const img = await bajarImagen(url, { ...opciones, min: MIN_GALERIA_BYTES });
    if (img) resultado.galeria.push(await guardar(`foto-${String(resultado.galeria.length + 1).padStart(2, "0")}`, img));
    else resultado.fallidas++;
  }
  return resultado;
}
