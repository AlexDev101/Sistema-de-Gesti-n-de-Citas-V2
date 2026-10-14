// Color de marca configurable desde Ajustes. El diseño (nocturne.css) define
// el acento y su escala 100–900 como variables CSS; aquí se recalcula la
// escala a partir de un único color para que cada negocio tenga el suyo sin
// tocar el código. Solo se acepta #rrggbb: el valor acaba dentro de un
// <style>, así que cualquier otra cosa se descarta.

const HEX = /^#[0-9a-fA-F]{6}$/;

export function colorValido(color: string | null | undefined): color is string {
  return !!color && HEX.test(color);
}

export function cssMarca(color: string | null | undefined): string {
  if (!colorValido(color)) return "";
  const c = color.toLowerCase();
  const claro = (pct: number) => `color-mix(in srgb, ${c} ${pct}%, white)`;
  const oscuro = (pct: number) => `color-mix(in srgb, ${c} ${pct}%, black)`;
  const escala: Record<string, string> = {
    "": c,
    "-100": claro(8),
    "-200": claro(20),
    "-300": claro(42),
    "-400": claro(72),
    "-500": c,
    "-600": oscuro(80),
    "-700": oscuro(62),
    "-800": oscuro(44),
    "-900": oscuro(28),
  };
  const lineas = Object.entries(escala).flatMap(([sufijo, valor]) => [
    `--color-accent${sufijo}: ${valor};`,
    `--color-accent-2${sufijo}: ${valor};`,
  ]);
  return `:root{${lineas.join("")}}`;
}
