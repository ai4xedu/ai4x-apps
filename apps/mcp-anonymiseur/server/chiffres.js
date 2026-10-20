// ============================================================================
// CHIFFRES — les montants protégés PAR DÉFAUT (v2.2).
//
// Jusqu'à la v2.1, les nombres d'un tableur passaient en clair : « c'est la
// matière de travail de l'IA ». Pour un cabinet, un chiffre d'affaires, une
// paie ou un encours sont pourtant aussi confidentiels qu'un nom. On inverse
// la charge, comme pour les noms : protégé d'office, ouvert à la demande.
//
//   gabarit (défaut) — chaque nombre devient une valeur FACTICE. L'IA voit la
//       structure (colonnes, lignes, types) et construit formules, tableaux
//       croisés et graphiques ; Nanomizer remet ensuite les vraies valeurs, sur
//       le poste, dans le classeur produit (outil remettre_chiffres).
//   indice — un seul facteur secret par feuille : totaux, écarts et
//       proportions restent JUSTES (HT + TVA = TTC tient toujours), les niveaux
//       sont cachés. Pour que l'IA puisse commenter une tendance.
//   clair — comme avant, sur demande explicite.
//
// Les DATES restent lisibles dans tous les modes (cellules au format date).
// La correspondance cellule → vraie valeur est gardée sur le poste, dans un
// fichier .nanomizer-chiffres-*.json (droits 600), jamais servi à l'IA.
// ============================================================================
import crypto from "node:crypto";

export const NUMBER_MODES = ["gabarit", "indice", "clair"];
export const DEFAULT_NUMBER_MODE = "gabarit";

export const MODE_LABEL = {
  gabarit: "GABARIT — valeurs factices : l'IA voit la structure, pas les montants",
  indice: "INDICE — un facteur secret par feuille : proportions et totaux justes, niveaux cachés",
  clair: "CLAIR — les nombres réels sont montrés à l'IA",
};

function isDateCell(cell, XLSX) {
  if (cell.t === "d") return true;
  return !!(cell.z && XLSX.SSF.is_date(cell.z));
}

/* Protège les nombres d'une feuille DÉJÀ anonymisée (texte codé), en place.
   headerRow : ligne d'en-têtes à ne pas toucher (mode tableau), ou null.
   Renvoie { mode, cells, factor, real } — real : { "B2": 12400, … }. */
export function protectNumbers(ws, XLSX, { mode = DEFAULT_NUMBER_MODE, headerRow = null, rand = crypto.randomInt } = {}) {
  const out = { mode, cells: 0, factor: null, real: {} };
  if (mode === "clair" || !ws || !ws["!ref"]) return out;
  const targets = [];
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const cell = ws[addr];
    if (!cell || cell.t !== "n" || typeof cell.v !== "number" || !Number.isFinite(cell.v)) continue;
    if (headerRow !== null && XLSX.utils.decode_cell(addr).r === headerRow) continue;
    if (isDateCell(cell, XLSX)) continue;
    targets.push(addr);
  }
  if (!targets.length) return out;

  if (mode === "indice") {
    const mean = targets.reduce((s, a) => s + Math.abs(ws[a].v), 0) / targets.length;
    // Facteur arrondi, puis brouillé d'au plus ±20 % : « 100 = la moyenne »
    // exactement permettrait de retrouver la moyenne à partir d'un total.
    const jitter = 0.8 + rand(0, 401) / 1000;
    out.factor = mean ? (100 / mean) * jitter : 1;
  }
  for (const addr of targets) {
    const cell = ws[addr];
    out.real[addr] = cell.v;
    let v;
    if (mode === "indice") {
      v = Math.round(cell.v * out.factor * 100) / 100;
    } else {
      v = rand(1, 1000);
      if (!Number.isInteger(cell.v)) v += rand(0, 100) / 100;
    }
    // Le texte formaté (`w`) porte la VRAIE valeur (« 12 400,00 MAD ») : il
    // part ; le format (`z`) reste, pour que le gabarit ressemble au fichier.
    ws[addr] = { t: "n", v, ...(cell.z ? { z: cell.z } : {}) };
    out.cells++;
  }
  return out;
}

/* Ligne de plan / de compte rendu, en comptes seuls. */
export function describeNumbers(results, mode) {
  const cells = results.reduce((s, r) => s + r.cells, 0);
  if (mode === "clair") {
    return "CHIFFRES : mode CLAIR demandé — les montants, quantités et taux réels sont montrés à l'IA.";
  }
  if (!cells) return "CHIFFRES : aucun nombre à protéger (les dates restent lisibles).";
  const next = mode === "gabarit"
    ? "L'IA peut construire formules, tableaux croisés et graphiques sur ce gabarit ; remettre_chiffres y replacera les vraies valeurs, sur le poste. Pour que l'IA commente des tendances, relance avec chiffres: \"indice\"."
    : "Les totaux et proportions calculés par l'IA restent justes à un facteur près ; remettre_chiffres rend les vraies valeurs, sur le poste.";
  return `CHIFFRES : ${cells} nombre(s) protégé(s) en mode ${MODE_LABEL[mode]}. Les dates restent lisibles. ${next}`;
}
