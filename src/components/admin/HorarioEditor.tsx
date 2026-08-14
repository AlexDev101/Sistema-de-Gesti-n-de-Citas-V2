"use client";

import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/database.types";
import { actualizarFranja, crearFranja, eliminarFranja } from "@/lib/actions/admin-horario";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDEN_VISUAL = [1, 2, 3, 4, 5, 6, 0];

export function HorarioEditor({ franjas }: { franjas: Tables<"horario_barbero">[] }) {
  const router = useRouter();

  return (
    <div className="grid max-w-[900px] grid-cols-2 gap-3.5 sm:grid-cols-3">
      {ORDEN_VISUAL.map((dia) => {
        const delDia = franjas.filter((f) => f.dia_semana === dia).sort((a, b) => a.abre.localeCompare(b.abre));
        return (
          <div key={dia} className="flex flex-col gap-2 rounded-[var(--radius-md)] p-3" style={{ background: "var(--color-surface)" }}>
            <span className="text-xs" style={{ fontFamily: "var(--font-heading)" }}>{DIAS[dia]}</span>
            {delDia.length === 0 && (
              <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 42%, transparent)" }}>Cerrado</span>
            )}
            {delDia.map((f) => (
              <div key={f.id} className="flex items-center gap-1.5">
                <input
                  type="time"
                  defaultValue={f.abre.slice(0, 5)}
                  className="input"
                  style={{ minHeight: 30, fontSize: 12, padding: "4px 6px" }}
                  onBlur={(e) => actualizarFranja(f.id, e.target.value, f.cierra.slice(0, 5)).then(() => router.refresh())}
                />
                <span className="text-[10px]" style={{ color: "color-mix(in srgb, var(--color-text) 40%, transparent)" }}>–</span>
                <input
                  type="time"
                  defaultValue={f.cierra.slice(0, 5)}
                  className="input"
                  style={{ minHeight: 30, fontSize: 12, padding: "4px 6px" }}
                  onBlur={(e) => actualizarFranja(f.id, f.abre.slice(0, 5), e.target.value).then(() => router.refresh())}
                />
                <button className="btn btn-icon btn-ghost" style={{ width: 26, height: 26 }} aria-label="Eliminar franja" onClick={() => eliminarFranja(f.id).then(() => router.refresh())}>
                  ✕
                </button>
              </div>
            ))}
            <button className="btn btn-ghost self-start" style={{ fontSize: 11 }} onClick={() => crearFranja(dia).then(() => router.refresh())}>
              + Añadir franja
            </button>
          </div>
        );
      })}
    </div>
  );
}
