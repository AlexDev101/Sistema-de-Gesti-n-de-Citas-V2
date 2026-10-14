import { ChatCircleText, Phone } from "@phosphor-icons/react/ssr";
import { getEnviosFallidos, getReservasRango } from "@/lib/actions/admin-agenda";
import { getBarbero, getCierres, getHorario } from "@/lib/data/negocio";
import { minutosDelDia, rangoDia } from "@/lib/agenda-grid";
import {
  aHHMM,
  cierreDelDia,
  diaSemana,
  franjasDelDia,
  huecosLibres,
  minutosAbiertos,
  minutosOcupados,
} from "@/lib/horario";
import { hoyMadridISO } from "@/lib/wizard-helpers";
import { eur, fechaLarga, hhmm } from "@/lib/format";
import { telHref, whatsappHref } from "@/lib/contacto";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/ocupacion";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HoyCheckin } from "@/components/admin/HoyCheckin";
import { NuevaCitaButton } from "@/components/admin/NuevaCitaButton";
import { EnviosFallidos } from "@/components/admin/EnviosFallidos";

export const revalidate = 0;

const muted = (pct: number) => `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`;

export default async function HoyPage() {
  const hoy = hoyMadridISO();
  const { desde, hasta } = rangoDia(hoy);
  const [todas, barbero, horario, cierres, fallidos] = await Promise.all([
    getReservasRango(desde, hasta),
    getBarbero(),
    getHorario(),
    getCierres(hoy),
    getEnviosFallidos(),
  ]);

  // Las canceladas salen de la vista del día. Las de «No asistido» se quedan
  // (atenuadas) para poder deshacer un toque equivocado.
  const reservas = todas.filter((r) => r.estado !== "cancelada");
  const atendibles = reservas.filter((r) => r.estado !== "no_show");

  const cierre = cierreDelDia(cierres, hoy);
  // Horario real de hoy (el que edita el barbero en «Horario»), no el de la
  // plantilla escrita en el código.
  const franjas = cierre ? [] : franjasDelDia(horario, diaSemana(hoy));
  const tramos = atendibles.map((r) => {
    const inicio = minutosDelDia(r.inicio);
    return { inicio, fin: inicio + r.servicios.reduce((a, s) => a + s.duracion_min, 0) };
  });

  const ingresos = atendibles.reduce((a, r) => a + r.precio_total_cents, 0);
  const abiertos = minutosAbiertos(franjas);
  const ocupacionPct = abiertos ? Math.round((minutosOcupados(franjas, tramos) / abiertos) * 100) : 0;
  const huecos = huecosLibres(franjas, tramos, 60).map(([a, b]) => `${aHHMM(a)}–${aHHMM(b)}`);
  const plantones = reservas.filter((r) => r.estado === "no_show").length;

  const kpis = [
    { label: "Citas hoy", valor: String(atendibles.length) },
    { label: "Ingresos", valor: eur(ingresos) },
    { label: "Ocupación", valor: franjas.length ? `${ocupacionPct}%` : "—" },
  ];

  return (
    <div>
      <AdminPageHeader title="Hoy" subtitle={fechaLarga(hoy + "T12:00:00Z")} actions={<NuevaCitaButton />} />
      <div className="flex max-w-[1080px] flex-col items-stretch gap-5 lg:flex-row lg:items-start lg:gap-5.5">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {fallidos.length > 0 && <EnviosFallidos envios={fallidos} />}

          {cierre && (
            <div className="rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px]" style={{ background: "color-mix(in srgb, var(--color-state-alta) 14%, transparent)" }}>
              Hoy está cerrado{cierre.motivo ? `: ${cierre.motivo}` : ""}.
            </div>
          )}
          {!cierre && franjas.length === 0 && (
            <p className="m-0 text-[13px]" style={{ color: muted(65) }}>Hoy no hay horario de apertura.</p>
          )}

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="flex flex-col gap-1 rounded-[var(--radius-md)] p-3 sm:p-3.5" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
                <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: muted(55) }}>{k.label}</span>
                <span className="text-[19px] sm:text-[24px]" style={{ fontFamily: "var(--font-heading)" }}>{k.valor}</span>
              </div>
            ))}
          </div>

          {reservas.length === 0 ? (
            <p className="text-sm" style={{ color: muted(60) }}>Sin citas hoy.</p>
          ) : (
            reservas.map((r) => {
              const tel = r.cliente?.telefono ?? "";
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[var(--radius-md)] border px-3.5 py-3"
                  style={{ borderColor: muted(8), opacity: r.estado === "no_show" ? 0.6 : 1 }}
                >
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, width: 48 }}>{hhmm(r.inicio)}</span>
                  <span className="h-[30px] w-0.5 rounded-full" style={{ background: ESTADO_COLOR[r.estado] }} />
                  <div className="flex min-w-[140px] flex-1 flex-col gap-0.5">
                    <span className="text-sm">{r.cliente?.nombre}</span>
                    <span className="text-[11px]" style={{ color: muted(60) }}>
                      {r.servicios.map((s) => s.nombre).join(", ")}
                      {barbero?.nombre ? ` · ${barbero.nombre}` : ""}
                    </span>
                  </div>
                  {tel && (
                    <span className="flex gap-1">
                      <a className="btn btn-icon btn-secondary" href={telHref(tel)} aria-label={`Llamar a ${r.cliente?.nombre}`}>
                        <Phone size={15} />
                      </a>
                      <a
                        className="btn btn-icon btn-secondary"
                        href={whatsappHref(tel, `Hola ${r.cliente?.nombre ?? ""}, te escribo por tu cita de hoy a las ${hhmm(r.inicio)}.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`WhatsApp a ${r.cliente?.nombre}`}
                      >
                        <ChatCircleText size={15} />
                      </a>
                    </span>
                  )}
                  <span className="tag tag-neutral">{ESTADO_LABEL[r.estado]}</span>
                  <HoyCheckin id={r.id} estado={r.estado} />
                </div>
              );
            })
          )}
        </div>

        {(huecos.length > 0 || plantones > 0) && (
          <aside className="flex w-full flex-col gap-3 lg:sticky lg:top-5 lg:w-[260px] lg:flex-none">
            {huecos.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] p-3.5" style={{ border: "1px dashed color-mix(in srgb, var(--color-accent) 40%, transparent)" }}>
                <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: muted(55) }}>Huecos libres de 1 h o más</span>
                <span className="text-xs leading-relaxed text-balance" style={{ color: "var(--color-accent-300)" }}>{huecos.join(" · ")}</span>
              </div>
            )}
            {plantones > 0 && (
              <div className="rounded-[var(--radius-md)] p-3.5 text-xs" style={{ background: "var(--color-surface)" }}>
                {plantones} {plantones === 1 ? "cliente no ha venido" : "clientes no han venido"} hoy.
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
