#!/usr/bin/env node
// ============================================================================
// HT-BENCH — passe le jeu synthétique dans le VRAI moteur et le note.
//
//   npm run bench:ht                → resultats/ht-bench.json + resultats/RAPPORT*.md
//   npm run bench:ht:controle       → idem, puis ÉCHEC si le rappel sur les
//                                     identifiants directs passe sous la
//                                     référence (reference.json), chemin par
//                                     chemin : global, pack, type, langue
//   node bench/ht-bench/evaluer.mjs --enregistrer-reference
//                                   → réécrit reference.json (après un
//                                     progrès voulu, ou un jeu enrichi)
//   --chemin md,docx                → seulement ces chemins (mise au point ;
//                                     incompatible avec --controle)
//
// Quatre chemins, tous par anonymiser_fichier dans un connecteur lancé avec
// le pack du document (cf. lib/moteur.mjs), clé remise à zéro entre deux
// documents :
//   md             un .md (codeFreeText : le même codage que coder_texte et
//                  qu'un PDF) ; la réponse de coder_texte (verrou de sortie
//                  compris) dit, pour chaque valeur manquée, si l'IA la lirait ;
//   docx           le même document dans un .docx (lib/formats.mjs) ;
//   xlsx-document  le même document dans un .xlsx, mode document ;
//   xlsx-tableau   les documents « tableau » dans un .xlsx, mode tableau.
// Aucun réseau : un processus local, des données inventées.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { ouvrirMoteur } from "./lib/moteur.mjs";
import { aligner } from "./lib/alignement.mjs";
import { evaluerDocument, agreger, ecarts } from "./lib/score.mjs";
import { rapportMarkdown, rapportSynthese } from "./lib/rapport.mjs";
import { versDocx, versXlsx, texteFeuille } from "./lib/formats.mjs";
import { docxParagraphs } from "../../server/word.js";
import { lireJeu, FICHIER_MANIFESTE } from "./generer.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const SORTIE = path.join(here, "resultats");
const REFERENCE = path.join(here, "reference.json");
const CONTROLE = process.argv.includes("--controle");
const ENREGISTRER = process.argv.includes("--enregistrer-reference");
const iChemin = process.argv.indexOf("--chemin");
const SEULS = iChemin > 0 ? process.argv[iChemin + 1].split(",") : null;
if (SEULS && (CONTROLE || ENREGISTRER)) { console.error("--chemin ne se combine pas avec --controle ni --enregistrer-reference."); process.exit(2); }

const version = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")).version;
const manifeste = JSON.parse(fs.readFileSync(FICHIER_MANIFESTE, "utf8"));
const docs = lireJeu();

/* Pas de fichier écrit, mais ce n'est pas un refus : rien à coder. */
const RIEN = /Rien à coder|Aucune valeur à coder/;

/* Chaque chemin : les documents qu'il note, et doc → { derive, code, cle, vu }
   (derive = le document tel que le chemin le voit ; code = la sortie relue,
   dans le même ordre) ou { refus }. */
const CHEMINS = {
  md: {
    libelle: "anonymiser_fichier sur un .md (fichier *-anonymise.md écrit sur le poste) — moteur + verrou ; verrou de sortie mesuré à part sur la réponse de coder_texte",
    note: (d) => d.forme === "texte",
    async coder(moteur, d) {
      const { code, cle, vu } = await moteur.coder(d.texte);
      return { derive: d, code, cle, vu };
    },
  },
  docx: {
    libelle: "anonymiser_fichier sur un .docx (le même document : un paragraphe par ligne, tableaux Word, runs coupés, paragraphes arabes en droite-à-gauche) ; on relit les paragraphes de *-anonymise.docx",
    note: (d) => d.forme === "texte",
    async coder(moteur, d) {
      const { buf, derive } = versDocx(d, XLSX);
      const r = await moteur.coderFichier("document.docx", buf);
      if (!r.sortie) return RIEN.test(r.refus) ? { derive, code: derive.texte, cle: r.cle } : { refus: r.refus };
      return { derive, code: docxParagraphs(r.sortie, XLSX).join("\n"), cle: r.cle };
    },
  },
  "xlsx-document": {
    libelle: "anonymiser_fichier sur un .xlsx en mode document (le même document mis en cellules : « Libellé : valeur », « a | b ») ; on relit les cellules de *-anonymise.xlsx",
    note: (d) => d.forme === "texte",
    coder: (moteur, d) => classeur(moteur, d, "document"),
  },
  "xlsx-tableau": {
    libelle: "anonymiser_fichier sur un .xlsx en mode tableau (exports : une ligne d'en-têtes, une ligne par enregistrement ; colonnes reconnues codées en entier, verrou sur le reste) ; on relit les cellules de *-anonymise.xlsx",
    note: (d) => d.forme === "tableau",
    coder: (moteur, d) => classeur(moteur, d, "tableau"),
  },
};

