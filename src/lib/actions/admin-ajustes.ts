"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { fallo, resultado, type Resultado } from "@/lib/actions/resultado";
import { colorValido } from "@/lib/marca";
import { emailValido } from "@/lib/validacion";

const URL_RE = /^https:\/\/[^\s"'<>]+$/;

export async function actualizarConfiguracion(id: string, cambios: TablesUpdate<"configuracion">): Promise<Resultado> {
  if (cambios.color_acento && !colorValido(cambios.color_acento)) return fallo("El color tiene que ser del tipo #8a7fd6");
  if (cambios.logo_url && !URL_RE.test(cambios.logo_url)) return fallo("El logo tiene que ser una dirección https://…");
  if (cambios.legal_email && !emailValido(cambios.legal_email)) return fallo("Revisa el email de contacto legal");
  if (cambios.horas_limite_cambio != null && (cambios.horas_limite_cambio < 0 || cambios.horas_limite_cambio > 168)) {
    return fallo("El límite para cambiar o cancelar tiene que estar entre 0 y 168 horas");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("configuracion").update(cambios).eq("id", id).select("id");
  const res = resultado(error, data);
  // El nombre y el color se pintan en el layout raíz: hay que regenerarlo entero.
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function actualizarBarbero(id: string, cambios: { nombre: string; rol: string }): Promise<Resultado> {
  if (!cambios.nombre.trim()) return fallo("Falta el nombre");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbero")
    .update({ nombre: cambios.nombre.trim(), rol: cambios.rol.trim() })
    .eq("id", id)
    .select("id");
  const res = resultado(error, data);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function getEmailAvisos(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracion_privada").select("email_avisos").limit(1).maybeSingle();
  return data?.email_avisos ?? "";
}

export async function actualizarEmailAvisos(email: string): Promise<Resultado> {
  if (!emailValido(email)) return fallo("Revisa el email de avisos");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracion_privada")
    .update({ email_avisos: email.trim() || null })
    .eq("unico", true)
    .select("unico");
  return resultado(error, data);
}
