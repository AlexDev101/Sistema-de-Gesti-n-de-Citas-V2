"use server";

import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";

export async function actualizarConfiguracion(id: string, cambios: TablesUpdate<"configuracion">) {
  const supabase = await createClient();
  const { error } = await supabase.from("configuracion").update(cambios).eq("id", id);
  return { ok: !error, error: error?.message };
}
