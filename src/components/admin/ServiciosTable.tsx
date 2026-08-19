"use client";

import { useRouter } from "next/navigation";
import { CaretUp, CaretDown } from "@phosphor-icons/react/ssr";
import type { Servicio } from "@/lib/servicios-shared";
import { durTxt } from "@/lib/format";
import { actualizarServicio, crearServicio, duplicarServicio, moverServicio } from "@/lib/actions/admin-servicios";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import type { Resultado } from "@/lib/actions/resultado";

// La base exige que la duración cuadre con la rejilla de 30 min
// (servicios_duracion_min_check), así que se ofrece una lista cerrada en vez
// de un campo libre que acabaría en un error de constraint.
const DURACIONES = [30, 60, 90, 120, 150, 180];

export function ServiciosTable({ servicios }: { servicios: Servicio[] }) {
  const router = useRouter();
  const { aviso, guardando } = useAviso();

  async function aplicar(accion: Promise<Resultado>) {
    if (await guardando(accion)) router.refresh();
  }

  async function guardar(id: string, cambios: Parameters<typeof actualizarServicio>[1]) {
    await aplicar(actualizarServicio(id, cambios));
  }

  return (
    <div className="flex max-w-[860px] flex-col gap-3">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 50 }}></th>
            <th>Servicio</th>
            <th>Categoría</th>
            <th>Duración</th>
            <th>Precio</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((s, i) => (
            <tr key={s.id}>
              <td>
                <div className="flex gap-0.5">
                  <button aria-label="Subir" disabled={i === 0} onClick={() => aplicar(moverServicio(s.id, s.orden, -1))}>
                    <CaretUp size={12} />
                  </button>
                  <button aria-label="Bajar" disabled={i === servicios.length - 1} onClick={() => aplicar(moverServicio(s.id, s.orden, 1))}>
                    <CaretDown size={12} />
                  </button>
                </div>
              </td>
              <td>
                <input
                  defaultValue={s.nombre}
                  className="input"
                  style={{ minHeight: 30, border: "1px solid transparent", background: "transparent" }}
                  onBlur={(e) => e.target.value !== s.nombre && guardar(s.id, { nombre: e.target.value })}
                />
              </td>
              <td><span className="tag tag-neutral">{s.categoria}</span></td>
              <td>
                <select
                  className="input"
                  aria-label={`Duración de ${s.nombre}`}
                  value={s.duracion_min}
                  style={{ minHeight: 30, width: 92, border: "1px solid transparent", background: "transparent" }}
                  onChange={(e) => guardar(s.id, { duracion_min: Number(e.target.value) })}
                >
                  {(DURACIONES.includes(s.duracion_min) ? DURACIONES : [...DURACIONES, s.duracion_min].sort((a, b) => a - b)).map((d) => (
                    <option key={d} value={d}>{durTxt(d)}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  defaultValue={(s.precio_cents / 100).toString()}
                  type="number"
                  className="input"
                  style={{ minHeight: 30, width: 70, border: "1px solid transparent", background: "transparent" }}
                  min={0}
                  onBlur={(e) => {
                    const cents = Math.round(Number(e.target.value) * 100);
                    if (Number.isNaN(cents) || cents < 0) {
                      e.target.value = (s.precio_cents / 100).toString();
                      return;
                    }
                    if (cents !== s.precio_cents) guardar(s.id, { precio_cents: cents });
                  }}
                />
                €
              </td>
              <td>
                <button
                  onClick={() => guardar(s.id, { activo: !s.activo })}
                  style={{
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: `1px solid ${s.activo ? "var(--color-accent)" : "var(--color-divider)"}`,
                    background: "transparent",
                    color: s.activo ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 55%, transparent)",
                  }}
                >
                  {s.activo ? "Activo" : "Inactivo"}
                </button>
              </td>
              <td style={{ textAlign: "right" }}>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => aplicar(duplicarServicio(s.id))}>
                  Duplicar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-secondary self-start" onClick={() => aplicar(crearServicio())}>
        Añadir servicio
      </button>
      <AvisoHost aviso={aviso} />
    </div>
  );
}
