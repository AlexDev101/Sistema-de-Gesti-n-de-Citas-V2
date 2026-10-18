// Cuánto encaja un negocio como cliente de un sistema de citas, y por qué.
// Todo se deduce de datos públicos; cada punto tiene su motivo en claro para
// que se pueda discutir la lista en vez de fiarse de un número.

export const SEGMENTOS = {
  marketplace: "Reserva en una plataforma ajena",
  "sin-reserva-online": "Web propia sin reserva online",
  "sin-web": "Sin web propia",
  "herramienta-propia": "Ya tiene sistema de citas propio",
};

export function puntuar(lead, sitio) {
  const motivos = [];
  let puntos = 20;
  const tel = lead.telefonos[0] ?? null;
  const movil = lead.telefonos.find((t) => t.movil);
  const marketplace = sitio.plataformas.find((p) => p.tipo === "marketplace");
  const herramienta = sitio.plataformas.find((p) => p.tipo === "herramienta");
  const tieneWebPropia = !!lead.web && sitio.motivo !== "red-o-marketplace";

  let segmento;
  if (marketplace) {
    segmento = "marketplace";
    puntos += 30;
    motivos.push(`Reserva con ${marketplace.nombre}: puede querer su propia página de reservas`);
  } else if (herramienta) {
    segmento = "herramienta-propia";
    puntos -= 25;
    motivos.push(`Ya usa ${herramienta.nombre} para las citas`);
  } else if (tieneWebPropia && !sitio.textoReserva) {
    segmento = "sin-reserva-online";
    puntos += 25;
    motivos.push("Tiene web pero no se ve reserva online");
  } else if (tieneWebPropia) {
    segmento = "sin-reserva-online";
    puntos += 5;
    motivos.push("Tiene web y menciona reservas, pero no se detecta ninguna herramienta concreta");
  } else {
    segmento = "sin-web";
    puntos += 15;
    motivos.push("No tiene web propia");
  }

  if (movil) {
    puntos += 20;
    motivos.push("Móvil publicado (se le puede escribir por WhatsApp)");
  } else if (tel) {
    puntos += 10;
    motivos.push("Teléfono fijo publicado (se le puede llamar)");
  }
  if (sitio.whatsapp) {
    puntos += 10;
    motivos.push("Tiene WhatsApp en su web");
  }
  if (lead.instagram || sitio.instagram) {
    puntos += 5;
    motivos.push("Tiene Instagram");
  }

  const contactable = !!tel || !!sitio.whatsapp || !!(lead.instagram || sitio.instagram);
  if (!contactable) {
    puntos = Math.min(puntos, 10);
    motivos.push("Sin teléfono ni redes publicados: no hay forma directa de contactarle");
  }
  return { puntuacion: Math.max(0, Math.min(100, puntos)), segmento, motivos };
}
