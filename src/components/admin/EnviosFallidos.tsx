"use client";

import { TZ } from "@/lib/format";
import { useRouter } from "next/navigation";
import { marcarEnviosVistos, type EnvioFallido } from "@/lib/actions/admin-agenda";

const TIPOS: Record<string, string> = {
  "cliente:confirmacion": "confirmación al cliente",
  "cliente:cambio": "aviso de cambio al cliente",
  "cliente:cancelacion_negocio": "aviso de cancelación al cliente",
  "cliente:cancelacion_cliente": "confirmación de cancelación al cliente",
  "cliente:recordatorio": "recordatorio",
  "negocio:nueva": "aviso de cita nueva",
  "negocio:cancelada": "aviso de cancelación",
  "negocio:cambiada": "aviso de cambio",
};

// Avisos por email que no salieron (Resend caído, dominio sin verificar,
// email del cliente rechazado…). Antes solo quedaban en los registros del
// hosting y nadie se enteraba hasta que un cliente protestaba.
export function EnviosFallidos({ envios }: { envios: EnvioFallido[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] p-3.5" style={{ background: "color-mix(in srgb, var(--color-state-muchas) 14%, transparent)" }}>
      <span className="text-[13px]">
        {envios.length === 1 ? "1 email no se pudo enviar" : `${envios.length} emails no se pudieron enviar`}. Avisa a esos clientes por teléfono.
      </span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 75%, transparent)" }}>
        {envios.slice(0, 5).map((e) => (
          <li key={e.id}>
            {new Date(e.creado_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: TZ })} ·{" "}
            {TIPOS[e.tipo] ?? e.tipo}
            {e.detalle ? ` — ${e.detalle}` : ""}
          </li>
        ))}
      </ul>
      <button
        className="btn btn-ghost self-start"
        style={{ fontSize: 12 }}
        onClick={async () => {
          await marcarEnviosVistos();
          router.refresh();
        }}
      >
        Entendido
      </button>
    </div>
  );
}
