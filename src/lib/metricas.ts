// Cálculo de las métricas del panel, separado de la página para poder
// probarlo (metricas.test.ts).
//
// Antes «Ingresos (30 días)» sumaba también citas futuras como si estuvieran
// cobradas y los «No asistido» no aparecían en ninguna cifra, así que la tasa
// de plantones —la que más le cuesta a una barbería— no se veía.

export type CitaMetrica = {
  estado: string;
  inicio: string;
  precio_total_cents: number;
  servicios: { nombre: string }[];
};

export type ResumenPeriodo = {
  /** Cobrado: citas marcadas como «Asistido». */
  cobradoCents: number;
  atendidas: number;
  /** Pasadas y todavía en «Pendiente»: el barbero no las ha marcado. */
  sinMarcar: number;
  sinMarcarCents: number;
  plantones: number;
  canceladas: number;
  /** % de plantones sobre las citas que debían ocurrir (asistidas + plantones). */
  tasaPlantones: number | null;
  ticketMedioCents: number | null;
};

export function resumirPeriodo(citas: CitaMetrica[], ahora: Date): ResumenPeriodo {
  const t = ahora.getTime();
  const pasadas = citas.filter((c) => new Date(c.inicio).getTime() <= t);
  const atendidas = pasadas.filter((c) => c.estado === "completada");
  const sinMarcar = pasadas.filter((c) => c.estado === "confirmada");
  const plantones = pasadas.filter((c) => c.estado === "no_show");
  const canceladas = citas.filter((c) => c.estado === "cancelada");
  const cobradoCents = atendidas.reduce((a, c) => a + c.precio_total_cents, 0);
  const base = atendidas.length + plantones.length;
  return {
    cobradoCents,
    atendidas: atendidas.length,
    sinMarcar: sinMarcar.length,
    sinMarcarCents: sinMarcar.reduce((a, c) => a + c.precio_total_cents, 0),
    plantones: plantones.length,
    canceladas: canceladas.length,
    tasaPlantones: base ? Math.round((plantones.length / base) * 100) : null,
    ticketMedioCents: atendidas.length ? Math.round(cobradoCents / atendidas.length) : null,
  };
}

/** Variación en % respecto al periodo anterior; null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** Citas confirmadas que todavía no han pasado (lo previsto, no lo cobrado). */
export function previsto(citas: CitaMetrica[], ahora: Date): { citas: number; cents: number } {
  const futuras = citas.filter((c) => c.estado === "confirmada" && new Date(c.inicio).getTime() > ahora.getTime());
  return { citas: futuras.length, cents: futuras.reduce((a, c) => a + c.precio_total_cents, 0) };
}

export function serviciosMasVendidos(citas: CitaMetrica[], n = 5): [string, number][] {
  const cuenta = new Map<string, number>();
  for (const c of citas) {
    if (c.estado !== "completada") continue;
    for (const s of c.servicios) cuenta.set(s.nombre, (cuenta.get(s.nombre) ?? 0) + 1);
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}
