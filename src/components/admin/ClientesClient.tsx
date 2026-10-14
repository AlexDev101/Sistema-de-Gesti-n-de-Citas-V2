"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClienteResumen, FidelizacionCliente } from "@/lib/actions/admin-clientes";
import {
  actualizarNotasCliente,
  anonimizarCliente,
  canjearFidelizacion,
  getClientesResumen,
  getFidelizacionClientes,
  importarClientes,
} from "@/lib/actions/admin-clientes";
import { clientesDesdeCsv, type ClienteImportado } from "@/lib/csv";
import { telHref, whatsappHref } from "@/lib/contacto";
import { Dialogo } from "@/components/ui/Dialogo";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import { getReservasCliente, type ReservaAgenda } from "@/lib/actions/admin-agenda";
import { eur } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const SEGMENTOS = ["Todos", "VIP", "Recurrente", "Nuevo", "En riesgo"];

export function ClientesClient({
  clientesIniciales,
  fidelizacionInicial,
}: {
  clientesIniciales: ClienteResumen[];
  fidelizacionInicial: FidelizacionCliente[];
}) {
  const [clientes, setClientes] = useState(clientesIniciales);
  const [fidelizacion, setFidelizacion] = useState(fidelizacionInicial);
  const [query, setQuery] = useState("");
  const [segmento, setSegmento] = useState("Todos");
  const [abierto, setAbierto] = useState<ClienteResumen | null>(null);
  const [importando, setImportando] = useState(false);

  async function recargar() {
    const [c, f] = await Promise.all([getClientesResumen(), getFidelizacionClientes()]);
    setClientes(c);
    setFidelizacion(f);
  }

  const sellosDe = (clienteId: string) => fidelizacion.find((f) => f.cliente_id === clienteId);

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
      ["Nombre", "Teléfono", "Email", "Visitas", "Última visita", "Gasto total", "Segmento", "Notas"],
      ...filtrados.map((c) => [
        c.nombre,
        c.telefono,
        c.email ?? "",
        String(c.visitas),
        c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString("es-ES") : "",
        (c.gasto_total_cents / 100).toFixed(2),
        c.segmento,
        c.notas_internas ?? "",
      ]),
    ];
    const csv = filas.map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    // BOM para que Excel abra bien las tildes.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
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
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            className="input w-full sm:w-[260px] sm:flex-none"
            aria-label="Buscar por nombre o teléfono"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
          />
          <div className="flex flex-wrap gap-1.5">
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
          <div className="ml-auto flex gap-2">
            <button className="btn btn-secondary" onClick={() => setImportando(true)}>Importar CSV</button>
            <button className="btn btn-secondary" onClick={exportarCsv}>Exportar CSV</button>
          </div>
        </div>

        {clientes.length === 0 && (
          <p className="m-0 text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
            Todavía no hay clientes. Si vienes de Booksy, Treatwell u otra agenda, exporta tus clientes a CSV y usa «Importar CSV».
          </p>
        )}

        <div className="overflow-x-auto">
        <table className="table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Cliente</th><th>Teléfono</th><th>Visitas</th><th>Última visita</th><th>Gasto total</th><th>Segmento</th><th>Fidelización</th>
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
                <td>
                  {sellosDe(c.id)?.puede_canjear ? (
                    <span className="tag tag-accent">Premio listo</span>
                  ) : (
                    <span style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                      {sellosDe(c.id)?.sellos_disponibles ?? 0}/10
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {importando && (
        <ImportarClientesDialog
          onClose={() => setImportando(false)}
          onImportado={async () => {
            await recargar();
          }}
        />
      )}

      {abierto && (
        <FichaCliente
          cliente={abierto}
          fidelizacion={sellosDe(abierto.id) ?? { cliente_id: abierto.id, sellos_disponibles: 0, puede_canjear: false }}
          onClose={() => setAbierto(null)}
          onSaved={recargar}
          onBorrado={async () => {
            setAbierto(null);
            await recargar();
          }}
        />
      )}
    </div>
  );
}

