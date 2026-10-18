import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import { extraerPerfil, mayorDeSrcset, serviciosDe, redesDe, absoluta } from "../../../scripts/prospeccion/lib/perfil.mjs";
import { bajarImagen, descargarImagenes, ipPrivada } from "../../../scripts/prospeccion/lib/imagenes.mjs";
import { carpetaDe, guardarFichas } from "../../../scripts/prospeccion/lib/fichas.mjs";

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

const PAGINA = `<!doctype html><html><head>
<title>Barbería Uno &amp; Co | Huelva</title>
<meta name="description" content="Cortes cl&aacute;sicos y barba a navaja en el centro de Huelva.">
<meta property="og:image" content="/img/portada.jpg">
<link rel="apple-touch-icon" href="/touch.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BarberShop","name":"Barbería Uno",
"address":{"streetAddress":"Calle Mayor 3","postalCode":"21001","addressLocality":"Huelva"},
"openingHoursSpecification":[{"dayOfWeek":["Monday","Tuesday"],"opens":"10:00","closes":"20:00"}],
"sameAs":["https://www.facebook.com/barberia.uno","javascript:alert(1)"]}</script>
<script>var x = "<h1>no soy un titular</h1>";</script></head><body>
<nav><a href="https://www.instagram.com/barberia_uno/">IG</a><a href="https://www.instagram.com/p/ABC/">post</a><a href="https://www.tiktok.com/@barberia_uno">tt</a></nav>
<h1>Barbería Uno</h1><h2>Nuestros servicios</h2>
<img class="logo-header" src="/img/logo.svg" alt="Logo">
<p>Desde 1998 cuidamos de tu imagen con técnicas tradicionales y producto de primera calidad en Huelva.</p>
<p>Utilizamos cookies para mejorar tu experiencia en la web de la barbería de siempre en el centro.</p>
<ul><li>Corte de pelo ........ 15 €</li><li>Barba 8,50€</li><li>Corte + barba: 20 euros</li><li>Café gratis 0 €</li></ul>
<p>Lunes a viernes 10:00 - 20:00</p>
<img src="/img/trabajo1.jpg" width="800" height="600"><img src="data:image/gif;base64,R0lGOD" >
<img data-src="/img/trabajo2.webp" alt="corte"><img srcset="/img/t3-400.jpg 400w, /img/t3-1200.jpg 1200w">
<img src="/img/sprite.png"><img src="/img/pixel.gif" width="1" height="1"><img src="/img/flecha.svg">
<img src="/img/trabajo1.jpg"><div style="background-image:url('/img/fondo.jpg')"></div>
<a href="https://wa.me/34612345678">wa</a><a href="mailto:hola@uno.es">mail</a>
</body></html>`;

