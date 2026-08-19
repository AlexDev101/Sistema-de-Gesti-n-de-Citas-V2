"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClienteResumen } from "@/lib/actions/admin-clientes";
import { actualizarNotasCliente, getClientesResumen } from "@/lib/actions/admin-clientes";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import { getReservasCliente, type ReservaAgenda } from "@/lib/actions/admin-agenda";
import { eur } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const SEGMENTOS = ["Todos", "VIP", "Recurrente", "Nuevo", "En riesgo"];

export function ClientesClient({ clientesIniciales }: { clientesIniciales: ClienteResumen[] }) {
  const [clientes, setClientes] = useState(clientesIniciales);
  const [query, setQuery] = useState("");
  const [segmento, setSegmento] = useState("Todos");
  const [abierto, setAbierto] = useState<ClienteResumen | null>(null);

  const filtrados = useMemo(
    () =>
      clientes.filter(
        (c) =>
          (segmento === "Todos" || c.segmento === segmento) &&
          (query.trim() === "" ||
            c.nombre.toLowerCase().includes(query.toLowerCase()) ||
            c.telefono.includes(query))
      ),
    [clientes, query, segmento]
  );

  function exportarCsv() {
    const filas = [
      ["Nombre", "Teléfono", "Visitas", "Última visita", "Gasto total", "Segmento"],
      ...filtrados.map((c) => [
        c.nombre,
        c.telefono,
        String(c.visitas),
        c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString("es-ES") : "",
        (c.gasto_total_cents / 100).toFixed(2),
        c.segmento,
      ]),
    ];
    const csv = filas.map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <AdminPageHeader title="Clientes" subtitle={`${clientes.length} en total`} />
      <div className="flex flex-col gap-4">
        <div className="flex min-w-[760px] items-center gap-2.5">
          <input className="input" style={{ width: 260, flex: "none" }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o teléfono" />
          <div className="flex gap-1.5">
            {SEGMENTOS.map((s) => {
              const n = s === "Todos" ? clientes.length : clientes.filter((c) => c.segmento === s).length;
              const activo = segmento === s;
              return (
                <button
                  key={s}
                  onClick={() => setSegmento(s)}
                  className="rounded-lg px-3 py-1.5 text-xs"
                  style={{ border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-divider)"}`, color: activo ? "var(--color-accent)" : "var(--color-text)" }}
                >
                  {s} <span className="opacity-55">{n}</span>
                </button>
              );
            })}
          </div>
          <button className="btn btn-secondary ml-auto" onClick={exportarCsv}>Exportar CSV</button>
        </div>

        <table className="table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Cliente</th><th>Teléfono</th><th>Visitas</th><th>Última visita</th><th>Gasto total</th><th>Segmento</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => (
              <tr key={c.id} onClick={() => setAbierto(c)} style={{ cursor: "pointer" }}>
                <td>{c.nombre}</td>
                <td style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>{c.telefono}</td>
                <td>{c.visitas}</td>
                <td>{c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }) : "—"}</td>
                <td>{eur(c.gasto_total_cents)}</td>
                <td><span className="tag tag-accent">{c.segmento}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abierto && (
        <FichaCliente
          cliente={abierto}
          onClose={() => setAbierto(null)}
          onSaved={async () => setClientes(await getClientesResumen())}
        />
      )}
    </div>
  );
}

function FichaCliente({ cliente, onClose, onSaved }: { cliente: ClienteResumen; onClose: () => void; onSaved: () => void }) {
  const [notas, setNotas] = useState(cliente.notas_internas ?? "");
  const { aviso, guardando } = useAviso();
  const [historial, setHistorial] = useState<ReservaAgenda[] | null>(null);

  useEffect(() => {
    getReservasCliente(cliente.id).then(setHistorial);
  }, [cliente.id]);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline gap-2.5">
          <span className="dialog-title flex-1">{cliente.nombre}</span>
          <button className="btn btn-icon btn-secondary" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>
        <div className="flex gap-4 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
          <span>{cliente.telefono}</span>
          {cliente.email && <span>{cliente.email}</span>}
        </div>
        <div className="flex gap-2">
          <span className="tag tag-accent">{cliente.segmento}</span>
          <span className="tag tag-neutral">{cliente.visitas} visitas</span>
          <span className="tag tag-neutral">{eur(cliente.gasto_total_cents)}</span>
        </div>
        <div className="field">
          <label>Notas internas</label>
          <textarea className="input" value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={async () => { if (await guardando(actualizarNotasCliente(cliente.id, notas))) onSaved(); }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Historial</h6>
          {(historial ?? []).slice(0, 6).map((h) => (
            <div key={h.id} className="flex justify-between text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
              <span>{h.servicios.map((s) => s.nombre).join(", ")}</span>
              <span>{new Date(h.inicio).toLocaleDateString("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" })}</span>
            </div>
          ))}
          {historial?.length === 0 && <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 40%, transparent)" }}>Sin citas todavía.</span>}
        </div>
      </div>
      <AvisoHost aviso={aviso} />
    </div>
  );
}
