// Tipos y helpers puros sobre `servicios` — sin dependencias de servidor
// (next/headers), para poder importarse también desde componentes cliente
// como el asistente de reserva.
import type { Tables } from "@/lib/supabase/database.types";

export type Servicio = Tables<"servicios">;

export function agruparPorCategoria(servicios: Servicio[]) {
  const orden: string[] = [];
  const grupos = new Map<string, Servicio[]>();
  for (const s of servicios) {
    if (!grupos.has(s.categoria)) {
      grupos.set(s.categoria, []);
      orden.push(s.categoria);
    }
    grupos.get(s.categoria)!.push(s);
  }
  return orden.map((nombre) => ({ nombre, items: grupos.get(nombre)! }));
}
