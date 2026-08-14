import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";

export function hoyMadridISO(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

export function fechaISO(anio: number, mes1a12: number, dia: number): string {
  return `${anio}-${String(mes1a12).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function diasDelMes(anio: number, mes1a12: number): number {
  return new Date(anio, mes1a12, 0).getDate();
}

// Lunes = 0 … Domingo = 6 (para alinear con la fila de cabeceras L M X J V S D)
export function offsetPrimerDia(anio: number, mes1a12: number): number {
  const dow = new Date(anio, mes1a12 - 1, 1).getDay(); // 0=domingo…6=sábado
  return (dow + 6) % 7;
}

export function esManana(inicioISO: string): boolean {
  return Number(formatInTimeZone(inicioISO, TZ, "HH")) < 14;
}

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
