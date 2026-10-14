"use client";

import { useEffect, useMemo, useState } from "react";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";
import { getReservasRango, reprogramarReserva, type ReservaAgenda } from "@/lib/actions/admin-agenda";
import { obtenerOcupacionMes } from "@/lib/actions/disponibilidad";
import {
  construirInicioMadrid,
  diasDeLaSemana,
  fechaMadrid,
  minutosDelDia,
  rangoDia,
  rangoMes,
  rangoSemana,
} from "@/lib/agenda-grid";
import {
  cierreDelDia,
  dentroDeHorario,
  diaSemana,
  filasRejilla,
  franjasDelDia,
  PASO_MIN,
  type Cierre,
  type FilaHorario,
} from "@/lib/horario";
import { hoyMadridISO, offsetPrimerDia } from "@/lib/wizard-helpers";
import { bucket, ESTADO_COLOR } from "@/lib/ocupacion";
import { eur, fechaLarga, hhmm } from "@/lib/format";
import { PanelReserva } from "@/components/admin/PanelReserva";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NuevaCitaButton } from "@/components/admin/NuevaCitaButton";
import { useRealtimeDia } from "@/lib/useRealtimeDia";

const ROW_HEIGHT = 28;
type Vista = "dia" | "semana" | "mes";

const mutedColor = (pct: number) => `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`;

