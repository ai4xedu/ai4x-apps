// ============================================================================
// TABLEAU DE BORD LOCAL — l'IA décrit, Nanomizer dessine, avec les vraies
// données, sur le poste. Aucun artefact, aucun nuage.
//
// L'IA n'envoie qu'une DESCRIPTION déclarative (type de graphique, colonnes,
// agrégat) — jamais de code : rien de ce qu'elle écrit n'est exécuté. La page
// produite est autonome (SVG en ligne, aucune ressource externe), contient les
// VRAIES valeurs, et n'est donc jamais renvoyée à l'IA (nom en -decode-).
// ============================================================================

export const CHART_TYPES = ["barres", "courbe", "secteurs", "tableau", "indicateur"];
export const AGGREGATES = ["somme", "moyenne", "nombre", "min", "max"];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = (v) => (typeof v === "number" ? v : Number(String(v).replace(/[\s  ]/g, "").replace(",", ".")));
const fmt = (v) => (Number.isFinite(v)
  ? v.toLocaleString("fr-FR", { maximumFractionDigits: Math.abs(v) < 100 ? 2 : 0 })
  : "—");

/* Trouve une colonne par son en-tête, tel que l'IA l'a vu (codé) ou réel. */
export function findColumn(headers, wanted) {
  if (wanted == null || wanted === "") return -1;
  const w = String(wanted).trim().toLowerCase();
  return headers.findIndex((h) => h.shown.trim().toLowerCase() === w || h.real.trim().toLowerCase() === w);
}

function aggregate(values, how) {
  const xs = values.map(num).filter(Number.isFinite);
  switch (how) {
    case "nombre": return values.length;
    case "moyenne": return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
    case "min": return xs.length ? Math.min(...xs) : NaN;
    case "max": return xs.length ? Math.max(...xs) : NaN;
    default: return xs.reduce((a, b) => a + b, 0);
  }
}

/* Calcule les séries d'un graphique. rows : tableaux de valeurs RÉELLES. */
export function computeChart(spec, headers, rows) {
  const ix = findColumn(headers, spec.colonne_x);
  const iy = findColumn(headers, spec.colonne_y);
  const how = AGGREGATES.includes(spec.agregat) ? spec.agregat : (iy >= 0 ? "somme" : "nombre");
  const problems = [];
  if (spec.colonne_x && ix < 0) problems.push(`colonne « ${spec.colonne_x} » introuvable`);
  if (spec.colonne_y && iy < 0) problems.push(`colonne « ${spec.colonne_y} » introuvable`);
  if (spec.type === "indicateur") {
    return { problems, how, value: aggregate(rows.map((r) => (iy >= 0 ? r[iy] : 1)), how), points: [] };
  }
  if (spec.type === "tableau") {
    return { problems, how, points: [], table: rows.slice(0, Math.min(Number(spec.limite) || 50, 500)) };
  }
  if (ix < 0) problems.push("colonne_x requise pour ce type de graphique");
  const groups = new Map();
  for (const r of rows) {
    const k = ix >= 0 ? String(r[ix] ?? "") : "";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(iy >= 0 ? r[iy] : 1);
  }
  let points = [...groups].map(([label, vals]) => ({ label, value: aggregate(vals, how) }));
  if (spec.tri === "desc") points.sort((a, b) => b.value - a.value);
  if (spec.tri === "asc") points.sort((a, b) => a.value - b.value);
  points = points.slice(0, Math.min(Number(spec.limite) || 24, 100));
  return { problems, how, points };
}

const PALETTE = ["#6A48F0", "#1E9E8C", "#E0892B", "#C2417A", "#3F7FD8", "#8A9A2C", "#9C5BD1", "#D35C3A"];

