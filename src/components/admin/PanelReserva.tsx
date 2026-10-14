"use client";

import { useEffect, useState } from "react";
import { ChatCircleText, Phone } from "@phosphor-icons/react/ssr";
import type { ReservaAgenda } from "@/lib/actions/admin-agenda";
import {
  actualizarEstadoReserva,
  actualizarNotasReserva,
  getReservasCliente,
  obtenerSlotsAdmin,
  reprogramarReserva,
} from "@/lib/actions/admin-agenda";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import { SelectorFechaHora } from "@/components/shared/SelectorFechaHora";
import { Dialogo } from "@/components/ui/Dialogo";
import { eur, durTxt, hhmm, TZ } from "@/lib/format";
import { telHref, whatsappHref } from "@/lib/contacto";
import { fechaMadrid } from "@/lib/agenda-grid";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/ocupacion";

const ESTADOS = ["confirmada", "completada", "no_show", "cancelada"];

type Avisar = (msg: string, err?: boolean, accion?: { label: string; onClick: () => void }) => void;

export function PanelReserva({
  reserva,
  onClose,
  onChanged,
  avisar,
}: {
  reserva: ReservaAgenda;
  onClose: () => void;
  onChanged: () => void;
  /** Aviso del padre: este panel se cierra al cambiar algo, así que el «Deshacer» vive fuera. */
  avisar: Avisar;
}) {
  // El padre monta este panel con key={reserva.id}: otra reserva lo vuelve a
  // montar y estos estados arrancan de cero.
  const [notas, setNotas] = useState(reserva.notasInternas ?? "");
  const [historial, setHistorial] = useState<ReservaAgenda[] | null>(null);
  const [moviendo, setMoviendo] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const duracion = reserva.servicios.reduce((a, s) => a + s.duracion_min, 0);
  const { aviso, guardando } = useAviso();

  useEffect(() => {
    if (reserva.cliente) getReservasCliente(reserva.cliente.id).then(setHistorial);
  }, [reserva.cliente]);

  async function cambiarEstado(estado: string) {
    if (estado === reserva.estado) return;
    if (estado === "cancelada") {
      setCancelando(true);
      return;
    }
    const anterior = reserva.estado;
    const res = await actualizarEstadoReserva(reserva.id, estado);
    if (!res.ok) {
      avisar(res.error, true);
      return;
    }
    onChanged();
    avisar(`Marcada como «${ESTADO_LABEL[estado]}»`, false, {
      label: "Deshacer",
      onClick: async () => {
        const r = await actualizarEstadoReserva(reserva.id, anterior);
        if (!r.ok) avisar(r.error, true);
        onChanged();
      },
    });
  }

  const cuando = new Date(reserva.inicio).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
  const tel = reserva.cliente?.telefono ?? "";
  const telValido = /[0-9]{9}/.test(tel.replace(/\D/g, ""));

  return (
    <>
      {/* Fondo para cerrar en el móvil, donde el panel tapa la agenda. */}
      <div className="fixed inset-0 z-[60] bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      <aside
        aria-label={`Cita de ${reserva.cliente?.nombre ?? ""}`}
        className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[85dvh] flex-col gap-4 overflow-auto rounded-t-[var(--radius-lg)] p-4.5 pb-[calc(env(safe-area-inset-bottom)+18px)] lg:static lg:z-auto lg:max-h-none lg:w-[320px] lg:flex-none lg:rounded-none lg:border-l lg:pb-4.5"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)",
          background: "var(--color-surface)",
          animation: "fgIn .22s cubic-bezier(.2,.7,.3,1) both",
        }}
      >
        <div className="flex items-start gap-2.5">
          <div className="flex flex-1 flex-col gap-0.5">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>{reserva.cliente?.nombre}</span>
            <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
              {reserva.servicios.map((s) => s.nombre).join(", ")}
            </span>
          </div>
          <button className="btn btn-icon btn-secondary" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>

        {telValido && (
          <div className="flex gap-2">
            <a className="btn btn-secondary flex-1" href={telHref(tel)}>
              <Phone size={15} /> Llamar
            </a>
            <a
              className="btn btn-secondary flex-1"
              href={whatsappHref(tel, `Hola ${reserva.cliente?.nombre ?? ""}, te escribo por tu cita del ${cuando}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ChatCircleText size={15} /> WhatsApp
            </a>
          </div>
        )}

        {[
          { k: "Teléfono", v: tel },
          { k: "Cuándo", v: `${cuando} · ${durTxt(duracion)}` },
          { k: "Precio", v: eur(reserva.precio_total_cents) },
          { k: "Email", v: reserva.email ?? "Sin email (no recibe avisos)" },
          ...(reserva.notas ? [{ k: "Nota del cliente", v: reserva.notas }] : []),
        ].map((d) => (
          <div
            key={d.k}
            className="flex justify-between gap-2.5 border-b pb-2 text-xs"
            style={{ borderColor: "color-mix(in srgb, var(--color-text) 7%, transparent)" }}
          >
            <span style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>{d.k}</span>
            <span className="text-right break-all">{d.v}</span>
          </div>
        ))}

        {reserva.estado === "confirmada" && (
          <button className="btn btn-secondary" onClick={() => setMoviendo(true)}>
            Mover a otra fecha u hora…
          </button>
        )}

        <div className="flex flex-col gap-2">
          <h6 style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Estado</h6>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS.map((e) => (
              <button
                key={e}
                onClick={() => cambiarEstado(e)}
                aria-pressed={reserva.estado === e}
                className="rounded-md px-2.5 py-1.5 text-[12px]"
                style={{
                  border: `1px solid ${reserva.estado === e ? ESTADO_COLOR[e] : "var(--color-divider)"}`,
                  color: reserva.estado === e ? ESTADO_COLOR[e] : "var(--color-text)",
                  background: reserva.estado === e ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                  minHeight: 34,
                }}
              >
                {ESTADO_LABEL[e]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={`notas-${reserva.id}`}
            className="text-[13px] tracking-[0.08em] uppercase"
            style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}
          >
            Notas internas
          </label>
          <textarea
            id={`notas-${reserva.id}`}
            className="input"
            style={{ minHeight: 76 }}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={() => guardando(actualizarNotasReserva(reserva.id, notas))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h6 style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Historial</h6>
          {(historial ?? []).filter((h) => h.id !== reserva.id).slice(0, 4).map((h) => (
            <div key={h.id} className="flex justify-between gap-2 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>
              <span>{h.servicios.map((s) => s.nombre).join(", ")}</span>
              <span>
                {new Date(h.inicio).toLocaleDateString("es-ES", { dateStyle: "medium", timeZone: TZ })} · {ESTADO_LABEL[h.estado]}
              </span>
            </div>
          ))}
          {historial && historial.length <= 1 && (
            <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Primera cita.</span>
          )}
        </div>
        <AvisoHost aviso={aviso} />
      </aside>

      {moviendo && (
        <MoverCitaDialog
          reserva={reserva}
          duracion={duracion}
          onClose={() => setMoviendo(false)}
          onMovida={(msg) => {
            setMoviendo(false);
            onChanged();
            avisar(msg);
          }}
        />
      )}

      {cancelando && (
        <CancelarCitaDialog
          reserva={reserva}
          onClose={() => setCancelando(false)}
          onCancelada={(msg) => {
            setCancelando(false);
            onChanged();
            avisar(msg);
          }}
        />
      )}
    </>
  );
}

function AvisarCheckbox({ email, valor, onChange }: { email: string | null; valor: boolean; onChange: (v: boolean) => void }) {
  if (!email) {
    return (
      <p className="m-0 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
        Este cliente no tiene email: avísale por teléfono o WhatsApp.
      </p>
    );
  }
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} />
      Avisar al cliente por email ({email})
    </label>
  );
}

function MoverCitaDialog({
  reserva,
  duracion,
  onClose,
  onMovida,
}: {
  reserva: ReservaAgenda;
  duracion: number;
  onClose: () => void;
  onMovida: (msg: string) => void;
}) {
  const [fecha, setFecha] = useState<string | null>(fechaMadrid(reserva.inicio));
  const [hora, setHora] = useState<string | null>(null);
  const [avisarCliente, setAvisarCliente] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!hora) return;
    setEnviando(true);
    setError(null);
    const res = await reprogramarReserva(reserva.id, hora, duracion, avisarCliente && !!reserva.email);
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onMovida(avisarCliente && reserva.email ? "Cita movida. Avisamos al cliente por email." : "Cita movida.");
  }

  return (
    <Dialogo titulo="Mover cita" onClose={onClose} ancho={460}>
      <p className="m-0 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
        Ahora: {new Date(reserva.inicio).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short", timeZone: TZ })}
      </p>
      <SelectorFechaHora
        duracionMin={duracion}
        fecha={fecha}
        onFecha={setFecha}
        hora={hora}
        onHora={setHora}
        respetarAntelacion={false}
        cargarSlots={(f, d) => obtenerSlotsAdmin(f, d, reserva.token)}
      />
      <AvisarCheckbox email={reserva.email} valor={avisarCliente} onChange={setAvisarCliente} />
      {error && <p className="m-0 text-[13px]" style={{ color: "var(--color-state-alta)" }}>{error}</p>}
      <button className="btn btn-primary btn-block" disabled={!hora || enviando} onClick={confirmar}>
        {enviando ? "Moviendo…" : hora ? `Mover a las ${hhmm(hora)}` : "Elige día y hora"}
      </button>
    </Dialogo>
  );
}

function CancelarCitaDialog({
  reserva,
  onClose,
  onCancelada,
}: {
  reserva: ReservaAgenda;
  onClose: () => void;
  onCancelada: (msg: string) => void;
}) {
  const [avisarCliente, setAvisarCliente] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    const res = await actualizarEstadoReserva(reserva.id, "cancelada", avisarCliente && !!reserva.email);
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onCancelada(avisarCliente && reserva.email ? "Cita cancelada. Avisamos al cliente por email." : "Cita cancelada.");
  }

  return (
    <Dialogo titulo="¿Cancelar la cita?" onClose={onClose} ancho={420}>
      <p className="m-0 text-sm">
        {reserva.cliente?.nombre} ·{" "}
        {new Date(reserva.inicio).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: TZ })}
      </p>
      <p className="m-0 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
        El hueco queda libre para otras reservas. La cita sigue en el historial del cliente.
      </p>
      {reserva.estado === "confirmada" && (
        <AvisarCheckbox email={reserva.email} valor={avisarCliente} onChange={setAvisarCliente} />
      )}
      {error && <p className="m-0 text-[13px]" style={{ color: "var(--color-state-alta)" }}>{error}</p>}
      <div className="dialog-actions">
        <button className="btn btn-secondary" onClick={onClose}>Volver</button>
        <button className="btn btn-primary" style={{ color: "var(--color-state-alta)", borderColor: "var(--color-state-alta)" }} disabled={enviando} onClick={confirmar}>
          {enviando ? "Cancelando…" : "Cancelar cita"}
        </button>
      </div>
    </Dialogo>
  );
}
