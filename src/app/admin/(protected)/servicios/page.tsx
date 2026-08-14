import { getServiciosAdmin } from "@/lib/data/servicios";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ServiciosTable } from "@/components/admin/ServiciosTable";

export const revalidate = 0;

export default async function ServiciosAdminPage() {
  const servicios = await getServiciosAdmin();
  return (
    <div>
      <AdminPageHeader title="Servicios" subtitle={`${servicios.length} en el catálogo`} />
      <ServiciosTable servicios={servicios} />
    </div>
  );
}