async function classeur(moteur, d, mode) {
  const { buf, derive, nl, nc } = versXlsx(d, XLSX, mode);
  const r = await moteur.coderFichier("document.xlsx", buf, { mode });
  if (!r.sortie) return RIEN.test(r.refus) ? { derive, code: derive.texte, cle: r.cle } : { refus: r.refus };
  const wb = XLSX.read(r.sortie, { type: "buffer" });
  return { derive, code: texteFeuille(wb.Sheets[wb.SheetNames[0]], XLSX, nl, nc), cle: r.cle };
}

/* Un connecteur par (chemin, configuration de packs) ; quatre à la fois. */
const taches = [];
for (const [nom, ch] of Object.entries(CHEMINS)) {
  if (SEULS && !SEULS.includes(nom)) continue;
  const groupes = new Map();
  for (const d of docs.filter(ch.note)) {
    const k = JSON.stringify(d.packs);
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(d);
  }
  for (const [k, liste] of groupes) taches.push({ nom, ch, packs: JSON.parse(k), liste });
}
const resultats = Object.fromEntries(Object.keys(CHEMINS).filter((n) => !SEULS || SEULS.includes(n)).map((n) => [n, []]));
const erreurs = [];
const t0 = Date.now();
async function executer({ nom, ch, packs, liste }) {
  const moteur = await ouvrirMoteur(packs);
  try {
    for (const d of liste) {
      const base = { id: d.id, pack: d.pack, langue: d.langue };
      let x;
      try { x = await ch.coder(moteur, d); }
      catch (e) { erreurs.push(`${nom} ${d.id} : ${e.message}`); continue; }
      if (x.refus) { resultats[nom].push({ ...base, refus: x.refus.split("\n")[0].slice(0, 200) }); continue; }
      let al;
      try { al = aligner(x.derive.texte, x.code, x.cle); }
      catch (e) { erreurs.push(`${nom} ${d.id} : ${e.message}`); continue; }
      resultats[nom].push({ ...base, imbrique: al.imbrique, ...evaluerDocument(x.derive, al.segments, x.vu ?? null) });
    }
  } finally { await moteur.fermer(); }
}
const file = [...taches];
await Promise.all(Array.from({ length: 4 }, async () => { while (file.length) await executer(file.shift()); }));
if (erreurs.length) {
  console.error(`❌ ${erreurs.length} document(s) non réalignés — banc invalide :\n  ${erreurs.join("\n  ")}`);
  process.exit(2);
}

const ordre = (l) => l.sort((a, b) => a.id.localeCompare(b.id));
const chemins = {};
for (const [nom, liste] of Object.entries(resultats)) {
  const agg = agreger(ordre(liste));
  chemins[nom] = {
    chemin: CHEMINS[nom].libelle,
    documents: liste.length,
    verrou_mesure: nom === "md",
    ...agg,
    plus_gros_ecarts: ecarts(agg, nom === "md" ? 5 : 10),
    // Texte codé qui n'est plus « l'origine + des codes » (codes imbriqués,
    // morceau de mot recodé) : protégé, mais indécodable proprement.
    documents_imbriques: liste.filter((r) => r.imbrique).map((r) => r.id),
  };
}
const entete = { banc: "HT-Bench", version_jeu: manifeste.version, jeu_sha256: manifeste.sha256, version_moteur: version };
fs.mkdirSync(SORTIE, { recursive: true });
fs.writeFileSync(path.join(SORTIE, "ht-bench.json"), JSON.stringify({ ...entete, chemins }, null, 1) + "\n");
fs.writeFileSync(path.join(SORTIE, "RAPPORT.md"), rapportSynthese(entete, chemins));
for (const [nom, c] of Object.entries(chemins)) fs.writeFileSync(path.join(SORTIE, `RAPPORT-${nom}.md`), rapportMarkdown({ ...entete, ...c }, nom));

