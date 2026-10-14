import "server-only";

// Cloudflare Turnstile (gratuito). Si no hay clave secreta configurada, el
// captcha se desactiva: así funciona el desarrollo local y una instalación
// recién clonada no queda bloqueada. En producción hay que fijar
// NEXT_PUBLIC_TURNSTILE_SITE_KEY y TURNSTILE_SECRET_KEY (ver docs/INSTALACION.md).
export function captchaActivo(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verificarCaptcha(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!captchaActivo() || !secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("No se pudo verificar el captcha:", err);
    return false;
  }
}

export const CAPTCHA_FALLIDO = "No hemos podido comprobar que no eres un robot. Recarga la página e inténtalo otra vez.";
