// ============================================================================
// RAPPORT DE COUVERTURE (v2.4) — la preuve, pour le DPO ou la direction, que
// l'équipe passe bien par Hidden Tokens.
//
// Le journal « Ce que Claude a vu » prouve ce qu'UN poste a envoyé. Une
// entreprise demande autre chose : « qui s'en sert, combien, et est-ce que
// quelque chose a fui ? ». Ce module en tire des COMPTES, rien d'autre :
//
//   1. QUE DES COMPTES. Le fichier d'un poste ne contient ni valeur, ni code,
//      ni nom de fichier, ni demande de l'IA : des nombres par mois (fichiers
//      protégés, plans refusés, décodages, valeurs retrouvées…), la version et
//      le nombre de portes ouvertes à l'audit de confinement. Il peut être lu
//      par le DPO, le service informatique — ou l'IA — sans rien révéler.
//   2. UN FICHIER PAR POSTE, dans le dossier d'équipe déjà partagé (même règle
//      que equipe.js : chaque poste n'écrit que le sien). Pas de serveur, pas
//      de télémétrie : le rapport ne sort pas du cabinet.
//   3. HONNÊTE SUR SA LIMITE. Il compte ce qui passe par Hidden Tokens. Un fichier
//      envoyé directement à Claude n'y figure pas : c'est la charte IA
//      (confiance/charte-ia-modele.md) qui fait de Hidden Tokens la seule voie
//      autorisée, et ce rapport qui permet de vérifier qu'elle est suivie.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { auditJournal } from "./journal.js";
import { PREFIX_LABEL } from "./engine.js";

export const STATS_RX = /^stats-poste-([a-f0-9]{12})\.json$/;
export const COVERAGE_NAME = "RAPPORT-COUVERTURE-HIDDEN-TOKENS.html";
export const INACTIVE_DAYS = 30;

const CODING_TOOLS = new Set(["anonymiser_fichier", "anonymiser_dossier", "lire_scan"]);
const DECODING_TOOLS = new Set(["deanonymiser", "remettre_chiffres"]);
const PROOF_TOOLS = new Set(["journal_ia", "verifier_confinement", "rapport_couverture"]);

const isError = (texte) => String(texte).startsWith("⚠️");
function argsOf(e) { try { return JSON.parse(e.args || "{}") || {}; } catch { return {}; } }
/* Le mode des chiffres réellement appliqué, lu dans le compte rendu (la ligne
   « CHIFFRES : » de describeNumbers), pas dans la demande. */
function numberMode(texte) {
  const s = String(texte);
  // v2.16 : « CHIFFRES — réglage « auto » (…) : N nombre(s) protégé(s), M en clair. »
  const m = s.match(/CHIFFRES — réglage « \w+ »[^:\n]*: (\d+) nombre\(s\) protégé\(s\), (\d+) en clair/);
  if (m) {
    if (Number(m[1]) === 0) return Number(m[2]) > 0 ? "clair" : null;
    return /INDICE \(facteur secret\)/.test(s) ? "indice" : "gabarit";
  }
  if (/CHIFFRES : mode CLAIR/.test(s)) return "clair";
  if (/en mode INDICE/.test(s)) return "indice";
  if (/en mode GABARIT/.test(s)) return "gabarit";
  return null;
}
const emptyMonth = () => ({ fichiers: 0, plans: 0, bloques: 0, decodages: 0, preuves: 0, fuites: 0, formes: 0, chiffres: { gabarit: 0, indice: 0, clair: 0 } });

/* Les comptes d'un poste, tirés de son journal (audité contre la clé). */
export function posteStats(journal, book, { poste, nom = "", version = "", licence = "", risques = 0, echecs = 0, now = new Date() } = {}) {
  const a = auditJournal(journal, [], book);
  const mois = {};
  let dernier = null;
  for (const e of a.inspected) {
    const m = String(e.t || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) continue;
    const s = (mois[m] ||= emptyMonth());
    const args = argsOf(e);
    if (CODING_TOOLS.has(e.outil)) {
      if (isError(e.texte)) s.bloques++;
      else if (e.outil !== "lire_scan" && !args.confirmer) s.plans++;
      else {
        s.fichiers++;
        dernier = e.t;
        const nm = numberMode(e.texte);
        if (nm) s.chiffres[nm]++;
      }
    } else if (DECODING_TOOLS.has(e.outil) && !isError(e.texte)) s.decodages++;
    else if (PROOF_TOOLS.has(e.outil)) s.preuves++;
    s.fuites += e.r.leaks.length;
    s.formes += e.r.forms;
  }
  const codes = {};
  for (const [p, n] of Object.entries(a.byPrefix)) codes[p] = n;
  return {
    v: 1, poste, nom: String(nom).slice(0, 60), version, licence,
    maj: now.toISOString(), dernier, risques, echecs: echecs + (journal.unreadable || 0), codes, mois,
  };
}

