# Charte d'usage de l'IA générative — modèle pour une entreprise ou un cabinet équipé de Hidden Tokens

*Modèle à adapter et à faire valider par votre conseil ou votre DPO avant
diffusion. Les parties en italique sont à compléter. Ce qui concerne Hidden Tokens
est factuel et vérifiable sur les postes.*

*Annexée au règlement intérieur le : ……… · Version : ……… · Référent IA : ………*

## 1. Objet

La présente charte fixe les règles d'usage des assistants d'IA générative
*(Claude, éditeur Anthropic)* par les collaborateurs de *[raison sociale]*.
Elle a un but : **profiter de l'IA sans qu'une donnée de client, de salarié
ou de partenaire ne parte en clair chez un fournisseur d'IA.**

Elle met en œuvre nos obligations au titre de la loi n° 09-08 relative à la
protection des personnes physiques à l'égard du traitement des données à
caractère personnel *(et, le cas échéant, du RGPD)*, ainsi que du secret
professionnel *(avocats, experts-comptables, notaires, professions de santé :
préciser le texte applicable)*.

## 2. Champ d'application

Elle s'applique à tout collaborateur, stagiaire ou prestataire qui utilise un
assistant d'IA pour le compte de *[raison sociale]*, sur un poste de
l'entreprise ou sur un appareil personnel.

## 3. Outils autorisés

| Outil | Usage autorisé |
|---|---|
| *Claude Desktop, compte de l'entreprise* | Tout usage professionnel, **dans le respect de la règle d'or** |
| Hidden Tokens (extension de Claude Desktop) | **Obligatoire** pour tout fichier ou texte contenant des données identifiantes |
| Appli web Hidden Tokens (ai4x.academy) | Tableurs, quand l'extension n'est pas installée |
| *Autres assistants d'IA, comptes personnels* | *Interdits pour des données de l'entreprise — ou à préciser* |

## 4. La règle d'or

> **Aucune donnée identifiante n'est transmise à une IA autrement que par
> Hidden Tokens.**

Sont des données identifiantes : les noms et prénoms, adresses, téléphones,
e-mails, numéros de CIN, de passeport ou de permis, RIB et IBAN, numéros de
carte bancaire, ICE, IF, RC, CNSS, patente, références de dossier, plaques
d'immatriculation — et les montants d'un client *(chiffre d'affaires, paie,
encours, honoraires)*.

En pratique :

1. **On ne joint pas un fichier brut à la conversation et on n'y colle pas un
   texte brut.** On demande à Claude de passer par Hidden Tokens (« anonymise le
   fichier … »), ou on utilise l'appli web pour un tableur.
2. **On relit le plan** que Hidden Tokens présente avant chaque anonymisation, et
   on ne confirme que si ce qui doit être caché l'est.
3. **Les montants restent protégés** (réglage par défaut : valeurs factices).
   Le mode « en clair » n'est choisi que *[sur accord du responsable du
   dossier / jamais pour les données de paie]*.
4. **Les réponses de l'IA se décodent sur le poste**, avec Hidden Tokens. On ne
   recopie jamais un vrai nom dans la conversation pour « aider » l'IA.
5. **La clé de correspondance ne quitte jamais le poste** (ni e-mail, ni
   cloud, ni clé USB) : elle contient toutes les vraies valeurs.

## 5. Configuration des postes

Le service informatique *(ou le référent IA)* :

- installe Hidden Tokens sur chaque poste qui utilise Claude ;
- règle le **dossier de travail** hors de tout dossier synchronisé dans le
  cloud ;
- règle le **dossier de clé d'équipe** sur un partage interne *(NAS, serveur
  de fichiers)*, le même sur tous les postes, pour que tout le cabinet utilise
  les mêmes codes ;
- renseigne le **nom de chaque poste** *(ex. « Me Benali », « Comptabilité »)*,
  qui apparaît dans le rapport de couverture ;
- lance l'outil **« vérifier le confinement »** à l'installation, et ferme
  chaque porte signalée *(autre extension ayant accès aux fichiers, dossier
  synchronisé, droits de la clé)*.

## 6. Contrôle

Le contrôle porte sur l'usage de l'outil, **jamais sur le contenu des
dossiers** : Hidden Tokens ne produit que des comptes.

- **Chaque mois**, le référent IA ou le DPO produit le **rapport de
  couverture** (outil « rapport de couverture » sur n'importe quel poste de
  l'équipe ; la page est déposée dans le dossier d'équipe). Il y lit, par
  poste : fichiers protégés, plans non confirmés, décodages, montants protégés
  ou en clair, valeurs retrouvées, portes ouvertes, dernière activité.
- **Un poste sans fichier protégé depuis 30 jours** donne lieu à un échange
  avec l'utilisateur : n'utilise-t-il plus l'IA, ou l'utilise-t-il sans
  Hidden Tokens ?
- **Sur demande** *(client, audit, contrôle de la CNDP)*, la page « Ce que
  Claude a vu » d'un poste montre tout ce que l'IA a reçu, revérifié contre la
  clé, sans afficher aucune valeur réelle.

Les collaborateurs sont informés de ce contrôle par la présente charte. *Les
comptes du rapport sont conservés …… mois.*

## 7. Incident

Est un incident : une valeur réelle retrouvée dans ce que l'IA a reçu (rapport
de couverture ou page « Ce que Claude a vu »), un fichier brut joint par
erreur, une clé de correspondance copiée hors du poste.

1. Prévenir le référent IA *(contact : ………)* **dans la journée**, en citant
   le **code** concerné (ex. « NOM-48291374 »), **jamais la valeur**.
2. Ne pas supprimer le journal : il sert à mesurer ce qui est sorti.
3. Le référent IA évalue s'il s'agit d'une violation de données au sens de la
   loi n° 09-08 *(et du RGPD)* et des obligations de notification qui en
   découlent.
4. Le cas est signalé à l'éditeur de Hidden Tokens *(sans la valeur)* : chaque
   cas devient un test du connecteur.

## 8. Formation

Tout nouvel utilisateur suit une prise en main de *[durée]* avant son premier
usage de l'IA sur des données de l'entreprise : la règle d'or, la lecture du
plan, le décodage, et ce qui ne passe pas par Hidden Tokens.

## 9. Manquements

Le non-respect de la règle d'or expose son auteur aux mesures prévues par
*[le règlement intérieur / le contrat de prestation]*. Un incident signalé
spontanément et sans délai n'est pas traité comme un manquement.

## 10. Engagement

Je, soussigné(e) ………………………, déclare avoir lu la présente charte et
m'engage à la respecter.

Fait à ………………, le ………………  Signature :

---

*Ce que Hidden Tokens garantit, et ce qu'il ne garantit pas* : il garantit que
**ce qui passe par lui** n'emporte aucune valeur connue de la clé (banc
d'essai : 201/201 sur un corpus fictif de 15 documents ; journal vérifiable sur
chaque poste). Il ne peut pas empêcher un utilisateur de joindre un fichier
brut à une conversation : c'est l'objet de cette charte, et le rapport de
couverture permet de vérifier qu'elle est suivie.
