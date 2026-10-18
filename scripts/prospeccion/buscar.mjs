#!/usr/bin/env node
// Prospección de barberías para ofrecerles el sistema de citas.
//   node scripts/prospeccion/buscar.mjs --ciudad "Huelva"
// Genera una lista ordenada con su mensaje; el envío lo haces tú. Ver README.md.

import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prospectar, leerExcluidos } from "./lib/pipeline.mjs";
import { aCsv, aHtml, datosPagina } from "./lib/informe.mjs";
import { guardarFichas } from "./lib/fichas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

const AYUDA = `Uso: node scripts/prospeccion/buscar.mjs --ciudad "Huelva" [opciones]

  --ciudad   Ciudad o pueblo (obligatorio). «Niebla, Huelva» si hay varias con el mismo nombre.
  --max      Máximo de negocios a analizar (por defecto 60).
  --todas    Incluir cualquier peluquería, no sólo las de caballero.
  --nombre   Tu nombre en los mensajes (por defecto Alejandro).
  --demo     Enlace del ejemplo que se enseña (por defecto https://sgcitas.netlify.app).
  --excluir  Archivo con negocios o teléfonos a los que no escribir
             (por defecto scripts/prospeccion/no-contactar.txt, si existe).
  --salida   Carpeta de salida (por defecto scripts/prospeccion/salida/<ciudad>-<fecha>).
  --sin-webs No abrir las webs de los negocios (más rápido, menos datos).
  --sin-imagenes   Guardar textos e información de cada web, pero no descargar sus fotos.
  --max-imagenes   Fotos por negocio, además del logo (por defecto 6, máximo 20).
`;

const { values: v } = parseArgs({
  options: {
    ciudad: { type: "string" },
    max: { type: "string", default: "60" },
    todas: { type: "boolean", default: false },
    nombre: { type: "string" },
    demo: { type: "string" },
    excluir: { type: "string" },
    salida: { type: "string" },
    "sin-webs": { type: "boolean", default: false },
    "sin-imagenes": { type: "boolean", default: false },
    "max-imagenes": { type: "string", default: "6" },
    ayuda: { type: "boolean", short: "h", default: false },
  },
});

if (v.ayuda || !v.ciudad) {
  console.log(AYUDA);
  process.exit(v.ayuda ? 0 : 1);
}

const max = Number.parseInt(v.max, 10);
if (!Number.isInteger(max) || max < 1 || max > 500) {
  console.error("--max tiene que ser un número entre 1 y 500.");
  process.exit(1);
}

const maxImagenes = Number.parseInt(v["max-imagenes"], 10);
if (!Number.isInteger(maxImagenes) || maxImagenes < 1 || maxImagenes > 20) {
  console.error("--max-imagenes tiene que ser un número entre 1 y 20.");
  process.exit(1);
}

const archivoExcluir = resolve(v.excluir ?? join(AQUI, "no-contactar.txt"));
const excluidos = leerExcluidos(await readFile(archivoExcluir, "utf8").catch(() => ""));

console.log(`Buscando barberías en «${v.ciudad}»…`);
try {
  const r = await prospectar({
    ciudad: v.ciudad,
    max,
    todas: v.todas,
    excluidos,
    analizarWebs: !v["sin-webs"],
    nombre: v.nombre,
    demo: v.demo,
    alProgresar: (h, t) => process.stdout.write(`\rAnalizando webs: ${h}/${t}`),
  });
  process.stdout.write("\n");

  const fecha = new Date().toISOString().slice(0, 10);
  const slug = v.ciudad.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const carpeta = resolve(v.salida ?? join(AQUI, "salida", `${slug}-${fecha}`));
  await mkdir(carpeta, { recursive: true });
  if (!v["sin-webs"]) {
    await guardarFichas(r.leads, carpeta, {
      descargar: !v["sin-imagenes"],
      maxGaleria: maxImagenes,
      alProgresar: (h, t) => process.stdout.write(`\rGuardando información${v["sin-imagenes"] ? "" : " e imágenes"}: ${h}/${t}`),
    });
    process.stdout.write("\n");
  }
  await writeFile(join(carpeta, "leads.csv"), aCsv(r.leads));
  await writeFile(join(carpeta, "informe.html"), aHtml(r.leads, { ciudad: v.ciudad, fecha }));
  await writeFile(join(carpeta, "leads.json"), JSON.stringify(datosPagina(r.leads), null, 2));

  console.log(`\nEncontradas ${r.encontrados} en OpenStreetMap${r.excluidos ? ` (${r.excluidos} excluidas por tu lista)` : ""}; analizadas ${r.leads.length}.`);
  console.log("Las mejores para empezar:");
  for (const l of r.leads.slice(0, 5)) console.log(`  ${String(l.puntuacion).padStart(3)}  ${l.nombre}  (${l.motivos[0]})`);
  console.log(`\nAbre este archivo en el navegador:\n  ${join(carpeta, "informe.html")}\nY para Excel:\n  ${join(carpeta, "leads.csv")}`);
  const conFicha = r.leads.filter((l) => l.ficha).length;
  if (conFicha) console.log(`\nInformación${v["sin-imagenes"] ? "" : " e imágenes"} de ${conFicha} negocios en:\n  ${join(carpeta, "negocios")}`);
} catch (e) {
  console.error("\nNo se pudo completar la búsqueda:", e?.message ?? e);
  process.exit(1);
}
