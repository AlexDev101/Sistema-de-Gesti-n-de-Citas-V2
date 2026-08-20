"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { eur } from "@/lib/format";

type ReservaFila = {
  id: string;
  inicio: string;
  estado: string;
  precio_total_cents: number;
  reserva_servicios: { servicio_id: string; servicios: { nombre: string } | null }[];
};

export function MiCuenta() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservas, setReservas] = useState<ReservaFila[] | null>(null);
  const [clienteNombre, setClienteNombre] = useState<string | null>(null);
  const [fidelizacion, setFidelizacion] = useState<{ sellos_disponibles: number; puede_canjear: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await supabase.rpc("vincular_cliente_actual");
      const { data: cliente } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cliente) {
        setReservas([]);
        return;
      }
      setClienteNombre(cliente.nombre);
      const { data } = await supabase
        .from("reservas")
        .select("id, inicio, estado, precio_total_cents, reserva_servicios(servicio_id, servicios(nombre))")
        .eq("cliente_id", cliente.id)
        .order("inicio", { ascending: false });
      setReservas((data as unknown as ReservaFila[]) ?? []);

      const { data: fid } = await supabase.rpc("mi_fidelizacion");
      setFidelizacion(fid as { sellos_disponibles: number; puede_canjear: boolean } | null);
    })();
  }, [user, supabase]);

  async function enviarCodigo() {
    setError(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setEnviando(false);
    if (error) { setError(error.message); return; }
    setEtapa("codigo");
  }

  async function verificarCodigo() {
    setError(null);
    setEnviando(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
    setEnviando(false);
    if (error) setError(error.message);
  }

  if (user === undefined) {
    return <div className="px-5 pt-8 text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Cargando…</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-10">
        <h3 className="m-0">Mi cuenta</h3>
        <p className="m-0 text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
          Recibe un código por email para ver tus citas y tu historial.
        </p>
        {etapa === "email" ? (
          <div className="flex flex-col gap-2.5">
            <div className="field">
              <label>Email</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
            <button className="btn btn-primary btn-block" disabled={enviando || !email.includes("@")} onClick={enviarCodigo}>
              {enviando ? "Enviando…" : "Enviar código"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="field">
              <label>Código recibido en {email}</label>
              <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="123456" />
            </div>
            <button className="btn btn-primary btn-block" disabled={enviando || codigo.length < 4} onClick={verificarCodigo}>
              {enviando ? "Comprobando…" : "Entrar"}
            </button>
          </div>
        )}
        {error && <p className="m-0 text-[13px]" style={{ color: "var(--color-state-alta)" }}>{error}</p>}
      </div>
    );
  }

  // "now" only needs to be roughly current, not stable across a render.
  // eslint-disable-next-line react-hooks/purity
  const ahora = Date.now();
  const proxima = reservas?.find((r) => r.estado === "confirmada" && new Date(r.inicio).getTime() > ahora);
  const historial = (reservas ?? []).filter((r) => r.id !== proxima?.id);

  const nombreServicios = (r: ReservaFila) =>
    r.reserva_servicios.map((rs) => rs.servicios?.nombre).filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-[22px] px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-10">
      <div className="flex items-center gap-3">
        <span
          className="grid h-[42px] w-[42px] place-items-center rounded-full text-sm"
          style={{ background: "var(--color-accent-800)", color: "var(--color-accent-100)" }}
        >
          {(clienteNombre ?? email).slice(0, 2).toUpperCase()}
        </span>
        <div className="flex flex-col">
          <span className="text-[17px]" style={{ fontFamily: "var(--font-heading)" }}>Mi cuenta</span>
          <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
            {clienteNombre ?? email}
          </span>
        </div>
        <button
          className="btn btn-ghost ml-auto"
          onClick={() => supabase.auth.signOut()}
        >
          Salir
        </button>
      </div>

      {reservas === null ? (
        <span className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Cargando tus citas…</span>
      ) : (
        <>
          {fidelizacion && (
            <div
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] p-3.5"
              style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm" style={{ fontFamily: "var(--font-heading)" }}>
                  {fidelizacion.puede_canjear
                    ? "¡Tienes un corte gratis! Coméntaselo a Francíso en tu próxima visita."
                    : `${fidelizacion.sellos_disponibles}/10 sellos`}
                </span>
                {!fidelizacion.puede_canjear && (
                  <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
                    Te faltan {10 - fidelizacion.sellos_disponibles} visitas para un corte gratis
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        i < Math.min(fidelizacion.sellos_disponibles, 10)
                          ? "var(--color-accent)"
                          : "color-mix(in srgb, var(--color-text) 20%, transparent)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Próxima cita</h6>
            {proxima ? (
              <div className="flex flex-col gap-3 rounded-[var(--radius-md)] p-3.5" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base" style={{ fontFamily: "var(--font-heading)" }}>{nombreServicios(proxima)}</span>
                    <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                      {new Date(proxima.inicio).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" })}
                    </span>
                  </div>
                  <span className="tag tag-accent">{eur(proxima.precio_total_cents)}</span>
                </div>
              </div>
            ) : (
              <Link href="/reservar" className="btn btn-secondary btn-block">Reservar cita</Link>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Historial</h6>
            {historial.length === 0 && (
              <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>Todavía no tienes citas pasadas.</span>
            )}
            {historial.map((h) => (
              <div key={h.id} className="flex items-center gap-3 border-b py-[11px]" style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm">{nombreServicios(h)}</span>
                  <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 42%, transparent)" }}>
                    {new Date(h.inicio).toLocaleDateString("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" })}
                  </span>
                </div>
                <Link
                  href={`/reservar?servicios=${h.reserva_servicios.map((rs) => rs.servicio_id).join(",")}`}
                  className="btn btn-ghost text-xs"
                >
                  Repetir
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
