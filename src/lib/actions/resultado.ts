// Resultado común de las acciones de escritura del panel.
//
// El motivo de que exista: un UPDATE o DELETE que RLS filtra **no devuelve
// error**. PostgREST responde "cero filas afectadas" y supabase-js entrega
// `error: null`, así que `{ ok: !error }` daba éxito mientras no se escribía
// nada. En la práctica eso significa que con la sesión caducada el panel
// parecía guardar y no guardaba. Por eso toda mutación pide `.select()` y
// comprueba cuántas filas volvieron.

export type Resultado = { ok: true } | { ok: false; error: string };

export const OK = { ok: true } as const;

export function fallo(error: string): Resultado {
  return { ok: false, error };
}

export const SIN_PERMISO = "No se guardó: puede que la sesión haya caducado. Vuelve a entrar e inténtalo otra vez.";

export function resultado(
  error: { message: string } | null,
  filas: unknown[] | null,
  mensajeError?: string
): Resultado {
  if (error) return fallo(mensajeError ?? error.message);
  if (!filas || filas.length === 0) return fallo(SIN_PERMISO);
  return OK;
}
