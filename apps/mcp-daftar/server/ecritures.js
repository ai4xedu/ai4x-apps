// ============================================================================
// ÉCRITURES — des champs extraits vers une écriture d'achat, et surtout vers
// un VERDICT : sûre, ou à vérifier.
//
// LA RÈGLE DU PRODUIT, celle dont tout le reste découle :
//
//     le doute ne sort jamais dans le fichier d'import.
//
// Une écriture manquante, le comptable la voit et la traite. Une écriture
// FAUSSE importée en silence, il la découvrira au bilan, six mois plus tard,
// et c'est nous qu'il accusera. On préfère donc une liste de travail longue
// à un journal flatteur.
//
// Corollaire assumé : au premier lot d'un dossier, presque tout part en « à
// vérifier » — la mémoire est vide. C'est normal, il faut le DIRE à
// l'utilisateur, et c'est au deuxième lot que le produit se juge.
//
// Écriture d'achat, plan comptable marocain (CGNC) :
//     débit   6xxx    charge (le compte vient de la mémoire du dossier)   HT
//     débit   34552   État — TVA récupérable sur charges                  TVA
//     crédit  4411    Fournisseurs                                        TTC
// ============================================================================

import { TAUX_TVA_MAROC } from "./extract.js";

export const COMPTE_TVA_CHARGES = "34552";
export const COMPTE_FOURNISSEUR = "4411";
export const JOURNAL_DEFAUT = "ACH";

/* Tolérance d'arrondi. Une facture à plusieurs lignes dérive de quelques
   centimes entre le total et la somme des lignes — 5 centimes couvre le cas
   réel sans laisser passer une vraie incohérence. */
export const TOLERANCE = 0.05;

