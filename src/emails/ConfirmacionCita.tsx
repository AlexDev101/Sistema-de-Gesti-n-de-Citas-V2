import { Text } from "@react-email/components";
import { EmailShell, Fila, COLORS } from "./shared";

export function ConfirmacionCita({
  nombreCliente,
  cuando,
  servicios,
  totalTxt,
  direccion,
  nombreNegocio,
  gestionUrl,
}: {
  nombreCliente: string;
  cuando: string;
  servicios: string;
  totalTxt: string;
  direccion: string;
  nombreNegocio: string;
  gestionUrl: string;
}) {
  return (
    <EmailShell preview={`Tu cita: ${cuando}`} titulo="Cita confirmada" nombreNegocio={nombreNegocio} direccion={direccion}>
      <Text style={{ color: COLORS.text, fontSize: 14, margin: "0 0 14px" }}>Hola {nombreCliente},</Text>
      <Fila etiqueta="Cuándo" valor={cuando} />
      <Fila etiqueta="Servicios" valor={servicios} />
      <Fila etiqueta="Total" valor={totalTxt} />
      <Fila etiqueta="Dónde" valor={direccion} />
      <Text style={{ color: COLORS.text, fontSize: 13, marginTop: 16 }}>
        Te escribiremos un recordatorio 24 h antes.{" "}
        <a href={gestionUrl} style={{ color: COLORS.accent }}>
          Gestionar mi cita
        </a>
      </Text>
    </EmailShell>
  );
}

export default ConfirmacionCita;
