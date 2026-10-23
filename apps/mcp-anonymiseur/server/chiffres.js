// ============================================================================
// CHIFFRES — le choix des nombres, colonne par colonne (v2.16).
//
// v2.2 protégeait tous les nombres d'un tableur par défaut (gabarit). La
// recette client du 23/10/2026 a tranché autrement : un montant seul n'est
// pas une donnée confidentielle — une facture, des quantités, des taux sont
// la matière de travail de l'IA. Ce qui doit rester caché, c'est la finance
// d'une personne ou d'une organisation : paie, CA, résultat, patrimoine.
//
//   auto (défaut) — chaque colonne numérique est classée d'après son en-tête :
//       les colonnes FINANCIÈRES SENSIBLES (salaire, paie, CA, résultat,
//       patrimoine, solde…) passent en gabarit, les autres (montants de
//       facture, quantités, taux, numéros, années) restent en clair. Le PLAN
//       liste chaque colonne avec son mode ; l'utilisateur corrige colonne par
//       colonne (chiffres_par_colonne) ou pour tout le fichier (chiffres).
//       Une mise en page document (pas d'en-têtes) est en clair, sauf si le
//       texte parle de paie ou de comptes : alors gabarit.
//   gabarit — chaque nombre devient une valeur FACTICE. L'IA voit la
//       structure et construit formules, tableaux croisés et graphiques ;
//       remettre_chiffres remet les vraies valeurs, sur le poste.
//   indice — un seul facteur secret par feuille : totaux, écarts et
//       proportions restent JUSTES, les niveaux sont cachés.
//   clair — les nombres réels, partout.
//
// Le réglage par défaut vient, dans l'ordre : du paramètre de l'appel, du
// réglage du dossier posé par l'appli (Hidden-Tokens/reglages.json), de la
// variable ANX_CHIFFRES, puis « auto ».
//
// Les DATES restent lisibles dans tous les modes (cellules au format date).
// La correspondance cellule → vraie valeur est gardée sur le poste, dans un
// fichier .nanomizer-chiffres-*.json (droits 600), jamais servi à l'IA.
// ============================================================================
import fs from "node:fs";
import path from "node:path";

/* Entier aléatoire dans [min, max[ par l'API Web Crypto, présente dans Node
   et dans les navigateurs : ce module sert au connecteur ET à l'appli web. */
function randomInt(min, max) {
  const span = max - min;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / span) * span;   // sans biais de modulo
  do globalThis.crypto.getRandomValues(buf); while (buf[0] >= limit);
  return min + (buf[0] % span);
}

export const NUMBER_MODES = ["auto", "gabarit", "indice", "clair"];
export const COLUMN_MODES = ["gabarit", "indice", "clair"];
export const DEFAULT_NUMBER_MODE = "auto";

export const MODE_LABEL = {
  auto: "AUTO — colonnes financières sensibles (paie, CA, résultat, patrimoine…) en gabarit, le reste en clair",
  gabarit: "GABARIT — valeurs factices : l'IA voit la structure, pas les montants",
  indice: "INDICE — un facteur secret par feuille : proportions et totaux justes, niveaux cachés",
  clair: "CLAIR — les nombres réels sont montrés à l'IA",
};
const MODE_COURT = { gabarit: "GABARIT (factice)", indice: "INDICE (facteur secret)", clair: "en clair" };

/* --------------------------------------------------------- réglage dossier - */

export const FICHIER_REGLAGES = "reglages.json";

/* Le mode par défaut du dossier : paramètre d'appel absent → reglages.json du
   sous-dossier de sortie (écrit par l'appli) → ANX_CHIFFRES → auto. Renvoie
   { mode, source }. Relu à chaque appel : un changement dans l'appli vaut
   tout de suite, sans redémarrer Claude Desktop. */
export function readNumberSetting(outdir, env = process.env) {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(outdir, FICHIER_REGLAGES), "utf8"));
    if (r && NUMBER_MODES.includes(r.chiffres)) return { mode: r.chiffres, source: "réglage du dossier, posé dans l'appli Hidden Tokens" };
  } catch {}
  const e = String(env.ANX_CHIFFRES || "").trim();
  if (NUMBER_MODES.includes(e)) return { mode: e, source: "réglage de l'extension" };
  return { mode: DEFAULT_NUMBER_MODE, source: "défaut" };
}

/* ------------------------------------------------------- classer une colonne - */

