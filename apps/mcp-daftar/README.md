# Daftar — la saisie des factures d'achat, sur le poste

> Videz le carton dans un dossier. Daftar propose les écritures, signale ce qui
> cloche, et écrit le journal importable. Le comptable ne tape plus, il révise.

Connecteur MCP local (extension Claude Desktop). Aucune facture ne quitte
l'ordinateur : la lecture, l'extraction, les contrôles et l'écriture des
fichiers se font entièrement sur le poste.

MVP `0.1.0` — **factures d'ACHAT uniquement**, sortie en **journal CSV neutre**.

---

## Les deux règles qui expliquent tout le reste

### Règle n°1 — le doute ne sort jamais dans le fichier d'import

Le journal ne contient **que** des écritures sûres. Tout le reste part dans une
liste de travail, avec la raison du doute et le chemin du justificatif.

Une écriture manquante, le comptable la voit et la traite. Une écriture
**fausse** importée en silence, il la découvrira au bilan, six mois plus tard —
et c'est l'outil qu'il accusera. On préfère donc une liste de travail longue à
un journal flatteur.

Corollaire assumé, et il faut le dire à l'utilisateur : **au premier lot d'un
dossier, presque tout part en « à vérifier »**, parce que la mémoire est vide.
C'est au deuxième lot que le produit se juge.

### Règle n°2 — ce qui traverse vers la conversation est codé

`analyser_lot` renvoie les tiers sous forme de codes (`FOURN-001`). Le tableau
nominatif est écrit **sur le disque**. Les montants, dates et taux passent en
clair : ils sont l'objet même de la révision et n'identifient personne.

Sans cette règle, on enverrait chez le fournisseur du modèle le carnet d'achats
complet d'un client du cabinet — exactement ce que l'Anonymiseur Ai4x passe son
temps à interdire.

**Exception documentée** : les **noms de fichiers** remontent en clair.
L'utilisateur doit pouvoir désigner une pièce ; les masquer rendrait l'outil
inutilisable. Les fixtures de test sont donc nommées de façon neutre, sinon le
test de la règle n°2 serait complaisant.

---

## Le flux

```
  factures (PDF / txt)                     ~/Documents/Daftar/dossiers/<client>/
          │                                          │
          ▼                                          │
   analyser_lot ─── tout se passe en local ──────────┤  revision-AAAA-MM.csv
          │                                          │  (nominatif, pour Excel)
          ▼                                          │
   PLAN codé dans la conversation                    │
   « 37 sûres · 3 à vérifier · FOURN-002 inconnu »   │
          │                                          │
          ▼                                          │
   l'humain arbitre → apprendre_compte ──────────────┤  mapping.json
          │                                          │  (la mémoire, le moat)
          ▼                                          │
   exporter_ecritures(confirmer: true) ──────────────┤  journal-AAAA-MM.csv
                                                     │  (écritures SÛRES only)
                                                     └  a-verifier-AAAA-MM.md
```

## Les cinq outils

| Outil | Ce qu'il fait | Écrit sur le disque |
|---|---|---|
| `lister_factures` | Ce qu'il y a dans le dossier, et ce qui sera ignoré | rien |
| `analyser_lot` | Lit, extrait, contrôle, propose — **c'est un plan** | le tableau de révision + le carnet de codes |
| `apprendre_compte` | « ce fournisseur → ce compte », pour ce dossier | la mémoire du dossier |
| `exporter_ecritures` | Le journal importable + la liste de travail | journal, liste, historique |
| `etat_dossier` | Compteurs de la mémoire | rien |

## La mémoire, en trois couches

1. **mapping du dossier** — le cabinet a déjà tranché pour CE client → écriture **sûre** ;
2. **socle cabinet** — une proposition raisonnable (« un opérateur télécom → 6145 »)
   → **à vérifier**, mais avec le compte **pré-rempli** ; une confirmation la fait
   basculer en couche 1, pour toujours ;
3. **rien** → à vérifier, sans compte proposé.

