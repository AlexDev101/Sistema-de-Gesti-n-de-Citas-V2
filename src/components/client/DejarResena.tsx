"use client";

import { useState, useTransition } from "react";
import { Star } from "@phosphor-icons/react/ssr";
import { dejarResena } from "@/lib/actions/reservas";

export function DejarResena({ token, yaValorada }: { token: string; yaValorada: boolean }) {
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  if (enviada || yaValorada) {
    return (
      <p className="m-0 text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
        Gracias por tu opinión.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="m-0 text-sm" style={{ fontFamily: "var(--font-heading)" }}>
        ¿Qué tal la cita?
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            className="btn-icon"
            style={{ background: "transparent", border: "none", padding: 2, cursor: "pointer" }}
            onClick={() => setEstrellas(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              size={26}
              weight={n <= (hover || estrellas) ? "fill" : "regular"}
              color={n <= (hover || estrellas) ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 35%, transparent)"}
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
            style={{ minHeight: 64 }}
          />
          <button
            className="btn btn-secondary"
            disabled={enviando}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await dejarResena(token, estrellas, comentario);
                if (!res.ok) { setError(res.error); return; }
                setEnviada(true);
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
