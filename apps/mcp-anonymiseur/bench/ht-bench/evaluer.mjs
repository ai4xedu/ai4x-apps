#!/usr/bin/env node
// ============================================================================
// HT-BENCH — passe le jeu synthétique dans le VRAI moteur et le note.
//
//   npm run bench:ht                → resultats/ht-bench.json + resultats/RAPPORT.md
//   npm run bench:ht:controle       → idem, puis ÉCHEC si le rappel sur les
//                                     identifiants directs passe sous la
//                                     référence (reference.json), par pack ou
//                                     par type
//   node bench/ht-bench/evaluer.mjs --enregistrer-reference
//                                   → réécrit reference.json (après un
//                                     progrès voulu, ou un jeu enrichi)
//
// Chaque document passe par anonymiser_fichier (un .md : le même codage que
// coder_texte et qu'un PDF) dans un connecteur lancé avec SON pack ; on note
// le fichier *-anonymise.md écrit sur le poste. La clé est remise à zéro
// entre deux documents. La réponse de coder_texte (verrou de sortie compris)
// dit, pour chaque valeur manquée, si elle atteindrait l'IA. Aucun réseau : un processus local, des données
// inventées.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ouvrirMoteur } from "./lib/moteur.mjs";
import { aligner } from "./lib/alignement.mjs";
import { evaluerDocument, agreger, ecarts } from "./lib/score.mjs";
import { rapportMarkdown } from "./lib/rapport.mjs";
import { lireJeu, FICHIER_MANIFESTE } from "./generer.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const SORTIE = path.join(here, "resultats");
const REFERENCE = path.join(here, "reference.json");
const CONTROLE = process.argv.includes("--controle");
const ENREGISTRER = process.argv.includes("--enregistrer-reference");

const version = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")).version;
const manifeste = JSON.parse(fs.readFileSync(FICHIER_MANIFESTE, "utf8"));
const docs = lireJeu();

/* Un connecteur par configuration de packs. */
const groupes = new Map();
for (const d of docs) {
  const k = JSON.stringify(d.packs);
  if (!groupes.has(k)) groupes.set(k, []);
  groupes.get(k).push(d);
}
const resultats = [];
const erreurs = [];
const t0 = Date.now();
for (const [k, liste] of groupes) {
  const moteur = await ouvrirMoteur(JSON.parse(k));
  try {
    for (const d of liste) {
      const { code, cle, vu } = await moteur.coder(d.texte);
      let al;
      try { al = aligner(d.texte, code, cle); }
      catch (e) { erreurs.push(`${d.id} : ${e.message}`); continue; }
      resultats.push({ id: d.id, pack: d.pack, code, imbrique: al.imbrique, ...evaluerDocument(d, al.segments, vu) });
    }
  } finally { await moteur.fermer(); }
}
if (erreurs.length) {
  console.error(`❌ ${erreurs.length} document(s) non réalignés — banc invalide :\n  ${erreurs.join("\n  ")}`);
  process.exit(2);
}

const agg = agreger(resultats);
const sortie = {
  banc: "HT-Bench",
  version_jeu: manifeste.version,
  jeu_sha256: manifeste.sha256,
  version_moteur: version,
  chemin: "anonymiser_fichier sur un .md (MCP stdio, fichier *-anonymise.md écrit sur le poste) — moteur + verrou, pack du document activé par reglages.json ; verrou de sortie mesuré à part sur la réponse de coder_texte",
  documents: resultats.length,
  ...agg,
  plus_gros_ecarts: ecarts(agg, 5),
  // Texte codé qui n'est plus « l'origine + des codes » (codes imbriqués,
  // morceau de mot recodé) : protégé, mais indécodable proprement.
  documents_imbriques: resultats.filter((r) => r.imbrique).map((r) => r.id),
};
fs.mkdirSync(SORTIE, { recursive: true });
fs.writeFileSync(path.join(SORTIE, "ht-bench.json"), JSON.stringify(sortie, null, 1) + "\n");
fs.writeFileSync(path.join(SORTIE, "RAPPORT.md"), rapportMarkdown(sortie));

