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
// v2.26 — LE MODE ANGLAIS. Un verrou qui ne connaît que le français code
// tout l'anglais : mesuré le 25/10/2026 sur le jumeau d'un coffre de notes
// (4XOS), « and », « the », « this », « legal », « Founder », « Morocco »
// devenaient des codes, et une note en anglais arrivait chez Claude en
// bouillie. Un paragraphe (ou un texte) qui est manifestement de l'anglais —
// ses mots-outils le disent, cf. englishBlocks() — passe au verrou avec, EN
// PLUS du français : les mots anglais courants (SCOWL, lexique/en.json.gz),
// les patronymes américains qui sont aussi des mots (Census 2010 : Smith,
// Baker…) et les prénoms (Census 1990 : Mark, Grace…), et les mots-outils,
// pays, langues, jours et mois anglais. Les mêmes règles s'appliquent : un
// mot capitalisé au fil d'une phrase reste codé, un nom derrière « Mr » ou
// un prénom aussi. Un texte français n'est pas touché : sans assez de
// mots-outils anglais, rien ne change.
//
// Ce module ne décide PAS de ce qui sort vers le modèle : c'est le rôle de
// sortie.js (le verrou de sortie, dernier filet sur chaque réponse d'outil).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { TYPES, codeFor, codeDocumentText, newCodebook, normFor, HEADING_WORDS, isCardNumber, codePrefixes, typeById } from "./engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const LEXICON_FILE = path.join(here, "..", "lexique", "fr.txt.gz");
export const NAMES_FILE = path.join(here, "..", "lexique", "noms.json.gz");
export const ENGLISH_FILE = path.join(here, "..", "lexique", "en.json.gz");

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
dé-anonymiser nanomizer ai4x hidden hidden-tokens hiddentokens tokens token appli ocr scan scans mcp
imei imsi iccid msisdn puk pin sim esim mac siret siren rcs rg parquet pourvoi police sinistre chèque cheque bic swift
amo cnops ramed anam inpe rpps adeli ipp nip nda cim ccam ngap dci chu orl irm ald ansm oms cpam
dgi simpl cgnc ifrs fec dgfip cimr smig smic cdi cdd rtt cse dpae matricule badge tva
tf ancfcc tadbirnot adoul adouls adoulaire moulkia vefa tpi tnb cgi cdg réquisition requisition
memo mémo mémos courriel courriels pv cr janv fevr fev avr juil oct nov
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
/* Toutes les villes connues du verrou : le test de réidentification
   (reidentification.js) les compte comme indices de lieu. */
export const CITY_WORDS = new Set([...MAJOR_CITIES, ...CITIES]);

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
nanomizer hidden ai4x iphone android windows macos
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
const MONTHS = new Set(words(`
janvier fevrier mars avril mai juin juillet aout septembre octobre novembre decembre
janv fevr fev avr juil sept oct nov dec
`));
// Les abréviations (« Févr. », « Avr. ») : vu le 21/10/2026 dans un tableau de
// ventes mensuelles, codées NOM-002 et NOM-003 — février et avril n'étaient plus
// distinguables. Elles suivent la même règle que le mois en toutes lettres.

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

/* Formes juridiques écrites en tête (« SARL Garage Lefèvre ») : restent en
   clair — elles disent à l'IA qu'il s'agit d'une société — et annoncent le nom. */
const LEGAL_FORM_WORDS = new Set(words("sci sarl sas sasu sa snc eurl gie selarl selas scp sarlau"));
/* Fin de raison sociale après « & » : « Fontaine & Associés », « Martin & Fils ». */
const COMPANY_SUFFIX = new Set(words("associes associe associees fils freres soeurs cie compagnie partenaires partners co"));

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

export const LEGAL_FORMS_SRC =
  "S\\.?A\\.?R\\.?L\\.?(?:\\s*A\\.?U\\.?)?|SARLAU|SASU|S\\.A\\.S\\.?|SAS|SNC|GIE|SCI|SCP|SELARL|SELAS|EURL|" +
  "S\\.A\\.|SA|Inc\\.?|Ltd\\.?|LLC|GmbH|SpA|BV|NV|AG|PLC";

/* ------------------------------------------------- listes anglaises (v2.26) */

/* Mots-outils anglais : jamais des noms, même capitalisés au fil d'une phrase
   (« Legal Entity And Brand »). Ni « will » ni « may » : ce sont aussi des
   prénoms (Will, May), qui restent codés capitalisés. */
const EN_FUNCTION_WORDS = new Set(words(`
the a an and or nor of to in on at by for from with without within into onto upon over under about above below
between among through throughout during before after since until till while as than then that this these those
there here where when what which who whom whose why how if whether because although though unless whereas
is are was were be been being am do does did done doing have has had having shall should would could can cannot
might must ought not no yes it its itself they them their theirs themselves we us our ours ourselves you your
yours yourself yourselves he him his himself she her hers herself i me my mine myself one some any all each every
both either neither other another such own same more most much many few less least very too also just only even
again already ever never always often per via so yet but however therefore thus hence
`));

/* Déterminants : « the Client », « our Founder » sont des termes, pas des
   personnes — sauf un prénom ou un patronyme connu (« the Smith account »). */
const EN_DETERMINERS = new Set(words(`
the a an this that these those my your his her its our their each every any some no another other such either
neither whose both all
`));

/* Mots anglais absents de SCOWL : morceaux de contractions (« isn't »,
   « we'll »), abréviations du métier. */
const EN_EXTRA = words(`
isn aren wasn weren doesn didn hasn haven hadn couldn wouldn shouldn mustn needn ain shan mightn ll ve re d s t m o
eg ie etc vs approx asap fyi aka faq diy hr pr qa ux ui seo okr okrs kpi kpis ceo cto cfo coo cmo cpo vp svp evp
hq llc ltd inc corp plc co jr sr am pm uk us usa eu uae gdpr ai ml llm llms gpt saas api apis sdk url urls pdf
csv md txt json yaml html faq faqs roi b2b b2c crm erp sme smes ngo ngos onboarding offboarding workflow workflows
dataset datasets email emails e-mail ok
`);

