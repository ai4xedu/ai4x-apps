#!/usr/bin/env node
// ============================================================================
// HT-BENCH — quels packs préinstaller ? Chaque document passe trois fois :
//   aucun : le moteur seul ;
//   propre : le pack de son métier (le banc ordinaire) ;
//   tous   : les six packs activés ensemble (ce que serait « tout préchargé »).
// Un pack se gagne sa place par défaut s'il ajoute du rappel sans coder de
// leurres ni corrompre la sortie — chez lui ET chez les autres métiers.
//
//   npm run bench:ht:packs              → jeu dev (pour décider)
//   node bench/ht-bench/packs.mjs --split test   → pour confirmer
// → resultats/<split>/packs.md + packs.json
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { noterHiddenTokens } from "./lib/passage.mjs";
import { agreger } from "./lib/score.mjs";
import { PACKS } from "./lib/types.mjs";
import { lireJeu, fichiersJeu, splitDemande } from "./generer.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const SPLIT = splitDemande();
const SORTIE = path.join(here, "resultats", SPLIT === "dev" ? "" : SPLIT);
const version = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")).version;
const manifeste = JSON.parse(fs.readFileSync(fichiersJeu(SPLIT).manifeste, "utf8"));
const docs = lireJeu(SPLIT);
const TOUS = PACKS.filter((p) => p !== "core");

// --candidat a,b,c : un jeu de packs préchargés à juger, activé pour TOUS
// les documents (comme il le serait chez un client qui n'a rien réglé).
const iCand = process.argv.indexOf("--candidat");
const CANDIDAT = iCand >= 0 ? process.argv[iCand + 1].split(",").filter(Boolean) : null;
for (const p of CANDIDAT || []) if (!TOUS.includes(p)) { console.error(`❌ pack inconnu : ${p}`); process.exit(2); }
const CONFIGS = {
  aucun: () => [],
  propre: (d) => d.packs,
  tous: () => TOUS,
  ...(CANDIDAT ? { candidat: () => CANDIDAT } : {}),
};
const mesures = {};
for (const [nom, packsDe] of Object.entries(CONFIGS)) {
  const t0 = Date.now();
  const { resultats, erreurs } = await noterHiddenTokens(docs.map((d) => ({ ...d, packs: packsDe(d) })));
  if (erreurs.length) { console.error(`❌ ${nom} : ${erreurs.length} document(s) non réalignés`); process.exit(2); }
  const agg = agreger(resultats);
  const imbriques = {};
  for (const r of resultats) if (r.imbrique) imbriques[r.pack] = (imbriques[r.pack] || 0) + 1;
  mesures[nom] = { agg, imbriques, secondes: (Date.now() - t0) / 1000 };
  console.log(`  ${nom.padEnd(7)} direct ${(100 * agg.global.direct.rappel).toFixed(1)} %, leurres codés ${(100 * agg.global.leurres.taux_faux_positifs).toFixed(1)} %, sorties corrompues ${Object.values(imbriques).reduce((a, b) => a + b, 0)}`);
}

const pct = (x) => (x === null || x === undefined ? "—" : `${(100 * x).toFixed(1)} %`);
const pts = (a, b) => (a === null || b === null ? "" : `${a >= b ? "+" : ""}${(100 * (a - b)).toFixed(1)}`);
const ligne = (p, k) => {
  const v = mesures[k].agg.par_pack[p];
  return { direct: v.direct.rappel, tous: v.tous.rappel, precision: v.precision, leurres: v.leurres.taux_faux_positifs, imbriques: mesures[k].imbriques[p] || 0 };
};
const L = [];
L.push(`# HT-Bench ${manifeste.version} (jeu ${SPLIT}) — quels packs préinstaller ?`, "");
L.push(`Moteur v${version}. Chaque document passe **sans pack**, avec **son pack**, puis avec **les six packs ensemble**${CANDIDAT ? `, puis avec le **candidat** (${CANDIDAT.join(", ")}) pour tous` : ""}. Identifiants directs = noms, CIN, NIR, CNSS, ICE, IF, RC, SIREN, SIRET, téléphones, e-mails, IBAN, RIB, IMEI, IMSI. « Corrompus » = documents dont la sortie n'est plus l'original + des codes (codes imbriqués).`, "");
L.push("## Par métier", "");
L.push("| Documents | Config | Direct | Tout | Précision | Leurres codés | Corrompus |", "|---|---|---:|---:|---:|---:|---:|");
for (const p of Object.keys(mesures.propre.agg.par_pack)) {
  for (const k of Object.keys(CONFIGS)) {
    if (p === "core" && k === "propre") continue;
    const x = ligne(p, k);
    L.push(`| ${k === "aucun" ? `**${p}**` : ""} | ${k} | ${pct(x.direct)} | ${pct(x.tous)} | ${pct(x.precision)} | ${pct(x.leurres)} | ${x.imbriques} |`);
  }
}
L.push("", "## Ce que chaque pack apporte chez lui (propre − aucun, en points)", "");
L.push("| Pack | Direct | Tout | Précision | Leurres codés | Corrompus ajoutés |", "|---|---:|---:|---:|---:|---:|");
for (const p of TOUS) {
  const a = ligne(p, "aucun"), b = ligne(p, "propre");
  L.push(`| ${p} | ${pts(b.direct, a.direct)} | ${pts(b.tous, a.tous)} | ${pts(b.precision, a.precision)} | ${pts(b.leurres, a.leurres)} | ${b.imbriques - a.imbriques} |`);
}
L.push("", "## Tout préchargé : ce que coûtent les six packs aux AUTRES métiers (tous − propre)", "");
L.push("| Documents | Direct | Précision | Leurres codés | Corrompus ajoutés |", "|---|---:|---:|---:|---:|");
for (const p of Object.keys(mesures.propre.agg.par_pack)) {
  const a = ligne(p, p === "core" ? "aucun" : "propre"), b = ligne(p, "tous");
  L.push(`| ${p} | ${pts(b.direct, a.direct)} | ${pts(b.precision, a.precision)} | ${pts(b.leurres, a.leurres)} | ${b.imbriques - a.imbriques} |`);
}
const g = (k) => mesures[k].agg.global;
L.push("", "## Global", "", "| Config | Direct | Tout | Précision | Leurres codés | Corrompus |", "|---|---:|---:|---:|---:|---:|");
for (const k of Object.keys(CONFIGS)) L.push(`| ${k}${k === "candidat" ? ` (${CANDIDAT.join(", ")})` : ""} | ${pct(g(k).direct.rappel)} | ${pct(g(k).tous.rappel)} | ${pct(g(k).precision)} | ${pct(g(k).leurres.taux_faux_positifs)} | ${Object.values(mesures[k].imbriques).reduce((a, b) => a + b, 0)} |`);
fs.mkdirSync(SORTIE, { recursive: true });
fs.writeFileSync(path.join(SORTIE, "packs.md"), L.join("\n") + "\n");
fs.writeFileSync(path.join(SORTIE, "packs.json"), JSON.stringify({ split: SPLIT, version_moteur: version, jeu_sha256: manifeste.sha256,
  configs: Object.fromEntries(Object.entries(mesures).map(([k, m]) => [k, { global: m.agg.global, par_pack: m.agg.par_pack, par_type: m.agg.par_type, imbriques: m.imbriques }])) }, null, 1) + "\n");
console.log(`  → ${path.relative(process.cwd(), path.join(SORTIE, "packs.md"))}`);
