import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const COLORS = {
  bg: "#161826",
  surface: "#232532",
  text: "#e9e9ed",
  muted: "#9397ab",
  accent: "#9184d9",
};

export function EmailShell({
  preview,
  titulo,
  nombreNegocio,
  direccion,
  children,
}: {
  preview: string;
  titulo: string;
  nombreNegocio: string;
  direccion: string;
  children: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: COLORS.bg, margin: 0, padding: "32px 0", fontFamily: "-apple-system, Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 420, margin: "0 auto", padding: "0 20px" }}>
          <Text style={{ color: COLORS.accent, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 8px" }}>
            {nombreNegocio}
          </Text>
          <Heading style={{ color: COLORS.text, fontSize: 24, fontWeight: 500, margin: "0 0 20px" }}>{titulo}</Heading>
          <Section style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 20 }}>{children}</Section>
          <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 24 }}>
            {nombreNegocio} · {direccion}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// display:flex no es fiable en clientes de correo (Gmail lo ignora al
// renderizar) — una tabla de dos columnas es el único layout de dos
// extremos que sobrevive en todos los clientes.
export function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
      <tbody>
        <tr>
          <td style={{ padding: "6px 0", borderBottom: "1px solid #ffffff14", color: COLORS.muted, fontSize: 12, textAlign: "left", verticalAlign: "top" }}>
            {etiqueta}
          </td>
          <td style={{ padding: "6px 0", borderBottom: "1px solid #ffffff14", color: COLORS.text, fontSize: 13, textAlign: "right", verticalAlign: "top" }}>
            {valor}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export { COLORS };
