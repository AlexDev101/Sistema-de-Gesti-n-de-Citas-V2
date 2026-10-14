"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";

// Diálogo accesible común: role="dialog", aria-modal, título asociado,
// Escape para cerrar, foco dentro mientras está abierto y devuelto al botón
// que lo abrió al cerrar. En el móvil se pega abajo como hoja (ver
// .dialog-sheet en nocturne.css).
export function Dialogo({
  titulo,
  onClose,
  children,
  ancho = 440,
  style,
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const nodo = ref.current;
    const enfocables = () =>
      Array.from(
        nodo?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    (enfocables()[1] ?? enfocables()[0] ?? nodo)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = enfocables();
      if (lista.length === 0) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previo?.focus?.();
    };
  }, []);

  return (
    <div className="dialog-backdrop dialog-sheet" onClick={onClose} style={{ animation: "fgFade .18s ease both" }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="dialog"
        style={{ width: ancho, maxHeight: "88dvh", overflow: "auto", ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline gap-2.5">
          <span id={tituloId} className="dialog-title flex-1">
            {titulo}
          </span>
          <button className="btn btn-icon btn-secondary" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
