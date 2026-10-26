// ============================================================================
// HT-BENCH — noms SYNTHÉTIQUES : prénoms et noms de famille courants, tirés
// et recombinés au hasard. Aucune personne réelle n'est visée : les listes
// sont des patronymes fréquents (Maroc, Maghreb, France), jamais un annuaire,
// et la combinaison prénom + nom est aléatoire.
//
// Le banc mesure les écritures latines du Maghreb, là où les outils
// américains sont faibles : particules (Ben, El, Aït, Ould, Bent), noms et
// prénoms composés (Fatima-Zahra, Abd El Kader), apostrophes (M'hamed,
// Aït M’Barek), translittérations multiples (Mohamed / Mohammed / Mhamed).
// Chaque générateur rend { valeur, variante, traits } : la variante est la
// forme du nom (mag-ben-espace…), les traits ce qui s'y ajoute (prénom composé,
// nom en majuscules, minuscules d'une transcription, nom seul).
// ============================================================================

export const PRENOMS_MA = [
  "Mohamed", "Mohammed", "Mohammad", "Ahmed", "Ahmad", "Youssef", "Yousef", "Youssouf", "Hamza", "Ayoub", "Hicham",
  "Rachid", "Said", "Saïd", "Driss", "Brahim", "Lahcen", "Mustapha", "Omar", "Othmane", "Achraf", "Anas", "Ilyas",
  "Reda", "Karim", "Nabil", "Jamal", "Aziz", "Hassan", "Yassine", "Mehdi", "Amine", "Badr", "Tarik", "Soufiane",
  "Zakaria", "Bilal", "Abdellah", "Abderrahim", "Abdelaziz", "Abdelkrim", "Noureddine", "Khalid", "Adil", "Hakim",
  "Imane", "Meryem", "Maryam", "Salma", "Nadia", "Samira", "Rachida", "Zineb", "Houda", "Siham", "Loubna", "Ghizlane",
  "Kawtar", "Soukaina", "Hasna", "Malika", "Naima", "Latifa", "Hafsa", "Wiam", "Chaimae", "Oumaima", "Khadija",
  "Asmae", "Btissam", "Hanane", "Ilham", "Jamila", "Karima", "Mounia", "Nawal", "Sanae", "Yasmine", "Zahra",
];
// Algérie, Tunisie, Mauritanie : d'autres translittérations.
export const PRENOMS_MAGHREB = [
  "Mohand", "Lakhdar", "Djamel", "Nacer", "Slimane", "Kamel", "Mounir", "Fethi", "Hédi", "Lotfi", "Chokri", "Sami",
  "Mokhtar", "Abdelhamid", "Sidi", "Cheikh", "Leïla", "Sonia", "Amel", "Wassila", "Nesrine", "Ines", "Khadidja",
  "Aïcha", "Fatma", "Mariem", "Emna", "Rim", "Souad",
];
export const PRENOMS_COMPOSES = [
  "Fatima-Zahra", "Fatima Zahra", "Fatimazahra", "Fatim-Zahra", "Mohamed Amine", "Mohamed-Amine", "Mohamed Ali",
  "Abd El Kader", "Abdel-Kader", "Abdelkader", "Abd-Errahmane", "Abd El Majid", "Sidi Mohamed", "Moulay Ahmed",
  "Lalla Meryem", "Nour El Houda", "Nour-El-Houda", "Saad Eddine", "Salah-Eddine", "Salaheddine", "Kamal Eddine",
  "Fatima Ezzahra", "Oum Keltoum", "Oum-Kalthoum",
];
export const PRENOMS_APOSTROPHE = ["M'hamed", "M’hamed", "M'Barek", "M’barek", "L'Houcine", "L’houcine", "M'Hamed", "Ma'ati", "R'kia", "M'barka"];

