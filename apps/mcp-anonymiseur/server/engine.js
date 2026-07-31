// Moteur de pseudonymisation — portage Node du moteur éprouvé de l'appli web
// ai4x-website/anonymiseur-local.html (v2). Même comportement attendu :
// même valeur (même type) => même code, y compris d'un fichier à l'autre via
// le « carnet de codes » (codebook) persistant.
//
// RÈGLE ABSOLUE du connecteur : les fonctions de ce module ne décident pas de
// ce qui entre dans le contexte du modèle — c'est server/index.js qui garantit
// que les valeurs réelles (clé, contenus décodés) n'y apparaissent JAMAIS.

import * as XLSX from "xlsx";
import * as _fs from "node:fs";

// Build ESM de SheetJS : fs doit être branché explicitement, sinon
// readFile/writeFile échouent (« cannot save file »).
XLSX.set_fs(_fs);

export const TYPES = [
  { id: "prenom",   prefix: "PRENOM",   label: "Prénom" },
  { id: "nom",      prefix: "NOM",      label: "Nom" },
  { id: "personne", prefix: "PERSONNE", label: "Nom complet" },
  { id: "cin",      prefix: "CIN",      label: "CIN / pièce d'identité" },
  { id: "email",    prefix: "EMAIL",    label: "Email" },
  { id: "tel",      prefix: "TEL",      label: "Téléphone" },
  { id: "rib",      prefix: "RIB",      label: "Compte bancaire (RIB / IBAN)" },
  { id: "adresse",  prefix: "ADRESSE",  label: "Adresse" },
  { id: "societe",  prefix: "SOCIETE",  label: "Société / employeur" },
  // Identifiants d'entreprise marocains (mode document — dictionnaire local).
  { id: "ice",      prefix: "ICE",      label: "ICE" },
  { id: "if",       prefix: "IF",       label: "Identifiant fiscal (IF)" },
  { id: "rc",       prefix: "RC",       label: "Registre de commerce (RC)" },
  { id: "cnss",     prefix: "CNSS",     label: "N° CNSS" },
  { id: "patente",  prefix: "PATENTE",  label: "N° de patente" },
  { id: "autre",    prefix: "CODE",     label: "Autre donnée sensible" },
];

export const PREFIX_LABEL = Object.fromEntries(TYPES.map((t) => [t.prefix, t.label]));

export function typeById(id) {
  return TYPES.find((t) => t.id === id) || TYPES[TYPES.length - 1];
}

/* Détection par en-tête. L'ordre compte : « prénom » avant « nom »,
   « nom complet » avant « nom ». */
export function detectByHeader(h) {
  const s = String(h || "").toLowerCase();
  if (!s) return null;
  if (/pr[eé]nom|first\s*name/.test(s)) return "prenom";
  if (/nom\s*complet|full\s*name/.test(s)) return "personne";
  if (/\bnom\b|last\s*name|surname/.test(s)) return "nom";
  if (/\bcin\b|c\.i\.n|identit/.test(s)) return "cin";
  if (/mail|courriel/.test(s)) return "email";
  if (/t[eé]l|phone|gsm|portable|mobile|whatsapp/.test(s)) return "tel";
  if (/\brib\b|iban|compte|bancaire|bank/.test(s)) return "rib";
  if (/adresse|address/.test(s)) return "adresse";
  if (/soci[eé]t|entreprise|raison\s*sociale|company|employeur/.test(s)) return "societe";
  return null;
}

/* Un numéro n'est un TÉLÉPHONE que s'il en a la FORME marocaine
   (+212 / 00212 / 0 puis 5-7 puis 8 chiffres). La règle générique
   « 9 à 15 chiffres » codait des montants et des références en téléphones
   (constaté en réel : 98 faux positifs sur un batch de factures). */
export function isMoroccanPhone(digits) {
  return /^(?:\+212|00212)[5-7]\d{8}$/.test(digits) || /^0[5-7]\d{8}$/.test(digits);
}

/* Détection par contenu : échantillon de 80 valeurs, seuil 60 %. */
export function detectByValues(values) {
  const take = [];
  for (const v of values) {
    const s = String(v == null ? "" : v).trim();
    if (s) take.push(s);
    if (take.length >= 80) break;
  }
  if (!take.length) return null;
  const n = { email: 0, tel: 0, cin: 0, rib: 0 };
  for (const s of take) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) { n.email++; continue; }
    const d = s.replace(/[\s.\-()]/g, "");
    if (/^\d{16,26}$/.test(d)) { n.rib++; continue; }
    if (isMoroccanPhone(d)) { n.tel++; continue; }
    if (/^[A-Za-z]{1,2}\d{3,8}$/.test(s.replace(/\s/g, ""))) n.cin++;
  }
  for (const k of ["rib", "email", "cin", "tel"]) {
    if (n[k] >= take.length * 0.6) return k;
  }
  return null;
}

