"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fallo, resultado, type Resultado } from "@/lib/actions/resultado";
import { avisarCliente } from "@/lib/avisos";
import { getCierres, getHorario } from "@/lib/data/negocio";

export type ReservaAgenda = {
  id: string;
  token: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_total_cents: number;
  // `notas` es lo que escribió el cliente al reservar; `notasInternas` es
  // del barbero y vive en notas_internas_reserva, a la que solo llega el admin.
  notas: string | null;
  notasInternas: string | null;
  /** Email al que se avisa (el de la reserva o, si no, el de la ficha). */
  email: string | null;
  cliente: { id: string; nombre: string; telefono: string } | null;
  servicios: { nombre: string; duracion_min: number }[];
};

const SELECT_AGENDA =
  "id, token, inicio, fin, estado, precio_total_cents, notas, email_contacto, notas_internas_reserva(texto), clientes(id, nombre, telefono, email), reserva_servicios(duracion_min, servicios(nombre))";

type Fila = {
  id: string;
  token: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_total_cents: number;
  notas: string | null;
  email_contacto: string | null;
  notas_internas_reserva: { texto: string } | null;
  clientes: { id: string; nombre: string; telefono: string; email: string | null } | null;
  reserva_servicios: { duracion_min: number; servicios: { nombre: string } | null }[];
};

function mapear(filas: Fila[]): ReservaAgenda[] {
  return filas.map((f) => ({
    id: f.id,
    token: f.token,
    inicio: f.inicio,
    fin: f.fin,
    estado: f.estado,
    precio_total_cents: f.precio_total_cents,
    notas: f.notas,
    notasInternas: f.notas_internas_reserva?.texto || null,
    email: f.email_contacto ?? f.clientes?.email ?? null,
    cliente: f.clientes ? { id: f.clientes.id, nombre: f.clientes.nombre, telefono: f.clientes.telefono } : null,
    servicios: f.reserva_servicios.map((rs) => ({
      nombre: rs.servicios?.nombre ?? "",
      duracion_min: rs.duracion_min,
    })),
  }));
}

// Devuelve todos los estados sin filtrar — Métricas necesita ver las
// canceladas y los «No asistido» para contarlos. Agenda, Hoy y demás vistas
// filtran ellas mismas lo que no quieren ver.
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

/** Horario semanal y cierres desde `desdeISO`: lo que necesita la agenda para pintar los días. */
export async function getHorarioYCierres(desdeISO?: string) {
  const [horario, cierres] = await Promise.all([getHorario(), getCierres(desdeISO)]);
  return { horario, cierres };
}

// Huecos para «Mover a…»: sin antelación mínima (el barbero puede mover a
// dentro de un rato) y sin contar la propia cita como ocupada.
export async function obtenerSlotsAdmin(fechaISO: string, duracionMin: number, excluirToken: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("slots_disponibles_excluyendo", {
    p_fecha: fechaISO,
    p_duracion_min: duracionMin,
    p_excluir_token: excluirToken,
    p_respetar_antelacion: false,
  });
  if (error) throw error;
  return data.map((r) => r.inicio);
}

async function inicioYEstado(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("reservas").select("inicio, estado").eq("id", id).maybeSingle();
  return data;
}

// Mover una cita avisa al cliente por email (si tiene) salvo que el barbero
// lo desmarque: antes solo se actualizaba la fila y el cliente llegaba a una
// hora que ya no era la suya.
export async function reprogramarReserva(
  id: string,
  nuevoInicioISO: string,
  duracionMin: number,
  avisar = true
): Promise<Resultado> {
  const antes = await inicioYEstado(id);
  const supabase = await createClient();
  const nuevoFin = new Date(new Date(nuevoInicioISO).getTime() + duracionMin * 60000).toISOString();
  const { data, error } = await supabase
    .from("reservas")
    .update({ inicio: nuevoInicioISO, fin: nuevoFin })
    .eq("id", id)
    .select("id");
  const res = resultado(error, data, "Ese hueco está ocupado — la cita vuelve a su sitio");
  if (res.ok && avisar && antes?.estado === "confirmada" && antes.inicio !== nuevoInicioISO) {
    after(() => avisarCliente("cambio", id, { inicioAnterior: antes.inicio }));
  }
  return res;
}

const ESTADOS = ["confirmada", "completada", "no_show", "cancelada"];

export async function actualizarEstadoReserva(id: string, estado: string, avisar = false): Promise<Resultado> {
  if (!ESTADOS.includes(estado)) return fallo("Estado no válido");
  const antes = await inicioYEstado(id);
  const supabase = await createClient();
  const { data, error } = await supabase.from("reservas").update({ estado }).eq("id", id).select("id");
  // Volver a "Pendiente" una cita cancelada puede chocar con otra que ya
  // ocupa ese hueco (restricción sin_solape).
  const res = resultado(error, data, "No se puede: ese hueco ya lo ocupa otra cita");
  if (res.ok && avisar && estado === "cancelada" && antes?.estado === "confirmada") {
    after(() => avisarCliente("cancelacion_negocio", id));
  }
  return res;
}

// Antes escribía en reservas.notas, que el propio cliente puede leer (RLS le
// da su fila entera y obtener_reserva_por_token la devuelve). Las notas del
// barbero van a una tabla aparte con política solo-admin.
export async function actualizarNotasReserva(id: string, notas: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notas_internas_reserva")
    .upsert({ reserva_id: id, texto: notas }, { onConflict: "reserva_id" })
    .select("reserva_id");
  return resultado(error, data);
}

export type EnvioFallido = { id: string; creado_at: string; tipo: string; detalle: string | null };

export async function getEnviosFallidos(): Promise<EnvioFallido[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("envios_fallidos")
    .select("id, creado_at, tipo, detalle")
    .is("visto_at", null)
    .order("creado_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return data;
}

export async function marcarEnviosVistos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("envios_fallidos")
    .update({ visto_at: new Date().toISOString() })
    .is("visto_at", null)
    .select("id");
  return resultado(error, data);
}
