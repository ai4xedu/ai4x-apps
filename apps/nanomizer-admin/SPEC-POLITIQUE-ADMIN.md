# Nanomizer — Spec : la politique admin (v0, 21/10/2026)

> **Décision (21/10/2026)** : Nanomizer devient obligatoire sur Claude dans
> les cabinets clients. Philosophie retenue : **le Caviardeur** —
> pseudonymiser plutôt qu'interdire — **+ une case rouge** (interdits
> absolus) **+ une politique envoyée par l'admin du cabinet**, signée,
> versionnée, et comparée à chaque prompt. Note : 88/100.
>
> Cette spec couvre cinq choses : le format des règles, la signature, la
> comparaison à chaque prompt, le contenu du journal, les alertes.

---

## 0. Invariants (non négociables)

1. **RÈGLE N°1** (blueprint) : aucune valeur réelle n'entre jamais dans le
   contexte du modèle. Toute la spec est au service de cette règle.
2. **L'éditeur ne reçoit rien.** Ni politique, ni journal, ni alerte ne
   transite par un serveur Nanomizer. Tout circule entre les postes du
   cabinet et un **relais du cabinet** (§6.1) qui tourne chez lui.
3. **Le journal ne contient jamais de texte** : ni le prompt, ni les valeurs
   détectées, ni la réponse de Claude. Le journal ne doit pas devenir une
   nouvelle fuite.
4. **En cas de doute, on bloque** (fail closed) : politique invalide,
   erreur interne, nom connu resté en clair après substitution → le prompt
   ne part pas.
5. **Transparence** : le salarié voit les règles qui s'appliquent à lui, sait
   quand une alerte est envoyée à son sujet, et peut consulter son propre
   journal. Aucune surveillance cachée (Code du travail L1222-4 ; CNDP au
   Maroc).
6. **Plancher éditeur** : l'admin peut *durcir* la protection par défaut,
   jamais l'*affaiblir*. Les détecteurs de base ne se désactivent pas.

---

## 1. Les acteurs et les pièces

| Pièce | Qui la détient | Rôle |
|---|---|---|
| **Console admin** (appli locale) | l'admin du cabinet | écrire la politique, la signer, lire les journaux consolidés |
| **Clé de signature** (Ed25519, privée) | l'admin, protégée par phrase de passe | signer chaque version de politique |
| **Clé publique du cabinet** | chaque poste, épinglée à l'enrôlement | vérifier la signature |
| **Sel d'empreinte** (32 octets aléatoires) | chaque poste, remis à l'enrôlement | calculer les empreintes des noms (§2.3) |
| **`politique.nanomizer.json` + `.sig`** | dossier partagé du cabinet | la politique en vigueur |
| **Nanomizer poste** | chaque salarié | appliquer la politique à chaque prompt, tenir le journal local |
| **Relais du cabinet** | une machine du cabinet (poste admin ou NAS) | collecter les journaux, observer les signaux de vie, envoyer les alertes |

**Enrôlement d'un poste** (une fois) : l'admin génère un fichier
d'enrôlement (`enrolement-<poste>.nanomizer`) qui contient l'identifiant du
cabinet, la clé publique, le sel d'empreinte, le chemin du dossier partagé et
l'adresse du relais. Le poste l'importe ; à partir de là, il refuse toute
politique non signée par cette clé.

---

## 2. Format des règles

### 2.1 Le fichier

`politique.nanomizer.json`, JSON canonique (RFC 8785) pour que la signature
soit stable.

