# Nanomizer — Anonymiseur de données Ai4x (connecteur MCP local)

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
   d'actes). Tout le reste est codé : noms propres (même au fil d'une phrase,
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
| `lister_fichiers` | Liste les fichiers traitables (Excel, CSV, PDF, .md/.txt, scans) — noms propres masqués (•••), repère stable `[F-XXXXX]` |
| `anonymiser_fichier` | Deux temps (plan sans `confirmer`, exécution avec) ; modes TABLEAU (colonnes entières), DOCUMENT (facture → codage intra-cellule, dictionnaire marocain) et TEXTE/PDF ; le verrou passe ENSUITE partout (colonnes lisibles et en-têtes compris). `onglet` par numéro. Garde-fou : un document forcé en tableau (>40 % de cellules codées) est refusé |
| `anonymiser_dossier` | LOT : tous les fichiers (ou filtrés par `motif`), toutes les feuilles, UNE clé, plan→confirmer, compte rendu en comptes seuls + rapport `rapport-lot-*.md` (noms de fichiers codés) |
| `lire_scan` | OCR LOCAL d'un scan — le texte reconnu n'entre JAMAIS dans la conversation : il est écrit en `…-ocr-A-RELIRE.md` (nom codé), l'utilisateur le relit, PUIS on anonymise ce fichier |
| `deanonymiser` | Retraduit texte/TSV → fichier local (.md ou .xlsx, droits 600), jamais dans le chat |
| `etat_cle` | Comptes par type, licence, résumé de l'audit de confinement |
| `verifier_confinement` | Audit hors ligne : autres extensions / serveurs MCP / Cowork qui voient le dossier, pilotage navigateur, synchronisation cloud, droits de la clé |
| `reinitialiser_cle` | Archive la clé (datée) et repart de zéro — confirmation exigée |

v2.0.0 (le verrou, 18/09/2026) : né d'un constat — la v1.6 codait ce qu'elle
RECONNAISSAIT ; « Maître Dupont représente M. Karim Benali », une colonne
« Client », un fichier « Dossier Benali.pdf » ou un nom d'onglet passaient en
clair. Pour un avocat, c'est le cas général. Aussi dans la v2.0 : une clé
illisible n'est plus jamais écrasée par une clé vierge (avant : JSON corrompu =
clé repartie de zéro, correspondances perdues) ; écriture atomique +
sauvegarde `cle-de-session.sauvegarde.json` ; droits 600 sur la clé ; licence
**à vie** (voir plus bas). Le dictionnaire pèse 0,8 Mo (bundle 24 Mo).
Limite assumée : un texte qui n'est pas en français courant (anglais, arabe)
est codé presque entièrement — la protection tient, l'utilité baisse, et le
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

La clé vit dans `<dossier de travail>/Anonymiseur-Ai4x/` : `cle-de-session.json`
(état) + `cle-correspondance-NE-JAMAIS-PARTAGER.xlsx` (export humain/compatible web).

## Dev

```bash
npm install        # deps (SDK MCP v2, zod, SheetJS 0.20.3 via cdn.sheetjs.com)
npm test           # node --test : moteur + E2E stdio (vrai protocole MCP)
npx @anthropic-ai/mcpb pack . dist/anonymiseur-ai4x.mcpb
```

Piège : le build ESM de SheetJS exige `XLSX.set_fs(fs)` avant tout
readFile/writeFile.

Distribution (décision du 18/09/2026) : **licence à vie, 500 Dhs, commande
sur WhatsApp** (+212 680 092 567), comme le reste du catalogue Ai4x — pas de
paiement en ligne : RIB envoyé sur WhatsApp, virement, puis le `.mcpb` et la
clé partent sur WhatsApp. Voir `LIVRAISON.md`. La LP `/anonymiseur-donnees`
présente l'offre (#connecteur, #plans). Installation côté client : double-clic
sur le `.mcpb` → Claude Desktop propose « Installer ».

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
node scripts/emettre-licence.mjs --org "Maître X" --a-vie          # l'offre 500 Dhs
node scripts/emettre-licence.mjs --org "Cabinet X" --postes 5 --mois 12
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

La campagne de validation (`node test/campagne-mvp.mjs`, 42 contrôles) émet
elle-même une licence d'un jour avec la clé privée du poste — sans quoi elle ne
testerait que l'écran de blocage.
