#!/usr/bin/env node
// ============================================================================
// BANC D'ESSAI — L'APPLI WEB (ai4x-website/anonymiseur-local.html).
//
// Même corpus et même règle que bench/run.mjs (une valeur est fuitée si elle
// apparaît une fois dans ce que l'IA recevra), appliqués au moteur DU FICHIER
// LIVRÉ de l'appli : ses blocs <script> sont évalués tels quels (SheetJS,
// verrou embarqué s'il y en a un, appli), comme le font les tests du site.
// L'appli ne lit que les tableurs : seuls les documents .xlsx du corpus
// comptent. Réglages par défaut d'un utilisateur : les colonnes cochées
// d'office, le mode (tableau ou document) choisi par l'appli.
//
// Ce que l'IA reçoit : le fichier *-anonymise.xlsx — son NOM, ses onglets,
// ses cellules.
//
//   node bench/web.mjs ../../../ai4x-website/anonymiseur-local.html
// ============================================================================
import fs from "node:fs";
import vm from "node:vm";
import { DOCUMENTS, CATEGORIES } from "./corpus.mjs";

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("Usage : node bench/web.mjs <chemin vers anonymiseur-local.html>");
  process.exit(1);
}
const html = fs.readFileSync(file, "utf8");
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const appBlock = blocks.find((b) => b.includes("window.ANX = {"));
const vendor = blocks.find((b) => b.includes("SheetJS") && b !== appBlock);
const verrouBlock = blocks.find((b) => b.includes("globalThis.NanomizerVerrou="));
const fake = () => ({ style: {}, dataset: {}, files: [], value: "", textContent: "", innerHTML: "", hidden: false,
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, appendChild: (c) => c,
  setAttribute() {}, getAttribute: () => null, querySelector: () => fake(), querySelectorAll: () => [], closest: () => fake(), click() {}, focus() {} });
const sb = { console, setTimeout, clearTimeout, URLSearchParams, TextDecoder, TextEncoder, Blob, Response, DecompressionStream, atob,
  location: { search: "" }, navigator: {}, URL: { createObjectURL: () => "", revokeObjectURL() {} }, FileReader: class {},
  document: { getElementById: () => fake(), createElement: () => fake(), querySelector: () => fake(), querySelectorAll: () => [], body: fake(), addEventListener() {} } };
sb.window = sb; sb.self = sb; sb.globalThis = sb;
vm.createContext(sb);
vm.runInContext(vendor, sb);
if (verrouBlock) vm.runInContext(verrouBlock, sb);
vm.runInContext(appBlock, sb);
const { ANX, XLSX } = sb;
const V = sb.NanomizerVerrou;
if (V) await V.pret;

const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").replace(/[\s  ]+/g, " ").toLowerCase();
const digitsJoined = (s) => String(s).replace(/(?<=\d)[   .\-\/](?=\d)/g, "");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function found(value, v, cased) {
  const d = value.replace(/\D/g, "");
  if (d.length >= 6 && /^\+?[\d .\-\/]+$/.test(value)) return new RegExp(`(?<!\\d)${d}(?!\\d)`).test(v.digits);
  if (cased) return new RegExp(`(?<![\\p{L}\\p{N}])${esc(value)}(?![\\p{L}\\p{N}])`, "u").test(v.raw);
  return new RegExp(`(?<![\\p{L}\\p{N}])${esc(fold(value))}(?![\\p{L}\\p{N}])`, "u").test(v.folded);
}

/* Les colonnes cochées d'office, comme scanSheet() dans l'appli. */
function defaultCols(ws) {
  const r = XLSX.utils.decode_range(ws["!ref"]);
  const cols = [];
  for (let c = r.s.c; c <= r.e.c; c++) {
    const cell = (rr) => { const x = ws[XLSX.utils.encode_cell({ r: rr, c })]; return x ? String(x.w ?? x.v ?? "").trim() : ""; };
    const values = [];
    for (let rr = r.s.r + 1; rr <= r.e.r; rr++) if (cell(rr)) values.push(cell(rr));
    const type = ANX.detectByHeader(cell(r.s.r)) || ANX.detectByValues(values);
    cols.push({ c, header: cell(r.s.r), checked: !!type, type: type || "autre" });
  }
  return cols;
}

const per = {}, leaks = [], lost = [];
let keepTot = 0;
let tot = 0, leaked = 0;
for (const d of DOCUMENTS.filter((x) => x.kind === "xlsx")) {
  const book = ANX.newCodebook();
  const base = d.file.replace(/\.xlsx$/, "");
  let shown = "";
  for (const [sn, rows] of Object.entries(d.sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const mode = ANX.detectLayout(ws).layout;
    let out;
    if (ANX.anonymiserTableau) {      // v2.3 : le parcours exact de l'interface
      out = mode === "document" ? ANX.anonymiserDocument(V, ws, book, []).ws : ANX.anonymiserTableau(V, ws, defaultCols(ws), book).ws;
    } else {
      out = mode === "document" ? ANX.anonymizeDocument(ws, book, [], {}).ws : ANX.anonymizeSheet(ws, defaultCols(ws), book).ws;
    }
    const sheetName = ANX.nomOngletCode ? ANX.nomOngletCode(V, sn, book) : sn;
    shown += sheetName + "\n" + XLSX.utils.sheet_to_json(out, { header: 1, raw: false, defval: "" }).map((x) => x.join(" | ")).join("\n") + "\n";
  }
  const outName = (ANX.nomFichierCode ? ANX.nomFichierCode(V, base, book) : base) + "-anonymise.xlsx";
  shown = outName + "\n" + shown;
  const v = { raw: shown, folded: fold(shown), digits: digitsJoined(shown) };
  const cased = new Set(d.cased || []);
  for (const g of d.garder || []) { keepTot++; if (!v.folded.includes(fold(g))) lost.push(`« ${g} » (${d.file})`); }
  for (const [cat, vals] of Object.entries(d.secrets)) {
    for (const x of vals) {
      per[cat] ||= { total: 0, leaked: 0 };
      per[cat].total++; tot++;
      if (found(x, v, cased.has(x))) { per[cat].leaked++; leaked++; leaks.push(`[${cat}] « ${x} » (${d.file})`); }
    }
  }
}

const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : "—");
const horsMontants = Object.entries(per).filter(([k]) => k !== "montant").reduce((a, [, c]) => ({ t: a.t + c.total, l: a.l + c.leaked }), { t: 0, l: 0 });
console.log(`\nBanc d'essai — appli web${V ? ` (verrou v${V.version} embarqué)` : " (sans verrou)"}, ${DOCUMENTS.filter((x) => x.kind === "xlsx").length} tableurs, réglages par défaut\n`);
for (const [k, c] of Object.entries(per)) {
  console.log(`  ${CATEGORIES[k].padEnd(50)} ${String(c.total - c.leaked).padStart(3)}/${String(c.total).padEnd(3)} ${pct(c.total - c.leaked, c.total).padStart(5)} %`);
}
console.log(`\n  TOTAL : ${tot - leaked}/${tot} = ${pct(tot - leaked, tot)} %   ·   hors montants : ${horsMontants.t - horsMontants.l}/${horsMontants.t} = ${pct(horsMontants.t - horsMontants.l, horsMontants.t)} %`);
console.log(`  LISIBILITÉ (termes qui doivent rester lisibles) : ${keepTot - lost.length}/${keepTot}` + (lost.length ? " — rendus illisibles : " + lost.join(", ") : ""));
if (leaks.length) console.log("\n  Fuites :\n   - " + leaks.join("\n   - "));
