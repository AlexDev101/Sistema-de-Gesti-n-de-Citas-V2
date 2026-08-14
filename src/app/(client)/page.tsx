import Image from "next/image";
import Link from "next/link";
import { getServiciosActivos } from "@/lib/data/servicios";
import { getBarbero, getConfiguracion, HORARIO_NEGOCIO } from "@/lib/data/negocio";
import { durTxt, eur } from "@/lib/format";

export const revalidate = 0;

export default async function LandingPage() {
  const [servicios, barbero, configuracion] = await Promise.all([
    getServiciosActivos(),
    getBarbero(),
    getConfiguracion(),
  ]);
  const destacados = servicios.slice(0, 5);

  return (
    <div className="flex flex-col gap-[26px] pt-[env(safe-area-inset-top)]">
      <div className="relative mb-1 h-[300px]">
        <Image
          src="/uploads/hero-local.jpeg"
          alt="Interior de la barbería"
          fill
          priority
          className="object-cover lighten"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--color-bg) 4%, color-mix(in srgb, var(--color-bg) 20%, transparent) 55%, transparent)",
          }}
        />
        <div className="pointer-events-none absolute right-5 bottom-[18px] left-5">
          <span
            className="text-[10px] tracking-[0.14em] uppercase"
            style={{ color: "var(--color-accent)" }}
          >
            Barbería · {configuracion?.ciudad}
          </span>
          <h2 className="mt-2 text-[30px] leading-tight text-balance">
            Corte y barba, cita en un minuto
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-[10px] px-5">
        <Link href="/reservar" className="btn btn-primary btn-block h-12 text-[15px]">
          Reservar cita
        </Link>
        <span
          className="text-center text-[11px]"
          style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}
        >
          Sin cuenta · cancelación gratuita 24 h antes
        </span>
      </div>

      <div className="flex flex-col gap-3 px-5">
        <h6 style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Servicios
        </h6>
        {destacados.map((s) => (
          <div
            key={s.id}
            className="flex items-baseline gap-[10px] border-b py-[9px]"
            style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}
          >
            <span className="text-sm">{s.nombre}</span>
            <span
              className="flex-1 border-b border-dotted"
              style={{ borderColor: "color-mix(in srgb, var(--color-text) 18%, transparent)" }}
            />
            <span
              className="text-[11px]"
              style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}
            >
              {durTxt(s.duracion_min)}
            </span>
            <span
              className="min-w-[52px] text-right text-sm"
              style={{ color: "var(--color-accent-300)" }}
            >
              {eur(s.precio_cents)}
            </span>
          </div>
        ))}
        <Link href="/reservar" className="btn btn-ghost self-start">
          Ver todos los servicios
        </Link>
      </div>

      {barbero && (
        <div className="flex flex-col gap-3.5 px-5">
          <h6 style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            El barbero
          </h6>
          <div className="flex flex-col gap-2">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-[10px]"
              style={{ background: "var(--color-surface)" }}
            >
              <Image
                src="/uploads/barbero-retrato.jpeg"
                alt={barbero.nombre}
                fill
                className="object-cover lighten"
              />
            </div>
            <span className="text-sm">{barbero.nombre}</span>
            <span
              className="-mt-1.5 text-[11px]"
              style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}
            >
              {barbero.rol}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 pb-5">
        <h6 style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Trabajos y horario
        </h6>
        <div
          className="relative h-[150px] overflow-hidden rounded-[10px]"
          style={{ background: "var(--color-surface)" }}
        >
          <Image
            src="/uploads/trabajo-reciente.jpeg"
            alt="Trabajo reciente"
            fill
            className="object-cover lighten"
          />
        </div>
        <p className="m-0 text-[13px] leading-relaxed">{configuracion?.direccion}</p>
        {configuracion?.telefono && (
          <a
            href={`tel:${configuracion.telefono.replace(/\s+/g, "")}`}
            className="text-[13px]"
            style={{ color: "var(--color-accent-300)" }}
          >
            {configuracion.telefono}
          </a>
        )}
        {HORARIO_NEGOCIO.map((h) => (
          <div
            key={h.dias}
            className="flex justify-between text-xs"
            style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}
          >
            <span>{h.dias}</span>
            <span>{h.horas}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