const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/* Finance d'une personne ou d'une organisation : ce qu'un cabinet ne veut pas
   montrer à une IA, même sans le nom à côté. */
const SENSIBLE_RX = /\bsalaire|\bpaie\b|\bpaye\b|remun|\bprime|\bbonus|\bca\b|chiffre.?d.?affaire|honoraire|encours|\bsolde|patrimoine|revenu|resultat|\bmarge\b|benefice|dividende|\bcapital|tresorerie|pension|retraite|cotisation|\bimpot|imposable|avoir fiscal|epargne|placement|portefeuille|\bactif|\bpassif/;
const SENSIBLE_EXACT = new Set(["brut", "net", "total brut", "total net", "net a payer", "montant brut", "montant net"]);
const TAUX_RX = /taux|%|pourcent|pct|ratio|coefficient|coef|indice|\btva\b(?!.*montant)|marge\s*%/;
const QUANTITE_RX = /quantit|\bqte\b|\bqt\b|\bnb\b|nombre|effectif|heure|\bjour|unite|volume|surface|\bm2\b|\bm²|\bkm\b|poids|duree|delai|\bage\b|kilom|litre|pieces/;
const NUMERO_RX = /\bn[°o]\b|numero|\bnum\b|\bcode\b|\bref|\bid\b|matricule|annee|exercice|\bmois\b|\bcp\b|postal|siren|siret|\bnir\b|rang|ordre|ligne|page|version/;
const MONTANT_RX = /montant|total|prix|cout|tarif|somme|valeur|\beur|€|\bmad\b|\bdhs?\b|usd|\$|\bht\b|ttc|facture|acompte|remise|frais|budget|depense|recette|paiement|versement|reglement|creance|dette|impay|\bdu\b|restant|penalit|indemnit|dommage|loyer|caution|provision|credit|debit/;

/* Renvoie { classe, libelle, sensible }. classe : sensible | montant | taux |
   quantite | numero | autre. */
export function classifyNumericHeader(header) {
  const h = fold(header);
  if (!h || /^colonne [a-z]+$/.test(h)) return { classe: "autre", libelle: "sans en-tête", sensible: false };
  if (SENSIBLE_EXACT.has(h) || SENSIBLE_RX.test(h)) return { classe: "sensible", libelle: "montant sensible", sensible: true };
  if (TAUX_RX.test(h)) return { classe: "taux", libelle: "taux", sensible: false };
  // « N° facture », « Code client », « Réf. commande » : l'en-tête COMMENCE par
  // le mot d'identifiant — c'est un numéro, même si « facture » suit.
  if (/^(?:n[°o]|no\.|numero|num|code|ref|reference|matricule|id)(?:[\s.:]|$)/.test(h)) return { classe: "numero", libelle: "numéro / année", sensible: false };
  if (NUMERO_RX.test(h) && !MONTANT_RX.test(h)) return { classe: "numero", libelle: "numéro / année", sensible: false };
  if (QUANTITE_RX.test(h) && !MONTANT_RX.test(h)) return { classe: "quantite", libelle: "quantité", sensible: false };
  if (MONTANT_RX.test(h)) return { classe: "montant", libelle: "montant", sensible: false };
  return { classe: "autre", libelle: "nombre", sensible: false };
}

/* Mise en page document (facture, courrier, bulletin) : pas d'en-têtes de
   colonnes. En auto, on regarde de quoi parle le texte. */
const DOCUMENT_SENSIBLE_RX = /salaire|paie|paye|bulletin|net a payer|remuneration|cotisation|chiffre d.affaire|bilan|compte de resultat|patrimoine|releve de compte|avis d.impo|declaration de revenu|liasse|grand livre|balance/;

export function documentLooksFinancial(ws, XLSX) {
  if (!ws || !ws["!ref"]) return false;
  const texts = [];
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const c = ws[addr];
    if (c && (c.t === "s" || c.t === "str") && c.v) texts.push(String(c.v));
    if (texts.length > 400) break;
  }
  return DOCUMENT_SENSIBLE_RX.test(fold(texts.join(" ")));
}

function isDateCell(cell, XLSX) {
  if (cell.t === "d") return true;
  return !!(cell.z && XLSX.SSF.is_date(cell.z));
}

