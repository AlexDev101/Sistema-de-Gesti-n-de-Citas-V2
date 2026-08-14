"use client";

import { useEffect, useState } from "react";
import type { Servicio } from "@/lib/servicios-shared";
import { durTxt, eur } from "@/lib/format";
import { buscarClientePorTelefono, crearReservaAdmin, listarServiciosActivos } from "@/lib/actions/admin-reservas";
import { SelectorFechaHora } from "@/components/shared/SelectorFechaHora";

export function NuevaCitaDialog({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarServiciosActivos().then(setServicios);
  }, []);

  const duracionTotal = (servicios ?? [])
    .filter((s) => seleccion.includes(s.id))
    .reduce((a, s) => a + s.duracion_min, 0);
  const precioTotal = (servicios ?? [])
    .filter((s) => seleccion.includes(s.id))
    .reduce((a, s) => a + s.precio_cents, 0);

  async function onTelefonoBlur() {
    if (telefono.trim().length < 5) return;
    const cliente = await buscarClientePorTelefono(telefono);
    if (cliente) {
      setNombre(cliente.nombre);
      setEmail(cliente.email ?? "");
    }
  }

  function toggleServicio(id: string) {
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function confirmar() {
    if (!hora) return;
    setError(null);
    setEnviando(true);
    const res = await crearReservaAdmin({
      nombre,
      telefono,
      email,
      servicioIds: seleccion,
      inicioISO: hora,
      notas: notas || undefined,
    });
    setEnviando(false);
    if (!res.ok) { setError(res.error); return; }
    onCreada();
  }

  const puedeConfirmar = nombre.trim().length > 1 && telefono.trim().length > 5 && seleccion.length > 0 && !!hora;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={{ width: 480, maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline gap-2.5">
          <span className="dialog-title flex-1">Nueva cita</span>
          <button className="btn btn-icon btn-secondary" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="field">
            <label>Teléfono</label>
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} onBlur={onTelefonoBlur} placeholder="600 000 000" />
          </div>
          <div className="flex gap-2.5">
            <div className="field" style={{ flex: 1 }}>
              <label>Nombre</label>
              <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Email (opcional)</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Servicios</h6>
          {!servicios && <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>Cargando…</span>}
          <div className="flex flex-col gap-1.5">
            {servicios?.map((s) => {
              const sel = seleccion.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleServicio(s.id)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm"
                  style={{ border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-divider)"}`, background: "var(--color-bg)" }}
                >
                  <span className="flex-1">{s.nombre}</span>
                  <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>{durTxt(s.duracion_min)}</span>
                  <span style={{ color: "var(--color-accent-300)" }}>{eur(s.precio_cents)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Fecha y hora</h6>
          {duracionTotal === 0 ? (
            <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
              Elige al menos un servicio para ver el calendario.
            </span>
          ) : (
            <SelectorFechaHora
              duracionMin={duracionTotal}
              fecha={fecha}
              onFecha={setFecha}
              hora={hora}
              onHora={setHora}
            />
          )}
        </div>

        <div className="field">
          <label>Notas (opcional)</label>
          <textarea className="input" value={notas} onChange={(e) => setNotas(e.target.value)} style={{ minHeight: 60 }} />
        </div>

        {precioTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Total</span>
            <span style={{ color: "var(--color-accent-300)" }}>{eur(precioTotal)}</span>
          </div>
        )}

        {error && <p className="m-0 text-[13px]" style={{ color: "var(--color-state-alta)" }}>{error}</p>}

        <button className="btn btn-primary btn-block" disabled={!puedeConfirmar || enviando} onClick={confirmar}>
          {enviando ? "Creando…" : "Crear cita"}
        </button>
      </div>
    </div>
  );
}
