"use client";

function aICSFecha(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// RFC 5545 §3.3.11: en un valor TEXT hay que escapar la barra invertida, el
// punto y coma, la coma y los saltos de línea. Aquí importa de verdad: la
// dirección lleva comas siempre, y DESCRIPTION las lleva en cuanto se reservan
// dos servicios ("Corte, Barba"). Sin escapar, un cliente estricto parte el
// valor y se pierde media línea.
function aICSTexto(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function AccionesConfirmacion({
  titulo,
  descripcion,
  ubicacion,
  inicioISO,
  finISO,
}: {
  titulo: string;
  descripcion: string;
  ubicacion: string;
  inicioISO: string;
  finISO: string;
}) {
  const dates = `${aICSFecha(inicioISO)}/${aICSFecha(finISO)}`;
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    titulo
  )}&dates=${dates}&details=${encodeURIComponent(descripcion)}&location=${encodeURIComponent(ubicacion)}`;

  function descargarIcs() {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FG Hair Studio//Reservas//ES",
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}`,
      `DTSTAMP:${aICSFecha(new Date().toISOString())}`,
      `DTSTART:${aICSFecha(inicioISO)}`,
      `DTEND:${aICSFecha(finISO)}`,
      `SUMMARY:${aICSTexto(titulo)}`,
      `DESCRIPTION:${aICSTexto(descripcion)}`,
      `LOCATION:${aICSTexto(ubicacion)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cita-fg-barbershop.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-block" style={{ height: 44 }}>
        Añadir a Google Calendar
      </a>
      <button className="btn btn-ghost self-center" onClick={descargarIcs}>
        Descargar .ics
      </button>
    </>
  );
}
