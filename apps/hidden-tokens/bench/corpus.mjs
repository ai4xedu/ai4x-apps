// ============================================================================
// CORPUS DU BANC D'ESSAI — documents FICTIFS, aux formats réels.
//
// Chaque document déclare sa vérité terrain :
//   secrets : { catégorie: [valeurs] } — ce qui ne doit JAMAIS être lu par l'IA ;
//   garder  : [valeurs]                 — ce qui doit rester lisible pour que
//                                         l'IA puisse travailler (montants,
//                                         dates, juridictions, articles…).
//
// Règle d'écriture : le corpus a été rédigé AVANT de lire les règles de
// détection du moteur, comme l'écrirait un cabinet — pas pour le flatter. Les
// cas difficiles connus (noms qui sont des mots, minuscules, translittérations,
// texte anglais) y sont volontairement. Toute personne, société et numéro est
// inventé ; les numéros de carte sont des numéros de TEST (clé de Luhn valide,
// aucun compte réel).
// ============================================================================

/* Complète un numéro par sa clé de Luhn — pour des cartes de test crédibles. */
function luhn(partial) {
  const d = partial.replace(/\D/g, "").split("").reverse().map(Number);
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let x = d[i];
    if (i % 2 === 0) { x *= 2; if (x > 9) x -= 9; }
    sum += x;
  }
  return partial.replace(/\D/g, "") + ((10 - (sum % 10)) % 10);
}
const spaced = (pan) => pan.replace(/(\d{4})(?=\d)/g, "$1 ");

const PAN1 = luhn("453201511283036");   // Visa (16)
const PAN2 = luhn("515599002147883");   // Mastercard (16)
const PAN3 = luhn("406010987654321");   // Visa (16)
const PAN4 = luhn("37828224631000");    // Amex (15)
const PAN5 = luhn("622126000001234");   // UnionPay (16)
const PAN6 = luhn("450875009911234");   // Visa (16)

export const CATEGORIES = {
  personne: "Noms et prénoms",
  societe: "Sociétés et raisons sociales",
  adresse: "Adresses",
  contact: "Téléphones et e-mails",
  bancaire: "IBAN / RIB",
  carte: "Numéros de carte bancaire",
  identite: "Pièces d'identité (CIN, NIR, passeport, permis)",
  entreprise: "Identifiants d'entreprise (ICE, IF, RC, CNSS, patente, SIRET)",
  dossier: "Références de dossier (RG, contrat, sinistre)",
  vehicule: "Plaques d'immatriculation",
  // v2.2 : les nombres d'un tableur sont protégés par défaut. Seuls les
  // montants ≥ 1 000 sont étiquetés : une valeur de gabarit (1 à 999,99) ne
  // peut pas tomber dessus par hasard. Les montants écrits dans un texte ou
  // un PDF restent lisibles par conception et ne sont pas comptés.
  montant: "Montants des tableurs",
};

