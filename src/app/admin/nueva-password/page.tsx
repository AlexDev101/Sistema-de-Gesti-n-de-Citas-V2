import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CambiarPassword } from "@/components/admin/CambiarPassword";
import { HalosFondo } from "@/components/ui/Halos";

// Fuera del grupo (protected) a propósito: aquí se llega desde el enlace del
// correo, no desde el panel. La sesión ya existe —la creó el callback al
// canjear el código— pero comprobarla aquí evita enseñar un formulario que
// fallaría al guardar.
export default async function NuevaPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login?error=caducado");

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6"
      style={{ background: "radial-gradient(1200px 600px at 15% -10%, #1d2033, #0f111c 60%)" }}
    >
      <HalosFondo />
      <div
        className="relative z-[1] flex w-full max-w-[420px] flex-col gap-4 rounded-[var(--radius-lg)] p-6"
        style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex flex-col gap-1">
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>Elige una contraseña nueva</span>
          <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Entrando como {data.user.email}. La anterior dejará de funcionar en cuanto guardes.
          </span>
        </div>
        <CambiarPassword />
        <a className="btn btn-ghost self-center" style={{ fontSize: 12 }} href="/admin/hoy">
          Ir al panel
        </a>
      </div>
    </div>
  );
}
