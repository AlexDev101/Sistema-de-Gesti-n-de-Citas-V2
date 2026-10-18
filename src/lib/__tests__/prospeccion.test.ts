import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseTelefonos, mejorTelefono, formatoNacional } from "../../../scripts/prospeccion/lib/telefono.mjs";
import {
  buscarEnOsm,
  esBarberia,
  esRedOMarketplace,
  instagramDe,
  normalizarWeb,
  parseElementos,
} from "../../../scripts/prospeccion/lib/osm.mjs";
import { analizarHtml, analizarSitio, robotsPermiteInicio } from "../../../scripts/prospeccion/lib/sitio.mjs";
import { puntuar } from "../../../scripts/prospeccion/lib/puntuar.mjs";
import { crearMensajes } from "../../../scripts/prospeccion/lib/mensajes.mjs";
import { aCsv, aHtml, jsonSeguro } from "../../../scripts/prospeccion/lib/informe.mjs";
import { estaExcluido, leerExcluidos, prospectar } from "../../../scripts/prospeccion/lib/pipeline.mjs";

const el = (id: number, tags: Record<string, string>) => ({ type: "node", id, tags });

describe("teléfonos", () => {
  it("normaliza, descarta lo raro y quita repetidos", () => {
    const l = parseTelefonos("959 36 00 00; +34 612 34 56 78 / 0034687654321; 123; 612345678");
    expect(l.map((t: { e164: string }) => t.e164)).toEqual(["+34959360000", "+34612345678", "+34687654321"]);
    expect(l.map((t: { movil: boolean }) => t.movil)).toEqual([false, true, true]);
  });

  it("prefiere un móvil y da formato legible", () => {
    expect(mejorTelefono(parseTelefonos("959360000;612345678")).e164).toBe("+34612345678");
    expect(mejorTelefono([])).toBeNull();
    expect(formatoNacional("+34612345678")).toBe("612 34 56 78");
  });
});

describe("OpenStreetMap", () => {
  it("distingue barberías de peluquerías de señoras", () => {
    expect(esBarberia({ shop: "hairdresser", name: "Barbería Paco" })).toBe(true);
    expect(esBarberia({ shop: "hairdresser", name: "Estilo", male: "yes" })).toBe(true);
    expect(esBarberia({ shop: "hairdresser", name: "Estilo", male: "yes", female: "yes" })).toBe(false);
    expect(esBarberia({ shop: "hairdresser", name: "Salón Rosa" })).toBe(false);
    expect(esBarberia({ shop: "hairdresser", name: "Salón Rosa" }, true)).toBe(true);
  });

  it("convierte elementos en negocios, sin duplicados ni anónimos", () => {
    const leads = parseElementos({
      elements: [
        el(1, {
          shop: "hairdresser",
          name: "Barbería Uno",
          phone: "+34 959 36 00 00;612345678",
          website: "barberiauno.es",
          "contact:instagram": "https://www.instagram.com/barberia_uno/",
          "addr:street": "Calle Mayor",
          "addr:housenumber": "3",
          "addr:city": "Huelva",
        }),
        el(2, { shop: "hairdresser", name: "Barbería Uno", phone: "612345678" }), // repetida
        el(3, { shop: "hairdresser" }), // sin nombre
        el(4, { shop: "hairdresser", name: "Peluquería Rosa" }), // no es barbería
      ],
    });
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      nombre: "Barbería Uno",
      web: "https://barberiauno.es/",
      instagram: "barberia_uno",
      direccion: "Calle Mayor 3, Huelva",
      osm: "https://www.openstreetmap.org/node/1",
    });
    expect(leads[0].telefonos).toHaveLength(2);
  });

  it("normaliza webs y reconoce redes y marketplaces", () => {
    expect(normalizarWeb("www.a.es")).toBe("https://www.a.es/");
    expect(normalizarWeb("javascript:alert(1)")).toBeNull();
    expect(normalizarWeb("")).toBeNull();
    expect(esRedOMarketplace("https://www.instagram.com/x")).toBe(true);
    expect(esRedOMarketplace("https://booksy.com/es-es/123_x")).toBe(true);
    expect(esRedOMarketplace("https://mibarberia.es")).toBe(false);
    expect(instagramDe("@barber.fg")).toBe("barber.fg");
    expect(instagramDe("https://instagram.com/p/abc")).toBeNull();
  });

  it("busca en Nominatim y Overpass con la caja de la ciudad", async () => {
    const llamadas: { url: string; body?: string }[] = [];
    const fetchFn = async (url: string, init?: { body?: string }) => {
      llamadas.push({ url, body: init?.body });
      if (url.includes("nominatim")) {
        return Response.json([{ display_name: "Huelva", boundingbox: ["37.2", "37.3", "-6.97", "-6.9"] }]);
      }
      return Response.json({ elements: [el(1, { shop: "barber", name: "Barber Uno" })] });
    };
    const r = await buscarEnOsm("Huelva", { fetchFn: fetchFn as typeof fetch });
    expect(r.leads).toHaveLength(1);
    expect(decodeURIComponent(llamadas[1].body ?? "")).toContain("(37.2,-6.97,37.3,-6.9)");
  });

  it("explica los fallos de los servicios", async () => {
    const vacio = async () => Response.json([]);
    await expect(buscarEnOsm("Nowhere", { fetchFn: vacio as typeof fetch })).rejects.toThrow(/No encuentro/);
    const limite = async (url: string) =>
      url.includes("nominatim")
        ? Response.json([{ display_name: "X", boundingbox: ["1", "2", "3", "4"] }])
        : new Response("", { status: 429 });
    await expect(buscarEnOsm("X", { fetchFn: limite as typeof fetch })).rejects.toThrow(/429/);
  });
});

