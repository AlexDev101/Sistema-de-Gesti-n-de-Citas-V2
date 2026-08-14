"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Modo = "password" | "otp-email" | "otp-codigo";

export function AdminLoginForm({ necesitaClaim }: { necesitaClaim: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<Modo>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function enviarCodigo() {
    setError(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
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

      {modo === "password" && (
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
          <button className="btn btn-ghost self-center" style={{ fontSize: 12 }} onClick={() => { setError(null); setModo("otp-email"); }}>
            O recibe un código por email
          </button>
        </div>
      )}

      {modo === "otp-email" && (
        <div className="flex flex-col gap-2.5">
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <button className="btn btn-primary btn-block" disabled={enviando || !email.includes("@")} onClick={enviarCodigo}>
            {enviando ? "Enviando…" : "Enviar código"}
          </button>
          <button className="btn btn-ghost self-center" style={{ fontSize: 12 }} onClick={() => { setError(null); setModo("password"); }}>
            Volver a contraseña
          </button>
        </div>
      )}

      {modo === "otp-codigo" && (
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