const pct = (x) => (x === null || x === undefined ? "—" : `${(100 * x).toFixed(1)} %`);
console.log(`\nHT-Bench ${manifeste.version} — moteur v${version} — ${docs.length} documents (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
for (const [nom, c] of Object.entries(chemins)) {
  console.log(`\n  [${nom}] ${c.documents} documents, ${c.global.tous.n} valeurs, ${c.global.leurres.n} leurres${c.refuses.n ? `, ${c.refuses.n} refusé(s)` : ""}`);
  console.log("  Pack                   Rappel direct      Rappel tout   Précision   Leurres codés");
  for (const [p, v] of Object.entries(c.par_pack)) {
    console.log(`  ${p.padEnd(22)} ${pct(v.direct.rappel).padStart(8)} (${v.direct.detectes}/${v.direct.n})`.padEnd(45) +
      `${pct(v.tous.rappel).padStart(8)}   ${pct(v.precision).padStart(8)}   ${pct(v.leurres.taux_faux_positifs).padStart(8)}`);
  }
  console.log(`  DIRECTS : ${pct(c.global.direct.rappel)} (${c.global.direct.detectes}/${c.global.direct.n}) — par langue : ` +
    Object.entries(c.par_langue).map(([l, v]) => `${l} ${pct(v.direct.rappel)}`).join(", "));
  for (const e of c.plus_gros_ecarts.slice(0, 5)) console.log(`   - ${e.cle} : ${e.perdues} perdue(s) sur ${e.n} (rappel ${pct(e.rappel)})`);
}
console.log(`\n  → ${path.relative(process.cwd(), path.join(SORTIE, "RAPPORT.md"))}`);

/* ------------------------------------------------------- la référence */
function referenceDe(chemins) {
  const r = (c) => ({ n: c.n, detectes: c.detectes, rappel: c.rappel });
  return {
    note: "Rappel sur les identifiants directs, mesuré par HT-Bench, chemin par chemin. La CI (bench:ht:controle) échoue s'il baisse, ou si le moteur refuse plus de documents. Réenregistrer : node bench/ht-bench/evaluer.mjs --enregistrer-reference",
    version_jeu: manifeste.version,
    jeu_sha256: manifeste.sha256,
    version_moteur: version,
    chemins: Object.fromEntries(Object.entries(chemins).map(([nom, c]) => [nom, {
      global: r(c.global.direct),
      refuses: c.refuses.n,
      par_pack: Object.fromEntries(Object.entries(c.par_pack).map(([p, v]) => [p, r(v.direct)])),
      par_langue: Object.fromEntries(Object.entries(c.par_langue).map(([l, v]) => [l, r(v.direct)])),
      par_type: Object.fromEntries(Object.entries(c.par_type).filter(([, v]) => v.direct).map(([t, v]) => [t, r(v)])),
    }])),
  };
}
if (ENREGISTRER) {
  fs.writeFileSync(REFERENCE, JSON.stringify(referenceDe(chemins), null, 2) + "\n");
  console.log(`  Référence enregistrée → ${path.relative(process.cwd(), REFERENCE)}`);
}
if (CONTROLE) {
  const ref = JSON.parse(fs.readFileSync(REFERENCE, "utf8"));
  const cur = referenceDe(chemins);
  const chutes = [];
  if (ref.jeu_sha256 !== cur.jeu_sha256) {
    chutes.push(`le jeu a changé (${ref.jeu_sha256.slice(0, 12)}… → ${cur.jeu_sha256.slice(0, 12)}…) : réenregistrer la référence avec --enregistrer-reference`);
  }
  const comparer = (ou, a, b) => {
    if (!a) return;
    if (!b) { chutes.push(`${ou} : absent du résultat`); return; }
    if (b.rappel < a.rappel - 1e-9) chutes.push(`${ou} : ${pct(a.rappel)} → ${pct(b.rappel)} (${a.detectes}/${a.n} → ${b.detectes}/${b.n})`);
  };
  let n = 0;
  for (const [nom, a] of Object.entries(ref.chemins || {})) {
    const b = cur.chemins[nom];
    if (!b) { chutes.push(`chemin ${nom} : absent du résultat`); continue; }
    comparer(`${nom} · global`, a.global, b.global);
    if (b.refuses > a.refuses) chutes.push(`${nom} : ${b.refuses} document(s) refusé(s) par le moteur, contre ${a.refuses} dans la référence`);
    for (const [p, x] of Object.entries(a.par_pack)) comparer(`${nom} · pack ${p}`, x, b.par_pack[p]);
    for (const [l, x] of Object.entries(a.par_langue)) comparer(`${nom} · langue ${l}`, x, b.par_langue[l]);
    for (const [t, x] of Object.entries(a.par_type)) comparer(`${nom} · type ${t}`, x, b.par_type[t]);
    n++;
  }
  if (chutes.length) {
    console.error(`\n❌ Rappel des identifiants directs sous la référence :\n  ${chutes.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\n✅ Rappel des identifiants directs ≥ référence (moteur v${ref.version_moteur}) sur ${n} chemins (packs, langues et types).`);
}