/* Cellule entière. */
export function classifyValue(s) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return "email";
  const d = s.replace(/[\s.\-()]/g, "");
  if (/^\d{16,26}$/.test(d)) return "compte bancaire";
  if (isMoroccanPhone(d)) return "téléphone";
  if (/^[A-Za-z]{1,2}\d{3,8}$/.test(s.replace(/\s/g, ""))) return "CIN";
  return null;
}

/* Dans le texte (contrôle de fuite) : détecte aussi une donnée ENFOUIE dans
   une phrase. Le CIN reste cellule entière (anti-faux-positifs). */
export function classifyLoose(s) {
  const kinds = {};
  const whole = classifyValue(s);
  if (whole) kinds[whole] = 1;
  if (/[^\s@]+@[^\s@]+\.[^\s@]{2,}/.test(s)) kinds["email"] = 1;
  if (/(\+|00)?\d([\s.\-]?\d){15,25}/.test(s)) kinds["compte bancaire"] = 1;
  else if (/(?:\+212|00212|0)[\s.\-]?[5-7](?:[\s.\-]?\d){8}(?!\d)/.test(s)) kinds["téléphone"] = 1;
  return Object.keys(kinds);
}

const DIGIT_PREFIXES = new Set(["TEL", "RIB", "ICE", "IF", "RC", "CNSS", "PATENTE"]);

export function normFor(prefix, text) {
  if (prefix === "EMAIL") return String(text).toLowerCase();
  // Identifiants numériques : « 06 61 23 45 67 » et « 0661234567 » sont la
  // même valeur — normaliser les séparateurs pour ne pas doubler les codes.
  if (DIGIT_PREFIXES.has(prefix)) return String(text).replace(/[\s.\-]/g, "");
  return String(text).replace(/\s+/g, " ");
}

/* Attribue (ou retrouve) le code d'une valeur dans le carnet. Utilisé par les
   deux modes (tableau et document) — même clé, mêmes compteurs. */
export function codeFor(book, typeId, text) {
  const t = typeById(typeId);
  const mapKey = t.prefix + "||" + normFor(t.prefix, text);
  let code = book.byKey[mapKey];
  let isNew = false;
  if (!code) {
    book.counters[t.prefix] = (book.counters[t.prefix] || 0) + 1;
    code = t.prefix + "-" + pad(book.counters[t.prefix]);
    book.byKey[mapKey] = code;
    book.entries.push({ code, value: String(text), type: t.label });
    isNew = true;
  }
  return { code, isNew };
}

export function pad(num) {
  return num < 1000 ? String(num + 1000).slice(1) : String(num);
}

export function newCodebook() {
  return { byKey: {}, counters: {}, entries: [] };
}

export function cellText(cell) {
  if (!cell) return "";
  if (cell.w !== undefined) return String(cell.w);
  if (cell.v === undefined || cell.v === null) return "";
  return String(cell.v);
}

/* Analyse d'un onglet : colonnes, en-têtes, détection auto.
   Renvoie [{ c, header, checked, type, nonEmpty }]. Aucun échantillon de
   valeur n'est renvoyé — le serveur ne doit pas exposer de données réelles. */
export function scanSheet(ws) {
  if (!ws || !ws["!ref"]) return [];
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const cols = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const header = cellText(ws[XLSX.utils.encode_cell({ r: range.s.r, c })]).trim();
    const values = [];
    let nonEmpty = 0;
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const t = cellText(ws[XLSX.utils.encode_cell({ r, c })]).trim();
      if (!t) continue;
      nonEmpty++;
      if (values.length < 200) values.push(t);
    }
    if (!header && !nonEmpty) continue;
    const type = detectByHeader(header) || detectByValues(values);
    cols.push({
      c,
      header: header || `Colonne ${XLSX.utils.encode_col(c)}`,
      checked: !!type,
      type: type || "autre",
      nonEmpty,
    });
  }
  return cols;
}

/* Cœur : anonymise les colonnes cochées d'une worksheet avec un carnet de
   codes cumulé. Les cellules non cochées sont copiées telles quelles. */
