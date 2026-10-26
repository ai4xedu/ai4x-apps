// ============================================================================
// CATALOGUE — les noms partagés entre la console et le poste.
//
// Les détecteurs reprennent les préfixes du moteur du connecteur
// (../hidden-tokens/server/engine.js, TYPES) : une politique ne peut citer
// qu'un détecteur que le moteur sait faire tourner. test/catalogue.test.js
// échoue si les deux listes divergent.
// ============================================================================

export const DETECTEURS = {
  PRENOM: "Prénom",
  NOM: "Nom",
  PERSONNE: "Nom complet",
  CIN: "CIN / pièce d'identité",
  EMAIL: "Email",
  TEL: "Téléphone",
  RIB: "Compte bancaire (RIB / IBAN)",
  CARTE: "Carte bancaire",
  PERMIS: "Permis de conduire",
  IMMAT: "Immatriculation (véhicule)",
  NAISS: "Date de naissance",
  ADRESSE: "Adresse",
  SOCIETE: "Société / employeur",
  ICE: "ICE",
  IF: "Identifiant fiscal (IF)",
  RC: "Registre du commerce (RC)",
  CNSS: "CNSS",
  PATENTE: "Patente",
  REF: "Référence / n° de dossier",
  LIEN: "Lien / site web",
  LIEU: "Lieu (ville)",
  CODE: "Autre donnée sensible",
};

/* Packs métier livrés avec le connecteur (apps/hidden-tokens/packs/*.json,
   SPEC-PACKS-METIER). La console n'en connaît que l'identité : le poste
   développe depuis ses propres fichiers. test/catalogue.test.js échoue si la
   liste diverge des fichiers livrés. */
export const PACKS = {
  "telecom-ma": { nom: "Télécom — opérateur marocain", depuis: "2.21.0", description: "IMSI, IMEI, ICCID, MSISDN international, adresse MAC, PUK/PIN annoncés ; opérateurs et vocabulaire des offres en clair." },
  "juridique-fr": { nom: "Juridique — cabinet d'avocats, France", depuis: "2.21.0", description: "SIRET, SIREN annoncé, n° RG, n° de parquet annoncé, n° de pourvoi ; juridictions, codes et sources de droit en clair." },
  "banque-assurance": { nom: "Banque et assurance", depuis: "2.21.0", description: "IBAN tous pays (clé vérifiée, code RIB), BIC, n° de police, de sinistre et de chèque annoncés ; régulateurs, banques, assureurs et vocabulaire des contrats en clair." },
  "sante": { nom: "Santé — soins, laboratoires, assurance maladie", depuis: "2.22.0", description: "N° de dossier patient, d'assuré (AMO, CNOPS, sécurité sociale), de praticien (INPE, RPPS, ADELI), de lot ; spécialités, examens, médicaments courants et organismes en clair." },
  "expertise-comptable": { nom: "Expertise comptable — Maroc et France", depuis: "2.22.0", description: "N° de facture, de pièce, TVA intracommunautaire, déclarations DGI ; plan comptable, impôts, administrations et logiciels en clair ; montants selon le réglage Nombres." },
  "rh-paie": { nom: "RH et paie", depuis: "2.22.0", description: "Matricule, badge, contrat de travail ; postes, droit du travail, éléments de paie et organismes en clair ; salaires selon le réglage Nombres." },
  "notariat-ma": { nom: "Notariat — étude de notaire, Maroc", depuis: "2.24.0", description: "N° de titre foncier (indice de conservation compris), de réquisition d'immatriculation, de minute, de répertoire, d'acte adoulaire annoncés, nom de la propriété ; conservation foncière, droits réels, succession et fiscalité de l'acte en clair." },
};

/* Plancher éditeur (invariant 6) : toujours actifs, l'admin ne peut pas les
   retirer — seulement en ajouter d'autres. */
export const PLANCHER = new Set(["PRENOM", "NOM", "PERSONNE", "EMAIL", "TEL", "ADRESSE"]);

/* Catégories des règles « toujours_pseudonymiser » → préfixe du code produit
   par le poste (CLIENT → CLI-001). */
export const CATEGORIES = {
  CLIENT: "CLI",
  PARTIE: "PAR",
  PERSONNE: "PERS",
  SOCIETE: "SOC",
  DOSSIER: "DOS",
  PROJET: "PROJ",
};

// v2.18 (SPEC-REGLES-ORGANISATION.md) : « motif » et « laisser_en_clair ».
export const TYPES_REGLE = new Set(["toujours_pseudonymiser", "interdit", "detecteurs", "motif", "laisser_en_clair"]);

/* Préfixes qu'une catégorie MAISON (règle avec `prefixe`) ne peut pas
   prendre : les détecteurs, les catégories du catalogue, et ce que le moteur
   réserve par ailleurs (mêmes valeurs que regles.js côté poste). */
export const PREFIXES_RESERVES_FIXES = ["INTERDIT", "LIEU", "CODE", "MASQUE", "F", "X", "HT", "TTC", "ID", "N"];
export function prefixesReserves() {
  return new Set([...Object.keys(DETECTEURS), ...Object.values(CATEGORIES), ...PREFIXES_RESERVES_FIXES]);
}
export const ALERTES_REGLE = new Set(["responsable", "admin", "aucune"]);
export const SURFACES = new Set(["claude_code", "claude_web", "claude_desktop"]);
export const CANAUX = new Set(["email", "webhook"]);
