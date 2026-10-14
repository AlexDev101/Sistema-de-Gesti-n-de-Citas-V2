import { describe, expect, it } from "vitest";
import {
  aHHMM,
  aMinutos,
  cierreDelDia,
  dentroDeHorario,
  diaSemana,
  filasRejilla,
  franjasDelDia,
  horarioPublico,
  huecosLibres,
  minutosAbiertos,
  minutosOcupados,
  type FilaHorario,
} from "@/lib/horario";

// El horario real de la barbería (tal como está en la base el 14 oct 2026).
const HORARIO: FilaHorario[] = [
  ...[1, 2, 3, 4, 5].flatMap((d) => [
    { dia_semana: d, abre: "10:00:00", cierra: "13:30:00" },
    { dia_semana: d, abre: "16:30:00", cierra: "20:30:00" },
  ]),
  { dia_semana: 6, abre: "10:00:00", cierra: "13:30:00" },
];

describe("conversión de horas", () => {
  it("pasa de HH:MM(:SS) a minutos y vuelta", () => {
    expect(aMinutos("10:00:00")).toBe(600);
    expect(aMinutos("13:30")).toBe(810);
    expect(aHHMM(810)).toBe("13:30");
    expect(aHHMM(65)).toBe("01:05");
  });

  it("calcula el día de la semana con 0 = domingo, como la base", () => {
    expect(diaSemana("2026-10-18")).toBe(0); // domingo
    expect(diaSemana("2026-10-19")).toBe(1); // lunes
    expect(diaSemana("2026-10-24")).toBe(6); // sábado
  });
});

describe("franjas", () => {
  it("ordena las franjas del día y descarta las del resto", () => {
    expect(franjasDelDia(HORARIO, 1)).toEqual([
      { abre: 600, cierra: 810 },
      { abre: 990, cierra: 1230 },
    ]);
    expect(franjasDelDia(HORARIO, 0)).toEqual([]);
  });

  it("suma los minutos abiertos", () => {
    expect(minutosAbiertos(franjasDelDia(HORARIO, 1))).toBe(210 + 240);
    expect(minutosAbiertos(franjasDelDia(HORARIO, 6))).toBe(210);
  });

  it("dice si un tramo cabe entero en una franja", () => {
    const lunes = franjasDelDia(HORARIO, 1);
    expect(dentroDeHorario(lunes, 600, 660)).toBe(true);
    expect(dentroDeHorario(lunes, 780, 840)).toBe(false); // cruza la pausa
    expect(dentroDeHorario(lunes, 1200, 1230)).toBe(true);
    expect(dentroDeHorario(lunes, 1200, 1260)).toBe(false); // pasa del cierre
  });
});

describe("rejilla de la agenda", () => {
  it("va de la apertura al cierre y marca la pausa como cerrada", () => {
    const filas = filasRejilla(franjasDelDia(HORARIO, 1));
    expect(filas[0]).toMatchObject({ min: 600, label: "10:00", cerrado: false });
    expect(filas[filas.length - 1]).toMatchObject({ min: 1200, label: "20:00", cerrado: false });
    expect(filas.find((f) => f.min === 840)?.cerrado).toBe(true); // 14:00
    expect(filas.find((f) => f.min === 990)?.cerrado).toBe(false); // 16:30
  });

  it("el sábado acaba a las 13:30, no a las 20:30 (antes salía la tarde como hueco)", () => {
    const filas = filasRejilla(franjasDelDia(HORARIO, 6));
    expect(filas[filas.length - 1].label).toBe("13:00");
    expect(filas).toHaveLength(7);
  });

  it("se amplía para enseñar una cita apuntada fuera de horario", () => {
    const filas = filasRejilla(franjasDelDia(HORARIO, 6), [{ inicio: 17 * 60, fin: 17 * 60 + 30 }]);
    expect(filas[filas.length - 1].label).toBe("17:00");
    expect(filas[filas.length - 1].cerrado).toBe(true);
  });

  it("un día sin horario ni citas no tiene filas", () => {
    expect(filasRejilla([])).toEqual([]);
  });
});

describe("huecos libres y ocupación de «Hoy»", () => {
  const lunes = franjasDelDia(HORARIO, 1);

  it("encuentra los tramos libres de 1 h o más dentro del horario", () => {
    const ocupados = [{ inicio: 600, fin: 660 }, { inicio: 1050, fin: 1110 }];
    expect(huecosLibres(lunes, ocupados).map(([a, b]) => `${aHHMM(a)}–${aHHMM(b)}`)).toEqual([
      "11:00–13:30",
      "16:30–17:30",
      "18:30–20:30",
    ]);
  });

  it("no cuenta la pausa de mediodía como hueco", () => {
    const huecos = huecosLibres(lunes, []);
    expect(huecos).toEqual([[600, 810], [990, 1230]]);
  });

  it("la ocupación solo cuenta minutos dentro del horario", () => {
    expect(minutosOcupados(lunes, [{ inicio: 780, fin: 840 }])).toBe(30);
  });
});

describe("horario público de la portada", () => {
  it("agrupa los días con el mismo horario", () => {
    expect(horarioPublico(HORARIO)).toEqual([
      { dias: "Lun – Vie", horas: "10:00–13:30, 16:30–20:30" },
      { dias: "Sábado", horas: "10:00–13:30" },
      { dias: "Domingo", horas: "Cerrado" },
    ]);
  });

  it("refleja un cambio en el horario (antes la portada no se enteraba)", () => {
    const cambiado = HORARIO.map((f) => (f.dia_semana === 6 ? { ...f, cierra: "14:00:00" } : f));
    expect(horarioPublico(cambiado)[1]).toEqual({ dias: "Sábado", horas: "10:00–14:00" });
  });
});

describe("cierres", () => {
  const cierres = [{ id: "1", desde: "2026-12-24", hasta: "2026-12-26", motivo: "Navidad", citas_afectadas: 0 }];
  it("cubren del primer al último día incluidos", () => {
    expect(cierreDelDia(cierres, "2026-12-23")).toBeNull();
    expect(cierreDelDia(cierres, "2026-12-24")?.motivo).toBe("Navidad");
    expect(cierreDelDia(cierres, "2026-12-26")?.motivo).toBe("Navidad");
    expect(cierreDelDia(cierres, "2026-12-27")).toBeNull();
  });
});