describe("perfil del negocio", () => {
  const p = extraerPerfil(PAGINA, "https://uno.es/");

  it("saca nombre, descripción, textos y titulares sin colar scripts ni avisos legales", () => {
    expect(p.nombre).toBe("Barbería Uno");
    expect(p.descripcion).toBe("Cortes clásicos y barba a navaja en el centro de Huelva.");
    expect(p.titulares).toEqual(["Barbería Uno", "Nuestros servicios"]);
    expect(p.textos).toHaveLength(1);
    expect(p.textos[0]).toMatch(/^Desde 1998/);
    expect(JSON.stringify(p)).not.toContain("no soy un titular");
    expect(JSON.stringify(p)).not.toContain("hola@uno.es"); // no se guardan emails
  });

  it("lee servicios con precio, dirección y horario", () => {
    expect(p.servicios).toEqual([
      { servicio: "Corte de pelo", precio: "15 €" },
      { servicio: "Barba", precio: "8,5 €" },
      { servicio: "Corte + barba", precio: "20 €" },
    ]);
    expect(p.direccion).toBe("Calle Mayor 3, 21001, Huelva");
    expect(p.horario).toEqual(["Lunes, Martes 10:00–20:00"]);
    expect(extraerPerfil("<p>Lunes a viernes 10:00 - 20:00</p>", "https://x.es/").horario).toEqual(["Lunes a viernes 10:00 - 20:00"]);
  });

  it("recoge redes de perfil, no publicaciones, y descarta enlaces peligrosos", () => {
    expect(p.redes).toEqual({
      facebook: "https://www.facebook.com/barberia.uno",
      instagram: "https://www.instagram.com/barberia_uno/",
      tiktok: "https://www.tiktok.com/@barberia_uno",
    });
    expect(redesDe(["https://www.instagram.com/p/ABC/", "https://facebook.com/sharer/sharer.php?u=x"])).toEqual({});
    expect(absoluta("javascript:alert(1)", "https://x.es")).toBeNull();
    expect(absoluta("//cdn.x.es/a.jpg", "https://x.es")).toBe("https://cdn.x.es/a.jpg");
  });

  it("distingue logo, portada y galería, y filtra iconos, píxeles y repetidas", () => {
    expect(p.imagenes.logo).toBe("https://uno.es/img/logo.svg");
    expect(p.imagenes.portada).toBe("https://uno.es/img/portada.jpg");
    expect(p.imagenes.galeria).toEqual([
      "https://uno.es/img/portada.jpg",
      "https://uno.es/img/trabajo1.jpg",
      "https://uno.es/img/trabajo2.webp",
      "https://uno.es/img/t3-1200.jpg",
      "https://uno.es/img/fondo.jpg",
    ]);
    expect(mayorDeSrcset("a.jpg 400w, b.jpg 1200w, c.jpg 800w")).toBe("b.jpg");
    expect(p.vacio).toBe(false);
    expect(extraerPerfil("<html><body>Hola</body></html>", "https://x.es/").vacio).toBe(true);
  });

  it("no se rompe con HTML roto o JSON-LD inválido", () => {
    expect(() => extraerPerfil(`<script type="application/ld+json">{no</script><h1>Hola<p>`, "https://x.es/")).not.toThrow();
    expect(serviciosDe(["Texto sin precio", "Precio 9999 €", "Corte 12€"])).toEqual([{ servicio: "Corte", precio: "12 €" }]);
  });

  it("analizarSitio lo incluye en el resultado", async () => {
    const fetchFn = (async (url: string) =>
      url.endsWith("/robots.txt") ? new Response("", { status: 404 }) : new Response(PAGINA, { headers: { "content-type": "text/html" } })) as typeof fetch;
    const r = await analizarSitio("https://uno.es/", { fetchFn });
    expect(r.perfil?.servicios).toHaveLength(3);
    expect(r.whatsapp).toBe("34612345678");
    expect((await analizarSitio(null)).perfil).toBeNull();
  });
});