/* Les colonnes numériques d'une feuille et le mode de chacune.
   opts : mode (auto|gabarit|indice|clair), headerRow (ligne d'en-têtes, null
   en mise en page document), parColonne ({ en-tête ou lettre → mode } : les
   corrections de l'utilisateur), libelle (fonction qui masque un en-tête
   pour l'affichage — l'en-tête brut n'est jamais montré), source (d'où vient
   le mode : affiché dans le plan).
   Renvoie { mode, source, document, colonnes: [{ c, lettre, header, libelle,
   classe, mode, cells, corrige }], parC: { c → mode } }. */
export function planNumbers(ws, XLSX, { mode = DEFAULT_NUMBER_MODE, headerRow = null, parColonne = {}, libelle = (h) => h, source = "" } = {}) {
  const plan = { mode, source, document: headerRow === null, colonnes: [], parC: {}, ignores: [] };
  if (!ws || !ws["!ref"]) return plan;
  if (!NUMBER_MODES.includes(mode)) plan.mode = mode = DEFAULT_NUMBER_MODE;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  // Cellules numériques (hors dates, hors en-têtes) par colonne.
  const perCol = new Map();
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const cell = ws[addr];
    if (!cell || cell.t !== "n" || typeof cell.v !== "number" || !Number.isFinite(cell.v) || isDateCell(cell, XLSX)) continue;
    const { r, c } = XLSX.utils.decode_cell(addr);
    if (headerRow !== null && r === headerRow) continue;
    perCol.set(c, (perCol.get(c) || 0) + 1);
  }
  if (plan.document) {
    // Pas d'en-têtes : un seul mode pour la feuille.
    const resolved = mode === "auto" ? (documentLooksFinancial(ws, XLSX) ? "gabarit" : "clair") : mode;
    for (const c of perCol.keys()) plan.parC[c] = resolved;
    plan.resolu = resolved;
    plan.cells = [...perCol.values()].reduce((a, b) => a + b, 0);
    return plan;
  }
  const corrections = new Map();
  for (const [k, v] of Object.entries(parColonne || {})) if (COLUMN_MODES.includes(v)) corrections.set(fold(k), v);
  for (const c of [...perCol.keys()].sort((a, b) => a - b)) {
    const lettre = XLSX.utils.encode_col(c);
    const header = String((ws[XLSX.utils.encode_cell({ r: headerRow, c })] || {}).v ?? "").trim() || `Colonne ${lettre}`;
    const cls = classifyNumericHeader(header);
    const shown = libelle(header);
    let m = mode === "auto" ? (cls.sensible ? "gabarit" : "clair") : mode;
    let corrige = false;
    const fix = corrections.get(fold(header)) || corrections.get(fold(shown)) || corrections.get(fold(lettre)) || corrections.get(fold(`colonne ${lettre}`));
    if (fix) { m = fix; corrige = true; }
    plan.colonnes.push({ c, lettre, header, libelle: shown, classe: cls.classe, classeLibelle: cls.libelle, mode: m, cells: perCol.get(c), corrige });
    plan.parC[c] = m;
  }
  // Une correction qui ne correspond à aucune colonne numérique : signalée.
  const known = new Set(plan.colonnes.flatMap((x) => [fold(x.header), fold(x.libelle), fold(x.lettre), fold(`colonne ${x.lettre}`)]));
  for (const k of corrections.keys()) if (!known.has(k)) plan.ignores.push(k);
  return plan;
}

/* Protège les nombres d'une feuille DÉJÀ anonymisée (texte codé), en place,
   selon un plan (planNumbers) — ou, à défaut, un mode unique.
   Renvoie { mode, cells, factor, real, fake, colonnes, clair } — real :
   { "B2": 12400, … }, fake : la valeur posée à la place (remettre_chiffres
   vérifie qu'elle est toujours là avant de la remplacer). */