/* Mots qui portent une majuscule en anglais sans être des noms de personne :
   pays, nationalités, langues, villes, jours, mois, outils. Un « John
   French » reste codé par le prénom. */
const EN_CAP_SAFE = words(`
morocco moroccan moroccans france french britain british england english scotland scottish wales welsh ireland
irish europe european europeans america american americans canada canadian spain spanish italy italian germany
german portugal portuguese belgium belgian switzerland swiss netherlands dutch africa african asia asian china
chinese japan japanese india indian arab arabs arabic arabia saudi emirates qatar egypt egyptian tunisia
tunisian algeria algerian senegal senegalese mauritania nigeria kenya brazil mexico russia russian turkey turkish
ukraine lebanon latin hebrew amazigh berber darija tamazight
london york brussels geneva lisbon madrid rome berlin amsterdam dubai doha riyadh cairo algiers lagos nairobi
new monday tuesday wednesday thursday friday saturday sunday
january february march july september october november december
christmas easter ramadan eid
government ministry parliament congress senate council commission court supreme university internet web
google microsoft apple amazon openai anthropic linkedin whatsapp youtube excel powerpoint outlook gmail zoom
slack notion github chatgpt iphone android windows macos markdown
`);

/* Mois qui sont aussi des prénoms : la règle du mois français (« Avril
   2024 » en clair, « Avril » seul codé) vaut pour eux. */
const EN_MONTHS = words("april may june august jan feb mar apr jun jul aug sep sept oct nov dec");

/* Titres, rôles, libellés et déclencheurs anglais : mêmes règles que leurs
   équivalents français (« Mr Carter », « our client Atlas », « From: … »). */
const EN_HONORIFIC_WORDS = words("sir lord lady dame madam mister miss mrs ms prof");
const EN_ROLE_TITLES = words(`
director manager ceo cto cfo coo founder cofounder co-founder partner lawyer attorney solicitor barrister counsel
judge notary accountant auditor consultant adviser advisor officer chairman chairwoman chairperson president
secretary treasurer colleague client customer supplier vendor contractor employee intern engineer developer
analyst broker banker doctor nurse professor student witness tenant landlord owner buyer seller investor
shareholder
`);
const EN_PERSON_LABELS = words(`
name names contact client customer to from cc bcc attn attention author owner founder director manager signed
signatory witness tenant landlord buyer seller employee applicant candidate recipient sender
`);
const EN_COMPANY_TRIGGERS = words("company firm group bank agency studio laboratory clinic hotel restaurant foundation association holding holdings corporation");

/* Mots qui ouvrent une phrase devant un nom sans en faire partie
   (« Dear John », « Call John Carter ») : jamais aspirés par le nom. */
const EN_STARTERS = words(`
dear hi hello hey thanks thank regards cheers according regarding re subject see per with from to about after
before since when while if call email mail ask meet tell send remind invite ping text contact follow check met
spoke talked told called emailed sent asked invited introduce introduced update updated note notes yesterday
today tomorrow
`);

const EN_EXTRA_SET = new Set(EN_EXTRA.map(fold));
const EN_MODALS = new Set(words("will would may might can could shall should must"));

const EN_ABBREV = words("mr mrs ms dr prof st jr sr inc ltd co corp vs etc eg ie approx no fig vol dept est");

/* Repérage de la langue : des mots-outils sans ambiguïté (ni « on », ni
   « a », ni « but », qui sont aussi français). */
const EN_MARKERS = new Set(words(`
the and of to is are was were that this with for from we you they it its our their have has had be been will
would can could should not which who what there these those into about after before because than then them
your his him she he if when where while been being does did
`));
const FR_MARKERS = new Set(words(`
le la les des et est sont que qui pour dans une un du au aux sur pas avec ce cette il elle nous vous ils elles
ont mais ou par se sa son ses leur leurs ete etre avoir etait sera aussi tres
`));

/* ---------------------------------------------------------------- lexique - */

let LEX = null;
const SOLDER_STOP = new Set(words("je tu il elle on nous vous ils elles t moi toi lui le la les leur leurs y en ce"));
let PROVIDED = null;

/* Pour l'appli web (paquet navigateur, cf. scripts/build-web-verrou.mjs) : le
   dictionnaire et les listes de noms arrivent DÉJÀ décompressés, embarqués
   dans le fichier de l'appli — pas de disque, pas de réseau. Le connecteur,
   lui, ne l'appelle jamais : il lit lexique/ sur le disque. */
export function fournirLexique({ mots, noms, anglais }) {
  PROVIDED = { mots: String(mots), noms: typeof noms === "string" ? JSON.parse(noms) : noms,
    anglais: anglais == null ? null : typeof anglais === "string" ? JSON.parse(anglais) : anglais };
  LEX = null;
  NAMES = null;
  EN = undefined;
  NAMES_EN = null;
  PROFILES = null;
}

/* Chargé une fois (~130 ms). S'il manque, on REFUSE de travailler : un
   verrou sans dictionnaire laisserait passer n'importe quoi. */
export function lexicon() {
  if (LEX) return LEX;
  let raw;
  try { raw = PROVIDED ? PROVIDED.mots : zlib.gunzipSync(fs.readFileSync(LEXICON_FILE)).toString("utf8"); }
  catch {
    throw new Error(
      "Dictionnaire du verrou introuvable dans l'extension (lexique/fr.txt.gz). Par sécurité, rien n'est " +
      "anonymisé sans lui. Réinstalle le connecteur."
    );
  }
  const set = new Set();
  for (const w of raw.split("\n")) if (w) set.add(fold(w));
  // v2.26 — l'orthographe rectifiée (1990) soude des composés que le
  // dictionnaire n'a qu'avec un trait d'union : « plateforme » (plate-forme),
  // « weekend », « portemonnaie ». Vu le 25/10/2026 : « la plateforme
  // d'apprentissage » sortait « la CODE-002 d'apprentissage ». La forme soudée
  // compte comme un mot — sauf un verbe suivi de son pronom (« a-t-elle »,
  // « est-elle » ne donnent ni « atelle » ni « estelle »). Le pluriel soudé
  // prend un s final (« plateformes », là où le dictionnaire dit « plates-formes »).
  const joined = [];
  for (const w of set) {
    if (!w.includes("-")) continue;
    const parts = w.split("-");
    if (parts.every((p) => /^\p{L}+$/u.test(p)) && !parts.some((p) => SOLDER_STOP.has(p))) {
      const j = parts.join("");
      joined.push(j);
      if (!/[sxz]$/.test(j)) joined.push(j + "s");
    }
  }
  for (const w of joined) set.add(w);
  for (const w of EXTRA_SET) set.add(w);
  LEX = set;
  return LEX;
}

