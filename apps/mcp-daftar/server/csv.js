// ============================================================================
// SORTIES — trois fichiers, trois lecteurs différents. Ne pas les confondre.
//
//   journal-<période>.csv    → la MACHINE (le logiciel comptable).
//                              N'contient QUE les écritures sûres.
//                              Décimale POINT : c'est ce qu'attendent les
//                              imports, et une virgule décimale sur un
//                              séparateur point-virgule est un piège classique.
//
//   revision-<période>.csv   → L'HUMAIN, dans Excel. Toutes les pièces,
//                              nominatif, avec le statut et la raison du
//                              doute. Décimale VIRGULE + BOM, sinon Excel FR
//                              affiche « 20500 » là où il y a 205,00.
//
//   a-verifier-<période>.md  → L'HUMAIN, en lecture. Une pièce = un bloc,
//                              avec le chemin du justificatif pour l'ouvrir.
//
// Le journal et la révision divergent VOLONTAIREMENT : c'est la matérialisation
// de la règle « le doute ne sort jamais dans le fichier d'import ».
// ============================================================================

import { arrondi } from "./ecritures.js";

const BOM = "﻿";

/* Échappement CSV standard : guillemets doublés, champ encadré dès qu'il
   contient un séparateur, un guillemet ou un saut de ligne. */
export function champ(v, separateur) {
  const s = v == null ? "" : String(v);
  if (s.includes(separateur) || s.includes('"') || /[\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function nombre(v, decimal) {
  if (v == null || v === "") return "";
  const s = arrondi(v).toFixed(2);
  return decimal === "," ? s.replace(".", ",") : s;
}

export function versCsv(entetes, lignes, { separateur = ";", decimal = ".", bom = false } = {}) {
  const out = [entetes.map((e) => champ(e, separateur)).join(separateur)];
  for (const l of lignes) {
    out.push(l.map((c) => champ(typeof c === "number" ? nombre(c, decimal) : c, separateur)).join(separateur));
  }
  return (bom ? BOM : "") + out.join("\r\n") + "\r\n";
}

/* ------------------------------------------------------------- journal */

export const ENTETES_JOURNAL = [
  "Journal", "Date", "Piece", "Compte", "Libelle", "Debit", "Credit",
  "Tiers", "ICE", "TauxTVA", "Fichier",
];

/* Le fichier d'import. Une ligne d'écriture = une ligne de CSV.
   Filtre non négociable : statut === "sure". */
export function journalCsv(propositions) {
  const lignes = [];
  for (const p of propositions) {
    if (p.statut !== "sure") continue;
    for (const l of p.lignes) {
      lignes.push([
        p.journal,
        p.date || "",
        p.piece || "",
        l.compte,
        l.libelle,
        l.debit ? nombre(l.debit, ".") : "",
        l.credit ? nombre(l.credit, ".") : "",
        p.tiers,
        p.ice || "",
        p.taux != null ? String(p.taux) : "",
        p.fichier || "",
      ]);
    }
  }
  return versCsv(ENTETES_JOURNAL, lignes, { separateur: ";", decimal: ".", bom: false });
}

/* ------------------------------------------------------------ révision */

export const ENTETES_REVISION = [
  "Statut", "Fichier", "Fournisseur", "ICE", "Date", "Piece",
  "HT", "TVA", "Taux", "TTC", "Compte propose", "Origine du compte", "A verifier",
];

const ORIGINE = { dossier: "mémoire du dossier", socle: "socle cabinet (à confirmer)" };

/* Le tableau que l'humain ouvre. Nominatif, complet, y compris les pièces
   sûres — parce qu'on ne demande jamais de faire confiance sans montrer. */
export function revisionCsv(propositions) {
  const lignes = propositions.map((p) => [
    p.statut === "sure" ? "SÛRE" : "À VÉRIFIER",
    p.fichier || "",
    p.tiers,
    p.ice || "",
    p.date || "",
    p.piece || "",
    p.ht, p.tva,
    p.taux != null ? String(p.taux) + " %" : "",
    p.ttc,
    p.compteCharge || "",
    ORIGINE[p.origineCompte] || "",
    p.raisons.join(" · "),
  ]);
  return versCsv(ENTETES_REVISION, lignes, { separateur: ";", decimal: ",", bom: true });
}

/* ------------------------------------------------------ liste de travail */

/* Ce qui reste à faire, écrit pour être traité en une passe : le pourquoi
   d'abord, le geste ensuite, le chemin du justificatif à la fin. */
export function listeDeTravailMd(propositions, { dossier, periode, journalFichier }) {
  const douteuses = propositions.filter((p) => p.statut !== "sure");
  const sures = propositions.filter((p) => p.statut === "sure");

  const l = [
    `# À vérifier — ${dossier} · ${periode}`,
    "",
    `${sures.length} pièce(s) exportée(s) dans le journal, ${douteuses.length} à traiter ici.`,
    journalFichier ? `Journal importable : \`${journalFichier}\`` : "",
    "",
    "> Ces pièces ne sont **pas** dans le fichier d'import : rien de douteux n'y entre.",
    "> Corrigez ici, puis relancez l'export — les pièces réglées basculeront dans le journal.",
    "",
  ].filter((x) => x !== null);

  if (!douteuses.length) {
    l.push("✅ Rien à vérifier sur ce lot.");
    return l.join("\n") + "\n";
  }

  douteuses.forEach((p, i) => {
    l.push(`## ${i + 1}. ${p.tiers}${p.piece ? ` — facture ${p.piece}` : ""}`);
    l.push("");
    for (const r of p.raisons) l.push(`- ⚠️ ${r}`);
    l.push("");
    l.push(
      `| Date | HT | TVA | Taux | TTC | Compte |`,
      `|---|---|---|---|---|---|`,
      `| ${p.date || "?"} | ${p.ht != null ? nombre(p.ht, ",") : "?"} | ${p.tva != null ? nombre(p.tva, ",") : "?"} | ${p.taux != null ? p.taux + " %" : "?"} | ${p.ttc != null ? nombre(p.ttc, ",") : "?"} | ${p.compteCharge || "à choisir"} |`
    );
    l.push("");
    if (p.fichier) l.push(`Justificatif : \`${p.fichier}\``);
    l.push("");
  });

  return l.join("\n") + "\n";
}

/* La période d'un lot : le mois de la majorité des pièces, faute de mieux
   le mois courant. Sert à nommer les fichiers, rien d'autre. */
export function periodeDuLot(propositions, aujourdhui = null) {
  const mois = {};
  for (const p of propositions) {
    if (!p.date) continue;
    const m = p.date.slice(0, 7);
    mois[m] = (mois[m] || 0) + 1;
  }
  const trie = Object.entries(mois).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1));
  if (trie.length) return trie[0][0];
  return (aujourdhui || new Date().toISOString()).slice(0, 7);
}
