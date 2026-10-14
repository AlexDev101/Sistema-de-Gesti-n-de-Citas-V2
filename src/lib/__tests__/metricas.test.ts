import { describe, expect, it } from "vitest";
import { previsto, resumirPeriodo, serviciosMasVendidos, variacion, type CitaMetrica } from "@/lib/metricas";

const ahora = new Date("2026-10-14T12:00:00Z");
const cita = (estado: string, inicio: string, euros: number, servicios = ["Corte"]): CitaMetrica => ({
  estado,
  inicio,
  precio_total_cents: euros * 100,
  servicios: servicios.map((nombre) => ({ nombre })),
});

describe("métricas", () => {
  const citas = [
    cita("completada", "2026-10-10T09:00:00Z", 13),
    cita("completada", "2026-10-11T09:00:00Z", 9, ["Corte", "Barba"]),
    cita("no_show", "2026-10-12T09:00:00Z", 9),
    cita("cancelada", "2026-10-13T09:00:00Z", 9),
    cita("confirmada", "2026-10-13T16:00:00Z", 17), // pasada sin marcar
    cita("confirmada", "2026-10-15T09:00:00Z", 13), // futura
  ];

  it("solo cuenta como cobrado lo atendido, nunca las citas futuras", () => {
    const r = resumirPeriodo(citas, ahora);
    expect(r.cobradoCents).toBe(2200);
    expect(r.atendidas).toBe(2);
    expect(r.ticketMedioCents).toBe(1100);
  });

  it("calcula la tasa de plantones sobre las citas que debían ocurrir", () => {
    const r = resumirPeriodo(citas, ahora);
    expect(r.plantones).toBe(1);
    expect(r.tasaPlantones).toBe(33); // 1 de 3
    expect(r.canceladas).toBe(1);
  });

  it("separa las citas pasadas que el barbero no ha marcado", () => {
    const r = resumirPeriodo(citas, ahora);
    expect(r.sinMarcar).toBe(1);
    expect(r.sinMarcarCents).toBe(1700);
  });

  it("lo previsto son las confirmadas que aún no han llegado", () => {
    expect(previsto(citas, ahora)).toEqual({ citas: 1, cents: 1300 });
  });

  it("sin citas no inventa porcentajes", () => {
    const r = resumirPeriodo([], ahora);
    expect(r.tasaPlantones).toBeNull();
    expect(r.ticketMedioCents).toBeNull();
  });

  it("compara con el periodo anterior", () => {
    expect(variacion(120, 100)).toBe(20);
    expect(variacion(80, 100)).toBe(-20);
    expect(variacion(50, 0)).toBeNull();
  });

  it("los servicios más vendidos salen de las citas atendidas", () => {
    expect(serviciosMasVendidos(citas)).toEqual([["Corte", 2], ["Barba", 1]]);
  });
});
