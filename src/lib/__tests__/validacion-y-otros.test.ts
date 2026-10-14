import { describe, expect, it } from "vitest";
import { emailValido, normalizarTelefono, telefonoEspanolValido, telefonoPanelValido } from "@/lib/validacion";
import { telHref, whatsappHref } from "@/lib/contacto";
import { cssMarca } from "@/lib/marca";
import { fechaMadrid, construirInicioMadrid, rangoDia } from "@/lib/agenda-grid";

describe("teléfonos y emails", () => {
  it("normaliza igual que normalizar_telefono() de la base", () => {
    expect(normalizarTelefono("600 111 222")).toBe("600111222");
    expect(normalizarTelefono("+34 600-111-222")).toBe("600111222");
    expect(normalizarTelefono("0034600111222")).toBe("600111222");
  });

  it("la web pública solo acepta móviles y fijos españoles", () => {
    expect(telefonoEspanolValido("600 111 222")).toBe(true);
    expect(telefonoEspanolValido("912345678")).toBe(true);
    expect(telefonoEspanolValido("12345")).toBe(false);
    expect(telefonoEspanolValido("+44 7700 900123")).toBe(false);
  });

  it("el panel acepta números extranjeros", () => {
    expect(telefonoPanelValido("+44 7700 900123")).toBe(true);
  });

  it("el email es opcional pero, si se escribe, tiene que ser válido", () => {
    expect(emailValido("")).toBe(true);
    expect(emailValido("ana@ejemplo.es")).toBe(true);
    expect(emailValido("ana@ejemplo")).toBe(false);
  });
});

describe("enlaces de contacto", () => {
  it("añade el +34 a los números españoles", () => {
    expect(telHref("600 111 222")).toBe("tel:+34600111222");
    expect(whatsappHref("600111222", "Hola")).toBe("https://wa.me/34600111222?text=Hola");
  });
});

describe("color de marca", () => {
  it("solo acepta #rrggbb (el valor acaba dentro de un <style>)", () => {
    expect(cssMarca("#ff0000")).toContain("--color-accent: #ff0000;");
    expect(cssMarca("red;}body{display:none")).toBe("");
    expect(cssMarca(null)).toBe("");
  });
});

describe("fechas en hora de Madrid", () => {
  it("la fecha de una cita es la de Madrid, no la UTC", () => {
    // 23:30 en Madrid (verano) son las 21:30 UTC del mismo día; 00:30 son las 22:30 UTC del día anterior.
    expect(fechaMadrid("2026-07-14T22:30:00Z")).toBe("2026-07-15");
    expect(fechaMadrid("2026-07-14T21:30:00Z")).toBe("2026-07-14");
  });

  it("construye instantes respetando el cambio de hora", () => {
    expect(construirInicioMadrid("2026-07-14", 600)).toBe("2026-07-14T08:00:00.000Z"); // CEST
    expect(construirInicioMadrid("2026-12-14", 600)).toBe("2026-12-14T09:00:00.000Z"); // CET
  });

  it("el día del cambio de hora dura 25 h", () => {
    const { desde, hasta } = rangoDia("2026-10-25");
    expect((Date.parse(hasta) - Date.parse(desde)) / 3600000).toBe(25);
  });
});