export function AgendaClient({
  nombreBarbero,
  horario,
  cierres,
}: {
  nombreBarbero: string;
  horario: FilaHorario[];
  cierres: Cierre[];
}) {
  const hoy = hoyMadridISO();
  const [vista, setVista] = useState<Vista>("dia");
  const [fecha, setFecha] = useState(hoy);
  const [reservas, setReservas] = useState<ReservaAgenda[]>([]);
  const [ocupacionMes, setOcupacionMes] = useState<Map<string, { ocupados: number; cap: number }>>(new Map());
  const [seleccionada, setSeleccionada] = useState<ReservaAgenda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const { aviso, avisar, cerrar } = useAviso();

  const [anioMes, mesMes] = useMemo(() => fecha.split("-").map(Number), [fecha]);

  // Una cita cancelada o "No asistido" desaparece de la agenda visible —
  // sigue en el historial del cliente (getReservasCliente no filtra por
  // estado), solo deja de ocupar hueco en el calendario del día a día.
  const activas = (rs: ReservaAgenda[]) => rs.filter((r) => r.estado !== "cancelada" && r.estado !== "no_show");

  async function recargar() {
    setCargando(true);
    try {
      if (vista === "dia") {
        const { desde, hasta } = rangoDia(fecha);
        setReservas(activas(await getReservasRango(desde, hasta)));
      } else if (vista === "semana") {
        const { desde, hasta } = rangoSemana(fecha);
        setReservas(activas(await getReservasRango(desde, hasta)));
      } else {
        const { desde, hasta } = rangoMes(anioMes, mesMes);
        const [rows, filas] = await Promise.all([
          obtenerOcupacionMes(anioMes, mesMes, false),
          getReservasRango(desde, hasta),
        ]);
        setOcupacionMes(new Map(rows.map((r) => [r.fecha, { ocupados: r.ocupados, cap: r.cap }])));
        setReservas(activas(filas));
      }
    } catch {
      avisar("No se pudo cargar la agenda. Comprueba la conexión.", true);
    }
    setCargando(false);
  }

  useEffect(() => {
    // Fetch-on-param-change: recargar() marca "cargando" antes de su primer
    // await; es la forma normal de un efecto de carga, no un efecto en render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, fecha]);

  useRealtimeDia(vista === "dia" ? fecha : null, recargar);

  // ── vista día ──
  const franjas = franjasDelDia(horario, diaSemana(fecha));
  const cierre = cierreDelDia(cierres, fecha);
  const tramosCitas = reservas.map((r) => {
    const inicio = minutosDelDia(r.inicio);
    return { inicio, fin: inicio + r.servicios.reduce((a, s) => a + s.duracion_min, 0) };
  });
  const filas = filasRejilla(cierre ? [] : franjas, tramosCitas);
  const primeraFila = filas[0]?.min ?? 0;

  async function onDrop(nuevoMin: number) {
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const r = reservas.find((x) => x.id === id);
    if (!r) return;
    const duracion = r.servicios.reduce((a, s) => a + s.duracion_min, 0);
    if (cierre || !dentroDeHorario(franjas, nuevoMin, nuevoMin + duracion)) {
      avisar("Fuera de horario — la cita vuelve a su sitio", true);
      return;
    }
    const nuevoInicio = construirInicioMadrid(fecha, nuevoMin);
    if (nuevoInicio === r.inicio) return;
    const res = await reprogramarReserva(id, nuevoInicio, duracion, true);
    if (!res.ok) {
      avisar(res.error, true);
      return;
    }
    avisar(r.email ? "Cita movida. Avisamos al cliente por email." : "Cita movida. El cliente no tiene email: avísale tú.", false, {
      label: "Deshacer",
      onClick: async () => {
        const back = await reprogramarReserva(id, r.inicio, duracion, true);
        if (!back.ok) avisar(back.error, true);
        recargar();
      },
    });
    recargar();
  }

  return (
    <div>
      <AdminPageHeader
        title="Agenda"
        subtitle={vista === "dia" ? fechaLarga(fecha + "T12:00:00Z") : undefined}
        actions={
          <>
            <div className="flex gap-1.5" role="tablist" aria-label="Vista">
              {(["dia", "semana", "mes"] as Vista[]).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={vista === v}
                  onClick={() => setVista(v)}
                  className="rounded-lg px-3 py-1.5 text-xs capitalize"
                  style={{
                    background: vista === v ? "color-mix(in srgb, var(--color-accent) 14%, transparent)" : "transparent",
                    border: `1px solid ${vista === v ? "var(--color-accent)" : "var(--color-divider)"}`,
                    color: vista === v ? "var(--color-accent-300)" : "var(--color-text)",
                    minHeight: 34,
                  }}
                >
                  {v === "dia" ? "día" : v}
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
              {cierre && (
                <div
                  className="rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px]"
                  style={{ background: "color-mix(in srgb, var(--color-state-alta) 14%, transparent)" }}
                >
                  Cerrado{cierre.motivo ? `: ${cierre.motivo}` : ""}. La web no ofrece huecos este día.
                </div>
              )}
              {filas.length === 0 ? (
                <p className="text-sm" style={{ color: mutedColor(60) }}>
                  {cierre ? "Sin citas." : "Este día no hay horario de apertura. Puedes cambiarlo en Horario."}
                </p>
              ) : (
                <div className="flex overflow-hidden rounded-[var(--radius-md)] border" style={{ borderColor: mutedColor(9) }}>
                  <div className="w-[52px] flex-none border-r sm:w-[60px]" style={{ borderColor: mutedColor(9) }}>
                    <div className="h-[42px] border-b" style={{ borderColor: mutedColor(9) }} />
                    {filas.map((f) => (
                      <div key={f.min} className="px-2 text-right text-[10px]" style={{ height: ROW_HEIGHT, color: mutedColor(50) }}>
                        {f.min % 60 === 0 ? f.label : ""}
                      </div>
                    ))}
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <div className="flex h-[42px] items-center gap-2 border-b px-2.5 text-xs" style={{ borderColor: mutedColor(9) }}>
                      {nombreBarbero}
                      <span className="ml-auto hidden text-[10px] md:inline" style={{ color: mutedColor(50) }}>
                        Arrastra una cita para moverla, o tócala para ver opciones
                      </span>
                    </div>
                    <div className="relative">
                      {filas.map((f) => (
                        <div
                          key={f.min}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onDrop(f.min)}
                          style={{
                            height: ROW_HEIGHT,
                            borderBottom: `1px dashed ${mutedColor(6)}`,
                            background: f.cerrado ? mutedColor(5) : "transparent",
                          }}
                        />
                      ))}
                      {reservas.map((r, i) => {
                        const { inicio, fin } = tramosCitas[i];
                        const top = ((inicio - primeraFila) / PASO_MIN) * ROW_HEIGHT;
                        const height = ((fin - inicio) / PASO_MIN) * ROW_HEIGHT;
                        const color = ESTADO_COLOR[r.estado] ?? "var(--color-accent-400)";
                        return (
                          <button
                            key={r.id}
                            draggable
                            onDragStart={() => setDragId(r.id)}
                            onDragEnd={() => setDragId(null)}
                            onClick={() => setSeleccionada(r)}
                            className="absolute inset-x-[3px] cursor-pointer overflow-hidden rounded-md px-2 py-1 text-left md:cursor-grab"
                            style={{
                              top,
                              height: Math.max(height, ROW_HEIGHT - 2),
                              background: "color-mix(in srgb, var(--color-accent) 16%, transparent)",
                              borderLeft: `2px solid ${color}`,
                              outline: seleccionada?.id === r.id ? "1px solid var(--color-accent)" : undefined,
                            }}
                          >
                            <div className="truncate text-[11px] leading-tight">{r.servicios.map((s) => s.nombre).join(", ")}</div>
                            <div className="truncate text-[10px] leading-tight" style={{ color: mutedColor(65) }}>
                              {hhmm(r.inicio)} · {r.cliente?.nombre}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {vista === "semana" && (
            <div className="flex flex-col gap-3">
              <NavFecha fecha={fecha} onChange={setFecha} paso="semana" />
              <div className="flex flex-col gap-2">
                {diasDeLaSemana(rangoSemana(fecha).lunes).map((d) => {
                  const delDia = reservas.filter((r) => fechaMadrid(r.inicio) === d);
                  const ingresos = delDia.reduce((a, r) => a + r.precio_total_cents, 0);
                  const c = cierreDelDia(cierres, d);
                  const abierto = franjasDelDia(horario, diaSemana(d)).length > 0;
                  return (
                    <button
                      key={d}
                      onClick={() => { setFecha(d); setVista("dia"); }}
                      className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-3 text-left"
                      style={{ background: "var(--color-surface)", outline: d === hoy ? "1px solid var(--color-accent)" : undefined }}
                    >
                      <span className="text-sm capitalize">{fechaLarga(d + "T12:00:00Z")}</span>
                      <span className="flex items-center gap-3 text-xs" style={{ color: mutedColor(65) }}>
                        {c ? `Cerrado${c.motivo ? ` · ${c.motivo}` : ""}` : !abierto ? "Sin horario" : null}
                        {delDia.length > 0 || (!c && abierto) ? ` ${delDia.length} citas · ${eur(ingresos)}` : ""}
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
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                  <span key={d} className="text-center text-[10px] tracking-[0.08em] uppercase sm:text-left" style={{ color: mutedColor(50) }}>{d}</span>
                ))}
                {Array.from({ length: offsetPrimerDia(anioMes, mesMes) }).map((_, i) => (
                  <span key={`pad-${i}`} />
                ))}
                {Array.from(ocupacionMes.entries()).map(([fISO, info]) => {
                  const delDia = reservas.filter((r) => fechaMadrid(r.inicio) === fISO);
                  const ingresos = delDia.reduce((a, r) => a + r.precio_total_cents, 0);
                  const b = bucket(info.ocupados, info.cap);
                  const c = cierreDelDia(cierres, fISO);
                  return (
                    <button
                      key={fISO}
                      onClick={() => { setFecha(fISO); setVista("dia"); }}
                      title={c ? `Cerrado${c.motivo ? `: ${c.motivo}` : ""}` : b.label}
                      className="flex min-h-[56px] flex-col gap-1 rounded-lg border p-1.5 text-left sm:min-h-[92px] sm:gap-1.5 sm:p-2"
                      style={{
                        borderColor: fISO === hoy ? "var(--color-accent)" : mutedColor(8),
                        background: info.cap && !c ? "transparent" : mutedColor(4),
                      }}
                    >
                      <span className="text-xs">{Number(fISO.slice(8, 10))}</span>
                      {c && <span className="text-[9px] uppercase" style={{ color: "var(--color-state-alta)" }}>Cerrado</span>}
                      {delDia.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="tag" style={{ background: b.bg, color: b.line, width: "fit-content", padding: "1px 6px" }}>{delDia.length}</span>
                          <span className="hidden text-[10px] sm:inline" style={{ color: mutedColor(55) }}>{eur(ingresos)}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {cargando && <p className="mt-3 text-xs" style={{ color: mutedColor(55) }}>Cargando…</p>}
        </div>

        {seleccionada && (
          <PanelReserva
            key={seleccionada.id}
            reserva={seleccionada}
            onClose={() => setSeleccionada(null)}
            onChanged={() => { recargar(); setSeleccionada(null); }}
            avisar={avisar}
          />
        )}
      </div>

      <AvisoHost aviso={aviso} onCerrar={cerrar} />
    </div>
  );
}

function NavFecha({ fecha, onChange, paso }: { fecha: string; onChange: (f: string) => void; paso: "dia" | "semana" | "mes" }) {
  function mover(dir: 1 | -1) {
    const d = new Date(fecha + "T00:00:00Z");
    if (paso === "dia") d.setUTCDate(d.getUTCDate() + dir);
    else if (paso === "semana") d.setUTCDate(d.getUTCDate() + dir * 7);
    else {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + dir);
    }
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
