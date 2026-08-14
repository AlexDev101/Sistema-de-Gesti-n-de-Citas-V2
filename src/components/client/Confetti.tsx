"use client";

import { useState } from "react";

const COLORES = ["var(--color-accent)", "var(--color-accent-400)", "var(--color-accent-2-500)", "var(--color-neutral-400)"];

export function Confetti() {
  const [piezas] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      left: Math.round((i / 14) * 90 + Math.random() * 8),
      color: COLORES[i % COLORES.length],
      dur: 1.6 + Math.random() * 1.2,
      delay: Math.random() * 0.4,
    }))
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {piezas.map((c, i) => (
        <span
          key={i}
          className="absolute top-10 h-3 w-[5px] rounded-sm"
          style={{
            left: `${c.left}%`,
            background: c.color,
            animation: `fgFall ${c.dur}s ease-in ${c.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}
