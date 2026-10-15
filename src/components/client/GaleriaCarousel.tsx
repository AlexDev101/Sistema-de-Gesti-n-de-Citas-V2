"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { youtubeId, type GaleriaItem, type GaleriaSeccion } from "@/lib/galeria";

// «Trabajos y Cortes» de la portada: una pestaña por sección (si hay más de
// una) y un carrusel deslizable con sus fotos y vídeos.
export function GaleriaPublica({ secciones }: { secciones: GaleriaSeccion[] }) {
  const conItems = secciones.filter((s) => s.items.length > 0);
  const [activa, setActiva] = useState(conItems[0]?.id);
  const seccion = conItems.find((s) => s.id === activa) ?? conItems[0];
  if (!seccion) return null;

  return (
    <div className="flex flex-col gap-3">
      {conItems.length > 1 && (
        <div role="tablist" aria-label="Secciones de la galería" className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
          {conItems.map((s) => {
            const sel = s.id === seccion.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={sel}
                onClick={() => setActiva(s.id)}
                className="flex-none rounded-full px-3 py-1.5 text-[12px] whitespace-nowrap transition-colors"
                style={{
                  background: sel ? "color-mix(in srgb, var(--color-accent) 18%, transparent)" : "transparent",
                  color: sel ? "var(--color-accent-300)" : "var(--color-text)",
                  border: `1px solid ${sel ? "transparent" : "var(--color-divider)"}`,
                }}
              >
                {s.nombre}
              </button>
            );
          })}
        </div>
      )}
      {/* key: al cambiar de sección el carrusel vuelve al principio */}
      <GaleriaCarousel key={seccion.id} items={seccion.items} />
    </div>
  );
}

export function GaleriaCarousel({ items }: { items: GaleriaItem[] }) {
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
  }, [items]);

  // Un vídeo que sale de pantalla se pausa, para que no siga sonando.
  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (i !== activo) el?.querySelector("video")?.pause();
    });
  }, [activo]);

  const irA = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(items.length - 1, i))];
    el?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div ref={contRef} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pb-1">
          {items.map((item, i) => (
            <div
              key={item.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="relative isolate aspect-[9/16] w-full shrink-0 snap-start overflow-hidden rounded-[14px]"
              style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)" }}
            >
              <Medio item={item} cerca={Math.abs(i - activo) <= 1} />
              {item.titulo && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pt-10 pb-3.5 text-[13px]"
                  style={{ background: "linear-gradient(transparent, color-mix(in srgb, black 65%, transparent))", color: "#fff" }}
                >
                  {item.titulo}
                </div>
              )}
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
            style={{ background: "color-mix(in srgb, var(--color-bg) 55%, transparent)", boxShadow: "var(--shadow-sm)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3 5 8l5 5" stroke="var(--color-text)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {activo < items.length - 1 && (
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => irA(activo + 1)}
            className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur"
            style={{ background: "color-mix(in srgb, var(--color-bg) 55%, transparent)", boxShadow: "var(--shadow-sm)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="var(--color-text)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Ir a ${item.tipo === "foto" ? "la foto" : "el vídeo"} ${i + 1}`}
              onClick={() => irA(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === activo ? "18px" : "6px",
                background: i === activo ? "var(--color-accent-300)" : "var(--color-divider)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Medio({ item, cerca }: { item: GaleriaItem; cerca: boolean }) {
  const alt = item.titulo ?? (item.tipo === "foto" ? "Trabajo reciente" : "Vídeo de un trabajo");
  if (item.tipo === "foto") {
    return <Image src={item.url} alt={alt} fill sizes="(min-width: 640px) 420px, 90vw" className="object-contain lighten" />;
  }
  const yt = youtubeId(item.url);
  if (yt) {
    // El iframe sólo se monta cerca de la diapositiva visible: cada uno carga
    // el reproductor completo de YouTube. Dominio sin cookies (RGPD).
    return cerca ? (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${yt}?playsinline=1&rel=0`}
        title={alt}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    ) : (
      <Image src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt={alt} fill sizes="90vw" className="object-cover" />
    );
  }
  return (
    <video
      src={`${item.url}#t=0.1`}
      controls
      playsInline
      preload="metadata"
      aria-label={alt}
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}
