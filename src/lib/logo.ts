// Logo del negocio (Ajustes). Lógica pura para poder probarla.

export const MAX_LOGO_MB = 2;

const TIPOS_LOGO = /^image\/(png|webp|jpeg|svg\+xml)$/;

// Devuelve un mensaje si el archivo no vale como logo, o null si vale.
export function problemaLogo(archivo: { type: string; size: number; name: string }): string | null {
  if (!TIPOS_LOGO.test(archivo.type)) return `«${archivo.name}» no es un logo compatible (PNG, SVG, WEBP o JPG).`;
  if (archivo.size > MAX_LOGO_MB * 1024 * 1024) return `«${archivo.name}» pesa más de ${MAX_LOGO_MB} MB.`;
  return null;
}