function bars(points) {
  const W = 640, H = 300, L = 70, B = 70, T = 16;
  const max = Math.max(0, ...points.map((p) => p.value));
  const min = Math.min(0, ...points.map((p) => p.value));
  const span = max - min || 1;
  const y = (v) => T + (H - T - B) * (1 - (v - min) / span);
  const bw = (W - L - 10) / Math.max(points.length, 1);
  const ticks = [min, min + span / 2, max];
  return `<svg viewBox="0 0 ${W} ${H}" role="img">` +
    ticks.map((t) => `<line x1="${L}" x2="${W - 6}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${L - 6}" y="${y(t) + 4}" class="tick" text-anchor="end">${esc(fmt(t))}</text>`).join("") +
    points.map((p, i) => {
      const x = L + i * bw + bw * 0.15, top = Math.min(y(p.value), y(0)), h = Math.abs(y(p.value) - y(0));
      return `<rect x="${x}" y="${top}" width="${bw * 0.7}" height="${Math.max(h, 0.5)}" fill="${PALETTE[0]}"><title>${esc(p.label)} : ${esc(fmt(p.value))}</title></rect>` +
        `<text x="${x + bw * 0.35}" y="${H - B + 14}" class="lbl" text-anchor="end" transform="rotate(-35 ${x + bw * 0.35} ${H - B + 14})">${esc(String(p.label).slice(0, 22))}</text>`;
    }).join("") + "</svg>";
}

function line(points) {
  const W = 640, H = 300, L = 70, B = 70, T = 16;
  const vals = points.map((p) => p.value);
  const max = Math.max(...vals), min = Math.min(0, ...vals), span = max - min || 1;
  const x = (i) => L + (W - L - 20) * (points.length > 1 ? i / (points.length - 1) : 0.5);
  const y = (v) => T + (H - T - B) * (1 - (v - min) / span);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" role="img">` +
    [min, min + span / 2, max].map((t) => `<line x1="${L}" x2="${W - 6}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${L - 6}" y="${y(t) + 4}" class="tick" text-anchor="end">${esc(fmt(t))}</text>`).join("") +
    `<path d="${d}" fill="none" stroke="${PALETTE[0]}" stroke-width="2.5"/>` +
    points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="3.5" fill="${PALETTE[0]}"><title>${esc(p.label)} : ${esc(fmt(p.value))}</title></circle>` +
      `<text x="${x(i)}" y="${H - B + 14}" class="lbl" text-anchor="end" transform="rotate(-35 ${x(i)} ${H - B + 14})">${esc(String(p.label).slice(0, 22))}</text>`).join("") +
    "</svg>";
}

function pie(points) {
  const total = points.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  let a = -Math.PI / 2;
  const R = 110, r = 62, C = 130;
  const arcs = points.map((p, i) => {
    const frac = Math.max(0, p.value) / total, b = a + frac * Math.PI * 2, large = b - a > Math.PI ? 1 : 0;
    const P = (ang, rad) => `${(C + rad * Math.cos(ang)).toFixed(2)},${(C + rad * Math.sin(ang)).toFixed(2)}`;
    const path = frac >= 0.9999
      ? `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="${R - r}"/>`
      : `<path d="M${P(a, R)} A${R},${R} 0 ${large} 1 ${P(b, R)} L${P(b, r)} A${r},${r} 0 ${large} 0 ${P(a, r)} Z" fill="${PALETTE[i % PALETTE.length]}"><title>${esc(p.label)} : ${esc(fmt(p.value))}</title></path>`;
    a = b;
    return path;
  }).join("");
  const legend = points.map((p, i) => `<li><span class="sw" style="background:${PALETTE[i % PALETTE.length]}"></span>${esc(p.label)} <b>${esc(fmt(p.value))}</b> <span class="muted">(${(100 * Math.max(0, p.value) / total).toFixed(1)} %)</span></li>`).join("");
  return `<div class="pie"><svg viewBox="0 0 260 260" role="img" style="max-width:260px">${arcs}</svg><ul class="legend">${legend}</ul></div>`;
}

function table(headers, rows) {
  return `<div class="wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h.real)}</th>`).join("")}</tr></thead><tbody>` +
    rows.map((r) => `<tr>${headers.map((_, i) => {
      const v = r[i];
      return typeof v === "number" ? `<td class="num">${esc(fmt(v))}</td>` : `<td>${esc(v)}</td>`;
    }).join("")}</tr>`).join("") + "</tbody></table></div>";
}

