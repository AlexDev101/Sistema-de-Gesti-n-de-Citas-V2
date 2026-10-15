// Lógica pura de la galería (sin Supabase ni React), para poder probarla.

export type TipoMedia = "foto" | "video";

export type GaleriaItem = {
  id: string;
  seccion_id: string | null;
  tipo: TipoMedia;
  url: string;
  titulo: string | null;
  orden: number;
  // Medidas en píxeles (opcionales: los elementos antiguos o los enlaces no las tienen).
  ancho?: number | null;
  alto?: number | null;
};

export type GaleriaSeccion = {
  id: string;
  nombre: string;
  orden: number;
  items: GaleriaItem[];
};

export const BUCKET_GALERIA = "galeria";
// El plan gratuito de Supabase corta en 50 MB por archivo; se avisa antes de
// subir para no gastar la conexión del móvil en algo que va a fallar. Las
// fotos se reducen en el navegador antes de subir (preparar-medio.ts), así
// que el límite de foto es sobre el original.
export const MAX_FOTO_MB = 25;
export const MAX_VIDEO_MB = 50;

const IMAGEN = /^image\/(jpeg|png|webp|gif|avif)$/;
const VIDEO = /^video\/(mp4|webm|quicktime)$/;

export function tipoDeArchivo(mime: string): TipoMedia | null {
  if (IMAGEN.test(mime)) return "foto";
  if (VIDEO.test(mime)) return "video";
  return null;
}

// Devuelve un mensaje si el archivo no se puede subir, o null si vale.
export function problemaArchivo(archivo: { type: string; size: number; name: string }): string | null {
  const tipo = tipoDeArchivo(archivo.type);
  if (!tipo) return `«${archivo.name}» no es una foto ni un vídeo compatible (JPG, PNG, WEBP, MP4, MOV o WEBM).`;
  const max = tipo === "foto" ? MAX_FOTO_MB : MAX_VIDEO_MB;
  if (archivo.size > max * 1024 * 1024) return `«${archivo.name}» pesa más de ${max} MB.`;
  return null;
}

const YT = [
  /^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
  /^https:\/\/(?:www\.|m\.)?youtube\.com\/(?:shorts|embed|live)\/([\w-]{11})/,
  /^https:\/\/youtu\.be\/([\w-]{11})/,
];

export function youtubeId(url: string): string | null {
  for (const re of YT) {
    const m = url.trim().match(re);
    if (m) return m[1];
  }
  return null;
}

// Se aceptan direcciones https:// (Supabase Storage, YouTube, un mp4 en otro
// sitio) y las fotos que ya venían con la web en /uploads/.
export function urlMediaValida(url: string): boolean {
  const u = url.trim();
  if (/^\/uploads\/[\w.-]+$/.test(u)) return true;
  return /^https:\/\/[^\s"'<>]+$/.test(u);
}

// Un vídeo por enlace sólo se admite si se puede reproducir: YouTube o un
// archivo de vídeo directo.
export function enlaceVideoValido(url: string): boolean {
  if (!urlMediaValida(url)) return false;
  if (youtubeId(url)) return true;
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url.trim());
}

// Ruta dentro del bucket a partir de la URL pública, para poder borrar el
// archivo. null si la URL no apunta a nuestro bucket (YouTube, /uploads/…).
export function rutaEnBucket(url: string): string | null {
  const marca = `/storage/v1/object/public/${BUCKET_GALERIA}/`;
  const i = url.indexOf(marca);
  if (i === -1) return null;
  const ruta = decodeURIComponent(url.slice(i + marca.length).split("?")[0]);
  return ruta || null;
}

// Nombre de archivo sin espacios ni acentos, único y con la extensión original.
export function nombreArchivo(original: string, ahora = Date.now(), azar = Math.random()): string {
  const ext = (original.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? "bin").toLowerCase();
  const sufijo = Math.floor(azar * 1e8).toString(36);
  return `${ahora}-${sufijo}.${ext}`;
}

export function agrupar(
  secciones: { id: string; nombre: string; orden: number }[],
  items: {
    id: string;
    seccion_id: string | null;
    tipo: string;
    url: string;
    titulo: string | null;
    orden: number;
    ancho?: number | null;
    alto?: number | null;
  }[]
): GaleriaSeccion[] {
  return [...secciones]
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({
      ...s,
      items: items
        .filter((it) => it.seccion_id === s.id && (it.tipo === "foto" || it.tipo === "video"))
        .sort((a, b) => a.orden - b.orden)
        .map((it) => ({ ...it, tipo: it.tipo as TipoMedia })),
    }));
}

// Vecino con el que intercambiar el orden al mover arriba/abajo.
export function vecino<T extends { id: string }>(lista: T[], id: string, dir: 1 | -1): T | null {
  const i = lista.findIndex((x) => x.id === id);
  if (i === -1) return null;
  return lista[i + dir] ?? null;
}

export function medidasValidas(ancho: unknown, alto: unknown): boolean {
  const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 20000;
  return ok(ancho) && ok(alto);
}

// Alto / ancho de cada pieza en el mosaico. Las proporciones extremas se
// recortan para que una panorámica no quede como una tira ni una captura
// larguísima ocupe toda la columna.
export function proporcion(item: Pick<GaleriaItem, "tipo" | "url" | "ancho" | "alto">): number {
  let p: number;
  if (item.ancho && item.alto) p = item.alto / item.ancho;
  else if (item.tipo === "video" && youtubeId(item.url)) p = /\/shorts\//.test(item.url) ? 16 / 9 : 9 / 16;
  else p = 5 / 4;
  return Math.min(16 / 9, Math.max(9 / 16, p));
}

// Reparte las piezas en columnas metiendo cada una en la más corta, para que
// el mosaico quede equilibrado y se lea en orden de izquierda a derecha.
// Es determinista: el servidor y el navegador llegan al mismo reparto.
export function repartirColumnas<T>(items: T[], columnas: number, alto: (item: T) => number): T[][] {
  const cols: T[][] = Array.from({ length: columnas }, () => []);
  const altos = new Array(columnas).fill(0);
  for (const item of items) {
    let i = 0;
    for (let c = 1; c < columnas; c++) if (altos[c] < altos[i] - 1e-9) i = c;
    cols[i].push(item);
    altos[i] += alto(item);
  }
  return cols;
}
