import { getBarbero } from "@/lib/data/negocio";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { HalosMovil } from "@/components/ui/Halos";

export const revalidate = 0;

const MOTIVOS: Record<string, string> = {
  caducado: "Ese enlace no era válido o ya se había usado. Pide otro desde «He olvidado la contraseña».",
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const barbero = await getBarbero();
  const { error } = await searchParams;
  const motivo = typeof error === "string" ? MOTIVOS[error] : undefined;
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <HalosMovil />
      <div className="relative z-[1]">
        <AdminLoginForm necesitaClaim={!barbero?.user_id} motivo={motivo} />
      </div>
    </div>
  );
}
