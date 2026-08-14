"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, Check } from "@phosphor-icons/react/ssr";
import type { Servicio } from "@/lib/servicios-shared";
import { agruparPorCategoria } from "@/lib/servicios-shared";
import { durTxt, eur } from "@/lib/format";
import { crearReserva } from "@/lib/actions/reservas";
import { useRealtimeDia } from "@/lib/useRealtimeDia";
import { SelectorFechaHora, type SelectorFechaHoraHandle } from "@/components/shared/SelectorFechaHora";

type Paso = 1 | 2 | 3;

export function WizardReserva({
  servicios,
  initialSeleccion = [],
}: {
  servicios: Servicio[];
  initialSeleccion?: string[];
}) {
  const router = useRouter();
  const grupos = useMemo(() => agruparPorCategoria(servicios), [servicios]);

  const [paso, setPaso] = useState<Paso>(1);
  const [direccion, setDireccion] = useState<"fwd" | "back">("fwd");
  const [seleccion, setSeleccion] = useState<string[]>(initialSeleccion);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviando, startEnvio] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectorRef = useRef<SelectorFechaHoraHandle>(null);

  const serviciosSel = servicios.filter((s) => seleccion.includes(s.id));
  const duracionTotal = serviciosSel.reduce((a, s) => a + s.duracion_min, 0);
  const precioTotal = serviciosSel.reduce((a, s) => a + s.precio_cents, 0);

  // Un hueco puede ocuparse mientras el cliente rellena el paso 3 — si
  // desaparece la hora elegida, lo devolvemos al paso 2 con los huecos ya
  // refrescados (ver README "Errores").
  useRealtimeDia(fecha, () => {
    selectorRef.current?.refrescar();
    if (hora && !(slots ?? []).includes(hora)) {
      setHora(null);
      if (paso === 3) {
        setError("Ese hueco se acaba de ocupar — elige otra hora.");
        ir(2);
      }
    }
  });

  function ir(p: Paso) {
    setDireccion(p > paso ? "fwd" : "back");
    setPaso(p);
  }

  function toggleServicio(id: string) {
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const nombreValido = nombre.trim().length > 1;
  const telefonoValido = telefono.trim().length > 5;

  async function confirmar() {
    setError(null);
    startEnvio(async () => {
      const res = await crearReserva({
        nombre,
        telefono,
        email,
        servicioIds: seleccion,
        inicioISO: hora!,
      });
      if (!res.ok) {
        setError(res.error);
        setModalAbierto(false);
        return;
      }
      router.push(`/reservar/confirmacion/${res.token}`);
    });
  }

  const stepTitle = paso === 1 ? "Servicios" : paso === 2 ? "Fecha y hora" : "Tus datos";
  const progressPct = paso === 1 ? 33 : paso === 2 ? 66 : 100;

  const nextDisabled =
    (paso === 1 && seleccion.length === 0) ||
    (paso === 2 && !hora) ||
    (paso === 3 && (!nombreValido || !telefonoValido));

  function next() {
    if (paso === 3) {
      setModalAbierto(true);
      return;
    }
    ir((paso + 1) as Paso);
  }

  function back() {
    if (paso === 1) {
      router.push("/");
      return;
    }
    ir((paso - 1) as Paso);
  }

  const footHint = paso === 1 ? "Seleccionado" : paso === 2 ? "Cuándo" : "Total";
  const footValue =
    paso === 1
      ? seleccion.length
        ? `${serviciosSel.length} servicio${serviciosSel.length > 1 ? "s" : ""} · ${eur(precioTotal)}`
        : "Elige un servicio"
      : paso === 2
        ? hora
          ? `${fecha} · ${new Date(hora).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}`
          : "Elige día y hora"
        : eur(precioTotal);

  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className="sticky top-0 z-[4] flex flex-col gap-2.5 px-5 pt-[env(safe-area-inset-top)] pb-3.5"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="flex items-center gap-3 pt-3">
          <button className="btn btn-icon btn-secondary" aria-label="Atrás" onClick={back}>
            <CaretLeft size={16} />
          </button>
          <div className="flex flex-col">
            <span
              className="text-[10px] tracking-[0.12em] uppercase"
              style={{ color: "var(--color-accent)" }}
            >
              Paso {paso} de 3
            </span>
            <span className="text-[17px]" style={{ fontFamily: "var(--font-heading)" }}>
              {stepTitle}
            </span>
          </div>
        </div>
        <div
          className="h-0.5 overflow-hidden rounded-full"
          style={{ background: "color-mix(in srgb, var(--color-text) 12%, transparent)" }}
        >
          <div
            className="h-full transition-[width] duration-300"
            style={{ background: "var(--color-accent)", width: `${progressPct}%` }}
          />
        </div>
      </div>

      {error && paso !== 3 && (
        <div
          className="mx-5 mt-2 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px]"
          style={{ background: "color-mix(in srgb, var(--color-state-alta) 16%, transparent)", color: "var(--color-state-alta)" }}
        >
          {error}
        </div>
      )}

      <div
        key={paso}
        className="flex-1 px-5 pt-1 pb-5"
        style={{ animation: `${direccion === "fwd" ? "fgSlideA" : "fgSlideRevA"} .34s cubic-bezier(.2,.8,.25,1) both` }}
      >
        {paso === 1 && (
          <div className="flex flex-col gap-5">
            {grupos.map((g) => (
              <div key={g.nombre} className="flex flex-col gap-2">
                <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
                  {g.nombre}
                </h6>
                {g.items.map((s) => {
                  const sel = seleccion.includes(s.id);
                  const border = sel ? "var(--color-accent)" : "var(--color-divider)";
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleServicio(s.id)}
                      aria-pressed={sel}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-3 text-left"
                      style={{
                        background: "var(--color-surface)",
                        border: `1px solid ${border}`,
                        color: "var(--color-text)",
                        transition: "border-color .18s ease, background .18s ease",
                      }}
                    >
                      <span
                        className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[11px]"
                        style={{ border: `1.5px solid ${border}`, color: "var(--color-accent)" }}
                      >
                        {sel && <Check size={11} weight="bold" />}
                      </span>
                      <span className="flex flex-1 flex-col gap-0.5">
                        <span className="text-sm">{s.nombre}</span>
                        <span
                          className="text-[11px]"
                          style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}
                        >
                          {durTxt(s.duracion_min)}
                        </span>
                      </span>
                      <span className="text-[15px]" style={{ color: "var(--color-accent-300)" }}>
                        {eur(s.precio_cents)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {paso === 2 && (
          <SelectorFechaHora
            ref={selectorRef}
            duracionMin={duracionTotal}
            fecha={fecha}
            onFecha={setFecha}
            hora={hora}
            onHora={(h) => { setHora(h); setError(null); }}
            onSlotsChange={setSlots}
          />
        )}

        {paso === 3 && (
          <div className="flex flex-col gap-4.5">
            <div
              className="flex flex-col gap-2.5 rounded-[var(--radius-md)] p-3.5"
              style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}
            >
              <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--color-accent)" }}>
                Resumen
              </span>
              {serviciosSel.map((s) => (
                <div key={s.id} className="flex justify-between text-[13px]">
                  <span>{s.nombre}</span>
                  <span style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>{eur(s.precio_cents)}</span>
                </div>
              ))}
              <div className="h-px" style={{ background: "color-mix(in srgb, var(--color-text) 10%, transparent)" }} />
              <div className="flex items-baseline justify-between">
                <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                  {hora &&
                    new Date(hora).toLocaleString("es-ES", {
                      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                      timeZone: "Europe/Madrid",
                    })}
                </span>
                <span className="text-[22px]" style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent-300)" }}>
                  {eur(precioTotal)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="field">
                <label>Nombre</label>
                <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 000 000" />
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
            </div>
            {error && (
              <p className="m-0 text-[13px]" style={{ color: "var(--color-state-alta)" }}>{error}</p>
            )}
          </div>
        )}
      </div>

      <div
        className="sticky bottom-0 flex items-center gap-3 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),24px)]"
        style={{ background: "linear-gradient(to top, var(--color-bg) 60%, transparent)" }}
      >
        <div className="flex flex-1 flex-col">
          <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
            {footHint}
          </span>
          <span className="text-[15px]" style={{ fontFamily: "var(--font-heading)" }}>
            {footValue}
          </span>
        </div>
        <button className="btn btn-primary" disabled={nextDisabled} onClick={next} style={{ height: 44, minWidth: 132 }}>
          {paso === 3 ? "Revisar" : "Continuar"}
        </button>
      </div>

      {modalAbierto && (
        <div className="dialog-backdrop" style={{ animation: "fgFade .18s ease both" }}>
          <div className="dialog" style={{ animation: "fgPop .3s cubic-bezier(.2,1.1,.3,1) both" }}>
            <div className="flex items-baseline gap-2.5">
              <span className="dialog-title flex-1">Revisa tu reserva</span>
              <button className="btn btn-icon btn-secondary" aria-label="Cerrar" onClick={() => setModalAbierto(false)}>✕</button>
            </div>
            {[
              { k: "Servicios", v: serviciosSel.map((s) => s.nombre).join(", ") },
              { k: "Duración", v: durTxt(duracionTotal) },
              {
                k: "Cuándo",
                v: hora
                  ? new Date(hora).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" })
                  : "",
              },
              { k: "Nombre", v: nombre },
              { k: "Teléfono", v: telefono },
              { k: "Total", v: eur(precioTotal) },
            ].map((d) => (
              <div
                key={d.k}
                className="flex justify-between gap-3 border-b pb-1.5 text-xs"
                style={{ borderColor: "color-mix(in srgb, var(--color-text) 7%, transparent)" }}
              >
                <span style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>{d.k}</span>
                <span className="text-right">{d.v}</span>
              </div>
            ))}
            <button className="btn btn-primary btn-block" style={{ height: 44 }} disabled={enviando} onClick={confirmar}>
              {enviando ? "Confirmando…" : "Confirmar cita"}
            </button>
            <button className="btn btn-ghost self-center" onClick={() => setModalAbierto(false)}>
              Seguir editando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
