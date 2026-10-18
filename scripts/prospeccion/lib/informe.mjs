// Salida de la búsqueda: un CSV (para Excel) y una página HTML para trabajar la
// lista: cada negocio con sus motivos, el mensaje listo y un botón que abre
// WhatsApp con el texto ya escrito (lo envías tú). Lo de «contactado» se
// guarda sólo en tu navegador.

import { SEGMENTOS } from "./puntuar.mjs";
import { formatoNacional } from "./telefono.mjs";

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
  ["mensaje", "Mensaje de WhatsApp"],
  ["llamada", "Guion de llamada"],
  ["osm", "Ficha"],
];

export function filaPlana(l) {
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
