import { createClient } from "@/lib/supabase/server";

export async function getEsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("es_admin");
  if (error) return false;
  return !!data;
}
