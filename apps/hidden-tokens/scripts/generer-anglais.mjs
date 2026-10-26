#!/usr/bin/env node
// ============================================================================
// Régénère lexique/en.json.gz — le dictionnaire ANGLAIS du verrou (v2.26) et
// ses listes de noms. Outillage interne — jamais dans le bundle.
//
//   curl -LO https://downloads.sourceforge.net/project/wordlist/SCOWL/2020.12.07/scowl-2020.12.07.tar.gz
//   tar xzf scowl-2020.12.07.tar.gz
//   curl -LO https://www2.census.gov/topics/genealogy/2010surnames/names.zip && unzip names.zip
//   curl -LO https://www2.census.gov/topics/genealogy/1990surnames/dist.male.first
//   curl -LO https://www2.census.gov/topics/genealogy/1990surnames/dist.female.first
//   node scripts/generer-anglais.mjs <scowl-2020.12.07/final> <dossier des fichiers du Census>
//
// Ce qu'on garde, et pourquoi (cf. server/verrou.js, « mode anglais ») :
//   - mots : les mots anglais courants de SCOWL jusqu'à la taille 50 (la
//     taille d'un correcteur orthographique ordinaire), en minuscules — ni
//     noms propres, ni mots à majuscule (les fichiers « upper » et
//     « proper-names » de SCOWL sont laissés de côté) ; chacun avec sa taille
//     (10 = les mille mots les plus courants… 50) ;
//   - nomsCollisions : patronymes portés par ≥ 10 000 personnes (Census 2010)
//     ET qui sont des mots anglais ou français (Smith, Baker, Brown, Carter…)
//     — le cas qu'un verrou fondé sur le dictionnaire laisserait passer ;
//   - prenoms : prénoms portés par ≥ 0,010 % des Américains (Census 1990),
//     pour reconnaître un prénom même quand c'est aussi un mot (Mark, Grace…).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [scowl, census] = process.argv.slice(2);
if (!scowl || !census) {
  console.error("Usage : node scripts/generer-anglais.mjs <scowl-2020.12.07/final> <dossier des fichiers du Census>");
  process.exit(1);
}

const fold = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const fr = new Set(zlib.gunzipSync(fs.readFileSync(path.join(here, "..", "lexique", "fr.txt.gz")))
  .toString("utf8").split("\n").map(fold));

const taille = new Map();
for (const f of fs.readdirSync(scowl)) {
  const m = f.match(/^(english|american|british)-words\.(\d+)$/);
  if (!m || +m[2] > 50) continue;
  for (const w of fs.readFileSync(path.join(scowl, f), "latin1").split(/\r?\n/)) {
    if (!w || /['’]/.test(w) || w !== w.toLowerCase()) continue;
    const k = fold(w);
    taille.set(k, Math.min(taille.get(k) || 99, +m[2]));
  }
}
const mots = {};
for (const [k, t] of taille) (mots[t] = mots[t] || []).push(k);
for (const t of Object.keys(mots)) mots[t] = mots[t].sort().join(" ");

const noms = new Map();
for (const l of fs.readFileSync(path.join(census, "Names_2010Census.csv"), "utf8").split(/\r?\n/).slice(1)) {
  const p = l.split(",");
  if (p.length < 3 || !/^[A-Z]+$/.test(p[0])) continue;
  noms.set(p[0].toLowerCase(), +p[2] || 0);
}
const prenoms = new Map();
for (const f of ["dist.male.first", "dist.female.first"]) {
  for (const l of fs.readFileSync(path.join(census, f), "utf8").split(/\r?\n/)) {
    const p = l.trim().split(/\s+/);
    if (p.length < 2 || !/^[A-Z]+$/.test(p[0])) continue;
    const k = p[0].toLowerCase();
    prenoms.set(k, Math.max(prenoms.get(k) || 0, +p[1] || 0));
  }
}

const out = {
  source: "Mots : SCOWL 2020.12.07 (Kevin Atkinson), tailles 10 à 50, english/american/british-words — " +
    "cf. LICENCE-scowl.txt. Noms : U.S. Census Bureau — Frequently Occurring Surnames from the 2010 Census, " +
    "et prénoms du Census 1990 (domaine public, œuvres du gouvernement fédéral américain).",
  mots,
  nomsCollisions: Object.fromEntries([...noms].filter(([k, n]) => n >= 10000 && (taille.has(k) || fr.has(k))).sort((a, b) => b[1] - a[1])),
  prenoms: Object.fromEntries([...prenoms].filter(([k, p]) => p >= 0.01 && k.length > 1).sort((a, b) => b[1] - a[1])),
};
const dest = path.join(here, "..", "lexique", "en.json.gz");
fs.writeFileSync(dest, zlib.gzipSync(Buffer.from(JSON.stringify(out)), { level: 9 }));
console.log(`${dest} : ${taille.size} mots, ${Object.keys(out.nomsCollisions).length} patronymes-mots, ${Object.keys(out.prenoms).length} prénoms.`);
