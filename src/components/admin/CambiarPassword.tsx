"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CambiarPassword() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);

  async function guardar() {
    setMensaje(null);
    if (password.length < 8) {
      setMensaje({ texto: "La contraseña debe tener al menos 8 caracteres.", error: true });
      return;
    }
    if (password !== confirmar) {
      setMensaje({ texto: "Las contraseñas no coinciden.", error: true });
      return;
    }
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setGuardando(false);
    if (error) { setMensaje({ texto: error.message, error: true }); return; }
    setPassword("");
    setConfirmar("");
    setMensaje({ texto: "Contraseña actualizada." });
  }

  return (
    <div className="flex max-w-[520px] flex-col gap-3.5">
      <div className="field">
        <label>Nueva contraseña</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
      </div>
      <div className="field">
        <label>Repetir contraseña</label>
        <input className="input" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
      </div>
      <button className="btn btn-secondary self-start" disabled={guardando} onClick={guardar}>
        {guardando ? "Guardando…" : "Cambiar contraseña"}
      </button>
      {mensaje && (
        <p className="m-0 text-[13px]" style={{ color: mensaje.error ? "var(--color-state-alta)" : "var(--color-accent-300)" }}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
