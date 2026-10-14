"use client";

import { useEffect, useRef } from "react";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const captchaHabilitado = Boolean(SITE_KEY);

let cargando: Promise<void> | null = null;
function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  cargando ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      cargando = null;
      reject(new Error("No se pudo cargar el captcha"));
    };
    document.head.appendChild(s);
  });
  return cargando;
}

// Cloudflare Turnstile: casi siempre se resuelve solo, sin que el cliente
// tenga que hacer nada. Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY no pinta nada (y
// el servidor tampoco lo exige; ver lib/captcha.ts).
export function Captcha({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let id: string | null = null;
    let vivo = true;
    cargarScript()
      .then(() => {
        if (!vivo || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          language: "es",
          theme: "dark",
          size: "flexible",
          callback: (t: string) => onTokenRef.current(t),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      vivo = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