function FichaCliente({
  cliente,
  fidelizacion,
  onClose,
  onSaved,
  onBorrado,
}: {
  cliente: ClienteResumen;
  fidelizacion: FidelizacionCliente;
  onClose: () => void;
  onSaved: () => void;
  onBorrado: () => void;
}) {
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [notas, setNotas] = useState(cliente.notas_internas ?? "");
  const { aviso, guardando, avisar } = useAviso();
  const [historial, setHistorial] = useState<ReservaAgenda[] | null>(null);

  useEffect(() => {
    getReservasCliente(cliente.id).then(setHistorial);
  }, [cliente.id]);

  return (
    <Dialogo titulo={cliente.nombre} onClose={onClose} ancho={460}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
          <span>{cliente.telefono}</span>
          {cliente.email && <span className="break-all">{cliente.email}</span>}
        </div>
        {/^[+0-9]{9,}$/.test(cliente.telefono) && (
          <div className="flex gap-2">
            <a className="btn btn-secondary flex-1" href={telHref(cliente.telefono)}>Llamar</a>
            <a className="btn btn-secondary flex-1" href={whatsappHref(cliente.telefono)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </div>
        )}
        <div className="flex gap-2">
          <span className="tag tag-accent">{cliente.segmento}</span>
          <span className="tag tag-neutral">{cliente.visitas} visitas</span>
          <span className="tag tag-neutral">{eur(cliente.gasto_total_cents)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] p-3" style={{ background: "var(--color-bg)" }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Fidelización</span>
            <span className="text-sm">
              {Math.min(fidelizacion.sellos_disponibles, 10)}/10 sellos
              {fidelizacion.sellos_disponibles > 10 && ` (+${fidelizacion.sellos_disponibles - 10} de premios anteriores)`}
            </span>
          </div>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            disabled={!fidelizacion.puede_canjear}
            onClick={async () => {
              if (await guardando(canjearFidelizacion(cliente.id), "Premio canjeado")) onSaved();
            }}
          >
            Canjear premio
          </button>
        </div>

        <div className="field">
          <label htmlFor={`notas-cli-${cliente.id}`}>Notas internas</label>
          <textarea id={`notas-cli-${cliente.id}`} className="input" value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={async () => { if (await guardando(actualizarNotasCliente(cliente.id, notas))) onSaved(); }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Historial</h6>
          {(historial ?? []).slice(0, 6).map((h) => (
            <div key={h.id} className="flex justify-between text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
              <span>{h.servicios.map((s) => s.nombre).join(", ")}</span>
              <span>{new Date(h.inicio).toLocaleDateString("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" })}</span>
            </div>
          ))}
          {historial?.length === 0 && <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Sin citas todavía.</span>}
        </div>

        <div className="border-t pt-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
          {!confirmarBorrado ? (
            <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--color-state-alta)" }} onClick={() => setConfirmarBorrado(true)}>
              Borrar datos del cliente…
            </button>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
              <span>
                Para cuando un cliente pide que borres sus datos (RGPD). Se quitan nombre, teléfono, email y notas, y se
                cancelan sus citas pendientes. Sus citas pasadas siguen contando en las métricas, sin nombre. No se puede deshacer.
              </span>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => setConfirmarBorrado(false)}>Volver</button>
                <button
                  className="btn btn-primary"
                  style={{ color: "var(--color-state-alta)", borderColor: "var(--color-state-alta)" }}
                  onClick={async () => {
                    const res = await anonimizarCliente(cliente.id);
                    if (!res.ok) {
                      avisar(res.error, true);
                      return;
                    }
                    onBorrado();
                  }}
                >
                  Borrar definitivamente
                </button>
              </div>
            </div>
          )}
        </div>
      <AvisoHost aviso={aviso} />
    </Dialogo>
  );
}

function ImportarClientesDialog({ onClose, onImportado }: { onClose: () => void; onImportado: () => Promise<void> }) {
  const [filas, setFilas] = useState<ClienteImportado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function leer(fichero: File) {
    setError(null);
    setResultado(null);
    const texto = await fichero.text();
    const { clientes, columnasOk } = clientesDesdeCsv(texto);
    if (!columnasOk) {
      setFilas(null);
      setError("No encuentro las columnas de nombre y teléfono. La primera fila tiene que ser la cabecera (por ejemplo: Nombre, Teléfono, Email, Notas).");
      return;
    }
    setFilas(clientes);
  }

  async function importar() {
    if (!filas) return;
    setEnviando(true);
    const res = await importarClientes(filas);
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResultado(
      `${res.creados} clientes nuevos, ${res.existentes} ya existían (se ha completado su email si faltaba)` +
        (res.invalidos ? ` y ${res.invalidos} filas descartadas por no tener nombre o teléfono válido.` : ".")
    );
    setFilas(null);
    await onImportado();
  }

  return (
    <Dialogo titulo="Importar clientes" onClose={onClose} ancho={480}>
      <p className="m-0 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>
        Sube un CSV exportado de tu agenda anterior o de una hoja de cálculo. Hacen falta las columnas de nombre y
        teléfono; email y notas son opcionales. Los clientes que ya existen (mismo teléfono) no se modifican.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Fichero CSV"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) leer(f);
        }}
        className="text-xs"
      />
      {filas && (
        <div className="flex flex-col gap-1.5 text-xs">
          <span>{filas.length} filas leídas. Primeras:</span>
          {filas.slice(0, 5).map((f, i) => (
            <span key={i} style={{ color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>
              {f.nombre || "—"} · {f.telefono || "—"}
              {f.email ? ` · ${f.email}` : ""}
            </span>
          ))}
        </div>
      )}
      {error && <p role="alert" className="m-0 text-[13px]" style={{ color: "var(--color-state-alta)" }}>{error}</p>}
      {resultado && <p role="status" className="m-0 text-[13px]" style={{ color: "var(--color-state-libre)" }}>{resultado}</p>}
      <button className="btn btn-primary btn-block" disabled={!filas || filas.length === 0 || enviando} onClick={importar}>
        {enviando ? "Importando…" : filas ? `Importar ${filas.length} clientes` : "Elige un fichero"}
      </button>
    </Dialogo>
  );
}
