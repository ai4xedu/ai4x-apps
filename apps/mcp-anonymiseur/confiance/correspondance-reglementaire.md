# Hidden Tokens face aux textes : loi 09-08, RGPD, guide du CNB

*Ce tableau dit ce que l'outil fait, article par article. Il ne vaut pas avis
juridique : les références sont à confirmer par votre conseil ou votre DPO.*

## Principe commun

Des données **pseudonymisées** restent des données personnelles pour celui qui
détient la clé : c'est votre cas, et c'est voulu (la réversibilité permet de
rendre le travail de l'IA exploitable). Hidden Tokens ne vous fait donc pas sortir
du champ des textes ; il réduit fortement le risque du traitement confié à
l'IA, et il le documente.

## Maroc — loi 09-08 et CNDP

| Exigence | Ce que fait Hidden Tokens | Ce qui reste à votre charge |
|---|---|---|
| Sécurité et confidentialité du traitement (art. 23–24) | Codage avant l'IA, clé locale à droits restreints, journal de ce qui est sorti, audit de confinement | Politique d'accès aux postes, sauvegarde de la clé |
| Transfert de données vers un État étranger (art. 43–44) | Le fournisseur d'IA ne reçoit que des codes et des structures ; la clé ne quitte jamais le poste | Qualifier, avec votre conseil, le statut des données codées envoyées ; formalités auprès de la CNDP si elles s'appliquent |
| Qualité et minimisation (art. 3) | Seul ce qui est utile à la tâche est lisible ; montants protégés par défaut | Choix des documents soumis à l'IA |
| Formalités préalables (déclaration ou autorisation) | Fiche sécurité et modèle d'analyse d'impact fournis | La déclaration elle-même |

## Union européenne — RGPD

| Article | Ce que fait Hidden Tokens |
|---|---|
| Art. 4(5) — définition de la pseudonymisation : informations supplémentaires conservées séparément | La clé est séparée, sur le poste, jamais transmise |
| Art. 25 — protection des données dès la conception | Codage par défaut (noms ET montants), ouverture explicite seulement |
| Art. 32 — sécurité, dont la pseudonymisation | Mesure technique documentée, testée (banc d'essai, chasse aux fuites) |
| Art. 35 — analyse d'impact | Modèle pré-rempli fourni (`aipd-modele.md`) |
| Chapitre V — transferts hors UE | Réduction du risque : le destinataire n'a aucun moyen de réidentifier. Les lignes directrices 01/2025 du CEPD sur la pseudonymisation et la jurisprudence récente de la CJUE (C-413/23 P, 4 septembre 2025) sont à examiner avec votre conseil |

## France — avocats : guide du CNB « La déontologie et l'IA » (avril 2026)

| Recommandation du guide | Ce que fait Hidden Tokens |
|---|---|
| Pseudonymiser ou anonymiser systématiquement avant tout outil d'IA générative | C'est sa fonction, sur le dossier entier, avec une clé cumulative (même personne = même code dans toutes les pièces) |
| Les engagements des fournisseurs (« vos données ne sont pas réutilisées ») ne sont ni prouvables ni vérifiables | La preuve est locale : le journal « Ce que Claude a vu » |
| Écarter les éditeurs soumis à des lois d'accès extraterritorial ; clé détenue par le cabinet | Aucun serveur Hidden Tokens, aucune donnée chez l'éditeur ; la clé est sur le poste du cabinet |
| Attention au risque d'identification indirecte par croisement | Signalé dans chaque plan ; relecture humaine demandée |
