import { getBarbero, getConfiguracion } from "@/lib/data/negocio";
import { getEmailAvisos } from "@/lib/actions/admin-ajustes";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AjustesForm } from "@/components/admin/AjustesForm";
import { CambiarPassword } from "@/components/admin/CambiarPassword";

export const revalidate = 0;

export default async function AjustesPage() {
  const [configuracion, barbero, emailAvisos] = await Promise.all([getConfiguracion(), getBarbero(), getEmailAvisos()]);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <AdminPageHeader title="Ajustes" />
        {configuracion && <AjustesForm configuracion={configuracion} barbero={barbero} emailAvisosInicial={emailAvisos} />}
      </div>
      <div className="flex flex-col gap-3.5">
        <h6 style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Acceso admin</h6>
        <CambiarPassword />
      </div>
    </div>
  );
}
