// ============================================================================
// HT-BENCH — le catalogue des étiquettes.
//
// Positifs : ce qui DOIT être codé. « direct » = identifiant direct (une
// personne, un compte, une ligne) : c'est sur eux que porte la cible
// (rappel ≥ 99 % par pack) et le contrôle de non-régression de la CI.
// « prefixes » = les préfixes de code attendus ; un passage codé sous un
// autre préfixe est protégé (il compte pour le rappel) mais mal étiqueté.
//
// Leurres (hard negatives) : ce qui doit RESTER LISIBLE pour que l'IA
// travaille — montants, dates, articles de loi, sigles du lexique, mots
// courants qui ressemblent à des noms, villes.
// ============================================================================

export const POSITIFS = {
  PERSONNE:  { libelle: "Nom de personne", direct: true, prefixes: ["PRENOM", "NOM", "PERSONNE", "PERS", "CLI", "PAR"] },
  CIN:       { libelle: "CIN marocaine", direct: true, prefixes: ["CIN"] },
  NIR:       { libelle: "NIR (sécurité sociale, France)", direct: true, prefixes: ["CIN", "NIR"] },
  CNSS:      { libelle: "N° CNSS", direct: true, prefixes: ["CNSS", "ASSURE"] },
  ICE:       { libelle: "ICE", direct: true, prefixes: ["ICE"] },
  IF:        { libelle: "Identifiant fiscal (IF)", direct: true, prefixes: ["IF"] },
  RC:        { libelle: "Registre de commerce (RC)", direct: true, prefixes: ["RC"] },
  SIREN:     { libelle: "SIREN", direct: true, prefixes: ["SIREN", "SIRET", "REF"] },
  SIRET:     { libelle: "SIRET", direct: true, prefixes: ["SIRET", "SIREN", "REF"] },
  TEL:       { libelle: "Téléphone", direct: true, prefixes: ["TEL"] },
  EMAIL:     { libelle: "E-mail", direct: true, prefixes: ["EMAIL"] },
  IBAN:      { libelle: "IBAN", direct: true, prefixes: ["RIB"] },
  RIB:       { libelle: "RIB", direct: true, prefixes: ["RIB"] },
  IMEI:      { libelle: "IMEI", direct: true, prefixes: ["IMEI"] },
  IMSI:      { libelle: "IMSI", direct: true, prefixes: ["IMSI"] },
  // Indirects ou propres à un métier : mesurés, hors du contrôle de la CI.
  BIC:       { libelle: "BIC / SWIFT", direct: false, prefixes: ["BIC"] },
  ICCID:     { libelle: "ICCID (carte SIM)", direct: false, prefixes: ["ICCID"] },
  ADRESSE:   { libelle: "Adresse postale", direct: false, prefixes: ["ADRESSE"] },
  SOCIETE:   { libelle: "Société", direct: false, prefixes: ["SOCIETE", "SOC"] },
  NAISSANCE: { libelle: "Date de naissance", direct: false, prefixes: ["NAISS"] },
  PATENTE:   { libelle: "N° de patente", direct: false, prefixes: ["PATENTE"] },
  TVA:       { libelle: "N° de TVA intracommunautaire", direct: false, prefixes: ["TVA", "RIB", "REF"] },
  MATRICULE: { libelle: "Matricule salarié", direct: false, prefixes: ["MATRICULE"] },
  PATIENT:   { libelle: "N° de dossier patient / IPP", direct: false, prefixes: ["PATIENT"] },
  PRATICIEN: { libelle: "Identifiant praticien (INPE, RPPS)", direct: false, prefixes: ["PRATICIEN"] },
  POLICE:    { libelle: "N° de police d'assurance", direct: false, prefixes: ["POLICE"] },
  SINISTRE:  { libelle: "N° de sinistre", direct: false, prefixes: ["SINISTRE"] },
  FACTURE:   { libelle: "N° de facture / pièce", direct: false, prefixes: ["FACTURE", "PIECE", "REF"] },
  RG:        { libelle: "N° RG / parquet", direct: false, prefixes: ["RG", "PARQUET", "REF"] },
};

export const LEURRES = {
  MONTANT:  "Montant",
  DATE:     "Date (hors naissance)",
  ARTICLE:  "Article ou texte de loi",
  SIGLE:    "Sigle ou terme du lexique",
  MOT:      "Mot courant qui ressemble à un nom",
  VILLE:    "Ville",
  PRODUIT:  "Offre, opérateur, médicament",
  COMPTE:   "N° de compte comptable",
  MESURE:   "Durée, quantité, dosage",
};

export const PACKS = ["core", "telecom-ma", "juridique-fr", "banque-assurance", "sante", "expertise-comptable", "rh-paie"];