export function lexiconSize() {
  return lexicon().size;
}

/* Mot du dictionnaire (insensible aux accents et à la casse). Un mot composé
   est connu si toutes ses parties le sont (« sous-traitant », « a-t-il »).
   `en` : le dictionnaire anglais compte aussi (mode anglais, v2.26). */
export function isKnownWord(word, en = false) {
  const L = lexicon();
  const E = en ? english() : null;
  const has = (p) => L.has(p) || (E !== null && E.level.has(p));
  const f = fold(word);
  if (has(f)) return true;
  if (f.includes("-")) return f.split("-").every((p) => p && (has(p) || /^\d+$/.test(p)));
  return false;
}

/* v2.26 — dictionnaire anglais (lexique/en.json.gz, cf. SOURCES.md) : chaque
   mot avec sa taille SCOWL (10 = parmi les mille plus courants … 50), plus
   les listes de noms du Census. Contrairement au français, son absence ne
   bloque rien : sans lui, l'anglais est traité comme avant (sur-codé, jamais
   sous-codé). Renvoie null s'il manque. */
let EN;
export function english() {
  if (EN !== undefined) return EN;
  let data = null;
  try {
    data = PROVIDED ? PROVIDED.anglais : JSON.parse(zlib.gunzipSync(fs.readFileSync(ENGLISH_FILE)).toString("utf8"));
  } catch { data = null; }
  if (!data || !data.mots) { EN = null; return EN; }
  const level = new Map();
  for (const [t, list] of Object.entries(data.mots)) for (const w of String(list).split(" ")) if (w) level.set(w, +t);
  for (const w of EN_EXTRA) if (!level.has(fold(w))) level.set(fold(w), 50);
  for (const w of EN_FUNCTION_WORDS) level.set(w, 10);
  EN = { level, prenoms: Object.keys(data.prenoms || {}), nomsCollisions: data.nomsCollisions || {} };
  return EN;
}

/* Un mot anglais COURANT (SCOWL ≤ 35 : les ~40 000 mots les plus usuels) :
   en minuscules, jamais pris pour un nom (« we will call », « John Carter
   said »), même quand c'est aussi un prénom ou un patronyme. Un mot plus
   rare (« john ») garde les règles du français. */
function commonEnglish(x) {
  const E = english();
  const t = E && E.level.get(x);
  return t !== undefined && t <= 35;
}

let NAMES = null;

/* Listes de noms (INSEE, cf. lexique/SOURCES.md). Même règle que le
   dictionnaire : sans elles, on refuse de travailler. */
