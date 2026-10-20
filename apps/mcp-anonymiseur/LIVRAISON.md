# Vendre et livrer Nanomizer — licence à vie, sur WhatsApp

Deux tarifs (décision du 08/10/2026), tous deux **à vie, une seule fois,
mises à jour comprises**, facturés HT par **YGH** (le logiciel vendu est chez
YGH, décision du 24/08/2026) :

| | Prix | Clé | Inclus |
|---|---|---|---|
| **Solo** | 500 Dhs HT | 1 poste (`--postes 1`) | le connecteur, **l'appli web débloquée par la même clé**, le mode d'emploi |
| **Équipe** | 5 000 Dhs HT | jusqu'à 20 postes, **une seule clé** (`--postes 20`) | + 1 h de prise en main en visio, facture au nom de l'entité |

Au-delà de 20 postes : 200 Dhs HT par poste supplémentaire, sur la même clé.
Pas d'abonnement : un outil hors ligne n'a rien à renouveler. Sans clé, l'appli web est la
version Découverte (50 lignes par fichier, une clé par fichier, tableaux seulement) ; la
clé l'ouvre en entier — c'est l'argument pour qui n'a pas Claude Desktop.

Circuit habituel Ai4x : aucun paiement en ligne. Le client écrit sur WhatsApp
(bouton de la LP `/anonymiseur-donnees`, message pré-rempli), on envoie le RIB
de YGH, il vire, on livre le fichier et la clé sur WhatsApp.

## 0. Depuis la v2.2 : l'essai d'abord, le devis pour les entreprises

**Essai gratuit de 14 jours, intégré.** On peut envoyer le `.mcpb` SANS clé :
la première anonymisation ouvre 14 jours d'accès complet, annoncés dans chaque
réponse (« 🧪 Essai gratuit : N jour(s) restant(s) »), avec le lien WhatsApp et
le lien « devis entreprise ». À la fin de l'essai, l'anonymisation s'arrête ;
la dé-anonymisation, jamais. Aucun serveur : la date de début est notée dans
le dossier du client (effacer ce fichier relance l'essai — serrure de
courtoisie assumée). Une licence payée échue n'ouvre pas d'essai.

Le geste de vente devient : *« Installez, essayez 14 jours sur un vrai dossier,
puis demandez à Claude : montre-moi ce que tu as vu (journal_ia). »*

**Devis et facture pour une entreprise** (purchase order, facture au nom de
l'entité, ICE des deux parties, montant en lettres) :

```bash
cp scripts/vendeur.exemple.json scripts/vendeur.json   # une fois : coordonnées légales de YGH (hors git)
node scripts/devis.mjs --client "Raison sociale SA" --ice-client 001234567000089 --offre equipe --postes 25
node scripts/devis.mjs --facture --numero FA-2026-014 --client "Raison sociale SA" --ice-client 001234567000089 --offre equipe --postes 25 --licence <référence>
```

Le document sort en HTML A4 dans `devis-sortie/` (hors git, hors bundle) :
l'ouvrir dans le navigateur, puis Imprimer → Enregistrer en PDF. Numérotation
des factures : continue, à tenir dans le suivi (CRM), comme la référence de
licence.

## 0 bis. Licence Équipe : la clé d'équipe (v2.3)

Pour que tout le cabinet ait les mêmes codes :

1. Créer un dossier sur un partage INTERNE (NAS, serveur de fichiers), accessible
   à tous les postes — **jamais** un dossier iCloud / Google Drive / Dropbox /
   OneDrive (l'audit de confinement le signalerait : toutes les correspondances
   du cabinet y partiraient).
2. Sur chaque poste : réglages de l'extension → « Dossier de clé d'équipe » → ce
   même dossier ; la même clé de licence Équipe ; redémarrer Claude Desktop.
3. Le premier poste qui anonymise crée le secret d'équipe dans le dossier.
   Demander ensuite à Claude « état de la clé » : la ligne « Clé d'équipe
   ACTIVE : N poste(s) » le confirme.

Le dossier d'équipe contient TOUTES les vraies valeurs du cabinet : il se
sauvegarde et se protège comme le serveur de fichiers lui-même.

## 1. Le client écrit (message pré-rempli)

> Bonjour, je veux la licence à vie du connecteur Nanomizer (anonymiseur Ai4x
> pour Claude Desktop) à 500 Dhs HT. Comment on procède ?

Réponse type :

> Bonjour ! Avec plaisir. C'est 500 Dhs HT, une seule fois, mises à jour
> comprises. Voici le RIB : … (au nom de YGH). Envoyez-moi la capture du
> virement et le nom à inscrire sur la licence (vous ou votre cabinet) : je
> vous envoie le connecteur et votre clé dès réception.
> Il faut l'application Claude Desktop (Mac ou Windows) : https://claude.ai/download

Pour une équipe (message « licence Équipe ») : même réponse, 5 000 Dhs HT,
le nom de l'entité sur la clé, et on propose la date de la prise en main.

## 2. À réception du virement : émettre la clé

```bash
cd ai4x-apps/apps/mcp-anonymiseur
NANOMIZER_PRIVATE_KEY_FILE="…/nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt" \
  node scripts/emettre-licence.mjs --org "Maître Nom Prénom" --a-vie --note "WhatsApp 18/09/2026"
# équipe :
NANOMIZER_PRIVATE_KEY_FILE="…" node scripts/emettre-licence.mjs --org "Payzone" --postes 20 --a-vie --note "Équipe, facture YGH n° …"
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
npm test                                   # 94 tests, dont la chasse aux fuites (sans clé privée)
npx @anthropic-ai/mcpb pack . dist/anonymiseur-ai4x.mcpb
node test/campagne-mvp.mjs                 # 44 contrôles sur l'artefact (clé privée requise) — A5 et C3 verts
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
  adresses, identifiants, cartes bancaires, permis, références, noms de
  fichiers. Vérifié à chaque version par la chasse aux fuites
  (`test/fuite.test.js`) et l'audit A5.
- ⚠️ Pour les numéros de carte, Nanomizer code ce qu'on lui donne — mais un
  fichier de cartes complètes sur un portable est lui-même dans le périmètre
  PCI DSS du client. La bonne réponse reste l'export masqué ou tokenisé de
  SES systèmes ; Nanomizer est imbattable sur le reste (noms, CIN, permis,
  téléphones, texte libre). Le dire avant que leur RSSI ne le dise.
- ✅ 100 % hors ligne, licence vérifiée sur le poste, aucune télémétrie. Sans
  licence, le décodage marche toujours.
- ❌ On ne dit JAMAIS « conforme » ni « anonymisation parfaite » : c'est de la
  **pseudonymisation réversible + relecture du plan**. Un texte collé
  directement dans la conversation ne passe par aucun verrou ; un contexte très
  précis peut permettre une identification indirecte.