```json
{
  "format": "nanomizer.politique/1",
  "cabinet": { "id": "cab_7f3a", "nom": "Cabinet Exemple" },
  "version": 12,
  "emise_le": "2026-10-21T09:00:00Z",
  "expire_le": "2027-01-19T09:00:00Z",
  "emise_par": "admin@cabinet-exemple.fr",

  "perimetre": {
    "surfaces": ["claude_code", "claude_web"],
    "en_cas_erreur": "bloquer"
  },

  "equipes": [
    {
      "id": "eq_contentieux",
      "nom": "Contentieux",
      "membres": ["s.alaoui@cabinet-exemple.fr", "m.durand@cabinet-exemple.fr"],
      "responsables": ["associe.contentieux@cabinet-exemple.fr"]
    }
  ],

  "regles": [
    {
      "id": "R-001",
      "type": "toujours_pseudonymiser",
      "libelle": "Clients actifs",
      "categorie": "CLIENT",
      "empreintes": ["hm1:9c1f…", "hm1:44ab…"]
    },
    {
      "id": "R-002",
      "type": "toujours_pseudonymiser",
      "libelle": "Parties adverses — dossier Atlas",
      "categorie": "PARTIE",
      "empreintes": ["hm1:e07d…"],
      "portee": { "dossiers": ["DOS-2026-041"] }
    },
    {
      "id": "R-010",
      "type": "interdit",
      "libelle": "Pièces d'identité et coordonnées bancaires",
      "detecteurs": ["CIN", "RIB", "CARTE", "PERMIS"],
      "alerte": "responsable"
    },
    {
      "id": "R-011",
      "type": "interdit",
      "libelle": "Dossier sous embargo",
      "empreintes": ["hm1:5b20…"],
      "alerte": "responsable"
    },
    {
      "id": "R-020",
      "type": "detecteurs",
      "libelle": "Détecteurs supplémentaires",
      "ajoute": ["ICE", "RC", "IF", "CNSS"]
    }
  ],

  "alertes": {
    "canaux": [
      { "type": "email", "smtp": "relais" },
      { "type": "webhook", "url": "https://teams.cabinet-exemple.fr/hooks/…" }
    ],
    "admin_technique": ["it@cabinet-exemple.fr"],
    "signal_de_vie_max_minutes": 120,
    "heures_ouvrees": { "jours": [1, 2, 3, 4, 5], "de": "08:00", "a": "20:00", "fuseau": "Europe/Paris" }
  },

  "journal": { "retention_mois": 12 },

  "notice_salaries": {
    "texte": "Nanomizer protège les données de nos clients avant tout envoi à Claude…",
    "communiquee_le": "2026-10-20"
  }
}
```

L'admin n'écrit pas ce fichier à la main : il écrit une **source**
(`politique-source.json`, même structure, avec des listes `noms` en clair à la
place des `empreintes`, et sans `version`, `emise_le`, `expire_le`,
`cabinet`). La console la valide, calcule les empreintes, numérote et signe.
Les détecteurs reprennent les préfixes du moteur (`CIN`, `RIB`, `CARTE`,
`PERMIS`, `ICE`, `IF`, `RC`, `CNSS`, `PATENTE`… — voir
`lib/catalogue.js`).

### 2.2 Les quatre types de règle

| Type | Effet | Alerte |
|---|---|---|
| `toujours_pseudonymiser` | remplace l'entité par un code de la clé du dossier (`CLI-001`, `PAR-003`…), même si le détecteur ne l'aurait pas vue | non |
| `interdit` (rouge) | bloque le prompt, rien ne part | `responsable` (défaut), `admin` ou `aucune` |
| `detecteurs` | **ajoute** des catégories de détection au plancher éditeur | non |
| *(implicite)* plancher éditeur | les détecteurs de base (noms, emails, téléphones, adresses…) sont toujours actifs | non |

Une règle `interdit` vise des catégories (`detecteurs`), des entités
précises (`empreintes`), ou les deux. Une règle `toujours_pseudonymiser`
porte une `categorie`, qui donne le préfixe du code (`CLIENT` → `CLI-001`).

Champs communs : `id` (unique, stable entre versions — le journal y fait
référence), `libelle` (lisible par le salarié), `portee` optionnelle
(`dossiers`, `equipes`). Sans `portee`, la règle vaut pour tout le cabinet.

