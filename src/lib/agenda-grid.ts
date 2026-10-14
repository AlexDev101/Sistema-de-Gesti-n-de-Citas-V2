import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TZ } from "@/lib/format";

// Fechas y rangos en hora de Madrid. El horario de apertura ya no vive aquí:
// sale de la base (ver lib/horario.ts).

export function minutosDelDia(iso: string): number {
  const [h, m] = formatInTimeZone(iso, TZ, "HH:mm").split(":").map(Number);
  return h * 60 + m;
}

/** Fecha (yyyy-mm-dd) en Madrid de un instante. Comparar `inicio.slice(0, 10)` usaba la fecha UTC. */
export function fechaMadrid(iso: string | Date): string {
  return formatInTimeZone(iso, TZ, "yyyy-MM-dd");
}

export function construirInicioMadrid(fechaISO: string, minutosDia: number): string {
  const hh = String(Math.floor(minutosDia / 60)).padStart(2, "0");
  const mm = String(minutosDia % 60).padStart(2, "0");
  return fromZonedTime(`${fechaISO} ${hh}:${mm}:00`, TZ).toISOString();
}

export function inicioDiaMadrid(fechaISO: string): string {
  return fromZonedTime(`${fechaISO} 00:00:00`, TZ).toISOString();
}

export function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(fechaISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function rangoDia(fechaISO: string) {
  return { desde: inicioDiaMadrid(fechaISO), hasta: inicioDiaMadrid(sumarDias(fechaISO, 1)) };
}

// Lunes a domingo de la semana que contiene `fechaISO`.
export function rangoSemana(fechaISO: string) {
  const dow = (new Date(fechaISO + "T00:00:00Z").getUTCDay() + 6) % 7; // 0=lunes
  const lunes = sumarDias(fechaISO, -dow);
  return { desde: inicioDiaMadrid(lunes), hasta: inicioDiaMadrid(sumarDias(lunes, 7)), lunes };
}

export function diasDeLaSemana(lunesISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunesISO, i));
}

export function rangoMes(anio: number, mes1a12: number) {
  const desde = `${anio}-${String(mes1a12).padStart(2, "0")}-01`;
  const hasta = mes1a12 === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes1a12 + 1).padStart(2, "0")}-01`;
  return { desde: inicioDiaMadrid(desde), hasta: inicioDiaMadrid(hasta) };
}
