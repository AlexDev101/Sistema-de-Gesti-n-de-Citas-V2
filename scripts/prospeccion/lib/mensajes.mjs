// Borradores para que los envíes TÚ, uno a uno, a quien tenga sentido. Sólo
// afirman lo que se ha visto en datos públicos y siempre dejan salir sin
// compromiso. No hay envío automático: eso sería prospección masiva no pedida.

const CIERRE = "Si te interesa te lo enseño en 10 minutos; si no, sin problema y no te molesto más.";

const PRODUCTO =
  "reservas desde el móvil con vuestra marca, recordatorio al cliente, cambios y cancelaciones online y un panel para llevar la agenda";

export function crearMensajes(lead, sitio, segmento, { nombre = "Alejandro", demo = "https://sgcitas.netlify.app" } = {}) {
  const negocio = lead.nombre;
  const saludo = `Hola, ¿qué tal? Soy ${nombre}.`;
  const ejemplo = `Aquí puedes ver uno funcionando: ${demo}.`;
  const plataforma = sitio.plataformas.find((p) => p.tipo === "marketplace")?.nombre;
  const herramienta = sitio.plataformas.find((p) => p.tipo === "herramienta")?.nombre;

  let whatsapp;
  let gancho;
  switch (segmento) {
    case "marketplace":
      whatsapp = `${saludo} Vi que en ${negocio} se reserva por ${plataforma}. Hago un sistema de citas propio para barberías: ${PRODUCTO}, sin depender de una plataforma. ${ejemplo} ${CIERRE}`;
      gancho = `vi que reserváis por ${plataforma} y hago un sistema de citas propio, con vuestra marca`;
      break;
    case "herramienta-propia":
      whatsapp = `${saludo} Vi que en ${negocio} usáis ${herramienta} para las citas. Hago sistemas de citas a medida para barberías, por si alguna vez queréis algo más propio: ${PRODUCTO}. ${ejemplo} Sin compromiso.`;
      gancho = `vi que usáis ${herramienta} y hago sistemas de citas a medida para barberías`;
      break;
    case "sin-web":
      whatsapp = `${saludo} No encontré una web con reservas de ${negocio}. Hago sistemas de citas para barberías: ${PRODUCTO}. ${ejemplo} ${CIERRE}`;
      gancho = "no encontré una web con reservas y hago sistemas de citas para barberías";
      break;
    default:
      whatsapp = `${saludo} Estuve viendo la web de ${negocio} y no vi forma de reservar cita online. Hago un sistema de citas para barberías: ${PRODUCTO}. ${ejemplo} ${CIERRE}`;
      gancho = "estuve viendo vuestra web y no vi reserva online; hago sistemas de citas para barberías";
  }

  const llamada = `Buenas, ¿hablo con ${negocio}? Me llamo ${nombre}, te robo un minuto: ${gancho}. ¿Te puedo mandar un ejemplo por WhatsApp para que lo veas cuando puedas? Si no es buen momento, no pasa nada.`;
  return { whatsapp, llamada };
}
