import { redirect } from "next/navigation";
import { getEsAdmin } from "@/lib/data/admin-auth";
import { getBarbero, getConfiguracion } from "@/lib/data/negocio";
import { HalosFondo } from "@/components/ui/Halos";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const esAdmin = await getEsAdmin();
  if (!esAdmin) redirect("/admin/login");
  const [barbero, configuracion] = await Promise.all([getBarbero(), getConfiguracion()]);

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden md:px-8 md:py-7"
      style={{ background: "radial-gradient(1200px 600px at 15% -10%, color-mix(in srgb, var(--color-bg) 80%, var(--color-accent-900)), color-mix(in srgb, var(--color-bg) 70%, black) 60%)" }}
    >
      <HalosFondo />
      <div className="relative z-[1] mx-auto w-full max-w-[1400px]">
        <div
          className="flex min-h-dvh flex-col overflow-hidden md:min-h-[840px] md:flex-row md:rounded-[var(--radius-lg)]"
          style={{
            background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
            backdropFilter: "blur(18px)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <AdminNav nombreBarbero={barbero?.nombre ?? "Admin"} nombreNegocio={configuracion?.nombre_negocio} />
          <main className="min-w-0 flex-1 overflow-auto p-4 pb-[calc(env(safe-area-inset-bottom)+24px)] md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
