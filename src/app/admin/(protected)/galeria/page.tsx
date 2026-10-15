import { getGaleria } from "@/lib/data/galeria";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GaleriaAdmin } from "@/components/admin/GaleriaAdmin";

export const revalidate = 0;

export default async function GaleriaAdminPage() {
  const secciones = await getGaleria();
  const total = secciones.reduce((n, s) => n + s.items.length, 0);
  return (
    <div>
      <AdminPageHeader
        title="Galería"
        subtitle={`${secciones.length} ${secciones.length === 1 ? "sección" : "secciones"} · ${total} ${total === 1 ? "elemento" : "elementos"}`}
      />
      <GaleriaAdmin secciones={secciones} />
    </div>
  );
}
