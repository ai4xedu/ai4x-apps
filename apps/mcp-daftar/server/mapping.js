// ============================================================================
// MÉMOIRE — ce que Daftar apprend, et où ça vit.
//
// Trois couches, dans cet ordre de confiance :
//
//   1. le MAPPING DU DOSSIER    → le cabinet a déjà tranché pour CE client.
//                                 L'écriture sort en « sûre ».
//   2. le SOCLE CABINET         → une proposition raisonnable (« un opérateur
//                                 télécom, ça va en 6145 »). L'écriture sort
//                                 en « à vérifier » AVEC le compte pré-rempli,
//                                 et une seule confirmation la fait basculer
//                                 dans la couche 1, pour toujours.
//   3. rien                     → « à vérifier », sans compte proposé.
//
// Pourquoi le socle ne suffit jamais : le même fournisseur ne tombe pas sur
// le même compte d'un dossier à l'autre. Une proposition validée une fois
// vaut mieux qu'une affectation automatique fausse cent fois.
//
// LE CARNET DE CODES (`codes.json`) est la frontière du système. Tout ce qui
// remonte dans la conversation est codé : un tiers devient FOURN-001. Le
// tableau nominatif, lui, est écrit sur le disque. Même doctrine que
// l'Anonymiseur — Daftar n'a que des tiers à coder, donc il embarque son
// propre carnet plutôt que d'imposer un second connecteur.
// ============================================================================

import fs from "node:fs";
import path from "node:path";

/* Socle livré avec le produit : des FAMILLES de comptes du CGNC, jamais des
   sous-comptes. Le cabinet affine au premier usage — c'est justement ce
   geste qui remplit la couche 1, celle qui le retient.
   Ce n'est pas une vérité comptable, c'est un point de départ documenté. */
export const SOCLE_LIVRE = {
  version: 1,
  comptes: {
    "*telecom": { compte: "6145", libelle: "Frais postaux et télécommunications", indices: ["iam", "maroc telecom", "ittissalat", "orange", "inwi", "meditel"] },
    "*energie": { compte: "6125", libelle: "Achats non stockés (eau, électricité)", indices: ["lydec", "redal", "onee", "one ", "amendis", "radeema", "radeef", "ramsa"] },
    "*honoraires": { compte: "6136", libelle: "Rémunérations d'intermédiaires et honoraires", indices: ["avocat", "notaire", "huissier", "expert comptable", "expert-comptable", "fiduciaire", "conseil juridique", "commissaire aux comptes"] },
    "*loyer": { compte: "6131", libelle: "Locations et charges locatives", indices: ["loyer", "location bureau", "bail", "immobili"] },
    "*transport": { compte: "6142", libelle: "Transports", indices: ["dhl", "chronopost", "amana", "ctm", "transit", "messagerie", "fedex", "ups "] },
    "*assurance": { compte: "6134", libelle: "Primes d'assurances", indices: ["assurance", "assurances", "wafa assurance", "axa", "saham", "rma", "atlanta", "sanad"] },
    "*banque": { compte: "6147", libelle: "Services bancaires", indices: ["agios", "commission bancaire", "frais bancaires"] },
  },
};

/* --------------------------------------------------------------- chemins */

export function slugifier(nom) {
  return String(nom || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 60) || "dossier";
}

export function cheminsDossier(racine, nomDossier) {
  const slug = slugifier(nomDossier);
  const base = path.join(racine, "dossiers", slug);
  return {
    slug,
    base,
    fiche: path.join(base, "dossier.json"),
    mapping: path.join(base, "mapping.json"),
    codes: path.join(base, "codes.json"),
    historique: path.join(base, "historique.json"),
  };
}

function lireJson(fichier, defaut) {
  try {
    const v = JSON.parse(fs.readFileSync(fichier, "utf8"));
    return v && typeof v === "object" ? v : defaut;
  } catch { return defaut; }
}

function ecrireJson(fichier, valeur) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  fs.writeFileSync(fichier, JSON.stringify(valeur, null, 2), "utf8");
}

/* ------------------------------------------------------------------ clés */

/* La clé d'un tiers. L'ICE d'abord : il est stable, unique et il survit à
   une raison sociale mal lue (« ATLAS NEGOCE » vs « Atlas Négoce S.A.R.L »).
   Sans ICE, on retombe sur le nom normalisé — moins fiable, donc à ne
   jamais utiliser pour affirmer, seulement pour proposer. */
