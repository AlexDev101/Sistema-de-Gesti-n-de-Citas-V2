"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function TrabajosCarousel({ archivos }: { archivos: string[] }) {
  const [activo, setActivo] = useState(0);
  const contRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const cont = contRef.current;
    if (!cont) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = refs.current.findIndex((el) => el === visible.target);
        if (idx !== -1) setActivo(idx);
      },
      { root: cont, threshold: [0.6] },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [archivos]);

  const irA = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(archivos.length - 1, i))];
    el?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={contRef}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pb-1"
        >
          {archivos.map((archivo, i) => (
            <div
              key={archivo}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="relative isolate aspect-[9/16] w-full shrink-0 snap-start overflow-hidden rounded-[14px]"
              style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)" }}
            >
              <Image
                src={`/uploads/${archivo}`}
                alt="Trabajo reciente"
                fill
                sizes="80vw"
                className="object-contain lighten"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent)",
                  borderRadius: "14px",
                }}
              />
            </div>
          ))}
        </div>

        {activo > 0 && (
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => irA(activo - 1)}
            className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur"
            style={{
              background: "color-mix(in srgb, var(--color-bg) 55%, transparent)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3 5 8l5 5" stroke="var(--color-text)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {activo < archivos.length - 1 && (
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => irA(activo + 1)}
            className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur"
            style={{
              background: "color-mix(in srgb, var(--color-bg) 55%, transparent)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="var(--color-text)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex justify-center gap-1.5">
        {archivos.map((archivo, i) => (
          <button
            key={archivo}
            type="button"
            aria-label={`Ir a la foto ${i + 1}`}
            onClick={() => irA(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === activo ? "18px" : "6px",
              background: i === activo ? "var(--color-accent-300)" : "var(--color-divider)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
