// Factures FICTIVES au format marocain — le jeu d'essai de référence.
//
// Elles sont volontairement variées sur ce qui casse en vrai : formats de
// montants (espaces, virgules, points), mises en page (sections ÉMETTEUR/
// CLIENT ou pas), taux (20, 14, 7), et les trois pannes classiques —
// numéro absent, HT + TVA ≠ TTC, TTC manquant.
//
// ICE fictifs : aucun ne correspond à une entreprise réelle.

export const ICE_SOCIETE = "001510119000058"; // la société du dossier (le client)

/* Cas nominal, tout est propre, TVA 20 %. */
export const FACTURE_PROPRE = `
FACTURE  N° FAC-2026-042
Date : 28/07/2026     Echeance : 28/08/2026

EMETTEUR
ATLAS NEGOCE SARL
12 Rue des Oudayas, Res. Yasmine, Maarif - Casablanca
ICE : 003463957000076
IF : 65908714   |   RC : 620437

CLIENT
Menara Distribution S.A
ICE : ${ICE_SOCIETE}

Designation                      Qte     Montant HT
Fournitures de bureau              1          8 500,00
Consommables informatiques         1         12 000,00

Total HT  : 20 500,00
TVA (20%) :  4 100,00
TOTAL TTC : 24 600,00 DH

Reglement par virement.
`;

/* Même fournisseur, autre pièce : sert à vérifier la stabilité du code
   FOURN-xxx et la mémoire du dossier. TVA 14 %. */
export const FACTURE_MEME_FOURNISSEUR = `
FACTURE N° FAC-2026-051
Date : 30/07/2026

EMETTEUR
ATLAS NEGOCE SARL
ICE : 003463957000076

CLIENT
Menara Distribution S.A
ICE : ${ICE_SOCIETE}

Total HT : 10 000,00
TVA 14% : 1 400,00
Total TTC : 11 400,00
`;

/* Opérateur télécom : doit tomber sur une PROPOSITION du socle (6145),
   donc « à vérifier » tant que le cabinet ne l'a pas confirmée une fois. */
export const FACTURE_TELECOM = `
FACTURE N° 2026070033445
Date : 05/07/2026

Maroc Telecom
ICE : 000095096000034

Client : Menara Distribution S.A
ICE : ${ICE_SOCIETE}

Montant HT : 1 250,00
TVA (20%) : 250,00
Net a payer : 1 500,00 MAD
`;

/* Incohérence arithmétique : 20 500 + 4 100 = 24 600, pas 24 612.
   C'est le filet principal du produit. */
export const FACTURE_INCOHERENTE = `
FACTURE N° FAC-2026-077
Date : 12/07/2026

EMETTEUR
SOCIETE CHAOUIA SERVICES SARL
ICE : 002233445000011

CLIENT
Menara Distribution S.A
ICE : ${ICE_SOCIETE}

Total HT : 20 500,00
TVA (20%) : 4 100,00
TOTAL TTC : 24 612,00
`;

/* Aucun numéro de pièce exploitable. */
export const FACTURE_SANS_NUMERO = `
NOTE D'HONORAIRES
Date : 15/07/2026

CABINET BENNANI CONSEIL
ICE : 004455667000022

Client : Menara Distribution S.A
ICE : ${ICE_SOCIETE}

Montant HT : 5 000,00
TVA (20%) : 1 000,00
Total TTC : 6 000,00
`;

/* TTC absent : reconstitué par calcul, donc « à vérifier » (aucun
   recoupement possible). Montants au format anglais. */
export const FACTURE_SANS_TTC = `
FACTURE N° INV-2026-9012
Date : 2026-07-18

EMETTEUR
SAHARA LOGISTIQUE SARL AU
ICE : 006677889000033

CLIENT
Menara Distribution S.A
ICE : ${ICE_SOCIETE}

Total HT : 3,200.00
TVA (7%) : 224.00
`;

/* Noms de fichiers NEUTRES à dessein : les noms de fichiers, eux, remontent
   en clair dans la conversation (l'utilisateur doit pouvoir désigner une
   pièce). Les nommer d'après le fournisseur rendrait le test de la règle
   n°2 complaisant. */
export const LOT_COMPLET = {
  "piece-01.txt": FACTURE_PROPRE,
  "piece-02.txt": FACTURE_MEME_FOURNISSEUR,
  "piece-03.txt": FACTURE_TELECOM,
  "piece-04.txt": FACTURE_INCOHERENTE,
  "piece-05.txt": FACTURE_SANS_NUMERO,
  "piece-06.txt": FACTURE_SANS_TTC,
};

/* Les valeurs qui ne doivent JAMAIS apparaître dans un résultat d'outil :
   c'est le test de la règle n°2 (les tiers remontent codés). */
export const NOMS_SENSIBLES = [
  "ATLAS NEGOCE",
  "Maroc Telecom",
  "CHAOUIA SERVICES",
  "BENNANI CONSEIL",
  "SAHARA LOGISTIQUE",
  "003463957000076",
  "000095096000034",
  "002233445000011",
  "004455667000022",
  "006677889000033",
];