/* Écrit le fichier de CE poste (atomique, comme writePosteEntries). */
export function writePosteStats(dir, stats) {
  const file = path.join(dir, `stats-poste-${stats.poste}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(stats), "utf8");
  fs.renameSync(tmp, file);
  return file;
}

export function readTeamStats(dir) {
  const out = [];
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => STATS_RX.test(n)).sort(); } catch { return out; }
  for (const n of names) {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(dir, n), "utf8"));
      if (s && s.v === 1 && s.mois && typeof s.mois === "object") out.push(s);
    } catch {}   // en cours d'écriture par un collègue : relu la prochaine fois
  }
  return out;
}

const cmpVersion = (a, b) => {
  const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};
const sum = (months, k) => months.reduce((t, m) => t + (m[k] || 0), 0);

/* Agrège les postes : totaux, une ligne par poste, et les alertes à lire
   en premier. `months` limite la fenêtre (les N derniers mois). */
export function aggregate(postes, { now = new Date(), months = 3 } = {}) {
  const keep = new Set();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keep.add(d.toISOString().slice(0, 7));
  }
  const latest = postes.reduce((v, p) => (p.version && cmpVersion(p.version, v) > 0 ? p.version : v), "0.0.0");
  const rows = postes.map((p) => {
    const ms = Object.entries(p.mois).filter(([m]) => keep.has(m)).map(([, x]) => x);
    const chiffres = { gabarit: 0, indice: 0, clair: 0 };
    for (const m of ms) for (const k of Object.keys(chiffres)) chiffres[k] += (m.chiffres && m.chiffres[k]) || 0;
    const jours = p.dernier ? Math.floor((now - new Date(p.dernier)) / 86400000) : null;
    return {
      poste: p.poste, nom: p.nom || `Poste ${p.poste.slice(0, 4)}`, version: p.version, licence: p.licence,
      fichiers: sum(ms, "fichiers"), plans: sum(ms, "plans"), bloques: sum(ms, "bloques"), decodages: sum(ms, "decodages"),
      preuves: sum(ms, "preuves"), fuites: sum(ms, "fuites"), formes: sum(ms, "formes"), chiffres,
      risques: p.risques || 0, echecs: p.echecs || 0, dernier: p.dernier, jours, maj: p.maj,
      inactif: jours === null || jours > INACTIVE_DAYS, ancien: !!p.version && cmpVersion(p.version, latest) < 0,
    };
  }).sort((x, y) => y.fichiers - x.fichiers || x.nom.localeCompare(y.nom));

  const alertes = [];
  for (const r of rows) {
    if (r.fuites || r.formes) alertes.push({ niveau: "risque", poste: r.nom, texte: `${r.fuites + r.formes} élément(s) sensible(s) retrouvé(s) dans ce que l'IA a reçu — ouvrir « Ce que Claude a vu » sur ce poste.` });
    if (r.risques) alertes.push({ niveau: "risque", poste: r.nom, texte: `${r.risques} porte(s) ouverte(s) à l'audit de confinement (autre extension, dossier synchronisé…) — lancer « vérifier le confinement » sur ce poste.` });
    if (r.inactif) alertes.push({ niveau: "attention", poste: r.nom, texte: r.jours === null ? "Aucun fichier protégé à ce jour." : `Aucun fichier protégé depuis ${r.jours} jours : ce poste n'utilise plus l'IA, ou l'utilise sans Hidden Tokens.` });
    if (r.chiffres.clair) alertes.push({ niveau: "attention", poste: r.nom, texte: `${r.chiffres.clair} fichier(s) envoyé(s) avec les montants EN CLAIR (choix explicite de l'utilisateur).` });
    if (r.ancien) alertes.push({ niveau: "attention", poste: r.nom, texte: `Version ${r.version} : une version plus récente (${latest}) est installée ailleurs dans l'équipe.` });
    if (r.echecs) alertes.push({ niveau: "attention", poste: r.nom, texte: `${r.echecs} réponse(s) non notée(s) au journal (disque plein ou droits).` });
  }
  const codes = {};
  for (const p of postes) for (const [k, n] of Object.entries(p.codes || {})) codes[k] = (codes[k] || 0) + n;
  const total = (k) => rows.reduce((t, r) => t + r[k], 0);
  return {
    mois: [...keep].sort(), latest, rows, alertes, codes,
    postes: rows.length, actifs: rows.filter((r) => !r.inactif).length,
    fichiers: total("fichiers"), plans: total("plans"), bloques: total("bloques"), decodages: total("decodages"),
    fuites: total("fuites") + total("formes"), risques: total("risques"),
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const day = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/* La page. Hors ligne, autonome, aucune ressource externe. */
export function renderCoverage(g, { version, org = "", generatedAt = new Date(), team = true } = {}) {
  const ok = !g.fuites && !g.risques;
  const verdict = !g.fichiers
    ? "Aucun fichier protégé sur la période"
    : ok ? `${g.fichiers} fichier(s) protégé(s) par Hidden Tokens, aucune valeur réelle retrouvée dans ce que l'IA a reçu`
      : `${g.fuites + g.risques} point(s) à traiter — détail ci-dessous`;
  const periode = g.mois.length ? `${monthLabel(g.mois[0])} – ${monthLabel(g.mois[g.mois.length - 1])}` : "";
  const rows = g.rows.map((r) => `<tr${r.inactif ? ' class="off"' : ""}><td>${esc(r.nom)}${r.licence === "essai" ? ' <span class="tag">essai</span>' : ""}</td>` +
    `<td class="num">${r.fichiers}</td><td class="num">${r.plans}</td><td class="num">${r.decodages}</td>` +
    `<td class="num">${r.chiffres.gabarit + r.chiffres.indice}${r.chiffres.clair ? ` / <mark class="warn">${r.chiffres.clair} clair</mark>` : ""}</td>` +
    `<td class="num">${r.fuites + r.formes ? `<mark class="leak">${r.fuites + r.formes}</mark>` : "0"}</td>` +
    `<td class="num">${r.risques ? `<mark class="leak">${r.risques}</mark>` : "0"}</td>` +
    `<td>${day(r.dernier)}</td><td>${esc(r.version || "—")}</td></tr>`).join("");
  const alerts = g.alertes.map((a) => `<li class="${a.niveau}"><strong>${esc(a.poste)}</strong> — ${esc(a.texte)}</li>`).join("");
  const codeRows = Object.entries(g.codes).sort((x, y) => y[1] - x[1])
    .map(([p, n]) => `<tr><td>${esc(PREFIX_LABEL[p] || p)}</td><td class="num">${n}</td></tr>`).join("");

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport de couverture Hidden Tokens</title>
<style>
:root { --paper:#F5F5F8; --ink:#0B0D12; --muted:#585C6C; --line:#DCDCE6; --surface:#FFFFFF; --key:#6A48F0; --key-soft:#ECE7FF;
  --ok:#1E7A4F; --warn:#8A5A00; --warn-soft:#FFF3D6; --leak:#B4232F; --leak-soft:#FBE9EA;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
@media (prefers-color-scheme: dark) { :root { --paper:#0B0D12; --ink:#ECECF2; --muted:#9A9EB0; --line:#262A38; --surface:#12141C;
  --key:#A792FF; --key-soft:#231C45; --ok:#5FD39A; --warn:#F2C35B; --warn-soft:#2E2410; --leak:#FF7A84; --leak-soft:#3A1418; color-scheme: dark; } }
body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.55 var(--sans); }
main { max-width:64rem; margin:0 auto; padding:2.5rem 16px 4rem; display:flex; flex-direction:column; gap:2rem; }
h1 { font-family:var(--mono); font-size:1.7rem; margin:0; } h2 { font-family:var(--mono); font-size:1.05rem; margin:0 0 .6rem; }
p { margin:0; max-width:72ch; } .muted { color:var(--muted); font-size:.92rem; }
.verdict { padding:1rem 1.2rem; border:1px solid var(--line); background:var(--surface); display:flex; flex-direction:column; gap:.3rem; }
.verdict.ok { border-left:4px solid var(--ok); } .verdict.ko { border-left:4px solid var(--leak); }
.verdict strong { font-size:1.15rem; }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(9.5rem, 1fr)); gap:1px; background:var(--line); border:1px solid var(--line); }
.grid div { background:var(--surface); padding:.9rem 1rem; display:flex; flex-direction:column; gap:.15rem; }
.grid b { font-family:var(--mono); font-size:1.5rem; font-variant-numeric:tabular-nums; } .grid span { color:var(--muted); font-size:.88rem; }
table { width:100%; border-collapse:collapse; background:var(--surface); border:1px solid var(--line); font-size:.93rem; }
th, td { text-align:left; padding:.45rem .7rem; border-bottom:1px solid var(--line); } th { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); font-weight:500; }
td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; } tr.off td { color:var(--muted); }
.wrap { overflow-x:auto; }
.tag { font-size:.75rem; background:var(--key-soft); color:var(--key); padding:0 .35em; }
mark.leak { background:var(--leak-soft); color:var(--leak); font-weight:600; padding:0 .2em; }
mark.warn { background:var(--warn-soft); color:var(--warn); padding:0 .2em; }
ul.alerts { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:1px; background:var(--line); border:1px solid var(--line); }
ul.alerts li { background:var(--surface); padding:.6rem .9rem; border-left:4px solid var(--warn); }
ul.alerts li.risque { border-left-color:var(--leak); }
</style></head><body><main>
<header style="display:flex;flex-direction:column;gap:.6rem">
  <h1>Rapport de couverture</h1>
  <p class="muted">${org ? `${esc(org)} · ` : ""}Hidden Tokens${version ? ` v${esc(version)}` : ""} · ${esc(periode)} · ${team ? `${g.postes} poste(s) de l'équipe` : "ce poste"} · généré le ${day(generatedAt.toISOString())}. Ce rapport ne contient que des comptes : aucune valeur, aucun code, aucun nom de fichier.</p>
</header>
<section class="verdict ${ok ? "ok" : "ko"}">
  <strong>${esc(verdict)}</strong>
  <p class="muted">Chaque poste tire ces comptes de son journal « Ce que Claude a vu », revérifié contre sa clé, et les dépose dans le dossier d'équipe. Rien n'est envoyé hors du cabinet.</p>
</section>
<section class="grid" aria-label="Chiffres clés">
  <div><b>${g.actifs}/${g.postes}</b><span>postes actifs (fichier protégé depuis moins de ${INACTIVE_DAYS} jours)</span></div>
  <div><b>${g.fichiers}</b><span>fichiers protégés avant l'IA</span></div>
  <div><b>${g.plans}</b><span>plans présentés, pas confirmés</span></div>
  <div><b>${g.decodages}</b><span>réponses décodées sur le poste</span></div>
  <div><b>${g.fuites}</b><span>valeurs réelles retrouvées</span></div>
  <div><b>${g.risques}</b><span>portes ouvertes au confinement</span></div>
</section>
<section><h2>À traiter</h2>${alerts ? `<ul class="alerts">${alerts}</ul>` : '<p class="muted">Rien à signaler.</p>'}</section>
<section><h2>Par poste</h2><div class="wrap"><table><thead><tr><th>Poste</th><th class="num">Fichiers protégés</th><th class="num">Plans</th><th class="num">Décodages</th><th class="num">Montants protégés</th><th class="num">Valeurs retrouvées</th><th class="num">Portes ouvertes</th><th>Dernier fichier</th><th>Version</th></tr></thead><tbody>${rows || '<tr><td colspan="9" class="muted">Aucun poste n\'a encore déposé ses comptes.</td></tr>'}</tbody></table></div></section>
<section><h2>Codes attribués, par type</h2>${codeRows ? `<div class="wrap"><table><thead><tr><th>Type</th><th class="num">Codes vus par l'IA</th></tr></thead><tbody>${codeRows}</tbody></table></div>` : '<p class="muted">Aucun code pour l\'instant.</p>'}</section>
<section><h2>Ce que ce rapport ne voit pas</h2><p class="muted">Il compte ce qui passe par Hidden Tokens. Un fichier joint ou un texte collé directement dans Claude n'y figure pas : c'est la charte IA de l'entreprise qui fait de Hidden Tokens la seule voie autorisée pour les données de clients, et ce rapport qui permet de vérifier, chaque mois, qu'elle est suivie. Un poste actif dans l'IA mais absent ici est la première question à poser.</p></section>
</main></body></html>
`;
}
