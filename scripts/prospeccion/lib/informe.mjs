// Salida de la búsqueda: un CSV (para Excel) y una página HTML para trabajar la
// lista: cada negocio con sus motivos, el mensaje listo y un botón que abre
// WhatsApp con el texto ya escrito (lo envías tú). Lo de «contactado» se
// guarda sólo en tu navegador.

import { SEGMENTOS } from "./puntuar.mjs";
import { formatoNacional } from "./telefono.mjs";
import { perfilCompleto } from "./fichas.mjs";

// Una celda que empieza por = + - @ la interpretaría Excel como fórmula.
function celda(valor) {
  let t = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export const COLUMNAS = [
  ["puntuacion", "Puntuación"],
  ["nombre", "Negocio"],
  ["segmento", "Situación"],
  ["motivos", "Motivos"],
  ["telefono", "Teléfono"],
  ["movil", "Es móvil"],
  ["web", "Web"],
  ["instagram", "Instagram"],
  ["direccion", "Dirección"],
  ["descripcion", "Descripción de su web"],
  ["servicios", "Servicios y precios"],
  ["horario", "Horario"],
  ["redes", "Redes"],
  ["imagenes", "Imágenes guardadas"],
  ["carpeta", "Carpeta"],
  ["mensaje", "Mensaje de WhatsApp"],
  ["llamada", "Guion de llamada"],
  ["osm", "Ficha"],
];

const RUTA_LOCAL = /^negocios\/[a-z0-9-]+\/imagenes\/[a-z0-9-]+\.(?:jpg|png|webp|avif|gif|svg)$/;
const soloHttp = (u) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : null);

// Lo que la web del negocio publica, listo para mostrar (texto plano y direcciones http(s)).
export function fichaDe(l) {
  const p = perfilCompleto(l);
  if (!p || (p.vacio && !p.horario.length)) return null;
  return {
    descripcion: p.descripcion,
    titulares: p.titulares.slice(0, 6),
    textos: p.textos.slice(0, 3),
    servicios: p.servicios.slice(0, 15).map((x) => `${x.servicio}${x.precio ? " — " + x.precio : ""}`),
    horario: p.horario.slice(0, 8),
    direccion: p.direccion,
    redes: Object.entries(p.redes).map(([red, url]) => ({ red, url: soloHttp(url) })).filter((x) => x.url),
    logo: l.ficha?.logo && RUTA_LOCAL.test(`${l.ficha.carpeta}/${l.ficha.logo}`) ? `${l.ficha.carpeta}/${l.ficha.logo}` : null,
    fotos: (l.ficha?.galeria ?? []).map((f) => `${l.ficha.carpeta}/${f}`).filter((r) => RUTA_LOCAL.test(r)),
    fotosWeb: (p.imagenes.galeria ?? []).map(soloHttp).filter(Boolean).slice(0, 6),
    carpeta: l.ficha?.carpeta ?? null,
  };
}

export function filaPlana(l) {
  const f = fichaDe(l);
  return {
    puntuacion: l.puntuacion,
    nombre: l.nombre,
    segmento: SEGMENTOS[l.segmento] ?? l.segmento,
    motivos: l.motivos.join(" · "),
    telefono: l.telefono ? formatoNacional(l.telefono.e164) : "",
    movil: l.telefono?.movil ? "sí" : "no",
    web: l.web ?? "",
    instagram: l.instagram ? `https://instagram.com/${l.instagram}` : "",
    direccion: l.direccion,
    descripcion: f?.descripcion ?? "",
    servicios: f ? f.servicios.join(" | ") : "",
    horario: f ? f.horario.join(" | ") : "",
    redes: f ? f.redes.map((r) => r.url).join(" ") : "",
    imagenes: f ? (f.logo ? 1 : 0) + f.fotos.length : 0,
    carpeta: f?.carpeta ?? "",
    mensaje: l.mensajes.whatsapp,
    llamada: l.mensajes.llamada,
    osm: l.osm,
  };
}

export function aCsv(leads) {
  const filas = [COLUMNAS.map(([, t]) => celda(t)).join(";")];
  for (const l of leads) {
    const f = filaPlana(l);
    filas.push(COLUMNAS.map(([k]) => celda(f[k])).join(";"));
  }
  return "﻿" + filas.join("\r\n") + "\r\n"; // BOM: Excel abre bien las tildes
}

