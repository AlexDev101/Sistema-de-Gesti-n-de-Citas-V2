import { describe, expect, it } from "vitest";
import { clientesDesdeCsv, parsearCsv } from "@/lib/csv";

describe("CSV", () => {
  it("lee comillas, comas dentro de comillas y comillas escapadas", () => {
    expect(parsearCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });

  it("detecta el punto y coma de Excel en español y quita el BOM", () => {
    expect(parsearCsv("﻿Nombre;Teléfono\r\nAna;600111222\r\n")).toEqual([
      ["Nombre", "Teléfono"],
      ["Ana", "600111222"],
    ]);
  });

  it("reconoce cabeceras en español o inglés y junta nombre y apellido", () => {
    const { clientes, columnasOk } = clientesDesdeCsv(
      "First name,Last name,Mobile,E-mail\nMarc,Puig,+34 600 111 222,marc@ejemplo.es\n"
    );
    expect(columnasOk).toBe(true);
    expect(clientes).toEqual([{ nombre: "Marc Puig", telefono: "+34 600 111 222", email: "marc@ejemplo.es", notas: "" }]);
  });

  it("rechaza un fichero sin columnas de nombre y teléfono", () => {
    expect(clientesDesdeCsv("Columna A,Columna B\n1,2").columnasOk).toBe(false);
  });

  it("ignora filas vacías", () => {
    expect(clientesDesdeCsv("Nombre,Teléfono\nAna,600111222\n,\n\n").clientes).toHaveLength(1);
  });
});
