import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

export const TZ = "Europe/Madrid";

export function eur(cents: number): string {
  return (
    (cents / 100).toLocaleString("es-ES", {
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

export function durTxt(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function hhmm(date: Date | string): string {
  return formatInTimeZone(date, TZ, "HH:mm");
}

export function fechaLarga(date: Date | string): string {
  return formatInTimeZone(date, TZ, "EEEE d 'de' MMMM", { locale: es });
}

export function fechaCorta(date: Date | string): string {
  return formatInTimeZone(date, TZ, "d MMM", { locale: es });
}

export function diaMes(date: Date | string): string {
  return formatInTimeZone(date, TZ, "d");
}

export function mesLabel(year: number, monthIndex0: number): string {
  return formatInTimeZone(new Date(Date.UTC(year, monthIndex0, 15)), TZ, "MMMM yyyy", {
    locale: es,
  });
}
