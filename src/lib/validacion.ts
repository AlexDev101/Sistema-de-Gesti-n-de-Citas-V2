// El email es opcional en una reserva —mucha gente reserva solo con teléfono—
// pero si se escribe tiene que ser válido: es el único canal por el que salen
// la confirmación y el recordatorio, y un fallo de envío solo deja rastro en
// los logs del servidor, así que una errata pasaría desapercibida.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function emailValido(email: string): boolean {
  const v = email.trim();
  return v === "" || EMAIL_RE.test(v);
}

export const EMAIL_INVALIDO = "Revisa el email: falta algo para que sea válido.";

// Misma normalización que normalizar_telefono() en Postgres: el teléfono es
// la clave del cliente, así que "600 111 222", "600-111-222" y "+34600111222"
// tienen que acabar siendo el mismo valor en la app y en la base.
export function normalizarTelefono(telefono: string): string {
  return telefono.replace(/[^0-9+]/g, "").replace(/^(\+34|0034)/, "");
}

// La reserva pública solo admite teléfonos españoles (9 dígitos); es la misma
// regla que aplica crear_reserva, repetida aquí para avisar antes de enviar.
export function telefonoEspanolValido(telefono: string): boolean {
  return /^[6-9][0-9]{8}$/.test(normalizarTelefono(telefono));
}

// El panel sí puede apuntar un número extranjero (crear_reserva_admin).
export function telefonoPanelValido(telefono: string): boolean {
  return /^\+?[0-9]{9,15}$/.test(normalizarTelefono(telefono));
}

export const TELEFONO_INVALIDO = "Revisa el teléfono: deben ser 9 dígitos.";
