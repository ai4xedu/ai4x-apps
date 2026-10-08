// ============================================================================
// VERROU — codage « fail-closed » du texte libre (v2.0).
//
// Jusqu'à la v1.6, le connecteur codait ce qu'il RECONNAISSAIT comme sensible
// (motifs, en-têtes, MAJUSCULES, formes juridiques) et laissait passer le
// reste. Vérifié le 18/09/2026 : « Maître Dupont représente M. Karim Benali »
// arrivait en clair chez Claude, comme une colonne « Client » remplie de noms
// ou un nom de fichier « Dossier Benali.pdf ». Un nom écrit normalement, au
// fil d'une phrase, n'était reconnu par aucune règle. Pour un avocat, c'est
// le cas général, pas l'exception.
//
// Le verrou inverse la charge de la preuve : un mot n'est montré à Claude
// que s'il est PROUVÉ inoffensif. Passent en clair :
//   1. les codes (NOM-001…) ;
//   2. les nombres (montants, quantités, dates) — sauf ceux qui ont la forme
//      d'un identifiant (téléphone, ≥ 9 chiffres, n° de dossier, références) ;
//   3. les mots du dictionnaire français courant (336 000 formes, lexique/),
//      en minuscules, en tête de phrase ou précédés d'un déterminant ;
//   4. une courte liste blanche : institutions, pays, villes de juridiction,
//      mois, intitulés d'actes.
// Tout le reste est codé : noms propres, mots inconnus, références.
//
// Le piège qui reste à un verrou fondé sur le dictionnaire : les noms qui
// sont AUSSI des mots (Moulin, Boulanger, Robin, Blanc, Jacques, Marine…).
// Relecture adverse du 18/09/2026 : ~9 % des 200 patronymes français les plus
// portés en sont. Parade : les listes de l'INSEE (lexique/noms.json.gz, cf.
// SOURCES.md) — les 923 patronymes portés par ≥ 2 000 personnes qui sont aussi
// des mots, et les 4 883 prénoms donnés ≥ 500 fois. Un tel mot, écrit avec
// une majuscule, est codé sauf s'il suit un déterminant (« le Boulanger » est
// un artisan, « M. Boulanger » ou « Boulanger a signé » est une personne) ;
// derrière un titre ou un rôle (« M. », « Maître », « le Président »,
// « l'expert »), tout mot capitalisé est codé.
//
// Sur-coder est réversible et inoffensif ; sous-coder est une fuite
// définitive. Dans le doute, on code.
//
// Ce module ne décide PAS de ce qui sort vers le modèle : c'est le rôle de
// sortie.js (le verrou de sortie, dernier filet sur chaque réponse d'outil).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { TYPES, codeFor, codeDocumentText, newCodebook, normFor, HEADING_WORDS, isCardNumber } from "./engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const LEXICON_FILE = path.join(here, "..", "lexique", "fr.txt.gz");
export const NAMES_FILE = path.join(here, "..", "lexique", "noms.json.gz");

/* ---------------------------------------------------------------- listes -- */

const words = (s) => s.split(/\s+/).filter(Boolean);