export const NOMS_MA = [
  "Alaoui", "Benjelloun", "Bennani", "Tazi", "Berrada", "Chraibi", "Lahlou", "Sqalli", "Kettani", "Idrissi", "Amrani",
  "Ouazzani", "Benkirane", "Bensouda", "Belhaj", "Bouzid", "Boukhari", "Bouchentouf", "Benabdallah", "Lamrani",
  "Zeroual", "Mansouri", "Haddad", "Cherkaoui", "Chafik", "Rifi", "Daoudi", "Naciri", "Skalli", "Tahiri", "Filali",
  "Belkadi", "Ziani", "Benmoussa", "Hajji", "Ouardighi", "Kabbaj", "Laraki", "Guessous", "Sebti", "Bekkali", "Mekouar",
  "Bouhaddou", "Ouhmad", "Oubaha", "Ouchen", "Amzil", "Akdim", "Boutaleb", "Lazrak", "Saadi", "Talbi", "Moujahid",
  "Rahmouni", "Benchekroun", "Tounsi", "Ghazali", "Hilali", "Jebli", "Kadiri", "Lamghari", "Mernissi", "Nejjar",
  "Ouali", "Qadiri", "Raji", "Semlali", "Touzani", "Wahbi", "Yacoubi", "Zemmouri",
];
export const NOMS_MAGHREB = [
  "Gharbi", "Jaziri", "Hammami", "Belkacem", "Meziane", "Saidi", "Brahimi", "Hamidi", "Khelifi", "Mebarki", "Bouaziz",
  "Chaabane", "Djebbar", "Ferhat", "Guerrouj", "Hadjadj", "Kaci", "Laribi", "Mokrani", "Rezgui", "Slimani", "Toumi",
];
// Les racines qui prennent une particule : El Amrani, Ben Salah, Aït Lahcen…
export const RACINES_EL = ["Amrani", "Idrissi", "Alaoui", "Fassi", "Mansouri", "Hajji", "Ouardi", "Kadiri", "Ghazi", "Moussaoui", "Khattabi", "Azhari", "Badaoui", "Yacoubi", "Haouari"];
export const RACINES_BEN = ["Salah", "Amor", "Youssef", "Abdellah", "Said", "Hammou", "Brahim", "Moussa", "Kirane", "Ali", "Jelloun", "Chekroun", "Driss", "Aissa", "Omar"];
export const RACINES_AIT = ["Lahcen", "Oumghar", "Baha", "Ouahmane", "Benhaddou", "Taleb", "Brahim", "Ali", "Hammou", "Melloul", "Ourir", "Said", "Mbarek", "Bouhou", "Idir"];
export const RACINES_OULD = ["Ahmed", "Cheikh", "Mohamed", "Sidi", "Abdallah", "Beyrouk", "Bah", "Hamoud"];
export const NOMS_DOUBLES = ["Fassi-Fihri", "Alaoui Mdaghri", "Tazi-Mezalek", "Benjelloun-Touimi", "Sqalli Houssaini", "Alami-Merrouni", "Idrissi Kaitouni", "Ouazzani-Chahdi"];

