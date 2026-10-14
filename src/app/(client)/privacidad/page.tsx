import { getConfiguracion } from "@/lib/data/negocio";
import { PaginaLegal, Seccion } from "@/components/client/PaginaLegal";

export const revalidate = 0;
export const metadata = { title: "Aviso de privacidad" };

// PLANTILLA — revisar antes de publicar. Es un texto genérico para un negocio
// de citas en España (RGPD y LOPDGDD). Cada comprador debe completar sus datos
// en Ajustes y, si tiene dudas, que lo revise un asesor: no es asesoramiento
// legal.
export default async function PrivacidadPage() {
  const c = await getConfiguracion();
  const titular = c?.legal_titular || "[Nombre o razón social del titular]";
  const nif = c?.legal_nif || "[NIF]";
  const email = c?.legal_email || "[email de contacto]";
  const completa = Boolean(c?.legal_titular && c?.legal_nif && c?.legal_email);

  return (
    <PaginaLegal titulo="Aviso de privacidad" completa={completa}>
      <Seccion titulo="Responsable">
        <p className="m-0">
          {titular} ({nif}), con domicilio en {c?.direccion || "[dirección]"}, es responsable de los datos que nos das
          al reservar ({c?.nombre_negocio || "el negocio"}). Contacto: {email}
          {c?.telefono ? ` · ${c.telefono}` : ""}.
        </p>
      </Seccion>
      <Seccion titulo="Qué datos tratamos y para qué">
        <p className="m-0">
          Nombre, teléfono y, si nos lo das, email. Los usamos solo para gestionar tu cita: confirmarla, recordártela,
          avisarte si cambia y llevar el historial de tus visitas (incluida la tarjeta de fidelización).
        </p>
        <p className="m-0">No los usamos para publicidad ni los vendemos o cedemos a terceros.</p>
      </Seccion>
      <Seccion titulo="Base legal">
        <p className="m-0">
          Tu consentimiento al reservar y la gestión de la cita que nos pides (art. 6.1.a y 6.1.b del RGPD).
        </p>
      </Seccion>
      <Seccion titulo="Cuánto tiempo los guardamos">
        <p className="m-0">
          Mientras seas cliente y, después, el tiempo que exijan las obligaciones legales (por ejemplo, fiscales). Puedes
          pedir que los borremos antes.
        </p>
      </Seccion>
      <Seccion titulo="Quién más los ve">
        <p className="m-0">
          Proveedores que nos prestan el servicio técnico y actúan por nuestra cuenta: alojamiento de la web y de la base
          de datos (Supabase, Netlify), envío de emails (Resend) y protección contra reservas automáticas (Cloudflare
          Turnstile). Algunos pueden tratar datos fuera del Espacio Económico Europeo con las garantías que exige el RGPD.
        </p>
      </Seccion>
      <Seccion titulo="Tus derechos">
        <p className="m-0">
          Puedes acceder a tus datos, corregirlos, borrarlos, oponerte o limitar su uso, y pedir su portabilidad,
          escribiendo a {email}. Si tienes cuenta, puedes borrar tus datos tú mismo desde «Mi cuenta». También puedes
          reclamar ante la Agencia Española de Protección de Datos (aepd.es).
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