export const DOCUMENTS = [
  // -------------------------------------------------------------- DROIT FR
  {
    file: "Conclusions prud'hommes - Garnier c. Vectura.md", kind: "md", domaine: "droit",
    text: `CONSEIL DE PRUD'HOMMES DE LYON — Section Encadrement
RG n° 24/01873

CONCLUSIONS EN DEMANDE

POUR : Madame Élodie Garnier, née le 14 mars 1986 à Villeurbanne, demeurant 27 rue Paul Bert, 69003 Lyon,
ayant pour avocat Maître Thomas Lacroix, avocat au Barreau de Lyon.

CONTRE : La société VECTURA LOGISTIQUE SAS, immatriculée au RCS de Lyon sous le n° 812 445 903, SIRET 812 445 903 00027,
dont le siège est 14 avenue Tony Garnier, 69007 Lyon, prise en la personne de son Président, M. Olivier Chambon.

PLAISE AU CONSEIL

Madame Garnier a été engagée le 2 septembre 2019 en qualité de responsable d'exploitation, statut cadre,
moyennant une rémunération brute mensuelle de 4 350 euros.

Le 11 janvier 2024, M. Chambon lui a notifié une mise à pied conservatoire, puis un licenciement pour faute grave
par lettre du 29 janvier 2024. Il lui est reproché un échange de courriels avec M. Karim Haddad, salarié d'un concurrent.

Or, l'article L. 1235-1 du Code du travail impose au juge d'apprécier la régularité de la procédure,
et la Cour de cassation (Soc., 27 septembre 2023) rappelle que la faute grave rend impossible le maintien du salarié.

Madame Garnier verse aux débats l'attestation de Mme Nadia Ferreira, sa collègue, qui confirme qu'elle n'a
transmis aucun document confidentiel.

PAR CES MOTIFS, condamner la société VECTURA LOGISTIQUE SAS à verser à Madame Garnier :
- 26 100 euros à titre de dommages et intérêts pour licenciement sans cause réelle et sérieuse ;
- 13 050 euros au titre de l'indemnité compensatrice de préavis ;
- 3 000 euros au titre de l'article 700 du Code de procédure civile.
`,
    secrets: {
      personne: ["Élodie", "Garnier", "Thomas", "Lacroix", "Olivier", "Chambon", "Karim", "Haddad", "Nadia", "Ferreira"],
      societe: ["VECTURA"],
      adresse: ["27 rue Paul Bert"],
      entreprise: ["812 445 903", "812 445 903 00027"],
      dossier: ["24/01873"],
    },
    garder: ["Conseil de prud'hommes", "L. 1235-1", "Code du travail", "Cour de cassation", "26 100 euros", "faute grave", "article 700"],
  },
  {
    file: "Assignation bail commercial Moulin.md", kind: "md", domaine: "droit",
    text: `ASSIGNATION DEVANT LE TRIBUNAL JUDICIAIRE DE BORDEAUX

L'AN DEUX MILLE VINGT-SIX ET LE DIX-HUIT MARS

À LA DEMANDE DE :
Monsieur Bernard MOULIN, retraité, demeurant 8 allée des Tilleuls, 33200 Bordeaux,
Ayant pour avocat Maître Claire Rivière.

J'AI, Maître Laurent Petit, commissaire de justice, DONNÉ ASSIGNATION À :
La SARL BOULANGERIE DU PORT, au capital de 8 000 euros, SIRET 532 118 774 00019,
représentée par sa gérante, Madame Sandrine Boulanger.

OBJET : résiliation du bail commercial du 1er juillet 2017 portant sur un local situé 3 quai de Paludate, 33800 Bordeaux.

La locataire reste devoir la somme de 18 420 euros au titre des loyers impayés d'octobre 2025 à février 2026,
malgré un commandement de payer visant la clause résolutoire délivré le 5 janvier 2026 (article L. 145-41 du Code de commerce).

Madame Boulanger a été vue par M. Moulin le 12 février : elle a reconnu la dette. Son compagnon, Henri Robin, s'est porté caution.
Contact de la gérante : 06 48 27 19 53 — sandrine.boulanger@orange.fr

PAR CES MOTIFS, constater l'acquisition de la clause résolutoire, ordonner l'expulsion et condamner la défenderesse au paiement de 18 420 euros.
`,
    secrets: {
      personne: ["Bernard", "MOULIN", "Moulin", "Claire", "Rivière", "Laurent", "Petit", "Sandrine", "Boulanger", "Henri", "Robin"],
      societe: ["BOULANGERIE DU PORT"],
      adresse: ["8 allée des Tilleuls", "3 quai de Paludate"],
      entreprise: ["532 118 774 00019"],
      contact: ["06 48 27 19 53", "sandrine.boulanger@orange.fr"],
    },
    cased: ["Moulin", "MOULIN", "Petit", "Boulanger", "Robin", "Rivière", "Claire"],
    garder: ["Tribunal judiciaire", "clause résolutoire", "L. 145-41", "Code de commerce", "18 420 euros", "bail commercial"],
  },
  {
    file: "Notes RDV client - divorce.md", kind: "md", domaine: "droit",
    text: `notes du rdv du 7 octobre — dossier divorce

reçu mme amandine roux (née perrin) avec sa sœur. mariée le 22 juin 2012 à Nantes avec m. julien roux, ingénieur chez Airbus.
deux enfants : léa (11 ans) et nathan (8 ans). elle souhaite la résidence habituelle des enfants.
patrimoine : maison au 41 boulevard Victor Hugo à Nantes, crédit restant 186 000 € au Crédit Mutuel.
NIR de la cliente : 2 86 04 44 109 237 51. son portable : 07 61 92 33 48.
le mari aurait ouvert un compte en Suisse, IBAN CH93 0076 2011 6238 5295 7.
à faire : demander les trois derniers avis d'imposition, préparer la requête (article 251 du Code civil).
`,
    secrets: {
      personne: ["amandine", "roux", "perrin", "julien", "léa", "nathan"],
      adresse: ["41 boulevard Victor Hugo"],
      identite: ["2 86 04 44 109 237 51"],
      contact: ["07 61 92 33 48"],
      bancaire: ["CH93 0076 2011 6238 5295 7"],
    },
    garder: ["résidence habituelle", "186 000 €", "article 251", "Code civil", "avis d'imposition"],
  },
  {
    file: "Mise en demeure Atlantis.pdf", kind: "pdf", domaine: "droit",
    lines: [
      "CABINET DELORME & ASSOCIES - AVOCATS",
      "Maitre Isabelle Delorme",
      "Paris, le 2 octobre 2026",
      "LETTRE RECOMMANDEE AVEC ACCUSE DE RECEPTION",
      "Societe ATLANTIS IMMOBILIER SA",
      "A l'attention de Monsieur Franck Lemaire, directeur general",
      "52 rue de Courcelles, 75008 Paris",
      "Objet : mise en demeure - contrat n. CT-2023-0457",
      "Monsieur,",
      "Je vous ecris au nom de ma cliente, Madame Hortense Vasseur,",
      "titulaire du compte FR76 1027 8060 3100 0204 5130 172.",
      "Vous restez devoir la somme de 64 800 euros au titre du contrat precite.",
      "A defaut de reglement sous huit jours, conformement a l'article 1344 du Code civil,",
      "je saisirai le Tribunal de commerce de Paris.",
      "Veuillez agreer, Monsieur, l'expression de mes salutations distinguees.",
    ],
    secrets: {
      personne: ["Isabelle", "Delorme", "Franck", "Lemaire", "Hortense", "Vasseur"],
      societe: ["ATLANTIS IMMOBILIER"],
      adresse: ["52 rue de Courcelles"],
      dossier: ["CT-2023-0457"],
      bancaire: ["FR76 1027 8060 3100 0204 5130 172"],
    },
    garder: ["mise en demeure", "64 800 euros", "article 1344", "Tribunal de commerce", "Code civil"],
  },
  {
    file: "Attestation temoin.md", kind: "md", domaine: "droit",
    text: `ATTESTATION (article 202 du Code de procédure civile)

Je soussigné, Mathieu Fontaine, né le 3 avril 1979 à Rennes, exerçant la profession de chauffeur-livreur,
demeurant 16 rue de Brest, 35000 Rennes, titulaire du passeport n° 19FV48213,
n'ayant aucun lien de parenté avec les parties,

atteste que le 14 mai 2025, vers 18 h, j'ai vu le véhicule immatriculé GH-482-KT, conduit par M. Steven Le Gall,
percuter la clôture de Mme Paulette Guillou au lieu-dit Kerlouan.

Je sais que la présente attestation est destinée à être produite en justice et qu'une fausse attestation m'expose à des sanctions pénales.
Fait à Rennes, le 20 mai 2025.
`,
    secrets: {
      personne: ["Mathieu", "Fontaine", "Steven", "Le Gall", "Paulette", "Guillou"],
      adresse: ["16 rue de Brest"],
      identite: ["19FV48213"],
      vehicule: ["GH-482-KT"],
    },
    cased: ["Fontaine"],
    garder: ["article 202", "Code de procédure civile", "sanctions pénales", "14 mai 2025"],
  },
  {
    file: "Bordereau de pieces - affaire Benjelloun.xlsx", kind: "xlsx", domaine: "droit",
    sheets: {
      "Pièces": [
        ["N°", "Pièce", "Date", "Émetteur"],
        [1, "Contrat de travail de M. Rachid Benjelloun", "2019-09-02", "SOCIETE NOVATEX"],
        [2, "Bulletins de paie 2023", "2023-12-31", "SOCIETE NOVATEX"],
        [3, "Courriel de Mme Fatima Zahra Alaoui du 4 mars 2024", "2024-03-04", "Fatima Zahra Alaoui"],
        [4, "Arrêt de travail Dr Pierre-Yves Martel", "2024-03-10", "Dr Martel"],
        [5, "Lettre de licenciement", "2024-04-02", "SOCIETE NOVATEX"],
      ],
    },
    secrets: {
      personne: ["Rachid", "Benjelloun", "Fatima Zahra", "Alaoui", "Pierre-Yves", "Martel"],
      societe: ["NOVATEX"],
    },
    garder: ["Bulletins de paie", "Lettre de licenciement", "Arrêt de travail"],
  },
  {
    file: "Client email - English.md", kind: "md", domaine: "droit",
    text: `From: Jonathan Whitaker <j.whitaker@harbourline.co.uk>
Subject: Share purchase — Harbourline Ltd

Dear Maître Lefort,

Following our call, please find the key points for the acquisition of Harbourline Ltd by our client, Mr. David Okonkwo.
The purchase price is £2,400,000, payable in two instalments. The seller, Margaret Ellison, wants a warranty cap of 30%.
Please call me on +44 7700 900 461 before Friday.

Kind regards,
Jonathan
`,
    secrets: {
      personne: ["Jonathan", "Whitaker", "Lefort", "David", "Okonkwo", "Margaret", "Ellison"],
      societe: ["Harbourline"],
      contact: ["j.whitaker@harbourline.co.uk", "+44 7700 900 461"],
    },
    garder: ["£2,400,000"],
  },

  // -------------------------------------------------------- FINANCE MAROC
  {
    file: "Facture Atlas Distribution.xlsx", kind: "xlsx", domaine: "finance",
    sheets: {
      "Facture": [
        ["", "", "", "FACTURE"],
        ["", "", "", "N° FA-2026-0912"],
        ["ÉMETTEUR", "", "", "CLIENT"],
        ["ATLAS DISTRIBUTION SARL", "", "", "Société Chérifienne de Négoce"],
        ["45, Bd Zerktouni, Casablanca", "", "", "Lot 112, Zone industrielle Sidi Ghanem, Marrakech"],
        ["ICE : 002145870000034", "", "", "ICE : 001987654000021"],
        ["IF : 40217735   |   RC : 389412 (Casablanca)   |   Patente : 34567812"],
        ["CNSS : 7845123   |   Tél : 05 22 47 18 90"],
        ["N°", "Désignation", "Qté", "Montant HT"],
        [1, "Palettes de semoule fine 25 kg", 40, 18400],
        [2, "Transport Casablanca - Marrakech", 1, 2600],
        ["", "", "Total HT", 21000],
        ["", "", "TVA (20%)", 4200],
        ["", "", "TOTAL TTC", 25200],
        ["Règlement par virement — RIB : 230 780 4512378211002345 61"],
      ],
    },
    secrets: {
      societe: ["ATLAS DISTRIBUTION", "Chérifienne de Négoce"],
      adresse: ["45, Bd Zerktouni", "Lot 112"],
      entreprise: ["002145870000034", "001987654000021", "40217735", "389412", "34567812", "7845123"],
      contact: ["05 22 47 18 90"],
      bancaire: ["230 780 4512378211002345 61"],
      dossier: ["FA-2026-0912"],
      montant: ["18400", "2600", "21000", "4200", "25200"],
    },
    garder: ["TVA", "Palettes de semoule", "Total HT"],
  },
  {
    file: "Paie octobre - salaries.xlsx", kind: "xlsx", domaine: "finance",
    sheets: {
      "Octobre 2026": [
        ["Matricule", "Nom", "Prénom", "CIN", "N° CNSS", "RIB", "Salaire brut", "Net à payer"],
        ["M-0041", "Bennani", "Youssef", "BK284519", "123456789", "011780000012345678901234", 14500, 11236],
        ["M-0042", "El Fassi", "Khadija", "AB731204", "987654321", "007640000098765432109876", 9800, 7954],
        ["M-0057", "Ait Ouahmane", "Brahim", "JE119087", "456123789", "145780000045612378945612", 6200, 5310],
        ["M-0063", "Zniber", "Salma", "X402981", "321654987", "190810000032165498732165", 21000, 15742],
      ],
    },
    secrets: {
      personne: ["Bennani", "Youssef", "El Fassi", "Khadija", "Ait Ouahmane", "Brahim", "Zniber", "Salma"],
      identite: ["BK284519", "AB731204", "JE119087", "X402981"],
      entreprise: ["123456789", "987654321", "456123789", "321654987"],
      bancaire: ["011780000012345678901234", "007640000098765432109876", "145780000045612378945612", "190810000032165498732165"],
      montant: ["14500", "11236", "9800", "7954", "6200", "5310", "15742"],
    },
    garder: ["Salaire brut", "Net à payer", "Matricule"],
  },
  {
    file: "Relance impayes clients.xlsx", kind: "xlsx", domaine: "finance",
    sheets: {
      "Impayés": [
        ["Client", "Contact", "Téléphone", "E-mail", "Montant dû (MAD)", "Échéance", "Commentaire"],
        ["Pharmacie Al Amal", "Dr Hicham Tazi", "0661 23 45 78", "pharmacie.alamal@gmail.com", 12750, "2026-08-31", "promet de payer fin du mois, rappeler hicham"],
        ["Café Les Arcades", "Mme Laila Berrada", "+212 6 62 98 12 07", "l.berrada@arcades.ma", 4300, "2026-09-15", "RAS"],
        ["Garage Moderne Souissi", "M. Omar Chraibi", "0537 77 41 26", "", 9100, "2026-07-30", "chèque impayé, voir avec Me Kettani"],
      ],
    },
    secrets: {
      societe: ["Al Amal", "Les Arcades", "Garage Moderne Souissi"],
      personne: ["Hicham", "Tazi", "Laila", "Berrada", "Omar", "Chraibi", "Kettani", "hicham"],
      contact: ["0661 23 45 78", "pharmacie.alamal@gmail.com", "+212 6 62 98 12 07", "l.berrada@arcades.ma", "0537 77 41 26"],
      montant: ["12750", "4300", "9100"],
    },
    garder: ["chèque impayé", "Montant dû"],
  },
  {
    file: "Contrat de pret - Fiduciaire.pdf", kind: "pdf", domaine: "finance",
    lines: [
      "CONTRAT DE PRET ENTRE ASSOCIES",
      "Entre les soussignes :",
      "M. Abdelilah Sekkat, titulaire de la CIN n. BE482910, demeurant 17 rue Ibn Toumert, Rabat,",
      "ci-apres le Preteur,",
      "Et la societe MAGHREB AGRO-INDUSTRIE SARL, ICE 003219874000045, RC Rabat 145782,",
      "representee par Mme Houda Lahlou, gerante, ci-apres l'Emprunteur.",
      "Le Preteur consent un pret de 850 000 MAD au taux annuel de 4,5 %,",
      "remboursable en 36 mensualites sur le compte RIB 022 810 0001234567890123 45.",
      "Le present contrat est regi par le Dahir des obligations et des contrats.",
      "Fait a Rabat, le 9 septembre 2026.",
    ],
    secrets: {
      personne: ["Abdelilah", "Sekkat", "Houda", "Lahlou"],
      identite: ["BE482910"],
      adresse: ["17 rue Ibn Toumert"],
      societe: ["MAGHREB AGRO-INDUSTRIE"],
      entreprise: ["003219874000045", "145782"],
      bancaire: ["022 810 0001234567890123 45"],
    },
    garder: ["850 000 MAD", "4,5 %", "36 mensualites", "Dahir des obligations et des contrats"],
  },
  {
    file: "Note de synthese audit - darija.md", kind: "md", domaine: "finance",
    text: `Note de synthèse — mission d'audit, exercice 2025

Client : société TISSAGE DU SOUSS SA (ICE 001452369000078), Agadir.
Interlocuteur : M. Mustapha Ouchen, DAF, joignable au 06 70 45 82 13.

1. Le compte fournisseur « Ste Ennour Textile » présente un écart non justifié de 312 450 MAD.
2. Trois virements vers le compte de Mme Rkia Idrissi (RIB 181 810 2110345678901234 77), épouse du gérant, sans pièce justificative.
3. La provision pour créances douteuses est sous-évaluée d'environ 18 %.

Hna khassna nchofo m3a si Mustapha les contrats dyal Ennour qbel l'AG.
Recommandation : constituer une provision complémentaire et régulariser avant l'assemblée générale du 30 juin.
`,
    secrets: {
      societe: ["TISSAGE DU SOUSS", "Ennour Textile", "Ennour"],
      entreprise: ["001452369000078"],
      personne: ["Mustapha", "Ouchen", "Rkia", "Idrissi"],
      contact: ["06 70 45 82 13"],
      bancaire: ["181 810 2110345678901234 77"],
    },
    garder: ["312 450 MAD", "créances douteuses", "18 %", "assemblée générale"],
  },

  // ------------------------------------------------- MONÉTIQUE / CARTES
  {
    file: "Journal transactions TPE.xlsx", kind: "xlsx", domaine: "cartes",
    sheets: {
      "Transactions": [
        ["Date", "Heure", "PAN", "Expiration", "Porteur", "Commerçant", "Montant", "Code réponse"],
        ["2026-10-01", "09:14", spaced(PAN1), "08/28", "M. Anas Bouzidi", "Marjane Californie", 1245.5, "00"],
        ["2026-10-01", "11:02", spaced(PAN2), "11/27", "Mme Ghita Benslimane", "Pharmacie Agdal", 312, "00"],
        ["2026-10-02", "18:47", PAN3, "02/29", "M. Reda Lamrani", "Station Afriquia Route d'El Jadida", 600, "51"],
        ["2026-10-03", "20:30", PAN4, "05/28", "Mr. Kevin O'Brien", "Hôtel Sofitel Tour Blanche", 4890, "00"],
        ["2026-10-03", "21:15", "4532 **** **** 7810", "", "inconnu", "Restaurant Le Cabestan", 1520, "05"],
      ],
    },
    secrets: {
      carte: [PAN1, PAN2, PAN3, PAN4, spaced(PAN1), spaced(PAN2)],
      personne: ["Anas", "Bouzidi", "Ghita", "Benslimane", "Reda", "Lamrani", "Kevin", "O'Brien"],
      montant: ["1245.5", "4890", "1520"],
    },
    garder: ["Code réponse", "Expiration"],
  },
  {
    file: "Litige chargeback - dossier CB-77812.md", kind: "md", domaine: "cartes",
    text: `Dossier de contestation n° CB-77812

Porteur : Mme Imane Chakiri, carte n° ${spaced(PAN5)}, expiration 09/27.
Le porteur conteste une transaction de 7 480,00 MAD du 12/09/2026 chez le commerçant « Electro Plus Maârif ».
Il déclare n'avoir jamais reçu le téléviseur. Le commerçant, représenté par M. Adil Fikri (adil.fikri@electroplus.ma),
produit un bon de livraison signé.

Une seconde carte au nom de son mari, Nabil Chakiri, n° ${PAN6}, a été utilisée le même jour pour 1 200 MAD.

Motif Visa : 13.1 (marchandise non reçue). Délai de réponse : 30 jours.
Décision proposée : rejet partiel, crédit provisoire de 7 480,00 MAD maintenu jusqu'à l'arbitrage.
`,
    secrets: {
      carte: [spaced(PAN5), PAN6],
      personne: ["Imane", "Chakiri", "Adil", "Fikri", "Nabil"],
      societe: ["Electro Plus"],
      contact: ["adil.fikri@electroplus.ma"],
      dossier: ["CB-77812"],
    },
    garder: ["7 480,00 MAD", "13.1", "marchandise non reçue", "30 jours"],
  },
  {
    file: "Flotte vehicules - permis chauffeurs.xlsx", kind: "xlsx", domaine: "cartes",
    sheets: {
      "Chauffeurs": [
        ["Chauffeur", "N° permis", "Catégorie", "Véhicule", "Immatriculation", "Carte carburant"],
        ["Hamid Ouazzani", "15/284917", "C", "Renault Master", "48213-B-6", PAN1.slice(0, 6) + "******" + PAN1.slice(-4)],
        ["Said Bakkali", "08/553128", "B", "Dacia Logan", "71542-A-1", PAN2.slice(0, 6) + "******" + PAN2.slice(-4)],
        ["Mounir El Khatib", "21/090855", "D", "Mercedes Sprinter", "10087-D-33", "non attribuée"],
      ],
    },
    secrets: {
      personne: ["Hamid", "Ouazzani", "Said", "Bakkali", "Mounir", "El Khatib"],
      identite: ["15/284917", "08/553128", "21/090855"],
      vehicule: ["48213-B-6", "71542-A-1", "10087-D-33"],
    },
    garder: ["Renault Master", "Catégorie", "non attribuée"],
  },
];

export const NOTE = "Toutes les personnes, sociétés et numéros de ce corpus sont fictifs.";
