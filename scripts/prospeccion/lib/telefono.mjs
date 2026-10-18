// Teléfonos de un negocio tal como vienen en los datos públicos («959 36 00 00»,
// «+34 612345678», «959360000; 612345678»…). Devuelve los válidos en formato
// internacional y marca los móviles españoles (6xx / 7xx), que son los que
// tienen WhatsApp casi siempre; un fijo (9xx) se llama.

export function normalizarTelefono(texto) {
  let d = String(texto ?? "").replace(/[^\d+]/g, "");
  if (d.startsWith("0034")) d = "+34" + d.slice(4);
  if (/^\d{9}$/.test(d)) d = "+34" + d;
  if (/^\+34[6-9]\d{8}$/.test(d)) return { e164: d, movil: /^\+34[67]/.test(d) };
  return null; // extranjero o con un formato raro: no se usa
}

export function parseTelefonos(valor) {
  const vistos = new Set();
  const lista = [];
  for (const trozo of String(valor ?? "").split(/[;/,]/)) {
    const t = normalizarTelefono(trozo);
    if (t && !vistos.has(t.e164)) {
      vistos.add(t.e164);
      lista.push(t);
    }
  }
  return lista;
}

// El mejor para contactar: un móvil si lo hay.
export function mejorTelefono(lista) {
  return lista.find((t) => t.movil) ?? lista[0] ?? null;
}

// «+34612345678» → «612 34 56 78» (para mostrarlo).
export function formatoNacional(e164) {
  const n = e164.replace(/^\+34/, "");
  return n.length === 9 ? `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}` : e164;
}
