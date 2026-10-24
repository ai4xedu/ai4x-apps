# HT-Bench — banc de détection du moteur Hidden Tokens

HT-Bench mesure ce que le moteur **code** et ce qu'il **laisse passer**, type par type, pack par pack, langue par langue et chemin par chemin (.md, Word, Excel), sur un jeu de documents **synthétiques** : noms marocains, maghrébins et français en lettres latines, **en lettres arabes** et **en arabizi** (darija écrite avec des chiffres : 3abdellah, 7mida), identifiants marocains et français dans toutes leurs écritures (chiffres arabes orientaux ٠٦٦١… compris), transcriptions de centre d'appels, exports WhatsApp, conclusions, bulletins de paie, comptes rendus médicaux, relevés bancaires, factures, et des exports en tableau (liste de clients, état de paie, relevé, journal d'appels). Les scores publiés par pack serviront au rapport « État de la confidentialité IA 2026 ».

Règle fixe : **aucune donnée réelle, aucun appel réseau.** Les noms viennent de listes de patronymes courants recombinés au hasard. Les numéros sont tirés au hasard puis complétés par leur clé de contrôle (Luhn, mod 97…) : ils ont la forme d'un vrai numéro et ne désignent personne. Le moteur tourne en local, avec la licence de TEST du dépôt.

## Lancer

```bash
npm run bench:ht            # note le jeu → resultats/ht-bench.json + resultats/RAPPORT.md (+ RAPPORT-<chemin>.md)
npm run bench:ht:controle   # idem, puis échec si le rappel sur les identifiants directs passe sous reference.json
npm run bench:ht:generer    # régénère dataset/ depuis la graine (après un changement de gabarit ou de cas)
node bench/ht-bench/evaluer.mjs --enregistrer-reference   # réécrit reference.json
node bench/ht-bench/evaluer.mjs --chemin md,docx          # mise au point : seulement ces chemins
```

Le banc complet prend une à deux minutes (quatre connecteurs en parallèle). En CI, le job `ht-bench` (`.github/workflows/mcp-anonymiseur.yml`) fait deux choses : il vérifie que `dataset/` est bien celui que produit la graine, et il échoue si le rappel des identifiants directs baisse, sur un chemin, au global, pour un pack, une langue ou un type, ou si le moteur refuse plus de documents. Le rapport est joint à l'exécution. `test/ht-bench.test.js` couvre les pièces du banc qui n'ont pas besoin du moteur (balisage, réalignement, règle de score, écriture arabe, mise en Word et en Excel).

`npm run bench` (le banc des fuites, `bench/run.mjs`) reste à part. Il pose une autre question : sur un petit corpus réaliste et tout le parcours MCP, une valeur se retrouve-t-elle quelque part dans ce que lit l'IA ?

## Ce qui est mesuré

Le connecteur est lancé par le vrai protocole MCP, avec le pack du document activé dans `reglages.json`, comme dans l'appli. La clé est remise à zéro entre deux documents. Chaque document passe par **`anonymiser_fichier`**, sur quatre chemins notés à part :

| Chemin | Documents | Ce qu'on donne au moteur | Ce qu'on relit |
|---|---|---|---|
| `md` | les documents texte | un `.md` : `codeFreeText`, moteur puis verrou, le même codage que `coder_texte` et qu'un PDF | `*-anonymise.md` ; la réponse de `coder_texte` sert au « Vu par l'IA » |
| `docx` | les mêmes | un `.docx` : un paragraphe par ligne, une ligne « a \| b » devient une ligne de tableau Word, libellé en gras, runs coupés au hasard (parfois au milieu d'une valeur), paragraphes arabes en droite-à-gauche | les paragraphes de `*-anonymise.docx` |
| `xlsx-document` | les mêmes | un `.xlsx` en mode document : une ligne = une ligne de la feuille ; « Libellé : valeur », « a \| b », « a — b » = des cellules voisines | les cellules de `*-anonymise.xlsx` |
| `xlsx-tableau` | les exports en tableau | un `.xlsx` en mode tableau : ligne d'en-têtes, une ligne par enregistrement ; une cellule de chiffres sans zéro en tête est un nombre Excel (un téléphone y perd son 0) | les cellules de `*-anonymise.xlsx` |

Pour Word et Excel, le document étiqueté est découpé en paragraphes ou en cellules sans jamais couper une valeur, et le texte « dérivé » (paragraphes joints par un saut de ligne, cellules par une tabulation) porte les étendues recalculées (`lib/formats.mjs`). La sortie relue dans le même ordre est réalignée sur ce texte comme pour un `.md` (`lib/alignement.mjs`). Dans tous les cas, on lit le fichier écrit sur le poste, c'est-à-dire la sortie du moteur **avant** le verrou de sortie.

- **Détectée** : toutes les lettres et chiffres de la valeur sont sous un code. Font exception les mots qui ne révèlent rien seuls : les particules d'un nom (Ben, El, Aït, Ould, de, Le…), et pour une adresse, les numéros courts et les mots de structure (n°, Imm., rue, Douar…, رقم، زنقة، شارع، حي، إقامة، دوار…). En arabe, les lettres sont comparées sans voyelles ni hamza, et les chiffres arabes orientaux (٠١٢…) comme des chiffres latins.
- **Partielle** : une partie seulement de la valeur est codée. C'est une fuite, comptée comme manquée. La colonne « Resté en clair » du rapport dit exactement quoi.
- **Rappel(type)** = valeurs détectées / valeurs étiquetées, quel que soit le préfixe : une valeur codée REF au lieu de SIRET est protégée. La colonne « Bon préfixe » dit si le préfixe est le bon.
- **Précision(type)** = parmi les passages codés sous un préfixe de ce type, ceux qui recouvrent bien une valeur de ce type. **Précision(pack)** = parmi tous les passages codés, ceux qui recouvrent une valeur étiquetée. Comme le verrou code tout mot inconnu, cette précision baisse quand il sur-code.
- **F1** = 2PR / (P + R).
- **Leurres codés** : un leurre (montant, date, article de loi, sigle, mot courant, ville seule, médicament…) est un faux positif dès qu'un de ses caractères est codé.
- **Identifiants directs** : noms, CIN, NIR, CNSS, ICE, IF, RC, SIREN, SIRET, téléphones, e-mails, IBAN, RIB, IMEI, IMSI. La cible est un rappel ≥ 99 % par pack, et c'est ce rappel que contrôle la CI. Les autres types (adresse, société, date de naissance, BIC, numéros de dossier…) sont mesurés mais pas contrôlés.
- **Vu par l'IA** : pour chaque valeur manquée, le banc regarde si le morceau resté en clair apparaît encore dans la réponse de `coder_texte`, verrou de sortie compris, ou si ce dernier filet l'a rattrapé.
- **Texte lisible** : parmi les lettres et chiffres qui n'appartiennent à aucune valeur étiquetée (le texte du document, leurres compris), la part restée en clair. Un document codé d'un seul bloc a un rappel parfait et une lisibilité nulle : c'est ce qui arrive à l'arabe.
- **Par langue** : chaque document porte sa langue, `fr`, `ar` (écriture arabe), `fr-ar` (bilingue, ou paragraphe qui passe d'une écriture à l'autre) ou `darija-latin` (arabizi). Le rapport donne rappel, leurres codés et texte lisible par langue.
- **Document refusé** : le moteur n'a écrit aucun fichier, par prudence (par exemple le contrôle final d'un .docx qui trouve encore une valeur de la clé dans le paquet). Rien n'atteint l'IA, mais l'utilisateur ne peut pas travailler. Le document est listé à part et n'entre pas dans les taux ; la CI échoue si leur nombre augmente.
- **Sortie corrompue** : il arrive que le texte codé ne soit plus « l'original + des codes », par exemple avec des codes imbriqués (`NOM-001-002`) ou un morceau de mot recodé. Le document est alors réaligné par plus longue sous-suite commune et signalé dans le rapport.

## Arborescence

| Fichier | Rôle |
|---|---|
| `generer.mjs` | Génère `dataset/` à partir de la graine (`--verifier` en CI) |
| `evaluer.mjs` | Fait passer le jeu dans le moteur, note, écrit `resultats/`, contrôle la référence |
| `reference.json` | Rappel de référence sur les identifiants directs, par chemin (global, par pack, par langue, par type) et nombre de documents refusés |
| `dataset/ht-bench.jsonl` | Le jeu versionné : un document par ligne, `texte`, `etendues` (positifs), `leurres`, `langue`, `forme` (`texte` ou `tableau`) |
| `dataset/manifeste.json` | Version, graine, empreinte sha256, comptes par pack et par type |
| `lib/types.mjs` | Catalogue des types (préfixes attendus, direct ou non) et des leurres |
| `lib/noms.mjs`, `lib/identifiants.mjs` | Valeurs synthétiques : noms (latin, arabe, arabizi), CIN, ICE, RIB, IBAN, NIR, téléphones, chiffres arabes orientaux… |
| `lib/fabrique.mjs`, `lib/gabarits.mjs` | Gabarits de documents, par pack |
| `lib/gabarits-ar.mjs` | Gabarits en arabe, bilingues et en arabizi (courrier, fiche bilingue, WhatsApp, transcription darija, SMS, avis de virement, certificat, attestation) |
| `lib/tableaux.mjs` | Exports en tableau, un par pack (chemin `xlsx-tableau`) |
| `lib/formats.mjs` | Mise en Word et en Excel, texte dérivé, relecture d'une feuille |
| `cas/manuels.mjs` | Cas écrits à la main |

Les positions `debut` / `fin` sont des indices de caractères JavaScript (UTF-16) dans `texte`.

## Ajouter des cas

**Un piège précis** (une tournure, une écriture, un faux ami) : ajoutez une entrée dans `cas/manuels.mjs`, avec un `id` stable de la forme `<pack>/manuel/<sujet>`, le `pack` concerné, une `note`, et le texte balisé ainsi :

```
[[TYPE:valeur]]                         à coder
[[TYPE|écriture:valeur]]                … avec son écriture (pour le tableau « Par écriture »)
[[TYPE|écriture|trait,trait:valeur]]    … et ses traits (nom-seul, minuscules…)
{{LEURRE:valeur}}                       doit rester lisible
```

`TYPE` et `LEURRE` viennent de `lib/types.mjs`. N'importe quel texte non balisé est neutre : s'il est codé, la précision du pack baisse, mais ce n'est pas un faux positif sur leurre.

Un cas en arabe ou en darija porte aussi sa `langue` (`ar`, `fr-ar`, `darija-latin` ; `fr` par défaut).

**Une famille de cas** (une nouvelle écriture de téléphone, un nouveau document métier) : ajoutez une variante dans `lib/identifiants.mjs` ou `lib/noms.mjs`, ou un gabarit dans `lib/gabarits.mjs` (`lib/gabarits-ar.mjs` pour l'arabe et la darija, où chaque gabarit déclare sa langue). Le `PLAN` en bas de `gabarits.mjs` fixe le nombre de documents par gabarit. Un export en tableau va dans `lib/tableaux.mjs` : une liste de lignes, chaque ligne une liste de cellules balisées, sans tabulation ni saut de ligne. Un nouveau type va dans `lib/types.mjs`.

Ensuite :

1. `npm run bench:ht:generer` régénère `dataset/`. Si le jeu change de nature, montez `VERSION_JEU` dans `generer.mjs`.
2. `npm run bench:ht` : relisez `resultats/RAPPORT.md`, en particulier les nouvelles valeurs manquées et les leurres codés. Une étiquette fausse fausse tout le banc.
3. `node bench/ht-bench/evaluer.mjs --enregistrer-reference` : le jeu a changé, donc l'ancienne référence ne vaut plus (`--controle` le signale).
4. Versionnez `dataset/`, `reference.json` et `resultats/`.

Toutes les valeurs restent **inventées** : jamais un vrai nom, un vrai numéro, ni un extrait d'un vrai dossier, même « anonymisé ».

## Faire progresser la référence

Une amélioration du moteur fait monter le rappel. Enregistrez alors la nouvelle référence dans la même PR : elle devient le plancher. Une PR qui fait baisser le rappel d'un pack ou d'un type échoue en CI. Si la baisse est voulue (un compromis assumé), réenregistrer la référence dans cette PR rend le compromis visible dans le diff de `reference.json`.

## Limites

- Un seul pack par document, sans politique de cabinet.
- Excel : une feuille par classeur, pas de formules, pas de cellules fusionnées ; on force le mode (`document` ou `tableau`), on ne mesure pas la détection automatique de la mise en page. Word : ni en-têtes ni pieds de page, ni commentaires, ni révisions.
- Le PDF n'a pas de chemin à lui : il passe par le même codage que le `.md` une fois le texte extrait, et l'extraction n'est pas mesurée ici.
- Arabe : arabe standard et darija marocaine seulement, sans tatweel ni ligatures de saisie ; le verrou de sortie (« Vu par l'IA ») n'est mesuré que sur le chemin `.md`.