export function arrondi(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/* --------------------------------------------------------- reconstitution */

/* Complète le troisième montant quand deux sont lus. Ce n'est pas de la
   devinette (c'est une addition), MAIS on perd le recoupement : la pièce
   partira en « à vérifier » avec cette raison écrite noir sur blanc. */
export function completerMontants({ ht, tva, ttc }) {
  const connus = [ht, tva, ttc].filter((v) => v != null).length;
  if (connus === 3 || connus <= 1) return { ht, tva, ttc, reconstitue: null };
  if (ttc == null) return { ht, tva, ttc: arrondi(ht + tva), reconstitue: "TTC" };
  if (tva == null) return { ht, tva: arrondi(ttc - ht), ttc, reconstitue: "TVA" };
  return { ht: arrondi(ttc - tva), tva, ttc, reconstitue: "HT" };
}

/* Le taux effectivement appliqué, déduit des montants. */
export function tauxDeduit(ht, tva) {
  if (!ht || ht <= 0 || tva == null) return null;
  return arrondi((tva / ht) * 100);
}

/* ------------------------------------------------------------- contrôles */

/* Renvoie la liste des raisons de douter. Vide = écriture sûre.
   Chaque raison est écrite pour être LUE PAR UN COMPTABLE, pas par un
   développeur : elle dit quoi regarder, pas quel test a échoué. */
export function controler(facture, resolution, { doublon = null, aujourdhui = null } = {}) {
  const raisons = [];
  const { ht, tva, ttc, reconstitue } = completerMontants(facture);

  /* --- identité de la pièce --- */
  if (!facture.fournisseur?.nom && !facture.fournisseur?.ice) {
    raisons.push("Fournisseur non identifié (ni raison sociale ni ICE lisibles)");
  }
  if (!facture.numero) raisons.push("Numéro de facture introuvable");
  if (!facture.date) {
    raisons.push("Date de facture introuvable");
  } else {
    const d = new Date(facture.date + "T00:00:00Z");
    const ref = aujourdhui ? new Date(aujourdhui + "T00:00:00Z") : new Date();
    const joursDansLeFutur = (d - ref) / 86400000;
    if (joursDansLeFutur > 30) raisons.push(`Date dans le futur (${facture.date})`);
    if (d.getUTCFullYear() < 2015) raisons.push(`Date invraisemblable (${facture.date})`);
  }

  /* --- montants --- */
  if (ht == null || tva == null || ttc == null) {
    raisons.push("Montants incomplets (HT, TVA ou TTC non lus)");
  } else {
    if (reconstitue) {
      raisons.push(`${reconstitue} reconstitué par calcul — aucun recoupement possible sur cette pièce`);
    }
    if (ttc <= 0) raisons.push("Total TTC nul ou négatif (avoir ?)");
    if (ht < 0 || tva < 0) raisons.push("Montant négatif (avoir ?)");
    const ecart = arrondi(Math.abs(ht + tva - ttc));
    if (!reconstitue && ecart > TOLERANCE) {
      raisons.push(`HT + TVA ≠ TTC (écart de ${ecart.toFixed(2)})`);
    }
    const taux = facture.taux != null ? facture.taux : tauxDeduit(ht, tva);
    if (taux != null) {
      const connu = TAUX_TVA_MAROC.some((t) => Math.abs(t - taux) < 0.11);
      if (!connu) {
        raisons.push(`Taux de TVA inhabituel (${taux}%) — plusieurs taux sur la même facture ?`);
      } else if (facture.taux != null && ht > 0) {
        const attendu = arrondi((ht * facture.taux) / 100);
        if (Math.abs(attendu - tva) > Math.max(TOLERANCE, ht * 0.001)) {
          raisons.push(`TVA incohérente avec le taux affiché (${facture.taux}% de ${ht.toFixed(2)} = ${attendu.toFixed(2)}, lu ${tva.toFixed(2)})`);
        }
      }
    }
  }

  /* --- devise --- */
  if (facture.devise && facture.devise !== "MAD") {
    raisons.push(`Facture en ${facture.devise} — conversion et cours à saisir à la main`);
  }

  /* --- compte de charge --- */
  if (!resolution?.compte) {
    raisons.push("Fournisseur inconnu de ce dossier — compte de charge à choisir");
  } else if (resolution.origine === "socle") {
    raisons.push(`Compte ${resolution.compte} proposé par le socle (${resolution.libelle}) — à confirmer une fois pour ce dossier`);
  }

  /* --- doublon --- */
  if (doublon) {
    raisons.push(`Numéro déjà passé pour ce fournisseur le ${doublon.exportLe} (TTC ${Number(doublon.ttc).toFixed(2)})`);
  }

  return raisons;
}

/* ------------------------------------------------------------- écriture */

/* La pièce comptable proposée. Elle est TOUJOURS construite, même en cas de
   doute : c'est elle qui pré-remplit la liste de travail, et une ligne
   pré-remplie qu'on corrige coûte dix fois moins qu'une ligne à taper. */
export function proposerEcriture(facture, resolution, options = {}) {
  const { journal = JOURNAL_DEFAUT, doublon = null, aujourdhui = null } = options;
  const raisons = controler(facture, resolution, { doublon, aujourdhui });
  const { ht, tva, ttc } = completerMontants(facture);

  const tiers = facture.fournisseur?.nom || facture.fournisseur?.ice || "Fournisseur non identifié";
  const libelle = [tiers, facture.numero ? `Facture ${facture.numero}` : null]
    .filter(Boolean).join(" — ").slice(0, 120);

  const lignes = [];
  if (ht != null) {
    lignes.push({
      compte: resolution?.compte || "",
      libelle,
      debit: arrondi(ht),
      credit: 0,
    });
  }
  if (tva != null && tva > 0) {
    lignes.push({
      compte: COMPTE_TVA_CHARGES,
      libelle: `${libelle} — TVA récupérable`,
      debit: arrondi(tva),
      credit: 0,
    });
  }
  if (ttc != null) {
    lignes.push({
      compte: COMPTE_FOURNISSEUR,
      libelle,
      debit: 0,
      credit: arrondi(ttc),
    });
  }

  const equilibre = arrondi(
    lignes.reduce((s, l) => s + l.debit, 0) - lignes.reduce((s, l) => s + l.credit, 0)
  );
  if (lignes.length && Math.abs(equilibre) > TOLERANCE) {
    raisons.push(`Écriture déséquilibrée de ${equilibre.toFixed(2)} — pièce à saisir à la main`);
  }

  return {
    statut: raisons.length ? "a_verifier" : "sure",
    raisons,
    journal,
    date: facture.date,
    piece: facture.numero,
    tiers,
    ice: facture.fournisseur?.ice || null,
    taux: facture.taux != null ? facture.taux : tauxDeduit(ht, tva),
    ht, tva, ttc,
    compteCharge: resolution?.compte || null,
    origineCompte: resolution?.origine || null,
    cle: resolution?.cle || null,
    fichier: facture.fichier || null,
    lignes,
  };
}

/* Le compte rendu d'un lot, en COMPTES — c'est ce qui remonte dans la
   conversation, jamais les valeurs nominatives. */
export function resumerLot(propositions) {
  const sures = propositions.filter((p) => p.statut === "sure");
  const douteuses = propositions.filter((p) => p.statut !== "sure");
  const parRaison = {};
  for (const p of douteuses) {
    // On agrège sur la nature du doute, pas sur son détail chiffré.
    for (const r of p.raisons) {
      const cle = r.split(/\s*\(|\s+—\s+/)[0].trim();
      parRaison[cle] = (parRaison[cle] || 0) + 1;
    }
  }
  return {
    total: propositions.length,
    sures: sures.length,
    aVerifier: douteuses.length,
    totalDebitSur: arrondi(sures.reduce((s, p) => s + (p.ht || 0) + (p.tva || 0), 0)),
    parRaison,
  };
}