export function names() {
  if (NAMES) return NAMES;
  let data;
  try { data = PROVIDED ? PROVIDED.noms : JSON.parse(zlib.gunzipSync(fs.readFileSync(NAMES_FILE)).toString("utf8")); }
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

/* v2.26 — les listes du mode anglais : celles du français, PLUS les prénoms
   et les patronymes-mots du Census. Un patronyme porté par ≥ 25 000
   Américains est codé même en tête de phrase (« Smith called »), sauf s'il
   est parmi les mots les plus courants de la langue (SCOWL 10 : « Brown »,
   « Price », « Best regards ») — la règle de COMMON_START, en anglais.
   null sans dictionnaire anglais. */
let NAMES_EN = null;
export function namesEn() {
  if (NAMES_EN) return NAMES_EN;
  const E = english();
  if (!E) return null;
  const F = names();
  const prenoms = new Set([...F.prenoms, ...E.prenoms]);
  const nomColl = new Set(F.nomColl);
  const nomHigh = new Set(F.nomHigh);
  for (const [k, n] of Object.entries(E.nomsCollisions)) {
    nomColl.add(k);
    if (n >= 25000 && (E.level.get(k) || 99) > 10) nomHigh.add(k);
  }
  const capSafe = new Set([...F.capSafe, ...EN_CAP_SAFE]);
  for (const w of [...EN_FUNCTION_WORDS, ...EN_CAP_SAFE, ...EN_DETERMINERS, ...EN_HONORIFIC_WORDS, ...EN_ROLE_TITLES,
    ...EN_STARTERS]) { prenoms.delete(w); nomColl.delete(w); nomHigh.delete(w); }
  const L = lexicon();
  const prenomColl = new Set([...prenoms].filter((p) => L.has(p) || E.level.has(p)));
  NAMES_EN = { prenoms, prenomColl, nomColl, nomHigh, capSafe };
  return NAMES_EN;
}

/* Les jeux de mots d'une langue, pour le mot à mot de strictCode : en mode
   anglais, chaque liste française est complétée de son équivalent anglais. */
const union = (a, b) => new Set([...a, ...b]);
let PROFILES = null;
function profile(en) {
  if (!PROFILES) {
    const fr = { en: false, N: names(), det: DETERMINERS, func: FUNCTION_WORDS, starters: STARTERS, months: MONTHS,
      honorWords: HONORIFIC_WORDS, roles: ROLE_TITLES, labels: PERSON_LABELS, company: COMPANY_TRIGGERS, abbrev: ABBREV };
    const NE = namesEn();
    PROFILES = {
      fr,
      en: !NE ? fr : {
        en: true, N: NE, det: union(DETERMINERS, EN_DETERMINERS), func: union(FUNCTION_WORDS, EN_FUNCTION_WORDS),
        starters: union(STARTERS, EN_STARTERS), months: union(MONTHS, EN_MONTHS),
        honorWords: union(HONORIFIC_WORDS, EN_HONORIFIC_WORDS), roles: union(ROLE_TITLES, EN_ROLE_TITLES),
        labels: union(PERSON_LABELS, EN_PERSON_LABELS), company: union(COMPANY_TRIGGERS, EN_COMPANY_TRIGGERS),
        abbrev: union(ABBREV, EN_ABBREV),
      },
    };
  }
  return en ? PROFILES.en : PROFILES.fr;
}

/* Le texte est-il de l'anglais ? On compte les mots-outils sans ambiguïté :
   au moins trois anglais, et deux fois plus que de français. */
function markerCounts(s) {
  let en = 0, fr = 0;
  for (const m of String(s).matchAll(/\p{L}+/gu)) {
    const w = fold(m[0]);
    if (EN_MARKERS.has(w)) en++;
    else if (FR_MARKERS.has(w)) fr++;
  }
  return { en, fr };
}
const englishByCounts = ({ en, fr }) => en >= 3 && en >= 2 * fr;
export function isEnglishText(s) {
  return english() !== null && englishByCounts(markerCounts(s));
}

/* Langue de chaque paragraphe (blocs séparés par une ligne vide) : un
   paragraphe assez long pour en juger (≥ 3 mots-outils) a la sienne ; un
   titre, une ligne « Founder: … », prend celle du texte entier. Renvoie
   (position) → vrai si anglais. */
export function englishBlocks(text) {
  if (english() === null) return () => false;
  const whole = englishByCounts(markerCounts(text));
  const blocks = [];
  const rx = /\n[ \t]*\n/g;
  let last = 0, m;
  const push = (a, b) => {
    const c = markerCounts(text.slice(a, b));
    blocks.push({ a, b, en: c.en + c.fr >= 3 ? englishByCounts(c) : whole });
  };
  while ((m = rx.exec(text))) { push(last, m.index); last = m.index + m[0].length; }
  push(last, text.length);
  return (at) => {
    for (const b of blocks) if (at < b.b || b === blocks[blocks.length - 1]) return b.en;
    return whole;
  };
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

const BIRTH_MONTHS = "janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre";
const BIRTH_LEAD = "(?<![\\p{L}])(?:n[ée]e?s?|date\\s+de\\s+naissance|naissance)";
const BIRTH_RXS = [
  new RegExp(`(${BIRTH_LEAD}[ \\u00A0]*(?::[ \\u00A0]*)?(?:(?:le|du)[ \\u00A0]+)?)` +
    `((?:1er|\\d{1,2})[ \\u00A0]+(?:${BIRTH_MONTHS})[ \\u00A0]+\\d{4}|\\d{1,2}[/.\\-]\\d{1,2}[/.\\-](?:\\d{4}|\\d{2}))(?![\\p{N}])`, "giu"),
  new RegExp(`((?<![\\p{L}])n[ée]e?s?[ \\u00A0]+en[ \\u00A0]+)(\\d{4})(?![\\p{N}])`, "giu"),
];

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
  // v2.15 — plaque française (SIV, depuis 2009) : « AB-123-CD », « AB 123 CD ».
  // Sans ce motif, « AB-123 » partait en référence et « CD » restait en clair.
  { type: "immatriculation", rx: /(?<![\p{L}\p{N}-])[A-HJ-NP-TV-Z]{2}[-\u2010\u2011 \u00A0]?\d{3}[-\u2010\u2011 \u00A0]?[A-HJ-NP-TV-Z]{2}(?![\p{L}\p{N}-])/gu,
    check: (m) => !/(?:HT|TT)$/.test(m) },
  // Ancien format (FNI) « 1234 AB 38 » : trop proche d'autres suites, seulement
  // derrière « immatriculé(e) » / « immatriculation ».
  { type: "immatriculation", rx: /(?<=immatricul\p{L}*\s*(?::\s*)?(?:(?:sous\s+le\s+)?(?:n°|no|num[ée]ro)\s*)?)\d{1,4}[- \u00A0]?[A-Z]{1,3}[- \u00A0]?(?:\d{2}|2A|2B)(?![\p{L}\p{N}])/giu },
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
  // v2.26 — pas un chemin : dans « 1_MEMORY/30_WORK/x.md », « MEMORY/30 »
  // est un dossier suivi du numéro du suivant (« 30_WORK »), pas un n° de dossier.
  { type: "reference", rx: new RegExp(`(?<![\\p{L}\\p{N}-])[A-Z]{1,6}[-_/]${D}{2,}(?:[-_/.]${D}+)*(?![\\p{L}\\p{N}]|_\\p{L})`, "gu") },
  { type: "adresse", rx: new RegExp(ADDRESS_SRC, "gu") },
  { type: "societe", rx: new RegExp(
      "(?<![\\p{L}\\p{N}])(?:[\\p{Lu}][\\p{L}\\p{N}'’.\\-]*(?:[ \\u00A0]+(?:&|et|and)[ \\u00A0]+|[ \\u00A0]+)){0,5}" +
      "[\\p{Lu}][\\p{L}\\p{N}'’.\\-]*[ \\u00A0,]+(?:" + LEGAL_FORMS_SRC + ")(?![\\p{L}\\p{N}])", "gu") },
];

/* Une chaîne `code` = n'importe quel code de la clé (PREFIXE-NNN). Depuis la
   v2.18 la liste des préfixes bouge (règles de l'organisation) : codeSrc()
   la relit, en cache sur la version du moteur. */
let codeCache = { version: -1, src: "" };
export function codeSrc() {
  const p = codePrefixes();
  if (p.version !== codeCache.version) {
    codeCache = { version: p.version, src: `(?<![\\p{L}\\p{N}])(?:${p.list.join("|")})-\\d{3,}(?![\\p{L}\\p{N}])` };
  }
  return codeCache.src;
}
/* Figé au chargement (préfixes du moteur seuls) : préférer codeSrc(). */
export const CODE_SRC = codeSrc();

/* Applique fn aux morceaux de texte situés HORS des codes déjà posés. */
function outsideCodes(text, fn) {
  const rx = new RegExp(codeSrc(), "gu");
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
     SAUF collée à un code quand c'est aussi un nom ou un prénom de l'INSEE
     (v2.7) : « mme CODE-001 roux » — le prénom a déjà
     été codé par un passage précédent, « roux » est le nom de famille. Sans
     cette règle, recoder un texte avec une clé déjà remplie laissait passer
     un patronyme en minuscules que le premier passage avait codé (trouvé par
     le banc en mode Word : la copie d'un lot recode le même document) ;
   - un numéro est reconnu quels que soient ses séparateurs.
   L'index est construit une fois par carnet (byKey, qui contient aussi les
   ALIAS : « Transports Moreau & Fils » pour « … SAS »), puis tenu à jour par
   les seules nouvelles entrées — un lot de 10 000 cellules ne le reconstruit
   pas 10 000 fois.
   v2.26 — `{ en: true }` : l'index du MODE ANGLAIS. Un mot anglais y est un
   mot (remplacé seulement capitalisé), et une clé tenue avant la v2.26 n'y
   impose plus les mots courants que l'ancien verrou codait faute de les
   connaître : « and » (CODE-…), « Founder » (NOM-…) — un mot anglais courant,
   ni prénom ni patronyme, n'est pas une personne. Les autres valeurs gardent
   leur code. */
const STALE_PREFIX_RX = /^(?:NOM|PRENOM|CODE)-/;
function staleEnglishWord(v, code) {
  const s = String(v).trim();
  if (!STALE_PREFIX_RX.test(code) || !/^\p{L}+$/u.test(s)) return false;
  const x = fold(s);
  const NE = namesEn();
  if (!NE || NE.prenoms.has(x) || NE.nomColl.has(x)) return false;
  // Codé en minuscules : un « mot inconnu » de l'ancien verrou. Capitalisé :
  // seulement un mot courant (SCOWL ≤ 35), pas « Atlas ».
  return s === s.toLowerCase() ? isKnownWord(s, true) : commonEnglish(x);
}
function indexValue(ix, v, code) {
  const k = foldKey(v);
  if (k.startsWith("#")) { if (k.length >= 7 && !ix.digitMap.has(k)) ix.digitMap.set(k, code); return; }
  if (String(v).trim().length < 3) return;
  const n = (String(v).match(MATCH_TOKEN_RX) || []).length;
  if (n <= 1 && isKnownWord(v, ix.en)) {
    if (ix.en && staleEnglishWord(v, code)) return;
    if (!ix.capOnly.has(k)) ix.capOnly.set(k, code);
    return;
  }
  if (!ix.multi.has(k)) ix.multi.set(k, code);
  ix.maxWords = Math.max(ix.maxWords, Math.min(n, 12));
}

/* Déclare un alias (valeur supplémentaire pour un code existant). */
function addAlias(book, typePrefix, value, code) {
  const ak = typePrefix + "||" + normFor(typePrefix, value);
  if (book.byKey[ak]) return;
  book.byKey[ak] = code;
  for (const ix of Object.values(MATCHERS.get(book) || {})) indexValue(ix, value, code);
}

export function knownValueMatcher(book, { en = false } = {}) {
  if (!book || !book.byKey) return null;
  en = !!en && namesEn() !== null;
  const byLang = MATCHERS.get(book) || {};
  MATCHERS.set(book, byLang);
  const lang = en ? "en" : "fr";
  let ix = byLang[lang];
  if (!ix) {
    ix = { en, multi: new Map(), capOnly: new Map(), digitMap: new Map(), maxWords: 1, seen: 0 };
    for (const mk of Object.keys(book.byKey)) indexValue(ix, mk.slice(mk.indexOf("||") + 2), book.byKey[mk]);
    ix.seen = (book.entries || []).length;
    byLang[lang] = ix;
  } else if ((book.entries || []).length > ix.seen) {
    for (const e of book.entries.slice(ix.seen)) indexValue(ix, e.value, e.code);
    ix.seen = book.entries.length;
  }
  const N = en ? namesEn() : names();
  if (!ix.multi.size && !ix.capOnly.size && !ix.digitMap.size) return null;
  const codeOnly = new RegExp(`^${codeSrc()}$`, "u");
  const NEXT_TO = /^[ \u00A0]{1,2}$/;
  const once = (text) => {
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
        if (!code && n === 1) {
          const besideCode =
            (i > 0 && NEXT_TO.test(s.slice(toks[i - 1].b, toks[i].a)) && codeOnly.test(s.slice(toks[i - 1].a, toks[i - 1].b))) ||
            (i + 1 < toks.length && NEXT_TO.test(s.slice(toks[i].b, toks[i + 1].a)) && codeOnly.test(s.slice(toks[i + 1].a, toks[i + 1].b)));
          // Collé à un code : seulement un mot que l'INSEE connaît aussi comme
          // nom ou prénom (« roux », « blanc ») — pas n'importe quel mot
          // courant, sinon un texte très codé (anglais) s'effondre en cascade.
          const forms = besideCode && !(en && commonEnglish(fold(cand))) ? [cand.toLowerCase(), fold(cand)] : [];
          const nameLike = forms.some((f) => N.nomColl.has(f) || N.prenomColl.has(f));
          if (/^\p{Lu}/u.test(cand) || nameLike) code = ix.capOnly.get(k);
        }
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
  // Un second passage voit les codes posés par le premier : « amandine roux »
  // devient « CODE-001 roux », puis « CODE-001 NOM-001 ».
  return (text) => {
    const a = once(text);
    if (!ix.capOnly.size || !a.replaced) return a;
    const b = once(a.text);
    return { text: b.text, replaced: a.replaced + b.replaced };
  };
}

/* ---------------------------------------------------------- tokenisation - */

let tokenCache = { version: -1, rx: null };
function tokenRx() {
  const v = codePrefixes().version;
  if (tokenCache.version !== v) {
    tokenCache = { version: v, rx: new RegExp(
      `(?<code>${codeSrc()})` +
      "|(?<mixed>[\\p{L}\\p{N}]*(?:\\p{L}\\p{N}|\\p{N}\\p{L})[\\p{L}\\p{N}]*)" +
      "|(?<word>\\p{L}+(?:-\\p{L}+)*)" +
      "|(?<num>\\p{N}+)",
      "gu"
    ) };
  }
  return tokenCache.rx;
}

const UNIT_RX = /^(?:\d+(?:er|ère|ere|re|e|è|ème|eme|nd|nde|h|h\d{1,2}|min|mn|s|kg|g|mg|km|m|cm|mm|m2|m²|m3|l|ml|cl|ko|mo|go|to|kb|mb|gb|tb|ht|ttc|x|j|jrs|mois|an|ans|k|ke|k€|m€|dh|dhs|mad|eur|usd|€|pt|pts|px|dpi|g|v|w|kw|kwh|mw|hz|ghz|mhz)|[a-z]\d|[tqs][1-4]|\d[a-z]|mp[34]|b2[bc]|p2p|h24|covid-?19|iso\d{3,5}|[34]g|5g|v\d{1,2})$/i;

function tokenize(text) {
  const toks = [];
  let last = 0;
  const TOKEN_RX = tokenRx();
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
  // v2.26 — la langue : `opts.langue` ("fr" | "en") l'impose ; sinon elle se
  // lit dans le texte (un nom de fichier, trop court pour en juger, reste en
  // français). `enDoc` vaut pour la clé ; le mot à mot juge par paragraphe.
  const langue = opts.fileName ? "fr" : opts.langue;
  const enDoc = english() !== null && (langue === "en" || (langue !== "fr" && isEnglishText(text)));

  const labelOf = (typeId) => typeById(typeId).label;
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
  // 1) Valeurs demandées explicitement (valeurs_a_coder) et règles « coder »,
  //    AVANT les abris : coder l'emporte sur laisser en clair, même quand un
  //    terme laissé en clair commence une valeur à coder (« DGI » dans
  //    « DGI-2026-118877 », vu avec le pack expertise comptable).
  const extras = (opts.extra || []).filter((e) => e && String(e.value).trim().length >= 2)
    .sort((a, b) => String(b.value).length - String(a.value).length);
  for (const e of extras) {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])${escRx(e.value)}(?![\\p{L}\\p{N}])`, "giu");
    text = outsideCodes(text, (seg) => seg.replace(rx, () => emit(e.type || "autre", String(e.value).trim())));
  }

  for (const v of excludes) {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])${escRx(v)}(?![\\p{L}\\p{N}])`, "giu");
    text = outsideCodes(text, (seg) => seg.replace(rx, (m) => { shelter.push(m); return `${shelter.length - 1}`; }));
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
      return r.text.replace(new RegExp(codeSrc(), "gu"), "•••"); // codes neufs du segment seulement
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

  // 2c) Date de naissance (v2.15) : « né le 12 avril 1981 », « née le
  //     03/07/1985 », « Date de naissance : 1er mars 1979 », « né en 1990 ».
  //     Codée d'office (NAISS-…, décodée dans la réponse) : c'est le
  //     quasi-identifiant le plus fort. Le libellé reste lisible ; les
  //     autres dates (faits, échéances) aussi, l'IA en a besoin.
  for (const rx of BIRTH_RXS) {
    text = outsideCodes(text, (seg) => seg.replace(rx, (m, pre, d) => pre + emit("naissance", d)));
  }

  // 3) Ce que la clé connaît déjà garde SON code (même entité = même code,
  //    d'un fichier et d'une colonne à l'autre).
  if (book && !mask) {
    const known = knownValueMatcher(book, { en: enDoc });
    if (known) text = outsideCodes(text, (seg) => { const r = known(seg); stats.replaced += r.replaced; return r.text; });
  }

  // 4) Mot à mot.
  const enAt = langue === "fr" || english() === null ? () => false : langue === "en" ? () => true : englishBlocks(text);
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
  // Les listes de la langue de chaque mot (v2.26) : le français, ou le
  // français + l'anglais dans un paragraphe en anglais.
  const PW = W.map((i) => profile(enAt(toks[i].at)));
  const capSafeOf = (P, x) => P.N.capSafe.has(x) || EXTRA_SET.has(x) || (P.en && EN_EXTRA_SET.has(x));
  // Un mot anglais courant, en minuscules dans un paragraphe anglais, n'est
  // jamais un morceau de nom (« John Carter said », « we will call »).
  const lowerWord = (wi) => PW[wi].en && commonEnglish(f[wi]);
  const modal = (wi) => PW[wi].en && EN_MODALS.has(f[wi]);
  const SPACE = /^[  ]{1,3}$/;

  // Une ligne entièrement en MAJUSCULES est un intitulé ; un mot en
  // majuscules au milieu d'une ligne en minuscules est un nom (« contre
  // HORIZON IMMOBILIER »).
  const lineHasLower = (() => {
    const flags = [];
    let pos = 0;
    for (const line of text.split("\n")) {
      flags.push({ a: pos, b: pos + line.length, lower: /\p{Ll}/u.test(line.replace(new RegExp(codeSrc(), "gu"), "")) });
      pos += line.length + 1;
    }
    return (at) => (flags.find((l) => at >= l.a && at <= l.b) || { lower: true }).lower;
  })();

  // Début de phrase (ou de cellule, de ligne, après « : »).
  const initial = W.map((_, wi) => {
    if (wi === 0) return true;
    const sep = sepBefore(wi);
    if (/[\n\t«“"(\[•:;|—–]/.test(sep) || /^\s*[-*]\s/.test(sep) || /[!?…]/.test(sep)) return true;
    if (/\.\s*$/.test(sep)) {
      const prev = tok(wi - 1);
      return !(prev.k === "word" && (PW[wi - 1].abbrev.has(f[wi - 1]) || prev.s.length === 1));
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
    const P = PW[wi];
    const N = P.N;
    const { det: DETERMINERS, func: FUNCTION_WORDS, months: MONTHS, roles: ROLE_TITLES, labels: PERSON_LABELS,
      company: COMPANY_TRIGGERS, honorWords: HONORIFIC_WORDS } = P;
    const capSafe = (y) => capSafeOf(P, y);
    const known = isKnownWord(w, P.en);
    const sep = sepBefore(wi);
    const px = wi > 0 ? f[wi - 1] : "";
    const prevWord = isWord(wi - 1);
    const prevTok = prevWord ? tok(wi - 1).s : "";
    const firstName = x.split("-").every((p) => N.prenoms.has(p));
    // « la présente Convention », « l'autre Partie » : l'adjectif compte comme
    // déterminant s'il est en minuscules ; « Nouvelle Vague Production », non.
    const det = prevWord && (DETERMINERS.has(px) || (PRE_NOUN.has(px) && !isCap(prevTok))) && (SPACE.test(sep) || /^['’]$/.test(sep));
    const detPlural = det && PLURAL_DET.has(px);
    // « the Client » est un terme ; « the Smith account », un nom (v2.26).
    const detName = det && P.en && (N.prenoms.has(x) || N.nomColl.has(x));

    // v2.26 — un dossier numéroté d'un chemin (« 1_MEMORY/30_WORK ») : un mot
    // du dictionnaire, français ou anglais, n'y est pas un nom. « 30_BENALI »
    // reste codé, comme « 30_SMITH » (les listes de noms anglaises comptent
    // aussi dans un texte français).
    const NP = namesEn() || N;
    if (wi > 0 && tok(wi - 1).k === "num" && sep === "_" && isKnownWord(w, english() !== null) &&
        !NP.prenoms.has(x) && !NP.nomColl.has(x)) continue;
    // Un mot-outil anglais capitalisé (« Legal Entity And Brand ») n'est pas un nom.
    if (P.en && EN_FUNCTION_WORDS.has(x)) continue;
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
        !HONORIFIC_WORDS.has(x) && !HONORIFIC_ABBR.has(x) && !DETERMINERS.has(x) && !FUNCTION_WORDS.has(x) &&
        !COMPANY_TRIGGERS.has(x)) { verdict[wi] = nameLike("prenom"); continue; }
    //   Un titre juste après le libellé (« Contre : M. Garnier ») n'est pas le
    //   nom : c'est le mot suivant, par la règle du titre de civilité.

    if (isCap(w)) {
      // Suite d'un nom d'entreprise : « Société Maghreb Distribution ».
      if (prevWord && verdict[wi - 1] === "societe" && SPACE.test(sep) && !capSafe(x)) { verdict[wi] = "societe"; continue; }
      if (w.length === 1 || ROMAN_RX.test(w)) continue;               // initiale isolée ; « II. »
      if (isAllCaps(w)) {
        if (capSafe(x) || FUNCTION_WORDS.has(x) || HEADING_WORDS.has(x) || LEGAL_FORM_WORDS.has(x)) continue;
        if (!known) { verdict[wi] = nameLike("prenom"); continue; }
        const inText = lineHasLower(t.at);
        if (N.nomColl.has(x) && (inText || N.nomHigh.has(x))) { verdict[wi] = "nom"; continue; }
        if (N.prenomColl.has(x) && inText) { verdict[wi] = "prenom"; continue; }
        if (inText) { verdict[wi] = "nom"; continue; }                // mot en majuscules dans une phrase
        continue;                                                      // intitulé en majuscules
      }
      if (MONTHS.has(x)) {
        // « Avril 2024 », mais aussi « Avr. 2024 » : le point de l'abréviation
        // ne sépare pas le mois de son année.
        const nextIsNum = wi + 1 < W.length && tok(wi + 1).k === "num" && /^\.?[  ]+$/.test(sepBefore(wi + 1));
        if (!nextIsNum && !(initial[wi] && !isWord(wi + 1))) verdict[wi] = "nom";
        continue;
      }
      if (capSafe(x)) continue;
      // Nom de famille au pluriel : « chez les Rousseau », « les Bourgeois ».
      if (detPlural && (N.nomColl.has(x) || N.prenoms.has(x) || (!known && !/[sx]$/.test(x)))) { verdict[wi] = "nom"; continue; }
      if (det && !detName) { if (!known) verdict[wi] = nameLike("prenom"); continue; }
      if (firstName) { verdict[wi] = "prenom"; continue; }
      if (!known) { verdict[wi] = "nom"; continue; }
      // Mot d'en-tête de tableau ou d'intitulé (« Pièce Émetteur Date »,
      // « Montant Échéance ») : un libellé, pas un nom — v2.15.1, la ligne
      // d'en-tête d'un tableau extrait d'un PDF codait « Émetteur » et « Date ».
      if (HEADING_WORDS.has(x) && !N.nomColl.has(x) && !N.prenoms.has(x)) continue;
      // Mot du dictionnaire écrit avec une majuscule : nom ou mot ?
      if (N.nomColl.has(x) && (!initial[wi] || (N.nomHigh.has(x) && !COMMON_START.has(x)))) { verdict[wi] = "nom"; continue; }
      if (initial[wi]) continue;
      // Suite d'un terme défini : « la Date d'Effet », « les Informations Confidentielles »
      // — seulement si la chaîne est partie d'un déterminant, pas d'un début de phrase.
      if (prevWord && verdict[wi - 1] === null && isCap(prevTok) && !initial[wi - 1] &&
          (SPACE.test(sep) || /^[  ]*(?:d['’]|de[  ]+)$/.test(sep))) continue;
      if (prevWord && (px === "d" || px === "de") && wi >= 2 && isWord(wi - 2) && verdict[wi - 2] === null &&
          !initial[wi - 2] && isCap(tok(wi - 2).s) && isKnownWord(tok(wi - 2).s, P.en) && (/^['’]$/.test(sep) || SPACE.test(sep))) continue;
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
    //   En anglais, pas après un verbe modal : « we will call », « you may cook » (v2.26).
    if (N.prenomColl.has(x) && !modal(wi) && (N.nomColl.has(nextLow) || (nextLow && !isKnownWord(tok(wi + 1).s, P.en)))) { verdict[wi] = "prenom"; continue; }
    if (N.nomColl.has(x) && N.prenomColl.has(prevLow) && !modal(wi - 1)) { verdict[wi] = "nom"; continue; }
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
    const P = PW[j];
    const N = P.N;
    const { det: DETERMINERS, func: FUNCTION_WORDS, roles: ROLE_TITLES, labels: PERSON_LABELS,
      company: COMPANY_TRIGGERS, honorWords: HONORIFIC_WORDS } = P;
    const capSafe = (y) => capSafeOf(P, y);
    // En minuscules, seuls un prénom ou un patronyme connus s'agrègent.
    if (!isCap(w)) return (N.prenoms.has(x) || N.nomColl.has(x)) && !lowerWord(j);
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
        const Pj = PW[j];
        // v2.28.x — et, devant un PRÉNOM, tout mot du dictionnaire en tête de
        // phrase : « Relance Pierre Durand », « Appelle Karim », « Envoie Salma
        // le contrat » — un prénom ouvre le nom d'une personne, le mot qui le
        // précède en tête de phrase est un verbe ou une amorce, pas un patronyme
        // (vu au premier essai du verrou universel, 23/10/2026 : « Relance »
        // codé NOM-012, l'IA ne comprenait plus la demande).
        if (dir === -1 && initial[j] && isKnownWord(tj, Pj.en) && !Pj.N.nomColl.has(f[j]) && !Pj.N.prenoms.has(f[j]) &&
            (Pj.starters.has(f[j]) || COMMON_START.has(f[j]) || Pj.func.has(f[j]) || capSafeOf(Pj, f[j]) ||
             verdict[wi] === "prenom")) continue;
        if (glueable(j, dir === 1 && verdict[wi] === "prenom")) {
          verdict[j] = verdict[wi] === "societe" ? "societe" : "nom";
          changed = true;
        }
      }
    }
  }

  // 5b) Une société est UN nom (v2.15) : « Garage Lefèvre » reçoit un seul
  //     code, et le même là où il revient (« au Garage Lefèvre », sans la
  //     forme juridique), au lieu d'un code par mot — l'IA y voyait sinon deux
  //     parties. « Fontaine & Associés » aussi.
  const SPAN_SEP = /^(?:[  ]{1,2}|[  ]?-[  ]?)$/;
  const AMP_SEP = /^[  ]?&[  ]?$|^[  ]et[  ]$/;
  const WRAP_SEP = /^[  ]{0,2}\r?\n[  ]{0,2}$/;
  const spanOf = new Array(W.length).fill(-1);
  const spans = [];                                // { a, b, value }
  for (let wi = 0; wi < W.length; wi++) {
    if (verdict[wi] !== "societe") continue;
    const cur = spans.length ? spans[spans.length - 1] : null;
    if (cur && cur.b === wi - 1 && SPAN_SEP.test(sepBefore(wi))) { cur.b = wi; spanOf[wi] = spans.length - 1; continue; }
    spans.push({ a: wi, b: wi });
    spanOf[wi] = spans.length - 1;
  }
  for (const [k, sp] of spans.entries()) {
    const j = sp.b + 1;
    if (isWord(j) && spanOf[j] < 0 && isCap(tok(j).s) && AMP_SEP.test(sepBefore(j)) &&
        (COMPANY_SUFFIX.has(f[j]) || (verdict[j] && verdict[j] !== "reference"))) { sp.b = j; spanOf[j] = k; verdict[j] = "societe"; }
  }
  const textOf = (a, b) => toks.slice(W[a], W[b] + 1).map((t) => t.s).join("");
  const keyOf = (a, b) => f.slice(a, b + 1).join(" ");
  const canon = new Map();                          // clé repliée → valeur de la 1re occurrence
  for (const sp of spans) {
    sp.value = textOf(sp.a, sp.b).trim();
    if (sp.b > sp.a && !canon.has(keyOf(sp.a, sp.b))) canon.set(keyOf(sp.a, sp.b), sp.value);
  }
  if (canon.size) {
    for (const [key, value] of canon) {
      const n = key.split(" ").length;
      for (let wi = 0; wi + n <= W.length; wi++) {
        if (spanOf[wi] >= 0 || keyOf(wi, wi + n - 1) !== key) continue;
        // Une coupure de ligne (PDF, colonne étroite) ne sépare pas un nom.
        let ok = true;
        for (let q = wi; q < wi + n; q++) {
          if (!isWord(q) || spanOf[q] >= 0 || (q > wi && !SPAN_SEP.test(sepBefore(q)) && !WRAP_SEP.test(sepBefore(q)))) { ok = false; break; }
        }
        if (!ok) continue;
        spans.push({ a: wi, b: wi + n - 1, value });
        for (let q = wi; q < wi + n; q++) { spanOf[q] = spans.length - 1; verdict[q] = "societe"; }
      }
    }
    for (const sp of spans) if (sp.b > sp.a && canon.has(keyOf(sp.a, sp.b))) sp.value = canon.get(keyOf(sp.a, sp.b));
  }

  // 6) Réécriture.
  for (let wi = 0; wi < W.length; wi++) {
    const v = verdict[wi];
    if (!v) continue;
    const t = tok(wi);
    if (v === "autre") stats.unknown++;
    else if (v !== "reference") stats.names++;
    if (spanOf[wi] >= 0) {
      const sp = spans[spanOf[wi]];
      if (wi !== sp.a) continue;
      t.s = emit("societe", sp.value);
      for (let j = W[sp.a] + 1; j <= W[sp.b]; j++) toks[j].s = "";
      continue;
    }
    t.s = emit(v, t.s);
  }
  text = toks.map((t) => t.s).join("");

  // 6b) Second passage : un nom codé plus loin dans le texte (« M. Moulin »)
  //     recode ses autres occurrences capitalisées (« Moulin a signé »).
  if (book && !mask && stats.names) {
    const known = knownValueMatcher(book, { en: enDoc });
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
  const codes = (String(coded).match(new RegExp(codeSrc(), "gu")) || []).length + (String(coded).match(/•••/g) || []).length;
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
