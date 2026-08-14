import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HorarioEditor } from "@/components/admin/HorarioEditor";

export const revalidate = 0;

export default async function HorarioPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("horario_barbero").select("*").order("dia_semana");

  return (
    <div>
      <AdminPageHeader title="Horario del barbero" subtitle="Define los huecos que ve el cliente" />
      <HorarioEditor franjas={data ?? []} />
    </div>
  );
}