**Priorité** quand plusieurs règles touchent le même passage :
`interdit` > `toujours_pseudonymiser` > `detecteurs` > plancher.

**Validation** (refus de signer dans la console, refus de charger sur le
poste) : `id` en double, type inconnu, détecteur inconnu, `portee` vers un
dossier ou une équipe inexistants, tentative de retirer un détecteur du
plancher, `expire_le` > 365 jours après `emise_le`.

### 2.3 Pourquoi des empreintes et pas des noms

La liste des clients est elle-même un secret. Le fichier de politique ne la
contient pas en clair :

- **Empreinte** = `hm1:` + HMAC-SHA256(sel du cabinet, forme normalisée).
- **Normalisation** : minuscules, accents retirés, ponctuation et espaces
  multiples ramenés à un espace, translittération arabe → latin désactivée
  en v1 (question ouverte §9).
- **Pourquoi un HMAC et pas un simple SHA-256** : un SHA-256 de « Dupont »
  se retrouve en essayant un annuaire de noms. Sans le sel, l'empreinte
  HMAC ne se casse pas ; le fichier peut fuiter par email sans rien révéler.
- **Variantes** : la console génère les empreintes de chaque forme saisie
  par l'admin (« SARL Dupont », « Dupont », « Ets Dupont »). Pas de
  correspondance floue sur les empreintes : ce qui n'est pas listé est
  laissé aux détecteurs.
- **Côté poste** : le texte est normalisé, découpé en n-grammes de 1 à 6
  mots, chaque n-gramme est haché avec le sel, puis comparé à l'ensemble
  des empreintes. Une correspondance donne la position à remplacer.

---

## 3. Signature

- **Algorithme** : Ed25519 sur les octets du JSON canonique.
- **Fichier** `politique.nanomizer.json.sig` :
  `{ "alg": "ed25519", "cle_id": "k_2026_01", "signature": "base64…" }`.
- **Clé privée** : générée dans la console à la création du cabinet,
  stockée chiffrée par phrase de passe sur le poste de l'admin, avec une
  copie de secours imprimable (code QR) à mettre au coffre. Jamais sur un
  poste salarié, jamais chez l'éditeur.
- **Anti-retour en arrière** : chaque poste mémorise la plus haute
  `version` acceptée et refuse toute version inférieure ou égale avec un
  contenu différent. Sans ça, un salarié pourrait remettre une ancienne
  politique plus permissive (elle est bien signée).
- **Expiration** : `expire_le` obligatoire, 90 jours par défaut, 365
  maximum. Elle force l'admin à re-signer — donc à relire — régulièrement,
  et limite la durée de vie d'une politique volée.
- **Rotation de clé** : la nouvelle clé publique est publiée dans un
  fichier `rotation.nanomizer.json` signé par l'**ancienne** clé. Les postes
  l'acceptent, puis n'acceptent plus que la nouvelle.
- **Clé perdue** : pas de récupération. Ré-enrôlement de tous les postes
  avec une nouvelle clé (c'est voulu : personne, pas même l'éditeur, ne
  peut signer à la place du cabinet).
- **Distribution** : le poste lit le dossier partagé du cabinet
  (SharePoint, Drive, NAS) ou une URL HTTPS du cabinet, au démarrage puis
  toutes les 15 minutes. L'import manuel (glisser le fichier) reste possible.

---

## 4. Comparaison à chaque prompt

### 4.1 Où Nanomizer voit passer le prompt

| Surface | Point d'interception | Peut-il réécrire le prompt ? |
|---|---|---|
| **Claude Code** | hook `UserPromptSubmit`, imposé par les réglages gérés (`managed-settings`) | **Non** (à vérifier sur la version en cours) : le hook peut bloquer, pas remplacer le texte. Donc : un prompt qui contient une entité à pseudonymiser est bloqué, et le message renvoie au salarié la **version pseudonymisée, prête à renvoyer**. |
| **claude.ai (navigateur)** | extension, imposée par l'outil de gestion des postes | **Oui** : le texte du champ est remplacé par sa version pseudonymisée avant l'envoi. |
| **Claude Desktop** | connecteur MCP existant | Seulement pour les fichiers qu'on lui confie. Le chat lui-même n'est pas intercepté — limite assumée (§8). |