const pct = (x) => (x === null || x === undefined ? "—" : `${(100 * x).toFixed(1)} %`);
console.log(`\nHT-Bench ${manifeste.version} — moteur v${version} — ${resultats.length} documents, ${agg.global.tous.n} valeurs, ${agg.global.leurres.n} leurres (${((Date.now() - t0) / 1000).toFixed(1)} s)\n`);
console.log("  Pack                   Rappel direct      Rappel tout   Précision   Leurres codés");
for (const [p, v] of Object.entries(agg.par_pack)) {
  console.log(`  ${p.padEnd(22)} ${pct(v.direct.rappel).padStart(8)} (${v.direct.detectes}/${v.direct.n})`.padEnd(45) +
    `${pct(v.tous.rappel).padStart(8)}   ${pct(v.precision).padStart(8)}   ${pct(v.leurres.taux_faux_positifs).padStart(8)}`);
}
console.log(`\n  DIRECTS : ${pct(agg.global.direct.rappel)} (${agg.global.direct.detectes}/${agg.global.direct.n}) — cible ≥ 99 % par pack`);
console.log("  Plus gros écarts :");
for (const e of sortie.plus_gros_ecarts) console.log(`   - ${e.cle} : ${e.perdues} perdue(s) sur ${e.n} (rappel ${pct(e.rappel)})`);
console.log(`\n  → ${path.relative(process.cwd(), path.join(SORTIE, "RAPPORT.md"))}`);

/* ------------------------------------------------------- la référence */
function referenceDe(agg) {
  const r = (c) => ({ n: c.n, detectes: c.detectes, rappel: c.rappel });
  return {
    note: "Rappel sur les identifiants directs, mesuré par HT-Bench. La CI (bench:ht:controle) échoue s'il baisse. Réenregistrer : node bench/ht-bench/evaluer.mjs --enregistrer-reference",
    version_jeu: manifeste.version,
    jeu_sha256: manifeste.sha256,
    version_moteur: version,
    global: r(agg.global.direct),
    par_pack: Object.fromEntries(Object.entries(agg.par_pack).map(([p, v]) => [p, r(v.direct)])),
    par_type: Object.fromEntries(Object.entries(agg.par_type).filter(([, v]) => v.direct).map(([t, v]) => [t, r(v)])),
  };
}
if (ENREGISTRER) {
  fs.writeFileSync(REFERENCE, JSON.stringify(referenceDe(agg), null, 2) + "\n");
  console.log(`  Référence enregistrée → ${path.relative(process.cwd(), REFERENCE)}`);
}
if (CONTROLE) {
  const ref = JSON.parse(fs.readFileSync(REFERENCE, "utf8"));
  const cur = referenceDe(agg);
  const chutes = [];
  if (ref.jeu_sha256 !== cur.jeu_sha256) {
    chutes.push(`le jeu a changé (${ref.jeu_sha256.slice(0, 12)}… → ${cur.jeu_sha256.slice(0, 12)}…) : réenregistrer la référence avec --enregistrer-reference`);
  }
  const comparer = (ou, a, b) => {
    if (!a) return;
    if (!b) { chutes.push(`${ou} : absent du résultat`); return; }
    if (b.rappel < a.rappel - 1e-9) chutes.push(`${ou} : ${pct(a.rappel)} → ${pct(b.rappel)} (${a.detectes}/${a.n} → ${b.detectes}/${b.n})`);
  };
  comparer("global", ref.global, cur.global);
  for (const [p, a] of Object.entries(ref.par_pack)) comparer(`pack ${p}`, a, cur.par_pack[p]);
  for (const [t, a] of Object.entries(ref.par_type)) comparer(`type ${t}`, a, cur.par_type[t]);
  if (chutes.length) {
    console.error(`\n❌ Rappel des identifiants directs sous la référence :\n  ${chutes.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\n✅ Rappel des identifiants directs ≥ référence (moteur v${ref.version_moteur}) sur ${Object.keys(ref.par_pack).length} packs et ${Object.keys(ref.par_type).length} types.`);
}
