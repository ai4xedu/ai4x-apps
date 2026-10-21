// ============================================================================
// JOURNAL « CE QUE CLAUDE A VU » — la preuve, sur le poste, de la promesse.
//
// Chaque réponse d'outil est notée ICI, après le verrou de sortie : c'est
// exactement le texte que le modèle reçoit, ni plus ni moins. L'utilisateur
// (ou son DPO) ouvre ensuite une page locale qui dit, chiffres à l'appui :
// « voici tout ce que Claude a reçu ; 0 valeur réelle ».
//
// TROIS RÈGLES :
//   1. LOCAL. Le journal vit dans le sous-dossier du connecteur, droits 600 ;
//      il ne part nulle part — aucun envoi, aucune télémétrie.
//   2. AUDIT RÉTROACTIF. À chaque consultation, tout le journal est repassé
//      contre la clé ACTUELLE : une valeur sortie avant que la clé la
//      connaisse est retrouvée après coup. Le journal ne se contente pas de
//      dire « j'ai filtré » ; il vérifie.
//   3. LA PAGE NE RÉVÈLE RIEN. Une fuite y est montrée par son CODE (« NOM-012
//      était en clair »), jamais par sa valeur : la page peut être ouverte,
//      transmise, ou lue par l'IA sans danger. Des demandes de l'IA, elle ne
//      montre que le NOM des paramètres : ces demandes sont écrites par l'IA
//      ou l'utilisateur (« filtre lahlou ») et peuvent citer un vrai nom que
//      Nanomizer n'a jamais envoyé. Le journal brut (.jsonl), lui,
//      garde la vérité — y compris une éventuelle fuite — et n'est jamais
//      servi au modèle.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { knownValueMatcher, CODE_SRC } from "./verrou.js";
import { guardText, MASK, OWN_LINKS } from "./sortie.js";
import { PREFIX_LABEL } from "./engine.js";

export const JOURNAL_DIRNAME = "journal-ia";
export const REPORT_NAME = "CE-QUE-CLAUDE-A-VU.html";
const MAX_RENDERED = 500;   // échanges détaillés dans la page (les plus récents)

const CODE_RX = new RegExp(CODE_SRC, "gu");
/* Nombres en clair, codes exclus : montants, dates, quantités… Comptés pour
   être honnête — tant que les chiffres ne sont pas protégés, ils sortent. */
const NUMBER_RX = /(?<![\p{L}\p{N}-])\p{Nd}[\p{Nd}   .,]*\p{Nd}(?![\p{L}\p{N}])/gu;

export function createJournal(dir, now = () => new Date()) {
  let failures = 0;
  return {
    dir,
    get failures() { return failures; },
    record(outil, args, texte) {
      try {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        const t = now();
        const file = path.join(dir, `${t.toISOString().slice(0, 7)}.jsonl`);
        fs.appendFileSync(file, JSON.stringify({ t: t.toISOString(), outil, args, texte }) + "\n", { encoding: "utf8", mode: 0o600 });
      } catch {
        failures++;   // jamais bloquant ; mais la page le dira
      }
    },
  };
}

export function readJournal(dir) {
  let files = [];
  try { files = fs.readdirSync(dir).filter((n) => /^\d{4}-\d{2}\.jsonl$/.test(n)).sort(); } catch { return { entries: [], unreadable: 0 }; }
  const entries = [];
  let unreadable = 0;
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { entries.push(JSON.parse(line)); } catch { unreadable++; }
    }
  }
  return { entries, unreadable };
}

/* Contrôle d'un texte : les codes déjà posés sont mis à l'abri, puis on
   cherche ce qui n'aurait pas dû y être. Renvoie le texte « propre » (fuites
   remplacées par leur code, marquées) et les comptes. */