export const PRENOMS_FR = [
  "Élodie", "Thomas", "Camille", "Julien", "Mathilde", "Antoine", "Chloé", "Nicolas", "Pauline", "Guillaume", "Céline",
  "Sébastien", "Laure", "François", "Hélène", "Benoît", "Gaëlle", "Loïc", "Maëlle", "Inès", "Léa", "Hugo", "Lucas",
  "Manon", "Sophie", "Margaux", "Clément", "Victor", "Agnès", "Solène", "Arnaud", "Bérénice", "Damien", "Élise",
  "Fabien", "Géraldine", "Hervé", "Isabelle", "Jérôme", "Karine", "Ludovic", "Marion", "Noémie", "Pascal", "Romain",
];
export const PRENOMS_FR_COMPOSES = ["Jean-Baptiste", "Marie-Claire", "Anne-Sophie", "Pierre-Yves", "Jean-Michel", "Marie-Hélène", "Jean-François", "Anne-Laure", "Paul-Henri", "Marie-Ange"];
export const NOMS_FR = [
  "Martin", "Bernard", "Dubois", "Robert", "Richard", "Durand", "Leroy", "Moreau", "Laurent", "Lefebvre", "Garcia",
  "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "Mercier", "Dupont", "Lambert", "Bonnet", "Legrand",
  "Garnier", "Faure", "Rousseau", "Guérin", "Muller", "Roussel", "Perrin", "Morin", "Gauthier", "Dumont", "Fontaine",
  "Chevalier", "Masson", "Lemaire", "Duval", "Gautier", "Meunier", "Marchand", "Dufour", "Blanchard", "Barbier",
  "Dumas", "Brunet", "Schmitt", "Leroux", "Renard", "Rolland", "Caron", "Aubert", "Giraud", "Leclerc", "Vidal",
  "Bourgeois", "Renaud", "Lemoine", "Picard", "Gaillard", "Lacroix", "Fabre", "Dupuis", "Hubert", "Guillot", "Rivière",
  "Lecomte", "Fleury", "Deschamps", "Carpentier", "Maillard", "Aubry", "Vasseur", "Jacquet", "Prévost", "Poirier",
  "Charpentier", "Royer", "Huet", "Dupuy", "Perrot", "Guyot", "Cousin", "Chambon", "Lefort", "Marchal", "Courtois",
];
// Patronymes qui sont aussi des mots courants : le piège inverse des
// leurres (« la pierre », « un olivier »).
export const NOMS_FR_MOTS = ["Petit", "Blanc", "Brun", "Boulanger", "Rose", "Olivier", "Pierre", "Lebrun", "Marin", "Noël", "Bonheur", "Mouton", "Lenoir", "Marchand", "Meunier", "Chevalier"];
export const NOMS_FR_PARTICULES = ["de La Fontaine", "Le Gall", "Le Goff", "d'Aubigny", "d’Ornano", "de Villiers", "du Plessis", "Le Roux", "de Saint-Exupéry", "D'Almeida", "Da Silva", "Saint-Martin", "Des Roches"];

/* Les mots qui peuvent rester en clair dans un nom sans rien révéler : on ne
   les exige pas codés (Ben, El, Aït…) — le reste du nom, si. */
export const PARTICULES = new Set([
  "ben", "bent", "bin", "ibn", "el", "al", "ait", "aït", "ould", "ou", "bou", "abou", "abu", "sidi", "moulay", "lalla",
  "de", "du", "des", "la", "le", "d", "l", "da", "dos", "van", "von", "saint", "m", "eddine", "ezzahra",
]);

const MAJ = (s) => s.toLocaleUpperCase("fr");

/* Le nom de famille marocain / maghrébin, avec sa variante d'écriture. */
function nomMaghreb(h) {
  const r = h.reel();
  if (r < 0.32) return { nom: h.choix(h.pile(0.75) ? NOMS_MA : NOMS_MAGHREB), forme: "simple" };
  if (r < 0.48) {
    const x = h.choix(RACINES_EL);
    return h.choix([
      { nom: `El ${x}`, forme: "el-espace" }, { nom: `El ${x}`, forme: "el-espace" },
      { nom: `El-${x}`, forme: "el-tiret" }, { nom: `El${x.toLowerCase()}`, forme: "el-colle" },
      { nom: `Al ${x}`, forme: "al-espace" },
    ]);
  }
  if (r < 0.63) {
    const x = h.choix(RACINES_BEN);
    return h.choix([
      { nom: `Ben ${x}`, forme: "ben-espace" }, { nom: `Ben ${x}`, forme: "ben-espace" },
      { nom: `Ben-${x}`, forme: "ben-tiret" }, { nom: `Ben${x.toLowerCase()}`, forme: "ben-colle" },
    ]);
  }
  if (r < 0.80) {
    const x = h.choix(RACINES_AIT);
    return h.choix([
      { nom: `Ait ${x}`, forme: "ait-espace" }, { nom: `Aït ${x}`, forme: "ait-trema" },
      { nom: `Ait-${x}`, forme: "ait-tiret" }, { nom: `Aït-${x}`, forme: "ait-tiret" },
      { nom: `Ait ${x === "Mbarek" ? "M'Barek" : x}`, forme: x === "Mbarek" ? "ait-apostrophe" : "ait-espace" },
      { nom: `Aït M’Barek`, forme: "ait-apostrophe" },
    ]);
  }
  if (r < 0.87) return { nom: `Ould ${h.choix(RACINES_OULD)}`, forme: "ould" };
  return { nom: h.choix(NOMS_DOUBLES), forme: "double" };
}

