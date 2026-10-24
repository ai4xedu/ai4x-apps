#!/usr/bin/env node
// ============================================================================
// HT-BENCH — Hidden Tokens face à un outil américain (Microsoft Presidio),
// sur le MÊME jeu, avec les MÊMES règles de score (lib/score.mjs).
//
//   npm run bench:ht:comparer                → jeu de test (celui qu'on publie)
//   node bench/ht-bench/comparer.mjs --split dev
//
// → resultats/<split>/comparaison.md + comparaison.json
//
// Presidio tourne en local, dans son environnement Python à part
// (comparaison/.venv, cf. comparaison/requirements.txt) : rien n'entre dans
// les dépendances du connecteur, rien n'entre dans la CI. Le script Python
// refuse de noter s'il tente la moindre connexion réseau. Une étendue
// rendue par Presidio compte comme un passage codé.
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { noterHiddenTokens } from "./lib/passage.mjs";
import { evaluerDocument, agreger } from "./lib/score.mjs";
import { POSITIFS } from "./lib/types.mjs";
import { lireJeu, fichiersJeu, splitDemande } from "./generer.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const SPLIT = process.argv.includes("--split") ? splitDemande() : "test";
const SORTIE = path.join(here, "resultats", SPLIT === "dev" ? "" : SPLIT);
const PYTHON = process.env.HT_BENCH_PYTHON
  || path.join(here, "comparaison", ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

if (!fs.existsSync(PYTHON)) {
  console.error(`❌ Python de comparaison introuvable (${path.relative(process.cwd(), PYTHON)}). Installez-le une fois :
   cd bench/ht-bench/comparaison && uv venv -p 3.12 .venv && VIRTUAL_ENV=.venv uv pip install -r requirements.txt
   (ou python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt)`);
  process.exit(2);
}

const version = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")).version;
const manifeste = JSON.parse(fs.readFileSync(fichiersJeu(SPLIT).manifeste, "utf8"));
const docs = lireJeu(SPLIT);

/* ------------------------------------------------------------ Presidio */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ht-bench-presidio-"));
const sortiePy = path.join(tmp, "presidio.jsonl");
const t0 = Date.now();
// Proxies retirés de l'environnement : le script n'en a pas besoin, et sa
// garde réseau doit voir toute tentative, pas un proxy qui la masquerait.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/proxy/i.test(k)));
const py = spawnSync(PYTHON, [path.join(here, "comparaison", "presidio_bench.py"), fichiersJeu(SPLIT).jeu, sortiePy], { stdio: ["ignore", "inherit", "inherit"], env });
if (py.status !== 0) {
  console.error(`❌ Presidio a échoué (code ${py.status}).`);
  process.exit(py.status || 2);
}
const lignes = fs.readFileSync(sortiePy, "utf8").trim().split("\n").map((l) => JSON.parse(l));
fs.rmSync(tmp, { recursive: true, force: true });
const outil = lignes.shift();
const tPresidio = (Date.now() - t0) / 1000;

/* Les entités de Presidio, ramenées aux préfixes du banc (pour la précision
   par type). Une entité inconnue reste un passage codé, sans type. */
const PREFIXE_PRESIDIO = {
  PERSON: "NOM", PHONE_NUMBER: "TEL", EMAIL_ADDRESS: "EMAIL", IBAN_CODE: "RIB", CREDIT_CARD: "CARTE",
  LOCATION: "LIEU", ORGANIZATION: "SOCIETE", DATE_TIME: "DATE", URL: "LIEN", MEDICAL_LICENSE: "PRATICIEN",
};
/* Étendues qui se chevauchent (en + fr) → un seul passage, le type du
   meilleur score. */
function segmentsPresidio(etendues) {
  const tri = [...etendues].sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  const out = [];
  for (const e of tri) {
    const d = out[out.length - 1];
    if (d && e.debut < d.fin) {
      if (e.score > d.score) { d.code = e.type; d.score = e.score; }
      d.fin = Math.max(d.fin, e.fin);
    } else out.push({ debut: e.debut, fin: e.fin, code: e.type, score: e.score });
  }
  return out.map((s) => ({ debut: s.debut, fin: s.fin, code: s.code, prefixe: PREFIXE_PRESIDIO[s.code] || "CODE" }));
}
const parId = new Map(lignes.map((l) => [l.id, l.etendues]));
const resPresidio = docs.map((d) => ({ id: d.id, pack: d.pack, ...evaluerDocument(d, segmentsPresidio(parId.get(d.id) || [])) }));
const entites = {};
for (const l of lignes) for (const e of l.etendues) entites[e.type] = (entites[e.type] || 0) + 1;

/* ------------------------------------------------------- Hidden Tokens */
const t1 = Date.now();
const { resultats: resHT, erreurs } = await noterHiddenTokens(docs);
if (erreurs.length) {
  console.error(`❌ ${erreurs.length} document(s) non réalignés :\n  ${erreurs.join("\n  ")}`);
  process.exit(2);
}
const tHT = (Date.now() - t1) / 1000;

const ht = agreger(resHT), pr = agreger(resPresidio);
const comparaison = {
  banc: "HT-Bench",
  split: SPLIT,
  version_jeu: manifeste.version,
  jeu_sha256: manifeste.sha256,
  hidden_tokens: { version: version, chemin: "anonymiser_fichier (.md), pack du document activé" },
  presidio: { ...outil, entites_rendues: Object.fromEntries(Object.entries(entites).sort((a, b) => b[1] - a[1])) },
  documents: docs.length,
  global: { hidden_tokens: ht.global, presidio: pr.global },
  par_pack: Object.fromEntries(Object.keys(ht.par_pack).map((p) => [p, { hidden_tokens: ht.par_pack[p], presidio: pr.par_pack[p] }])),
  par_type: Object.fromEntries(Object.keys(ht.par_type).map((t) => [t, { hidden_tokens: ht.par_type[t], presidio: pr.par_type[t] }])),
  par_variante: Object.fromEntries(Object.keys(ht.par_variante).map((k) => [k, { hidden_tokens: ht.par_variante[k], presidio: pr.par_variante[k] }])),
  par_leurre: Object.fromEntries(Object.keys(ht.par_leurre).map((k) => [k, { hidden_tokens: ht.par_leurre[k], presidio: pr.par_leurre[k] }])),
  secondes: { hidden_tokens: tHT, presidio: tPresidio },
};
fs.mkdirSync(SORTIE, { recursive: true });
fs.writeFileSync(path.join(SORTIE, "comparaison.json"), JSON.stringify({ ...comparaison, secondes: undefined }, null, 1) + "\n");
fs.writeFileSync(path.join(SORTIE, "comparaison.md"), rapport(comparaison));

const pct = (x) => (x === null || x === undefined ? "—" : `${(100 * x).toFixed(1)} %`);
console.log(`\nHT-Bench ${manifeste.version} (${SPLIT}) — Hidden Tokens v${version} face à Presidio ${outil.version}, ${docs.length} documents\n`);
console.log("  Pack                   Direct HT    Direct Presidio");
for (const [p, v] of Object.entries(comparaison.par_pack)) console.log(`  ${p.padEnd(22)} ${pct(v.hidden_tokens.direct.rappel).padStart(8)}    ${pct(v.presidio.direct.rappel).padStart(8)}`);
console.log(`  ${"GLOBAL".padEnd(22)} ${pct(ht.global.direct.rappel).padStart(8)}    ${pct(pr.global.direct.rappel).padStart(8)}`);
console.log(`\n  → ${path.relative(process.cwd(), path.join(SORTIE, "comparaison.md"))}`);

function rapport(c) {
  const L = [];
  const n = (x) => `${pct(x.rappel)} (${x.detectes}/${x.n})`;
  const ecart = (a, b) => (a === null || b === null || a === undefined || b === undefined ? "" : `${a >= b ? "+" : ""}${(100 * (a - b)).toFixed(1)} pts`);
  L.push(`# HT-Bench ${c.version_jeu} (jeu ${c.split}) — Hidden Tokens face à Presidio`, "");
  L.push(`Même jeu synthétique (\`${c.jeu_sha256.slice(0, 16)}…\`, ${c.documents} documents), mêmes règles de score (\`lib/score.mjs\`). **Hidden Tokens v${c.hidden_tokens.version}** : ${c.hidden_tokens.chemin}. **Presidio ${c.presidio.outil} ${c.presidio.version}** : ${c.presidio.configuration}, en local, sans réseau. Une étendue rendue par Presidio compte comme un passage codé.`, "");
  if (c.split === "test") L.push("Jeu de **test** : aucune règle du moteur n'est réglée dessus — ce sont les chiffres à publier.", "");
  L.push(`**Identifiants directs : Hidden Tokens ${n(c.global.hidden_tokens.direct)} — Presidio ${n(c.global.presidio.direct)}** (${ecart(c.global.hidden_tokens.direct.rappel, c.global.presidio.direct.rappel)}).`, "");

  L.push("## Par pack", "");
  L.push("| Pack | Direct — HT | Direct — Presidio | Écart | Précision HT | Précision Presidio | Leurres codés HT | Leurres codés Presidio |");
  L.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const [p, v] of Object.entries(c.par_pack)) {
    const h = v.hidden_tokens, q = v.presidio;
    L.push(`| ${p} | ${n(h.direct)} | ${n(q.direct)} | ${ecart(h.direct.rappel, q.direct.rappel)} | ${pct(h.precision)} | ${pct(q.precision)} | ${pct(h.leurres.taux_faux_positifs)} | ${pct(q.leurres.taux_faux_positifs)} |`);
  }
  const g = c.global;
  L.push(`| **Global** | **${n(g.hidden_tokens.direct)}** | **${n(g.presidio.direct)}** | ${ecart(g.hidden_tokens.direct.rappel, g.presidio.direct.rappel)} | ${pct(g.hidden_tokens.precision)} | ${pct(g.presidio.precision)} | ${pct(g.hidden_tokens.leurres.taux_faux_positifs)} | ${pct(g.presidio.leurres.taux_faux_positifs)} |`);
  L.push("", "Précision = passages codés qui recouvrent une valeur étiquetée / tous les passages codés. Leurres codés = montants, dates, articles, sigles, mots courants, villes seules… rendus illisibles à tort.", "");

  L.push("## Par type (rappel)", "");
  L.push("| Type | Direct | Valeurs | Hidden Tokens | Presidio | Écart |", "|---|:-:|---:|---:|---:|---:|");
  for (const [t, v] of Object.entries(c.par_type)) {
    L.push(`| ${t} — ${POSITIFS[t].libelle} | ${POSITIFS[t].direct ? "oui" : ""} | ${v.hidden_tokens.n} | ${pct(v.hidden_tokens.rappel)} | ${pct(v.presidio?.rappel)} | ${ecart(v.hidden_tokens.rappel, v.presidio?.rappel)} |`);
  }
  L.push("");

  L.push("## Formats du Maghreb et du français : où l'écart se creuse", "");
  L.push("Écritures des identifiants directs, triées par écart de rappel (Hidden Tokens − Presidio).", "");
  L.push("| Type · écriture | Valeurs | Hidden Tokens | Presidio | Écart |", "|---|---:|---:|---:|---:|");
  const lignes = Object.entries(c.par_variante).filter(([, v]) => v.hidden_tokens.direct)
    .map(([k, v]) => ({ k, h: v.hidden_tokens, q: v.presidio, d: v.hidden_tokens.rappel - (v.presidio?.rappel ?? 0) }))
    .sort((a, b) => b.d - a.d || a.k.localeCompare(b.k));
  for (const x of lignes) L.push(`| ${x.k} | ${x.h.n} | ${pct(x.h.rappel)} | ${pct(x.q?.rappel)} | ${ecart(x.h.rappel, x.q?.rappel)} |`);
  L.push("");

  L.push("## Leurres (doivent rester lisibles)", "");
  L.push("| Leurre | Nombre | Codés — HT | Codés — Presidio |", "|---|---:|---:|---:|");
  for (const [k, v] of Object.entries(c.par_leurre)) L.push(`| ${k} — ${v.hidden_tokens.libelle} | ${v.hidden_tokens.n} | ${pct(v.hidden_tokens.taux)} | ${pct(v.presidio?.taux)} |`);
  L.push("");

  L.push("## Ce que rend Presidio", "");
  L.push("| Entité Presidio | Étendues |", "|---|---:|");
  for (const [e, k] of Object.entries(c.presidio.entites_rendues)) L.push(`| ${e} | ${k} |`);
  L.push("", "## Limites de la comparaison", "",
    "- Presidio est noté tel que livré : aucun reconnaisseur maison (CIN, ICE, RIB marocain, NIR…) n'a été ajouté. Un intégrateur peut en écrire ; c'est précisément le travail que les packs Hidden Tokens livrent déjà.",
    "- L'union en + fr sans seuil de score est la configuration la plus favorable au rappel de Presidio ; elle lui coûte en précision et en leurres codés.",
    "- Texte seul (le chemin .md) ; une seule configuration de packs par document côté Hidden Tokens.",
    "- Jeu synthétique : les valeurs ont la forme des vraies, les tournures sont celles des gabarits. Les chiffres disent où chaque outil tient ou casse sur ces formats ; ils ne remplacent pas une mesure sur des documents réels.");
  return L.join("\n") + "\n";
}
