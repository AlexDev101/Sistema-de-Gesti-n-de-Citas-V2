"use server";

import { createClient } from "@/lib/supabase/server";

export type ClienteResumen = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  notas_internas: string | null;
  visitas: number;
  ultima_visita: string | null;
  gasto_total_cents: number;
  segmento: string;
};

export async function getClientesResumen(): Promise<ClienteResumen[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clientes_resumen");
  if (error) throw error;
  return data;
}

export async function actualizarNotasCliente(id: string, notas: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ notas_internas: notas }).eq("id", id);
  return { ok: !error, error: error?.message };
}
