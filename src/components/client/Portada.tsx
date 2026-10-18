import Image from "next/image";

// Cabecera de la portada: la foto del local, el logo como enseña y, de remate,
// una franja con el dibujo del poste de barbero (en los colores de marca).
// No lleva eslogan: el logo (o, mientras no haya, el nombre del negocio) es el
// protagonista. Al cargar, las luces del local se encienden con un parpadeo
// corto y después aparece la enseña (ver .portada-luz / .portada-ensena en
// nocturne.css; se desactiva si el móvil pide menos movimiento).
export function Portada({ nombre, logoUrl }: { nombre: string; logoUrl: string | null }) {
  return (
    <header className="relative h-[360px] overflow-hidden">
      <Image
        src="/uploads/hero-local.jpeg"
        alt="Interior de la barbería"
        fill
        priority
        sizes="(min-width: 480px) 480px, 100vw"
        className="portada-luz lighten object-cover object-[50%_30%]"
      />

      {/* Velo inferior: funde la foto con el fondo y da contraste a la enseña. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 42% at 50% 86%, color-mix(in srgb, var(--color-bg) 88%, transparent), transparent 72%)," +
            "linear-gradient(to top, var(--color-bg) 3%, color-mix(in srgb, var(--color-bg) 60%, transparent) 30%, transparent 64%)",
        }}
      />

      <h1 className="portada-ensena absolute inset-x-0 bottom-7 m-0 flex justify-center px-8">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL elegida en Ajustes (puede ser SVG)
          <img
            src={logoUrl}
            alt={nombre}
            decoding="async"
            className="h-[96px] w-auto max-w-[280px] object-contain"
            style={{ filter: "drop-shadow(0 2px 14px rgb(0 0 0 / 0.55))" }}
          />
        ) : (
          <span
            className="max-w-[300px] text-center text-[30px] leading-[1.08] font-semibold tracking-[-0.01em] text-balance"
            style={{ textShadow: "0 2px 18px rgb(0 0 0 / 0.6)" }}
          >
            {nombre}
          </span>
        )}
      </h1>

      {/* Poste de barbero: rayas en diagonal con el acento de la marca. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--color-accent) 0 9px, var(--color-accent-200) 9px 18px, var(--color-accent-700) 18px 27px, var(--color-accent-200) 27px 36px)",
        }}
      />
    </header>
  );
}
