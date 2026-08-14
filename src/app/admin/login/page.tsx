import { getBarbero } from "@/lib/data/negocio";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { HalosMovil } from "@/components/ui/Halos";

export const revalidate = 0;

export default async function AdminLoginPage() {
  const barbero = await getBarbero();
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <HalosMovil />
      <div className="relative z-[1]">
        <AdminLoginForm necesitaClaim={!barbero?.user_id} />
      </div>
    </div>
  );
}
