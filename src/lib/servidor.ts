import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

// Secreto compartido entre el servidor y la base (tabla cron_secreto). Lo
// exigen las funciones de Postgres que no deben poder llamarse desde el
// navegador con la clave anon: crear una reserva pública, leer el email de
// un cliente para avisarle, los recordatorios… El nombre CRON_SECRET se
// conserva porque es el que ya tenían configurado los despliegues.
export function secretoServidor(): string | null {
  return process.env.CRON_SECRET ?? null;
}

// URL pública de la web, para los enlaces de los emails. SITE_URL manda si
// está definida; si no, Netlify da URL (dominio principal del sitio) y, en
// último caso, se reconstruye desde la petición.
export async function origenSitio(): Promise<string> {
  const fija = process.env.SITE_URL ?? process.env.URL;
  if (fija) return fija.replace(/\/$/, "");
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

export async function ipCliente(): Promise<string | null> {
  const hdrs = await headers();
  return (
    hdrs.get("x-nf-client-connection-ip") ??
    hdrs.get("cf-connecting-ip") ??
    hdrs.get("x-real-ip") ??
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

// Huella de la conexión para limitar reservas seguidas desde el mismo sitio.
// Se guarda un hash con el secreto como sal, nunca la IP en claro.
export async function huellaConexion(): Promise<string | null> {
  const ip = await ipCliente();
  if (!ip) return null;
  return createHash("sha256").update(`${secretoServidor() ?? ""}:${ip}`).digest("hex").slice(0, 32);
}
