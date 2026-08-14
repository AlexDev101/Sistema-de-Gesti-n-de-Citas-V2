import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TZ } from "@/lib/format";

export const APERTURA_MIN = 10 * 60; // 10:00
export const CIERRE_MIN = 20 * 60 + 30; // 20:30
export const PAUSA_INICIO = 13 * 60 + 30; // 13:30
export const PAUSA_FIN = 16 * 60 + 30; // 16:30
export const ROW_MIN = 30;

export function filasDia(): { min: number; label: string; pausa: boolean }[] {
  const filas: { min: number; label: string; pausa: boolean }[] = [];
  for (let t = APERTURA_MIN; t < CIERRE_MIN; t += ROW_MIN) {
    filas.push({
      min: t,
      label: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`,
      pausa: t >= PAUSA_INICIO && t < PAUSA_FIN,
    });
  }
  return filas;
}

export function minutosDelDia(iso: string): number {
  const [h, m] = formatInTimeZone(iso, TZ, "HH:mm").split(":").map(Number);
  return h * 60 + m;
}

export function construirInicioMadrid(fechaISO: string, minutosDia: number): string {
  const hh = String(Math.floor(minutosDia / 60)).padStart(2, "0");
  const mm = String(minutosDia % 60).padStart(2, "0");
  return fromZonedTime(`${fechaISO} ${hh}:${mm}:00`, TZ).toISOString();
}

export function inicioDiaMadrid(fechaISO: string): string {
  return fromZonedTime(`${fechaISO} 00:00:00`, TZ).toISOString();
}

function sumarDias(fechaISO: string, dias: number): string {
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
