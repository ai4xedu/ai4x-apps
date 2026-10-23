// ============================================================================
// CATALOGUE — les noms partagés entre la console et le poste.
//
// Les détecteurs reprennent les préfixes du moteur du connecteur
// (../mcp-anonymiseur/server/engine.js, TYPES) : une politique ne peut citer
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

export const TYPES_REGLE = new Set(["toujours_pseudonymiser", "interdit", "detecteurs"]);
export const ALERTES_REGLE = new Set(["responsable", "admin", "aucune"]);
export const SURFACES = new Set(["claude_code", "claude_web", "claude_desktop"]);
export const CANAUX = new Set(["email", "webhook"]);
