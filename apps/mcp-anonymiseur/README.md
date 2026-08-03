# Anonymiseur de données Ai4x — connecteur MCP local

Extension Claude Desktop (`.mcpb`) : Claude anonymise les fichiers Excel/CSV,
les factures PDF et les scans **sur le poste de l'utilisateur**, travaille sur les codes (`NOM-001`…), puis
dé-anonymise le résultat **sur le disque** — les données personnelles
n'entrent jamais dans la conversation.

Jumeau du moteur de l'appli web `ai4x.academy/anonymiseur-donnees`
(ai4x-website/anonymiseur-local.html) : mêmes détections, mêmes codes, clé
compatible (export xlsx réimportable dans l'appli web).

## Règle de conception n°1

**Aucune valeur réelle ne remonte dans un résultat d'outil.**
`anonymiser_fichier` renvoie le tableau codé (colonnes suspectes masquées dans
l'aperçu), `deanonymiser` écrit sur disque et ne renvoie qu'un chemin + des
compteurs, `etat_cle` ne renvoie que des comptes. Les tests E2E
(`test/e2e.test.js`) verrouillent ces invariants — ne jamais les affaiblir.

## Outils

| Outil | Rôle |
|---|---|
| `lister_fichiers` | Liste les .xlsx/.xls/.csv/.pdf du dossier de travail |
| `anonymiser_fichier` | Deux temps (plan sans `confirmer`, exécution avec) et deux modes auto-choisis : TABLEAU (colonnes entières) ou DOCUMENT (facture mise en page → codage intra-cellule, dictionnaire marocain ICE/IF/RC/CNSS/patente/RIB/tél ; libellés et montants JAMAIS codés). `valeurs_a_coder` pour les noms propres. Garde-fou : un document forcé en tableau (>40 % de cellules codées) est refusé |
| `anonymiser_dossier` | LOT : tous les fichiers du dossier (ou filtrés par `motif`), toutes les feuilles, UNE clé partagée, plan→confirmer, compte rendu en comptes seuls + rapport local `rapport-lot-*.md` |
| `lire_scan` | OCR LOCAL d'un scan (image ou PDF sans texte) — le texte reconnu n'entre JAMAIS dans la conversation : il est écrit en `…-ocr-A-RELIRE.md`, l'utilisateur le relit et le corrige, PUIS on anonymise ce fichier |
| `deanonymiser` | Retraduit texte/TSV → fichier local (.md ou .xlsx), jamais dans le chat |
| `etat_cle` | Comptes par type, chemins (distingue « dossier introuvable » de « clé vide ») |
| `reinitialiser_cle` | Archive la clé (datée) et repart de zéro — confirmation exigée |

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

Distribution : le connecteur est la version PAYANTE (offre Équipes) — il n'est
plus téléchargeable sur le site (retiré de `ai4x-website/assets/outils/` le
31/07). Il se livre après un échange commercial ; la LP `/anonymiseur-donnees`
le présente et renvoie vers `#plans`. Installation côté client : double-clic sur
le `.mcpb` → Claude Desktop propose « Installer ».

## Licences (offre Équipes)

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
node scripts/emettre-licence.mjs --org "Cabinet X" --postes 5 --mois 12
```

⚠️ La clé privée vit **hors dépôt** (par défaut sur le Bureau,
`nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt`). Sans elle, personne ne peut
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

La campagne de validation (`node test/campagne-mvp.mjs`, 35 contrôles) émet
elle-même une licence d'un jour avec la clé privée du poste — sans quoi elle ne
testerait que l'écran de blocage.
