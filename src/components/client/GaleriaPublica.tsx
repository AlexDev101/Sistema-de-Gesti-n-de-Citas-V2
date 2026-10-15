"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { proporcion, repartirColumnas, youtubeId, type GaleriaItem, type GaleriaSeccion } from "@/lib/galeria";

// «Trabajos y Cortes» de la portada: una pestaña por sección, un mosaico de
// dos columnas donde cada foto o vídeo conserva su forma, y al tocar una pieza
// se abre a pantalla completa para pasar de una a otra.

const VISIBLES = 6;

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
                <span className="ml-1.5 opacity-50">{s.items.length}</span>
              </button>
            );
          })}
        </div>
      )}
      {/* key: al cambiar de sección se pliega el «ver todas» */}
      <Mosaico key={seccion.id} items={seccion.items} />
    </div>
  );
}

function Mosaico({ items }: { items: GaleriaItem[] }) {
  const [todas, setTodas] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const origen = useRef<HTMLButtonElement | null>(null);

  const mostradas = todas ? items : items.slice(0, VISIBLES);
  // Cada pieza recuerda su posición en la sección para abrir el visor en ella.
  const indice = new Map(items.map((it, i) => [it.id, i]));
  const columnas = repartirColumnas(mostradas, 2, proporcion);

  const cerrar = useCallback(() => {
    setAbierta(null);
    origen.current?.focus();
  }, []);

  return (
    <>
      {/* items-stretch: las dos columnas acaban a la misma altura; la más corta
          reparte lo que le sobra entre sus piezas (ver flexGrow en Pieza). */}
      <div className="flex items-stretch gap-1.5">
        {columnas.map((col, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-1.5">
            {col.map((item) => (
              <Pieza
                key={item.id}
                item={item}
                onAbrir={(el) => {
                  origen.current = el;
                  setAbierta(indice.get(item.id) ?? 0);
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {items.length > VISIBLES && (
        <button
          type="button"
          onClick={() => setTodas((v) => !v)}
          className="self-center rounded-full px-4 py-2 text-[12px]"
          style={{ color: "var(--color-accent-300)", border: "1px solid var(--color-divider)" }}
        >
          {todas ? "Ver menos" : `Ver las ${items.length}`}
        </button>
      )}

      {/* En <body>: así ningún contenedor de la página recorta el visor. */}
      {abierta !== null && createPortal(<Visor items={items} inicial={abierta} onCerrar={cerrar} />, document.body)}
    </>
  );
}

// ——— Pieza del mosaico ———

function Pieza({ item, onAbrir }: { item: GaleriaItem; onAbrir: (el: HTMLButtonElement) => void }) {
  const yt = item.tipo === "video" ? youtubeId(item.url) : null;
  const etiqueta = item.titulo ?? (item.tipo === "foto" ? "Foto de un trabajo" : "Vídeo de un trabajo");

  return (
    <button
      type="button"
      onClick={(e) => onAbrir(e.currentTarget)}
      aria-label={`Ver ${item.tipo === "foto" ? "foto" : "vídeo"}: ${etiqueta}`}
      className="group relative isolate block w-full overflow-hidden rounded-[12px] focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        aspectRatio: `1 / ${proporcion(item)}`,
        flexGrow: proporcion(item),
        background: "var(--color-surface)",
        outlineColor: "var(--color-accent-300)",
      }}
    >
      {item.tipo === "foto" ? (
        <Image
          src={item.url}
          alt=""
          fill
          sizes="(min-width: 480px) 230px, 50vw"
          className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
        />
      ) : yt ? (
        <Image src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" fill sizes="50vw" className="object-cover" />
      ) : (
        <VideoVivo url={item.url} />
      )}

      {item.tipo === "video" && (
        <span
          aria-hidden
          className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur"
          style={{ background: "color-mix(in srgb, black 45%, transparent)" }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="#fff">
            <path d="M0 0v12l10-6z" />
          </svg>
        </span>
      )}

      {item.titulo && (
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-2.5 pt-6 pb-2 text-left text-[11px]"
          style={{
            background: "linear-gradient(transparent, color-mix(in srgb, black 60%, transparent))",
            color: "#fff",
            paddingRight: item.tipo === "video" ? "2.75rem" : undefined,
          }}
        >
          {item.titulo}
        </span>
      )}
    </button>
  );
}

// Los vídeos subidos se ven en movimiento (sin sonido) mientras están en
// pantalla; fuera de ella se paran para no gastar batería ni datos.
function VideoVivo({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.5 },
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={`${url}#t=0.1`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      tabIndex={-1}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

// ——— Visor a pantalla completa ———

function Visor({ items, inicial, onCerrar }: { items: GaleriaItem[]; inicial: number; onCerrar: () => void }) {
  const [activo, setActivo] = useState(inicial);
  const pista = useRef<HTMLDivElement>(null);
  const cerrarBtn = useRef<HTMLButtonElement>(null);

  // Empieza en la pieza tocada, sin animación.
  useLayoutEffect(() => {
    const p = pista.current;
    if (p) p.scrollLeft = inicial * p.clientWidth;
  }, [inicial]);

  // Bloquea el scroll de la página y lleva el foco al visor.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarBtn.current?.focus();
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  const irA = useCallback(
    (i: number) => {
      const p = pista.current;
      if (!p) return;
      const destino = Math.max(0, Math.min(items.length - 1, i));
      const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      p.scrollTo({ left: destino * p.clientWidth, behavior: reducido ? "auto" : "smooth" });
    },
    [items.length],
  );

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      else if (e.key === "ArrowRight") irA(activo + 1);
      else if (e.key === "ArrowLeft") irA(activo - 1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [activo, irA, onCerrar]);

  const item = items[activo];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galería de trabajos"
      className="fixed inset-0 z-50 flex flex-col motion-safe:animate-[fgFade_180ms_ease-out]"
      style={{ background: "color-mix(in srgb, black 94%, transparent)", color: "#fff" }}
    >
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <span className="text-[13px] tabular-nums opacity-70" aria-live="polite">
          {activo + 1} de {items.length}
        </span>
        <button
          ref={cerrarBtn}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-2"
          style={{ background: "color-mix(in srgb, white 12%, transparent)", outlineColor: "#fff" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1 1l12 12M13 1 1 13" />
          </svg>
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={pista}
          onScroll={(e) => {
            const p = e.currentTarget;
            const i = Math.round(p.scrollLeft / p.clientWidth);
            if (i !== activo && i >= 0 && i < items.length) setActivo(i);
          }}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain"
        >
          {items.map((it, i) => (
            <div key={it.id} className="relative h-full w-full shrink-0 snap-center snap-always">
              <MedioGrande item={it} activo={i === activo} cerca={Math.abs(i - activo) <= 1} />
            </div>
          ))}
        </div>

        {activo > 0 && <Flecha dir={-1} onClick={() => irA(activo - 1)} />}
        {activo < items.length - 1 && <Flecha dir={1} onClick={() => irA(activo + 1)} />}
      </div>

      <p className="m-0 min-h-[3.25rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] text-center text-[14px]">
        {item?.titulo ?? ""}
      </p>
    </div>
  );
}

function Flecha({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === 1 ? "Siguiente" : "Anterior"}
      onClick={onClick}
      className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full sm:flex ${
        dir === 1 ? "right-4" : "left-4"
      }`}
      style={{ background: "color-mix(in srgb, white 12%, transparent)" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d={dir === 1 ? "M6 3l5 5-5 5" : "M10 3 5 8l5 5"} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function MedioGrande({ item, activo, cerca }: { item: GaleriaItem; activo: boolean; cerca: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const alt = item.titulo ?? (item.tipo === "foto" ? "Foto de un trabajo" : "Vídeo de un trabajo");

  // Al pasar a otra pieza, el vídeo que se deja atrás se para.
  useEffect(() => {
    if (!activo) ref.current?.pause();
  }, [activo]);

  if (!cerca) return null;

  if (item.tipo === "foto") {
    return <Image src={item.url} alt={alt} fill sizes="100vw" className="object-contain" priority={activo} />;
  }
  const yt = youtubeId(item.url);
  if (yt) {
    // El reproductor de YouTube sólo se carga en la pieza visible. Dominio sin cookies (RGPD).
    return activo ? (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${yt}?playsinline=1&rel=0&autoplay=1`}
        title={alt}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    ) : (
      <Image src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt={alt} fill sizes="100vw" className="object-contain" />
    );
  }
  return (
    <video
      ref={ref}
      src={item.url}
      controls
      playsInline
      autoPlay={activo}
      preload="metadata"
      aria-label={alt}
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}
