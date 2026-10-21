# Analyse d'impact — modèle pré-rempli pour l'usage de Nanomizer avec un assistant d'IA

*À compléter par le responsable du traitement (vous). Les parties en italique
sont des exemples ; tout ce qui concerne Nanomizer est factuel et vérifiable.*

## 1. Description du traitement

- **Finalité** : *rédaction, analyse et synthèse de dossiers (clients, salariés,
  contentieux) avec l'aide d'un assistant d'IA générative.*
- **Responsable du traitement** : *raison sociale, adresse, contact DPO.*
- **Outils** : assistant d'IA *(Claude Desktop, éditeur Anthropic)* ;
  Nanomizer v2.3, extension locale, éditeur YGH (aucun accès aux données).
- **Personnes concernées** : *clients, parties adverses, salariés, témoins.*
- **Catégories de données** : *identité, coordonnées, identifiants officiels,
  données financières, données de procédure.* Données sensibles : *à préciser
  (santé, infractions…)*.

## 2. Flux de données

1. Les fichiers restent dans le dossier de travail du poste.
2. Nanomizer les code sur le poste ; l'assistant d'IA ne reçoit que la version
   codée (noms, identifiants et montants remplacés).
3. Le résultat de l'IA est décodé sur le poste, dans un fichier local.
4. La clé de correspondance ne quitte jamais le poste ; aucun flux vers YGH.

## 3. Nécessité et proportionnalité

- Minimisation : seul ce qui est utile à la tâche est lisible par l'IA ; les
  montants sont protégés par défaut.
- Conservation : *durée de conservation des fichiers codés, de la clé et du
  journal sur le poste — à fixer.*
- Information des personnes : *mention dans la politique de confidentialité.*

## 4. Risques et mesures

| Risque | Vraisemblance avant | Mesure | Risque résiduel |
|---|---|---|---|
| Lecture de données identifiantes par le fournisseur d'IA | Élevée | Codage avant l'IA (banc : 201/201), verrou de sortie, journal vérifiable | Faible |
| Réidentification par recoupement (quasi-identifiants) | Moyenne | Plan à relire avant chaque anonymisation ; indice / gabarit pour les montants | Faible à moyen — *à évaluer selon les dossiers* |
| Contournement : texte collé directement dans la conversation | Moyenne | Protocole transmis à l'IA ; formation des utilisateurs | *À évaluer* |
| Autre extension ou synchronisation cloud du dossier | Moyenne | Audit de confinement à l'installation et à chaque plan | Faible si les alertes sont traitées |
| Perte ou vol de la clé | Faible | Droits 600, sauvegarde automatique, chiffrement du disque *(FileVault / BitLocker — à vérifier)* | *À évaluer* |
| Erreur de détection (valeur rare non codée) | Faible | Banc d'essai à chaque version ; journal rétroactif | Faible |

## 5. Validation

- Avis du DPO : *…*
- Décision du responsable du traitement : *…*  Date : *…*
- Revue prévue : *à chaque version majeure de Nanomizer ou de l'assistant d'IA.*