export function protectNumbers(ws, XLSX, { mode = DEFAULT_NUMBER_MODE, headerRow = null, plan = null, rand = randomInt } = {}) {
  if (!plan) plan = planNumbers(ws, XLSX, { mode, headerRow });
  const out = { mode: plan.mode, source: plan.source, document: plan.document, resolu: plan.resolu, cells: 0, clair: 0, factor: null, real: {}, fake: {},
    colonnes: plan.colonnes.map((x) => ({ ...x })), ignores: plan.ignores || [] };
  if (!ws || !ws["!ref"]) return out;
  const targets = [];
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const cell = ws[addr];
    if (!cell || cell.t !== "n" || typeof cell.v !== "number" || !Number.isFinite(cell.v)) continue;
    const { r, c } = XLSX.utils.decode_cell(addr);
    if (headerRow !== null && r === headerRow) continue;
    if (isDateCell(cell, XLSX)) continue;
    const m = plan.parC[c] || (plan.mode === "auto" ? "clair" : plan.mode);
    if (m === "clair") { out.clair++; continue; }
    targets.push({ addr, m });
  }
  if (!targets.length) return out;

  const indice = targets.filter((t) => t.m === "indice");
  if (indice.length) {
    const mean = indice.reduce((s, t) => s + Math.abs(ws[t.addr].v), 0) / indice.length;
    // Facteur arrondi, puis brouillé d'au plus ±20 % : « 100 = la moyenne »
    // exactement permettrait de retrouver la moyenne à partir d'un total.
    const jitter = 0.8 + rand(0, 401) / 1000;
    out.factor = mean ? (100 / mean) * jitter : 1;
  }
  for (const { addr, m } of targets) {
    const cell = ws[addr];
    out.real[addr] = cell.v;
    let v;
    if (m === "indice") {
      v = Math.round(cell.v * out.factor * 100) / 100;
    } else {
      v = rand(1, 1000);
      if (!Number.isInteger(cell.v)) v += rand(0, 100) / 100;
    }
    // Le texte formaté (`w`) porte la VRAIE valeur (« 12 400,00 MAD ») : il
    // part ; le format (`z`) reste, pour que le gabarit ressemble au fichier.
    ws[addr] = { t: "n", v, ...(cell.z ? { z: cell.z } : {}) };
    out.fake[addr] = v;
    out.cells++;
  }
  return out;
}

/* Lignes de plan / de compte rendu, en comptes et en-têtes masqués seuls —
   jamais une valeur. `results` : les sorties de protectNumbers (une par
   feuille) ; `mode` : le mode demandé ; `source` : d'où il vient. */
export function describeNumbers(results, mode, source = "") {
  results = (results || []).filter(Boolean);
  const protected_ = results.reduce((s, r) => s + (r.cells || 0), 0);
  const clear = results.reduce((s, r) => s + (r.clair || 0), 0);
  const cols = results.flatMap((r) => r.colonnes || []);
  const docs = results.filter((r) => r.document && (r.cells || r.clair));
  const ignores = [...new Set(results.flatMap((r) => r.ignores || []))];
  const origine = source ? ` (${source})` : "";
  if (!protected_ && !clear) return "CHIFFRES : aucun nombre dans cette feuille (les dates restent lisibles).";
  const lines = [`CHIFFRES — réglage « ${mode} »${origine} : ${protected_} nombre(s) protégé(s), ${clear} en clair. Les dates restent lisibles.`];
  if (cols.length) {
    const shown = cols.slice(0, 14).map((c) =>
      `« ${c.libelle} » (${c.classeLibelle}${c.corrige ? ", corrigé" : ""}) → ${MODE_COURT[c.mode]}, ${c.cells} nombre(s)`);
    if (cols.length > 14) shown.push(`+ ${cols.length - 14} autre(s) colonne(s)`);
    lines.push("Colonnes numériques : " + shown.join(" · ") + ".");
  }
  for (const d of docs) {
    lines.push(`Mise en page document, sans en-têtes : ${d.resolu === "clair" ? "nombres en clair" : `nombres en ${MODE_COURT[d.resolu]}`}` +
      (mode === "auto" ? (d.resolu === "clair" ? " (le texte ne parle ni de paie ni de comptes)." : " (le texte parle de paie ou de comptes).") : "."));
  }
  if (ignores.length) lines.push(`⚠️ chiffres_par_colonne : ${ignores.length} clé(s) ne correspond(ent) à aucune colonne numérique (en-têtes attendus tels qu'affichés ci-dessus, ou lettres de colonnes).`);
  if (protected_) {
    lines.push("L'IA peut construire formules, tableaux croisés et graphiques sur les valeurs protégées ; remettre_chiffres y replacera les vraies valeurs, sur le poste.");
  }
  lines.push("Pour changer : chiffres_par_colonne { \"en-tête\": \"clair\" | \"gabarit\" | \"indice\" } colonne par colonne, ou chiffres: \"clair\" | \"gabarit\" | \"indice\" pour tout le fichier. Le réglage par défaut du dossier se change dans l'appli Hidden Tokens (menu du dossier → Nombres).");
  return lines.join("\n");
}
