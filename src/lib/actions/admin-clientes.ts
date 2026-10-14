"use server";

import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/actions/resultado";

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

// La nota de la ficha vive en notas_internas_cliente (solo admin por RLS):
// como columna de `clientes` la podía leer el propio cliente desde su cuenta.
// clientes_resumen() la sigue devolviendo como `notas_internas`.
export async function actualizarNotasCliente(id: string, notas: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notas_internas_cliente")
    .upsert({ cliente_id: id, texto: notas }, { onConflict: "cliente_id" })
    .select("cliente_id");
  return resultado(error, data);
}

export type FidelizacionCliente = { cliente_id: string; sellos_disponibles: number; puede_canjear: boolean };

export async function getFidelizacionClientes(): Promise<FidelizacionCliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fidelizacion_clientes");
  if (error) throw error;
  return data;
}

export async function canjearFidelizacion(clienteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("canjear_fidelizacion", { p_cliente_id: clienteId });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// Borrado a petición del cliente (RGPD): se anonimiza la ficha en vez de
// borrar la fila, para que las citas pasadas sigan contando en las métricas.
export async function anonimizarCliente(clienteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("anonimizar_cliente", { p_cliente_id: clienteId });
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No se encontró al cliente" };
  return { ok: true as const };
}

export type ResultadoImportacion =
  | { ok: true; creados: number; existentes: number; invalidos: number }
  | { ok: false; error: string };

export async function importarClientes(
  filas: { nombre: string; telefono: string; email: string; notas: string }[]
): Promise<ResultadoImportacion> {
  if (filas.length === 0) return { ok: false, error: "El fichero no tiene clientes" };
  if (filas.length > 5000) return { ok: false, error: "Como mucho 5000 clientes por importación" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("importar_clientes", { p_filas: filas });
  if (error) return { ok: false, error: error.message };
  const r = data as { creados: number; existentes: number; invalidos: number };
  return { ok: true, ...r };
}
