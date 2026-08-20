"use server";

import { createClient } from "@/lib/supabase/server";
import { resultado } from "@/lib/actions/resultado";

export type ReservaAgenda = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_total_cents: number;
  notas: string | null;
  cliente: { id: string; nombre: string; telefono: string } | null;
  servicios: { nombre: string; duracion_min: number }[];
};

const SELECT_AGENDA =
  "id, inicio, fin, estado, precio_total_cents, notas, clientes(id, nombre, telefono), reserva_servicios(duracion_min, servicios(nombre))";

type Fila = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_total_cents: number;
  notas: string | null;
  clientes: { id: string; nombre: string; telefono: string } | null;
  reserva_servicios: { duracion_min: number; servicios: { nombre: string } | null }[];
};

function mapear(filas: Fila[]): ReservaAgenda[] {
  return filas.map((f) => ({
    id: f.id,
    inicio: f.inicio,
    fin: f.fin,
    estado: f.estado,
    precio_total_cents: f.precio_total_cents,
    notas: f.notas,
    cliente: f.clientes,
    servicios: f.reserva_servicios.map((rs) => ({
      nombre: rs.servicios?.nombre ?? "",
      duracion_min: rs.duracion_min,
    })),
  }));
}

// Devuelve todos los estados sin filtrar — Métricas necesita ver las
// canceladas para poder contarlas (antes se descartaban aquí mismo, así que
// esa cifra llevaba siempre a 0). Agenda, Hoy y demás vistas activas filtran
// ellas mismas lo que no quieren ver.
export async function getReservasRango(desdeISO: string, hastaISO: string): Promise<ReservaAgenda[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservas")
    .select(SELECT_AGENDA)
    .gte("inicio", desdeISO)
    .lt("inicio", hastaISO)
    .order("inicio");
  if (error) throw error;
  return mapear(data as unknown as Fila[]);
}

export async function getReservasCliente(clienteId: string): Promise<ReservaAgenda[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservas")
    .select(SELECT_AGENDA)
    .eq("cliente_id", clienteId)
    .order("inicio", { ascending: false })
    .limit(10);
  if (error) throw error;
  return mapear(data as unknown as Fila[]);
}

export async function reprogramarReserva(id: string, nuevoInicioISO: string, duracionMin: number) {
  const supabase = await createClient();
  const nuevoFin = new Date(new Date(nuevoInicioISO).getTime() + duracionMin * 60000).toISOString();
  const { data, error } = await supabase
    .from("reservas")
    .update({ inicio: nuevoInicioISO, fin: nuevoFin })
    .eq("id", id)
    .select("id");
  return resultado(error, data, "Solape detectado — la cita vuelve a su sitio");
}

export async function actualizarEstadoReserva(id: string, estado: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reservas").update({ estado }).eq("id", id).select("id");
  return resultado(error, data);
}

export async function actualizarNotasReserva(id: string, notas: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reservas").update({ notas }).eq("id", id).select("id");
  return resultado(error, data);
}
