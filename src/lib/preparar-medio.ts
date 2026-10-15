// Sólo navegador. Prepara una foto o un vídeo antes de subirlo a la galería:
// - Las fotos se reducen a 1600 px por el lado largo y se guardan en WebP
//   (o JPG si el navegador no sabe hacer WebP). Una foto de móvil pasa de
//   3–8 MB a unos 150–400 KB: el almacenamiento gratuito de Supabase (1 GB)
//   da para miles de fotos y la portada carga mucho antes.
// - De fotos y vídeos se leen las medidas, para pintar el mosaico sin saltos.
// Si algo falla se sube el archivo tal cual: nunca se bloquea la subida.

export type MedioPreparado = {
  archivo: Blob;
  tipoMime: string;
  nombre: string;
  ancho?: number;
  alto?: number;
};

const LADO_MAX = 1600;
const CALIDAD = 0.82;

function cambiarExtension(nombre: string, ext: string) {
  return nombre.replace(/\.[a-z0-9]{1,5}$/i, "") + "." + ext;
}

function aBlob(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((ok) => canvas.toBlob(ok, tipo, CALIDAD));
}

export async function prepararFoto(archivo: File): Promise<MedioPreparado> {
  const original: MedioPreparado = { archivo, tipoMime: archivo.type, nombre: archivo.name };
  try {
    const bmp = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const medidas = { ancho: bmp.width, alto: bmp.height };
    // Un GIF puede ir animado: al pasarlo por el canvas se quedaría quieto.
    if (archivo.type === "image/gif") {
      bmp.close();
      return { ...original, ...medidas };
    }
    const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
    const ancho = Math.max(1, Math.round(bmp.width * escala));
    const alto = Math.max(1, Math.round(bmp.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return { ...original, ...medidas };
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, ancho, alto);
    bmp.close();

    let blob = await aBlob(canvas, "image/webp");
    // Navegadores antiguos devuelven PNG cuando no saben hacer WebP.
    if (!blob || blob.type !== "image/webp") blob = await aBlob(canvas, "image/jpeg");
    if (!blob || blob.size >= archivo.size) return { ...original, ...medidas };
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return { archivo: blob, tipoMime: blob.type, nombre: cambiarExtension(archivo.name, ext), ancho, alto };
  } catch {
    return original;
  }
}

export function prepararVideo(archivo: File): Promise<MedioPreparado> {
  const original: MedioPreparado = { archivo, tipoMime: archivo.type, nombre: archivo.name };
  return new Promise((ok) => {
    const url = URL.createObjectURL(archivo);
    const video = document.createElement("video");
    const terminar = (res: MedioPreparado) => {
      clearTimeout(reloj);
      URL.revokeObjectURL(url);
      ok(res);
    };
    const reloj = setTimeout(() => terminar(original), 5000);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      terminar(video.videoWidth && video.videoHeight ? { ...original, ancho: video.videoWidth, alto: video.videoHeight } : original);
    video.onerror = () => terminar(original);
    video.src = url;
  });
}
