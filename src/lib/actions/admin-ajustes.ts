"use server";

import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { resultado } from "@/lib/actions/resultado";

export async function actualizarConfiguracion(id: string, cambios: TablesUpdate<"configuracion">) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("configuracion").update(cambios).eq("id", id).select("id");
  return resultado(error, data);
}