describe("imágenes del negocio", () => {
  let servidor: Server;
  let base = "";
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(6000, 7)]);
  const siempre = async () => true;
  beforeAll(async () => {
    servidor = createServer((req, res) => {
      const ruta = req.url ?? "/";
      if (ruta === "/ok.png") return res.writeHead(200, { "content-type": "image/png" }).end(PNG);
      if (ruta === "/logo.svg") return res.writeHead(200, { "content-type": "image/svg+xml" }).end("<svg/>");
      if (ruta === "/pequena.png") return res.writeHead(200, { "content-type": "image/png" }).end(Buffer.alloc(100));
      if (ruta === "/enorme.png") return res.writeHead(200, { "content-type": "image/png" }).end(Buffer.alloc(200_000));
      if (ruta === "/html.png") return res.writeHead(200, { "content-type": "text/html" }).end("<h1>no</h1>");
      if (ruta === "/salto") return res.writeHead(302, { location: "/ok.png" }).end();
      res.writeHead(404).end();
    });
    await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((ok) => servidor.close(() => ok())));

  it("reconoce las direcciones internas", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(ipPrivada(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700::1111"]) expect(ipPrivada(ip), ip).toBe(false);
  });

  it("baja imágenes válidas y rechaza lo demás", async () => {
    const o = { esPublico: siempre };
    expect((await bajarImagen(base + "/ok.png", o))?.extension).toBe("png");
    expect((await bajarImagen(base + "/salto", o))?.extension).toBe("png");
    expect(await bajarImagen(base + "/pequena.png", { ...o, min: 4000 })).toBeNull();
    expect(await bajarImagen(base + "/enorme.png", { ...o, max: 1000 })).toBeNull();
    expect(await bajarImagen(base + "/html.png", o)).toBeNull();
    expect(await bajarImagen(base + "/no-existe.png", o)).toBeNull();
    expect(await bajarImagen(base + "/logo.svg", o)).toBeNull(); // SVG sólo como logo
    expect((await bajarImagen(base + "/logo.svg", { ...o, svg: true }))?.extension).toBe("svg");
    expect(await bajarImagen("file:///etc/passwd", o)).toBeNull();
    expect(await bajarImagen("http://user:pass@x.es/a.png", o)).toBeNull();
  });

  it("no entra en direcciones internas, ni directo ni por redirección", async () => {
    expect(await bajarImagen(base + "/ok.png")).toBeNull(); // 127.0.0.1 con la protección de verdad
    expect(await bajarImagen("http://localhost/a.png")).toBeNull();
    expect(await bajarImagen("http://169.254.169.254/latest/meta-data")).toBeNull();
    let visitado = false;
    const redirige = (async (url: string) => {
      if (url.includes("publica.test")) return new Response(null, { status: 302, headers: { location: "http://10.0.0.1/secreto.png" } });
      visitado = true;
      return new Response(PNG, { headers: { "content-type": "image/png" } });
    }) as typeof fetch;
    const soloPublicos = async (h: string) => h === "publica.test";
    expect(await bajarImagen("https://publica.test/a.png", { fetchFn: redirige, esPublico: soloPublicos })).toBeNull();
    expect(visitado).toBe(false);
  });

  it("guarda las fichas con nombres propios y no revienta si algo falla", async () => {
    const raiz = await mkdtemp(join(tmpdir(), "prospeccion-"));
    try {
      const l = lead({ nombre: "../../Barbería ÑÑ <script>", id: "node/9", horario: "Mo-Fr 10:00-20:00" });
      const perfil = extraerPerfil(PAGINA.replace(/https?:\/\/uno\.es/g, ""), base + "/");
      perfil.imagenes = { logo: base + "/logo.svg", portada: base + "/ok.png", galeria: [base + "/ok.png", base + "/html.png", base + "/salto"] };
      perfil.horario = [];
      const completo: Record<string, unknown> & { ficha?: { logo: string | null; galeria: string[] } } = { ...l, telefono: mejorTelefono(l.telefonos), sitio: { ...sitio(), perfil } };
      const sin: Record<string, unknown> & { ficha?: unknown } = { ...lead({ id: "node/10" }), sitio: sitio() };
      await guardarFichas([completo, sin], raiz, { esPublico: siempre });

      expect(carpetaDe(completo as { nombre: string; id: string })).toMatch(/^negocios\/[a-z0-9-]+-node-9$/);
      expect(completo.ficha?.galeria).toHaveLength(2);
      expect(completo.ficha?.logo).toBe("imagenes/logo.svg");
      expect(sin.ficha).toBeUndefined();
      const dir = join(raiz, carpetaDe(completo));
      expect((await readdir(join(dir, "imagenes"))).sort()).toEqual(["foto-01.png", "foto-02.png", "logo.svg"]);
      const json = JSON.parse(await readFile(join(dir, "perfil.json"), "utf8"));
      expect(json.perfil.horario).toEqual(["Mo-Fr 10:00-20:00"]); // respaldo de OpenStreetMap
      expect(json.perfil.servicios).toHaveLength(3);
      const solo = await descargarImagenes({ imagenes: { logo: null, galeria: [] } }, raiz);
      expect(solo).toEqual({ logo: null, galeria: [], fallidas: 0 });
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it("el informe enseña la ficha sin dejar pasar HTML ni rutas raras", () => {
    const l = lead({ nombre: "Uno" });
    const perfil = extraerPerfil(PAGINA, "https://uno.es/");
    perfil.descripcion = `<img src=x onerror=alert(1)>`;
    const c = {
      ...l,
      telefono: mejorTelefono(l.telefonos),
      sitio: { ...sitio(), perfil },
      ...puntuar(l, sitio()),
      mensajes: crearMensajes(l, sitio(), "sin-web", {}),
      ficha: { carpeta: "negocios/uno-node-1", logo: "imagenes/logo.svg", galeria: ["imagenes/foto-01.png", "../../etc/passwd"] },
    };
    const html = aHtml([c], { ciudad: "Huelva", fecha: "x" });
    const datos = JSON.parse(html.match(/id="datos">([\s\S]*?)<\/script>/)![1].replace(/\\u003c/g, "<"));
    expect(datos.leads[0].ficha.fotos).toEqual(["negocios/uno-node-1/imagenes/foto-01.png"]);
    expect(datos.leads[0].ficha.logo).toBe("negocios/uno-node-1/imagenes/logo.svg");
    expect(html).not.toContain("<img src=x");
    const csv = aCsv([c]);
    expect(csv).toContain("Corte de pelo — 15 €");
    expect(csv).toContain("negocios/uno-node-1");
  });
});
