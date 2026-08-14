"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";
import { durTxt } from "@/lib/format";
import { obtenerOcupacionMes, obtenerSlots } from "@/lib/actions/disponibilidad";
import { bucket, LEYENDA_OCUPACION } from "@/lib/ocupacion";
import { diasDelMes, esManana, fechaISO, hoyMadridISO, MESES, offsetPrimerDia } from "@/lib/wizard-helpers";

const DOW_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export type SelectorFechaHoraHandle = { refrescar: () => void };

// Calendario mensual con ocupación (igual que el paso 2 del asistente de
// reserva) + rejilla de huecos del día elegido. Compartido entre el
// asistente público y "Nueva cita" del admin para que ambos vean lo mismo:
// qué días tienen hueco, cuántas citas hay, y las horas libres al elegir uno.
export const SelectorFechaHora = forwardRef<
  SelectorFechaHoraHandle,
  {
    duracionMin: number;
    fecha: string | null;
    onFecha: (f: string | null) => void;
    hora: string | null;
    onHora: (h: string | null) => void;
    onSlotsChange?: (slots: string[] | null) => void;
  }
>(function SelectorFechaHora({ duracionMin, fecha, onFecha, hora, onHora, onSlotsChange }, ref) {
  const hoy = hoyMadridISO();
  const [hoyAnio, hoyMes] = useMemo(() => hoy.split("-").map(Number), [hoy]);
  const [anio, setAnio] = useState(hoyAnio);
  const [mes, setMes] = useState(hoyMes);
  const [ocupacion, setOcupacion] = useState<Map<string, { ocupados: number; cap: number }>>(new Map());
  const [slots, setSlots] = useState<string[] | null>(null);
  const [cargandoSlots, setCargandoSlots] = useState(false);

  useEffect(() => {
    obtenerOcupacionMes(anio, mes).then((rows) => {
      setOcupacion(new Map(rows.map((r) => [r.fecha, { ocupados: r.ocupados, cap: r.cap }])));
    });
  }, [anio, mes]);

  function cargarSlots() {
    if (!fecha || duracionMin === 0) return;
    obtenerSlots(fecha, duracionMin)
      .then((s) => { setSlots(s); onSlotsChange?.(s); })
      .finally(() => setCargandoSlots(false));
  }

  useImperativeHandle(ref, () => ({ refrescar: cargarSlots }));

  useEffect(() => {
    if (!fecha || duracionMin === 0) { setSlots(null); onSlotsChange?.(null); return; }
    setCargandoSlots(true);
    onHora(null);
    cargarSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, duracionMin]);

  const nDias = diasDelMes(anio, mes);
  const offset = offsetPrimerDia(anio, mes);
  const celdas: { dia: number; iso: string }[] = [];
  for (let d = 1; d <= nDias; d++) celdas.push({ dia: d, iso: fechaISO(anio, mes, d) });

  const slotsManana = (slots ?? []).filter(esManana);
  const slotsTarde = (slots ?? []).filter((s) => !esManana(s));

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex-1 text-[15px] capitalize" style={{ fontFamily: "var(--font-heading)" }}>
            {MESES[mes - 1]} {anio}
          </span>
          <button
            className="btn btn-icon btn-secondary"
            aria-label="Mes anterior"
            disabled={anio === hoyAnio && mes === hoyMes}
            onClick={() => {
              onFecha(null);
              if (mes === 1) { setAnio((a) => a - 1); setMes(12); } else setMes((m) => m - 1);
            }}
          >
            <CaretLeft size={14} />
          </button>
          <button
            className="btn btn-icon btn-secondary"
            aria-label="Mes siguiente"
            onClick={() => {
              onFecha(null);
              if (mes === 12) { setAnio((a) => a + 1); setMes(1); } else setMes((m) => m + 1);
            }}
          >
            <CaretRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DOW_LABELS.map((d) => (
            <span
              key={d}
              className="pb-1 text-center text-[10px] tracking-[0.08em] uppercase"
              style={{ color: "color-mix(in srgb, var(--color-text) 38%, transparent)" }}
            >
              {d}
            </span>
          ))}
          {Array.from({ length: offset }).map((_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {celdas.map((c) => {
            const info = ocupacion.get(c.iso);
            const pasado = c.iso < hoy;
            const b = info ? bucket(info.ocupados, info.cap) : null;
            const cerrado = !info || info.cap === 0;
            const disabled = pasado || cerrado || b?.key === "completo";
            const activo = fecha === c.iso;
            return (
              <button
                key={c.iso}
                disabled={disabled}
                onClick={() => onFecha(c.iso)}
                title={b?.label}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg p-0.5 text-[13px]"
                style={{
                  cursor: disabled ? "default" : "pointer",
                  border: `1px solid ${activo ? "var(--color-accent)" : "transparent"}`,
                  background: activo
                    ? "color-mix(in srgb, var(--color-accent) 16%, transparent)"
                    : "transparent",
                  color: disabled
                    ? "color-mix(in srgb, var(--color-text) 30%, transparent)"
                    : "var(--color-text)",
                  opacity: cerrado ? 0.35 : 1,
                }}
              >
                <span>{c.dia}</span>
                {b && !cerrado && (
                  <span
                    className="block h-[3px] w-[68%] overflow-hidden rounded-sm"
                    style={{ background: "color-mix(in srgb, #0f111c 45%, transparent)" }}
                  >
                    <span
                      className="block h-full"
                      style={{ width: `${info!.cap ? (info!.ocupados / info!.cap) * 100 : 0}%`, background: b.bar }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {LEYENDA_OCUPACION.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-[10px]" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            <span className="h-[9px] w-3.5 rounded-[3px]" style={{ border: `1px solid ${l.line}`, background: l.bg }} />
            {l.label}
          </span>
        ))}
      </div>

      {fecha ? (
        cargandoSlots ? (
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg" style={{ background: "var(--color-surface)" }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {[{ nombre: "Mañana", items: slotsManana }, { nombre: "Tarde", items: slotsTarde }]
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.nombre} className="flex flex-col gap-2">
                  <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>{g.nombre}</h6>
                  <div className="grid grid-cols-4 gap-[7px]">
                    {g.items.map((s) => {
                      const activo = hora === s;
                      return (
                        <button
                          key={s}
                          onClick={() => onHora(s)}
                          className="rounded-lg py-2.5 text-[13px]"
                          style={{
                            border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-divider)"}`,
                            background: activo ? "color-mix(in srgb, var(--color-accent) 16%, transparent)" : "var(--color-surface)",
                            color: "var(--color-text)",
                          }}
                        >
                          {new Date(s).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            {!slotsManana.length && !slotsTarde.length && (
              <div
                className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-dashed px-4.5 py-6.5 text-center"
                style={{ borderColor: "color-mix(in srgb, var(--color-text) 16%, transparent)" }}
              >
                <span className="text-sm">Sin huecos ese día</span>
                <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
                  Prueba otro día del calendario
                </span>
              </div>
            )}
          </div>
        )
      ) : (
        <div
          className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-dashed px-4.5 py-6.5 text-center"
          style={{ borderColor: "color-mix(in srgb, var(--color-text) 16%, transparent)" }}
        >
          <span className="text-sm">Elige un día</span>
          <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
            Los días atenuados no tienen hueco para {durTxt(duracionMin)}
          </span>
        </div>
      )}
    </div>
  );
});
