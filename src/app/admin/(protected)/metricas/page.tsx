import { Star } from "@phosphor-icons/react/ssr";
import { getReservasRango } from "@/lib/actions/admin-agenda";
import { obtenerOcupacionMes } from "@/lib/actions/disponibilidad";
import { getResenasRecientes } from "@/lib/actions/admin-resenas";
import { rangoDia } from "@/lib/agenda-grid";
import { hoyMadridISO } from "@/lib/wizard-helpers";
import { eur } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const revalidate = 0;

export default async function MetricasPage() {
  const hoy = hoyMadridISO();
  const [anio, mes] = hoy.split("-").map(Number);

  const desde30 = new Date(hoy + "T00:00:00Z");
  desde30.setUTCDate(desde30.getUTCDate() - 29);
  const { desde } = rangoDia(desde30.toISOString().slice(0, 10));
  const { hasta } = rangoDia(hoy);
  const hastaManana = new Date(hasta);
  hastaManana.setUTCDate(hastaManana.getUTCDate() + 1);

  const [reservas30, ocupacionMes, resenas] = await Promise.all([
    getReservasRango(desde, hastaManana.toISOString()),
    obtenerOcupacionMes(anio, mes),
    getResenasRecientes(),
  ]);

  const mediaEstrellas = resenas.length ? resenas.reduce((a, r) => a + r.estrellas, 0) / resenas.length : 0;

  const activas = reservas30.filter((r) => r.estado !== "cancelada");
  const canceladas = reservas30.filter((r) => r.estado === "cancelada");
  const ingresos30 = activas.reduce((a, r) => a + r.precio_total_cents, 0);
  const ticketMedio = activas.length ? Math.round(ingresos30 / activas.length) : 0;

  const kpis = [
    { label: "Ingresos (30 días)", valor: eur(ingresos30), delta: `${activas.length} citas` },
    { label: "Ticket medio", valor: eur(ticketMedio), delta: "" },
    { label: "Cancelaciones", valor: String(canceladas.length), delta: `${reservas30.length ? Math.round((canceladas.length / reservas30.length) * 100) : 0}%` },
    {
      label: "Ocupación del mes",
      valor: `${Math.round((ocupacionMes.reduce((a, o) => a + o.ocupados, 0) / Math.max(1, ocupacionMes.reduce((a, o) => a + o.cap, 0))) * 100)}%`,
      delta: "",
    },
  ];

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const porDia = dias.map((d) => ({
    dia: d,
    total: activas.filter((r) => r.inicio.slice(0, 10) === d).reduce((a, r) => a + r.precio_total_cents, 0),
  }));
  const maxDia = Math.max(1, ...porDia.map((d) => d.total));

  const topServicios = new Map<string, number>();
  for (const r of activas) for (const s of r.servicios) topServicios.set(s.nombre, (topServicios.get(s.nombre) ?? 0) + 1);
  const top = [...topServicios.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ocupOrdenada = ocupacionMes.filter((o) => o.cap > 0);
  const ocupPct = ocupOrdenada.length
    ? Math.round((ocupOrdenada.reduce((a, o) => a + o.ocupados, 0) / ocupOrdenada.reduce((a, o) => a + o.cap, 0)) * 100)
    : 0;

  return (
    <div>
      <AdminPageHeader title="Métricas" subtitle="Últimos 30 días" />
      <div className="flex max-w-[940px] flex-col gap-6">
        <div className="grid grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-1 rounded-[var(--radius-md)] p-3.5" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
              <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>{k.label}</span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 26 }}>{k.valor}</span>
              {k.delta && <span className="text-[11px]" style={{ color: "var(--color-accent-300)" }}>{k.delta}</span>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1.35fr_1fr]">
          <div className="flex flex-col gap-3.5 rounded-[var(--radius-md)] p-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
            <span className="text-[13px]">Ingresos por día</span>
            <div className="flex h-[180px] items-end gap-2.5">
              {porDia.map((d) => (
                <div key={d.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px]" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>{d.total ? eur(d.total) : ""}</span>
                  <div
                    className="w-full rounded-t-[5px] transition-[height]"
                    style={{ height: `${Math.max(2, (d.total / maxDia) * 100)}%`, background: "linear-gradient(to top, var(--color-accent-700), var(--color-accent-500))" }}
                  />
                  <span className="text-[10px]" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
                    {new Date(d.dia + "T00:00:00Z").toLocaleDateString("es-ES", { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[var(--radius-md)] p-4" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
            <span className="text-[13px]">Ocupación (mes)</span>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span>Francíso</span>
                <span style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>{ocupPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
                <div className="h-full transition-[width]" style={{ width: `${ocupPct}%`, background: "var(--color-accent-500)" }} />
              </div>
            </div>
            <div className="hr" style={{ margin: "6px 0" }} />
            <span className="text-[13px]">Servicios más vendidos</span>
            {top.map(([nombre, n]) => (
              <div key={nombre} className="flex justify-between text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>
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
              <span className="flex items-center gap-1 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                <Star size={13} weight="fill" color="var(--color-accent)" />
                {mediaEstrellas.toFixed(1)} · {resenas.length} valoración{resenas.length > 1 ? "es" : ""}
              </span>
            )}
          </div>
          {resenas.length === 0 ? (
            <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
              Todavía no hay reseñas.
            </span>
          ) : (
            <div className="flex flex-col gap-2.5">
              {resenas.slice(0, 8).map((r) => (
                <div key={r.id} className="flex flex-col gap-1 border-b pb-2.5" style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={12} weight={i < r.estrellas ? "fill" : "regular"} color="var(--color-accent)" />
                      ))}
                    </span>
                    <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 42%, transparent)" }}>
                      {new Date(r.creado_at).toLocaleDateString("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" })}
                    </span>
                  </div>
                  {r.comentario && <p className="m-0 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 75%, transparent)" }}>{r.comentario}</p>}
                  <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 42%, transparent)" }}>
                    {r.cliente_nombre}{r.servicios ? ` · ${r.servicios}` : ""}
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