describe("webs de los negocios", () => {
  it("detecta plataformas, WhatsApp e Instagram en el HTML", () => {
    const a = analizarHtml(
      `<a href="https://booksy.com/es-es/1_x">Reserva</a><a href="https://wa.me/34612345678">wa</a><a href="https://instagram.com/mi_barberia">ig</a>`,
    );
    expect(a.plataformas).toEqual([{ nombre: "Booksy", tipo: "marketplace" }]);
    expect(a.whatsapp).toBe("34612345678");
    expect(a.instagram).toBe("mi_barberia");
    expect(analizarHtml("<p>Pide tu cita online</p>").textoReserva).toBe(true);
    expect(analizarHtml("<p>Hola</p>").textoReserva).toBe(false);
  });

  it("robots.txt: sólo bloquea si prohíbe todo a los robots", () => {
    expect(robotsPermiteInicio("User-agent: *\nDisallow: /")).toBe(false);
    expect(robotsPermiteInicio("User-agent: *\nDisallow: /admin")).toBe(true);
    expect(robotsPermiteInicio("User-agent: Googlebot\nDisallow: /")).toBe(true);
    expect(robotsPermiteInicio("")).toBe(true);
  });

  describe("contra un servidor real", () => {
    let servidor: Server;
    let base = "";
    beforeAll(async () => {
      servidor = createServer((req, res) => {
        const ruta = req.url ?? "/";
        if (ruta === "/robots.txt") {
          res.statusCode = ruta && req.headers.host?.includes("x") ? 404 : 404;
          return res.end();
        }
        if (ruta === "/pdf") {
          res.setHeader("content-type", "application/pdf");
          return res.end("%PDF");
        }
        if (ruta === "/roto") {
          res.statusCode = 500;
          return res.end();
        }
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(`<html><a href="https://www.treatwell.es/x">r</a><a href="https://wa.me/34600111222">w</a></html>`);
      });
      await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
      base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    });
    afterAll(() => new Promise<void>((ok) => servidor.close(() => ok())));

    it("lee la portada", async () => {
      const r = await analizarSitio(base + "/");
      expect(r.motivo).toBeNull();
      expect(r.plataformas[0]).toEqual({ nombre: "Treatwell", tipo: "marketplace" });
      expect(r.whatsapp).toBe("34600111222");
    });

    it("no se rompe con errores, otros formatos o sitios caídos", async () => {
      expect((await analizarSitio(base + "/roto")).motivo).toBe("http-500");
      expect((await analizarSitio(base + "/pdf")).motivo).toBe("no-html");
      expect((await analizarSitio("http://127.0.0.1:9/")).motivo).toBe("no-responde");
      expect((await analizarSitio(null)).web).toBeNull();
    });

    it("no abre redes sociales ni Booksy: lo deduce de la dirección", async () => {
      let llamadas = 0;
      const espia = (async () => {
        llamadas++;
        return new Response("");
      }) as typeof fetch;
      const r = await analizarSitio("https://booksy.com/es-es/1_x", { fetchFn: espia });
      expect(llamadas).toBe(0);
      expect(r.motivo).toBe("red-o-marketplace");
      expect(r.plataformas[0].nombre).toBe("Booksy");
      const ig = await analizarSitio("https://www.instagram.com/mi_barberia/", { fetchFn: espia });
      expect(ig.instagram).toBe("mi_barberia");
      expect(llamadas).toBe(0);
    });

    it("respeta un robots.txt que lo prohíbe todo", async () => {
      const fetchFn = (async (url: string) =>
        url.endsWith("/robots.txt")
          ? new Response("User-agent: *\nDisallow: /")
          : new Response("<html></html>", { headers: { "content-type": "text/html" } })) as typeof fetch;
      expect((await analizarSitio("https://ejemplo.test/", { fetchFn })).motivo).toBe("robots");
    });
  });
});

