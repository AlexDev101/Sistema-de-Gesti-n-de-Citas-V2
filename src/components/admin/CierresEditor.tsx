"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCierre, eliminarCierre } from "@/lib/actions/admin-horario";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import type { Cierre } from "@/lib/horario";
import { hoyMadridISO } from "@/lib/wizard-helpers";

const muted = (pct: number) => `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`;

function fechaTxt(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// Días cerrados: vacaciones, festivos o un día libre. La web deja de ofrecer
// huecos esos días y la agenda los marca. Las citas que ya hubiera no se
// cancelan solas: se avisa de cuántas hay para que el barbero decida.
export function CierresEditor({ cierres }: { cierres: Cierre[] }) {
  const router = useRouter();
  const hoy = hoyMadridISO();
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { aviso, avisar, guardando, cerrar } = useAviso();

  async function anadir() {
    setEnviando(true);
    const res = await crearCierre(desde, hasta < desde ? desde : hasta, motivo);
    setEnviando(false);
    if (!res.ok) {
      avisar(res.error, true);
      return;
    }
    setMotivo("");
    avisar(
      res.citasAfectadas > 0
        ? `Cierre guardado. Ojo: hay ${res.citasAfectadas} ${res.citasAfectadas === 1 ? "cita" : "citas"} esos días; muévelas o cancélalas desde la Agenda.`
        : "Cierre guardado. La web ya no ofrece huecos esos días."
    );
    router.refresh();
  }

  return (
    <div className="flex max-w-[640px] flex-col gap-3.5">
      <div className="flex flex-col gap-2.5 rounded-[var(--radius-md)] p-3.5 sm:flex-row sm:flex-wrap sm:items-end" style={{ background: "var(--color-surface)" }}>
        <div className="field">
          <label htmlFor="cierre-desde">Desde</label>
          <input id="cierre-desde" type="date" className="input" min={hoy} value={desde} onChange={(e) => { setDesde(e.target.value); if (hasta < e.target.value) setHasta(e.target.value); }} />
        </div>
        <div className="field">
          <label htmlFor="cierre-hasta">Hasta (incluido)</label>
          <input id="cierre-hasta" type="date" className="input" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="field min-w-[160px] flex-1">
          <label htmlFor="cierre-motivo">Motivo (opcional)</label>
          <input id="cierre-motivo" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Vacaciones, festivo…" maxLength={80} />
        </div>
        <button className="btn btn-primary" disabled={enviando || !desde} onClick={anadir} style={{ minHeight: 40 }}>
          {enviando ? "Guardando…" : "Cerrar esos días"}
        </button>
      </div>

      {cierres.length === 0 ? (
        <p className="m-0 text-xs" style={{ color: muted(60) }}>No hay cierres programados.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {cierres.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-[13px]" style={{ borderColor: muted(10) }}>
              <span className="flex-1">
                {c.desde === c.hasta ? fechaTxt(c.desde) : `${fechaTxt(c.desde)} → ${fechaTxt(c.hasta)}`}
                {c.motivo && <span style={{ color: muted(60) }}> · {c.motivo}</span>}
                {c.citas_afectadas > 0 && (
                  <span style={{ color: "var(--color-state-muchas)" }}> · {c.citas_afectadas} {c.citas_afectadas === 1 ? "cita pendiente" : "citas pendientes"}</span>
                )}
              </span>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={async () => {
                  if (await guardando(eliminarCierre(c.id), "Cierre quitado: esos días vuelven a estar abiertos")) router.refresh();
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <AvisoHost aviso={aviso} onCerrar={cerrar} />
    </div>
  );
}