### 4.2 Le pipeline

```
prompt saisi
  │
  ├─ 1. Vérifier la politique ── KO ──► BLOQUE_POLITIQUE (+ alerte A2/A3)
  │
  ├─ 2. Règles « interdit » ───── hit ─► BLOQUE_ROUGE (+ alerte A4)
  │
  ├─ 3. Pseudonymiser (toujours_pseudonymiser + détecteurs + plancher,
  │      clé cumulative du dossier)
  │
  ├─ 4. Contrôle résiduel ─────── nom connu encore en clair ─► BLOQUE_ERREUR
  │
  ├─ 5. Envoyer le texte pseudonymisé (ou le texte d'origine s'il n'y avait
  │      rien à remplacer : PASSE_TEL_QUEL)
  │
  └─ 6. Écrire l'entrée de journal (dans tous les cas, y compris blocage)
```

Toute exception non prévue, à n'importe quelle étape → `BLOQUE_ERREUR`
(si `en_cas_erreur = "bloquer"`, la seule valeur acceptée en v1).

### 4.3 Étape 1 — la politique en vigueur est-elle bien celle de l'admin ?

Contrôle fait à chaque prompt (sur la copie en mémoire, en < 5 ms) :

| Contrôle | Échec → état | Décision |
|---|---|---|
| un fichier de politique est chargé | `ABSENTE` | bloquer + alerte A2 |
| la signature est valide pour la clé épinglée | `ALTEREE` | bloquer + alerte A2 |
| si le fichier sur disque a changé depuis le chargement, la nouvelle version se recharge et passe tous ces contrôles | `ALTEREE` | bloquer + alerte A2 |
| `version` ≥ plus haute version déjà acceptée | `RETROGRADEE` | bloquer + alerte A2 |
| `expire_le` non dépassée | `EXPIREE` | avertir pendant 72 h (« politique expirée, prévenez votre admin »), puis bloquer + alerte A3 |
| dernière synchro réussie < 24 h | `NON_SYNCHRONISEE` | laisser passer avec la politique locale, avertir le salarié, alerte A3 à l'admin technique |

La version et l'empreinte de la politique utilisée sont écrites dans **chaque**
entrée de journal : c'est la preuve qu'à telle heure, tel prompt a été traité
sous la politique v12.

### 4.4 Ce que voit le salarié

- **Prompt pseudonymisé** : un bandeau discret « 3 éléments protégés »
  avec le détail au survol (catégories et codes, jamais plus).
- **Prompt bloqué (rouge)** : « Bloqué par la règle R-010 — *Pièces
  d'identité et coordonnées bancaires*. Votre responsable a été prévenu.
  Retirez l'élément signalé et renvoyez. » Le passage en cause est surligné
  localement.
- **Prompt bloqué (politique)** : « La politique de sécurité de ce poste
  n'est pas valide (altérée / expirée…). L'admin a été prévenu. »

Délai cible ajouté au prompt : < 150 ms pour 10 000 caractères, 5 000
empreintes.

---

## 5. Contenu du journal

### 5.1 Une entrée

Fichier local, une ligne JSON par prompt, en ajout seulement :

```json
{
  "id": "j_01JB…",
  "horodatage": "2026-10-21T10:42:07.118Z",
  "poste": "pst_a91c",
  "utilisateur": "s.alaoui@cabinet-exemple.fr",
  "surface": "claude_web",
  "dossier": "DOS-2026-041",
  "politique": { "version": 12, "empreinte": "sha256:3f9e…", "etat": "OK" },
  "decision": "PSEUDONYMISE",
  "regles": ["R-001", "R-002"],
  "compteurs": { "CLIENT": 2, "PARTIE": 1, "EMAIL": 1 },
  "longueur": 1843,
  "empreinte_prompt": "hp1:77c0…",
  "latence_ms": 41,
  "precedent": "sha256:b812…",
  "hash": "sha256:0d4a…"
}
```

