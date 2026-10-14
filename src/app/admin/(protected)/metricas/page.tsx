import { Star } from "@phosphor-icons/react/ssr";
import { getReservasRango } from "@/lib/actions/admin-agenda";
import { obtenerOcupacionMes } from "@/lib/actions/disponibilidad";
import { getResenasRecientes } from "@/lib/actions/admin-resenas";
import { getBarbero } from "@/lib/data/negocio";
import { fechaMadrid, rangoDia, sumarDias } from "@/lib/agenda-grid";
import { hoyMadridISO } from "@/lib/wizard-helpers";
import { eur, TZ } from "@/lib/format";
import { previsto, resumirPeriodo, serviciosMasVendidos, variacion } from "@/lib/metricas";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const revalidate = 0;

const muted = (pct: number) => `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`;

function Delta({ valor, invertir = false }: { valor: number | null; invertir?: boolean }) {
  if (valor === null) return <span className="text-[11px]" style={{ color: muted(55) }}>sin datos del periodo anterior</span>;
  const bueno = invertir ? valor <= 0 : valor >= 0;
  return (
    <span className="text-[11px]" style={{ color: bueno ? "var(--color-state-libre)" : "var(--color-state-alta)" }}>
      {valor > 0 ? "+" : ""}
      {valor}% vs. 30 días anteriores
    </span>
  );
}

function ahoraPeticion(): Date {
  return new Date();
}

