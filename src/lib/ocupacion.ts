// Colores por nivel de carga del día — ver README "Color por carga" y la
// leyenda del calendario del asistente de reserva.
export type Bucket = {
  key: "cerrado" | "completo" | "alta" | "muchas" | "pocas" | "libre";
  label: string;
  line: string;
  bg: string;
  bar: string;
};

export function bucket(n: number, cap: number): Bucket {
  if (cap === 0) {
    return {
      key: "cerrado",
      label: "Cerrado",
      line: "color-mix(in srgb, var(--color-text) 30%, transparent)",
      bg: "transparent",
      bar: "transparent",
    };
  }
  if (n >= cap) {
    return {
      key: "completo",
      label: "Completo",
      line: "var(--color-neutral-100)",
      bg: "color-mix(in srgb, var(--color-neutral-100) 82%, transparent)",
      bar: "var(--color-neutral-100)",
    };
  }
  const p = n / cap;
  if (p >= 0.82) {
    return {
      key: "alta",
      label: "Altas reservas",
      line: "var(--color-state-alta)",
      bg: "color-mix(in srgb, var(--color-state-alta) 34%, transparent)",
      bar: "var(--color-state-alta)",
    };
  }
  if (p >= 0.5) {
    return {
      key: "muchas",
      label: "Muchas reservas",
      line: "var(--color-state-muchas)",
      bg: "color-mix(in srgb, var(--color-state-muchas) 32%, transparent)",
      bar: "var(--color-state-muchas)",
    };
  }
  if (p >= 0.25) {
    return {
      key: "pocas",
      label: "Pocas reservas",
      line: "var(--color-state-pocas)",
      bg: "color-mix(in srgb, var(--color-state-pocas) 32%, transparent)",
      bar: "var(--color-state-pocas)",
    };
  }
  return {
    key: "libre",
    label: "Muy pocas reservas",
    line: "var(--color-state-libre)",
    bg: "color-mix(in srgb, var(--color-state-libre) 30%, transparent)",
    bar: "var(--color-state-libre)",
  };
}

// Un cap de 4 no alcanza a separar los 5 niveles (0.75 y 0.5 caen ambos en
// "muchas"), así que la leyenda se arma sobre un cap de 100 (~porcentaje)
// para tocar cada umbral una sola vez.
export const LEYENDA_OCUPACION: Bucket[] = [
  bucket(10, 100), // libre  (<25%)
  bucket(35, 100), // pocas  (25–50%)
  bucket(65, 100), // muchas (50–82%)
  bucket(90, 100), // alta   (>82%)
  bucket(100, 100), // completo
];

// Vocabulario de cara al admin: lo que importa aquí es si el cliente se ha
// presentado, no la mecánica interna de "confirmada"/"completada" — esos
// nombres de columna no cambian en la base, solo cómo se leen en pantalla.
// El cliente nunca ve estas etiquetas: su página de confirmación tiene las
// suyas propias ("Cita confirmada"/"Cita realizada").
export const ESTADO_LABEL: Record<string, string> = {
  confirmada: "Pendiente",
  completada: "Asistido",
  no_show: "No asistido",
  cancelada: "Cancelada",
};

export const ESTADO_COLOR: Record<string, string> = {
  confirmada: "var(--color-accent-400)",
  completada: "var(--color-state-libre)",
  no_show: "var(--color-state-alta)",
  cancelada: "color-mix(in srgb, var(--color-text) 40%, transparent)",
};
