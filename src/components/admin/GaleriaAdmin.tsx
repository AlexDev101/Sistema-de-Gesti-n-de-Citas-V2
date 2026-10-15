"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  FilmStrip,
  LinkSimple,
  Plus,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react/ssr";
import { createClient } from "@/lib/supabase/client";
import {
  BUCKET_GALERIA,
  MAX_FOTO_MB,
  MAX_VIDEO_MB,
  enlaceVideoValido,
  nombreArchivo,
  problemaArchivo,
  tipoDeArchivo,
  youtubeId,
  type GaleriaItem,
  type GaleriaSeccion,
} from "@/lib/galeria";
import {
  actualizarItem,
  borrarItem,
  borrarSeccion,
  crearItem,
  crearSeccion,
  descartarSubida,
  moverItem,
  moverSeccion,
  renombrarSeccion,
} from "@/lib/actions/admin-galeria";
import { AvisoHost, useAviso } from "@/components/admin/Aviso";
import { Dialogo } from "@/components/ui/Dialogo";
import type { Resultado } from "@/lib/actions/resultado";

const muted = (pct: number) => `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`;

type Confirmacion = { titulo: string; texto: string; accion: () => Promise<Resultado> } | null;

// Secciones con fotos y vídeos que la portada enseña en «Trabajos y Cortes».
// Las fotos y vídeos se suben directamente al bucket `galeria` de Supabase con
// la sesión del admin (RLS es_admin()); luego se guarda el registro.
export function GaleriaAdmin({ secciones }: { secciones: GaleriaSeccion[] }) {
  const router = useRouter();
  const { aviso, avisar, guardando, cerrar } = useAviso();
  const [nueva, setNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);

  async function aplicar(accion: Promise<Resultado>, exito?: string) {
    const ok = await guardando(accion, exito);
    if (ok) router.refresh();
    return ok;
  }

  async function anadirSeccion(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    const ok = await aplicar(crearSeccion(nueva), "Sección creada");
    setCreando(false);
    if (ok) setNueva("");
  }

  return (
    <div className="flex max-w-[960px] flex-col gap-5">
      <p className="m-0 text-[13px] leading-relaxed" style={{ color: muted(65) }}>
        Organiza tus trabajos por secciones (por ejemplo «Degradados», «Barba» o «Niños»). Se muestran en la portada,
        en «Trabajos y Cortes», en el mismo orden que aquí. Fotos hasta {MAX_FOTO_MB} MB y vídeos hasta {MAX_VIDEO_MB} MB,
        o un enlace de YouTube.
      </p>

      <form onSubmit={anadirSeccion} className="flex flex-wrap items-center gap-2">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Nombre de la nueva sección"
          aria-label="Nombre de la nueva sección"
          value={nueva}
          maxLength={60}
          onChange={(e) => setNueva(e.target.value)}
        />
        <button className="btn btn-primary" disabled={creando || !nueva.trim()}>
          <Plus size={14} /> {creando ? "Creando…" : "Añadir sección"}
        </button>
      </form>

      {secciones.length === 0 && (
        <div className="card" style={{ alignItems: "flex-start" }}>
          <span className="card-title">Aún no hay secciones</span>
          <p className="card-body">Crea la primera arriba y sube tus fotos o vídeos. Mientras esté vacía, la portada no muestra la galería.</p>
        </div>
      )}

      {secciones.map((s, i) => (
        <SeccionCard
          key={s.id}
          seccion={s}
          secciones={secciones}
          primera={i === 0}
          ultima={i === secciones.length - 1}
          aplicar={aplicar}
          avisar={avisar}
          pedirConfirmacion={setConfirmar}
        />
      ))}

      {confirmar && (
        <ConfirmarDialogo
          confirmacion={confirmar}
          onClose={() => setConfirmar(null)}
          aplicar={aplicar}
        />
      )}
      <AvisoHost aviso={aviso} onCerrar={cerrar} />
    </div>
  );
}

function ConfirmarDialogo({
  confirmacion,
  onClose,
  aplicar,
}: {
  confirmacion: NonNullable<Confirmacion>;
  onClose: () => void;
  aplicar: (a: Promise<Resultado>, exito?: string) => Promise<boolean>;
}) {
  const [enCurso, setEnCurso] = useState(false);
  return (
    <Dialogo titulo={confirmacion.titulo} onClose={onClose}>
      <p className="dialog-body m-0">{confirmacion.texto}</p>
      <div className="dialog-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={enCurso}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          style={{ color: "var(--color-state-alta)", borderColor: "var(--color-state-alta)" }}
          disabled={enCurso}
          onClick={async () => {
            setEnCurso(true);
            await aplicar(confirmacion.accion(), "Borrado");
            setEnCurso(false);
            onClose();
          }}
        >
          {enCurso ? "Borrando…" : "Borrar"}
        </button>
      </div>
    </Dialogo>
  );
}

