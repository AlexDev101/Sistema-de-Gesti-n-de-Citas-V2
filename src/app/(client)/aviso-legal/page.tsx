import Link from "next/link";
import { getConfiguracion } from "@/lib/data/negocio";
import { PaginaLegal, Seccion } from "@/components/client/PaginaLegal";

export const revalidate = 0;
export const metadata = { title: "Aviso legal" };

// PLANTILLA — revisar antes de publicar (LSSI-CE, art. 10). Ver privacidad/page.tsx.
export default async function AvisoLegalPage() {
  const c = await getConfiguracion();
  const completa = Boolean(c?.legal_titular && c?.legal_nif && c?.legal_email);

  return (
    <PaginaLegal titulo="Aviso legal" completa={completa}>
      <Seccion titulo="Titular de la web">
        <p className="m-0">
          {c?.legal_titular || "[Nombre o razón social]"} · NIF {c?.legal_nif || "[NIF]"}
          <br />
          {c?.direccion || "[Dirección]"}
          <br />
          {c?.legal_email || "[email]"}
          {c?.telefono ? ` · ${c.telefono}` : ""}
        </p>
      </Seccion>
      <Seccion titulo="Uso de la web">
        <p className="m-0">
          Esta web sirve para consultar los servicios de {c?.nombre_negocio || "el negocio"} y reservar cita. Los precios
          y horarios pueden cambiar; los que valen son los que ves al reservar.
        </p>
      </Seccion>
      <Seccion titulo="Cambios y cancelaciones">
        <p className="m-0">
          Puedes cambiar o cancelar tu cita desde el enlace de tu confirmación hasta {c?.horas_limite_cambio ?? 24} h
          antes. {c?.politica_cancelacion}
        </p>
      </Seccion>
      <Seccion titulo="Cookies">
        <p className="m-0">
          Solo usamos las cookies técnicas imprescindibles para que funcionen la reserva y el acceso a tu cuenta. No usamos
          cookies de publicidad ni de analítica.
        </p>
      </Seccion>
      <Seccion titulo="Datos personales">
        <p className="m-0">
          Consulta el <Link href="/privacidad">aviso de privacidad</Link>.
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
