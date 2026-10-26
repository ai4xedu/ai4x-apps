# Nanomizer — console admin de la politique (v0.1.0)

Sprint 1, stories **US-1** (cabinet et clé de signature), **US-3** (enrôlement
d'un poste) et **US-2** (rédiger, valider, signer une politique). Spec :
[`SPEC-POLITIQUE-ADMIN.md`](SPEC-POLITIQUE-ADMIN.md).

Node ≥ 20, aucune dépendance, aucune requête réseau.

```bash
node bin/nanomizer-admin.mjs creer-cabinet --nom "Cabinet Exemple"
node bin/nanomizer-admin.mjs secours --sortie secours.txt      # à imprimer, puis supprimer
node bin/nanomizer-admin.mjs enroler --utilisateur s.alaoui@cabinet.fr --dossier-partage /Volumes/NAS/nanomizer
node bin/nanomizer-admin.mjs modele > politique-source.json    # puis l'éditer
node bin/nanomizer-admin.mjs signer --source politique-source.json --dossier-partage /Volumes/NAS/nanomizer
node bin/nanomizer-admin.mjs verifier --enrolement enrolement-pst_xxxx.nanomizer --dossier-partage /Volumes/NAS/nanomizer
```

Le cabinet vit dans `~/.nanomizer-admin` (ou `NANOMIZER_ADMIN_DIR`). La phrase
de passe est demandée sans écho, ou lue dans `NANOMIZER_PHRASE`.

| Fichier | Contient | Où |
|---|---|---|
| `cabinet.nanomizer.json` | clé publique ; clé privée + sel **chiffrés** (scrypt + AES-256-GCM) | poste de l'admin |
| `politique-source.json` | les noms des clients **en clair** | poste de l'admin, jamais ailleurs |
| `politique.nanomizer.json` + `.sig` | règles, noms en empreintes HMAC, signature Ed25519 | dossier partagé |
| `enrolement-<poste>.nanomizer` | clé publique, **sel en clair**, dossier partagé | remis au poste en main propre |

```bash
npm test
```

## Règles de l'organisation (v2.18, 23/10/2026)

Trois règles de plus dans `politique-source.json` (spec :
`nanomizer/SPEC-REGLES-ORGANISATION.md`) :

```json
{ "id": "R-040", "type": "toujours_pseudonymiser", "libelle": "Parties adverses",
  "prefixe": "ADVERSAIRE", "noms": ["Groupe Exemple", "Exemple"] }
{ "id": "R-041", "type": "motif", "libelle": "Numéros d'affaire",
  "prefixe": "AFFAIRE", "motif": "AFF[ -]?\\d{2}/\\d{4}", "exemple": "AFF 26/0412" }
{ "id": "R-042", "type": "laisser_en_clair", "libelle": "Le cabinet et ses associés",
  "termes": ["Cabinet Exemple", "Maître Durand"] }
```

- `prefixe` (catégorie maison, à la place de `categorie`) : 2 à 10 lettres
  majuscules ou chiffres, jamais un préfixe du moteur (`NOM`, `REF`, `CLI`…).
- `motif` : flags `giu` imposés, 200 caractères au plus ; refusés : références
  arrière, quantificateur imbriqué (`(a+)+`), motif qui accepte le vide ;
  l'`exemple` est obligatoire et **fictif**. Le motif est en clair dans la
  politique : s'il est secret, c'est une règle par noms.
- `laisser_en_clair` : termes en clair (publics par nature) ; refusé s'il
  ressemble à un identifiant (chiffres, arobase) ou s'il est aussi un nom
  protégé. Sur le poste, une règle « coder » l'emporte toujours.
- Un poste antérieur à la v2.18 refuse une politique qui porte ces types
  (ALTEREE, fail closed) : mettre les postes à jour avant d'émettre.

## Pas encore fait (stories suivantes)

- ~~**US-4**~~ : livré côté connecteur (v2.9.0, `hidden-tokens/server/politique.js`) —
  épinglage de la clé, anti-retour, expiration (72 h de grâce), rechargement,
  copie locale vérifiée, règles « interdit » par détecteur. Surface : Claude
  Desktop (fichiers) ; une politique doit lister `claude_desktop` dans
  `perimetre.surfaces` (c'est désormais le défaut).
- ~~**US-5**~~ : livré côté connecteur (v2.10.0) — n-grammes de 1 à 6 mots,
  normalisation de `lib/empreinte.js` (le contrat, testé des deux côtés) ;
  catégories → codes `CLI-`, `PAR-`, `SOC-`… ; noms interdits → copie non
  écrite ; contrôle résiduel.
- Rotation de clé, code QR de secours, console graphique.
