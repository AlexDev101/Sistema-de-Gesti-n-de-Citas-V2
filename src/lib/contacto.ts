import { normalizarTelefono } from "@/lib/validacion";

// Enlaces para llamar o escribir por WhatsApp desde el panel y la web. Los
// teléfonos se guardan sin prefijo cuando son españoles (ver
// normalizar_telefono), así que se le añade el +34.

function internacional(telefono: string): string {
  const t = normalizarTelefono(telefono);
  if (t.startsWith("+")) return t;
  if (/^[6-9][0-9]{8}$/.test(t)) return `+34${t}`;
  return t;
}

export function telHref(telefono: string): string {
  return `tel:${internacional(telefono)}`;
}

export function whatsappHref(telefono: string, texto?: string): string {
  const numero = internacional(telefono).replace(/^\+/, "");
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