`decision` ∈ `PASSE_TEL_QUEL`, `PSEUDONYMISE`, `BLOQUE_ROUGE`,
`BLOQUE_POLITIQUE`, `BLOQUE_ERREUR`.

Le journal enregistre aussi des événements de poste (même chaîne) :
`DEMARRAGE`, `ARRET`, `POLITIQUE_CHARGEE` (avec version), `SIGNAL_DE_VIE`,
`DESACTIVATION_DEMANDEE`.

### 5.2 Ce qui n'y est jamais

Le texte du prompt, les valeurs détectées, la table de correspondance
(code → valeur), la réponse de Claude, le contenu des fichiers.
`empreinte_prompt` est un HMAC avec une clé propre au poste : elle permet de
dire « ces deux entrées concernent le même texte », pas de retrouver le texte
(un SHA-256 simple d'un prompt court se devinerait).

Si un responsable veut savoir *ce qui* a été écrit, il demande au salarié.
C'est voulu.

### 5.3 Intégrité et consolidation

- **Chaînage** : chaque entrée contient le hash de la précédente. Supprimer
  ou modifier une ligne casse la chaîne, et la console le signale.
- **Remontée** : le poste pousse ses nouvelles entrées vers le relais du
  cabinet toutes les 15 minutes. Le relais vérifie la chaîne à la réception.
- **Accès** : le salarié lit son propre journal depuis Nanomizer ; l'admin
  et les responsables lisent les journaux de leurs équipes dans la console.
- **Rétention** : `journal.retention_mois` (12 par défaut), purge
  automatique par le relais et les postes.
- **Export** : CSV / PDF depuis la console, pour un contrôle ou un audit.

---

## 6. Alertes

### 6.1 Le relais du cabinet

Un petit service (sur le poste de l'admin ou un NAS) qui reçoit les journaux,
observe les signaux de vie et envoie les alertes par le SMTP du cabinet ou un
webhook (Teams, Slack). C'est lui, et non chaque poste, qui détient les accès
d'envoi. Il ne parle qu'aux postes du cabinet.

### 6.2 Déclencheurs

| Code | Déclencheur | Destinataires | Regroupement |
|---|---|---|---|
| **A1** | Poste enrôlé silencieux > `signal_de_vie_max_minutes` pendant les heures ouvrées, ou `DESACTIVATION_DEMANDEE` | responsable(s) de l'équipe + admin technique | 1 alerte par poste et par jour |
| **A2** | Politique `ABSENTE`, `ALTEREE` ou `RETROGRADEE` sur un poste | admin technique + responsable(s) | 1 par poste et par heure |
| **A3** | Politique `EXPIREE` ou `NON_SYNCHRONISEE` | admin technique seulement (ce n'est pas la faute du salarié) | 1 par jour, tous postes confondus |
| **A4** | Règle `interdit` déclenchée | selon `alerte` de la règle (responsable par défaut) | même salarié + même règle en 1 h → une alerte avec un compteur |
| **A5** | ≥ 3 `BLOQUE_ERREUR` en 1 h sur un poste | admin technique | 1 par poste et par heure |

Option : remplacer les alertes A4 en temps réel par un récapitulatif
quotidien (`digest`), au choix de l'admin.

### 6.3 Contenu d'une alerte

```
[Nanomizer] Règle R-010 déclenchée — Contentieux
Qui : s.alaoui@cabinet-exemple.fr (poste pst_a91c)
Quand : 21/10/2026 10:42
Surface : claude.ai
Règle : R-010 — Pièces d'identité et coordonnées bancaires
Décision : bloqué, rien n'a été envoyé à Claude
Politique : v12
Détail : entrée de journal j_01JB… (console)
```

Jamais le texte, jamais la valeur détectée, jamais la catégorie exacte au-delà
du libellé de la règle.

### 6.4 Le salarié est toujours informé

Au même moment que son responsable, le salarié voit sur son poste qu'une
alerte a été envoyée à son sujet, avec le même contenu. Pas d'alerte
silencieuse.

---

## 7. Critères d'acceptation (à transformer en tests)

1. Une politique dont un seul octet change après signature est refusée
   (`ALTEREE`), le prompt est bloqué, A2 part.
2. La v11 signée, remise après la v12, est refusée (`RETROGRADEE`).
3. Un nom de client listé en R-001 mais **ignoré par les détecteurs**
   n'apparaît jamais dans ce qui part vers Claude (test E2E, RÈGLE N°1).
4. Un IBAN dans un prompt → `BLOQUE_ROUGE`, rien ne part, une seule alerte
   A4 même si le salarié réessaie 5 fois en 10 minutes (compteur = 5).
5. `grep` de chaque valeur réelle du jeu de test sur le journal, la
   politique et les alertes → zéro résultat.
6. Supprimer une ligne du journal → la console signale la chaîne cassée.
7. Couper Nanomizer sur un poste pendant 2 h ouvrées → A1 part ; le même
   arrêt un dimanche → rien.
8. Exception forcée dans le moteur → `BLOQUE_ERREUR`, rien ne part.
9. Une règle qui tente de retirer un détecteur du plancher → la console
   refuse de signer, le poste refuse de charger.
10. Aucune requête réseau vers un domaine de l'éditeur, sur le poste comme
    sur le relais (capture réseau).

---

## 8. Limites assumées (à écrire aussi dans la notice et sur le site)

- **Hors périmètre des postes gérés** : claude.ai sur un téléphone ou un
  ordinateur personnel n'est pas couvert. Seul un proxy réseau (option
  « Passage obligé », hors v1) le couvrirait, et seulement sur le réseau du
  cabinet.
- **Chat de Claude Desktop** : non intercepté (seuls les fichiers passés au
  connecteur le sont).
- **Détection** : un nom ni listé par l'admin ni reconnu par les détecteurs
  passe. La politique admin réduit ce risque, elle ne l'annule pas.
- **Salarié administrateur de sa machine** : il peut désinstaller ; seule
  l'alerte A1 le révèle, après coup.
- **Claude Code** : pas de réécriture du prompt via le hook (à vérifier) →
  blocage + version pseudonymisée à renvoyer, plus de friction que sur le
  navigateur.

Ne jamais écrire « conformité garantie » ni « fuite impossible ».

---

## 9. Questions ouvertes

1. **Expiration par défaut** : 90 jours, ou 30 pour les cabinets d'avocats ?
2. **Seuil A1** : 120 minutes est-il le bon compromis entre réactivité et
   fausses alertes (portables mis en veille) ?
3. **Translittération arabe ↔ latin** des noms (« Alaoui » / « علوي ») :
   v1 ou plus tard ?
4. **Option `en_cas_erreur = "laisser_passer"`** pour les pilotes : on
   l'ouvre (avec alerte) ou on reste strictement fail closed ?
5. **Relais** : appli installée par nous lors de l'onboarding, ou fournie
   en libre-service avec un guide ?
6. **Claude Code** : vérifier si `UserPromptSubmit` peut remplacer le texte
   du prompt sur la version actuelle ; si oui, aligner sur le navigateur.

---

## 10. Hors v1

Proxy réseau (« Passage obligé »), console web hébergée, SSO / annuaire
(Entra ID, Google Workspace) pour les équipes, règles par expressions
régulières écrites par l'admin, correspondance floue sur les empreintes.

---

*Sources : décision « Caviardeur + politique admin » (21/10/2026),
`BLUEPRINT.md` (RÈGLE N°1, promesse locale, garde-fous de communication).*