export function fold(s) {
  return String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/* Mots courants absents du dictionnaire (abréviations, métier, latin
   juridique, vocabulaire numérique) : jamais des noms. */
const EXTRA_WORDS = words(`
mme mlle me mr mrs ms dr pr st ste sté cf etc art al ex vs ok nb ps pj ci-joint ci-dessus ci-dessous
ht ttc tva ir is irpp isf sarl sa sas sasu snc eurl sarlau gie sci scp selarl selas spa
ice rc if cnss amo cnops rib iban bic swift cin cni nir tel tél fax email e-mail emails mail mails
whatsapp sms mms web internet site url pdf xlsx xls csv docx doc txt md word excel powerpoint zoom teams
google gmail outlook linkedin facebook instagram youtube tiktok chatgpt openai anthropic ia ai api
app apps login logout password wifi bluetooth usb cloud online offline startup business manager management
marketing digital software hardware newsletter webinar webinaire coaching deadline feedback meeting call
process checklist reporting dashboard kpi roi ceo cfo coo cto cmo rh drh dg pdg daf dsi it si erp crm
saas b2b b2c tpe pme pmi eti ssii esn cdd cdi smic smig n° no nos num réf ref refs pp vol éd chap fig tab
min max env approx qté qte pu mad dh dhs eur usd euro euros dirham dirhams kg km cm mm ml mn rdv tjm ca
bd av imm appt apt lot hay derb bp cp cedex ss tj tgi ta caa ce cedh cjue onu ue cnil rgpd cndp cnb
in fine in solidum ab initio a priori a posteriori bona fide de facto de jure ex nihilo ex ante ex post
in extenso ipso facto mutatis mutandis prima facie sine qua non statu quo intuitu personae erga omnes
ad hoc ad litem ad nutum lato sensu stricto sensu infra supra idem ibid op cit sic nota bene alinéa al.
covid télétravail visio visioconférence mailing e-commerce ecommerce fintech legaltech open source
anonymisation anonymiser anonymisé anonymisée anonymiseur anonymiseurs pseudonymisation pseudonymiser
dé-anonymiser nanomizer ai4x hiddentokens tokens token ocr scan scans mcp
d l s n j m t c qu jusqu lorsqu puisqu quoiqu presqu quelqu aujourd prud n°
rg rcs siret siren nic naf ape cass civ crim soc bull jcp gaz pal rtd jorf bo ass plén plen ch mixte réun
req adm const ord déc arr jur rép obs comm concl rapp trib gde inst sect ci-après ci-après dénommé
export import data file files report draft final backup copy invoice new old test temp docs img image photo
id ids tx txn ref refs num no nb qty qte
`);
const EXTRA_SET = new Set(EXTRA_WORDS.map(fold));

/* Villes de juridiction (France, Maroc) : lisibles, l'IA en a besoin
   (« TJ de Nanterre »). Celles qui sont AUSSI des patronymes fréquents
   (Laval, Moulins…) sont retirées au chargement (cf. names()). */
/* Grandes villes : toujours lisibles (« Cour d'appel de Paris »). Un
   « M. Paris » ou un « Karim Paris » reste codé par le titre ou le prénom. */
const MAJOR_CITIES = words(`
casablanca rabat marrakech tanger fes agadir kenitra oujda tetouan meknes paris lyon marseille toulouse nice
nantes strasbourg montpellier bordeaux lille rennes bruxelles geneve lausanne montreal londres madrid
`);
const CITIES = words(`
sale mohammedia jadida el-jadida safi nador beni mellal khouribga laayoune dakhla essaouira ouarzazate
errachidia settat berrechid temara larache taza guelmim ifrane skhirat bouskoura
reims grenoble barcelone dubai abidjan dakar tunis alger
agen aix-en-provence ajaccio albertville albi alencon ales amiens angers angouleme annecy argentan arras auch
aurillac auxerre avesnes-sur-helpe avignon bar-le-duc bastia bayonne beauvais belfort bergerac besancon bethune
beziers blois bobigny bonneville boulogne-sur-mer boulogne-billancourt bourg-en-bresse bourges brest briey
brive-la-gaillarde caen cahors cambrai carcassonne carpentras castres chalons-en-champagne chalon-sur-saone
chambery charleville-mezieres chartres chateauroux cherbourg clermont-ferrand colmar compiegne coutances creteil
cusset dax dieppe digne-les-bains dijon douai draguignan dunkerque epinal evreux evry foix fontainebleau
fort-de-france gap grasse gueret guingamp havre lisieux libourne limoges lons-le-saunier lorient macon marmande
meaux melun mende metz mont-de-marsan montargis montauban montbeliard mulhouse nanterre narbonne nevers nimes
niort orleans pau perigueux perpignan poitiers pontoise privas quimper roanne rochefort la-roche-sur-yon
rodez rouen saint-brieuc saint-etienne saint-malo saint-nazaire saint-omer saint-quentin saintes sarreguemines
saumur senlis sens soissons tarascon tarbes thionville thonon-les-bains toulon tours troyes tulle valenciennes
vannes verdun versailles vesoul villefranche-sur-saone
`);

/* Mots qui peuvent porter une majuscule en milieu de phrase sans être un nom
   de personne : institutions, pays, villes, mois, jours. */
const CAP_SAFE_BASE = words(`
cour tribunal tribunaux conseil code civil civile penal penale commerce commercial commerciale travail republique
etat royaume constitution dahir loi lois decret arrete article articles chambre cassation appel instance premiere
premier parquet procureur procureure roi ministere ministre justice barreau batonnier president presidente
madame monsieur maitre docteur professeur mademoiselle societe direction region prefecture province commune
banque tresor douane douanes administration fisc impots senat parlement assemblee gouvernement union
europeenne europeen nations unies constitutionnel supreme juge juges greffe greffier notaire avocat avocats
cabinet etude ordre prudhommes prud'hommes haute autorite agence office public publique administratif
administrative judiciaire annexe preambule titre chapitre section paragraphe alinea contrat convention accord
avenant protocole statuts reglement charte patente facture devis avoir total sociale social criminelle
correctionnelle generale general nationale national regionale regional privee prive pleniere reunies
maroc marocain marocaine france francais francaise belgique suisse luxembourg canada quebec espagne italie
allemagne portugal royaume-uni angleterre etats-unis usa algerie tunisie senegal cote d'ivoire mauritanie
egypte emirats arabie qatar chine japon europe afrique amerique asie
lundi mardi mercredi jeudi vendredi samedi dimanche
internet web chatgpt excel word google microsoft apple whatsapp linkedin facebook anthropic openai
nanomizer ai4x iphone android windows macos
`);

/* Déterminants : « le Prestataire », « la Société », « les Parties » sont
   des termes définis, pas des personnes. */
const DETERMINERS = new Set(words(`
le la les l un une des du au aux ce cet cette ces son sa ses leur leurs notre nos votre vos mon ma mes ton ta tes
chaque tout toute tous toutes quelque quelques aucun aucune tel telle tels telles ledit ladite lesdits lesdites
dudit desdits audit auxdits
`));
const PLURAL_DET = new Set(words("les des aux ces leurs nos vos mes tes ses"));

/* Les mois s'écrivent en minuscules en français (« le 12 avril ») : un
   « Avril » capitalisé est un patronyme, sauf devant une date (« Avril 2024 »). */
const MONTHS = new Set(words("janvier fevrier mars avril mai juin juillet aout septembre octobre novembre decembre"));

/* Adjectifs qui précèdent un nom commun (« l'autre Partie », « la présente
   Convention ») : même rôle qu'un déterminant. */
const PRE_NOUN = new Set(words(`
autre autres meme memes present presente presents presentes dit dite dits dites seul seule premier premiere
second seconde dernier derniere nouveau nouvel nouvelle ancien ancienne futur future bon bonne
`));

/* Mots-outils : jamais des noms, même en MAJUSCULES au milieu d'une phrase. */
const FUNCTION_WORDS = new Set(words(`
le la les l un une des du de d au aux et ou ni mais donc or car en par pour sur sous dans avec sans contre
entre chez vers selon ce ces cet cette qui que quoi dont il elle ils elles on nous vous je tu se sa son ses
leur leurs ne pas plus y a est sont ete etre avoir ont c
`));

/* Patronymes fréquents qui sont surtout des mots courants en tête de phrase
   (« Six mois plus tard », « Page 3 », « Grand Casablanca ») : en tête de
   phrase, ils restent lisibles ; ailleurs (derrière un titre, en capitales
   dans une phrase, collés à un prénom), ils restent codés. */
const COMMON_START = new Set(words(`
six mille cent page porte chemin bureau salle jardin bois pain cote menu parent doyen maire masse bouche bouton
carton chateau champagne montagne foret colle poli trouve travers serre gras chapelle racine pelle cheval conte
sueur sauvage voisin neveu bataille cadet fosse loyer vigne grand gros bon bel beau fort rouge clair gentil joyeux
mignon champion prince marquis comte duc menager vilain servant gendre buffet marais verger grange bouquet
jardin fort trouve cote chene pin rose olive mouton poulet pigeon poisson lion
`));

/* Mots qui ouvrent une phrase sans faire partie d'un nom (« Selon Pierre »,
   « Dossier Benali ») : jamais aspirés par le nom qui suit. */
const STARTERS = new Set(words(`
selon pour par avec sans apres avant depuis lors suite vu attendu considerant concernant malgre contrairement
conformement enfin ainsi alors cependant toutefois neanmoins pourtant donc puis ensuite aussi encore deja hier
demain aujourd cher chere chers cheres bonjour bonsoir merci dossier affaire objet re ref concerne note memo
pieces piece rappel voir cf entre contre chez
`));

const ROMAN_RX = /^(?=[IVXLCDM]{1,7}$)M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/;

/* Titres de civilité : ce qui suit est un nom, même s'il ressemble à un mot. */
const HONORIFIC_ABBR = new Set(["m", "mm", "mme", "mmes", "mlle", "mlles", "me", "mes", "mr", "mrs", "ms", "dr", "pr"]);
const HONORIFIC_WORDS = new Set(words(`
monsieur madame mademoiselle messieurs mesdames maitre docteur professeur sieur dame veuve epoux epouse
nee ne feu si sidi lalla moulay hajj hadj haj cheikh cheikha mister miss
`));

/* Rôles : un mot capitalisé qui suit est un nom (« le Président Robin »,
   « l'expert GERMAIN », « le juge Léger », « le client Moulin »). */
const ROLE_TITLES = new Set(words(`
president presidente juge conseiller conseillere batonnier procureur procureure greffier greffiere expert
experte huissier commissaire notaire avocat avocate directeur directrice gerant gerante inspecteur inspectrice
commandant capitaine lieutenant colonel medecin architecte maire ministre depute deputee senateur senatrice
prefet recteur doyen abbe pere frere soeur oncle tante mediateur mediatrice arbitre liquidateur administrateur
administratrice mandataire temoin client cliente partie adversaire demandeur demanderesse defendeur
defenderesse requerant requerante intime intimee appelant appelante salarie salariee employe employee
confrere consoeur associe associee collaborateur collaboratrice stagiaire assistant assistante
`));

/* Libellés suivis d'un nom (« Client : Rousseau », « CONTRE : … »). */
const PERSON_LABELS = new Set(words(`
nom noms prenom prenoms client cliente clients contact destinataire expediteur beneficiaire titulaire
demandeur demanderesse defendeur defenderesse requerant requerante intime intimee appelant appelante partie
adversaire representant representante gerant gerante signataire temoin conseil avocat notaire mandataire
salarie salariee employe employee patient patiente locataire bailleur proprietaire acquereur vendeur vendeuse
acheteur acheteuse debiteur debitrice creancier creanciere caution garant associe associee heritier heritiere
conjoint epoux epouse interlocuteur responsable dirigeant dirigeante emetteur fournisseur de a attn attention
pour contre entre expert experte president presidente juge greffier greffiere rapporteur huissier mediateur
arbitre liquidateur administrateur
`));

/* Déclencheurs d'entreprise : les mots capitalisés qui suivent sont un nom. */
const COMPANY_TRIGGERS = new Set(words(`
societe ste cabinet groupe group entreprise ets etablissements compagnie cie association fondation holding
banque agence laboratoire clinique hotel restaurant cooperative mutuelle
sci sarl sas sasu sa snc eurl gie selarl selas scp sarlau
`));

/* Instruments juridiques : les mots capitalisés qui suivent forment un titre
   (« loi Informatique et Libertés », « loi Travail »), pas un nom. */
const LAW_WORDS = new Set(words("loi lois code decret directive reglement convention charte traite arrete ordonnance dahir"));

/* Particules de noms : restent en clair, relient les morceaux d'un nom. */
const PARTICLES = new Set(["de", "du", "des", "d", "van", "von", "der", "den", "ben", "bin", "bent", "ibn", "ould", "el", "al", "ait", "abou", "abu", "di", "da", "dos", "das", "la", "le"]);

/* Abréviations suivies d'un point qui NE termine PAS la phrase. */
const ABBREV = new Set([...HONORIFIC_ABBR, "st", "ste", "art", "al", "cf", "p", "pp", "n", "no", "vol", "ex", "av", "bd",
  "imm", "appt", "ref", "réf", "tel", "tél", "etc", "chap", "fig", "env", "approx", "min", "max", "sté", "ets", "cie",
  "jr", "sr", "cass", "civ", "soc", "crim", "com", "ass", "plén", "ch", "c"]);

/* Compléments marocains et noms que l'INSEE ne couvre pas assez. */
const FIRST_NAMES_EXTRA = words(`
karim youssef yassine mohamed mohammed ahmed hassan hicham rachid said samir nabil mehdi amine anas hamza
zakaria ayoub younes othmane imane fatima fatiha khadija aicha zineb salma meryem nadia samira latifa malika
najat hanane houda siham wafa ghita hind loubna asmae amal nour noura yasmine kenza rim dounia badr driss tarik
adil anouar reda jalal kamal jamal mustapha abdelaziz abdellah abdelkader abdelhak brahim ibrahim ismail idriss
soufiane ilyas walid hakim hamid aziz farid mounir claude
`);
const SURNAMES_EXTRA = words(`
petit blanc roux fontaine rousseau moreau robert richard mercier boyer garnier chevalier legrand gauthier
perrin morel girard fournier lambert bonnet dupuis leroy roy marchand meunier boucher carpentier charpentier
barbier brun lebrun masson baron marechal renard leblanc brunet camus faure lefort noir lenoir lemaire maire
prevost sergent berger bouvier pasteur mallet rolland colin guerin rey lacroix delacroix bouchet roche laroche
poirier lemoine moine prieur vasseur vallee riviere dumont gaillard fleury collet huet joly bailly lebon bon
bonhomme breton lebreton normand picard lorrain gascon allemand langlois lagarde garde vidal chauvin carre
lemaitre page cordier tessier tellier pelletier potier sabatier tissier texier royer rocher dumas aubert lecomte
comte leduc duc marquis prince bertin hubert jacob
`);

const LEGAL_FORMS_SRC =
  "S\\.?A\\.?R\\.?L\\.?(?:\\s*A\\.?U\\.?)?|SARLAU|SASU|S\\.A\\.S\\.?|SAS|SNC|GIE|SCI|SCP|SELARL|SELAS|EURL|" +
  "S\\.A\\.|SA|Inc\\.?|Ltd\\.?|LLC|GmbH|SpA|BV|NV|AG|PLC";

/* ---------------------------------------------------------------- lexique - */

let LEX = null;

/* Chargé une fois (~130 ms). S'il manque, on REFUSE de travailler : un
   verrou sans dictionnaire laisserait passer n'importe quoi. */
export function lexicon() {
  if (LEX) return LEX;
  let raw;
  try { raw = zlib.gunzipSync(fs.readFileSync(LEXICON_FILE)).toString("utf8"); }
  catch {
    throw new Error(
      "Dictionnaire du verrou introuvable dans l'extension (lexique/fr.txt.gz). Par sécurité, rien n'est " +
      "anonymisé sans lui. Réinstalle le connecteur."
    );
  }
  const set = new Set();
  for (const w of raw.split("\n")) if (w) set.add(fold(w));
  for (const w of EXTRA_SET) set.add(w);
  LEX = set;
  return LEX;
}

export function lexiconSize() {
  return lexicon().size;
}

/* Mot du dictionnaire (insensible aux accents et à la casse). Un mot composé
   est connu si toutes ses parties le sont (« sous-traitant », « a-t-il »). */
export function isKnownWord(word) {
  const L = lexicon();
  const f = fold(word);
  if (L.has(f)) return true;
  if (f.includes("-")) return f.split("-").every((p) => p && (L.has(p) || /^\d+$/.test(p)));
  return false;
}

let NAMES = null;

/* Listes de noms (INSEE, cf. lexique/SOURCES.md). Même règle que le
   dictionnaire : sans elles, on refuse de travailler. */
export function names() {
  if (NAMES) return NAMES;
  let data;
  try { data = JSON.parse(zlib.gunzipSync(fs.readFileSync(NAMES_FILE)).toString("utf8")); }
  catch {
    throw new Error("Listes de noms du verrou introuvables (lexique/noms.json.gz). Réinstalle le connecteur.");
  }
  const L = lexicon();
  const prenoms = new Set([...Object.keys(data.prenoms), ...FIRST_NAMES_EXTRA]);
  const nomColl = new Set([...Object.keys(data.nomsCollisions), ...SURNAMES_EXTRA]);
  const nomHigh = new Set([...Object.entries(data.nomsCollisions).filter(([, n]) => n >= 5000).map(([k]) => k), ...SURNAMES_EXTRA]);
  // Un prénom qui est aussi un mot courant de la langue du droit ou un
  // mot-outil n'est pas traité comme un prénom (« Rien », « Ange »… restent
  // des prénoms ; « Juste », « Loyal » aussi, mais pas « le », « Cour »…).
  const capSafe = new Set([...CAP_SAFE_BASE, ...MAJOR_CITIES]);
  for (const c of CITIES) if (!nomColl.has(c) && !prenoms.has(c)) capSafe.add(c);
  // « Le », « Juge », « Bonjour » sont aussi des patronymes : jamais traités
  // comme tels (un titre ou un prénom devant les codera quand même).
  for (const w of [...FUNCTION_WORDS, ...DETERMINERS, ...PRE_NOUN, ...capSafe, ...HEADING_WORDS, ...STARTERS,
    ...ROLE_TITLES, ...HONORIFIC_WORDS]) { prenoms.delete(w); nomColl.delete(w); nomHigh.delete(w); }
  const prenomColl = new Set([...prenoms].filter((p) => L.has(p)));
  NAMES = { prenoms, prenomColl, nomColl, nomHigh, capSafe };
  return NAMES;
}

/* --------------------------------------------------- motifs (pré-passe) -- */

/* Chiffres de toutes écritures (arabe-indien, pleine chasse…) et séparateurs
   de toutes sortes (tirets insécables, demi-cadratin, point médian) : un
   numéro ne doit pas échapper au motif parce qu'il est écrit autrement. */
const D = "\\p{Nd}";
const SEP = "[ .\\-/\\u00A0\\u2010-\\u2015\\u2212\\u00B7]";
const SEPNS = "[ .\\-\\u00A0\\u2010-\\u2015\\u2212\\u00B7]"; // sans « / » (pas de téléphone en 06/12)

export function asciiDigits(s) {
  return String(s).replace(/\p{Nd}/gu, (ch) => {
    const c = ch.codePointAt(0);
    for (const zero of [0x30, 0x660, 0x6f0, 0x966, 0xff10, 0x9e6, 0x1d7ce]) if (c >= zero && c <= zero + 9) return String(c - zero);
    return ch;
  });
}
const digitsOf = (s) => asciiDigits(s).replace(/\D/g, "");

const KW_ADDRESS = ["rue", "avenue", "av.", "bd", "boulevard", "allée", "allee", "impasse", "place", "chemin",
  "route", "résidence", "residence", "rés.", "res.", "lotissement", "lot.", "quartier", "hay", "derb", "immeuble",
  "imm.", "appartement", "appt", "angle", "cité", "villa"];

function caseVariants(k) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [`[${k[0].toUpperCase()}${k[0]}]${esc(k.slice(1))}`, esc(k.toUpperCase())];
}

