// ============================================================================
// HT-BENCH — cas écrits à la main.
//
// Pour un piège que les gabarits ne produisent pas (une tournure, une
// écriture, un faux ami). Même balisage que les gabarits :
//   [[TYPE|variante:valeur]] à coder, {{LEURRE:valeur}} à laisser lisible.
// Types et leurres : lib/types.mjs. Toutes les valeurs sont INVENTÉES —
// jamais un vrai nom, un vrai numéro, un extrait d'un vrai dossier.
// Un id par cas, stable : « <pack>/manuel/<sujet> ».
// ============================================================================

export const CAS_MANUELS = [
  {
    id: "core/manuel/sms-darija",
    pack: "core",
    note: "SMS en français-darija, minuscules, nom collé, numéro sans séparateur",
    texte: `slt c [[PERSONNE|mag-el-colle|minuscules:youssef elamrani]], rappelle moi au [[TEL|ma-mobile-national-colle:0661482937]] stp, {{MOT|darija:inchallah}} demain. sinon ecris a [[EMAIL|prenomnom-chiffres:youssef.elamrani92@example.com]]`,
  },
  {
    id: "core/manuel/nom-mot-courant",
    pack: "core",
    note: "Patronymes qui sont des mots (Rose, Petit, Pierre) à côté des mêmes mots employés comme mots",
    texte: `Mme [[PERSONNE|fr-nom-mot-courant:Rose Petit]] a planté une {{MOT:rose}} près de la {{MOT:pierre}} du portail.
M. [[PERSONNE|fr-nom-mot-courant:Pierre Olivier]] taille l'{{MOT:olivier}} chaque hiver ; c'est un {{MOT:petit}} jardin.`,
  },
  {
    id: "core/manuel/entete-majuscules",
    pack: "core",
    note: "En-tête administratif tout en majuscules, nom composé, particule et apostrophe",
    texte: `DOSSIER : [[PERSONNE|mag-el-espace|prenom-compose,nom-majuscules-avant:EL IDRISSI FATIMA-ZAHRA]]
CONJOINT : [[PERSONNE|mag-ait-apostrophe|nom-majuscules-avant:AÏT M'BAREK L'HOUCINE]]
ADRESSE : [[ADRESSE|ma-residence:RÉSIDENCE AL WAHDA, IMM. 7, APPT 12, HAY RIAD]], RABAT
CIN : [[CIN|cin-colle:BK482913]] — {{SIGLE:CNSS}} : [[CNSS|cnss-assure-9:148203917]]`,
  },
  {
    id: "core/manuel/telephones-mal-ecrits",
    pack: "core",
    note: "Téléphones écrits à la main : (0) collé, slash, espaces irréguliers",
    texte: `Joignable au [[TEL|ma-mobile-intl-zero-parenthese-colle:+212(0)661 48 29 37]], au [[TEL|ma-mobile-slash:06/61/48/29/37]] ou au [[TEL|ma-mobile-espaces-irreguliers:066 148 29 37]].
En France : [[TEL|fr-mobile-intl-irregulier:+33 612 34 56 78]]. Standard : [[TEL|ma-fixe-national-espaces:05 22 48 19 30]].`,
  },
  {
    id: "juridique-fr/manuel/leurres-seuls",
    pack: "juridique-fr",
    note: "Aucun identifiant : que des leurres juridiques (aucun code attendu)",
    texte: `Vu l'{{ARTICLE:article 1240 du Code civil}}, l'{{ARTICLE:article L. 1235-1 du Code du travail}} et l'{{ARTICLE:article 700 du Code de procédure civile}} ;
Vu l'arrêt {{ARTICLE|jurisprudence:Soc., 27 septembre 2023, n° 21-24.782}} ;
Le {{SIGLE|juridiction:Tribunal judiciaire de Paris}} a fixé l'audience au {{DATE:12 mars 2026}} ; l'indemnité est de {{MONTANT:4 350,00 €}}, outre {{MONTANT:1 500 €}} de frais.`,
  },
  {
    id: "rh-paie/manuel/leurres-paie",
    pack: "rh-paie",
    note: "Lignes de paie sans identifiant : sigles, taux, montants",
    texte: `Rubrique | Base | Taux | Montant
{{SIGLE:CNSS}} prestations sociales | {{MONTANT:6 000,00 MAD}} | 4,48 % | {{MONTANT:268,80 MAD}}
{{SIGLE:AMO}} | {{MONTANT:8 450,00 MAD}} | 2,26 % | {{MONTANT:190,97 MAD}}
{{SIGLE:IR}} | {{MONTANT:7 991,23 MAD}} | barème | {{MONTANT:1 135,12 MAD}}
Congés payés : {{MESURE:18 jours}} acquis au {{DATE:31/12/2025}}.`,
  },
  {
    id: "telecom-ma/manuel/cdr-ligne",
    pack: "telecom-ma",
    note: "Ligne de CDR collée en texte : MSISDN sans +, IMSI, IMEI, durée et volume",
    texte: `[[TEL|ma-mobile-msisdn-sans-plus:212661482937]];[[IMSI|imsi-colle:604011234598765]];[[IMEI|imei-colle:352099001761481]];voix sortant;{{MESURE:184}};{{DATE:2026-03-12}}
[[TEL|ma-mobile-msisdn-sans-plus:212707384910]];[[IMSI|imsi-colle:604029876501234]];[[IMEI|imei-colle:868512034471236]];data;{{MESURE:3600}};{{DATE:2026-03-12}}`,
  },
  {
    id: "banque-assurance/manuel/iban-dans-phrase",
    pack: "banque-assurance",
    note: "IBAN et RIB dans une phrase, avec ponctuation collée",
    texte: `Merci de verser l'indemnité de {{MONTANT:12 500,00 MAD}} sur le compte de M. [[PERSONNE|mag-ben-espace:Hamza Ben Moussa]] ([[IBAN|iban-ma-par-4:MA64 0117 8000 0012 3456 7890 1234]]), et non sur l'ancien RIB [[RIB|rib-ma-colle:011780000012345678901234]].`,
  },
  {
    id: "sante/manuel/transmission-orale",
    pack: "sante",
    note: "Transmission infirmière dictée : minuscules, prénom seul, chambre et dosage",
    texte: `transmission de nuit : patiente [[PERSONNE|mag-simple|minuscules:khadija bennani]] chambre {{MESURE:214}}, glycémie à {{MESURE:1,8 g/l}}, {{PRODUIT:insuline glargine}} {{MESURE:12 UI}} faite. sa fille [[PERSONNE|mag-simple|prenom-seul,minuscules:salma]] a appelé du [[TEL|ma-mobile-national-espaces:06 72 18 40 95]].`,
  },
  {
    id: "expertise-comptable/manuel/identifiants-entreprise",
    pack: "expertise-comptable",
    note: "Pied de facture marocain : tous les identifiants d'entreprise collés par des tirets",
    texte: `[[SOCIETE|majuscules:ARGANE NÉGOCE SARL]] — Capital {{MONTANT:100 000,00 DH}} — RC Agadir [[RC|rc-nombre:48213]] — IF [[IF|if-nombre:40192837]] — ICE [[ICE|ice-colle:002184937000052]] — Patente [[PATENTE|patente:48120937]] — {{SIGLE:CNSS}} [[CNSS|cnss-affiliation-7:8421937]]`,
  },
  // v2.28 — un cas par manque corrigé (moteur 2.28.0), avec ses leurres.
  {
    id: "core/manuel/nir-cle-tiret",
    pack: "core",
    note: "NIR dont la clé est écrite après un tiret (la clé restait en clair), Corse et né à l'étranger",
    texte: `Assurée : [[PERSONNE|fr-simple:Claire Dumas]], NIR [[NIR|nir-cle-tiret:2 92 06 13 045 318 - 65]] ; conjoint né à l'étranger, NIR [[NIR|nir-cle-tiret:1 63 11 99 213 077 - 24]].
Remboursement de {{MONTANT:45,00 €}} le {{DATE:12/03/2026}}, pour {{MESURE:12}} séances.`,
  },
  {
    id: "rh-paie/manuel/cnss-employeur",
    pack: "rh-paie",
    note: "N° d'affiliation CNSS de l'employeur (7 chiffres) annoncé avec son rôle ou « sous le n° »",
    texte: `L'employeur est affilié à la {{SIGLE:CNSS}} sous le n° [[CNSS|cnss-affiliation-7:5308817]] ; établissement de Fès : CNSS employeur [[CNSS|cnss-affiliation-7:2046613]].
Cotisations patronales : {{MONTANT:3 214,60 MAD}} au {{DATE:31/10/2026}}.`,
  },
  {
    id: "expertise-comptable/manuel/rib-par-quatre-luhn",
    pack: "expertise-comptable",
    note: "RIB et IBAN par quatre dont les seize premiers chiffres passent Luhn (pris pour une carte, la fin restait en clair)",
    texte: `Virement fournisseur sur le RIB [[RIB|rib-ma-par-4:0224 5077 0000 0007 0168 4355]] ; filiale de Lyon : IBAN [[IBAN|iban-fr-par-4:FR18 2004 1310 0605 1234 5678 941]].
Montant : {{MONTANT:18 400,00 MAD}}, compte {{COMPTE:4411}}.`,
  },
  {
    id: "juridique-fr/manuel/noms-particules",
    pack: "juridique-fr",
    note: "Patronymes derrière une particule capitalisée (« Le », « de La ») qui sont aussi des mots",
    texte: `Pour la société, son gérant M. [[PERSONNE|fr-particule|nom-seul:de La Croix]], assisté de Maître [[PERSONNE|fr-particule:Hélène Le Bon]].
Le témoin, [[PERSONNE|fr-particule:Marc Le Blanc]], confirme ; {{MOT:le blanc}} du formulaire est resté vide.`,
  },
  {
    id: "banque-assurance/manuel/ould-cheikh",
    pack: "banque-assurance",
    note: "Noms en Ould et « Cheikh » employé comme prénom ; le cheikh en titre reste lisible",
    texte: `Bénéficiaire : [[PERSONNE|mag-ould:Brahim Ould Bah]] ; mandataire : [[PERSONNE|mag-el-espace|cheikh-prenom:Cheikh El Fassi]].
Remise de chèque par [[PERSONNE|mag-simple|cheikh-prenom:Cheikh Diallo]], {{MONTANT:7 500 MAD}}, sur recommandation du {{MOT:cheikh}} de la zaouïa.`,
  },
  {
    id: "sante/manuel/motifs-dans-les-mots",
    pack: "sante",
    note: "Les libellés AMO, lot, patient dans un mot (amoxicilline, lotissement) ou devant un nom : rien de recodé, sortie décodable",
    texte: `Patient : [[PERSONNE|mag-simple:Karim Tahiri]] — IPP [[PATIENT:2026-118204]] — AMO n° [[CNSS|cnss-assure-9:162048813]]
Traitement : {{PRODUIT:amoxicilline}} {{MESURE:1 g}}, pendant {{MESURE:7 jours}}. Il vit dans un {{MOT:lotissement}} récent.
Lot n° [[CONTRAT:B2026-0417]] du vaccin.`,
  },
  {
    id: "core/manuel/prenoms-apostrophe",
    pack: "core",
    note: "Prénoms à apostrophe (M'hamed, Ma'ati, R'kia) ; les élisions autour restent lisibles",
    texte: `Reçu de [[PERSONNE|mag-simple|prenom-apostrophe:M'hamed Tazi]] et de [[PERSONNE|mag-simple|prenom-apostrophe:Ma'ati Lahlou]] la somme de {{MONTANT:300 DH}}.
{{MOT:Aujourd'hui}}, l'avocat d'{{VILLE:Agadir}} a écrit à [[PERSONNE|mag-simple|prenom-apostrophe,prenom-seul:R'kia]].`,
  },
];
