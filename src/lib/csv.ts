// Lectura de CSV para importar clientes (por ejemplo, la exportación de
// Booksy, Treatwell o una hoja de cálculo). Funciones puras: ver csv.test.ts.

/** Parte un CSV en filas y celdas. Admite comillas, comillas dobles escapadas y saltos de línea dentro de comillas. */
export function parsearCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const primeraLinea = limpio.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeraLinea.match(/;/g)?.length ?? 0) > (primeraLinea.match(/,/g)?.length ?? 0) ? ";" : ",";

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (entreComillas) {
      if (ch === '"') {
        if (limpio[i + 1] === '"') {
          celda += '"';
          i++;
        } else entreComillas = false;
      } else celda += ch;
    } else if (ch === '"') {
      entreComillas = true;
    } else if (ch === sep) {
      fila.push(celda);
      celda = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += ch;
  }
  if (celda !== "" || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

export type ClienteImportado = { nombre: string; telefono: string; email: string; notas: string };

const SINONIMOS: Record<keyof ClienteImportado | "apellido", string[]> = {
  nombre: ["nombre", "name", "first name", "firstname", "nombre completo", "full name", "cliente", "client", "customer"],
  apellido: ["apellido", "apellidos", "last name", "lastname", "surname"],
  telefono: ["telefono", "teléfono", "movil", "móvil", "phone", "mobile", "phone number", "celular", "tel"],
  email: ["email", "e-mail", "correo", "correo electronico", "correo electrónico", "mail"],
  notas: ["notas", "nota", "notes", "note", "observaciones", "comentarios"],
};

function normalizarCabecera(c: string): string {
  return c.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}

/** Qué columna es cada campo, según la cabecera. -1 si no está. */
export function detectarColumnas(cabecera: string[]): Record<keyof ClienteImportado | "apellido", number> {
  const norm = cabecera.map(normalizarCabecera);
  const buscar = (claves: string[]) => {
    const n = claves.map(normalizarCabecera);
    return norm.findIndex((c) => n.includes(c));
  };
  return {
    nombre: buscar(SINONIMOS.nombre),
    apellido: buscar(SINONIMOS.apellido),
    telefono: buscar(SINONIMOS.telefono),
    email: buscar(SINONIMOS.email),
    notas: buscar(SINONIMOS.notas),
  };
}

/** Convierte el CSV en clientes. Devuelve también si se reconocieron las columnas imprescindibles. */
export function clientesDesdeCsv(texto: string): { clientes: ClienteImportado[]; columnasOk: boolean } {
  const filas = parsearCsv(texto);
  if (filas.length < 2) return { clientes: [], columnasOk: false };
  const col = detectarColumnas(filas[0]);
  if (col.nombre < 0 || col.telefono < 0) return { clientes: [], columnasOk: false };
  const celda = (f: string[], i: number) => (i >= 0 ? (f[i] ?? "").trim() : "");
  const clientes = filas.slice(1).map((f) => ({
    nombre: [celda(f, col.nombre), celda(f, col.apellido)].filter(Boolean).join(" "),
    telefono: celda(f, col.telefono),
    email: celda(f, col.email),
    notas: celda(f, col.notas),
  }));
  return { clientes: clientes.filter((c) => c.nombre || c.telefono), columnasOk: true };
}
