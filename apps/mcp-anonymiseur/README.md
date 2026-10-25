# Hidden Tokens — Anonymiseur de données Ai4x (connecteur MCP local)

> **Hidden Tokens** est le nom du produit depuis la v2.14 (22/10/2026) ; **Nanomizer**
> reste le nom du moteur. L'identifiant de l'extension (`anonymiseur-ai4x`) ne change
> pas : la mise à jour remplace l'ancienne, réglages et licence compris. Le dossier
> de sortie `Anonymiseur-Ai4x/` est renommé `Hidden-Tokens/` au premier démarrage
> (cf. `server/dossier-sortie.js`) ; les formats signés internes (`.nanomizer-*`,
> `nanomizer.politique/1`, préfixes des jetons) ne changent pas.

Extension Claude Desktop (`.mcpb`) : Claude anonymise les fichiers Excel/CSV,
les PDF, les notes et les scans **sur le poste de l'utilisateur**, travaille sur
les codes (`NOM-001`…), puis dé-anonymise le résultat **sur le disque** — les
données personnelles n'entrent jamais dans la conversation.

Jumeau du moteur de l'appli web `ai4x.academy/anonymiseur-donnees`
(ai4x-website/anonymiseur-local.html) : mêmes codes, clé compatible (export
xlsx réimportable dans l'appli web). Depuis la v2.0, le connecteur code plus
que l'appli (le verrou) ; les codes restent décodables par l'appli.

## Règle de conception n°1

**Aucune valeur réelle ne remonte dans un résultat d'outil.** Depuis la v2.0,
elle tient en trois verrous empilés, chacun suffisant pour ce qu'il couvre :

1. **Le verrou** (`server/verrou.js`) — codage *fail-closed* : n'entre dans un
   aperçu que ce qui est PROUVÉ inoffensif — codes, nombres, mots du
   dictionnaire français courant (`lexique/fr.txt.gz`, 336 000 formes, MIT),
   liste blanche (institutions, pays, villes de juridiction, intitulés
   d'actes) — et, dans un paragraphe en anglais (v2.26), les mots anglais
   courants (`lexique/en.json.gz`, SCOWL). Tout le reste est codé : noms propres (même au fil d'une phrase,
   même derrière « Maître »), mots inconnus, références, identifiants. Les
   termes définis des contrats (« le Prestataire ») restent lisibles grâce au
   déterminant. Les noms qui sont AUSSI des mots (Moulin, Robin, Jacques,
   Marine…) sont repérés grâce aux listes de l'INSEE (`lexique/noms.json.gz`,
   Licence Ouverte — cf. `lexique/SOURCES.md`, régénération
   `scripts/generer-noms.mjs`). Un nom codé une fois recode ses autres
   occurrences capitalisées (second passage).
2. **Le contrôle d'aperçu** (`previewUnsafe`, index.js) — chaque cellule et
   chaque ligne montrée au modèle repasse au verrou : s'il y trouverait encore
   quelque chose à coder, elle est masquée.
3. **Le verrou de sortie** (`server/sortie.js`) — branché au SEUL point
   d'enregistrement des outils (`tool()`) : sur le texte final de chaque
   réponse, toute valeur connue de la clé redevient son code, toute forme de
   donnée sensible (email, téléphone, IBAN, identifiant long, CIN) est masquée,
   le dossier personnel devient `~`. Chemins, noms d'onglets et messages
   d'erreur compris.

Plus : les **noms de fichiers** ne sortent jamais en clair (`lister_fichiers`
les masque et donne un repère `[F-XXXXX]` — HMAC local — accepté par tous les
outils) ; les fichiers produits portent un nom **codé** ; la clé, ses archives
et les résultats décodés sont **refusés** en entrée ; le **protocole de
confidentialité** est envoyé à Claude à la connexion (`instructions` MCP).

Relecture adverse du 18/09/2026 (agent indépendant, 8 familles de fuites
trouvées, toutes corrigées et verrouillées par un test : `R1`…`R6` dans
`test/verrou.test.js`, pièges ajoutés à `test/fuite.test.js`) : patronymes qui
sont des mots, villes/mois après un prénom, téléphones `+33 (0)6…` et chiffres
non latins, désignation d'une personne par le contexte (« en blanc » → code),
sous-dossiers en clair dans l'audit, formules/liens/commentaires conservés
dans le `.xlsx`, chemins dans les messages d'erreur, `motif` comme oracle sur
les vrais noms de fichiers ; plus la lenteur (3,7 s par appel à 20 000 codes →
index incrémental, 60 000 codes en 0,2 s).

**Limite résiduelle assumée** : un mot qui est d'abord une ville, un jour, un
pays ou un rôle (« Paris », « Lundi », « France », « Juge ») employé SEUL comme
patronyme — sans prénom, sans titre, sans rôle, sans libellé, jamais en
capitales, jamais ailleurs dans le texte — reste lisible. Ambiguïté de la
langue, pas du code ; c'est une raison de plus de relire le plan.

Ce que le connecteur ne peut PAS empêcher, et qu'il DIT (`verifier_confinement`) :
une autre extension ou un serveur MCP qui a accès au même dossier, le dossier
Cowork, le pilotage du navigateur/de l'écran, et un dossier synchronisé dans
le cloud (qui emporterait la clé). Ni, bien sûr, un texte collé directement
dans la conversation.

Les tests verrouillent ces invariants — ne jamais les affaiblir :
`test/fuite.test.js` (chasse aux fuites : valeurs cachées dans les noms de
fichiers, d'onglets, les en-têtes, une colonne « Client », du texte libre en
minuscules…, tous les outils appelés, zéro occurrence), `test/verrou.test.js`
(les règles une à une), `test/e2e.test.js`, et la campagne sur l'artefact
(`test/campagne-mvp.mjs`, audit A5).

## Outils

| Outil | Rôle |
|---|---|
| `lister_fichiers` | Liste les fichiers traitables (Excel, CSV, Word .docx, PDF, .md/.txt, scans ; et les copies Word codées, pour `decoder_word`) — noms propres masqués (•••), repère stable `[F-XXXXX]` |
| `anonymiser_fichier` | Deux temps (plan sans `confirmer`, exécution avec) ; modes TABLEAU (colonnes entières), DOCUMENT (facture → codage intra-cellule, dictionnaire marocain), WORD (copie .docx codée, mise en forme conservée) et TEXTE/PDF ; le verrou passe ENSUITE partout (colonnes lisibles et en-têtes compris). `onglet` par numéro. `rendu: "lisible"` (v2.23) : pseudonymes plausibles à la place des codes de personnes, sociétés, villes et dates de naissance. Garde-fou : un document forcé en tableau (>40 % de cellules codées) est refusé |
| `anonymiser_dossier` | LOT : tous les fichiers (ou filtrés par `motif`), toutes les feuilles, UNE clé, plan→confirmer, compte rendu en comptes seuls + rapport `rapport-lot-*.md` (noms de fichiers codés) ; `rendu` comme `anonymiser_fichier` |
| `lire_scan` | OCR LOCAL d'un scan — le texte reconnu n'entre JAMAIS dans la conversation : il est écrit en `…-ocr-A-RELIRE.md` (nom codé), l'utilisateur le relit, PUIS on anonymise ce fichier |
| `caviarder_image` | Bandeaux noirs sur une capture ou un scan : OCR local, même moteur et même verrou qu'un texte, mot mal lu et inconnu noirci d'office, bandeaux GRAVÉS dans un nouveau PNG. Trois temps : plan → image écrite sur le poste (l'utilisateur la regarde) → `envoyer: true` seulement après sa validation |
| `deanonymiser` | Retraduit texte/TSV → fichier local (.md, .xlsx ou, avec `format: "docx"`, un document Word mis en forme ; droits 600), jamais dans le chat. Retraduit les codes ET les pseudonymes du rendu lisible |
| `decoder_word` | Décode un .docx contenant des codes ou des pseudonymes (la copie codée retravaillée, ou un .docx de l'IA) : mise en forme conservée, corps, en-têtes, pieds de page, notes et commentaires ; écrit sur le poste, jamais dans le chat |
| `etat_cle` | Comptes par type, licence, rendu du dossier (codes / lisible) et nombre de pseudonymes posés, résumé de l'audit de confinement |
| `verifier_confinement` | Audit hors ligne : autres extensions / serveurs MCP / Cowork qui voient le dossier, pilotage navigateur, synchronisation cloud, droits de la clé |
| `rapport_couverture` | Page locale pour le DPO : par poste, fichiers protégés, plans non confirmés, décodages, montants en clair, valeurs retrouvées, portes ouvertes, dernière activité. Que des comptes ; en équipe, chaque poste dépose les siens dans le dossier d'équipe |
| `sceau_dossier` | Sceau pour le CLIENT de l'avocat : journal audité, puis preuve signée (certificat du cabinet signé par Ai4x + signature du cabinet), page imprimable avec QR et clause de lettre de mission, vérifiable hors ligne sur ai4x.academy/verifier-sceau. Refusé s'il y a une fuite, en essai, ou avec une clé d'avant la v2.6 |
| `coder_texte` | **Le verrou universel (v2.17)** : un texte libre entre en clair, ressort codé avec la clé du dossier (même moteur, même verrou, même politique qu'un fichier) ; seule la clé est écrite. Appelé par la sentinelle pour chaque message envoyé à ChatGPT, Claude.ai, Gemini ou Copilot depuis le navigateur ; depuis Claude, pour un texte collé en clair. Le texte reçu n'est jamais journalisé (sa taille l'est). `rendu: "lisible"` (v2.23) : le texte ressort avec des pseudonymes à la place des codes de personnes |
| `reinitialiser_cle` | Archive la clé (datée) et repart de zéro — confirmation exigée |

v2.28.0 (HT-Bench ≥ 99 % par pack, 25/10/2026). Les manques que mesurait
HT-Bench sur les identifiants directs sont comblés, et aucune sortie n'est
plus corrompue. Le moteur prend maintenant en entier :
- le NIR dont la clé est écrite après un tiret (`1 84 05 75 112 345 - 78`),
  si la clé est juste ;
- le n° d'affiliation CNSS de l'employeur annoncé avec son rôle
  (« CNSS employeur 7456193 », « affiliée à la CNSS sous le n° … ») ;
- le RIB marocain et l'IBAN écrits par groupes de quatre. Les seize premiers
  chiffres passaient Luhn une fois sur dix : ils étaient codés CARTE, et la
  fin restait en clair. La clé mod 97 du compte est maintenant vérifiée
  avant la carte.

Le verrou code le patronyme qui suit une particule capitalisée (« Sophie Le
Roux », « M. de La Fontaine », « Nesrine Ould Bah »). Il lit un prénom à
apostrophe comme un seul mot (« R'kia », « Ma'ati », « M'hamed ») : l'élision
ne change pas (« l'avocat d'Agadir », « prud'hommes »). Il code « Cheikh »
comme prénom quand un nom le suit. Côté packs (santé 1.1.0, RH-paie 1.1.0,
juridique 1.1.0, banque 1.2.0), les libellés des motifs ne se déclenchent
plus dans un mot (« AMO » dans « amoxicilline », « lot » dans
« lotissement ») ni d'une ligne à l'autre. Un n° de patient ou de lot doit
contenir un chiffre (« Patient : Karim » n'est plus un n° de patient). Le
moteur ne remplace plus une valeur trouvée par un pack qu'en mot entier, et
jamais dans un code qu'il vient de poser : c'est ce qui fabriquait des codes
imbriqués indécodables. HT-Bench vérifie enfin l'aller-retour : chaque texte
codé, décodé avec sa clé, doit rendre l'original, sinon la CI échoue.
Identifiants directs : jeu dev 97,7 % → 100 %, jeu de test (jamais réglé)
98,2 % → 100 %, sorties corrompues 9 → 0, leurres codés en baisse.

v2.27.0 (la caisse en ligne, 25/10/2026). Le connecteur fait confiance à une
seconde clé de signature, la **clé de caisse** : elle signe les licences des
abonnements payés en ligne (Polar, sur hiddentokens.com/activer), et vit sur
le serveur du site, pas sur le poste du fondateur. Distincte de la clé
maîtresse : si elle fuit, un connecteur qui retire `CAISSE_PUBLIC_KEY_B64`
suffit, les licences émises à la main ne bougent pas. Ces licences portent
`src: "polar"` ; à l'approche de l'échéance, le connecteur dit que
l'abonnement se renouvelle tout seul et que la nouvelle clé se récupère sur
hiddentokens.com/activer, au lieu de renvoyer vers WhatsApp. Le sceau client
d'une telle licence est certifié par la même clé de caisse.

v2.26.1 (fin d'essai, 25/10/2026). Quand l'essai de 14 jours est terminé et
qu'aucune clé n'est configurée, le message dit maintenant où coller la clé
(réglages de Claude Desktop → Extensions → Hidden Tokens → « Clé de licence »)
et qu'il faut redémarrer Claude Desktop : c'est le moment où un client qui vient
de payer le cherche. Contrôles C1a et C1b de `test/campagne-mvp.mjs`.

v2.26.0 (le verrou lit l'anglais, 25/10/2026). Une note rédigée en anglais
sortait en bouillie : le verrou ne connaissait que le français, si bien que
« and », « the », « this », « legal », « Founder », « Morocco » étaient des
mots inconnus, donc codés (mesuré sur le jumeau d'un coffre 4XOS : « In
NOM-1056, CODE-837 CODE-1158 CODE-834… »), comme le dossier `30_WORK` d'un
chemin. Désormais un paragraphe manifestement anglais (ses mots-outils le
disent ; un texte français n'est pas touché) passe au verrou avec, en plus du
français : 63 500 mots anglais courants (SCOWL), les patronymes américains qui
sont aussi des mots (Smith, Baker, Brown — Census 2010) et les prénoms (Mark,
Grace — Census 1990), les mots-outils, pays, langues, jours et mois anglais,
et « Mr », « Dear », « our client », « From: ». Les règles ne changent pas :
un nom derrière un titre ou un prénom, un mot capitalisé au fil d'une phrase,
« the Smith account » restent codés ; un e-mail, un +212, un ICE, un RIB, une
adresse aussi. Sur la note de test (fictive), 152 codes avant, 14 après —
tous des données sensibles. Un dossier numéroté d'un chemin (`1_MEMORY/30_WORK`)
reste lisible quand c'est un mot (`30_BENALI` reste codé), et `MEMORY/30` n'est
plus pris pour un n° de dossier. Une clé tenue avant la v2.26 n'impose plus,
dans un texte anglais, les mots courants que l'ancien verrou y avait codés.
En français, l'orthographe rectifiée de 1990 est reconnue : « plateforme »,
« weekend », « portemonnaie » (le dictionnaire ne les avait qu'avec un trait
d'union) ne sont plus codés comme des mots inconnus.
Limites : un intitulé en Title Case (« Legal Entity And Brand ») garde ses
mots capitalisés codés (fail-closed), et les cellules courtes d'un tableau,
trop brèves pour qu'on juge de leur langue, restent traitées en français.

v2.25.0 (finance marocaine et packs par défaut, 24/10/2026). Un dossier qui n'a
pas choisi ses packs reçoit d'office `telecom-ma`, `juridique-fr`, `rh-paie`,
`banque-assurance` et `expertise-comptable` (choisis par la mesure HT-Bench :
plus de rappel, aucune sortie corrompue) ; `"packs": [...]` ou la politique
signée l'emportent, `[]` les retire. Packs `banque-assurance` 1.1 (CVV, LCN,
plaques marocaines, RIB marocain, sigles KYC / PPE / UTRF en clair) et
`expertise-comptable` 1.1 (facture, pièce, déclaration annoncées sans plus
jamais coder « pièce jointe » ni le verbe « avoir » ; EBITDA, BFR, DSO… en
clair) ; le vocabulaire des packs reste lisible dans l'aperçu. Pack
`notariat-ma`. Banc de détection HT-Bench (`bench/ht-bench/`, contrôlé en CI).

v2.24.0 (toutes les dates, en option, 24/10/2026). En rendu lisible, un nouveau
réglage `dates` : « naissance » (défaut, inchangé : seules les dates de naissance
sont décalées, un âge à une autre date peut varier d'un an) ou « toutes » : toutes
les dates complètes du dossier (15/01/2026, 2026-01-15, « 15 janvier 2026 »…) sont
décalées du même nombre de jours, secret ; âges et délais calculés par l'IA sont
exacts, et `deanonymiser` / `decoder_word` ramènent TOUTES les dates de la réponse,
y compris celles que l'IA a calculées et les jours-mois sans année de ses
explications (`retourDates`, `pseudonymes.js`). Le mode est FIGÉ dans la clé au
premier rendu lisible du dossier (un dossier qui mélangerait les deux décoderait
de vraies dates à tort) ; `etat_cle` le dit. Un texte venu du navigateur
(`coder_texte` avec une source) n'est jamais décalé : l'extension ne saurait pas
ramener une date calculée. Limites : une année seule ne se ramène pas (la règle
« 1 bis » demande des dates complètes) ; les jours de la semaine ne correspondent
plus ; les cellules de date des tableurs ne sont pas décalées. Réglage :
`reglages.json` (`dates`), `ANX_DATES`, option `dates` de `anonymiser_fichier`,
`anonymiser_dossier`, `coder_texte`. Mesuré par l'essai A/B
(`recette-auto/ab.mjs --comparer=naissance,toutes`, dépôt Nanomizer).

v2.23.3 (essai A/B du 24/10/2026). Mesuré en faisant travailler Claude sur la
même note en codes et en lisible : en lisible, l'IA réécrit parfois une date de
naissance décalée dans un autre format (« 8 septembre 1974 » → « 08/09/1974 ») ;
la date n'était alors pas retraduite et restait, fausse, dans le document
décodé. `pseudoMap` retraduit désormais toutes les écritures courantes d'une date
décalée (jj/mm/aaaa, j/m/aaaa, jj.mm.aaaa, aaaa-mm-jj, « 1er »/« j mois aaaa »).
Une année de naissance seule (« né en 1990 ») garde son code : un nombre nu serait
retraduit partout dans la réponse.

v2.23.2 (recette du 24/10/2026). `etat_cle` dit le rendu du dossier aussi sur
une clé vide : c'est sur un dossier neuf qu'on vérifie le réglage.

v2.23.1 (une société, un code, 24/10/2026). Vu en passant une note de dossier
au rendu lisible : « signé entre M. Chraïbi et Gharb Primeurs SARL. » donnait
UNE société « M. Chraïbi et Gharb Primeurs SARL. » — la personne disparaissait
dans le code, le point de la phrase avec — et la même société recevait trois
codes au fil du texte (trois sociétés fictives en rendu lisible). Désormais
(`cleanLegalCapture`, `server/engine.js`) : une capture qui commence par un
titre de civilité ne garde que ce qui suit le dernier « et » / « & » ; le point
final de « SARL. » est celui de la phrase ; une capture qui finit par une société
déjà trouvée (« Voir Gharb Primeurs SARL ») est cette société ; le nom nu
(« Gharb Primeurs », deux mots au moins) est un alias du même code, y compris
avant la première mention complète. La colonne « Date de naissance » d'un
tableur est codée `NAISS-…` (décalée en rendu lisible), plus `CODE-…`. Le
texte du rendu lisible est rectifié : seules les dates de NAISSANCE sont
décalées, les autres restent exactes, donc un âge calculé à une date du dossier
peut différer d'un an (la v2.23.0 disait « les âges restent justes ») ; la
règle « 1 bis » demande à l'IA de le signaler sur un seuil d'âge. Le
brouillage du mode « indice » est calculé en millièmes entiers (il sortait d'un
cheveu de ±20 % une fois sur 401). Le banc d'essai retrouve le dossier
`Hidden-Tokens/` (il cherchait encore `Anonymiseur-Ai4x/`) : scores identiques
avant et après.

v2.23.0 (les pseudonymes sémantiquement cohérents, 24/10/2026). Nouveau
**rendu « lisible »**, optionnel et réversible (`server/pseudonymes.js`,
`lexique/pseudonymes.json`). Un code reçoit un PSEUDONYME plausible et stable :
prénom du même genre et de la même aire culturelle (dictionnaires FR / MA / EN),
patronyme de la même aire, raison sociale fictive avec la même forme juridique
(« Atlas Négoce SARL AU » → « Horizon Services SARL AU », le mot générique
« Garage », « Transports » reste), ville du même pays et de taille comparable,
date de naissance décalée d'un delta SECRET constant par dossier (30 à 400
jours : l'écart entre deux dates de naissance reste juste ; les autres dates
restent exactes, donc un âge calculé à l'une d'elles peut différer d'un an —
la règle « 1 bis » le dit à l'IA). Les identifiants (EMAIL, TEL, RIB, CIN,
ICE…), adresses, références et éléments interdits gardent leur code ; les
montants relèvent toujours du réglage Nombres. Le pseudonyme est écrit dans la
clé (`cle-de-session.json`, champ `pseudo` de l'entrée ; graine et delta dans
`pseudonymes`) : même personne = même pseudonyme dans deux fichiers, dans
`coder_texte`, d'une session à l'autre ; le format `entries[].code/value` ne
change pas (sentinelle et appli continuent de lire la clé). `deanonymiser`,
`decoder_word` et `remettre_chiffres` retraduisent pseudonymes et codes ;
`decodeText` passe aux frontières Unicode (« Éric »). Garde-fous : un
pseudonyme n'est jamais une valeur réelle de la clé (sous aucune graphie), ni
un mot du texte rendu, ni un mot du dictionnaire (« Claire », « Pierre »
exclus), ni un autre pseudonyme ; une valeur réelle entrant plus tard dans la
clé qui coïncide avec un pseudonyme le fait RENOUVELER, et le compte rendu le
dit ; un pseudonyme en minuscules au fil d'une phrase n'est pas décodé. Le
contrôle d'aperçu vérifie la version codée de chaque ligne (un pseudonyme
n'est pas masqué) ; le verrou de sortie reconnaît toujours les valeurs réelles ;
le test de réidentification se fait sur le texte codé (une ville fictive n'est
pas un indice) ; le journal « ce que l'IA a vu » note les pseudonymes (c'est ce
que l'IA a vu) ; les RÈGLES jointes aux données gagnent un point « 1 bis »
(recopier les pseudonymes tels quels). Réglage par dossier à côté de
`chiffres` dans `Hidden-Tokens/reglages.json` (`"rendu": "lisible"`), variable
`ANX_RENDU`, ou option `rendu` de `anonymiser_fichier`, `anonymiser_dossier`
et `coder_texte` ; défaut « codes », inchangé. Limites : en clé d'équipe ou
au registre de l'organisation (v2.20), les pseudonymes sont ceux du poste (la
graine n'est pas partagée et le registre ne porte que code/valeur/type) ; l'extension
navigateur (sentinelle) ne retraduit encore que les codes ; l'appli n'expose
pas encore le réglage (second PR, dépôt Nanomizer).
v2.18.0 (les règles de l'organisation, 23/10/2026). L'entreprise configure ses
propres règles, à deux niveaux : le **dossier** (`Hidden-Tokens/reglages.json`,
écrit par l'appli Hidden Tokens, relu à chaque appel) et l'**organisation** (la
politique signée). Trois types : `toujours_coder` (des termes codés sous un
préfixe maison, même quand le verrou les laisserait passer — un nom de code fait
de mots du dictionnaire, « Horizon Bleu »), `motif` (une expression régulière de
l'entreprise, n° d'affaire ou matricule, codée `AFFAIRE-001`), `laisser_en_clair`
(le nom du cabinet, ses associés — jamais un identifiant). Priorité :
organisation > dossier, et coder > laisser en clair. Le plan n'en donne que des
comptes ; les termes à coder ne sortent pas non plus par le verrou de sortie.
Spec : `nanomizer/SPEC-REGLES-ORGANISATION.md` ; `server/regles.js`.

v2.17.0 (le verrou universel, 23/10/2026). Nouvel outil **`coder_texte`** :
un texte libre (un message de chat, un courrier) entre en clair et ressort
codé par le moteur, le verrou et la politique du cabinet, la clé est écrite,
rien d'autre. Le texte codé est rendu dans un bloc à part ouvert par
`⟦HIDDEN-TOKENS:TEXTE-CODE⟧`, que la sentinelle Hidden Tokens (v0.4) retrouve
après la bannière de mode et le verrou de sortie, pour le rendre à l'extension
navigateur (ChatGPT, Claude.ai, Gemini, Copilot). `coder_texte` est dans la
liste blanche de la prise : un connecteur Claude Desktop en mode client le
relaie à la sentinelle (un seul écrivain de clé). Le journal « ce que l'IA a
vu » note la taille du texte reçu, jamais son contenu — ce texte vient du
navigateur de l'utilisateur, pas de l'IA ; la réponse codée, elle, est
journalisée.

v2.16.0 (le choix des nombres, 23/10/2026). Un montant seul n'est pas une
donnée confidentielle : une facture, des quantités, des taux sont la matière de
travail de l'IA. Ce qui doit rester caché, c'est la finance d'une personne ou
d'une organisation. Nouveau mode **auto**, désormais le défaut : chaque colonne
numérique est classée d'après son en-tête — paie, CA, résultat, patrimoine,
solde, honoraires… en gabarit ; montants de facture, quantités, taux, numéros et
années en clair. Le PLAN liste chaque colonne avec son mode et l'utilisateur
corrige colonne par colonne (`chiffres_par_colonne`, par en-tête ou lettre) ou
pour tout le fichier (`chiffres`). Une mise en page document (facture, courrier)
est en clair, sauf si le texte parle de paie ou de comptes. Le **réglage par
défaut du dossier** se choisit dans l'appli Hidden Tokens (menu du dossier →
Nombres, ou le tableau de bord) : la sentinelle l'écrit dans
`Hidden-Tokens/reglages.json`, le connecteur le relit à chaque appel, sans
redémarrage. Les dates restent toujours lisibles ; `remettre_chiffres` ne
change pas.

v2.15.1 (suite de la recette, 23/10/2026). Un mot d'en-tête de tableau écrit
avec une majuscule (« Pièce Émetteur Date » extrait d'un PDF) reste lisible ;
« Garage » en fin de ligne et « Lefèvre » au début de la suivante reçoivent le
code de la société ; la copie Word ne garde plus de relation vers la vignette ou
les propriétés retirées (`_rels/.rels` n'était pas nettoyé : Word tolérait,
d'autres lecteurs refusaient d'ouvrir). Limite connue : une société écrite avec
sa forme juridique dans une cellule Excel (« SARL Garage Lefèvre ») et sans
elle dans un texte garde deux codes.

v2.15.0 (la recette client, 23/10/2026).
Des conclusions et une fiche salarié fictives, codées par l'appli comme chez un
client, ont montré deux fuites et deux défauts de sens ; tous rejoués dans
`test/recette-b5.test.js`.
- **Plaque d'immatriculation** codée en entier (`IMMAT-001`) : « AB-123-CD »
  sortait en « REF-004-CD ». Format SIV partout, ancien format FNI derrière
  « immatriculé ».
- **Date de naissance** codée d'office (`NAISS-001`, décodée dans la réponse) :
  « né le 12 avril 1981 », « née le 03/07/1985 », « Date de naissance : … »,
  « né en 1990 ». Les autres dates restent lisibles. `generaliser` ne touche
  donc plus la naissance (déjà codée) ; villes et âges, si.
- **N° de sécurité sociale** codé en entier : le moteur prenait son milieu pour
  un téléphone marocain (« 2 85 TEL-001 78 »).
- **Une société, un code** : « SARL Garage Lefèvre » puis « au Garage Lefèvre »
  recevaient quatre codes ; c'est désormais `SARL SOCIETE-001` et
  `au SOCIETE-001`, et la clé garde ce code d'un fichier à l'autre. La forme
  juridique reste lisible. « Fontaine & Associés » est un seul nom.
- **Moins de sur-codage** : un intitulé d'acte en majuscules (« CONCLUSIONS EN
  DÉFENSE », « ATTESTATION EMPLOYEUR », « LETTRE RECOMMANDÉE… ») n'est plus pris
  pour une société ; « — » ouvre un segment (« — Dossier 2026-118 »).

v2.13.0 (la preuve signée, 22/10/2026).
Les pages de preuve — le journal « Ce que Claude a vu » et le rapport de
couverture — portent désormais une attestation signée dans leur en-tête
(`server/attestation.js`, jeton `NANOA1.…`) : qui l'a produite, quand, les
comptes affichés et l'empreinte SHA-256 du reste de la page. Un chiffre
retouché à la main invalide la signature. Abonné : signée par la clé de
sceau du cabinet, certifiée par Ai4x. Essai ou licence sans sceau : signée
par une clé de poste (créée une fois, droits 600) — intégrité prouvée,
identité du cabinet non certifiée, et la page le dit. À la différence du
sceau, l'attestation dit la vérité fuites comprises. Vérification hors
ligne : `node scripts/verifier-preuve.mjs <page.html>`, ou l'appli de bureau
(« Vérifier une preuve… ») ; la page publique verifier-sceau suivra.

v2.12.0 (un seul écrivain de clé — cycle C2 de la sentinelle, 22/10/2026).
Quand la sentinelle Hidden Tokens tourne sur le poste et tient le dossier de
travail, le connecteur devient son client : les outils de la liste blanche de
la prise (lister_fichiers, anonymiser_fichier, anonymiser_dossier,
deanonymiser, etat_cle, journal_ia, verifier_confinement, lire_scan,
tableau_de_bord, remettre_chiffres) lui sont transmis par la prise locale
(socket Unix ou tube nommé, jeton de jumelage relu à chaque appel, zéro
réseau) et sa réponse est rendue telle quelle ; le connecteur n'écrit plus la
clé. Deux codages entremêlés sur la même clé étaient le seul moyen de perdre
une correspondance : c'est fini par construction. La prise est redécouverte
au démarrage puis à chaque appel (cache de 2 s) : une sentinelle lancée après
Claude Desktop est jumelée sans redémarrage ; une sentinelle qui tombe
entraîne un repli immédiat sur le moteur embarqué, dit en une ligne
(« sentinelle injoignable, moteur local ») ; un délai dépassé n'est jamais un
repli (elle écrit peut-être encore la clé). Les autres outils
(reinitialiser_cle, caviarder_image, decoder_word, sceau_dossier,
rapport_couverture) restent locaux. Le journal « ce que Claude a vu » reste
tenu côté connecteur dans les deux modes ; etat_cle et le protocole disent le
mode courant. Réglage « sentinelle » (ANX_SENTINELLE=non) pour forcer le
moteur local. Nouveau module `server/sentinelle.js`, sans dépendance.

v2.11.0 (le moteur sans surprises visibles, 22/10/2026).
Trois sur-codages vus le 21/10 sur un vrai dossier, inoffensifs mais qui
faisaient douter, corrigés : les mois abrégés d'un tableau (« Févr. », « Avr. »
codés NOM-002, NOM-003 — février et avril n'étaient plus distinguables) suivent
la règle du mois en toutes lettres, point d'abréviation compris (« Avr. 2026») ;
« M. » après un libellé (« Contre : M. Garnier ») reste, le nom est codé ; les
mots de bureau d'un nom de fichier (memo, courriel, pv) ne sont plus des noms.
La bannière d'essai gratuit se rappelle une fois par session, pas à chaque
fichier ; une licence échue ou qui expire se répète toujours.

v2.10.0 (les noms du cabinet — US-5, 21/10/2026).
Les règles par NOMS de la politique s'appliquent. La politique ne contient que
des empreintes HMAC ; le poste découpe chaque texte BRUT en n-grammes de 1 à
6 mots, normalisés exactement comme la console (`nanomizer-admin/lib/empreinte.js`
— contrat testé), les hache avec le sel du cabinet et compare (le plus long
gagne ; une cellule à la fois dans un classeur). Un nom
« toujours_pseudonymiser » trouvé est injecté dans les valeurs à coder, en un
seul point (`codeFreeText`, `anonymizeWorkbook`, chemin Excel) : il est codé
`CLI-001`, `PAR-…`, `SOC-…` (nouveaux types `CATEGORY_TYPES` du moteur) même si
les détecteurs l'auraient laissé lisible (« Lumière », mot du dictionnaire),
et même si le salarié l'a mis dans `valeurs_a_exclure` (l'admin durcit, on
n'affaiblit pas). Un nom « interdit » est codé `INTERDIT-…` et la copie n'est
pas écrite (BLOQUE_ROUGE, règle et libellé cités, jamais le nom). Contrôle
résiduel : un nom listé encore en clair dans la copie codée bloque l'écriture
(BLOQUE_ERREUR). Mesure : ~100 ms pour 10 000 caractères et 5 000 empreintes
(cible de la spec : 150 ms). Limites : pas de correspondance floue (une
variante non listée est laissée aux détecteurs), pas de translittération
arabe ↔ latin, et les captures (`caviarder_image`) ne lisent pas encore la
liste.

v2.9.0 (la politique du cabinet sur le poste — US-4, 21/10/2026).
**`politique.js`** : un poste enrôlé (réglage « Fichier d'enrôlement »,
`ANX_ENROLEMENT`) applique la politique signée par la console
`apps/nanomizer-admin`. À l'entrée de chaque outil qui code, la politique du
dossier partagé est relue et revérifiée : signature par la clé ÉPINGLÉE au
premier usage, cabinet, format, contrôles de chargement (détecteur inconnu,
plancher retiré, expiration > 365 j, `en_cas_erreur` ≠ bloquer), anti-retour
(version inférieure, ou même numéro au contenu différent), expiration (72 h
d'avertissement puis blocage). Dossier partagé injoignable : la dernière copie
vérifiée s'applique, avec un avertissement au-delà de 24 h. ABSENTE, ALTEREE,
RETROGRADEE et EXPIREE (après la grâce) bloquent le codage — plans compris —,
jamais le décodage. Les règles « interdit » par détecteur empêchent l'écriture
de la copie pour l'IA (fichier seul, ou ce fichier dans un lot). La politique,
ses règles et la notice du cabinet s'affichent dans `etat_cle` et dans chaque
plan ; la version et l'empreinte de la politique sont notées dans chaque
entrée du journal. **Pas encore appliquées** : les règles par noms
(empreintes — US-5) ; elles sont annoncées comme telles au salarié.
Tests : `test/politique.test.js` signe avec la VRAIE console (critères
d'acceptation 1, 2 et 8 de la spec).

v2.8.0 (le caviardage des images, 21/10/2026).
**`caviarder_image`** (`caviardage.js`) : le texte était pseudonymisé partout,
l'IMAGE (capture d'écran, photo de pièce, scan) passait en clair. L'OCR local
donne chaque mot et sa boîte ; le moteur et le verrou décident ; les bandeaux
sont gravés dans les pixels d'un nouveau PNG (pas de calque : l'original ne
survit pas, l'EXIF non plus). Un mot mal lu et inconnu est noirci d'office.
L'OCR ne voit ni signature, ni tampon, ni manuscrit, ni visage : l'image est
écrite sur le poste, l'utilisateur la regarde, et elle n'est envoyée à l'IA
(`envoyer: true`, avec son empreinte SHA-256 au journal) qu'après sa validation.
Testé en relisant l'image caviardée par OCR : ICE, IF, RC, RIB et noms ne s'y
lisent plus. Nouvelle dépendance : `pngjs` (MIT, sans dépendances).

v2.7.0 (Word, 21/10/2026) : le format n° 1 d'un avocat — chantier S1-S3 du
chemin critique vers 9/10 (`CHEMIN-CRITIQUE-9-10.md`, dépôt Hidden Tokens).
1. **Lire un .docx** (`server/word.js`, `anonymiser_fichier` et
   `anonymiser_dossier`) : une COPIE CODÉE, mise en forme conservée. Le texte
   de tous les paragraphes — corps, en-têtes, pieds de page, notes, zones de
   texte — passe d'un seul tenant par le codage du PDF (moteur + verrou), puis
   est redistribué run par run (alignement par plus longue sous-suite commune
   de mots : un nom coupé entre un run gras et un run normal est codé d'un
   bloc et garde la mise en forme du début du mot). Aussi un `.md` à côté.
2. **Ce qu'un .docx cache, retiré de la copie** : métadonnées (auteur,
   « modifié par », société, titre, mots-clés), propriétés personnalisées,
   miniature, commentaires et auteurs, suivi des modifications (supprimé
   retiré, inséré accepté), champs (`HYPERLINK "mailto:…"`) et liens (le
   texte affiché reste), images et textes alternatifs, objets incorporés,
   données liées (customXml), variables du document, chemin du modèle,
   glossaire, macros. Puis un **filet final fail-closed** : tout le paquet,
   attributs compris, repasse au détecteur du verrou de sortie
   (`knownValueMatcher`) — une valeur de la clé retrouvée = aucune copie
   écrite. `.doc`, `.rtf`, `.odt` : refusés avec le geste (enregistrer en
   .docx).
3. **Rendre du Word** : `deanonymiser` avec `format: "docx"` (titres, listes,
   gras/italique, tableaux du Markdown) ; nouvel outil **`decoder_word`** pour
   un .docx contenant des codes. Jamais bloqués par la licence.
4. **Verrou, trouvé par le banc en mode Word** (`node bench/run.mjs --word`) :
   recoder un texte avec une clé déjà remplie laissait passer un patronyme en
   minuscules qui est aussi un mot (« mme amandine roux » : au second passage,
   « amandine » est déjà un code, « roux » ne suit plus un prénom). Faille
   antérieure à Word — elle touchait aussi un PDF retraité en lot. Désormais
   un tel mot, collé à un code et connu de l'INSEE comme nom ou prénom, est
   recodé (`R7`, `test/verrou.test.js`). Banc : 201/201 en mode texte, équipe
   et Word, lisibilité inchangée (92,9 %).
Vérifié dans Microsoft Word (macOS) : la copie codée et la copie décodée d'un
vrai .docx piégé (`test/fixtures/piege-libreoffice.docx`, écrit par
LibreOffice) s'ouvrent et s'exportent en PDF. Limite assumée : les images
retirées ne reviennent pas au décodage (l'original les garde) ; les noms de
styles ne sont pas codés.

v2.6.0 (la preuve pour le client, 21/10/2026).
1. **Test de réidentification** (`reidentification.js`) : coder les noms ne suffit
   pas — « le PDG d'une biotech lyonnaise, né le 12/04/1971 » désigne quelqu'un.
   Sur le texte CODÉ (ce que l'IA recevra), le test compte les indices restés
   lisibles (ville, date de naissance, âge, fonction rare, nationalité) passage
   par passage : 🟢 anonyme, 🟠 devinable, 🔴 identifiable. Il figure dans le plan
   et le compte rendu des textes et PDF. Option `generaliser` : villes codées
   (`LIEU-…`, décodées dans la réponse), naissance → décennie, âge → tranche ; les
   autres dates restent exactes (délais), les villes de juridiction restent
   lisibles (droit applicable), les fonctions sont signalées, jamais réécrites.
2. **Sceau** (`sceau.js`, outil `sceau_dossier`) : chaque licence émise porte un
   certificat du cabinet signé par Ai4x et sa clé de sceau. Signatures séparées par
   domaine (`NANOC1.`/`NANOS1.`) : un certificat, public, n'est jamais une licence.
   Les clés émises avant la v2.6 n'ont pas de sceau : réémission gratuite.

v2.5.0 (l'abonnement, 21/10/2026) : prêt pour la vente B2B.
1. **Abonnement annuel par poste** (`OFFER`, licence.js) : Solo 390 € HT/an,
   Cabinet (2 à 20 postes) 290 € HT par poste et par an ; Maroc 1 200 / 900 Dhs
   HT. Les licences à vie déjà vendues restent honorées. **Délai de grâce** de
   15 jours après l'échéance (`GRACE_DAYS`) : une facture d'entreprise se règle
   rarement le jour même. Le décodage ne s'arrête toujours jamais.
   `emettre-licence.mjs --depuis` renouvelle à partir de l'échéance précédente.
2. **Collision des codes d'équipe** : deux postes qui créent au même moment le
   même code pour deux valeurs (8 chiffres, rare mais possible) — avant, le
   code du collègue était ignoré et le décodage rendait la mauvaise personne,
   sans alerte. Désormais le code est marqué en conflit : jamais décodé, le
   fichier porte « [À VÉRIFIER : code] », `deanonymiser` et `etat_cle` le
   signalent (`test/equipe.test.js`).
3. **Preuve « zéro réseau » exigée en CI** : un job Node 26 lance
   `test/reseau.test.js` avec `NANOMIZER_PREUVE_RESEAU=1` (sous Node 22, elle
   était ignorée en vert). SDK MCP serveur 2.3.1 (`npm audit` : 0 vulnérabilité).

v2.4.0 (rapport de couverture et charte IA, 21/10/2026) : de l'outil personnel
à la règle d'entreprise.
1. **Rapport de couverture** (`server/couverture.js`, outil `rapport_couverture`).
   Chaque poste tire de son journal des COMPTES par mois (fichiers protégés,
   plans non confirmés, refus, décodages, mode des montants, valeurs
   retrouvées, portes ouvertes au confinement) et, en équipe, les dépose dans
   `stats-poste-<id>.json` du dossier d'équipe — au plus toutes les 15 minutes
   et à chaque rapport. La page `RAPPORT-COUVERTURE-NANOMIZER.html` (copiée dans
   le dossier d'équipe pour le DPO) agrège les postes et liste les alertes :
   poste sans fichier protégé depuis 30 jours, montants envoyés en clair,
   version en retard, valeur retrouvée, porte ouverte. Ni valeur, ni code, ni
   nom de fichier ; la réponse à l'IA ne nomme aucun poste, et les comptes
   comme la page sont refusés à l'IA (`FORBIDDEN_RX`).
2. **Nom du poste** (réglage facultatif `poste_nom`, variable `ANX_POSTE_NOM`) :
   comment le poste apparaît dans le rapport. Jamais montré à l'IA.
3. **Modèle de charte IA** (`confiance/charte-ia-modele.md`) : la règle d'or
   (aucune donnée identifiante vers une IA autrement que par Hidden Tokens), la
   configuration des postes, le contrôle mensuel par le rapport de couverture,
   la procédure d'incident (on cite le code, jamais la valeur). Le rapport ne
   voit pas ce qui contourne Hidden Tokens : la charte en fait la seule voie
   autorisée, le rapport vérifie qu'elle est suivie.

v2.3.1 (répétition de démo, 20/10/2026) : trois défauts trouvés en rejouant
le parcours d'une démonstration, sans clé, sur un dossier fictif.
1. Nos propres tournures (« Ce que Claude a vu », « Claude Desktop »,
   « TABLEAU CODÉ », les noms de modes) sont abritées par le verrou de sortie et
   par l'audit du journal (`OWN_LINKS`, sortie.js). Avant : un prénom réel
   « Claude » entré dans la clé faisait annoncer `CE-QUE-PRENOM-035-A-VU.html`
   (fichier inexistant) et le journal signalait de fausses fuites. Un « Claude »
   isolé reste codable. Les messages de l'audit de confinement disent « l'IA »
   plutôt que « Claude ».
2. `remettre_chiffres` code le nom du classeur produit (avant : « Bilan
   Benali.xlsx » faisait apparaître « Benali » dans le chemin annoncé). Trouvé
   par l'audit rétroactif du journal — il a fait son travail.
3. Dans la page du journal, un `[MASQUÉ]` (élément déjà retenu) n'est plus
   affiché comme une fuite.

v2.3.0 (la clé d'équipe, 20/10/2026) : tout le cabinet code « Benali » de la
même façon, sans serveur ni synchronisation (`server/equipe.js`, réglage
« Dossier de clé d'équipe » → `ANX_TEAM_DIR`). En mode équipe, le code est tiré
d'une empreinte HMAC-SHA256 de la valeur avec un secret d'équipe
(`NOM-48291374`, 8 chiffres) : chaque poste calcule le même code sans parler aux
autres, et personne sans le secret ne peut calculer le code d'un nom deviné.
Le dossier partagé (NAS, serveur de fichiers) contient le secret, créé par le
premier poste (création exclusive), et un fichier `cle-poste-*.json` par poste :
chacun n'écrit que le sien et lit tous les autres, donc pas de verrou et pas de
conflit. Le code d'un collègue se décode sur tous les postes. Réservée à la
licence Équipe (≥ 2 postes) et à l'essai. Dossier injoignable : RIEN n'est codé
(des codes locaux ne seraient pas ceux des collègues), le décodage continue.
Dossier d'équipe synchronisé dans le cloud : signalé comme risque par l'audit
de confinement. Sans dossier d'équipe, rien ne change (`NOM-001`). Banc :
201/201 aussi en mode équipe (`node bench/run.mjs --equipe`).

v2.2.0 (la confiance, 20/10/2026) : cinq chantiers pour qu'une entreprise
puisse vérifier avant d'acheter.
1. **Journal « Ce que Claude a vu »** (`server/journal.js`, outil `journal_ia`) :
   chaque réponse envoyée à l'IA est notée sur le poste après le verrou de
   sortie (`journal-ia/AAAA-MM.jsonl`, droits 600) ; la page locale
   `CE-QUE-CLAUDE-A-VU.html` revérifie tout contre la clé ACTUELLE (audit
   rétroactif), montre une fuite par son code, jamais par sa valeur, et ne cite
   des demandes de l'IA que le nom des paramètres.
2. **Chiffres protégés par défaut** (`server/chiffres.js`, paramètre `chiffres`) :
   gabarit (valeurs factices, défaut), indice (facteur secret par feuille,
   arithmétique juste) ou clair (sur demande). Dates lisibles. Correspondance
   cellule → valeur dans `.nanomizer-chiffres-*.json`.
3. **Remise des chiffres et tableau de bord local** (`remettre_chiffres`,
   `tableau_de_bord`) : l'IA construit sur le gabarit ou décrit un tableau de
   bord ; Hidden Tokens rend le résultat réel sur le poste, en éditant le XML du
   .xlsx (graphiques conservés, caches retirés, une cellule retouchée n'est
   jamais écrasée) ou en dessinant une page HTML autonome. Le protocole interdit
   à l'IA de créer un artefact avec les données de l'utilisateur.
4. **Essai gratuit de 14 jours intégré**, sans serveur ; **devis et factures**
   (`scripts/devis.mjs` — retiré le 21/10/2026 : devis et factures passent par
   le moteur unique de Tardigrade, cf. `LIVRAISON.md`).
5. **Dossier de confiance** (`confiance/`) : fiche sécurité, correspondance loi
   09-08 / RGPD / guide CNB, modèle d'analyse d'impact, cahier des charges
   d'audit. Et la preuve « zéro réseau » à l'exécution : `test/reseau.test.js`
   fait tourner tout le parcours sous le modèle de permissions de Node, réseau
   interdit (Node 25+).
Aussi : le refus des fichiers interdits porte sur le chemin entier. Banc
d'essai : 201/201 (montants des tableurs compris).
Changement de comportement : les montants d'un tableur ne sont plus montrés à
l'IA par défaut — `chiffres: "clair"` rétablit la v2.1.

v2.1.1 (numéro RC après une ville, 20/10/2026) : trouvé par le banc d'essai
des fuites (`npm run bench`, `bench/`) — « RC Rabat 145782 » sortait en clair
d'un PDF, car le motif RC n'acceptait que de la ponctuation entre le libellé et
le numéro. Il accepte désormais une ville (1 à 3 mots capitalisés, ou déjà
codés), « de/du » et « sous le n° » ; la ville reste lisible (« RC Rabat
RC-001 »). Verrouillé par `verrou.test.js` et un canari de `fuite.test.js`.
Banc : 183/183 valeurs codées (182/183 en v2.1.0), lisibilité inchangée.
Aussi : la suite de tests tourne sans la clé privée (clé de test du dépôt,
refusée par l'artefact — contrôle C3 de la campagne).

v2.1.0 (cartes et permis, 08/10/2026) : demandé la veille d'une formation par
le DG d'un acteur de la monétique — « nous utilisons des numéros de cartes
bancaires et de permis ». Le moteur codait déjà ces valeurs, mais une carte
sortait étiquetée « RIB » et un permis « référence » : codé, mais pas
crédible chez des gens qui manipulent des cartes toute la journée. Désormais
`CARTE-001` (13 à 19 chiffres validés par la **clé de Luhn** — un RIB de 24
chiffres ou un ICE de 15 n'en sont jamais ; les numéros masqués
`4111 **** **** 1111` aussi) et `PERMIS-001` (format marocain `15/284731`),
dans les trois modes et dans le verrou ; en-têtes « carte », « card », « PAN »,
« permis » reconnus. Deux tarifs : 500 Dhs HT par poste, 5 000 Dhs HT pour une
équipe (20 postes, une clé).

v2.0.0 (le verrou, 18/09/2026) : né d'un constat — la v1.6 codait ce qu'elle
RECONNAISSAIT ; « Maître Dupont représente M. Karim Benali », une colonne
« Client », un fichier « Dossier Benali.pdf » ou un nom d'onglet passaient en
clair. Pour un avocat, c'est le cas général. Aussi dans la v2.0 : une clé
illisible n'est plus jamais écrasée par une clé vierge (avant : JSON corrompu =
clé repartie de zéro, correspondances perdues) ; écriture atomique +
sauvegarde `cle-de-session.sauvegarde.json` ; droits 600 sur la clé ; licence
**à vie** (voir plus bas). Le dictionnaire pèse 0,8 Mo (bundle 24 Mo).
Limite assumée : un texte qui n'est pas en français courant (arabe ; l'anglais
depuis la v2.26 est lu) est codé presque entièrement — la protection tient, l'utilité baisse, et le
plan le DIT (« X % des mots sont codés »).

v1.5.0 (OCR des scans) : Tesseract embarqué (`tessdata/fra.traineddata`,
aucun téléchargement au premier usage). RÈGLE OCR, aussi dure que la RÈGLE
N°1 : **le texte reconnu ne remonte jamais dans le chat** et la relecture
humaine est une étape obligatoire du flux — l'OCR se trompe (une ligne de
tableau perdue, « Hassan II » lu « Hassan Il ») et un identifiant mal reconnu
échapperait au dictionnaire, donc passerait en clair pendant que le rapport
annoncerait « rien détecté ». Un OCR silencieux, c'est une fausse sécurité.
`anonymiser_fichier` accepte aussi les `.md`/`.txt` : c'est là qu'atterrit le
scan relu. Bundle 4,4 → 23 Mo (le prix de l'OCR hors ligne) — ne PAS élaguer
tesseract.js-core, cf. `.mcpbignore`.

v1.4.0 (PDF natifs) : `anonymiser_fichier` et `anonymiser_dossier` lisent
les PDF NATIFS (unpdf) — le contenu est extrait, anonymisé comme un document
(dictionnaire marocain + noms d'office) et livré en `.md` ; le PDF n'est
JAMAIS réécrit (la rédaction visuelle = calques résiduels = fausse sécurité),
et un PDF scanné est REFUSÉ honnêtement (OCR non supporté) plutôt que de
rendre un « rien détecté » mensonger. Fixtures de test : PDF minimal écrit à
la main (`test/util-pdf.mjs`), zéro dépendance de génération.

v1.1.0 (mode document) : né d'un test réel — une facture traitée en mode
tableau finissait codée à 100 % (32/33 cellules), et la règle téléphone
« 9-15 chiffres » transformait les montants en TEL-xxx. Désormais : téléphone =
forme marocaine uniquement, et un changement de dossier de travail exige un
redémarrage de Claude Desktop (l'env d'un process ne change pas en vol).

La clé vit dans `<dossier de travail>/Hidden-Tokens/` : `cle-de-session.json`
(état) + `cle-correspondance-NE-JAMAIS-PARTAGER.xlsx` (export humain/compatible web).

## Le registre de l'organisation (v2.20)

`server/registre.js` + `server/enveloppe.js` : une clé de codes pour toute
l'organisation, entrées chiffrées sur le dossier partagé, registre signé par
la console admin (`apps/nanomizer-admin/lib/registre.js`, `sequestre.js`,
`feuille.js`). Le connecteur ne l'utilise que lancé par la sentinelle
(`ANX_REGISTRE_DIR`, `ANX_POSTE_ID`, secrets par `ANX_POSTE_SECRETS_FD`) ; il
remplace alors la clé d'équipe. Spec : `SPEC-REGISTRE-ORGANISATION.md` du dépôt
nanomizer. Tests : `test/registre.test.js`, `test/registre-e2e.test.js`.

## Dev

```bash
npm install        # deps (SDK MCP v2, zod, SheetJS 0.20.3 via cdn.sheetjs.com)
npm test           # node --test : moteur + E2E stdio (vrai protocole MCP)
npx @anthropic-ai/mcpb pack . dist/hidden-tokens.mcpb
```

La suite tourne **sans la clé privée** : elle signe ses licences avec une clé
de TEST publiée dans le dépôt (`test/fixtures/licence-test.key`,
`test/licence-test.mjs`). Le serveur ne fait confiance à cette clé que lancé
depuis les sources : `test/` est exclu du bundle, donc l'artefact distribué
la refuse (contrôle C3 de la campagne). Une licence signée par la clé de test
ne vaut rien chez un client. La vraie clé privée, si elle est sur le poste,
ne sert qu'à un test : qu'elle corresponde toujours à la clé publique embarquée.

Piège : le build ESM de SheetJS exige `XLSX.set_fs(fs)` avant tout
readFile/writeFile.

Depuis le 09/10/2026, **la même clé débloque l'appli web** (`ai4x-website/anonymiseur-local.html`,
bouton « J'ai une clé » ; vérification Ed25519 dans le navigateur, même clé publique) : sans
clé, l'appli est la version *Découverte* — 50 lignes par fichier, une clé par fichier,
tableaux seulement, dé-anonymisation toujours possible.

Distribution (décision du 21/10/2026, qui remplace la licence à vie) :
**abonnement annuel par poste** — Solo 390 € HT/an, Cabinet de 2 à 20 postes
290 € HT par poste et par an, au-delà sur devis ; Maroc 1 200 / 900 Dhs HT.
**Vendu et facturé par TARDIGRADE SARL** (Ai4x) ; devis et factures par le
moteur unique de Tardigrade (YG-OS). Commande : formulaire de
ai4x.academy/nanomizer (devis, virement), ou par carte pour le Solo marocain ;
le `.mcpb` se télécharge sur la même page (essai de 14 jours intégré).
Conditions : ai4x.academy/nanomizer-conditions. Voir `LIVRAISON.md`.
Installation côté client : double-clic sur le `.mcpb` → Claude Desktop
propose « Installer ».

## Licences

Vérification **100 % hors ligne** : la clé est un jeton signé Ed25519 que le
connecteur vérifie avec une clé publique embarquée. Aucun appel réseau — un
outil qui promet « rien ne sort » ne peut pas téléphoner pour se valider.

Trois règles qui priment sur la protection :

1. **Le décodage ne s'arrête jamais.** À l'expiration, `anonymiser_fichier`,
   `anonymiser_dossier` et `lire_scan` se bloquent ; `deanonymiser` et
   `etat_cle` continuent **pour toujours**. Les données d'un client ne sont
   jamais prises en otage par une facture impayée.
2. **On prévient dès J-30**, dans chaque réponse d'outil.
3. **La licence ne parle de personne** : titulaire, postes, dates. Aucune
   donnée d'usage, aucune empreinte machine, rien qui ressemble à de la
   télémétrie.

C'est une **serrure de courtoisie, pas un DRM** : le code est du JavaScript
lisible. Le but est de structurer une relation commerciale, pas de gagner une
course aux armements — un vrai DRM se paierait en promesse de confidentialité.

Émettre une clé (interne, jamais dans le bundle) :

```bash
node scripts/emettre-licence.mjs --org "Maître X"                     # Solo, 1 an
node scripts/emettre-licence.mjs --org "Cabinet X" --postes 5         # Cabinet, 1 an
node scripts/emettre-licence.mjs --org "Cabinet X" --postes 5 --depuis 2027-10-21   # renouvellement
```

Une licence à vie porte `exp: "9999-12-31"` ET `life: true` : la v2 affiche
« à vie » et n'avertit jamais d'échéance ; une v1.6 déjà installée l'accepte
aussi (elle lit une date lointaine). Le script imprime le message WhatsApp de
livraison, prêt à copier.

⚠️ La clé privée vit **hors dépôt** (par défaut sur le Bureau,
`nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt` ; sinon pointer
`NANOMIZER_PRIVATE_KEY_FILE` dessus — au 18/09/2026 elle est rangée dans
`Bureau/Archive/…/Testing Nanomizer/`). Sans elle, personne ne peut
émettre de licence ; avec elle, n'importe qui le peut. Ne jamais la committer,
ne jamais l'envoyer, ne jamais la coller dans un chat.

Côté client : réglages de l'extension → « Clé de licence » → coller →
**redémarrer Claude Desktop** (l'env d'un process ne change pas en vol).

⚠️ v1.6.1 — piège des gabarits `user_config`. Un champ **optionnel laissé vide**
n'est pas substitué par Claude Desktop : la variable d'environnement reçoit
littéralement `${user_config.licence}`. Non filtrée, cette chaîne se lisait
comme une clé mal formée (« format inconnu ») et laissait croire à un problème
de clé alors qu'aucune n'avait été collée. `isUnsubstituted()` (licence.js) la
traite désormais comme une valeur absente, pour la licence **et** pour le
dossier de travail ; les trois situations (absente / refusée / expirée) ont
maintenant trois messages distincts, chacun disant quel geste faire. Verrouillé
par la série C de `test/campagne-mvp.mjs`, qui rejoue le cas sur l'artefact.

La campagne de validation (`node test/campagne-mvp.mjs`, 44 contrôles) émet
elle-même une licence d'un jour avec la clé privée du poste — sans quoi elle ne
testerait que l'écran de blocage. Elle exige la VRAIE clé (elle teste
l'artefact, qui ne connaît que la clé de production) et vérifie que la clé de
test n'y est ni embarquée ni honorée (C3).## Les packs métier (v2.21–2.24)

`packs/<id>.json` : des règles livrées avec le connecteur (motifs avec clé de
contrôle `luhn`/`iban`, préfixes du moteur autorisés, termes en clair, et
depuis la 2.22 des `entetes` : en mode tableau, un en-tête reconnu force la
colonne sous le préfixe), activées par référence — `"packs": [...]` dans
`Hidden-Tokens/reglages.json` (appli) ou dans la politique signée (console).
`server/packs.js` les développe à chaque compilation des règles ; un pack
inconnu bloque l'anonymisation. Sept packs : `telecom-ma`, `juridique-fr`,
`banque-assurance`, `sante`, `expertise-comptable`, `rh-paie`, `notariat-ma`.
Spec : `SPEC-PACKS-METIER.md` (dépôt nanomizer). Tests : `test/packs.test.js`.

**`notariat-ma` (v2.25)** — l'étude de notaire marocaine. Codés, chacun sous
son préfixe, le libellé restant devant le code (« titre foncier n° TF-001 ») :
le numéro de titre foncier avec son indice de conservation (`12345/63`,
`28.517/C`, `18 220/F` ; « TF », « T.F. », « titre foncier [mère] »,
énumérations « n° 3310/F et 3311/F » comprises) → `TF` ; la réquisition
d'immatriculation → `REQUISIT` ; la minute et le répertoire annoncés →
`MINUTE`, `REPERTOIRE` ; la référence d'un acte adoulaire ou d'hérédité
(« n° 345, page 210 ») → `ADOUL` ; le nom de la propriété (« propriété dite
« … » ») → `PROPRIETE`. En clair : conservation foncière, ANCFCC, Tadbirnot,
hypothèque, mainlevée, indivision, succession, actes (vente, promesse,
partage, adoulaire, hérédité), droits réels, fiscalité de l'acte (droits
d'enregistrement, taxe notariale, TPI, quitus). Parties, CIN, RIB, ICE, RC,
adresses : le moteur, comme partout. Le verrou connaît désormais `TF`,
`ANCFCC`, `Tadbirnot`, `adoul` : jamais pris pour des noms, pack actif ou
non. Pas de motif cadastral : le Maroc n'a pas de référence de parcelle au
format reconnaissable hors du titre ou de la réquisition (un « lot n° » de
lotissement est trop ambigu, et `LOT` est déjà pris par le pack santé).

Le banc (`npm run bench`) mesure désormais les montants en gabarit
(`ANX_CHIFFRES=auto` pour mesurer le défaut « auto » de la v2.16, qui laissait
11 montants de tableur en clair : 190/201).

**Packs par défaut (v2.25).** Un dossier qui n'a pas choisi ses packs reçoit
d'office `telecom-ma`, `juridique-fr`, `rh-paie`, `banque-assurance` et
`expertise-comptable` (`PACKS_PAR_DEFAUT`, `server/packs.js`). Un dossier
« n'a pas choisi » quand il n'a pas de `reglages.json`, ou un `reglages.json`
sans clé `packs`. Le plan les signale par « (par défaut) ».
- **Choisir l'emporte.** `"packs": [...]` dans `reglages.json` remplace les
  packs par défaut, et `"packs": []` les retire tous. Une politique signée qui
  déclare `packs` les remplace aussi, pour les postes qu'elle vise.
- **Pourquoi ces cinq.** Ils sont choisis par la mesure (HT-Bench,
  `npm run bench:ht:packs`) : activés pour tous les documents, ils font monter
  le rappel des identifiants directs, ne corrompent aucune sortie et ne
  codent aucun leurre chez les autres métiers. `sante` reste à activer, parce
  que ses motifs corrompent encore des sorties.
- **Lisibilité.** Le vocabulaire d'un pack (« Cour de cassation »,
  « EBITDA », « LCN ») reste lisible dans l'aperçu montré à l'IA. Les termes
  qu'un dossier ou une organisation laisse en clair restent masqués, parce
  qu'ils peuvent être des noms.

Tests : `test/packs-defaut.test.js`.