function SeccionCard({
  seccion,
  secciones,
  primera,
  ultima,
  aplicar,
  avisar,
  pedirConfirmacion,
}: {
  seccion: GaleriaSeccion;
  secciones: GaleriaSeccion[];
  primera: boolean;
  ultima: boolean;
  aplicar: (a: Promise<Resultado>, exito?: string) => Promise<boolean>;
  avisar: (msg: string, err?: boolean) => void;
  pedirConfirmacion: (c: Confirmacion) => void;
}) {
  const router = useRouter();
  const inputArchivos = useRef<HTMLInputElement>(null);
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(null);
  const [enlaceAbierto, setEnlaceAbierto] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [tituloEnlace, setTituloEnlace] = useState("");

  async function subir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    const lista = Array.from(archivos);
    const problemas = lista.map(problemaArchivo).filter((p): p is string => !!p);
    const validos = lista.filter((f) => !problemaArchivo(f));
    if (problemas.length) avisar(problemas[0] + (problemas.length > 1 ? ` (y ${problemas.length - 1} más)` : ""), true);
    if (validos.length === 0) return;

    const supabase = createClient();
    let subidos = 0;
    let fallos = 0;
    setProgreso({ hecho: 0, total: validos.length });
    for (const archivo of validos) {
      const tipo = tipoDeArchivo(archivo.type)!;
      const ruta = `${seccion.id}/${nombreArchivo(archivo.name)}`;
      const { error } = await supabase.storage.from(BUCKET_GALERIA).upload(ruta, archivo, {
        contentType: archivo.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) {
        fallos++;
      } else {
        const url = supabase.storage.from(BUCKET_GALERIA).getPublicUrl(ruta).data.publicUrl;
        const res = await crearItem({ seccionId: seccion.id, tipo, url });
        if (res.ok) subidos++;
        else {
          fallos++;
          await descartarSubida(url);
        }
      }
      setProgreso({ hecho: subidos + fallos, total: validos.length });
    }
    setProgreso(null);
    if (inputArchivos.current) inputArchivos.current.value = "";
    if (fallos) {
      avisar(
        subidos
          ? `Se subieron ${subidos}, pero ${fallos} no. Puede que la sesión haya caducado o que el archivo sea demasiado grande.`
          : "No se pudo subir. Puede que la sesión haya caducado: vuelve a entrar e inténtalo otra vez.",
        true
      );
    } else {
      avisar(subidos === 1 ? "Subido" : `${subidos} archivos subidos`);
    }
    router.refresh();
  }

  async function anadirEnlace(e: React.FormEvent) {
    e.preventDefault();
    if (!enlaceVideoValido(enlace)) {
      avisar("Pega un enlace de YouTube o de un archivo .mp4 / .webm que empiece por https://", true);
      return;
    }
    const ok = await aplicar(crearItem({ seccionId: seccion.id, tipo: "video", url: enlace, titulo: tituloEnlace }), "Vídeo añadido");
    if (ok) {
      setEnlace("");
      setTituloEnlace("");
      setEnlaceAbierto(false);
    }
  }

  const subiendo = progreso !== null;

  return (
    <section
      className="flex flex-col gap-3.5 rounded-[var(--radius-md)] p-3.5 md:p-4"
      style={{ background: "var(--color-surface)" }}
      aria-label={`Sección ${seccion.nombre}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5">
          <button className="btn btn-icon" aria-label="Subir sección" disabled={primera} onClick={() => aplicar(moverSeccion(seccion.id, -1))}>
            <CaretUp size={14} />
          </button>
          <button className="btn btn-icon" aria-label="Bajar sección" disabled={ultima} onClick={() => aplicar(moverSeccion(seccion.id, 1))}>
            <CaretDown size={14} />
          </button>
        </div>
        <input
          key={seccion.nombre}
          defaultValue={seccion.nombre}
          aria-label="Nombre de la sección"
          maxLength={60}
          className="input min-w-0 flex-1"
          style={{ fontSize: 16, minHeight: 36, background: "transparent", border: "1px solid transparent" }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (!v) {
              e.target.value = seccion.nombre;
              return;
            }
            if (v !== seccion.nombre) aplicar(renombrarSeccion(seccion.id, v), "Nombre guardado");
          }}
        />
        <span className="text-xs" style={{ color: muted(55) }}>
          {seccion.items.length} {seccion.items.length === 1 ? "elemento" : "elementos"}
        </span>
        <button
          className="btn btn-icon"
          aria-label={`Borrar la sección ${seccion.nombre}`}
          onClick={() =>
            pedirConfirmacion({
              titulo: "Borrar sección",
              texto:
                seccion.items.length > 0
                  ? `Se borrará «${seccion.nombre}» con sus ${seccion.items.length} fotos y vídeos. No se puede deshacer.`
                  : `Se borrará la sección «${seccion.nombre}».`,
              accion: () => borrarSeccion(seccion.id),
            })
          }
        >
          <Trash size={15} />
        </button>
      </div>

      {seccion.items.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {seccion.items.map((item, i) => (
            <ItemTile
              key={item.id}
              item={item}
              secciones={secciones}
              primero={i === 0}
              ultimo={i === seccion.items.length - 1}
              aplicar={aplicar}
              pedirConfirmacion={pedirConfirmacion}
            />
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[13px]" style={{ color: muted(55) }}>
          Sección vacía: no se muestra en la portada hasta que tenga algo.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputArchivos}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
          multiple
          hidden
          onChange={(e) => subir(e.target.files)}
        />
        <button className="btn btn-secondary" disabled={subiendo} onClick={() => inputArchivos.current?.click()}>
          <UploadSimple size={15} />
          {subiendo ? `Subiendo ${Math.min(progreso.hecho + 1, progreso.total)} de ${progreso.total}…` : "Subir fotos o vídeos"}
        </button>
        <button className="btn btn-ghost" disabled={subiendo} onClick={() => setEnlaceAbierto((v) => !v)} aria-expanded={enlaceAbierto}>
          <LinkSimple size={15} /> Vídeo de YouTube
        </button>
      </div>

      {enlaceAbierto && (
        <form onSubmit={anadirEnlace} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="input flex-[2]"
            type="url"
            inputMode="url"
            placeholder="https://youtu.be/… o https://…/video.mp4"
            aria-label="Enlace del vídeo"
            value={enlace}
            onChange={(e) => setEnlace(e.target.value)}
            autoFocus
          />
          <input
            className="input flex-1"
            placeholder="Título (opcional)"
            aria-label="Título del vídeo"
            maxLength={80}
            value={tituloEnlace}
            onChange={(e) => setTituloEnlace(e.target.value)}
          />
          <button className="btn btn-primary" disabled={!enlace.trim()}>
            Añadir
          </button>
        </form>
      )}
    </section>
  );
}

function ItemTile({
  item,
  secciones,
  primero,
  ultimo,
  aplicar,
  pedirConfirmacion,
}: {
  item: GaleriaItem;
  secciones: GaleriaSeccion[];
  primero: boolean;
  ultimo: boolean;
  aplicar: (a: Promise<Resultado>, exito?: string) => Promise<boolean>;
  pedirConfirmacion: (c: Confirmacion) => void;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <div
        className="relative aspect-[3/4] w-full overflow-hidden rounded-[10px]"
        style={{ background: "color-mix(in srgb, var(--color-bg) 70%, black)" }}
      >
        <Miniatura item={item} />
        {item.tipo === "video" && (
          <span
            className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]"
            style={{ background: "color-mix(in srgb, var(--color-bg) 70%, transparent)" }}
          >
            <FilmStrip size={11} /> Vídeo
          </span>
        )}
        <button
          className="btn btn-icon absolute top-1.5 right-1.5"
          style={{ width: 30, height: 30, background: "color-mix(in srgb, var(--color-bg) 70%, transparent)" }}
          aria-label="Borrar"
          onClick={() =>
            pedirConfirmacion({
              titulo: item.tipo === "foto" ? "Borrar foto" : "Borrar vídeo",
              texto: "Desaparecerá de la galería y de la portada. No se puede deshacer.",
              accion: () => borrarItem(item.id),
            })
          }
        >
          <Trash size={14} />
        </button>
      </div>
      <input
        key={item.titulo ?? ""}
        defaultValue={item.titulo ?? ""}
        placeholder="Título (opcional)"
        aria-label="Título"
        maxLength={80}
        className="input"
        style={{ minHeight: 30, fontSize: 12, background: "transparent" }}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v !== (item.titulo ?? "")) aplicar(actualizarItem(item.id, { titulo: v || null }));
        }}
      />
      <div className="flex items-center gap-1">
        <button className="btn btn-icon" style={{ width: 30, height: 30 }} aria-label="Mover antes" disabled={primero} onClick={() => aplicar(moverItem(item.id, -1))}>
          <CaretLeft size={13} />
        </button>
        <button className="btn btn-icon" style={{ width: 30, height: 30 }} aria-label="Mover después" disabled={ultimo} onClick={() => aplicar(moverItem(item.id, 1))}>
          <CaretRight size={13} />
        </button>
        {secciones.length > 1 && (
          <select
            className="input min-w-0 flex-1"
            style={{ minHeight: 30, fontSize: 12, paddingBlock: 0 }}
            aria-label="Mover a otra sección"
            value={item.seccion_id ?? ""}
            onChange={(e) => aplicar(actualizarItem(item.id, { seccionId: e.target.value }), "Movido")}
          >
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        )}
      </div>
    </li>
  );
}

function Miniatura({ item }: { item: GaleriaItem }) {
  if (item.tipo === "foto") {
    return <Image src={item.url} alt={item.titulo ?? "Foto de la galería"} fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" />;
  }
  const yt = youtubeId(item.url);
  if (yt) {
    return (
      <Image
        src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`}
        alt={item.titulo ?? "Vídeo de YouTube"}
        fill
        sizes="(min-width: 1024px) 220px, 45vw"
        className="object-cover"
      />
    );
  }
  // #t=0.1 hace que el navegador pinte el primer fotograma como portada.
  return <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />;
}