const ADDRESS_SRC =
  "(?:(?<![\\p{L}\\p{N}])\\p{Nd}{1,4}(?:\\s?(?:bis|ter|BIS|TER))?,?\\s+)?" +
  "(?<![\\p{L}\\p{N}])(?:" + KW_ADDRESS.flatMap(caseVariants).join("|") + ")" +
  "\\s+(?:(?:de|du|des|d'|d’|la|le|l'|l’)\\s*)?(?=[\\p{Lu}\\p{N}])[^,\\n;()\\t]{1,60}?(?=$|[,\\n;()\\t]|\\.\\s|\\.$)";

const DATE_RX = /^(?:\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}|\d{1,2}[/.\-]\d{4})$/;
const isDate = (m) => DATE_RX.test(asciiDigits(m).replace(/\s/g, "").replace(/[‐-―−]/g, "-"));

/* Ordre = priorité. Chaque motif est cherché HORS des codes déjà posés. */
export const PATTERNS = [
  { type: "lien", rx: /\b(?:https?:\/\/|www\.)[^\s<>"'()]+/gi },
  { type: "email", rx: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu },
  { type: "email", rx: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]{2,}/gu },       // sans domaine : « pierre.moulin@orange »
  { type: "email", rx: /[\p{L}\p{N}._%+-]+\s?[[(](?:at|arobase|@)[\])]\s?[\p{L}\p{N}.-]+\s?(?:[[(](?:dot|point)[\])]|\.)\s?[\p{L}]{2,}/giu },
  { type: "lien", rx: /(?<![\p{L}\p{N}@.-])[a-z0-9][a-z0-9-]{1,62}(?:\.[a-z0-9-]{2,62})*\.(?:ma|fr|com|net|org|be|ch|ca|io|co|eu|info|biz|law|me|ly|app)(?![\p{L}\p{N}-])(?:\/[^\s<>"'()]*)?/giu },
  { type: "rib", rx: /\b[A-Z]{2}\p{Nd}{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/gu },
  // v2.1 — carte bancaire : 13 à 19 chiffres qui passent Luhn, AVANT les
  // téléphones groupés et les suites nues (sinon « 4111 1111 1111 1111 »
  // partait en TEL-001 et un numéro nu en REF-001 — codé, mais mal nommé,
  // ce qui ne passe pas chez un client de la monétique). Chiffres de toutes
  // écritures : Luhn se calcule sur la forme ASCII.
  { type: "carte", rx: new RegExp(`(?<![\\p{Nd}\\p{L}-])${D}(?:${SEPNS}?${D}){12,18}(?![\\p{Nd}\\p{L}])`, "gu"),
    check: (m) => isCardNumber(asciiDigits(m)) },
  { type: "carte", rx: new RegExp(`(?<![\\p{Nd}\\p{L}*])${D}{4,6}(?:${SEPNS}*[*xX•·]){4,12}${SEPNS}*${D}{4}(?![\\p{Nd}\\p{L}])`, "gu") },
  // International, y compris « +33 (0)6 12 34 56 78 ».
  { type: "tel", rx: new RegExp(`(?<![\\p{Nd}+])(?:\\+|00)${D}{1,3}${SEPNS}?(?:\\(0\\)${SEPNS}?)?\\(?${D}{1,4}\\)?(?:${SEPNS}?${D}{2,4}){2,5}(?!${D})`, "gu"),
    // « 00… » sans séparateur de 15 chiffres = un ICE marocain, pas un téléphone.
    check: (m) => { const d = digitsOf(m); return /^\+|[^\p{Nd}]/u.test(m.slice(1)) ? d.length >= 9 && d.length <= 17 : d.length >= 11 && d.length <= 14; } },
  // National (France, Maroc) : 06 12 34 56 78, 06.12.34.56.78, 06/12/34/56/78.
  { type: "tel", rx: new RegExp(`(?<!${D})0[1-9](?:${SEP}?${D}{2}){4}(?!${D})`, "gu") },
  { type: "cin", rx: new RegExp(`(?<!${D})[12]${SEP}?${D}{2}${SEP}?(?:0[1-9]|1[0-2])${SEP}?(?:${D}{2}|2[AB])${SEP}?${D}{3}${SEP}?${D}{3}(?:${SEP}?${D}{2})?(?!${D})`, "gu") },
  // Permis de conduire marocain « 15/284731 » — avant les références à barre.
  { type: "permis", rx: new RegExp(`(?<![\\p{Nd}/])${D}{1,2}[ \\u00A0]?/[ \\u00A0]?${D}{6}(?![\\p{Nd}/])`, "gu") },
  { type: "reference", rx: new RegExp(`(?<!${D})${D}{3}[ .\\u00A0]${D}{3}[ .\\u00A0]${D}{3}(?:[ .\\u00A0]${D}{5})?(?!${D})`, "gu") },
  { type: "reference", rx: new RegExp(`(?<!${D})${D}{9,}(?!${D})`, "gu") },
  // Chiffres groupés (« 01 423 456 78 », « 06-12-34-56-78 ») : ≥ 4 groupes et
  // ≥ 8 chiffres, hors date → un numéro, pas un montant.
  { type: "tel", rx: new RegExp(`(?<![\\p{Nd}\\p{L}_\\-])${D}{1,4}(?:${SEP}${D}{1,4}){3,}(?!${D})`, "gu"),
    check: (m) => digitsOf(m).length >= 8 && !isDate(m) },
  { type: "reference", rx: new RegExp(`(?<![\\p{Nd}/.\\-])${D}+(?:\\s?[/\\-\\u2010-\\u2015]\\s?${D}+){1,3}(?![\\p{Nd}/])`, "gu"),
    check: (m) => !isDate(m) && digitsOf(m).length >= 6 },
  // CIN, passeport, avec ou sans espace (« BE123456 », « AB 1234567 »).
  { type: "cin", rx: new RegExp(`(?<![\\p{L}\\p{N}])(?!CA\\b|HT\\b)[A-Z]{1,2}[ \\u00A0]?${D}{5,8}(?![\\p{L}\\p{N}])`, "gu") },
  // N° de facture, de dossier, de contrat : « FAC-2026-0142 », « DOS/24/118 ».
  { type: "reference", rx: new RegExp(`(?<![\\p{L}\\p{N}-])[A-Z]{1,6}[-_/]${D}{2,}(?:[-_/.]${D}+)*(?![\\p{L}\\p{N}])`, "gu") },
  { type: "adresse", rx: new RegExp(ADDRESS_SRC, "gu") },
  { type: "societe", rx: new RegExp(
      "(?<![\\p{L}\\p{N}])(?:[\\p{Lu}][\\p{L}\\p{N}'’.\\-]*(?:[ \\u00A0]+(?:&|et|and)[ \\u00A0]+|[ \\u00A0]+)){0,5}" +
      "[\\p{Lu}][\\p{L}\\p{N}'’.\\-]*[ \\u00A0,]+(?:" + LEGAL_FORMS_SRC + ")(?![\\p{L}\\p{N}])", "gu") },
];

/* Une chaîne `code` = n'importe quel code de la clé (PREFIXE-NNN). */
const PREFIXES = TYPES.map((t) => t.prefix);
export const CODE_SRC = `(?<![\\p{L}\\p{N}])(?:${PREFIXES.join("|")})-\\d{3,}(?![\\p{L}\\p{N}])`;

/* Applique fn aux morceaux de texte situés HORS des codes déjà posés. */
function outsideCodes(text, fn) {
  const rx = new RegExp(CODE_SRC, "gu");
  let out = "";
  let last = 0;
  let m;
  while ((m = rx.exec(text))) {
    out += fn(text.slice(last, m.index)) + m[0];
    last = rx.lastIndex;
  }
  return out + fn(text.slice(last));
}

/* ------------------------------------------------ correspondances connues - */

export function foldKey(s) {
  const t = String(s).trim();
  const d = digitsOf(t);
  if (/^[+\p{Nd}\s.\-/() ‐-―−·]+$/u.test(t) && d.length >= 6) return "#" + d;
  return fold(t).replace(/[\s\-’']+/g, " ");
}

const MATCH_TOKEN_RX = /[\p{L}\p{N}]+(?:[&.'’\-][\p{L}\p{N}]+)*|&/gu;
const DIGIT_RUN_RX = new RegExp(`(?<!${D})\\+?${D}(?:(?:${SEPNS}|\\(0\\)){0,3}${D}){5,}(?!${D})`, "gu");
const MATCHERS = new WeakMap();

/* Remplacement « valeur réelle → code » de toute la clé, par recherche de
   n-grammes (et non par une expression régulière géante : 3,7 s par appel à
   20 000 codes, constaté à la relecture). Règles :
   - une valeur de plusieurs mots, ou qui n'est pas un mot du dictionnaire,
     est remplacée quelle que soit sa casse (« BENALI », « benali ») ;
   - une valeur faite d'UN mot du dictionnaire (« Blanc », « Claire ») n'est
     remplacée que capitalisée : « le chèque est en blanc » ne doit pas
     devenir « en NOM-003 » — ce serait désigner la personne par le contexte ;
   - un numéro est reconnu quels que soient ses séparateurs.
   L'index est construit une fois par carnet (byKey, qui contient aussi les
   ALIAS : « Transports Moreau & Fils » pour « … SAS »), puis tenu à jour par
   les seules nouvelles entrées — un lot de 10 000 cellules ne le reconstruit
   pas 10 000 fois. */
function indexValue(ix, v, code) {
  const k = foldKey(v);
  if (k.startsWith("#")) { if (k.length >= 7 && !ix.digitMap.has(k)) ix.digitMap.set(k, code); return; }
  if (String(v).trim().length < 3) return;
  const n = (String(v).match(MATCH_TOKEN_RX) || []).length;
  if (n <= 1 && isKnownWord(v)) { if (!ix.capOnly.has(k)) ix.capOnly.set(k, code); return; }
  if (!ix.multi.has(k)) ix.multi.set(k, code);
  ix.maxWords = Math.max(ix.maxWords, Math.min(n, 12));
}

/* Déclare un alias (valeur supplémentaire pour un code existant). */
function addAlias(book, typePrefix, value, code) {
  const ak = typePrefix + "||" + normFor(typePrefix, value);
  if (book.byKey[ak]) return;
  book.byKey[ak] = code;
  const ix = MATCHERS.get(book);
  if (ix) indexValue(ix, value, code);
}

export function knownValueMatcher(book) {
  if (!book || !book.byKey) return null;
  let ix = MATCHERS.get(book);
  if (!ix) {
    ix = { multi: new Map(), capOnly: new Map(), digitMap: new Map(), maxWords: 1, seen: 0 };
    for (const mk of Object.keys(book.byKey)) indexValue(ix, mk.slice(mk.indexOf("||") + 2), book.byKey[mk]);
    ix.seen = (book.entries || []).length;
    MATCHERS.set(book, ix);
  } else if ((book.entries || []).length > ix.seen) {
    for (const e of book.entries.slice(ix.seen)) indexValue(ix, e.value, e.code);
    ix.seen = book.entries.length;
  }
  if (!ix.multi.size && !ix.capOnly.size && !ix.digitMap.size) return null;
  const codeOnly = new RegExp(`^${CODE_SRC}$`, "u");
  return (text) => {
    let replaced = 0;
    let s = String(text);
    if (ix.digitMap.size) {
      s = s.replace(DIGIT_RUN_RX, (m) => {
        const code = ix.digitMap.get("#" + digitsOf(m));
        if (!code) return m;
        replaced++;
        return code;
      });
    }
    const toks = [];
    MATCH_TOKEN_RX.lastIndex = 0;
    let m;
    while ((m = MATCH_TOKEN_RX.exec(s))) toks.push({ a: m.index, b: m.index + m[0].length });
    let out = "";
    let last = 0;
    for (let i = 0; i < toks.length; i++) {
      let hit = null;
      for (let n = Math.min(ix.maxWords, toks.length - i); n >= 1 && !hit; n--) {
        const j = i + n - 1;
        if (n > 1) {
          let ok = true;
          for (let q = i; q < j; q++) if (!/^[ \u00A0\-’']{1,3}$/.test(s.slice(toks[q].b, toks[q + 1].a))) { ok = false; break; }
          if (!ok) continue;
        }
        const cand = s.slice(toks[i].a, toks[j].b);
        if (codeOnly.test(cand)) continue;
        const k = foldKey(cand);
        let code = ix.multi.get(k);
        if (!code && n === 1 && /^\p{Lu}/u.test(cand)) code = ix.capOnly.get(k);
        if (code) hit = { j, code };
      }
      if (!hit) {
        // Morceaux d'un jeton composé : « Benali.pdf », « dossier-benali ».
        const tokText = s.slice(toks[i].a, toks[i].b);
        if (!/[.\-]/.test(tokText) || codeOnly.test(tokText)) continue;
        const rebuilt = tokText.replace(/[\p{L}\p{N}]+/gu, (part) => {
          let code = ix.multi.get(foldKey(part));
          if (!code && /^\p{Lu}/u.test(part)) code = ix.capOnly.get(foldKey(part));
          if (!code) return part;
          replaced++;
          return code;
        });
        if (rebuilt === tokText) continue;
        out += s.slice(last, toks[i].a) + rebuilt;
        last = toks[i].b;
        continue;
      }
      out += s.slice(last, toks[i].a) + hit.code;
      last = toks[hit.j].b;
      replaced++;
      i = hit.j;
    }
    return { text: out + s.slice(last), replaced };
  };
}

/* ---------------------------------------------------------- tokenisation - */

const TOKEN_RX = new RegExp(
  `(?<code>${CODE_SRC})` +
  "|(?<mixed>[\\p{L}\\p{N}]*(?:\\p{L}\\p{N}|\\p{N}\\p{L})[\\p{L}\\p{N}]*)" +
  "|(?<word>\\p{L}+(?:-\\p{L}+)*)" +
  "|(?<num>\\p{N}+)",
  "gu"
);

const UNIT_RX = /^(?:\d+(?:er|ère|ere|re|e|è|ème|eme|nd|nde|h|h\d{1,2}|min|mn|s|kg|g|mg|km|m|cm|mm|m2|m²|m3|l|ml|cl|ko|mo|go|to|kb|mb|gb|tb|ht|ttc|x|j|jrs|mois|an|ans|k|ke|k€|m€|dh|dhs|mad|eur|usd|€|pt|pts|px|dpi|g|v|w|kw|kwh|mw|hz|ghz|mhz)|[a-z]\d|[tqs][1-4]|\d[a-z]|mp[34]|b2[bc]|p2p|h24|covid-?19|iso\d{3,5}|[34]g|5g|v\d{1,2})$/i;

function tokenize(text) {
  const toks = [];
  let last = 0;
  TOKEN_RX.lastIndex = 0;
  let m;
  while ((m = TOKEN_RX.exec(text))) {
    if (m.index > last) toks.push({ k: "sep", s: text.slice(last, m.index), at: last });
    const g = m.groups;
    toks.push({ k: g.code ? "code" : g.mixed ? "mixed" : g.word ? "word" : "num", s: m[0], at: m.index });
    last = TOKEN_RX.lastIndex;
  }
  if (last < text.length) toks.push({ k: "sep", s: text.slice(last), at: last });
  return toks;
}

const isCap = (w) => /^\p{Lu}/u.test(w);
const isAllCaps = (w) => w.length >= 2 && w === w.toUpperCase() && /\p{Lu}.*\p{Lu}/u.test(w);

/* --------------------------------------------------------- codage strict - */

/* Code un texte libre en mode verrou.
   opts : { book, extra: [{value,type}], excludes: [valeurs], mask, fileName }
   - book     : carnet de codes (muté : les nouveaux codes y sont ajoutés) ;
   - mask     : au lieu de coder, remplace par « ••• » (aperçu d'un nom de
                fichier, sans toucher à la clé) ;
   - fileName : un nom de fichier ou d'onglet — plus court, plus
                identifiant : un prénom ou un patronyme fréquent y est codé
                même en minuscules (« dossier-moulin.pdf ») ;
   - excludes : valeurs que l'utilisateur veut EXPLICITEMENT garder en clair.
   Renvoie { text, replaced, newCodes, byType, names, unknown }. */
export function strictCode(input, opts = {}) {
  const book = opts.book;
  const mask = !!opts.mask;
  const stats = { replaced: 0, newCodes: 0, byType: {}, names: 0, unknown: 0 };
  let text = String(input == null ? "" : input);
  if (!text.trim()) return { text, ...stats };
  lexicon();
  const N = names();
  const capSafe = (x) => N.capSafe.has(x) || EXTRA_SET.has(x);

  const labelOf = (typeId) => (TYPES.find((t) => t.id === typeId) || TYPES[TYPES.length - 1]).label;
  const emit = (typeId, value) => {
    stats.replaced++;
    const label = labelOf(typeId);
    stats.byType[label] = (stats.byType[label] || 0) + 1;
    if (mask || !book) return "•••";
    const { code, isNew } = codeFor(book, typeId, String(value).trim());
    if (isNew) stats.newCodes++;
    return code;
  };
  const escRx = (v) => String(v).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");

  // 0) Valeurs que l'utilisateur veut garder en clair : mises à l'abri.
  const shelter = [];
  const excludes = (opts.excludes || []).map((v) => String(v).trim()).filter((v) => v.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const v of excludes) {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])${escRx(v)}(?![\\p{L}\\p{N}])`, "giu");
    text = text.replace(rx, (m) => { shelter.push(m); return `${shelter.length - 1}`; });
  }

  // 1) Valeurs demandées explicitement (valeurs_a_coder).
  const extras = (opts.extra || []).filter((e) => e && String(e.value).trim().length >= 2)
    .sort((a, b) => String(b.value).length - String(a.value).length);
  for (const e of extras) {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])${escRx(e.value)}(?![\\p{L}\\p{N}])`, "giu");
    text = outsideCodes(text, (seg) => seg.replace(rx, () => emit(e.type || "autre", String(e.value).trim())));
  }

  // 2a) Dictionnaire marocain du moteur (ICE, IF, RC, CNSS, patente, CIN
  //     libellés, téléphones marocains, RIB) — mêmes codes que les modes
  //     tableau et document. HORS des codes déjà posés : sinon « RC : RC-001 »
  //     se relirait comme un n° de registre de commerce « 001 ».
  text = outsideCodes(text, (seg) => {
    if (!seg) return seg;
    if (mask || !book) {
      const r = codeDocumentText(seg, newCodebook(), []);
      if (!r.replaced) return seg;
      stats.replaced += r.replaced;
      return r.text.replace(new RegExp(CODE_SRC, "gu"), "•••"); // codes neufs du segment seulement
    }
    const r = codeDocumentText(seg, book, []);
    stats.replaced += r.replaced;
    stats.newCodes += r.newCodes;
    for (const k of Object.keys(r.byType)) stats.byType[k] = (stats.byType[k] || 0) + r.byType[k];
    return r.text;
  });

  // 2b) Motifs structurés : liens, emails, IBAN, téléphones, NIR, références,
  //     adresses, sociétés à forme juridique. AVANT les valeurs connues : un
  //     email doit être codé en entier, pas découpé autour d'un nom connu.
  for (const p of PATTERNS) {
    text = outsideCodes(text, (seg) => seg.replace(p.rx, (m) => {
      if (p.check && !p.check(m)) return m;
      // « … Négoce SARL. » : le point final est celui de la phrase.
      const value = p.type === "societe" && m.endsWith(".") ? m.slice(0, -1) : m;
      const code = emit(p.type, value);
      if (p.type === "societe" && book && !mask) {
        // Alias sans la forme juridique : « Transports Moreau & Fils » plus
        // loin dans le texte recevra le MÊME code.
        const core = value.replace(new RegExp("[\\s,]+(?:" + LEGAL_FORMS_SRC + ")$"), "").trim();
        if (core.length >= 3 && core !== value && !isKnownWord(core)) addAlias(book, "SOCIETE", core, code);
      }
      return value === m ? code : code + ".";
    }));
  }

  // 3) Ce que la clé connaît déjà garde SON code (même entité = même code,
  //    d'un fichier et d'une colonne à l'autre).
  if (book && !mask) {
    const known = knownValueMatcher(book);
    if (known) text = outsideCodes(text, (seg) => { const r = known(seg); stats.replaced += r.replaced; return r.text; });
  }

  // 4) Mot à mot.
  const toks = tokenize(text);
  const W = [];                                   // indices des jetons non-séparateurs
  for (let i = 0; i < toks.length; i++) if (toks[i].k !== "sep") W.push(i);
  const tok = (wi) => toks[W[wi]];
  const sepBefore = (wi) => {
    let s = "";
    for (let j = (wi > 0 ? W[wi - 1] : -1) + 1; j < W[wi]; j++) s += toks[j].s;
    return s;
  };
  const f = W.map((i) => fold(toks[i].s));
  const isWord = (wi) => wi >= 0 && wi < W.length && tok(wi).k === "word";
  const SPACE = /^[  ]{1,3}$/;

  // Une ligne entièrement en MAJUSCULES est un intitulé ; un mot en
  // majuscules au milieu d'une ligne en minuscules est un nom (« contre
  // HORIZON IMMOBILIER »).
  const lineHasLower = (() => {
    const flags = [];
    let pos = 0;
    for (const line of text.split("\n")) {
      flags.push({ a: pos, b: pos + line.length, lower: /\p{Ll}/u.test(line.replace(new RegExp(CODE_SRC, "gu"), "")) });
      pos += line.length + 1;
    }
    return (at) => (flags.find((l) => at >= l.a && at <= l.b) || { lower: true }).lower;
  })();

  // Début de phrase (ou de cellule, de ligne, après « : »).
  const initial = W.map((_, wi) => {
    if (wi === 0) return true;
    const sep = sepBefore(wi);
    if (/[\n\t«“"(\[•:;|]/.test(sep) || /^\s*[-*]\s/.test(sep) || /[!?…]/.test(sep)) return true;
    if (/\.\s*$/.test(sep)) {
      const prev = tok(wi - 1);
      return !(prev.k === "word" && (ABBREV.has(f[wi - 1]) || prev.s.length === 1));
    }
    return false;
  });

  const verdict = new Array(W.length).fill(null); // null = en clair ; sinon type de code
  let lawChain = false;

  for (let wi = 0; wi < W.length; wi++) {
    const t = tok(wi);
    if (t.k === "code" || t.k === "num") { lawChain = false; continue; }
    if (t.k === "mixed") { if (!UNIT_RX.test(t.s) && !EXTRA_SET.has(f[wi])) verdict[wi] = "reference"; continue; }
    const w = t.s;
    const x = f[wi];
    const known = isKnownWord(w);
    const sep = sepBefore(wi);
    const px = wi > 0 ? f[wi - 1] : "";
    const prevWord = isWord(wi - 1);
    const prevTok = prevWord ? tok(wi - 1).s : "";
    const firstName = x.split("-").every((p) => N.prenoms.has(p));
    // « la présente Convention », « l'autre Partie » : l'adjectif compte comme
    // déterminant s'il est en minuscules ; « Nouvelle Vague Production », non.
    const det = prevWord && (DETERMINERS.has(px) || (PRE_NOUN.has(px) && !isCap(prevTok))) && (SPACE.test(sep) || /^['’]$/.test(sep));
    const detPlural = det && PLURAL_DET.has(px);
    const nameLike = (typeIfFirst) => (firstName ? typeIfFirst : "nom");

    // Chaîne d'un titre de loi : « loi Informatique et Libertés ».
    if (prevWord && LAW_WORDS.has(px) && SPACE.test(sep)) lawChain = true;
    else if (!(isCap(w) || (lawChain && /^(?:et|de|du|des|d|pour|sur|relative|relatif)$/.test(x)))) lawChain = false;
    if (lawChain && isCap(w) && known && !N.nomColl.has(x) && !firstName) continue;

    // Particule capitalisée devant un nom (« El Amrani », « Ben Ali ») : en clair.
    if (PARTICLES.has(x) && isWord(wi + 1) && isCap(tok(wi + 1).s) && SPACE.test(sepBefore(wi + 1)) && !initial[wi + 1]) continue;

    // Titre de civilité juste avant : « M. Petit », « Mme Rousseau »,
    // « Monsieur Paris ». « Mes demandes » n'en est pas un (pas de point, minuscule).
    const abbr = prevWord && HONORIFIC_ABBR.has(px) && isCap(prevTok);
    if (abbr && !DETERMINERS.has(x) && !PARTICLES.has(x) &&
        ((/^\.[  ]+$/.test(sep)) || (SPACE.test(sep) && isCap(w)))) { verdict[wi] = nameLike("prenom"); continue; }
    if (prevWord && HONORIFIC_WORDS.has(px) && SPACE.test(sep) && isCap(w) && !HONORIFIC_WORDS.has(x)) { verdict[wi] = nameLike("prenom"); continue; }
    // Rôle juste avant : « le Président Robin », « l'expert GERMAIN ».
    if (prevWord && ROLE_TITLES.has(px) && SPACE.test(sep) && isCap(w) && !capSafe(x) && !ROLE_TITLES.has(x) &&
        !DETERMINERS.has(x) && !HEADING_WORDS.has(x)) { verdict[wi] = nameLike("prenom"); continue; }
    // « Société Atlas », « SCI Les Oliviers », « cabinet Benjelloun » → entreprise.
    if (prevWord && COMPANY_TRIGGERS.has(px) && SPACE.test(sep) && isCap(w) && !capSafe(x)) { verdict[wi] = "societe"; continue; }
    // « Client : Rousseau », « CONTRE : … » → nom après un libellé de personne.
    //   (même une ville ou un mois : « Client : Paris », « Expert : Avril »).
    if (prevWord && PERSON_LABELS.has(px) && /^[  ]*:[  ]*$/.test(sep) && isCap(w) &&
        !HONORIFIC_WORDS.has(x) && !DETERMINERS.has(x) && !FUNCTION_WORDS.has(x)) { verdict[wi] = nameLike("prenom"); continue; }

    if (isCap(w)) {
      // Suite d'un nom d'entreprise : « Société Maghreb Distribution ».
      if (prevWord && verdict[wi - 1] === "societe" && SPACE.test(sep) && !capSafe(x)) { verdict[wi] = "societe"; continue; }
      if (w.length === 1 || ROMAN_RX.test(w)) continue;               // initiale isolée ; « II. »
      if (isAllCaps(w)) {
        if (capSafe(x) || FUNCTION_WORDS.has(x) || HEADING_WORDS.has(x)) continue;
        if (!known) { verdict[wi] = nameLike("prenom"); continue; }
        const inText = lineHasLower(t.at);
        if (N.nomColl.has(x) && (inText || N.nomHigh.has(x))) { verdict[wi] = "nom"; continue; }
        if (N.prenomColl.has(x) && inText) { verdict[wi] = "prenom"; continue; }
        if (inText) { verdict[wi] = "nom"; continue; }                // mot en majuscules dans une phrase
        continue;                                                      // intitulé en majuscules
      }
      if (MONTHS.has(x)) {
        const nextIsNum = wi + 1 < W.length && tok(wi + 1).k === "num" && SPACE.test(sepBefore(wi + 1));
        if (!nextIsNum && !(initial[wi] && !isWord(wi + 1))) verdict[wi] = "nom";
        continue;
      }
      if (capSafe(x)) continue;
      // Nom de famille au pluriel : « chez les Rousseau », « les Bourgeois ».
      if (detPlural && (N.nomColl.has(x) || N.prenoms.has(x) || (!known && !/[sx]$/.test(x)))) { verdict[wi] = "nom"; continue; }
      if (det) { if (!known) verdict[wi] = nameLike("prenom"); continue; }
      if (firstName) { verdict[wi] = "prenom"; continue; }
      if (!known) { verdict[wi] = "nom"; continue; }
      // Mot du dictionnaire écrit avec une majuscule : nom ou mot ?
      if (N.nomColl.has(x) && (!initial[wi] || (N.nomHigh.has(x) && !COMMON_START.has(x)))) { verdict[wi] = "nom"; continue; }
      if (initial[wi]) continue;
      // Suite d'un terme défini : « la Date d'Effet », « les Informations Confidentielles »
      // — seulement si la chaîne est partie d'un déterminant, pas d'un début de phrase.
      if (prevWord && verdict[wi - 1] === null && isCap(prevTok) && !initial[wi - 1] &&
          (SPACE.test(sep) || /^[  ]*(?:d['’]|de[  ]+)$/.test(sep))) continue;
      if (prevWord && (px === "d" || px === "de") && wi >= 2 && isWord(wi - 2) && verdict[wi - 2] === null &&
          !initial[wi - 2] && isCap(tok(wi - 2).s) && isKnownWord(tok(wi - 2).s) && (/^['’]$/.test(sep) || SPACE.test(sep))) continue;
      verdict[wi] = "nom";
      continue;
    }
    // Minuscules : un mot inconnu du dictionnaire est codé (une lettre isolée
    // ne dit rien de personne : « b.md », « annexe b »).
    if (!known && w.length > 1) { verdict[wi] = "autre"; continue; }
    if (!known) continue;
    // Notes tapées en minuscules : « rdv avec me moulin », « appeler mme petit ».
    if (prevWord && HONORIFIC_ABBR.has(px) && /^\.?[  ]+$/.test(sep) && (N.nomColl.has(x) || N.prenoms.has(x)) &&
        !FUNCTION_WORDS.has(x)) { verdict[wi] = nameLike("prenom"); continue; }
    // Dans un nom de fichier, un prénom ou un patronyme fréquent est un nom,
    // même en minuscules (« dossier-moulin.pdf »).
    if (opts.fileName && x.split("-").some((p) => N.nomColl.has(p) || N.prenoms.has(p))) { verdict[wi] = nameLike("prenom"); continue; }
    // Prénom + nom écrits en minuscules, tous deux AUSSI des mots
    // (« pierre rousseau », « marie blanc ») : codés ensemble.
    const nextLow = isWord(wi + 1) && SPACE.test(sepBefore(wi + 1)) && !isCap(tok(wi + 1).s) ? f[wi + 1] : "";
    const prevLow = prevWord && SPACE.test(sep) && !isCap(prevTok) ? px : "";
    if (N.prenomColl.has(x) && (N.nomColl.has(nextLow) || (nextLow && !isKnownWord(tok(wi + 1).s)))) { verdict[wi] = "prenom"; continue; }
    if (N.nomColl.has(x) && N.prenomColl.has(prevLow)) { verdict[wi] = "nom"; continue; }
  }

  // 5) Un nom attire ses voisins capitalisés (« Jacques Moulin », « Karim
  //    Avril », « Jean de La Fontaine ») et les initiales (« K. Benali »).
  //    On ne colle qu'à travers un espace, un tiret ou « . » d'initiale —
  //    jamais une tabulation (cellule voisine) ni un retour à la ligne.
  const isName = (v) => v === "nom" || v === "prenom" || v === "societe" || v === "autre";
  const GLUE = /^(?:[  ]{1,2}|[  ]?-[  ]?|\.[  ])$/;
  const glueable = (j, fromFirstName) => {
    if (!isWord(j) || verdict[j] !== null) return false;
    const w = tok(j).s;
    const x = f[j];
    // En minuscules, seuls un prénom ou un patronyme connus s'agrègent.
    if (!isCap(w)) return N.prenoms.has(x) || N.nomColl.has(x);
    // Juste APRÈS un prénom, un mot capitalisé est un patronyme, quel qu'il
    // soit (« Karim Avril », « Leila Paris », « Karim Juge »).
    if (fromFirstName && !FUNCTION_WORDS.has(x) && !DETERMINERS.has(x) && !PARTICLES.has(x) &&
        !HONORIFIC_WORDS.has(x) && !ROMAN_RX.test(w)) return true;
    if (HONORIFIC_ABBR.has(x) || HONORIFIC_WORDS.has(x) || ROLE_TITLES.has(x) || PERSON_LABELS.has(x) ||
        COMPANY_TRIGGERS.has(x) || DETERMINERS.has(x) || PARTICLES.has(x) || FUNCTION_WORDS.has(x) ||
        HEADING_WORDS.has(x) || ROMAN_RX.test(w)) return false;
    // Une ville ou un mois capitalisé juste APRÈS un prénom est un patronyme
    // (« Karim Avril », « Leila Paris ») ; ailleurs, il reste lisible.
    if (capSafe(x)) return fromFirstName;
    return true;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let wi = 0; wi < W.length; wi++) {
      if (!isName(verdict[wi])) continue;
      for (const dir of [1, -1]) {
        let j = wi + dir;
        if (j < 0 || j >= W.length) continue;
        if (!GLUE.test(dir === 1 ? sepBefore(j) : sepBefore(wi))) continue;
        // Particule en minuscules entre deux morceaux de nom : sautée, reste en clair.
        if (isWord(j) && PARTICLES.has(f[j]) && !isCap(tok(j).s)) {
          const k = j + dir;
          if (k < 0 || k >= W.length) continue;
          if (!/^(?:[  ]{1,2}|['’])$/.test(dir === 1 ? sepBefore(k) : sepBefore(j))) continue;
          j = k;
        }
        const tj = isWord(j) ? tok(j).s : "";
        // Initiale collée à un nom : « K. Benali ».
        if (tj.length === 1 && isCap(tj) && verdict[j] === null && !HONORIFIC_ABBR.has(f[j])) {
          verdict[j] = "prenom"; changed = true; continue;
        }
        // À gauche, un mot du dictionnaire en tête de phrase n'est pas aspiré
        // (« Selon Pierre ») — sauf si c'est lui-même un prénom ou un patronyme.
        // (« Horizon Immobilier », lui, est aspiré en entier : « Horizon » n'est pas un mot d'amorce.)
        if (dir === -1 && initial[j] && isKnownWord(tj) && !N.nomColl.has(f[j]) && !N.prenoms.has(f[j]) &&
            (STARTERS.has(f[j]) || COMMON_START.has(f[j]) || FUNCTION_WORDS.has(f[j]) || capSafe(f[j]))) continue;
        if (glueable(j, dir === 1 && verdict[wi] === "prenom")) {
          verdict[j] = verdict[wi] === "societe" ? "societe" : "nom";
          changed = true;
        }
      }
    }
  }

  // 6) Réécriture.
  for (let wi = 0; wi < W.length; wi++) {
    const v = verdict[wi];
    if (!v) continue;
    const t = tok(wi);
    if (v === "autre") stats.unknown++;
    else if (v !== "reference") stats.names++;
    t.s = emit(v, t.s);
  }
  text = toks.map((t) => t.s).join("");

  // 6b) Second passage : un nom codé plus loin dans le texte (« M. Moulin »)
  //     recode ses autres occurrences capitalisées (« Moulin a signé »).
  if (book && !mask && stats.names) {
    const known = knownValueMatcher(book);
    if (known) text = outsideCodes(text, (seg) => { const r = known(seg); stats.replaced += r.replaced; return r.text; });
  }

  // 7) Les valeurs mises à l'abri reviennent telles quelles.
  if (shelter.length) text = text.replace(/(\d+)/g, (_, i) => shelter[Number(i)]);
  return { text, ...stats };
}

/* Part des mots codés : au-delà d'un tiers, le texte n'est probablement pas
   en français (le verrou code tout ce qu'il ne connaît pas) — on le DIT. */
export function codedRatio(original, coded) {
  const count = (s) => (String(s).match(/\p{L}{2,}/gu) || []).length;
  const n = count(original);
  if (!n) return 0;
  const codes = (String(coded).match(new RegExp(CODE_SRC, "gu")) || []).length + (String(coded).match(/•••/g) || []).length;
  return Math.min(1, codes / n);
}

/* ------------------------------------------------ feuilles de calcul ----- */

/* Passe le verrou sur les cellules d'une feuille, et NETTOIE toutes les
   cellules de ce qui ne se voit pas mais voyage avec le fichier : formules
   (« =HYPERLINK("mailto:…") »), liens, commentaires, texte enrichi. Un
   nombre entier de 9 chiffres ou plus est un identifiant (téléphone stocké
   comme nombre, compte), pas un montant : il passe au verrou.
   `skipCols` / `skipRows` : cellules déjà codées en entier (mode tableau).
   Mute `ws` en place et renvoie les stats. */
export function strictSheet(ws, XLSX, { book, extra, excludes, skipCols, skipRows } = {}) {
  const stats = { replaced: 0, newCodes: 0, byType: {}, names: 0, unknown: 0, cells: 0 };
  if (!ws || !ws["!ref"]) return stats;
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const cell = ws[addr];
    if (!cell) continue;
    // Nettoyage systématique, cellule codée ou non.
    if (cell.f || cell.l || cell.c || cell.r || cell.h || cell.F) {
      ws[addr] = { t: cell.t, v: cell.v, ...(cell.w !== undefined ? { w: cell.w } : {}), ...(cell.z ? { z: cell.z } : {}) };
    }
    const { c, r } = XLSX.utils.decode_cell(addr);
    if (skipCols && skipCols.has(c)) continue;
    if (skipRows && skipRows.has(r)) continue;
    const cur = ws[addr];
    let res = null;
    if (cur.t === "s" || cur.t === "str") {
      const t = cur.w !== undefined ? String(cur.w) : String(cur.v == null ? "" : cur.v);
      if (!t.trim()) continue;
      res = strictCode(t, { book, extra, excludes });
    } else if (cur.t === "n" && Number.isInteger(cur.v) && Math.abs(cur.v) >= 1e8) {
      res = strictCode(String(Math.abs(cur.v)), { book, extra, excludes });
    } else {
      continue;
    }
    if (!res || !res.replaced) continue;
    ws[addr] = { t: "s", v: res.text };
    stats.cells++;
    stats.replaced += res.replaced;
    stats.newCodes += res.newCodes;
    stats.names += res.names;
    stats.unknown += res.unknown;
    for (const k of Object.keys(res.byType)) stats.byType[k] = (stats.byType[k] || 0) + res.byType[k];
  }
  // Second passage : un nom codé dans une cellule (« M. Moulin ») recode ses
  // occurrences capitalisées restées en clair ailleurs dans la feuille.
  const known = book && stats.names ? knownValueMatcher(book) : null;
  if (known) {
    for (const addr of Object.keys(ws)) {
      if (addr[0] === "!") continue;
      const cell = ws[addr];
      if (!cell || (cell.t !== "s" && cell.t !== "str")) continue;
      const { c, r } = XLSX.utils.decode_cell(addr);
      if ((skipCols && skipCols.has(c)) || (skipRows && skipRows.has(r))) continue;
      const t = String(cell.v == null ? "" : cell.v);
      const res = outsideCodes(t, (seg) => { const x = known(seg); stats.replaced += x.replaced; return x.text; });
      if (res !== t) ws[addr] = { t: "s", v: res };
    }
  }
  return stats;
}