export function cleFournisseur({ nom = null, ice = null } = {}) {
  const i = String(ice || "").replace(/\D/g, "");
  if (i.length === 15) return `ice:${i}`;
  const n = String(nom || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return n ? `nom:${n}` : null;
}

/* --------------------------------------------------------------- socle */

export function chargerSocle(racine) {
  const fichier = path.join(racine, "socle-cabinet.json");
  const perso = lireJson(fichier, null);
  if (!perso) return JSON.parse(JSON.stringify(SOCLE_LIVRE));
  return { version: perso.version || 1, comptes: { ...SOCLE_LIVRE.comptes, ...(perso.comptes || {}) } };
}

export function ecrireSocle(racine, socle) {
  ecrireJson(path.join(racine, "socle-cabinet.json"), socle);
}

/* Cherche une proposition dans le socle : correspondance exacte de clé, ou
   un indice contenu dans la raison sociale. */
export function chercherSocle(socle, { nom = null, ice = null } = {}) {
  const cle = cleFournisseur({ nom, ice });
  if (cle && socle.comptes[cle]) return { ...socle.comptes[cle], regle: cle };

  const n = String(nom || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!n) return null;
  for (const [regle, def] of Object.entries(socle.comptes)) {
    for (const indice of def.indices || []) {
      if (n.includes(indice)) return { ...def, regle };
    }
  }
  return null;
}

/* -------------------------------------------------------------- dossier */

export function chargerDossier(racine, nomDossier) {
  const c = cheminsDossier(racine, nomDossier);
  return {
    ...c,
    fiche: lireJson(c.fiche, { nom: nomDossier, ice: null, journal: "ACH", cree: null }),
    mapping: lireJson(c.mapping, { comptes: {} }),
    codes: lireJson(c.codes, { compteur: 0, parCle: {}, entrees: [] }),
    historique: lireJson(c.historique, { pieces: [] }),
    chemins: c,
  };
}

export function sauverDossier(d) {
  ecrireJson(d.chemins.fiche, d.fiche);
  ecrireJson(d.chemins.mapping, d.mapping);
  ecrireJson(d.chemins.codes, d.codes);
  ecrireJson(d.chemins.historique, d.historique);
}

/* Résout le compte de charge d'un fournisseur. C'est LA fonction qui décide
   si une pièce part en « sûre » ou en « à vérifier ». */
export function resoudreCompte({ nom, ice }, dossier, socle) {
  const cle = cleFournisseur({ nom, ice });
  if (cle && dossier.mapping.comptes[cle]) {
    const e = dossier.mapping.comptes[cle];
    return { compte: e.compte, libelle: e.libelle || null, origine: "dossier", cle };
  }
  // Un fournisseur connu par son ICE peut avoir été appris sous son nom
  // (ou l'inverse) : on tente la seconde clé avant d'abandonner.
  const alt = ice ? cleFournisseur({ nom }) : null;
  if (alt && dossier.mapping.comptes[alt]) {
    const e = dossier.mapping.comptes[alt];
    // On renvoie TOUJOURS la clé primaire : c'est elle qui sert d'identité de
    // la pièce (historique, doublons). Renvoyer la clé de repli ferait rater
    // un doublon dès qu'un fournisseur a été appris sous son nom.
    return { compte: e.compte, libelle: e.libelle || null, origine: "dossier", cle, cleTrouvee: alt };
  }
  const prop = chercherSocle(socle, { nom, ice });
  if (prop) return { compte: prop.compte, libelle: prop.libelle, origine: "socle", cle, regle: prop.regle };
  return { compte: null, libelle: null, origine: null, cle };
}

/* Apprend (ou corrige) l'affectation d'un fournisseur pour CE dossier. */
export function apprendreCompte(dossier, { nom, ice, compte, libelle = null }) {
  const cle = cleFournisseur({ nom, ice });
  if (!cle) throw new Error("Impossible d'apprendre : ni ICE ni raison sociale.");
  if (!/^\d{4,10}$/.test(String(compte))) {
    throw new Error(`Compte « ${compte} » invalide : attendu 4 à 10 chiffres (plan comptable marocain).`);
  }
  dossier.mapping.comptes[cle] = {
    compte: String(compte),
    libelle: libelle || nom || null,
    nom: nom || null,
    ice: ice || null,
    apprisLe: new Date().toISOString().slice(0, 10),
  };
  return cle;
}

/* ------------------------------------------------- carnet de codes (chat) */

/* Le code stable d'un tiers. Même tiers = même code, d'un lot à l'autre :
   sans ça, l'utilisateur ne pourrait pas dire « FOURN-002 va en 61325 »
   d'une conversation à la suivante. */
export function codeTiers(codes, { nom, ice }) {
  const cle = cleFournisseur({ nom, ice });
  if (!cle) return "FOURN-000";
  if (codes.parCle[cle]) return codes.parCle[cle];
  codes.compteur += 1;
  const code = `FOURN-${String(codes.compteur).padStart(3, "0")}`;
  codes.parCle[cle] = code;
  codes.entrees.push({ code, cle, nom: nom || null, ice: ice || null });
  return code;
}

/* L'inverse : « FOURN-002 » → le tiers réel. Résolu LOCALEMENT, jamais dans
   la conversation — c'est ce qui permet à l'utilisateur de piloter par code. */
export function resoudreCode(codes, code) {
  const c = String(code || "").trim().toUpperCase();
  const e = codes.entrees.find((x) => x.code === c);
  return e ? { nom: e.nom, ice: e.ice, cle: e.cle } : null;
}

/* -------------------------------------------------------------- doublons */

/* Une pièce déjà exportée pour ce dossier ? On compare le tiers ET le
   numéro : c'est la signature d'une facture, et c'est aussi la faute de
   saisie la plus coûteuse à retrouver après coup. */
export function dejaPassee(historique, { cle, numero }) {
  if (!cle || !numero) return null;
  const n = String(numero).toUpperCase();
  return historique.pieces.find((p) => p.cle === cle && String(p.numero).toUpperCase() === n) || null;
}

export function enregistrerPieces(historique, pieces) {
  const stamp = new Date().toISOString().slice(0, 10);
  for (const p of pieces) {
    historique.pieces.push({ cle: p.cle, numero: p.numero, ttc: p.ttc, date: p.date, exportLe: stamp });
  }
  return historique;
}
