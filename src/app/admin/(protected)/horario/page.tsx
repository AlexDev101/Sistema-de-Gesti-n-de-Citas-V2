import { createClient } from "@/lib/supabase/server";
import { getCierres } from "@/lib/data/negocio";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HorarioEditor } from "@/components/admin/HorarioEditor";
import { CierresEditor } from "@/components/admin/CierresEditor";

export const revalidate = 0;

export default async function HorarioPage() {
  const supabase = await createClient();
  const [{ data }, cierres] = await Promise.all([
    supabase.from("horario_barbero").select("*").order("dia_semana"),
    getCierres(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <AdminPageHeader title="Horario" subtitle="Los huecos que ve el cliente, la agenda y la web salen de aquí" />
        <HorarioEditor franjas={data ?? []} />
      </div>
      <div className="flex flex-col gap-3">
        <h6 className="m-0" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Días cerrados (vacaciones, festivos)
        </h6>
        <CierresEditor cierres={cierres} />
      </div>
    </div>
  );
}
