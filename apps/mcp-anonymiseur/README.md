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
| `lister_fichiers` | Liste les .xlsx/.xls/.csv du dossier de travail |
| `anonymiser_fichier` | Deux temps (plan sans `confirmer`, exécution avec) et deux modes auto-choisis : TABLEAU (colonnes entières) ou DOCUMENT (facture mise en page → codage intra-cellule, dictionnaire marocain ICE/IF/RC/CNSS/patente/RIB/tél ; libellés et montants JAMAIS codés). `valeurs_a_coder` pour les noms propres. Garde-fou : un document forcé en tableau (>40 % de cellules codées) est refusé |
| `anonymiser_dossier` | LOT : tous les fichiers du dossier (ou filtrés par `motif`), toutes les feuilles, UNE clé partagée, plan→confirmer, compte rendu en comptes seuls + rapport local `rapport-lot-*.md` |
| `deanonymiser` | Retraduit texte/TSV → fichier local (.md ou .xlsx), jamais dans le chat |
| `etat_cle` | Comptes par type, chemins (distingue « dossier introuvable » de « clé vide ») |
| `reinitialiser_cle` | Archive la clé (datée) et repart de zéro — confirmation exigée |

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