/* La page complète. */
export function renderDashboard({ titre, graphiques, headers, rows, generatedAt = new Date(), version }) {
  const problems = [];
  const blocks = graphiques.map((g, i) => {
    const c = computeChart(g, headers, rows);
    for (const p of c.problems) problems.push(`graphique ${i + 1} : ${p}`);
    let body;
    if (g.type === "indicateur") body = `<p class="kpi">${esc(fmt(c.value))}</p>`;
    else if (g.type === "tableau") body = table(headers, c.table);
    else if (!c.points.length) body = '<p class="muted">Aucune donnée.</p>';
    else if (g.type === "courbe") body = line(c.points);
    else if (g.type === "secteurs") body = pie(c.points);
    else body = bars(c.points);
    const sub = g.type === "tableau" ? "" : `${esc(c.how)}${g.colonne_y ? ` de ${esc(g.colonne_y)}` : ""}${g.colonne_x ? ` par ${esc(g.colonne_x)}` : ""}`;
    return `<section class="card${g.type === "indicateur" ? " small" : ""}"><h2>${esc(g.titre || `Graphique ${i + 1}`)}</h2>${sub ? `<p class="muted">${sub}</p>` : ""}${body}</section>`;
  }).join("\n");
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre || "Tableau de bord")}</title>
<style>
:root { --paper:#F5F5F8; --ink:#0B0D12; --muted:#585C6C; --line:#DCDCE6; --surface:#FFFFFF; --key:#6A48F0;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
@media (prefers-color-scheme: dark) { :root { --paper:#0B0D12; --ink:#ECECF2; --muted:#9A9EB0; --line:#262A38; --surface:#12141C; --key:#A792FF; color-scheme: dark; } }
body { margin:0; background:var(--paper); color:var(--ink); font:15px/1.5 var(--sans); }
main { max-width:72rem; margin:0 auto; padding:2rem 16px 3rem; display:flex; flex-direction:column; gap:1.25rem; }
h1 { font-family:var(--mono); font-size:1.5rem; margin:0; } h2 { font-size:1rem; margin:0; }
.muted { color:var(--muted); font-size:.88rem; margin:0; }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 30rem), 1fr)); gap:1rem; }
.card { background:var(--surface); border:1px solid var(--line); padding:1rem 1.1rem; display:flex; flex-direction:column; gap:.5rem; min-width:0; }
.kpi { font-family:var(--mono); font-size:2.2rem; font-weight:700; margin:.2rem 0 0; font-variant-numeric:tabular-nums; }
svg { width:100%; height:auto; } .grid line, line.grid { stroke:var(--line); }
text.tick, text.lbl { fill:var(--muted); font-size:11px; font-family:var(--sans); }
.pie { display:flex; flex-wrap:wrap; gap:1rem; align-items:center; } .legend { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:.3rem; font-size:.9rem; }
.sw { display:inline-block; width:.8rem; height:.8rem; margin-right:.4rem; vertical-align:-1px; }
.wrap { overflow-x:auto; } table { border-collapse:collapse; width:100%; font-size:.88rem; }
th, td { text-align:left; padding:.35rem .6rem; border-bottom:1px solid var(--line); white-space:nowrap; } td.num { text-align:right; font-variant-numeric:tabular-nums; }
.note { border-left:3px solid #B4232F; padding-left:.8rem; }
</style></head><body><main>
<header style="display:flex;flex-direction:column;gap:.35rem"><h1>${esc(titre || "Tableau de bord")}</h1>
<p class="muted">Dessiné par Nanomizer${version ? ` v${esc(version)}` : ""} sur ce poste, le ${esc(generatedAt.toLocaleString("fr-FR"))}, avec les vraies données (${rows.length} ligne(s)). L'IA a décrit ce tableau de bord sans en voir les valeurs. Ne le transmettez qu'à qui a le droit de les voir.</p></header>
${problems.length ? `<p class="note">${problems.map(esc).join(" · ")}</p>` : ""}
<div class="grid">${blocks}</div>
</main></body></html>
`;
  return { html, problems };
}
