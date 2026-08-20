import { getReservasRango } from "@/lib/actions/admin-agenda";
import { rangoDia, filasDia, minutosDelDia, APERTURA_MIN, CIERRE_MIN, PAUSA_INICIO, PAUSA_FIN } from "@/lib/agenda-grid";
import { hoyMadridISO } from "@/lib/wizard-helpers";
import { eur } from "@/lib/format";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/ocupacion";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HoyCheckin } from "@/components/admin/HoyCheckin";
import { NuevaCitaButton } from "@/components/admin/NuevaCitaButton";

export const revalidate = 0;

export default async function HoyPage() {
  const hoy = hoyMadridISO();
  const { desde, hasta } = rangoDia(hoy);
  // Una cita cancelada o marcada "No asistido" sale de la vista del día,
  // igual que ya pasaba con las canceladas — no cuenta para ingresos ni
  // ocupación de hoy, y deja de ocupar sitio en la lista de check-in.
  const reservas = (await getReservasRango(desde, hasta)).filter(
    (r) => r.estado !== "cancelada" && r.estado !== "no_show"
  );

  const ingresos = reservas.reduce((a, r) => a + r.precio_total_cents, 0);
  const slots = filasDia().filter((f) => !f.pausa).length;
  const ocupados = reservas.reduce((a, r) => a + Math.ceil(r.servicios.reduce((s, x) => s + x.duracion_min, 0) / 30), 0);
  const ocupacionPct = slots ? Math.round((ocupados / slots) * 100) : 0;

  const kpis = [
    { label: "Citas hoy", valor: String(reservas.length) },
    { label: "Ingresos", valor: eur(ingresos) },
    { label: "Ocupación", valor: `${ocupacionPct}%` },
  ];

  // Huecos muertos: tramos libres de 60 min o más dentro del horario de hoy.
  const ocupadosMin = reservas
    .map((r) => {
      const inicio = minutosDelDia(r.inicio);
      const dur = r.servicios.reduce((a, s) => a + s.duracion_min, 0);
      return { inicio, fin: inicio + dur };
    })
    .sort((a, b) => a.inicio - b.inicio);
  const tramos: [number, number][] = [
    [APERTURA_MIN, PAUSA_INICIO],
    [PAUSA_FIN, CIERRE_MIN],
  ];
  const huecos: string[] = [];
  for (const [ini, fin] of tramos) {
    let cursor = ini;
    for (const o of ocupadosMin) {
      if (o.inicio >= fin || o.fin <= ini) continue;
      if (o.inicio - cursor >= 60) huecos.push(fmtRango(cursor, o.inicio));
      cursor = Math.max(cursor, o.fin);
    }
    if (fin - cursor >= 60) huecos.push(fmtRango(cursor, fin));
  }

  return (
    <div>
      <AdminPageHeader title="Hoy" subtitle={hoy} actions={<NuevaCitaButton />} />
      <div className="flex max-w-[1080px] items-start gap-5.5">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="flex flex-col gap-1 rounded-[var(--radius-md)] p-3.5" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
                <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>{k.label}</span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 24 }}>{k.valor}</span>
              </div>
            ))}
          </div>

          {reservas.length === 0 ? (
            <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Sin citas hoy.</p>
          ) : (
            reservas.map((r) => (
              <div key={r.id} className="flex items-center gap-3.5 rounded-[var(--radius-md)] border px-3.5 py-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)", background: "transparent" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, width: 52 }}>
                  {new Date(r.inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
                </span>
                <span className="h-[30px] w-0.5 rounded-full" style={{ background: ESTADO_COLOR[r.estado] }} />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm">{r.cliente?.nombre}</span>
                  <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
                    {r.servicios.map((s) => s.nombre).join(", ")} · Francíso
                  </span>
                </div>
                <span className="tag tag-neutral">{ESTADO_LABEL[r.estado]}</span>
                <HoyCheckin id={r.id} estado={r.estado} />
              </div>
            ))
          )}
        </div>

        {huecos.length > 0 && (
          <aside className="sticky top-5 w-[260px] flex-none">
            <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] p-3.5" style={{ border: "1px dashed color-mix(in srgb, var(--color-accent) 40%, transparent)" }}>
              <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>Huecos muertos</span>
              <span className="text-xs leading-relaxed text-balance" style={{ color: "var(--color-accent-300)" }}>{huecos.join(" · ")}</span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function fmtRango(a: number, b: number) {
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return `${f(a)}–${f(b)}`;
}