const lead = (extra = {}) => ({
  id: "node/1",
  nombre: "Barbería Uno",
  direccion: "Calle Mayor 3",
  telefonos: parseTelefonos("612345678"),
  web: "https://uno.es/",
  instagram: null,
  osm: "https://www.openstreetmap.org/node/1",
  ...extra,
});
const sitio = (extra = {}) => ({ web: null, motivo: null, plataformas: [], whatsapp: null, instagram: null, textoReserva: false, ...extra });

describe("puntuación", () => {
  it("ordena las situaciones por encaje", () => {
    const marketplace = puntuar(lead(), sitio({ plataformas: [{ nombre: "Booksy", tipo: "marketplace" }] }));
    const sinReserva = puntuar(lead(), sitio());
    const sinWeb = puntuar(lead({ web: null }), sitio());
    const propia = puntuar(lead(), sitio({ plataformas: [{ nombre: "Calendly", tipo: "herramienta" }] }));
    expect(marketplace.segmento).toBe("marketplace");
    expect(sinReserva.segmento).toBe("sin-reserva-online");
    expect(sinWeb.segmento).toBe("sin-web");
    expect(propia.segmento).toBe("herramienta-propia");
    expect(marketplace.puntuacion).toBeGreaterThan(sinReserva.puntuacion);
    expect(sinReserva.puntuacion).toBeGreaterThan(sinWeb.puntuacion);
    expect(sinWeb.puntuacion).toBeGreaterThan(propia.puntuacion);
    expect(marketplace.motivos[0]).toContain("Booksy");
  });

  it("una web que es Instagram cuenta como sin web, y sin contacto casi no puntúa", () => {
    expect(puntuar(lead({ web: "https://instagram.com/x" }), sitio({ motivo: "red-o-marketplace" })).segmento).toBe("sin-web");
    const nada = puntuar(lead({ telefonos: [], web: null }), sitio());
    expect(nada.puntuacion).toBeLessThanOrEqual(10);
    expect(nada.motivos.join(" ")).toContain("no hay forma directa");
  });
});

