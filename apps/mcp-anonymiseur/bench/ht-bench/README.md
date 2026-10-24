# HT-Bench — banc de détection du moteur Hidden Tokens

HT-Bench mesure ce que le moteur **code** et ce qu'il **laisse passer**, type par type et pack par pack, sur un jeu de documents **synthétiques** : noms marocains, maghrébins et français écrits en caractères latins, identifiants marocains et français dans toutes leurs écritures, transcriptions de centre d'appels, conclusions, bulletins de paie, comptes rendus médicaux, relevés bancaires, factures. Les scores publiés par pack serviront au rapport « État de la confidentialité IA 2026 ».

Règle fixe : **aucune donnée réelle, aucun appel réseau.** Les noms viennent de listes de patronymes courants recombinés au hasard. Les numéros sont tirés au hasard puis complétés par leur clé de contrôle (Luhn, mod 97…) : ils ont la forme d'un vrai numéro et ne désignent personne. Le moteur tourne en local, avec la licence de TEST du dépôt.

## Lancer

```bash
npm run bench:ht            # note le jeu → resultats/ht-bench.json + resultats/RAPPORT.md
npm run bench:ht:controle   # idem, puis échec si le rappel sur les identifiants directs passe sous reference.json
npm run bench:ht:generer    # régénère dataset/ depuis la graine (après un changement de gabarit ou de cas)
node bench/ht-bench/evaluer.mjs --enregistrer-reference   # réécrit reference.json
```

Le banc complet prend une dizaine de secondes. En CI, le job `ht-bench` (`.github/workflows/mcp-anonymiseur.yml`) fait deux choses : il vérifie que `dataset/` est bien celui que produit la graine, et il échoue si le rappel des identifiants directs baisse, que ce soit au global, pour un pack ou pour un type. Le rapport est joint à l'exécution. `test/ht-bench.test.js` couvre les pièces du banc qui n'ont pas besoin du moteur (balisage, réalignement, règle de score).

`npm run bench` (le banc des fuites, `bench/run.mjs`) reste à part. Il pose une autre question : sur un petit corpus réaliste et tout le parcours MCP, une valeur se retrouve-t-elle quelque part dans ce que lit l'IA ?

## Ce qui est mesuré

Chaque document passe par **`anonymiser_fichier` sur un `.md`**, c'est-à-dire `codeFreeText` : moteur, puis verrou. C'est le même codage que `coder_texte` et que pour un PDF. Le connecteur est lancé par le vrai protocole MCP, avec le pack du document activé dans `reglages.json`, comme dans l'appli. La clé est remise à zéro entre deux documents. On lit le fichier `*-anonymise.md` écrit sur le poste, c'est-à-dire la sortie du moteur **avant** le verrou de sortie. Le texte codé est ensuite réaligné sur l'original (`lib/alignement.mjs`).

- **Détectée** : toutes les lettres et chiffres de la valeur sont sous un code. Font exception les mots qui ne révèlent rien seuls : les particules d'un nom (Ben, El, Aït, Ould, de, Le…), et pour une adresse, les numéros courts et les mots de structure (n°, Imm., rue, Douar…).
- **Partielle** : une partie seulement de la valeur est codée. C'est une fuite, comptée comme manquée. La colonne « Resté en clair » du rapport dit exactement quoi.
- **Rappel(type)** = valeurs détectées / valeurs étiquetées, quel que soit le préfixe : une valeur codée REF au lieu de SIRET est protégée. La colonne « Bon préfixe » dit si le préfixe est le bon.
- **Précision(type)** = parmi les passages codés sous un préfixe de ce type, ceux qui recouvrent bien une valeur de ce type. **Précision(pack)** = parmi tous les passages codés, ceux qui recouvrent une valeur étiquetée. Comme le verrou code tout mot inconnu, cette précision baisse quand il sur-code.
- **F1** = 2PR / (P + R).
- **Leurres codés** : un leurre (montant, date, article de loi, sigle, mot courant, ville seule, médicament…) est un faux positif dès qu'un de ses caractères est codé.
- **Identifiants directs** : noms, CIN, NIR, CNSS, ICE, IF, RC, SIREN, SIRET, téléphones, e-mails, IBAN, RIB, IMEI, IMSI. La cible est un rappel ≥ 99 % par pack, et c'est ce rappel que contrôle la CI. Les autres types (adresse, société, date de naissance, BIC, numéros de dossier…) sont mesurés mais pas contrôlés.
- **Vu par l'IA** : pour chaque valeur manquée, le banc regarde si le morceau resté en clair apparaît encore dans la réponse de `coder_texte`, verrou de sortie compris, ou si ce dernier filet l'a rattrapé.
- **Sortie corrompue** : il arrive que le texte codé ne soit plus « l'original + des codes », par exemple avec des codes imbriqués (`NOM-001-002`) ou un morceau de mot recodé. Le document est alors réaligné par plus longue sous-suite commune et signalé dans le rapport.