export function inspect(texte, book) {
  // Nos propres tournures (« Ce que Claude a vu », « TABLEAU CODÉ »…) ne sont
  // pas des données : si un mot qu'elles contiennent entre plus tard dans la
  // clé (« Claude », « Tableau »), elles ne deviennent pas des fuites.
  const own = [];
  let s = String(texte);
  for (const rx of OWN_LINKS) s = s.replace(rx, (m) => { own.push(m); return `\u0002${own.length - 1}\u0002`; });
  const shelter = [];
  s = s.replace(CODE_RX, (m) => { shelter.push(m); return `\u0000${shelter.length - 1}\u0000`; });
  const leaks = [];
  const known = book ? knownValueMatcher(book) : null;
  if (known) {
    const r = known(s);
    if (r.replaced) {
      s = r.text.replace(CODE_RX, (code) => { leaks.push(code); return `\u0001${code}\u0001`; });
    }
  }
  const g = guardText(s, {});
  s = g.text;
  const numbers = (s.replace(/\u0000\d+\u0000|\u0001[^\u0001]*\u0001|\u0002\d+\u0002/g, " ").match(NUMBER_RX) || [])
    .filter((n) => n.replace(/\D/g, "").length >= 2);
  const codes = [...String(texte).matchAll(CODE_RX)].map((m) => m[0]);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => shelter[Number(i)]).replace(/\u0002(\d+)\u0002/g, (_, i) => own[Number(i)]);
  return { clean: s, leaks, forms: g.masked, numbers: numbers.length, codes };
}

