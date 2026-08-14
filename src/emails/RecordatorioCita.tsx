import { Text } from "@react-email/components";
import { EmailShell, Fila, COLORS } from "./shared";

export function RecordatorioCita({
  nombreCliente,
  cuando,
  servicios,
  direccion,
  nombreNegocio,
  gestionUrl,
}: {
  nombreCliente: string;
  cuando: string;
  servicios: string;
  direccion: string;
  nombreNegocio: string;
  gestionUrl: string;
}) {
  return (
    <EmailShell preview={`Recordatorio: mañana ${cuando}`} titulo="Tu cita es mañana" nombreNegocio={nombreNegocio} direccion={direccion}>
      <Text style={{ color: COLORS.text, fontSize: 14, margin: "0 0 14px" }}>Hola {nombreCliente}, un recordatorio de tu cita:</Text>
      <Fila etiqueta="Cuándo" valor={cuando} />
      <Fila etiqueta="Servicios" valor={servicios} />
      <Fila etiqueta="Dónde" valor={direccion} />
      <Text style={{ color: COLORS.text, fontSize: 13, marginTop: 16 }}>
        ¿No puedes venir?{" "}
        <a href={gestionUrl} style={{ color: COLORS.accent }}>
          Cancela o reprograma aquí
        </a>
      </Text>
    </EmailShell>
  );
}

export default RecordatorioCita;
