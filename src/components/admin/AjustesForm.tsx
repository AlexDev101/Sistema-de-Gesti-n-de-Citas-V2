"use client";

import { useState } from "react";
import type { Configuracion } from "@/lib/data/negocio";
import { actualizarConfiguracion } from "@/lib/actions/admin-ajustes";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";

export function AjustesForm({ configuracion }: { configuracion: Configuracion }) {
  const [nombre, setNombre] = useState(configuracion.nombre_negocio);
  const [ciudad, setCiudad] = useState(configuracion.ciudad);
  const [direccion, setDireccion] = useState(configuracion.direccion);
  const [telefono, setTelefono] = useState(configuracion.telefono ?? "");
  const [antMin, setAntMin] = useState(configuracion.antelacion_min_horas);
  const [antMax, setAntMax] = useState(configuracion.antelacion_max_dias);
  const [politica, setPolitica] = useState(configuracion.politica_cancelacion);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const { aviso, guardando: conAviso } = useAviso();

  async function guardar() {
    setGuardando(true);
    // Solo se anuncia "Guardado" si de verdad se escribió: antes se mostraba
    // igualmente aunque la escritura no hubiera tocado ninguna fila.
    const ok = await conAviso(
      actualizarConfiguracion(configuracion.id, {
        nombre_negocio: nombre,
        ciudad,
        direccion,
        telefono,
        antelacion_min_horas: antMin,
        antelacion_max_dias: antMax,
        politica_cancelacion: politica,
      })
    );
    setGuardando(false);
    if (!ok) return;
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  return (
    <div className="flex max-w-[520px] flex-col gap-3.5">
      <div className="field">
        <label>Nombre del negocio</label>
        <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="field">
        <label>Ciudad (se muestra en la landing)</label>
        <input className="input" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
      </div>
      <div className="field">
        <label>Dirección</label>
        <input className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
      </div>
      <div className="field">
        <label>Teléfono</label>
        <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <div className="field">
        <label>Antelación mínima de reserva (horas)</label>
        <input className="input" type="number" value={antMin} onChange={(e) => setAntMin(Number(e.target.value))} />
      </div>
      <div className="field">
        <label>Antelación máxima (días)</label>
        <input className="input" type="number" value={antMax} onChange={(e) => setAntMax(Number(e.target.value))} />
      </div>
      <div className="field">
        <label>Política de cancelación</label>
        <textarea className="input" value={politica} onChange={(e) => setPolitica(e.target.value)} />
      </div>
      <button className="btn btn-primary self-start" disabled={guardando} onClick={guardar}>
        {guardando ? "Guardando…" : guardado ? "Guardado" : "Guardar cambios"}
      </button>
      <AvisoHost aviso={aviso} />
    </div>
  );
}
