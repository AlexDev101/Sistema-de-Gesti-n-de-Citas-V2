"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// El acceso normal es email + contraseña, sin más. El camino por código solo
// existe durante el primer arranque: mientras nadie ha reclamado el panel no
// hay ninguna cuenta todavía, así que iniciar sesión con contraseña es
// imposible y hace falta otra forma de crear al primer administrador.
type Modo = "password" | "recuperar" | "otp-email" | "otp-codigo";

export function AdminLoginForm({ necesitaClaim, motivo }: { necesitaClaim: boolean; motivo?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<Modo>(necesitaClaim ? "otp-email" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  // `motivo` explica por qué te devolvió aquí el callback; se descarta en
  // cuanto el formulario tiene algo propio que decir.
  const [error, setError] = useState<string | null>(motivo ?? null);
  const [enviado, setEnviado] = useState(false);

  async function entrarConPanel() {
    const { data: esAdmin } = await supabase.rpc("es_admin");
    if (!esAdmin) {
      setError("Esta cuenta no tiene acceso de administrador.");
      await supabase.auth.signOut();
      return false;
    }
    router.push("/admin/hoy");
    router.refresh();
    return true;
  }

  async function entrarConPassword() {
    setError(null);
    setEnviando(true);
    const { error: errLogin } = await supabase.auth.signInWithPassword({ email, password });
    if (errLogin) { setEnviando(false); setError(errLogin.message); return; }
    await entrarConPanel();
    setEnviando(false);
  }

  async function enviarRecuperacion() {
    setError(null);
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setEnviando(false);
    // Se responde igual haya cuenta o no: decir "ese email no existe" permite
    // averiguar desde fuera qué direcciones tienen acceso al panel.
    if (error) { setError(error.message); return; }
    setEnviado(true);
  }

  async function enviarCodigo() {
    setError(null);
    setEnviando(true);
    // Solo se permite crear cuenta durante el primer arranque, cuando aún nadie
    // ha reclamado el panel. Antes iba fijo a true, así que cualquiera que
    // escribiera un email aquí creaba una fila en auth.users: no era escalada
    // de privilegios —reclamar_admin ya está reclamado— pero llenaba la tabla
    // de cuentas sueltas que encima bloqueaban direcciones por el índice único.
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: necesitaClaim } });
    setEnviando(false);
    if (error) { setError(error.message); return; }
    setModo("otp-codigo");
  }

  async function verificarCodigo() {
    setError(null);
    setEnviando(true);
    const { error: errOtp } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
    if (errOtp) { setEnviando(false); setError(errOtp.message); return; }
    await supabase.rpc("reclamar_admin");
    await entrarConPanel();
    setEnviando(false);
  }

  return (
    <div
      className="flex w-full max-w-[360px] flex-col gap-4 rounded-[var(--radius-lg)] p-6"
      style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex flex-col gap-1">
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
          {necesitaClaim ? "Crear cuenta de administrador" : "Acceso admin"}
        </span>
        <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          {necesitaClaim
            ? "Nadie ha reclamado el panel todavía — el primer email que verifiques aquí queda como administrador."
            : "Entra con tu email y contraseña."}
        </span>
      </div>

      {modo === "password" && !necesitaClaim && (
        <div className="flex flex-col gap-2.5">
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-block" disabled={enviando || !email.includes("@") || !password} onClick={entrarConPassword}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
          <button
            className="btn btn-ghost self-center"
            style={{ fontSize: 12 }}
            onClick={() => { setError(null); setEnviado(false); setModo("recuperar"); }}
          >
            He olvidado la contraseña
          </button>
        </div>
      )}

      {modo === "recuperar" && (
        <div className="flex flex-col gap-2.5">
          {enviado ? (
            <p className="m-0 text-[13px]" style={{ color: "var(--color-accent-300)" }}>
              Si esa dirección tiene acceso, le llega un enlace para elegir una contraseña nueva.
            </p>
          ) : (
            <>
              <div className="field">
                <label>Email</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
              <button className="btn btn-primary btn-block" disabled={enviando || !email.includes("@")} onClick={enviarRecuperacion}>
                {enviando ? "Enviando…" : "Enviar enlace"}
              </button>
            </>
          )}
          <button className="btn btn-ghost self-center" style={{ fontSize: 12 }} onClick={() => { setError(null); setModo("password"); }}>
            Volver
          </button>
        </div>
      )}

      {modo === "otp-email" && necesitaClaim && (
        <div className="flex flex-col gap-2.5">
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <button className="btn btn-primary btn-block" disabled={enviando || !email.includes("@")} onClick={enviarCodigo}>
            {enviando ? "Enviando…" : "Enviar código"}
          </button>
        </div>
      )}

      {modo === "otp-codigo" && necesitaClaim && (
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
