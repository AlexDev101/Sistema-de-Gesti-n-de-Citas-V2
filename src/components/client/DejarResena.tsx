"use client";

import { useState, useTransition } from "react";
import { ChatCircle, Star } from "@phosphor-icons/react/ssr";
import { dejarResena } from "@/lib/actions/reservas";

type Resena = { estrellas: number; comentario: string | null };

export function DejarResena({ token, resenaExistente }: { token: string; resenaExistente: Resena | null }) {
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviada, setEnviada] = useState<Resena | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const resena = enviada ?? resenaExistente;

  if (resena) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-5 text-center"
        style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={20}
              weight={n <= resena.estrellas ? "fill" : "regular"}
              color={n <= resena.estrellas ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 22%, transparent)"}
            />
          ))}
        </div>
        <p className="m-0 text-sm" style={{ fontFamily: "var(--font-heading)" }}>
          Gracias por tu valoración
        </p>
        {resena.comentario && (
          <p className="m-0 text-xs leading-relaxed" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
            &ldquo;{resena.comentario}&rdquo;
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] p-5"
      style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center gap-2">
        <ChatCircle size={18} weight="fill" color="var(--color-accent)" />
        <span className="text-sm" style={{ fontFamily: "var(--font-heading)" }}>¿Qué tal la cita?</span>
      </div>
      <div className="flex justify-center gap-2 py-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", lineHeight: 0 }}
            onClick={() => setEstrellas(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              size={32}
              weight={n <= (hover || estrellas) ? "fill" : "regular"}
              color={n <= (hover || estrellas) ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 28%, transparent)"}
            />
          </button>
        ))}
      </div>
      {estrellas > 0 && (
        <>
          <textarea
            className="input"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Cuéntanos algo más (opcional)"
            style={{ minHeight: 64, animation: "fgIn .2s ease both" }}
          />
          <button
            className="btn btn-primary"
            disabled={enviando}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await dejarResena(token, estrellas, comentario);
                if (!res.ok) { setError(res.error); return; }
                setEnviada({ estrellas, comentario: comentario.trim() || null });
              })
            }
          >
            {enviando ? "Enviando…" : "Enviar valoración"}
          </button>
        </>
      )}
      {error && <p className="m-0 text-xs" style={{ color: "var(--color-state-alta)" }}>{error}</p>}
    </div>
  );
}
