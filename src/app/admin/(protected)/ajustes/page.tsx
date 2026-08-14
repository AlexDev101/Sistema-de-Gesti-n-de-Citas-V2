import { getConfiguracion } from "@/lib/data/negocio";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AjustesForm } from "@/components/admin/AjustesForm";
import { CambiarPassword } from "@/components/admin/CambiarPassword";

export const revalidate = 0;

export default async function AjustesPage() {
  const configuracion = await getConfiguracion();
  return (
    <div className="flex flex-col gap-8">
      <div>
        <AdminPageHeader title="Ajustes" />
        {configuracion && <AjustesForm configuracion={configuracion} />}
      </div>
      <div className="flex flex-col gap-3.5">
        <h6 style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Acceso admin</h6>
        <CambiarPassword />
      </div>
    </div>
  );
}
