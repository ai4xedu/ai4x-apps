#!/usr/bin/env node
// ============================================================================
// Régénère lexique/noms.json.gz à partir des données ouvertes de l'INSEE
// (Licence Ouverte 2.0). Outillage interne — jamais dans le bundle.
//
//   curl -LO https://www.insee.fr/fr/statistiques/fichier/3536630/noms2008nat_txt.zip
//   curl -LO https://www.insee.fr/fr/statistiques/fichier/7633685/nat2022_csv.zip
//   unzip noms2008nat_txt.zip && unzip nat2022_csv.zip
//   node scripts/generer-noms.mjs <dossier contenant noms2008nat_txt.txt et nat2022.csv>
//
// Ce qu'on garde, et pourquoi (cf. server/verrou.js) :
//   - nomsCollisions : patronymes portés par ≥ 2 000 personnes (naissances
//     1891-2000) ET qui sont des mots du dictionnaire — le seul cas qu'un
//     verrou fondé sur le dictionnaire laisserait passer (Moulin, Robin…) ;
//   - prenoms : prénoms donnés ≥ 500 fois (1900-2022), pour reconnaître un
//     prénom même quand c'est aussi un mot (Jacques, Marine…).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2];
if (!dir) { console.error("Usage : node scripts/generer-noms.mjs <dossier des fichiers INSEE>"); process.exit(1); }

const fold = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const lex = new Set(zlib.gunzipSync(fs.readFileSync(path.join(here, "..", "lexique", "fr.txt.gz")))
  .toString("utf8").split("\n").map(fold));

const noms = new Map();
for (const l of fs.readFileSync(path.join(dir, "noms2008nat_txt.txt"), "latin1").split(/\r?\n/).slice(1)) {
  const p = l.split("\t");
  if (p.length < 2) continue;
  const k = fold(p[0]);
  noms.set(k, (noms.get(k) || 0) + p.slice(1).reduce((a, b) => a + (+b || 0), 0));
}
const prenoms = new Map();
for (const l of fs.readFileSync(path.join(dir, "nat2022.csv"), "utf8").split(/\r?\n/).slice(1)) {
  const p = l.split(";");
  if (p.length < 4 || p[1].startsWith("_")) continue;
  const k = fold(p[1]);
  prenoms.set(k, (prenoms.get(k) || 0) + (+p[3] || 0));
}

const out = {
  source: "INSEE — Fichier des noms de famille (1891-2000, éd. 2008) et Fichier des prénoms (éd. 2023, 1900-2022). " +
    "Licence Ouverte / Open Licence 2.0 (Etalab).",
  nomsCollisions: Object.fromEntries([...noms].filter(([k, n]) => n >= 2000 && lex.has(k)).sort((a, b) => b[1] - a[1])),
  prenoms: Object.fromEntries([...prenoms].filter(([k, n]) => n >= 500 && k.length > 1).sort((a, b) => b[1] - a[1])),
};
const dest = path.join(here, "..", "lexique", "noms.json.gz");
fs.writeFileSync(dest, zlib.gzipSync(Buffer.from(JSON.stringify(out)), { level: 9 }));
console.log(`${dest} : ${Object.keys(out.nomsCollisions).length} patronymes-mots, ${Object.keys(out.prenoms).length} prénoms.`);
