# Hidden Tokens — fiche sécurité

*Pour le service informatique, le DPO ou l'associé qui valide l'outil. Version
du connecteur : 2.3.1. Tout ce qui est écrit ici se vérifie : voir « Comment le
vérifier vous-même ».*

## En une phrase

Hidden Tokens est une extension de Claude Desktop qui s'exécute **sur le poste** :
elle remplace noms, identifiants et montants par des codes (`NOM-001`) avant que
l'IA ne lise un fichier, puis remet les vraies valeurs **sur le poste**, dans
les fichiers produits. L'IA travaille sur la structure du dossier, jamais sur
ses valeurs.

## Ce qui sort du poste, et ce qui y reste

| | Où ça va |
|---|---|
| Noms, sociétés, adresses, identifiants (CIN, NIR, ICE, IF, RC, CNSS, RIB/IBAN, cartes, permis, plaques), références de dossier | **Codés** avant l'IA. Les vraies valeurs restent dans la clé, sur le poste. |
| Montants, quantités et taux d'un tableur | **Protégés par défaut** : valeurs factices (gabarit) ou indice à facteur secret. Clair seulement sur demande. |
| Dates, mots courants, intitulés juridiques | Lisibles : c'est la matière de travail. |
| Noms de fichiers et d'onglets | Masqués ou codés. |
| La clé de correspondance | Sur le poste, droits 600 (lecture par le seul compte de l'utilisateur), jamais servie à l'IA. |
| Fichiers décodés, tableaux de bord réels | Sur le poste, jamais servis à l'IA. |
| Télémétrie, statistiques d'usage, appel de licence | **Aucun.** La licence est vérifiée par signature (Ed25519), hors ligne. |

## Les protections, empilées

1. **Le verrou** : codage *fail-closed*. Seul ce qui est prouvé inoffensif
   reste lisible (mots d'un dictionnaire de plus de 320 000 formes, nombres non
   identifiants, liste blanche) ; tout le reste est codé.
2. **Le contrôle d'aperçu** : chaque cellule et chaque ligne montrée à l'IA
   repasse au verrou ; un doute la masque.
3. **Le verrou de sortie** : sur le texte final de chaque réponse, toute valeur
   connue de la clé redevient son code, toute forme sensible (e-mail,
   téléphone, IBAN, identifiant long) est masquée.
4. **Les chiffres** (v2.2) : montants d'un tableur remplacés par défaut.
5. **La clé d'équipe** (v2.3, licence Équipe) : mêmes codes sur tous les postes
   du cabinet grâce à un secret partagé sur un serveur interne ; sans ce
   secret, impossible de calculer le code d'un nom deviné. Aucun serveur
   Hidden Tokens : le dossier d'équipe est chez vous.
6. **Le journal « Ce que Claude a vu »** (v2.2) : chaque réponse envoyée à l'IA
   est notée sur le poste ; la page locale la revérifie contre la clé actuelle,
   y compris après coup.
7. **L'audit de confinement** : signale toute autre porte vers le dossier
   (autre extension, dossier synchronisé dans le cloud, pilotage du navigateur).

## Comment le vérifier vous-même

- **Ce que l'IA a reçu** : demandez à Claude « montre-moi ce que tu as vu ».
  La page locale `CE-QUE-CLAUDE-A-VU.html` liste chaque échange et le
  nombre de valeurs réelles retrouvées (attendu : 0).
- **Le réseau** : coupez Internet, Hidden Tokens fonctionne. Avec un pare-feu
  applicatif (Little Snitch, LuLu), aucune connexion sortante n'est tentée par
  le connecteur. La suite de tests le prouve à l'exécution : elle fait tourner
  tout le parcours sous le modèle de permissions de Node, réseau interdit
  (`test/reseau.test.js`).
- **La détection** : le banc d'essai public (`npm run bench`) mesure 201/201
  valeurs sensibles codées sur 15 documents fictifs (droit, finance, monétique),
  avec ses limites écrites.
- **Le code** : JavaScript lisible, sans dépendance réseau ; 125 tests, dont une
  chasse aux fuites qui appelle tous les outils.

## Ce que Hidden Tokens ne couvre pas

- Un texte **collé directement** dans la conversation, ou un fichier joint à la
  main : il ne passe par aucun verrou.
- Une **autre extension** qui lit le même dossier (l'audit de confinement la
  signale).
- Les **quasi-identifiants** : âge, fonction, contexte (« ingénieur chez … »)
  restent lisibles et peuvent permettre une réidentification par recoupement.
  La relecture du plan reste nécessaire.
- Les **nombres écrits dans un texte ou un PDF** restent lisibles.
- Hidden Tokens outille la conformité ; il ne la certifie pas. Il ne remplace ni
  votre analyse d'impact, ni l'avis de votre conseil.