/* Audit complet : journal + fichiers *-anonymise.* mis à disposition de l'IA. */
export function auditJournal({ entries, unreadable = 0 }, aiFiles, book) {
  const codes = new Map();
  const leaks = [];
  let forms = 0, numbers = 0, masks = 0;
  const inspected = entries.map((e) => {
    const r = inspect(e.texte, book);
    for (const c of r.codes) codes.set(c, true);
    for (const c of r.leaks) leaks.push({ t: e.t, outil: e.outil, code: c });
    forms += r.forms;
    numbers += r.numbers;
    masks += (String(e.texte).match(/\[MASQUÉ/g) || []).length;
    let params = [];
    try { params = Object.keys(JSON.parse(e.args || "{}")); } catch {}
    return { ...e, r, params };
  });
  const files = aiFiles.map((f) => {
    const r = inspect(f.texte, book);
    for (const c of r.codes) codes.set(c, true);
    for (const c of r.leaks) leaks.push({ t: f.mtime, outil: `fichier ${f.name}`, code: c });
    forms += r.forms;
    return { name: f.name, leaks: r.leaks.length, forms: r.forms, numbers: r.numbers, codes: new Set(r.codes).size };
  });
  const byPrefix = {};
  for (const c of codes.keys()) {
    const p = c.split("-")[0];
    byPrefix[p] = (byPrefix[p] || 0) + 1;
  }
  return {
    exchanges: entries.length,
    unreadable,
    first: entries.length ? entries[0].t : null,
    last: entries.length ? entries[entries.length - 1].t : null,
    distinctCodes: codes.size,
    byPrefix,
    leaks,
    forms,
    masks,
    numbers,
    files,
    inspected,
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const dt = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? esc(iso) :
    d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

function highlight(clean) {
  return esc(clean)
    .replace(/\u0001([^\u0001]*)\u0001/g, '<mark class="leak" title="était en clair">$1</mark>')
    .replace(new RegExp(CODE_SRC, "gu"), (m) => `<span class="code">${m}</span>`)
    .replace(new RegExp(esc(MASK).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), '<mark class="masked" title="retenu par le verrou">[MASQUÉ]</mark>');
}

/* La page locale. Hors ligne, autonome, aucune ressource externe. */
export function renderReport(a, { version, generatedAt = new Date(), failures = 0 } = {}) {
  const ok = !a.leaks.length && !a.forms;
  const verdict = ok
    ? `Aucune valeur réelle connue de la clé dans les ${a.exchanges} réponse(s) reçues par l'IA`
    : `${a.leaks.length + a.forms} élément(s) sensible(s) retrouvé(s) dans ce que l'IA a reçu`;
  const prefixRows = Object.entries(a.byPrefix).sort((x, y) => y[1] - x[1])
    .map(([p, n]) => `<tr><td>${esc(PREFIX_LABEL[p] || p)}</td><td class="num">${n}</td></tr>`).join("");
  const leakRows = a.leaks.map((l) =>
    `<tr><td>${dt(l.t)}</td><td>${esc(l.outil)}</td><td><mark class="leak">${esc(l.code)}</mark></td></tr>`).join("");
  const fileRows = a.files.map((f) =>
    `<tr><td>${esc(f.name)}</td><td class="num">${f.codes}</td><td class="num">${f.numbers}</td><td class="num">${f.leaks + f.forms ? `<mark class="leak">${f.leaks + f.forms}</mark>` : "0"}</td></tr>`).join("");
  const recent = a.inspected.slice(-MAX_RENDERED).reverse();
  const items = recent.map((e) => {
    const bad = e.r.leaks.length + e.r.forms;
    return `<details${bad ? " open" : ""}><summary><span class="when">${dt(e.t)}</span><span class="tool">${esc(e.outil)}</span>` +
      `<span class="stat">${new Set(e.r.codes).size} code(s)${e.r.numbers ? ` · ${e.r.numbers} nombre(s)` : ""}</span>` +
      `${bad ? '<span class="flag">à vérifier</span>' : ""}</summary>` +
      (e.params.length ? `<p class="args">Paramètres de la demande : ${e.params.map(esc).join(", ")}</p>` : "") +
      `<pre>${highlight(e.r.clean)}</pre></details>`;
  }).join("\n");

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ce que Claude a vu</title>
<style>
:root { --paper:#F5F5F8; --ink:#0B0D12; --muted:#585C6C; --line:#DCDCE6; --surface:#FFFFFF; --key:#6A48F0; --key-soft:#ECE7FF;
  --ok:#1E7A4F; --ok-soft:#E3F4EA; --leak:#B4232F; --leak-soft:#FBE9EA;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
@media (prefers-color-scheme: dark) { :root { --paper:#0B0D12; --ink:#ECECF2; --muted:#9A9EB0; --line:#262A38; --surface:#12141C;
  --key:#A792FF; --key-soft:#231C45; --ok:#5FD39A; --ok-soft:#10291D; --leak:#FF7A84; --leak-soft:#3A1418; color-scheme: dark; } }
body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.55 var(--sans); }
main { max-width:60rem; margin:0 auto; padding:2.5rem 16px 4rem; display:flex; flex-direction:column; gap:2rem; }
h1 { font-family:var(--mono); font-size:1.7rem; margin:0; } h2 { font-family:var(--mono); font-size:1.05rem; margin:0 0 .6rem; }
p { margin:0; max-width:70ch; } .muted { color:var(--muted); font-size:.92rem; }
.verdict { padding:1rem 1.2rem; border:1px solid var(--line); background:var(--surface); display:flex; flex-direction:column; gap:.3rem; }
.verdict.ok { border-left:4px solid var(--ok); } .verdict.ko { border-left:4px solid var(--leak); }
.verdict strong { font-size:1.15rem; }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(10rem, 1fr)); gap:1px; background:var(--line); border:1px solid var(--line); }
.grid div { background:var(--surface); padding:.9rem 1rem; display:flex; flex-direction:column; gap:.15rem; }
.grid b { font-family:var(--mono); font-size:1.5rem; font-variant-numeric:tabular-nums; } .grid span { color:var(--muted); font-size:.88rem; }
table { width:100%; border-collapse:collapse; background:var(--surface); border:1px solid var(--line); font-size:.93rem; }
th, td { text-align:left; padding:.45rem .8rem; border-bottom:1px solid var(--line); } th { font-size:.75rem; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); font-weight:500; }
td.num { text-align:right; font-variant-numeric:tabular-nums; }
.wrap { overflow-x:auto; }
.code { font-family:var(--mono); font-size:.9em; background:var(--key-soft); color:var(--key); padding:0 .2em; }
mark.leak { background:var(--leak-soft); color:var(--leak); font-weight:600; padding:0 .2em; }
mark.masked { background:var(--key-soft); color:var(--key); padding:0 .2em; }
details { background:var(--surface); border:1px solid var(--line); } details + details { border-top:0; }
summary { cursor:pointer; padding:.55rem .8rem; display:flex; flex-wrap:wrap; gap:.4rem 1rem; align-items:baseline; }
summary:focus-visible { outline:2px solid var(--key); outline-offset:-2px; }
.when { font-family:var(--mono); font-size:.85rem; color:var(--muted); } .tool { font-weight:600; } .stat { color:var(--muted); font-size:.88rem; }
.flag { color:var(--leak); font-weight:600; font-size:.85rem; }
pre { margin:0; padding:.8rem; border-top:1px solid var(--line); white-space:pre-wrap; word-break:break-word; font:13px/1.5 var(--mono); }
.args { padding:.5rem .8rem 0; font-size:.9rem; color:var(--muted); }
</style></head><body><main>
<header style="display:flex;flex-direction:column;gap:.6rem">
  <h1>Ce que Claude a vu</h1>
  <p class="muted">Journal local de Nanomizer${version ? ` v${esc(version)}` : ""} · du ${dt(a.first)} au ${dt(a.last)} · page générée le ${dt(generatedAt.toISOString())} sur ce poste. Rien de ce journal n'a été envoyé ailleurs.</p>
</header>
<section class="verdict ${ok ? "ok" : "ko"}">
  <strong>${esc(verdict)}</strong>
  <p class="muted">Chaque réponse envoyée à l'IA est notée ici après le verrou de sortie, puis revérifiée à l'instant contre la clé actuelle (${a.distinctCodes} code(s) vus). Une valeur retrouvée est affichée par son code, jamais en clair.${failures ? ` Attention : ${failures} réponse(s) de cette session n'ont pas pu être notées (disque plein ou droits).` : ""}${a.unreadable ? ` ${a.unreadable} ligne(s) du journal sont illisibles.` : ""}</p>
</section>
<section class="grid" aria-label="Chiffres clés">
  <div><b>${a.exchanges}</b><span>réponses reçues par l'IA</span></div>
  <div><b>${a.distinctCodes}</b><span>codes distincts (noms, identifiants…)</span></div>
  <div><b>${a.leaks.length}</b><span>valeurs réelles retrouvées</span></div>
  <div><b>${a.forms}</b><span>formes sensibles non codées (e-mail, téléphone, IBAN…)</span></div>
  <div><b>${a.numbers}</b><span>nombres en clair (montants, dates, quantités)</span></div>
</section>
${a.leaks.length ? `<section><h2>Valeurs retrouvées en clair</h2><p class="muted" style="margin-bottom:.6rem">Le code correspondant se décode avec la clé, sur ce poste. Signalez-le : chaque cas devient un test du connecteur.</p><div class="wrap"><table><thead><tr><th>Quand</th><th>Où</th><th>Code</th></tr></thead><tbody>${leakRows}</tbody></table></div></section>` : ""}
<section><h2>Codes vus par l'IA, par type</h2>${prefixRows ? `<div class="wrap"><table><thead><tr><th>Type</th><th class="num">Codes</th></tr></thead><tbody>${prefixRows}</tbody></table></div>` : '<p class="muted">Aucun code pour l\'instant.</p>'}</section>
<section><h2>Fichiers mis à disposition de l'IA</h2><p class="muted" style="margin-bottom:.6rem">Les fichiers *-anonymise.* du dossier de sortie, que l'IA est autorisée à lire.</p>${fileRows ? `<div class="wrap"><table><thead><tr><th>Fichier</th><th class="num">Codes</th><th class="num">Nombres</th><th class="num">Valeurs retrouvées</th></tr></thead><tbody>${fileRows}</tbody></table></div>` : '<p class="muted">Aucun.</p>'}</section>
<section><h2>Les échanges, du plus récent au plus ancien</h2>${a.inspected.length > MAX_RENDERED ? `<p class="muted" style="margin-bottom:.6rem">Les ${MAX_RENDERED} derniers sur ${a.inspected.length} ; le journal complet est dans le dossier journal-ia.</p>` : ""}${items || '<p class="muted">Aucun échange noté.</p>'}</section>
<p class="muted">Ce que ce journal ne voit pas : un texte collé directement dans la conversation, un fichier joint à la main, ou une autre extension qui lit le dossier. L'outil « vérifier le confinement » signale ces portes.</p>
</main></body></html>
`;
}
