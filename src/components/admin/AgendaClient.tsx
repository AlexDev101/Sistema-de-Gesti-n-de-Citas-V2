"use client";

import { useEffect, useMemo, useState } from "react";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";
import {
  getReservasRango,
  reprogramarReserva,
  type ReservaAgenda,
} from "@/lib/actions/admin-agenda";
import { obtenerOcupacionMes } from "@/lib/actions/disponibilidad";
import {
  APERTURA_MIN,
  CIERRE_MIN,
  ROW_MIN,
  construirInicioMadrid,
  diasDeLaSemana,
  filasDia,
  minutosDelDia,
  rangoDia,
  rangoMes,
  rangoSemana,
} from "@/lib/agenda-grid";
import { hoyMadridISO } from "@/lib/wizard-helpers";
import { bucket, ESTADO_COLOR } from "@/lib/ocupacion";
import { eur } from "@/lib/format";
import { PanelReserva } from "@/components/admin/PanelReserva";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NuevaCitaButton } from "@/components/admin/NuevaCitaButton";
import { useRealtimeDia } from "@/lib/useRealtimeDia";

const ROW_HEIGHT = 28;
type Vista = "dia" | "semana" | "mes";

export function AgendaClient() {
  const hoy = hoyMadridISO();
  const [vista, setVista] = useState<Vista>("dia");
  const [fecha, setFecha] = useState(hoy);
  const [reservas, setReservas] = useState<ReservaAgenda[]>([]);
  const [ocupacionMes, setOcupacionMes] = useState<Map<string, { ocupados: number; cap: number }>>(new Map());
  const [seleccionada, setSeleccionada] = useState<ReservaAgenda | null>(null);
  const [cargando, setCargando] = useState(true);
  const { aviso, avisar } = useAviso();

  const [anioMes, mesMes] = useMemo(() => {
    const [a, m] = fecha.split("-").map(Number);
    return [a, m];
  }, [fecha]);

  // Una cita cancelada o "No asistido" desaparece de la agenda visible —
  // sigue en el historial del cliente (getReservasCliente no filtra por
  // estado), solo deja de ocupar hueco en el calendario del día a día.
  const activas = (rs: ReservaAgenda[]) => rs.filter((r) => r.estado !== "cancelada" && r.estado !== "no_show");

  async function recargar() {
    setCargando(true);
    if (vista === "dia") {
      const { desde, hasta } = rangoDia(fecha);
      setReservas(activas(await getReservasRango(desde, hasta)));
    } else if (vista === "semana") {
      const { desde, hasta } = rangoSemana(fecha);
      setReservas(activas(await getReservasRango(desde, hasta)));
    } else {
      const { desde, hasta } = rangoMes(anioMes, mesMes);
      const [rows, filas] = await Promise.all([
        obtenerOcupacionMes(anioMes, mesMes),
        getReservasRango(desde, hasta),
      ]);
      setOcupacionMes(new Map(rows.map((r) => [r.fecha, { ocupados: r.ocupados, cap: r.cap }])));
      setReservas(activas(filas));
    }
    setCargando(false);
  }

  useEffect(() => {
    // Fetch-on-param-change: recargar() sets the loading flag before its
    // first await, which the stricter purity rule flags — standard
    // data-fetching-effect shape, not a render-time side effect. recargar
    // is intentionally omitted from deps (it's redefined every render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, fecha]);

  useRealtimeDia(vista === "dia" ? fecha : null, recargar);

  async function onDrop(nuevoMin: number) {
    const id = dragId;
    if (!id) return;
    const r = reservas.find((x) => x.id === id);
    if (!r) return;
    const duracion = r.servicios.reduce((a, s) => a + s.duracion_min, 0);
    if (nuevoMin < APERTURA_MIN || nuevoMin + duracion > CIERRE_MIN) {
      avisar("Fuera de horario — la cita vuelve a su sitio", true);
      return;
    }
    const res = await reprogramarReserva(id, construirInicioMadrid(fecha, nuevoMin), duracion);
    if (!res.ok) {
      avisar(res.error, true);
      return;
    }
    avisar("Cita movida");
    recargar();
  }

  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div>
      <AdminPageHeader
        title="Agenda"
        subtitle={vista === "dia" ? fecha : undefined}
        actions={
          <>
            <div className="flex gap-1.5">
              {(["dia", "semana", "mes"] as Vista[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className="rounded-lg px-3 py-1.5 text-xs capitalize"
                  style={{
                    background: vista === v ? "color-mix(in srgb, var(--color-accent) 14%, transparent)" : "transparent",
                    border: `1px solid ${vista === v ? "var(--color-accent)" : "var(--color-divider)"}`,
                    color: vista === v ? "var(--color-accent-300)" : "var(--color-text)",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <NuevaCitaButton onCreada={recargar} />
          </>
        }
      />

      <div className="flex gap-5">
        <div className="min-w-0 flex-1">
          {vista === "dia" && (
            <div className="flex flex-col gap-3">
              <NavFecha fecha={fecha} onChange={setFecha} paso="dia" />
              <div
                className="flex overflow-hidden rounded-[var(--radius-md)] border"
                style={{ borderColor: "color-mix(in srgb, var(--color-text) 9%, transparent)" }}
              >
                <div className="w-[60px] flex-none border-r" style={{ borderColor: "color-mix(in srgb, var(--color-text) 9%, transparent)" }}>
                  <div className="h-[42px] border-b" style={{ borderColor: "color-mix(in srgb, var(--color-text) 9%, transparent)" }} />
                  {filasDia().map((f) => (
                    <div key={f.min} className="px-2 text-right text-[10px]" style={{ height: ROW_HEIGHT, color: "color-mix(in srgb, var(--color-text) 38%, transparent)" }}>
                      {f.min % 60 === 0 ? f.label : ""}
                    </div>
                  ))}
                </div>
                <div className="relative flex-1">
                  <div className="flex h-[42px] items-center gap-2 border-b px-2.5 text-xs" style={{ borderColor: "color-mix(in srgb, var(--color-text) 9%, transparent)" }}>
                    Francíso
                    <span className="ml-auto text-[10px]" style={{ color: "color-mix(in srgb, var(--color-text) 40%, transparent)" }}>
                      Arrastra una cita a un hueco libre para moverla
                    </span>
                  </div>
                  <div className="relative">
                    {filasDia().map((f) => (
                      <div
                        key={f.min}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDrop(f.min)}
                        style={{
                          height: ROW_HEIGHT,
                          borderBottom: "1px dashed color-mix(in srgb, var(--color-text) 6%, transparent)",
                          background: f.pausa ? "color-mix(in srgb, var(--color-text) 4%, transparent)" : "transparent",
                        }}
                      />
                    ))}
                    {reservas.map((r) => {
                      const inicio = minutosDelDia(r.inicio);
                      const duracion = r.servicios.reduce((a, s) => a + s.duracion_min, 0);
                      const top = ((inicio - APERTURA_MIN) / ROW_MIN) * ROW_HEIGHT;
                      const height = (duracion / ROW_MIN) * ROW_HEIGHT;
                      const color = ESTADO_COLOR[r.estado] ?? "var(--color-accent-400)";
                      return (
                        <div
                          key={r.id}
                          draggable
                          onDragStart={() => setDragId(r.id)}
                          onDragEnd={() => setDragId(null)}
                          onClick={() => setSeleccionada(r)}
                          className="absolute inset-x-[3px] cursor-grab overflow-hidden rounded-md px-2 py-1"
                          style={{
                            top,
                            height: Math.max(height, ROW_HEIGHT - 2),
                            background: "color-mix(in srgb, var(--color-accent) 16%, transparent)",
                            borderLeft: `2px solid ${color}`,
                          }}
                        >
                          <div className="truncate text-[11px] leading-tight">{r.servicios.map((s) => s.nombre).join(", ")}</div>
                          <div className="truncate text-[10px] leading-tight" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                            {new Date(r.inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })} · {r.cliente?.nombre}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {vista === "semana" && (
            <div className="flex flex-col gap-3">
              <NavFecha fecha={fecha} onChange={setFecha} paso="semana" />
              <div className="flex flex-col gap-2">
                {diasDeLaSemana(rangoSemana(fecha).lunes).map((d) => {
                  const delDia = reservas.filter((r) => r.inicio.slice(0, 10) === d || new Date(r.inicio).toISOString().slice(0, 10) === d);
                  const ingresos = delDia.reduce((a, r) => a + r.precio_total_cents, 0);
                  return (
                    <button
                      key={d}
                      onClick={() => { setFecha(d); setVista("dia"); }}
                      className="flex items-center justify-between rounded-lg px-3.5 py-3 text-left"
                      style={{ background: "var(--color-surface)" }}
                    >
                      <span className="text-sm">{d}</span>
                      <span className="flex items-center gap-3 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        {delDia.length} citas · {eur(ingresos)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {vista === "mes" && (
            <div className="flex flex-col gap-3">
              <NavFecha fecha={fecha} onChange={setFecha} paso="mes" />
              <div className="grid grid-cols-7 gap-1.5" style={{ minWidth: 760 }}>
                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                  <span key={d} className="text-[10px] tracking-[0.08em] uppercase" style={{ color: "color-mix(in srgb, var(--color-text) 38%, transparent)" }}>{d}</span>
                ))}
                {Array.from(ocupacionMes.entries()).map(([fISO, info]) => {
                  const delDia = reservas.filter((r) => r.inicio.slice(0, 10) === fISO);
                  const ingresos = delDia.reduce((a, r) => a + r.precio_total_cents, 0);
                  const b = bucket(info.ocupados, info.cap);
                  return (
                    <div
                      key={fISO}
                      className="flex min-h-[92px] flex-col gap-1.5 rounded-lg border p-2"
                      style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)", background: info.cap ? "transparent" : "color-mix(in srgb, var(--color-text) 3%, transparent)" }}
                    >
                      <span className="text-xs">{Number(fISO.slice(8, 10))}</span>
                      {delDia.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="tag" style={{ background: b.bg, color: b.line, width: "fit-content" }}>{delDia.length}</span>
                          <span className="text-[10px]" style={{ color: "color-mix(in srgb, var(--color-text) 42%, transparent)" }}>{eur(ingresos)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cargando && <p className="mt-3 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>Cargando…</p>}
        </div>

        {seleccionada && (
          <PanelReserva
            key={seleccionada.id}
            reserva={seleccionada}
            onClose={() => setSeleccionada(null)}
            onChanged={() => { recargar(); setSeleccionada(null); }}
          />
        )}
      </div>

      <AvisoHost aviso={aviso} />
    </div>
  );
}

function NavFecha({ fecha, onChange, paso }: { fecha: string; onChange: (f: string) => void; paso: "dia" | "semana" | "mes" }) {
  function mover(dir: 1 | -1) {
    const d = new Date(fecha + "T00:00:00Z");
    if (paso === "dia") d.setUTCDate(d.getUTCDate() + dir);
    else if (paso === "semana") d.setUTCDate(d.getUTCDate() + dir * 7);
    else d.setUTCMonth(d.getUTCMonth() + dir);
    onChange(d.toISOString().slice(0, 10));
  }
  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-icon btn-secondary" onClick={() => mover(-1)} aria-label="Anterior"><CaretLeft size={14} /></button>
      <button className="btn btn-icon btn-secondary" onClick={() => mover(1)} aria-label="Siguiente"><CaretRight size={14} /></button>
      <button className="btn btn-secondary" onClick={() => onChange(hoyMadridISO())}>Hoy</button>
    </div>
  );
}
