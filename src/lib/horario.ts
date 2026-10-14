// Horario real del negocio, a partir de las filas de `horario_barbero`.
//
// Antes Agenda, «Hoy» y la portada usaban horas escritas en el código
// (10:00–20:30 con pausa 13:30–16:30) mientras que la reserva pública leía la
// base: si el barbero cambiaba su horario, el panel y la web mostraban otro.
// Todo lo que necesita el horario pasa ahora por aquí. Son funciones puras
// (sin base ni fechas del sistema), así que tienen tests en horario.test.ts.

export type FilaHorario = { dia_semana: number; abre: string; cierra: string };
export type Franja = { abre: number; cierra: number }; // minutos desde las 00:00

export const PASO_MIN = 30;

export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function aHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Día de la semana de una fecha ISO (yyyy-mm-dd) con la convención de la base: 0 = domingo. */
export function diaSemana(fechaISO: string): number {
  return new Date(fechaISO + "T12:00:00Z").getUTCDay();
}

export function franjasDelDia(filas: FilaHorario[], dia: number): Franja[] {
  return filas
    .filter((f) => f.dia_semana === dia)
    .map((f) => ({ abre: aMinutos(f.abre), cierra: aMinutos(f.cierra) }))
    .filter((f) => f.cierra > f.abre)
    .sort((a, b) => a.abre - b.abre);
}

export function minutosAbiertos(franjas: Franja[]): number {
  return franjas.reduce((a, f) => a + (f.cierra - f.abre), 0);
}

export function dentroDeHorario(franjas: Franja[], inicio: number, fin: number): boolean {
  return franjas.some((f) => inicio >= f.abre && fin <= f.cierra);
}

/**
 * Filas de la rejilla de un día: de la primera apertura al último cierre, en
 * pasos de 30 min. Lo que cae fuera de cualquier franja (la pausa de mediodía)
 * se marca como `cerrado`. `extra` amplía el rango para que una cita apuntada
 * fuera de horario siga viéndose.
 */
export function filasRejilla(
  franjas: Franja[],
  extra: { inicio: number; fin: number }[] = []
): { min: number; label: string; cerrado: boolean }[] {
  const inicios = [...franjas.map((f) => f.abre), ...extra.map((e) => e.inicio)];
  const fines = [...franjas.map((f) => f.cierra), ...extra.map((e) => e.fin)];
  if (inicios.length === 0) return [];
  const desde = Math.floor(Math.min(...inicios) / PASO_MIN) * PASO_MIN;
  const hasta = Math.ceil(Math.max(...fines) / PASO_MIN) * PASO_MIN;
  const filas: { min: number; label: string; cerrado: boolean }[] = [];
  for (let t = desde; t < hasta; t += PASO_MIN) {
    filas.push({ min: t, label: aHHMM(t), cerrado: !dentroDeHorario(franjas, t, t + PASO_MIN) });
  }
  return filas;
}

/** Tramos libres de al menos `minimo` minutos dentro del horario, dados los tramos ocupados. */
export function huecosLibres(
  franjas: Franja[],
  ocupados: { inicio: number; fin: number }[],
  minimo = 60
): [number, number][] {
  const orden = [...ocupados].sort((a, b) => a.inicio - b.inicio);
  const huecos: [number, number][] = [];
  for (const f of franjas) {
    let cursor = f.abre;
    for (const o of orden) {
      if (o.inicio >= f.cierra || o.fin <= f.abre) continue;
      if (o.inicio - cursor >= minimo) huecos.push([cursor, o.inicio]);
      cursor = Math.max(cursor, o.fin);
    }
    if (f.cierra - cursor >= minimo) huecos.push([cursor, f.cierra]);
  }
  return huecos;
}

/** Minutos ocupados dentro del horario (para la ocupación %). */
export function minutosOcupados(franjas: Franja[], ocupados: { inicio: number; fin: number }[]): number {
  let total = 0;
  for (const f of franjas) {
    for (const o of ocupados) {
      total += Math.max(0, Math.min(f.cierra, o.fin) - Math.max(f.abre, o.inicio));
    }
  }
  return total;
}

const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ABREV_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export function nombreDia(dia: number): string {
  return NOMBRES_DIA[dia];
}

/**
 * Horario público agrupado: días consecutivos con las mismas franjas se juntan
 * ("Lun – Vie · 10:00–13:30, 16:30–20:30"). Los días sin franjas salen como
 * "Cerrado".
 */
export function horarioPublico(filas: FilaHorario[]): { dias: string; horas: string }[] {
  const porDia = ORDEN_SEMANA.map((d) => ({
    dia: d,
    horas:
      franjasDelDia(filas, d)
        .map((f) => `${aHHMM(f.abre)}–${aHHMM(f.cierra)}`)
        .join(", ") || "Cerrado",
  }));
  const grupos: { desde: number; hasta: number; horas: string }[] = [];
  for (const d of porDia) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.horas === d.horas) ultimo.hasta = d.dia;
    else grupos.push({ desde: d.dia, hasta: d.dia, horas: d.horas });
  }
  return grupos.map((g) => ({
    dias: g.desde === g.hasta ? NOMBRES_DIA[g.desde] : `${ABREV_DIA[g.desde]} – ${ABREV_DIA[g.hasta]}`,
    horas: g.horas,
  }));
}

export type Cierre = { id: string; desde: string; hasta: string; motivo: string | null; citas_afectadas: number };

/** Cierre (vacaciones, festivo) que cubre la fecha, si lo hay. `desde` y `hasta` son días incluidos. */
export function cierreDelDia(cierres: Cierre[], fechaISO: string): Cierre | null {
  return cierres.find((c) => c.desde <= fechaISO && fechaISO <= c.hasta) ?? null;
}
