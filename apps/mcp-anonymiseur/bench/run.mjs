#!/usr/bin/env node
// ============================================================================
// BANC D'ESSAI DES FUITES — taux de détection mesuré, sur un corpus fictif.
//
// On écrit les documents de bench/corpus.mjs dans un dossier de travail
// isolé, on parle au connecteur par le VRAI protocole MCP (comme Claude
// Desktop), on rejoue le parcours d'un utilisateur — lister, plan, exécution
// fichier par fichier, puis le lot sur le dossier entier — et on rassemble
// TOUT ce que Claude peut lire : réponses des outils, fichiers *-anonymise.*
// (contenu, nom, onglets) et rapport de lot. Chaque valeur de la vérité
// terrain y est cherchée.
//
//   node bench/run.mjs            → tableau + bench/resultats.json
//   node bench/run.mjs --equipe   → même banc, clé d'équipe
//   node bench/run.mjs --word     → les documents texte entrent en Word (.docx)
//
// Une valeur est « fuitée » si elle apparaît UNE fois, n'importe où. Les
// nombres sont comparés chiffres seuls (« 06 48 27 19 53 » = « 0648271953 »).
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as XLSX from "xlsx";
import * as _fs from "node:fs";
import { writeMinimalPdf } from "../test/util-pdf.mjs";
import { mint } from "../test/licence-test.mjs";
import { buildDocx, docxParagraphs } from "../server/word.js";
import { DOCUMENTS, CATEGORIES } from "./corpus.mjs";
import { OUTDIR_NAME } from "../server/dossier-sortie.js";
XLSX.set_fs(_fs);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").replace(/[\s\u00a0\u202f]+/g, " ").toLowerCase();
// Un seul séparateur, jamais un saut de ligne : « 13.\n\n1. » n'est pas « 131 ».
const digitsJoined = (s) => String(s).replace(/(?<=\d)[ \u00a0\u202f.\-\/](?=\d)/g, "");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* La valeur apparaît-elle dans ce que Claude lit ? */
function found(value, visible, cased) {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 6 && /^\+?[\d .\-\/]+$/.test(value)) {
    // Identifiant purement numérique : chiffres seuls, bornés. (Un passeport
    // ou une plaque, qui mêlent lettres et chiffres, se cherchent tels quels.)
    return new RegExp(`(?<!\\d)${digits}(?!\\d)`).test(visible.digits);
  }
  if (cased) {
    return new RegExp(`(?<![\\p{L}\\p{N}])${esc(value)}(?![\\p{L}\\p{N}])`, "u").test(visible.raw);
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${esc(fold(value))}(?![\\p{L}\\p{N}])`, "u").test(visible.folded);
}

function xlsxText(p) {
  const wb = XLSX.readFile(p);
  return wb.SheetNames.join(" | ") + "\n" + wb.SheetNames
    .map((s) => XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, raw: false, defval: "" }).map((r) => r.join(" | ")).join("\n"))
    .join("\n");
}

/* ------------------------------------------------------------ terrain */
// --word : chaque document texte devient un .docx (une ligne = un
// paragraphe) — même vérité terrain, parcours Word.
const WORD = process.argv.includes("--word");
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-bench-"));
for (const d of DOCUMENTS) {
  const p = path.join(workdir, d.file);
  if (d.kind === "md" && WORD) fs.writeFileSync(p.replace(/\.md$/, ".docx"), buildDocx(d.text, XLSX));
  else if (d.kind === "md") fs.writeFileSync(p, d.text, "utf8");
  else if (d.kind === "pdf") writeMinimalPdf(p, d.lines);
  else {
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(d.sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    XLSX.writeFile(wb, p);
  }
}

const TEAM_DIR = process.argv.includes("--equipe") ? fs.mkdtempSync(path.join(os.tmpdir(), "anx-bench-equipe-")) : "";
const client = new Client({ name: "banc-fuites", version: "1.0.0" });
await client.connect(new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, "server", "index.js")],
  // --equipe : même banc avec la clé d'équipe (codes déterministes à 8 chiffres).
  // La vérité terrain compte les montants des tableurs comme sensibles : le
  // banc les mesure en gabarit (le défaut du connecteur est « auto » depuis la
  // v2.16 ; ANX_CHIFFRES=auto pour mesurer ce défaut).
  env: { ...process.env, ANX_CHIFFRES: process.env.ANX_CHIFFRES || "gabarit", ANX_WORKDIR: workdir, ANX_TEAM_DIR: TEAM_DIR,
    ANX_LICENCE: mint({ v: 1, org: "Banc d'essai", seats: TEAM_DIR ? 20 : 1, iat: "2026-10-20", exp: "9999-12-31", life: true }) },
  stderr: "ignore",
}));

const outputs = [];
async function call(name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const t = res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
  outputs.push({ source: `${name} ${JSON.stringify(args)}`, t });
  return t;
}

/* ----------------------------------------------- parcours utilisateur */
const liste = await call("lister_fichiers");
const handles = [...new Set([...liste.matchAll(/\[(F-[A-Z2-7]{5})\]/g)].map((m) => m[1]))];
if (handles.length !== DOCUMENTS.length) {
  console.error(`⚠️ ${handles.length} repères pour ${DOCUMENTS.length} documents :\n${liste}`);
}
for (const h of handles) {
  await call("anonymiser_fichier", { nom_fichier: h });
  await call("anonymiser_fichier", { nom_fichier: h, confirmer: true });
}
await call("anonymiser_dossier");
await call("anonymiser_dossier", { confirmer: true });
await client.close();

const outDir = path.join(workdir, OUTDIR_NAME);
const produced = fs.readdirSync(outDir).filter((n) => /-anonymise\.(xlsx|md|docx)$/.test(n) || /^rapport-lot-/.test(n));
for (const n of produced) {
  const p = path.join(outDir, n);
  if (n.endsWith(".docx")) {
    // Le texte (pour la lisibilité) ET le paquet entier, balises comprises
    // (pour les fuites : métadonnées, attributs, toutes les parties).
    outputs.push({ source: `fichier ${n}`, t: n + "\n" + docxParagraphs(fs.readFileSync(p), XLSX).join("\n") });
    const cfb = XLSX.CFB.read(fs.readFileSync(p), { type: "buffer" });
    const raw = cfb.FileIndex.filter((e) => e.type === 2 && e.content).map((e) => Buffer.from(e.content).toString("utf8")).join("\n");
    outputs.push({ source: `paquet ${n}`, t: raw });
    continue;
  }
  outputs.push({ source: `fichier ${n}`, t: n + "\n" + (n.endsWith(".xlsx") ? xlsxText(p) : fs.readFileSync(p, "utf8")) });
}

/* Ce que Claude voit, sous trois formes de recherche. */
const all = outputs.map((o) => o.t).join("\n");
const visible = { raw: all, folded: fold(all), digits: digitsJoined(all) };
function where(value, cased) {
  return outputs.filter((o) => found(value, { raw: o.t, folded: fold(o.t), digits: digitsJoined(o.t) }, cased)).map((o) => o.source);
}

/* Texte source d'un document (pour le contrôle du détecteur et la lisibilité). */
function sourceText(d) {
  if (d.kind === "md") return d.text;
  if (d.kind === "pdf") return d.lines.join("\n");
  return Object.entries(d.sheets).map(([n, rows]) => n + "\n" + rows.map((r) => r.join(" | ")).join("\n")).join("\n");
}

/* Sortie produite pour un document : son nom est codé, donc on la reconnaît
   à son contenu — le fichier *-anonymise.* qui partage le plus de mots avec
   le document source. */
function outputFor(d) {
  const src = new Set(fold(sourceText(d)).match(/\p{L}{3,}/gu) || []);
  let best = null, score = 0;
  for (const o of outputs.filter((x) => /^fichier .*-anonymise\./.test(x.source))) {
    const n = [...new Set(fold(o.t).match(/\p{L}{3,}/gu) || [])].filter((w) => src.has(w)).length;
    if (n > score) { best = o; score = n; }
  }
  return best;
}

/* CONTRÔLE DU DÉTECTEUR : sur les documents ORIGINAUX, il doit tout trouver —
   sinon un 100 % ne prouverait rien. */
let selfMiss = [];
for (const d of DOCUMENTS) {
  const t = sourceText(d);
  const v = { raw: t, folded: fold(t), digits: digitsJoined(t) };
  const cased = new Set(d.cased || []);
  for (const values of Object.values(d.secrets)) for (const x of values) if (!found(x, v, cased.has(x))) selfMiss.push(`${d.file} : ${x}`);
}
if (selfMiss.length) {
  console.error("❌ Le détecteur ne retrouve pas ces valeurs dans les originaux — banc invalide :\n  " + selfMiss.join("\n  "));
  process.exit(2);
}

/* -------------------------------------------------------------- score */
const perCat = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, { total: 0, leaked: 0 }]));
const perDomain = {};
const leaks = [];
const keep = { total: 0, kept: 0, lost: [] };
const words_ = [];
for (const d of DOCUMENTS) {
  perDomain[d.domaine] ||= { total: 0, leaked: 0 };
  const cased = new Set(d.cased || []);
  for (const [cat, values] of Object.entries(d.secrets)) {
    for (const v of values) {
      perCat[cat].total++; perDomain[d.domaine].total++;
      if (found(v, visible, cased.has(v))) {
        perCat[cat].leaked++; perDomain[d.domaine].leaked++;
        leaks.push({ document: d.file, categorie: cat, valeur: v, vu_dans: where(v, cased.has(v)) });
      }
    }
  }
  // Lisibilité du texte courant : mots de 3 lettres et plus, hors valeurs
  // sensibles, retrouvés tels quels dans la sortie DE CE document.
  const out = outputFor(d);
  const secretWords = new Set(Object.values(d.secrets).flat().flatMap((v) => fold(v).split(/[^\p{L}\p{N}]+/u)));
  const words = [...new Set(fold(sourceText(d)).match(/\p{L}{3,}/gu) || [])].filter((w) => !secretWords.has(w));
  const outWords = new Set(out ? fold(out.t).match(/\p{L}{3,}/gu) || [] : []);
  const kept = words.filter((w) => outWords.has(w));
  words_.push({ document: d.file, sortie: !!out, mots: words.length, gardes: kept.length,
    codes_a_tort: words.filter((w) => !outWords.has(w)) });
  for (const g of d.garder || []) {
    keep.total++;
    if (fold(all).includes(fold(g))) keep.kept++;
    else keep.lost.push({ document: d.file, valeur: g });
  }
}
const total = Object.values(perCat).reduce((a, c) => ({ total: a.total + c.total, leaked: a.leaked + c.leaked }), { total: 0, leaked: 0 });
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) : "—");

const resultats = {
  version: manifest.version,
  date: new Date().toISOString().slice(0, 10),
  documents: DOCUMENTS.length,
  sorties_lues: outputs.length,
  valeurs_sensibles: total.total,
  fuites: total.leaked,
  taux_detection: pct(total.total - total.leaked, total.total),
  par_categorie: Object.fromEntries(Object.entries(perCat).map(([k, c]) => [k, { libelle: CATEGORIES[k], ...c, taux: pct(c.total - c.leaked, c.total) }])),
  par_domaine: Object.fromEntries(Object.entries(perDomain).map(([k, c]) => [k, { ...c, taux: pct(c.total - c.leaked, c.total) }])),
  lisibilite: { total: keep.total, gardees: keep.kept, taux: pct(keep.kept, keep.total), perdues: keep.lost },
  mots_courants: {
    total: words_.reduce((a, w) => a + w.mots, 0),
    gardes: words_.reduce((a, w) => a + w.gardes, 0),
    taux: pct(words_.reduce((a, w) => a + w.gardes, 0), words_.reduce((a, w) => a + w.mots, 0)),
    par_document: words_.map((w) => ({ ...w, taux: pct(w.gardes, w.mots) })),
  },
  detail_fuites: leaks,
};
if (!TEAM_DIR && !WORD) fs.writeFileSync(path.join(here, "resultats.json"), JSON.stringify(resultats, null, 2) + "\n");

console.log(`\nBanc d'essai — connecteur v${manifest.version}${TEAM_DIR ? " (clé d'équipe)" : ""}${WORD ? " (documents texte en Word)" : ""}, ${DOCUMENTS.length} documents, ${outputs.length} sorties lues par l'IA\n`);
for (const [k, c] of Object.entries(perCat)) {
  if (c.total) console.log(`  ${CATEGORIES[k].padEnd(50)} ${String(c.total - c.leaked).padStart(3)}/${String(c.total).padEnd(3)} ${pct(c.total - c.leaked, c.total).padStart(5)} %`);
}
console.log(`\n  DÉTECTION GLOBALE : ${total.total - total.leaked}/${total.total} = ${resultats.taux_detection} %`);
console.log(`  LISIBILITÉ (ce qui doit rester lisible) : ${keep.kept}/${keep.total} = ${resultats.lisibilite.taux} %`);
console.log(`  MOTS COURANTS GARDÉS LISIBLES : ${resultats.mots_courants.gardes}/${resultats.mots_courants.total} = ${resultats.mots_courants.taux} %`);
for (const w of resultats.mots_courants.par_document) {
  console.log(`     ${w.taux.padStart(5)} %  ${w.document}${w.sortie ? "" : "  ⚠️ sortie introuvable"}`);
}
if (leaks.length) {
  console.log("\n  Fuites :");
  for (const l of leaks) console.log(`   - [${l.categorie}] « ${l.valeur} » (${l.document}) → ${l.vu_dans.slice(0, 2).join(" ; ")}`);
}
if (keep.lost.length) {
  console.log("\n  Rendu illisible :");
  for (const l of keep.lost) console.log(`   - « ${l.valeur} » (${l.document})`);
}
if (process.argv.includes("--garder")) console.log(`\nDossier : ${workdir}`);
else fs.rmSync(workdir, { recursive: true, force: true });
if (TEAM_DIR) fs.rmSync(TEAM_DIR, { recursive: true, force: true });
