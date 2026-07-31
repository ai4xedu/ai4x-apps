# Anonymiseur de données Ai4x — connecteur MCP local

Extension Claude Desktop (`.mcpb`) : Claude anonymise les fichiers Excel/CSV
**sur le poste de l'utilisateur**, travaille sur les codes (`NOM-001`…), puis
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
| `lire_scan` | OCR LOCAL d'un scan (image ou PDF image). Le texte reconnu n'entre JAMAIS dans le chat : il est écrit dans `…-ocr-A-RELIRE.md`, l'utilisateur le corrige, puis on anonymise CE fichier |
| `deanonymiser` | Retraduit texte/TSV → fichier local (.md ou .xlsx), jamais dans le chat |
| `etat_cle` | Comptes par type, chemins (distingue « dossier introuvable » de « clé vide ») |
| `reinitialiser_cle` | Archive la clé (datée) et repart de zéro — confirmation exigée |

v1.5.0 (OCR) : les scans sont lus SUR LE POSTE (tesseract.js, modèle
`tessdata/fra.traineddata` embarqué — aucun téléchargement). Triptyque imposé :
**OCR → relecture humaine → anonymisation**. Raison : l'OCR se trompe (sur une
facture de test propre, une ligne de tableau perdue, « Hassan II » lu
« Hassan Il ») et un identifiant mal reconnu échappe au dictionnaire — il
passerait en clair pendant que le rapport annoncerait « rien détecté ». Un OCR
silencieux transformerait un refus honnête en fausse sécurité.
`anonymiser_fichier` accepte donc aussi les .md/.txt (le scan relu).
Bundle 4,4 → 23 Mo : ne PAS élaguer tesseract.js-core (cf. .mcpbignore).

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

Distribution : le `.mcpb` est copié dans
`ai4x-website/assets/outils/anonymiseur-ai4x.mcpb` et téléchargeable depuis la
LP `/anonymiseur-donnees` (gate email). Installation côté utilisateur :
double-clic sur le fichier → Claude Desktop propose « Installer ».