function prenomMaghreb(h) {
  const r = h.reel();
  if (r < 0.62) return { prenom: h.choix(PRENOMS_MA), forme: "" };
  if (r < 0.74) return { prenom: h.choix(PRENOMS_MAGHREB), forme: "" };
  if (r < 0.90) return { prenom: h.choix(PRENOMS_COMPOSES), forme: "prenom-compose" };
  return { prenom: h.choix(PRENOMS_APOSTROPHE), forme: "prenom-apostrophe" };
}

/* Un nom complet maghrébin. ordre : « prenom-nom » (courrier),
   « NOM-prenom » (pièce administrative), « bas » (transcription). */
export function personneMaghreb(h, { ordre = "auto" } = {}) {
  const p = prenomMaghreb(h);
  const n = nomMaghreb(h);
  const o = ordre === "auto" ? h.choix(["prenom-nom", "prenom-nom", "prenom-nom", "NOM-prenom", "prenom-NOM"]) : ordre;
  let valeur;
  if (o === "NOM-prenom") valeur = `${MAJ(n.nom)} ${p.prenom}`;
  else if (o === "prenom-NOM") valeur = `${p.prenom} ${MAJ(n.nom)}`;
  else if (o === "bas") valeur = `${p.prenom} ${n.nom}`.toLowerCase();
  else valeur = `${p.prenom} ${n.nom}`;
  const traits = [p.forme, { "NOM-prenom": "nom-majuscules-avant", "prenom-NOM": "nom-majuscules", bas: "minuscules" }[o]].filter(Boolean);
  const variante = `mag-${n.forme}`;
  return { valeur, variante, traits, nom: n.nom, prenom: p.prenom };
}

export function personneFr(h, { ordre = "auto" } = {}) {
  const r = h.reel();
  const prenom = r < 0.18 ? h.choix(PRENOMS_FR_COMPOSES) : h.choix(PRENOMS_FR);
  const s = h.reel();
  const [nom, forme] = s < 0.68 ? [h.choix(NOMS_FR), "simple"] : s < 0.84 ? [h.choix(NOMS_FR_PARTICULES), "particule"] : [h.choix(NOMS_FR_MOTS), "nom-mot-courant"];
  const o = ordre === "auto" ? h.choix(["prenom-nom", "prenom-nom", "prenom-nom", "NOM-prenom"]) : ordre;
  const valeur = o === "NOM-prenom" ? `${MAJ(nom)} ${prenom}` : o === "bas" ? `${prenom} ${nom}`.toLowerCase() : `${prenom} ${nom}`;
  const traits = [r < 0.18 ? "prenom-compose" : "", { "NOM-prenom": "nom-majuscules-avant", bas: "minuscules" }[o]].filter(Boolean);
  const variante = `fr-${forme}`;
  return { valeur, variante, traits, nom, prenom };
}

/* Le nom seul, pour « M. Tazi », « Maître Lacroix », « Dr El Amrani ». */
export function nomSeul(personne) {
  return { valeur: personne.nom, variante: personne.variante, traits: ["nom-seul"] };
}
