# Vendre et livrer Nanomizer — licence à vie, 500 Dhs, sur WhatsApp

Circuit habituel Ai4x : aucun paiement en ligne. Le client écrit sur WhatsApp
(bouton de la LP `/anonymiseur-donnees`, message pré-rempli), on envoie le RIB,
il vire 500 Dhs, on livre le fichier et la clé sur WhatsApp.

## 1. Le client écrit (message pré-rempli)

> Bonjour, je veux la licence à vie du connecteur Nanomizer (anonymiseur Ai4x
> pour Claude Desktop) à 500 Dhs. Comment on procède ?

Réponse type :

> Bonjour ! Avec plaisir. C'est 500 Dhs, une seule fois, mises à jour
> comprises. Voici le RIB : … (au nom de …). Envoyez-moi la capture du
> virement et le nom à inscrire sur la licence (vous ou votre cabinet) : je
> vous envoie le connecteur et votre clé dès réception.
> Il faut l'application Claude Desktop (Mac ou Windows) : https://claude.ai/download

Plusieurs postes : une licence par poste (même prix) — à confirmer au cas par
cas, `--postes N` inscrit le nombre sur la clé.

## 2. À réception du virement : émettre la clé

```bash
cd ai4x-apps/apps/mcp-anonymiseur
NANOMIZER_PRIVATE_KEY_FILE="…/nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt" \
  node scripts/emettre-licence.mjs --org "Maître Nom Prénom" --a-vie --note "WhatsApp 18/09/2026"
```

Le script imprime la clé (`NANO1.…`) ET le message WhatsApp de livraison,
prêt à copier. Notez la « Référence » affichée dans votre suivi (CRM) : c'est
le seul lien entre un paiement et une clé.

⚠️ La clé privée ne quitte jamais ce poste : pas de copie dans un chat, un
mail, un dépôt git, un drive.

## 3. Livrer sur WhatsApp

1. Le fichier `dist/anonymiseur-ai4x.mcpb` en pièce jointe (≈ 24 Mo — WhatsApp
   l'accepte en « Document »).
2. Le message imprimé par le script (mode d'emploi + clé).

Pour reconstruire le fichier après une mise à jour du code :

```bash
npm test                                   # 88 tests, dont la chasse aux fuites
npx @anthropic-ai/mcpb pack . dist/anonymiseur-ai4x.mcpb
node test/campagne-mvp.mjs                 # 42 contrôles sur l'artefact — A5 doit être vert
```

## 4. Après l'installation (2 minutes avec le client)

- Lui faire demander à Claude : **« vérifie le confinement »**. Si une autre
  extension (Filesystem, Cowork) voit son dossier, ou si le dossier est dans
  iCloud / Google Drive / Dropbox / OneDrive, l'audit le dit avec le geste à
  faire. C'est la condition pour que la garantie tienne.
- Première utilisation : « liste mes fichiers », puis « anonymise [F-…] » —
  il voit le plan, accepte, Claude travaille sur les codes.

## Ce qu'on promet — et ce qu'on ne promet pas

- ✅ Ce qui passe par Nanomizer arrive chez Claude codé : noms, sociétés,
  adresses, identifiants, références, noms de fichiers. Vérifié à chaque
  version par la chasse aux fuites (`test/fuite.test.js`) et l'audit A5.
- ✅ 100 % hors ligne, licence vérifiée sur le poste, aucune télémétrie. Sans
  licence, le décodage marche toujours.
- ❌ On ne dit JAMAIS « conforme » ni « anonymisation parfaite » : c'est de la
  **pseudonymisation réversible + relecture du plan**. Un texte collé
  directement dans la conversation ne passe par aucun verrou ; un contexte très
  précis peut permettre une identification indirecte.
