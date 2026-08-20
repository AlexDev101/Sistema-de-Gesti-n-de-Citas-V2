"use server";

import { createClient } from "@/lib/supabase/server";

export type Resena = {
  id: string;
  estrellas: number;
  comentario: string | null;
  creado_at: string;
  cliente_nombre: string;
  servicios: string | null;
};

export async function getResenasRecientes(): Promise<Resena[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resenas_recientes");
  if (error) throw error;
  return data;
}
