import type { ReactNode } from "react";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";

// Marco común de las páginas legales. Si el titular no ha rellenado sus datos
// en Ajustes, se avisa arriba: es una plantilla y no debe publicarse a medias.
export function PaginaLegal({ titulo, completa, children }: { titulo: string; completa: boolean; children: ReactNode }) {
  return (
    <article className="flex flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-10 text-[13px] leading-relaxed">
      <Link href="/" className="btn btn-icon btn-secondary" aria-label="Volver al inicio">
        <CaretLeft size={16} />
      </Link>
      <h1 className="m-0 text-[24px]" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>{titulo}</h1>
      {!completa && (
        <p
          className="m-0 rounded-[var(--radius-md)] px-3.5 py-2.5"
          style={{ background: "color-mix(in srgb, var(--color-state-muchas) 16%, transparent)" }}
        >
          Plantilla pendiente de completar: el negocio tiene que rellenar sus datos legales en el panel (Ajustes) y
          revisar este texto antes de publicarlo.
        </p>
      )}
      {children}
    </article>
  );
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="m-0 text-[15px]" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>{titulo}</h2>
      <div className="flex flex-col gap-2" style={{ color: "color-mix(in srgb, var(--color-text) 82%, transparent)" }}>
        {children}
      </div>
    </section>
  );
}