## Arborescence

| Fichier | Rôle |
|---|---|
| `generer.mjs` | Génère `dataset/` à partir de la graine (`--verifier` en CI) |
| `evaluer.mjs` | Fait passer le jeu dans le moteur, note, écrit `resultats/`, contrôle la référence |
| `reference.json` | Rappel de référence sur les identifiants directs (global, par pack, par type) |
| `dataset/ht-bench.jsonl` | Le jeu versionné : un document par ligne, `texte`, `etendues` (positifs), `leurres` |
| `dataset/manifeste.json` | Version, graine, empreinte sha256, comptes par pack et par type |
| `lib/types.mjs` | Catalogue des types (préfixes attendus, direct ou non) et des leurres |
| `lib/noms.mjs`, `lib/identifiants.mjs` | Valeurs synthétiques : noms, CIN, ICE, RIB, IBAN, NIR, téléphones… |
| `lib/fabrique.mjs`, `lib/gabarits.mjs` | Gabarits de documents, par pack |
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

**Une famille de cas** (une nouvelle écriture de téléphone, un nouveau document métier) : ajoutez une variante dans `lib/identifiants.mjs` ou `lib/noms.mjs`, ou un gabarit dans `lib/gabarits.mjs`. Le `PLAN` en bas du fichier fixe le nombre de documents par gabarit. Un nouveau type va dans `lib/types.mjs`.

Ensuite :

1. `npm run bench:ht:generer` régénère `dataset/`. Si le jeu change de nature, montez `VERSION_JEU` dans `generer.mjs`.
2. `npm run bench:ht` : relisez `resultats/RAPPORT.md`, en particulier les nouvelles valeurs manquées et les leurres codés. Une étiquette fausse fausse tout le banc.
3. `node bench/ht-bench/evaluer.mjs --enregistrer-reference` : le jeu a changé, donc l'ancienne référence ne vaut plus (`--controle` le signale).
4. Versionnez `dataset/`, `reference.json` et `resultats/`.

Toutes les valeurs restent **inventées** : jamais un vrai nom, un vrai numéro, ni un extrait d'un vrai dossier, même « anonymisé ».

## Faire progresser la référence

Une amélioration du moteur fait monter le rappel. Enregistrez alors la nouvelle référence dans la même PR : elle devient le plancher. Une PR qui fait baisser le rappel d'un pack ou d'un type échoue en CI. Si la baisse est voulue (un compromis assumé), réenregistrer la référence dans cette PR rend le compromis visible dans le diff de `reference.json`.

## Limites de la v0

- Texte seulement (le chemin `.md` / PDF / `coder_texte`). Les modes tableau et document d'un classeur Excel, et Word, ne sont pas notés ici : le banc des fuites (`npm run bench`) les couvre par un autre angle.
- Un seul pack par document, sans politique de cabinet.
- Les noms arabes en écriture arabe ne sont pas couverts, seulement leur translittération latine.