// Datos para la página: sólo lo que hace falta, con el enlace de WhatsApp ya calculado.
export function datosPagina(leads) {
  return leads.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    puntuacion: l.puntuacion,
    segmento: SEGMENTOS[l.segmento] ?? l.segmento,
    motivos: l.motivos,
    telefono: l.telefono ? formatoNacional(l.telefono.e164) : null,
    tel: l.telefono ? l.telefono.e164 : null,
    wa: l.telefono?.movil ? `https://wa.me/${l.telefono.e164.slice(1)}?text=${encodeURIComponent(l.mensajes.whatsapp)}` : null,
    web: l.web,
    instagram: l.instagram ? `https://instagram.com/${l.instagram}` : null,
    direccion: l.direccion,
    ficha: fichaDe(l),
    mensaje: l.mensajes.whatsapp,
    llamada: l.mensajes.llamada,
    osm: l.osm,
  }));
}

// JSON seguro dentro de un <script>: sin «</script>» ni separadores de línea raros.
export function jsonSeguro(x) {
  return JSON.stringify(x)
    .replace(/</g, "\\u003c")
    .replace(new RegExp("\\u2028", "g"), "\\u2028")
    .replace(new RegExp("\\u2029", "g"), "\\u2029");
}

export function aHtml(leads, { ciudad, fecha }) {
  const datos = jsonSeguro({ ciudad, fecha, leads: datosPagina(leads) });
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Barberías de ${ciudad.replace(/[<>&"]/g, "")}: lista de contacto</title>
<style>
:root{--bg:#f4f3ef;--sf:#fff;--tx:#1d1c1a;--mu:#6c6a63;--ln:#e0ded7;--ac:#5b4fd0;--ok:#1f7a4d}
@media (prefers-color-scheme:dark){:root{--bg:#15161c;--sf:#1e2029;--tx:#ececf1;--mu:#9a9cab;--ln:#2e3040;--ac:#a89dff;--ok:#5cc08b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:820px;margin:0 auto;padding:20px 16px 60px}h1{font-size:22px;margin:0 0 4px}p.s{margin:0 0 14px;color:var(--mu)}
.bar{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:0 0 16px;font-size:14px}
.card{background:var(--sf);border:1px solid var(--ln);border-radius:12px;padding:14px 16px;margin:0 0 12px}
.card.hecho{opacity:.55}.top{display:flex;gap:12px;align-items:baseline;justify-content:space-between}
.top h2{font-size:17px;margin:0}.pt{font-weight:600;color:var(--ac);white-space:nowrap}
.seg{color:var(--mu);font-size:13px;margin:2px 0 8px}ul{margin:0 0 10px;padding-left:18px;color:var(--mu);font-size:13.5px}
.datos{font-size:13.5px;color:var(--mu);margin:0 0 10px;overflow-wrap:anywhere}.datos a{color:var(--ac)}
.msg{white-space:pre-wrap;background:var(--bg);border:1px solid var(--ln);border-radius:8px;padding:10px 12px;font-size:14px;margin:0 0 10px}
.acc{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.btn{font:inherit;font-size:14px;padding:7px 12px;border-radius:8px;border:1px solid var(--ln);background:var(--sf);color:var(--tx);cursor:pointer;text-decoration:none}
.btn.p{background:var(--ok);border-color:var(--ok);color:#fff}details{margin:0 0 10px;font-size:13.5px;color:var(--mu)}
label{display:inline-flex;gap:6px;align-items:center;cursor:pointer}
.ficha{font-size:13.5px;color:var(--tx)}.ficha h3{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--mu);margin:12px 0 4px}
.ficha a{color:var(--ac)}.ficha p{margin:0 0 6px}.ficha ul{color:var(--tx);margin:0}.fotos{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.fotos img{height:84px;width:auto;max-width:150px;object-fit:cover;border-radius:6px;border:1px solid var(--ln);background:var(--bg)}
.fotos img.logo{object-fit:contain;padding:4px;background:#fff}
</style></head><body><main>
<h1>Barberías de <span id="ciudad"></span></h1>
<p class="s">Ordenadas de mayor a menor encaje. Contacta una vez, a quien tenga sentido, y respeta un «no». Nada se envía solo.</p>
<div class="bar"><label><input type="checkbox" id="ocultar"> Ocultar contactados y descartados</label><span id="cuenta"></span></div>
<div id="lista"></div>
<p class="s">Datos de OpenStreetMap (© colaboradores de OpenStreetMap, ODbL) y de la portada pública de cada web.</p>
</main>
<script type="application/json" id="datos">${datos}</script>
<script>
const D = JSON.parse(document.getElementById("datos").textContent);
document.getElementById("ciudad").textContent = D.ciudad + " (" + D.fecha + ")";
const K = "prospeccion:";
const leer = (id) => { try { return localStorage.getItem(K + id) || ""; } catch { return ""; } };
const guardar = (id, v) => { try { v ? localStorage.setItem(K + id, v) : localStorage.removeItem(K + id); } catch {} };
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const enlace = (txt, href) => { const a = el("a", null, txt); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; };
const https = (u) => /^https?:\/\//i.test(u);
function pintarFicha(f) {
  const d = el("details"); d.append(el("summary", null, "Lo que publica su web"));
  const w = el("div", "ficha");
  const seccion = (t) => { const h = el("h3", null, t); w.append(h); };
  const lista = (items) => { const u = el("ul"); items.forEach((x) => u.append(el("li", null, x))); w.append(u); };
  if (f.logo || f.fotos.length || f.fotosWeb.length) {
    seccion(f.fotos.length || f.logo ? "Imágenes guardadas" : "Imágenes (enlaces)");
    const fo = el("div", "fotos");
    const miniatura = (src, clase) => { const a = enlace("", src); const i = el("img", clase); i.src = src; i.alt = ""; i.loading = "lazy"; a.append(i); return a; };
    if (f.logo) fo.append(miniatura(f.logo, "logo"));
    f.fotos.forEach((src) => fo.append(miniatura(src)));
    if (!f.fotos.length && !f.logo) f.fotosWeb.forEach((src, i) => { const a = enlace("Foto " + (i + 1), src); a.style.marginRight = "10px"; fo.append(a); });
    w.append(fo);
    if (f.carpeta) w.append(el("p", null, "Carpeta: " + f.carpeta));
  }
  if (f.descripcion) { seccion("Descripción"); w.append(el("p", null, f.descripcion)); }
  if (f.textos.length) { seccion("Textos"); f.textos.forEach((t) => w.append(el("p", null, t))); }
  if (f.titulares.length) { seccion("Titulares"); lista(f.titulares); }
  if (f.servicios.length) { seccion("Servicios y precios"); lista(f.servicios); }
  if (f.horario.length) { seccion("Horario"); lista(f.horario); }
  if (f.direccion) { seccion("Dirección en su web"); w.append(el("p", null, f.direccion)); }
  if (f.redes.length) { seccion("Redes"); const p = el("p"); f.redes.forEach((r, i) => { if (i) p.append(" · "); if (https(r.url)) p.append(enlace(r.red, r.url)); }); w.append(p); }
  d.append(w); return d;
}
function pintar() {
  const ocultar = document.getElementById("ocultar").checked;
  const lista = document.getElementById("lista"); lista.textContent = ""; let n = 0;
  for (const l of D.leads) {
    const estado = leer(l.id);
    if (ocultar && estado) continue;
    n++;
    const c = el("div", "card" + (estado ? " hecho" : ""));
    const top = el("div", "top"); top.append(el("h2", null, l.nombre), el("span", "pt", l.puntuacion + "/100")); c.append(top);
    c.append(el("div", "seg", l.segmento));
    const ul = el("ul"); l.motivos.forEach((m) => ul.append(el("li", null, m))); c.append(ul);
    const datos = el("div", "datos"); const partes = [];
    if (l.telefono) partes.push(el("span", null, "Tel. " + l.telefono));
    if (l.web) partes.push(enlace("Web", l.web));
    if (l.instagram) partes.push(enlace("Instagram", l.instagram));
    partes.push(enlace("Ficha", l.osm));
    partes.forEach((p, i) => { if (i) datos.append(" · "); datos.append(p); });
    if (l.direccion) datos.append(" — " + l.direccion);
    c.append(datos);
    if (l.ficha) c.append(pintarFicha(l.ficha));
    c.append(el("div", "msg", l.mensaje));
    const d = el("details"); d.append(el("summary", null, "Guion si prefieres llamar"), el("div", "msg", l.llamada)); c.append(d);
    const acc = el("div", "acc");
    if (l.wa) { const a = enlace("Abrir WhatsApp con este mensaje", l.wa); a.className = "btn p"; acc.append(a); }
    if (l.tel) { const a = el("a", "btn", "Llamar"); a.href = "tel:" + l.tel; acc.append(a); }
    const cp = el("button", "btn", "Copiar mensaje"); cp.onclick = () => navigator.clipboard?.writeText(l.mensaje).then(() => { cp.textContent = "Copiado"; });
    acc.append(cp);
    for (const [v, t] of [["contactado", "Contactado"], ["descartado", "Descartar"]]) {
      const b = el("button", "btn", estado === v ? "Quitar «" + t.toLowerCase() + "»" : t);
      b.onclick = () => { guardar(l.id, estado === v ? "" : v); pintar(); }; acc.append(b);
    }
    c.append(acc); lista.append(c);
  }
  document.getElementById("cuenta").textContent = n + " de " + D.leads.length;
}
document.getElementById("ocultar").onchange = pintar; pintar();
</script></body></html>
`;
}