Le socle livré ne contient que des **familles** de comptes du CGNC (4 chiffres),
jamais des sous-comptes : ce n'est pas une vérité comptable, c'est un point de
départ que le cabinet affine. Et le même fournisseur ne tombe pas sur le même
compte d'un dossier à l'autre — d'où la couche 1, qui est propre à chaque client.

**C'est cette mémoire qui est le produit.** Le code se recopie en un week-end ;
trois mois de plans comptables appris, non.

## L'écriture produite (CGNC)

```
débit    6xxx     charge (compte issu de la mémoire du dossier)      HT
débit    34552    État — TVA récupérable sur charges                 TVA
crédit   4411     Fournisseurs                                       TTC
```

## Les contrôles qui déclenchent un doute

- `HT + TVA ≠ TTC` (tolérance 5 centimes pour les arrondis multi-lignes)
- taux hors barème marocain (0, 7, 10, 14, 20 %) ou TVA incohérente avec le taux affiché
- montant reconstitué par calcul (deux montants lus sur trois) — le recoupement est perdu
- numéro de pièce, date ou fournisseur introuvables ; date dans le futur
- facture en devise étrangère
- fournisseur inconnu du dossier, ou compte seulement **proposé** par le socle
- doublon : même tiers + même numéro déjà exporté

## Ce que le MVP ne fait PAS (et l'assume)

- **pas de ventes, pas de banque, pas de déclaration** — achats uniquement ;
- **pas d'OCR** : un PDF scanné est **refusé avec l'explication**. Annoncer
  « 0 facture lue » sur un carton plein serait un mensonge poli, et
  l'utilisateur repartirait taper à la main sans comprendre pourquoi ;
- **pas de format éditeur** (Sage, Ciel…) : le journal est un CSV neutre.
  L'adaptateur se code en une journée le jour où on a un **vrai** fichier
  d'import d'un vrai cabinet — deviner un format coûte une semaine et se
  découvre faux au premier test terrain ;
- **pas de ventilation** : une écriture à 3 lignes, mono-taux. Multi-taux,
  immobilisations, prorata et analytique partent en liste de travail plutôt
  que d'être devinés.

## Développement

```bash
npm install
npm test          # node --test : extraction, écritures, mémoire, CSV, e2e MCP
```

Les tests purs couvrent le moteur ; `test/e2e.test.js` parle le **vrai
protocole MCP** en stdio, comme Claude Desktop, et c'est le seul endroit où les
deux règles ci-dessus sont éprouvées de bout en bout.

Le jeu d'essai (`test/factures.mjs`) est fictif et volontairement varié sur ce
qui casse en vrai : formats de montants (espaces insécables, virgule, point),
mises en page avec ou sans section ÉMETTEUR, taux 20/14/7, et les trois pannes
classiques — numéro absent, `HT + TVA ≠ TTC`, TTC manquant.

## Pièges déjà payés

- **Les colonnes se collent aux montants.** `Prestation   1   8 500,00` se
  lisait `18 500` : un séparateur de milliers ne fait jamais deux espaces, une
  colonne de tableau si. On découpe la ligne en cellules avant de chercher un
  nombre.
- **`20,500` est ambigu** (20,5 à la française ou 20 500 à l'anglaise). Tranché
  par la longueur du groupe qui suit le séparateur. Ce n'est pas infaillible —
  et c'est acceptable **parce que** le contrôle `HT + TVA = TTC` rattrape
  l'erreur en envoyant la pièce en révision.
- **Le fournisseur n'est pas le client.** La désambiguïsation fiable n'est pas
  typographique mais arithmétique : quand l'ICE de la société du dossier est
  renseigné, l'AUTRE ICE de la page est celui du fournisseur. Sans lui, on
  retombe sur la section ÉMETTEUR, puis sur le haut de page.
- **Une raison sociale n'est pas toujours en majuscules.** « Maroc Telecom »
  n'a ni forme juridique ni capitales : sans la détection en casse de titre, on
  rate la moitié des fournisseurs récurrents.
