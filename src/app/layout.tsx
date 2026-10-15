import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getConfiguracion } from "@/lib/data/negocio";
import { cssMarca } from "@/lib/marca";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Nombre, descripción y vista previa al compartir salen de Ajustes: antes el
// título era el de una barbería concreta escrito en el código.
export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfiguracion().catch(() => null);
  const nombre = config?.nombre_negocio || "Reserva tu cita";
  const descripcion = config?.ciudad
    ? `Reserva tu cita en ${nombre} (${config.ciudad}) en menos de un minuto.`
    : "Reserva tu cita en menos de un minuto.";
  const base = process.env.SITE_URL ?? process.env.URL;
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: nombre, template: `%s · ${nombre}` },
    description: descripcion,
    openGraph: {
      title: nombre,
      description: descripcion,
      type: "website",
      locale: "es_ES",
      images: ["/uploads/hero-local.jpeg"],
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const config = await getConfiguracion().catch(() => null);
  const marca = cssMarca(config?.color_acento);
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      {/* El color de marca va al principio de <body>, no en <head>: Netlify
          inyecta un comentario en <head> que no está en el HTML de React, y
          cualquier cosa nuestra ahí hacía fallar la hidratación (error #418):
          React rehacía la página en el cliente y se perdía la hoja de estilos.
          En <body> aplica igual y, al ir después de la hoja global, la pisa. */}
      <body className="min-h-full flex flex-col">
        {marca ? <style dangerouslySetInnerHTML={{ __html: marca }} /> : null}
        {children}
      </body>
    </html>
  );
}