export default async function MetricasPage() {
  const hoy = hoyMadridISO();
  const [anio, mes] = hoy.split("-").map(Number);
  const ahora = ahoraPeticion();

  // Ventana actual: los últimos 30 días hasta hoy incluido. Anterior: los 30 previos.
  const inicioActual = sumarDias(hoy, -29);
  const inicioAnterior = sumarDias(hoy, -59);
  const { desde: desdeAnterior } = rangoDia(inicioAnterior);
  const { desde: desdeActual } = rangoDia(inicioActual);
  const { hasta: finHoy } = rangoDia(hoy);
  const { hasta: finFuturo } = rangoDia(sumarDias(hoy, 30));

  const [todas, ocupacionMes, resenas, barbero] = await Promise.all([
    getReservasRango(desdeAnterior, finFuturo),
    obtenerOcupacionMes(anio, mes, false),
    getResenasRecientes(),
    getBarbero(),
  ]);

  // Comparar instantes, no textos: la base devuelve "…+00:00" y rangoDia "…Z".
  const enRango = (desde: string, hasta: string) => {
    const [a, b] = [Date.parse(desde), Date.parse(hasta)];
    return todas.filter((r) => {
      const t = Date.parse(r.inicio);
      return t >= a && t < b;
    });
  };
  const actual = enRango(desdeActual, finHoy);
  const anterior = enRango(desdeAnterior, desdeActual);
  const futuro = enRango(finHoy, finFuturo);

  const r = resumirPeriodo(actual, ahora);
  const rAnt = resumirPeriodo(anterior, ahora);
  const prev = previsto([...actual, ...futuro], ahora);
  const mediaEstrellas = resenas.length ? resenas.reduce((a, x) => a + x.estrellas, 0) / resenas.length : 0;

  const kpis = [
    {
      label: "Cobrado (30 días)",
      valor: eur(r.cobradoCents),
      pie: <Delta valor={variacion(r.cobradoCents, rAnt.cobradoCents)} />,
    },
    {
      label: "Ticket medio",
      valor: r.ticketMedioCents === null ? "—" : eur(r.ticketMedioCents),
      pie: <span className="text-[11px]" style={{ color: muted(60) }}>{r.atendidas} citas atendidas</span>,
    },
    {
      label: "Plantones",
      valor: r.tasaPlantones === null ? "—" : `${r.tasaPlantones}%`,
      pie: (
        <span className="text-[11px]" style={{ color: muted(60) }}>
          {r.plantones} sin presentarse
          {rAnt.tasaPlantones !== null && r.tasaPlantones !== null ? ` · antes ${rAnt.tasaPlantones}%` : ""}
        </span>
      ),
    },
    {
      label: "Previsto (próximos 30 días)",
      valor: eur(prev.cents),
      pie: <span className="text-[11px]" style={{ color: muted(60) }}>{prev.citas} citas pendientes</span>,
    },
  ];

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 6));
  const porDia = dias.map((d) => ({
    dia: d,
    total: actual
      .filter((x) => x.estado === "completada" && fechaMadrid(x.inicio) === d)
      .reduce((a, x) => a + x.precio_total_cents, 0),
  }));
  const maxDia = Math.max(1, ...porDia.map((d) => d.total));
  const top = serviciosMasVendidos(actual);

  const ocupOrdenada = ocupacionMes.filter((o) => o.cap > 0);
  const ocupPct = ocupOrdenada.length
    ? Math.round((ocupOrdenada.reduce((a, o) => a + o.ocupados, 0) / ocupOrdenada.reduce((a, o) => a + o.cap, 0)) * 100)
    : 0;

  return (
    <div>
      <AdminPageHeader title="Métricas" subtitle="Últimos 30 días" />
      <div className="flex max-w-[940px] flex-col gap-6">
        {r.sinMarcar > 0 && (
          <p className="m-0 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px]" style={{ background: "color-mix(in srgb, var(--color-state-muchas) 14%, transparent)" }}>
            Hay {r.sinMarcar} {r.sinMarcar === 1 ? "cita pasada" : "citas pasadas"} sin marcar ({eur(r.sinMarcarCents)}). Márcalas como
            «Asistido» o «No asistido» en Hoy o en la Agenda para que estas cifras cuadren con la caja.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-1 rounded-[var(--radius-md)] p-3.5" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
              <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: muted(55) }}>{k.label}</span>
              <span className="text-[22px] sm:text-[26px]" style={{ fontFamily: "var(--font-heading)" }}>{k.valor}</span>
              {k.pie}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1.35fr_1fr]">
          <div className="flex flex-col gap-3.5 rounded-[var(--radius-md)] p-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
            <span className="text-[13px]">Cobrado por día (últimos 7)</span>
            <div className="flex h-[180px] items-end gap-2.5">
              {porDia.map((d) => (
                <div key={d.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px]" style={{ color: muted(60) }}>{d.total ? eur(d.total) : ""}</span>
                  <div
                    className="w-full rounded-t-[5px] transition-[height]"
                    style={{ height: `${Math.max(2, (d.total / maxDia) * 100)}%`, background: "linear-gradient(to top, var(--color-accent-700), var(--color-accent-500))" }}
                  />
                  <span className="text-[10px]" style={{ color: muted(55) }}>
                    {new Date(d.dia + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[var(--radius-md)] p-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
            <span className="text-[13px]">Ocupación (este mes)</span>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span>{barbero?.nombre ?? ""}</span>
                <span style={{ color: muted(60) }}>{ocupPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: muted(10) }}>
                <div className="h-full transition-[width]" style={{ width: `${ocupPct}%`, background: "var(--color-accent-500)" }} />
              </div>
            </div>
            <div className="flex justify-between text-xs" style={{ color: muted(70) }}>
              <span>Cancelaciones (30 días)</span>
              <span>{r.canceladas}</span>
            </div>
            <div className="hr" style={{ margin: "6px 0" }} />
            <span className="text-[13px]">Servicios más vendidos</span>
            {top.length === 0 && <span className="text-xs" style={{ color: muted(55) }}>Todavía sin citas atendidas.</span>}
            {top.map(([nombre, n]) => (
              <div key={nombre} className="flex justify-between text-xs" style={{ color: muted(75) }}>
                <span>{nombre}</span>
                <span>{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-[var(--radius-md)] p-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[13px]">Reseñas</span>
            {resenas.length > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: muted(60) }}>
                <Star size={13} weight="fill" color="var(--color-accent)" />
                {mediaEstrellas.toFixed(1)} · {resenas.length} valoración{resenas.length > 1 ? "es" : ""}
              </span>
            )}
          </div>
          {resenas.length === 0 ? (
            <span className="text-xs" style={{ color: muted(55) }}>Todavía no hay reseñas.</span>
          ) : (
            <div className="flex flex-col gap-2.5">
              {resenas.slice(0, 8).map((x) => (
                <div key={x.id} className="flex flex-col gap-1 border-b pb-2.5" style={{ borderColor: muted(8) }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex gap-0.5" aria-label={`${x.estrellas} de 5 estrellas`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={12} weight={i < x.estrellas ? "fill" : "regular"} color="var(--color-accent)" />
                      ))}
                    </span>
                    <span className="text-[11px]" style={{ color: muted(55) }}>
                      {new Date(x.creado_at).toLocaleDateString("es-ES", { dateStyle: "medium", timeZone: TZ })}
                    </span>
                  </div>
                  {x.comentario && <p className="m-0 text-xs" style={{ color: muted(80) }}>{x.comentario}</p>}
                  <span className="text-[11px]" style={{ color: muted(55) }}>
                    {x.cliente_nombre}{x.servicios ? ` · ${x.servicios}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
