"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Barbero, Configuracion } from "@/lib/data/negocio";
import { actualizarBarbero, actualizarConfiguracion, actualizarEmailAvisos } from "@/lib/actions/admin-ajustes";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_GALERIA, nombreArchivo } from "@/lib/galeria";
import { problemaLogo } from "@/lib/logo";

const muted = (pct: number) => `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`;

function Campo({ id, label, ayuda, children }: { id: string; label: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {ayuda && (
        <p className="m-0 mt-1 text-[11px]" style={{ color: muted(60) }}>
          {ayuda}
        </p>
      )}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-3.5 border-0 p-0">
      <legend className="mb-1 p-0 text-[13px] tracking-[0.08em] uppercase" style={{ color: muted(60) }}>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

// Todo lo que cambia de un negocio a otro se edita aquí, sin tocar código:
// nombre, barbero, contacto, marca (color y logo), reglas de reserva, avisos y
// datos legales.
export function AjustesForm({
  configuracion,
  barbero,
  emailAvisosInicial,
}: {
  configuracion: Configuracion;
  barbero: Barbero | null;
  emailAvisosInicial: string;
}) {
  const [nombre, setNombre] = useState(configuracion.nombre_negocio);
  const [ciudad, setCiudad] = useState(configuracion.ciudad);
  const [direccion, setDireccion] = useState(configuracion.direccion);
  const [telefono, setTelefono] = useState(configuracion.telefono ?? "");
  const [antMin, setAntMin] = useState(configuracion.antelacion_min_horas);
  const [antMax, setAntMax] = useState(configuracion.antelacion_max_dias);
  const [limite, setLimite] = useState(configuracion.horas_limite_cambio);
  const [politica, setPolitica] = useState(configuracion.politica_cancelacion);
  const [color, setColor] = useState(configuracion.color_acento ?? "");
  const [logo, setLogo] = useState(configuracion.logo_url ?? "");
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const inputLogo = useRef<HTMLInputElement>(null);
  const [titular, setTitular] = useState(configuracion.legal_titular ?? "");
  const [nif, setNif] = useState(configuracion.legal_nif ?? "");
  const [emailLegal, setEmailLegal] = useState(configuracion.legal_email ?? "");
  const [nombreBarbero, setNombreBarbero] = useState(barbero?.nombre ?? "");
  const [rolBarbero, setRolBarbero] = useState(barbero?.rol ?? "");
  const [emailAvisos, setEmailAvisos] = useState(emailAvisosInicial);
  const [guardandoEstado, setGuardandoEstado] = useState<"no" | "si" | "hecho">("no");
  const { aviso, avisar, cerrar } = useAviso();

  // El logo se sube al mismo almacenamiento que la galería (con la sesión del
  // admin) y su dirección se rellena sola; se publica al pulsar «Guardar cambios».
  async function subirLogo(archivos: FileList | null) {
    const archivo = archivos?.[0];
    if (!archivo) return;
    const problema = problemaLogo(archivo);
    if (problema) {
      avisar(problema, true);
      return;
    }
    setSubiendoLogo(true);
    const supabase = createClient();
    const ruta = `logo/${nombreArchivo(archivo.name)}`;
    const { error } = await supabase.storage.from(BUCKET_GALERIA).upload(ruta, archivo, {
      contentType: archivo.type,
      cacheControl: "31536000",
      upsert: false,
    });
    setSubiendoLogo(false);
    if (inputLogo.current) inputLogo.current.value = "";
    if (error) {
      avisar("No se pudo subir el logo. Puede que la sesión haya caducado: vuelve a entrar e inténtalo otra vez.", true);
      return;
    }
    setLogo(supabase.storage.from(BUCKET_GALERIA).getPublicUrl(ruta).data.publicUrl);
    avisar("Logo subido. Pulsa «Guardar cambios» para publicarlo en la portada.");
  }

  async function guardar() {
    setGuardandoEstado("si");
    const resultados = await Promise.all([
      actualizarConfiguracion(configuracion.id, {
        nombre_negocio: nombre.trim(),
        ciudad: ciudad.trim(),
        direccion: direccion.trim(),
        telefono: telefono.trim() || null,
        antelacion_min_horas: antMin,
        antelacion_max_dias: antMax,
        horas_limite_cambio: limite,
        politica_cancelacion: politica,
        color_acento: color.trim() || null,
        logo_url: logo.trim() || null,
        legal_titular: titular.trim() || null,
        legal_nif: nif.trim() || null,
        legal_email: emailLegal.trim() || null,
      }),
      barbero ? actualizarBarbero(barbero.id, { nombre: nombreBarbero, rol: rolBarbero }) : null,
      actualizarEmailAvisos(emailAvisos),
    ]);
    const error = resultados.find((r) => r && !r.ok);
    if (error && !error.ok) {
      setGuardandoEstado("no");
      avisar(error.error, true);
      return;
    }
    setGuardandoEstado("hecho");
    setTimeout(() => setGuardandoEstado("no"), 2000);
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-7">
      <Grupo titulo="Negocio">
        <Campo id="aj-nombre" label="Nombre del negocio">
          <input id="aj-nombre" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo id="aj-ciudad" label="Ciudad (se muestra en la portada)">
          <input id="aj-ciudad" className="input" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        </Campo>
        <Campo id="aj-dir" label="Dirección">
          <input id="aj-dir" className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </Campo>
        <Campo id="aj-tel" label="Teléfono">
          <input id="aj-tel" className="input" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </Campo>
      </Grupo>

      <Grupo titulo="Barbero">
        <div className="flex flex-col gap-3.5 sm:flex-row">
          <div className="flex-1">
            <Campo id="aj-barbero" label="Nombre">
              <input id="aj-barbero" className="input" value={nombreBarbero} onChange={(e) => setNombreBarbero(e.target.value)} />
            </Campo>
          </div>
          <div className="flex-1">
            <Campo id="aj-rol" label="Cargo">
              <input id="aj-rol" className="input" value={rolBarbero} onChange={(e) => setRolBarbero(e.target.value)} />
            </Campo>
          </div>
        </div>
      </Grupo>

      <Grupo titulo="Marca">
        <Campo id="aj-color" label="Color principal" ayuda="Vacío = el morado original. Se aplica a botones y acentos de la web y el panel.">
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              aria-label="Elegir color"
              value={color || "#9184d9"}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-12 flex-none cursor-pointer rounded-md border-0 bg-transparent p-0"
            />
            <input id="aj-color" className="input" value={color} placeholder="#9184d9" onChange={(e) => setColor(e.target.value)} />
          </div>
        </Campo>
        <Campo
          id="aj-logo"
          label="Logo"
          ayuda="Se muestra en grande sobre la foto de la portada. Mejor un PNG o SVG con fondo transparente y en colores claros (hasta 2 MB)."
        >
          <div className="flex flex-wrap items-center gap-3">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa de la URL elegida
              <img
                src={logo}
                alt="Logo actual"
                className="h-16 w-auto max-w-[200px] rounded-md object-contain p-2"
                style={{ background: "color-mix(in srgb, var(--color-bg) 92%, black)", border: "1px solid var(--color-divider)" }}
              />
            )}
            <input
              ref={inputLogo}
              type="file"
              accept="image/png,image/svg+xml,image/webp,image/jpeg"
              hidden
              onChange={(e) => subirLogo(e.target.files)}
            />
            <button type="button" className="btn btn-secondary" disabled={subiendoLogo} onClick={() => inputLogo.current?.click()}>
              {subiendoLogo ? "Subiendo…" : logo ? "Cambiar logo" : "Subir logo"}
            </button>
            {logo && (
              <button type="button" className="btn btn-ghost" disabled={subiendoLogo} onClick={() => setLogo("")}>
                Quitar
              </button>
            )}
          </div>
          <input
            id="aj-logo"
            className="input mt-2"
            value={logo}
            placeholder="o pega aquí una dirección https://…"
            aria-label="Dirección del logo"
            onChange={(e) => setLogo(e.target.value)}
          />
        </Campo>
      </Grupo>

      <Grupo titulo="Reservas">
        <div className="flex flex-col gap-3.5 sm:flex-row">
          <div className="flex-1">
            <Campo id="aj-antmin" label="Antelación mínima (horas)">
              <input id="aj-antmin" className="input" type="number" min={0} value={antMin} onChange={(e) => setAntMin(Number(e.target.value))} />
            </Campo>
          </div>
          <div className="flex-1">
            <Campo id="aj-antmax" label="Antelación máxima (días)">
              <input id="aj-antmax" className="input" type="number" min={1} value={antMax} onChange={(e) => setAntMax(Number(e.target.value))} />
            </Campo>
          </div>
        </div>
        <Campo
          id="aj-limite"
          label="El cliente puede cambiar o cancelar online hasta (horas antes)"
          ayuda="Pasado ese límite, la web le pide que llame. Se aplica en la base de datos, no solo en pantalla."
        >
          <input id="aj-limite" className="input" type="number" min={0} max={168} value={limite} onChange={(e) => setLimite(Number(e.target.value))} />
        </Campo>
        <Campo id="aj-politica" label="Política de cancelación (texto que ve el cliente)">
          <textarea id="aj-politica" className="input" value={politica} onChange={(e) => setPolitica(e.target.value)} />
        </Campo>
      </Grupo>

      <Grupo titulo="Avisos">
        <Campo
          id="aj-avisos"
          label="Email para avisos de citas"
          ayuda="Recibe un email cuando un cliente reserva, cancela o cambia su cita. Vacío = sin avisos. No es público."
        >
          <input id="aj-avisos" className="input" type="email" value={emailAvisos} onChange={(e) => setEmailAvisos(e.target.value)} placeholder="tu@email.com" />
        </Campo>
      </Grupo>

      <Grupo titulo="Datos legales">
        <p className="m-0 text-[11px]" style={{ color: muted(60) }}>
          Aparecen en el aviso de privacidad y el aviso legal. Mientras falten, esas páginas avisan de que son una plantilla.
        </p>
        <Campo id="aj-titular" label="Titular (nombre o razón social)">
          <input id="aj-titular" className="input" value={titular} onChange={(e) => setTitular(e.target.value)} />
        </Campo>
        <div className="flex flex-col gap-3.5 sm:flex-row">
          <div className="flex-1">
            <Campo id="aj-nif" label="NIF">
              <input id="aj-nif" className="input" value={nif} onChange={(e) => setNif(e.target.value)} />
            </Campo>
          </div>
          <div className="flex-1">
            <Campo id="aj-emaillegal" label="Email de contacto">
              <input id="aj-emaillegal" className="input" type="email" value={emailLegal} onChange={(e) => setEmailLegal(e.target.value)} />
            </Campo>
          </div>
        </div>
      </Grupo>

      <button className="btn btn-primary self-start" disabled={guardandoEstado === "si"} onClick={guardar}>
        {guardandoEstado === "si" ? "Guardando…" : guardandoEstado === "hecho" ? "Guardado" : "Guardar cambios"}
      </button>
      <AvisoHost aviso={aviso} onCerrar={cerrar} />
    </div>
  );
}