export function anonymizeSheet(ws, cols, book) {
  book = book || newCodebook();
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const out = {};
  for (const k of Object.keys(ws)) out[k] = ws[k];
  let replaced = 0;
  let newCodes = 0;
  const selected = cols.filter((c) => c.checked);
  for (const col of selected) {
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: col.c });
      const text = cellText(ws[addr]).trim();
      if (!text) continue;
      const { code, isNew } = codeFor(book, col.type, text);
      if (isNew) newCodes++;
      out[addr] = { t: "s", v: code };
      replaced++;
    }
  }
  return {
    ws: out,
    book,
    stats: { replaced, newCodes, reusedCells: replaced - newCodes, columns: selected.length },
  };
}

/* Contrôle de fuite sur les colonnes NON cochées. Renvoie des comptes, jamais
   les valeurs elles-mêmes. */
export function leakScan(ws, cols) {
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const out = [];
  for (const col of cols.filter((c) => !c.checked)) {
    const counts = {};
    let scanned = 0;
    for (let r = range.s.r + 1; r <= range.e.r && scanned < 2000; r++) {
      const t = cellText(ws[XLSX.utils.encode_cell({ r, c: col.c })]).trim();
      if (!t) continue;
      scanned++;
      for (const kind of classifyLoose(t)) counts[kind] = (counts[kind] || 0) + 1;
    }
    const parts = Object.keys(counts).map((k) => `${counts[k]} valeur(s) type ${k}`);
    if (parts.length) out.push({ header: col.header, parts: parts.join(", ") });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 *  MODE DOCUMENT — factures et documents mis en page (pas de tableau) *
 * ------------------------------------------------------------------ */

/* Tableau ou document ? Un TABLEAU a une ligne d'en-têtes textuelle qui
   couvre l'essentiel des colonnes de données. Une facture mise en page n'en
   a pas (libellés et valeurs mélangés, cellules éparses). */
export function detectLayout(ws) {
  if (!ws || !ws["!ref"]) return { layout: "tableau", headerCells: 0, dataCols: 0 };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const colsWithData = new Set();
  for (let c = range.s.c; c <= range.e.c; c++) {
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      if (cellText(ws[XLSX.utils.encode_cell({ r, c })]).trim()) { colsWithData.add(c); break; }
    }
  }
  let headerCells = 0;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const h = cellText(ws[XLSX.utils.encode_cell({ r: range.s.r, c })]).trim();
    if (h && colsWithData.has(c)) headerCells++;
  }
  const dataCols = colsWithData.size;
  const layout = headerCells >= 2 && headerCells >= dataCols * 0.6 ? "tableau" : "document";
  return { layout, headerCells, dataCols };
}

/* Dictionnaire marocain : motifs appliqués À L'INTÉRIEUR des cellules texte.
   Le libellé reste, la valeur devient un code (« ICE : 003… » → « ICE : ICE-001 »).
   Ordre = priorité. `check` (optionnel) valide la capture avant codage. */
const DOC_PATTERNS = [
  { type: "email", rx: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: "tel",
    rx: /(?:\+212|00212|0)[ .\-]?[5-7](?:[ .\-]?\d){8}(?!\d)/g,
    check: (v) => isMoroccanPhone(v.replace(/[\s.\-]/g, "")) },
  { type: "ice",     rx: /\b(?:ICE|I\.C\.E\.?)[^0-9A-Za-z\n]{0,6}(\d{15})\b/gi },
  { type: "if",      rx: /\b(?:IF|I\.F\.?)[^0-9A-Za-z\n]{0,6}(\d{6,8})\b/g },
  { type: "rc",      rx: /\b(?:RC|R\.C\.?)[^0-9A-Za-z\n]{0,6}(\d{3,7})\b/g },
  { type: "cnss",    rx: /\bCNSS[^0-9A-Za-z\n]{0,6}(\d{6,9})\b/gi },
  { type: "patente", rx: /\bpatente[^0-9A-Za-z\n]{0,6}(\d{5,9})\b/gi },
  { type: "cin",     rx: /\b(?:CIN|C\.I\.N\.?)[^0-9A-Za-z\n]{0,4}([A-Za-z]{1,2}\d{3,8})\b/gi },
  // Longues suites de chiffres sans libellé : 15 = ICE, 16-26 = RIB/IBAN.
  // Les montants n'atteignent jamais ces tailles ; les cellules NUMÉRIQUES
  // (montants, quantités) ne passent de toute façon jamais par ici.
  { type: "__digits__", rx: /(?<![\dA-Za-z-])\d(?:[ .\-]?\d){14,25}(?![\dA-Za-z])/g },
];

/* Code les données sensibles D'UN TEXTE (une cellule). `extra` : valeurs
   exactes supplémentaires à coder (noms propres fournis par l'utilisateur),
   chacune { value, type }. Renvoie { text, replaced, newCodes, byType }. */
