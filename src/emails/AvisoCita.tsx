import { Text } from "@react-email/components";
import { EmailShell, Fila, COLORS } from "./shared";

// Plantilla común para los avisos que no son la confirmación ni el
// recordatorio: cita cambiada o cancelada (al cliente) y avisos al negocio
// (cita nueva, cancelada o cambiada por el cliente).
export function AvisoCita({
  preview,
  titulo,
  saludo,
  filas,
  texto,
  enlace,
  nombreNegocio,
  direccion,
}: {
  preview: string;
  titulo: string;
  saludo?: string;
  filas: { etiqueta: string; valor: string }[];
  texto?: string;
  enlace?: { href: string; label: string };
  nombreNegocio: string;
  direccion: string;
}) {
  return (
    <EmailShell preview={preview} titulo={titulo} nombreNegocio={nombreNegocio} direccion={direccion}>
      {saludo && <Text style={{ color: COLORS.text, fontSize: 14, margin: "0 0 14px" }}>{saludo}</Text>}
      {filas.map((f) => (
        <Fila key={f.etiqueta} etiqueta={f.etiqueta} valor={f.valor} />
      ))}
      {(texto || enlace) && (
        <Text style={{ color: COLORS.text, fontSize: 13, marginTop: 16 }}>
          {texto}
          {texto && enlace ? " " : null}
          {enlace && (
            <a href={enlace.href} style={{ color: COLORS.accent }}>
              {enlace.label}
            </a>
          )}
        </Text>
      )}
    </EmailShell>
  );
}

export default AvisoCita;
