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

## Pas encore fait (stories suivantes)

- **US-4** : anti-retour, expiration, rechargement côté poste (`verifierSignature`
  ne contrôle pour l'instant que la clé et le cabinet).
- **US-5** : reconnaissance des noms par n-grammes — la normalisation de
  `lib/empreinte.js` est le contrat à respecter.
- Rotation de clé, code QR de secours, console graphique.