export function codeDocumentText(input, book, extra) {
  let text = String(input);
  let replaced = 0;
  let newCodes = 0;
  const byType = {};
  const bump = (typeId, isNew) => {
    replaced++;
    if (isNew) newCodes++;
    const label = typeById(typeId).label;
    byType[label] = (byType[label] || 0) + 1;
  };

  // 1) Les valeurs fournies explicitement (les plus longues d'abord, pour que
  //    « Sophatel S.A » passe avant « Sophatel »).
  const extras = (extra || []).filter((e) => e && String(e.value).trim().length >= 2)
    .sort((a, b) => String(b.value).length - String(a.value).length);
  for (const e of extras) {
    const esc = String(e.value).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(esc, "gi");
    text = text.replace(rx, () => {
      const { code, isNew } = codeFor(book, e.type || "autre", String(e.value).trim());
      bump(e.type || "autre", isNew);
      return code;
    });
  }

  // 2) Le dictionnaire de motifs.
  for (const p of DOC_PATTERNS) {
    text = text.replace(p.rx, (m, g1) => {
      const raw = g1 !== undefined && typeof g1 === "string" ? g1 : m;
      let typeId = p.type;
      if (typeId === "__digits__") {
        const digits = m.replace(/[\s.\-]/g, "");
        if (digits.length === 15) typeId = "ice";
        else if (digits.length >= 16 && digits.length <= 26) typeId = "rib";
        else return m;
      }
      if (p.check && !p.check(raw)) return m;
      const { code, isNew } = codeFor(book, typeId, raw);
      bump(typeId, isNew);
      return g1 !== undefined && typeof g1 === "string" ? m.replace(g1, code) : code;
    });
  }
  return { text, replaced, newCodes, byType };
}

/* Anonymise un DOCUMENT : chaque cellule TEXTE passe par le dictionnaire ;
   les cellules numériques (montants, quantités, dates sérielles) ne sont
   JAMAIS touchées — c'est la matière de travail de l'IA. */
export function anonymizeDocument(ws, book, extra) {
  book = book || newCodebook();
  const out = {};
  for (const k of Object.keys(ws)) out[k] = ws[k];
  let replaced = 0;
  let newCodes = 0;
  let cellsTouched = 0;
  const byType = {};
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const cell = ws[addr];
    if (!cell || (cell.t !== "s" && cell.t !== "str")) continue; // numériques/bool : intacts
    const text = cellText(cell);
    if (!text.trim()) continue;
    const res = codeDocumentText(text, book, extra);
    if (res.replaced) {
      out[addr] = { t: "s", v: res.text };
      cellsTouched++;
      replaced += res.replaced;
      newCodes += res.newCodes;
      for (const k of Object.keys(res.byType)) byType[k] = (byType[k] || 0) + res.byType[k];
    }
  }
  return { ws: out, book, stats: { replaced, newCodes, reusedCells: replaced - newCodes, cellsTouched, byType } };
}

/* Remplace les codes d'une clé dans un texte (insensible à la casse).
   map : CODE (majuscules) -> valeur réelle. */
export function decodeText(input, map) {
  const codes = Object.keys(map).sort((a, b) => b.length - a.length);
  if (!codes.length) return { text: String(input), replaced: 0, used: 0 };
  const rx = new RegExp(
    "\\b(" + codes.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
    "gi"
  );
  const used = {};
  let replaced = 0;
  const out = String(input).replace(rx, (m) => {
    const v = map[m.toUpperCase()];
    if (v === undefined) return m;
    used[m.toUpperCase()] = 1;
    replaced++;
    return v;
  });
  return { text: out, replaced, used: Object.keys(used).length };
}

/* Tableau codé -> TSV (aperçu inline pour le modèle : uniquement des codes
   et des colonnes non sensibles, par construction). */
export function sheetToTsv(ws, maxRows) {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
  const rows = maxRows ? aoa.slice(0, maxRows + 1) : aoa;
  return {
    tsv: rows
      .map((row) => row.map((v) => String(v == null ? "" : v).replace(/[\t\n]/g, " ")).join("\t"))
      .join("\n"),
    totalRows: Math.max(aoa.length - 1, 0),
    shownRows: Math.max(rows.length - 1, 0),
  };
}

/* Détecte si un contenu collé est un tableau (TSV) plutôt que du texte. */
export function looksLikeTable(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return false;
  const tabs = lines.map((l) => l.split("\t").length);
  return tabs[0] >= 2 && tabs.every((n) => n === tabs[0]);
}

export { XLSX };