describe("mensajes", () => {
  it("cada situación da un mensaje con sentido, sin huecos vacíos", () => {
    const casos: [string, ReturnType<typeof sitio>][] = [
      ["marketplace", sitio({ plataformas: [{ nombre: "Booksy", tipo: "marketplace" }] })],
      ["herramienta-propia", sitio({ plataformas: [{ nombre: "Calendly", tipo: "herramienta" }] })],
      ["sin-web", sitio()],
      ["sin-reserva-online", sitio()],
    ];
    for (const [segmento, s] of casos) {
      const m = crearMensajes(lead(), s, segmento, { nombre: "Ana", demo: "https://demo.test" });
      for (const texto of [m.whatsapp, m.llamada]) {
        expect(texto).not.toMatch(/undefined|null|\$\{/);
        expect(texto).toContain("Barbería Uno");
      }
      expect(m.whatsapp).toContain("Soy Ana");
      expect(m.whatsapp).toContain("https://demo.test");
      expect(m.whatsapp).toMatch(/no te molesto|Sin compromiso/);
    }
    expect(crearMensajes(lead(), casos[0][1], "marketplace").whatsapp).toContain("Booksy");
  });
});

describe("informe", () => {
  const completo = (extra = {}) => {
    const l = lead(extra);
    const s = sitio();
    const p = puntuar(l, s);
    return { ...l, telefono: mejorTelefono(l.telefonos), sitio: s, ...p, mensajes: crearMensajes(l, s, p.segmento, {}) };
  };

  it("el CSV escapa comillas, separadores y fórmulas, y lleva BOM", () => {
    const csv = aCsv([completo({ nombre: '=HYPERLINK("x");"hola"' })]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"");""hola"""`);
    expect(csv.split("\r\n")).toHaveLength(3);
  });

  it("la página no deja escapar HTML ni scripts desde los nombres", () => {
    const sucio = completo({ nombre: `</script><img src=x onerror=alert(1)>` });
    const html = aHtml([sucio], { ciudad: "Huelva", fecha: "2026-10-18" });
    expect(html.match(/<\/script>/g)).toHaveLength(2); // los dos bloques propios, ninguno inyectado
    expect(html).not.toContain("<img src=x");
    expect(jsonSeguro({ a: "</script>\u2028" })).not.toMatch(/<\/script|\u2028/);
  });

  it("sólo ofrece WhatsApp a móviles", () => {
    const fijo = completo({ telefonos: parseTelefonos("959360000") });
    const html = aHtml([fijo, completo()], { ciudad: "Huelva", fecha: "x" });
    const datos = JSON.parse(html.match(/id="datos">([\s\S]*?)<\/script>/)![1].replace(/\\u003c/g, "<"));
    expect(datos.leads[0].wa).toBeNull();
    expect(datos.leads[1].wa).toMatch(/^https:\/\/wa\.me\/34612345678\?text=/);
  });
});

describe("flujo completo", () => {
  const elementos = {
    elements: [
      el(1, { shop: "barber", name: "Barber Booksy", phone: "612345678", website: "https://booksy.com/es-es/1_x" }),
      el(2, { shop: "barber", name: "Barber Sin Web", phone: "959360000" }),
      el(3, { shop: "barber", name: "Barber Excluido", phone: "611222333", website: "https://excluido.test" }),
      el(4, { shop: "barber", name: "Barber Con Web", phone: "622333444", website: "https://conweb.test" }),
    ],
  };
  const fetchFn = (async (url: string) => {
    if (url.includes("nominatim")) return Response.json([{ display_name: "Huelva", boundingbox: ["37.2", "37.3", "-6.97", "-6.9"] }]);
    if (url.includes("overpass")) return Response.json(elementos);
    if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
    return new Response("<html><p>Bienvenidos</p></html>", { headers: { "content-type": "text/html" } });
  }) as typeof fetch;

  it("busca, excluye, puntúa y ordena", async () => {
    const r = await prospectar({ ciudad: "Huelva", excluidos: leerExcluidos("# no molestar\nbarber excluido\n"), fetchFn });
    expect(r.encontrados).toBe(4);
    expect(r.excluidos).toBe(1);
    expect(r.leads.map((l: { nombre: string }) => l.nombre)).toEqual(["Barber Booksy", "Barber Con Web", "Barber Sin Web"]);
    expect(r.leads[0].segmento).toBe("marketplace");
    expect(r.leads[0].mensajes.whatsapp).toContain("Booksy");
  });

  it("respeta el máximo y puede saltarse las webs", async () => {
    const r = await prospectar({ ciudad: "Huelva", max: 2, analizarWebs: false, fetchFn });
    expect(r.leads).toHaveLength(2);
    expect(r.leads.every((l: { sitio: { motivo: string | null } }) => l.sitio.motivo === null)).toBe(true);
  });

  it("la lista de exclusión admite nombres y teléfonos", () => {
    const l = lead();
    expect(estaExcluido(l, leerExcluidos("uno"))).toBe(true);
    expect(estaExcluido(l, leerExcluidos("+34 612 34 56 78"))).toBe(true);
    expect(estaExcluido(l, leerExcluidos("otro\n# uno"))).toBe(false);
  });
});
