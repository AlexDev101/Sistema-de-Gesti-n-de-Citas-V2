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
