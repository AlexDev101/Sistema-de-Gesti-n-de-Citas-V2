"use client";

import { useEffect, useState } from "react";
import type { ReservaAgenda } from "@/lib/actions/admin-agenda";
import { actualizarEstadoReserva, actualizarNotasReserva, getReservasCliente } from "@/lib/actions/admin-agenda";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import { eur, durTxt } from "@/lib/format";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/ocupacion";

const ESTADOS = ["confirmada", "completada", "no_show", "cancelada"];

export function PanelReserva({
  reserva,
  onClose,
  onChanged,
}: {
  reserva: ReservaAgenda;
  onClose: () => void;
  onChanged: () => void;
}) {
  // Parent mounts this with key={reserva.id}, so a different reserva
  // remounts the component and these reset to their initial values —
  // no reset-on-prop-change effect needed.
  const [notas, setNotas] = useState(reserva.notas ?? "");
  const [historial, setHistorial] = useState<ReservaAgenda[] | null>(null);
  const duracion = reserva.servicios.reduce((a, s) => a + s.duracion_min, 0);
  const { aviso, guardando } = useAviso();

  useEffect(() => {
    if (reserva.cliente) getReservasCliente(reserva.cliente.id).then(setHistorial);
  }, [reserva.cliente]);

  return (
    <aside
      className="flex w-[320px] flex-none flex-col gap-4 overflow-auto border-l p-4.5"
      style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)", animation: "fgIn .22s cubic-bezier(.2,.7,.3,1) both" }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>{reserva.cliente?.nombre}</span>
          <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
            {reserva.servicios.map((s) => s.nombre).join(", ")}
          </span>
        </div>
        <button className="btn btn-icon btn-secondary" aria-label="Cerrar" onClick={onClose}>✕</button>
      </div>

      {[
        { k: "Teléfono", v: reserva.cliente?.telefono ?? "" },
        {
          k: "Hora",
          v: `${new Date(reserva.inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })} · ${durTxt(duracion)}`,
        },
        { k: "Precio", v: eur(reserva.precio_total_cents) },
      ].map((d) => (
        <div
          key={d.k}
          className="flex justify-between gap-2.5 border-b pb-2 text-xs"
          style={{ borderColor: "color-mix(in srgb, var(--color-text) 7%, transparent)" }}
        >
          <span style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>{d.k}</span>
          <span className="text-right">{d.v}</span>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Estado</h6>
        <div className="flex flex-wrap gap-1.5">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={async () => {
                if (await guardando(actualizarEstadoReserva(reserva.id, e))) onChanged();
              }}
              className="rounded-md px-2.5 py-1.5 text-[11px]"
              style={{
                border: `1px solid ${reserva.estado === e ? ESTADO_COLOR[e] : "var(--color-divider)"}`,
                color: reserva.estado === e ? ESTADO_COLOR[e] : "var(--color-text)",
                background: reserva.estado === e ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
              }}
            >
              {ESTADO_LABEL[e]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Notas internas</h6>
        <textarea
          className="input"
          style={{ minHeight: 76 }}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => guardando(actualizarNotasReserva(reserva.id, notas))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Historial</h6>
        {(historial ?? []).filter((h) => h.id !== reserva.id).slice(0, 4).map((h) => (
          <div key={h.id} className="flex justify-between text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
            <span>{h.servicios.map((s) => s.nombre).join(", ")}</span>
            <span>{new Date(h.inicio).toLocaleDateString("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" })}</span>
          </div>
        ))}
      </div>
      <AvisoHost aviso={aviso} />
    </aside>
  );
}
