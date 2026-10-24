# HT-Bench 0.1.0 — rapport de détection

Moteur Hidden Tokens **v2.23.2** · jeu `406f450d99863315…` (synthétique, graine fixe) · 268 documents · 2473 valeurs à coder · 1955 leurres.

Chemin mesuré : anonymiser_fichier sur un .md (MCP stdio, fichier *-anonymise.md écrit sur le poste) — moteur + verrou, pack du document activé par reglages.json ; verrou de sortie mesuré à part sur la réponse de coder_texte. Une valeur compte comme détectée si toutes ses lettres et chiffres sont sous un code (les particules d'un nom — Ben, El, Aït, de… — peuvent rester en clair). Une valeur codée en partie est une fuite : elle compte comme manquée. Définitions complètes : `bench/ht-bench/README.md`.

**Identifiants directs (noms, pièces et identifiants, téléphones, e-mails, IBAN/RIB, IMEI/IMSI) : 97.6 %** (1808/1853) — cible ≥ 99 % par pack.

Verrou de sortie : sur 45 identifiant(s) direct(s) manqué(s) ou partiel(s) par le moteur, 42 resteraient lisibles dans la réponse de coder_texte (le reste est rattrapé par le dernier filet, « [MASQUÉ] » / « ••• » — mais le fichier écrit sur le poste, lui, les contient).

## Par pack

| Pack | Docs | Rappel direct | Cible | Rappel (tout) | Précision | F1 | Leurres codés | « ••• » en sortie |
|---|---:|---:|:-:|---:|---:|---:|---:|---:|
| core | 46 | 97.6 % (328/336) | ❌ | 96.4 % | 93.3 % | 94.8 % | 2/146 (1.4 %) | 0 |
| telecom-ma | 37 | 100.0 % (249/249) | ✅ | 100.0 % | 81.9 % | 90.0 % | 18/158 (11.4 %) | 0 |
| juridique-fr | 37 | 97.5 % (269/276) | ❌ | 97.9 % | 86.7 % | 91.9 % | 36/308 (11.7 %) | 0 |
| banque-assurance | 37 | 97.8 % (264/270) | ❌ | 98.2 % | 78.6 % | 87.4 % | 1/277 (0.4 %) | 12 |
| sante | 37 | 98.6 % (204/207) | ❌ | 94.5 % | 81.0 % | 87.2 % | 32/244 (13.1 %) | 58 |
| expertise-comptable | 37 | 98.3 % (282/287) | ❌ | 98.8 % | 88.6 % | 93.4 % | 5/439 (1.1 %) | 13 |
| rh-paie | 37 | 93.0 % (212/228) | ❌ | 94.2 % | 89.3 % | 91.7 % | 76/383 (19.8 %) | 24 |

Précision du pack = passages codés qui recouvrent une valeur étiquetée / tous les passages codés : le verrou code tout mot inconnu du lexique, un mot courant codé à tort la fait baisser (cf. « Codé hors étiquette »). « ••• » en sortie : passages masqués par le verrou de sortie dans la réponse de coder_texte (souvent un code déjà posé que le motif d'un pack reconnaît à nouveau : l'IA ne peut plus le citer).

**Sortie corrompue : 42 document(s)** dont le texte codé n'est plus « l'origine + des codes » (codes imbriqués comme `NOM-001-002`, morceau de mot recodé) — banque-assurance : 11, sante : 9, expertise-comptable : 22. La valeur est protégée, mais le décodage ne rend pas le texte d'origine. Ces documents sont notés par plus longue sous-suite commune (cf. README).

## Les cinq plus gros écarts (identifiants directs)

| # | Type · écriture | Perdues | Rappel |
|---:|---|---:|---:|
| 1 | NIR · nir-cle-tiret | 17/17 (dont 17 partielles) | 0.0 % |
| 2 | CNSS · cnss-affiliation-7 | 12/25 (dont 0 partielles) | 52.0 % |
| 3 | PERSONNE · fr-particule | 3/35 (dont 2 partielles) | 91.4 % |
| 4 | PERSONNE · mag-ould | 3/36 (dont 3 partielles) | 91.7 % |
| 5 | RIB · rib-ma-par-4 | 2/10 (dont 2 partielles) | 80.0 % |

## Par type d'entité

| Type | Direct | Valeurs | Rappel | Partielles | Précision | F1 | Bon préfixe |
|---|:-:|---:|---:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 733 | 98.4 % | 11 | 79.8 % (1332/1669) | 88.1 % | 709/721 |
| CIN — CIN marocaine | oui | 139 | 100.0 % | 0 | 63.5 % (101/159) | 77.7 % | 101/139 |
| NIR — NIR (sécurité sociale, France) | oui | 46 | 63.0 % | 17 | — (0/0) | — | 29/29 |
| CNSS — N° CNSS | oui | 74 | 83.8 % | 0 | 100.0 % (50/50) | 91.2 % | 50/62 |
| ICE — ICE | oui | 74 | 100.0 % | 0 | 98.7 % (74/75) | 99.3 % | 74/74 |
| IF — Identifiant fiscal (IF) | oui | 45 | 100.0 % | 0 | 100.0 % (27/27) | 100.0 % | 27/45 |
| RC — Registre de commerce (RC) | oui | 45 | 100.0 % | 0 | 100.0 % (45/45) | 100.0 % | 45/45 |
| SIREN — SIREN | oui | 24 | 100.0 % | 0 | 16.7 % (24/144) | 28.6 % | 24/24 |
| SIRET — SIRET | oui | 28 | 100.0 % | 0 | — (0/0) | — | 12/28 |
| TEL — Téléphone | oui | 340 | 100.0 % | 0 | 100.0 % (317/317) | 100.0 % | 317/340 |
| EMAIL — E-mail | oui | 165 | 100.0 % | 0 | 100.0 % (165/165) | 100.0 % | 165/165 |
| IBAN — IBAN | oui | 41 | 97.6 % | 1 | 44.0 % (40/91) | 60.6 % | 40/40 |
| RIB — RIB | oui | 54 | 94.4 % | 3 | — (0/0) | — | 51/51 |
| IMEI — IMEI | oui | 26 | 100.0 % | 0 | 100.0 % (25/25) | 100.0 % | 25/26 |
| IMSI — IMSI | oui | 19 | 100.0 % | 0 | 100.0 % (19/19) | 100.0 % | 19/19 |
| BIC — BIC / SWIFT |  | 24 | 100.0 % | 0 | — (0/0) | — | 0/24 |
| ICCID — ICCID (carte SIM) |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| ADRESSE — Adresse postale |  | 161 | 95.7 % | 0 | 99.4 % (159/160) | 97.5 % | 140/154 |
| SOCIETE — Société |  | 156 | 100.0 % | 0 | 52.2 % (144/276) | 68.6 % | 144/156 |
| NAISSANCE — Date de naissance |  | 74 | 75.7 % | 0 | 100.0 % (56/56) | 86.2 % | 56/56 |
| PATENTE — N° de patente |  | 9 | 100.0 % | 0 | 100.0 % (9/9) | 100.0 % | 9/9 |
| TVA — N° de TVA intracommunautaire |  | 4 | 100.0 % | 0 | 100.0 % (4/4) | 100.0 % | 4/4 |
| MATRICULE — Matricule salarié |  | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| PATIENT — N° de dossier patient / IPP |  | 24 | 100.0 % | 0 | 72.7 % (24/33) | 84.2 % | 24/24 |
| PRATICIEN — Identifiant praticien (INPE, RPPS) |  | 36 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/36 |
| POLICE — N° de police d'assurance |  | 12 | 100.0 % | 0 | — (0/0) | — | 0/12 |
| SINISTRE — N° de sinistre |  | 12 | 100.0 % | 0 | 52.2 % (12/23) | 68.6 % | 12/12 |
| FACTURE — N° de facture / pièce |  | 24 | 100.0 % | 0 | 0.0 % (0/4) | 0.0 % | 0/24 |
| RG — N° RG / parquet |  | 48 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/48 |

Précision(type) = passages codés sous un préfixe de ce type qui recouvrent bien une valeur de ce type. « Bon préfixe » : parmi les valeurs détectées, celles codées sous un préfixe attendu (une valeur codée REF au lieu de SIRET est protégée, mais mal nommée).

## Rappel direct, pack × type

| Pack | CIN | CNSS | EMAIL | IBAN | ICE | IF | IMEI | IMSI | NIR | PERSONNE | RC | RIB | SIREN | SIRET | TEL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| core | 100.0 % (19) | 100.0 % (1) | 100.0 % (57) |  |  |  |  |  | 40.0 % (10) | 98.6 % (145) |  |  |  |  | 100.0 % (104) |
| telecom-ma | 100.0 % (36) |  | 100.0 % (24) |  | 100.0 % (5) |  | 100.0 % (26) | 100.0 % (19) |  | 100.0 % (72) |  |  |  |  | 100.0 % (67) |
| juridique-fr | 100.0 % (12) |  | 100.0 % (24) |  |  |  |  |  | 58.3 % (12) | 98.6 % (144) |  |  | 100.0 % (24) | 100.0 % (12) | 100.0 % (48) |
| banque-assurance | 100.0 % (24) |  | 100.0 % (12) | 100.0 % (25) |  |  |  |  |  | 97.1 % (139) |  | 94.1 % (34) |  |  | 100.0 % (36) |
| sante | 100.0 % (12) | 100.0 % (24) | 100.0 % (12) |  |  |  |  |  | 75.0 % (12) | 100.0 % (98) |  |  |  |  | 100.0 % (49) |
| expertise-comptable | 100.0 % (12) | 100.0 % (13) | 100.0 % (24) | 100.0 % (4) | 100.0 % (45) | 100.0 % (33) |  |  |  | 95.4 % (87) | 100.0 % (33) | 87.5 % (8) |  | 100.0 % (4) | 100.0 % (24) |
| rh-paie | 100.0 % (24) | 66.7 % (36) | 100.0 % (12) | 91.7 % (12) | 100.0 % (24) | 100.0 % (12) |  |  | 75.0 % (12) | 100.0 % (48) | 100.0 % (12) | 100.0 % (12) |  | 100.0 % (12) | 100.0 % (12) |

## Par écriture

| Type · écriture | Direct | Valeurs | Rappel | Partielles |
|---|:-:|---:|---:|---:|
| ADRESSE · fr-batiment |  | 22 | 86.4 % | 0 |
| ADRESSE · fr-bis |  | 24 | 95.8 % | 0 |
| ADRESSE · fr-rue |  | 28 | 89.3 % | 0 |
| ADRESSE · ma-douar-hay |  | 23 | 100.0 % | 0 |
| ADRESSE · ma-lotissement |  | 21 | 100.0 % | 0 |
| ADRESSE · ma-residence |  | 21 | 100.0 % | 0 |
| ADRESSE · ma-rue |  | 22 | 100.0 % | 0 |
| BIC · bic-11 |  | 11 | 100.0 % | 0 |
| BIC · bic-8 |  | 13 | 100.0 % | 0 |
| CIN · cin-colle | oui | 63 | 100.0 % | 0 |
| CIN · cin-espace | oui | 38 | 100.0 % | 0 |
| CIN · cin-tiret | oui | 38 | 100.0 % | 0 |
| CNSS · cnss-affiliation-7 | oui | 25 | 52.0 % | 0 |
| CNSS · cnss-assure-9 | oui | 49 | 100.0 % | 0 |
| EMAIL · generique | oui | 12 | 100.0 % | 0 |
| EMAIL · initiale.nom | oui | 33 | 100.0 % | 0 |
| EMAIL · majuscules | oui | 31 | 100.0 % | 0 |
| EMAIL · nom_prenom | oui | 28 | 100.0 % | 0 |
| EMAIL · prenom.nom | oui | 36 | 100.0 % | 0 |
| EMAIL · prenomnom-chiffres | oui | 25 | 100.0 % | 0 |
| FACTURE · lot |  | 12 | 100.0 % | 0 |
| FACTURE · — |  | 12 | 100.0 % | 0 |
| IBAN · iban-fr-colle | oui | 16 | 100.0 % | 0 |
| IBAN · iban-fr-par-4 | oui | 12 | 91.7 % | 1 |
| IBAN · iban-ma-colle | oui | 7 | 100.0 % | 0 |
| IBAN · iban-ma-par-4 | oui | 6 | 100.0 % | 0 |
| ICCID · iccid-colle |  | 12 | 100.0 % | 0 |
| ICE · ice-colle | oui | 51 | 100.0 % | 0 |
| ICE · ice-par-3 | oui | 23 | 100.0 % | 0 |
| IF · if-nombre | oui | 45 | 100.0 % | 0 |
| IMEI · imei-colle | oui | 7 | 100.0 % | 0 |
| IMEI · imei-groupes | oui | 7 | 100.0 % | 0 |
| IMEI · imei-tirets | oui | 12 | 100.0 % | 0 |
| IMSI · imsi-colle | oui | 19 | 100.0 % | 0 |
| MATRICULE · — |  | 24 | 100.0 % | 0 |
| NAISSANCE · jj-mm-aaaa |  | 37 | 75.7 % | 0 |
| NAISSANCE · lettres |  | 37 | 75.7 % | 0 |
| NIR · nir-cle-tiret | oui | 17 | 0.0 % | 17 |
| NIR · nir-colle | oui | 10 | 100.0 % | 0 |
| NIR · nir-groupes | oui | 19 | 100.0 % | 0 |
| PATENTE · patente |  | 9 | 100.0 % | 0 |
| PATIENT · — |  | 24 | 100.0 % | 0 |
| PERSONNE · fr-nom-mot-courant | oui | 34 | 100.0 % | 0 |
| PERSONNE · fr-particule | oui | 35 | 91.4 % | 2 |
| PERSONNE · fr-simple | oui | 175 | 100.0 % | 0 |
| PERSONNE · mag-ait-apostrophe | oui | 9 | 100.0 % | 0 |
| PERSONNE · mag-ait-espace | oui | 23 | 91.3 % | 2 |
| PERSONNE · mag-ait-tiret | oui | 21 | 100.0 % | 0 |
| PERSONNE · mag-ait-trema | oui | 21 | 100.0 % | 0 |
| PERSONNE · mag-al-espace | oui | 21 | 100.0 % | 0 |
| PERSONNE · mag-ben-colle | oui | 35 | 100.0 % | 0 |
| PERSONNE · mag-ben-espace | oui | 39 | 97.4 % | 1 |
| PERSONNE · mag-ben-tiret | oui | 22 | 100.0 % | 0 |
| PERSONNE · mag-double | oui | 60 | 98.3 % | 1 |
| PERSONNE · mag-el-colle | oui | 14 | 100.0 % | 0 |
| PERSONNE · mag-el-espace | oui | 33 | 97.0 % | 1 |
| PERSONNE · mag-el-tiret | oui | 16 | 100.0 % | 0 |
| PERSONNE · mag-ould | oui | 36 | 91.7 % | 3 |
| PERSONNE · mag-simple | oui | 139 | 99.3 % | 1 |
| POLICE · — |  | 12 | 100.0 % | 0 |
| PRATICIEN · — |  | 36 | 100.0 % | 0 |
| RC · rc-nombre | oui | 45 | 100.0 % | 0 |
| RG · parquet |  | 12 | 100.0 % | 0 |
| RG · pourvoi |  | 12 | 100.0 % | 0 |
| RG · rg |  | 24 | 100.0 % | 0 |
| RIB · rib-ma-colle | oui | 10 | 100.0 % | 0 |
| RIB · rib-ma-groupes | oui | 16 | 93.8 % | 1 |
| RIB · rib-ma-par-4 | oui | 10 | 80.0 % | 2 |
| RIB · rib-ma-tirets | oui | 18 | 100.0 % | 0 |
| SINISTRE · — |  | 12 | 100.0 % | 0 |
| SIREN · siren-colle | oui | 12 | 100.0 % | 0 |
| SIREN · siren-groupes | oui | 12 | 100.0 % | 0 |
| SIRET · siret-colle | oui | 16 | 100.0 % | 0 |
| SIRET · siret-groupes | oui | 12 | 100.0 % | 0 |
| SOCIETE · casse-titre |  | 47 | 100.0 % | 0 |
| SOCIETE · majuscules |  | 51 | 100.0 % | 0 |
| SOCIETE · societe-forme |  | 58 | 100.0 % | 0 |
| TEL · fr-fixe-0033 | oui | 5 | 100.0 % | 0 |
| TEL · fr-fixe-intl-colle | oui | 10 | 100.0 % | 0 |
| TEL · fr-fixe-intl-espaces | oui | 8 | 100.0 % | 0 |
| TEL · fr-fixe-intl-zero-parenthese | oui | 9 | 100.0 % | 0 |
| TEL · fr-fixe-national-colle | oui | 5 | 100.0 % | 0 |
| TEL · fr-fixe-national-espaces | oui | 10 | 100.0 % | 0 |
| TEL · fr-fixe-national-points | oui | 2 | 100.0 % | 0 |
| TEL · fr-fixe-national-tirets | oui | 3 | 100.0 % | 0 |
| TEL · fr-mobile-0033 | oui | 4 | 100.0 % | 0 |
| TEL · fr-mobile-intl-colle | oui | 6 | 100.0 % | 0 |
| TEL · fr-mobile-intl-espaces | oui | 7 | 100.0 % | 0 |
| TEL · fr-mobile-intl-irregulier | oui | 1 | 100.0 % | 0 |
| TEL · fr-mobile-intl-zero-parenthese | oui | 11 | 100.0 % | 0 |
| TEL · fr-mobile-national-colle | oui | 6 | 100.0 % | 0 |
| TEL · fr-mobile-national-espaces | oui | 4 | 100.0 % | 0 |
| TEL · fr-mobile-national-points | oui | 6 | 100.0 % | 0 |
| TEL · fr-mobile-national-tirets | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-00212 | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-intl-3-6 | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-intl-colle | oui | 7 | 100.0 % | 0 |
| TEL · ma-fixe-intl-espaces | oui | 6 | 100.0 % | 0 |
| TEL · ma-fixe-intl-tirets | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-intl-zero-parenthese | oui | 1 | 100.0 % | 0 |
| TEL · ma-fixe-msisdn-sans-plus | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-national-4-2-2-2 | oui | 6 | 100.0 % | 0 |
| TEL · ma-fixe-national-colle | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-national-espaces | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-national-points | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-national-tirets | oui | 4 | 100.0 % | 0 |
| TEL · ma-mobile-00212 | oui | 16 | 100.0 % | 0 |
| TEL · ma-mobile-espaces-irreguliers | oui | 1 | 100.0 % | 0 |
| TEL · ma-mobile-intl-3-6 | oui | 20 | 100.0 % | 0 |
| TEL · ma-mobile-intl-colle | oui | 10 | 100.0 % | 0 |
| TEL · ma-mobile-intl-espaces | oui | 17 | 100.0 % | 0 |
| TEL · ma-mobile-intl-tirets | oui | 10 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese | oui | 14 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese-colle | oui | 1 | 100.0 % | 0 |
| TEL · ma-mobile-msisdn-sans-plus | oui | 16 | 100.0 % | 0 |
| TEL · ma-mobile-national-4-2-2-2 | oui | 15 | 100.0 % | 0 |
| TEL · ma-mobile-national-colle | oui | 14 | 100.0 % | 0 |
| TEL · ma-mobile-national-espaces | oui | 15 | 100.0 % | 0 |
| TEL · ma-mobile-national-points | oui | 12 | 100.0 % | 0 |
| TEL · ma-mobile-national-tirets | oui | 14 | 100.0 % | 0 |
| TEL · ma-mobile-slash | oui | 1 | 100.0 % | 0 |
| TVA · tva-fr-colle |  | 2 | 100.0 % | 0 |
| TVA · tva-fr-groupes |  | 2 | 100.0 % | 0 |

## Par trait (noms)

| Type · trait | Valeurs | Rappel | Partielles |
|---|---:|---:|---:|
| PERSONNE · minuscules | 10 | 100.0 % | 0 |
| PERSONNE · nom-majuscules | 81 | 98.8 % | 1 |
| PERSONNE · nom-majuscules-avant | 132 | 100.0 % | 0 |
| PERSONNE · nom-seul | 74 | 98.6 % | 0 |
| PERSONNE · prenom-apostrophe | 46 | 91.3 % | 4 |
| PERSONNE · prenom-compose | 84 | 100.0 % | 0 |
| PERSONNE · prenom-seul | 41 | 97.6 % | 1 |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés à tort | Taux |
|---|---:|---:|---:|
| MONTANT — Montant | 516 | 38 | 7.4 % |
| DATE — Date (hors naissance) | 567 | 0 | 0.0 % |
| ARTICLE — Article ou texte de loi | 88 | 35 | 39.8 % |
| SIGLE — Sigle ou terme du lexique | 235 | 53 | 22.6 % |
| MOT — Mot courant qui ressemble à un nom | 122 | 11 | 9.0 % |
| VILLE — Ville | 156 | 0 | 0.0 % |
| PRODUIT — Offre, opérateur, médicament | 102 | 32 | 31.4 % |
| COMPTE — N° de compte comptable | 79 | 0 | 0.0 % |
| MESURE — Durée, quantité, dosage | 90 | 1 | 1.1 % |

## Valeurs manquées ou partielles (70)

| Document | Type | Écriture | Valeur (synthétique) | Statut | Resté en clair | Vu par l'IA | Préfixes posés |
|---|---|---|---|---|---|:-:|---|
| rh-paie/bulletinMa/001 | CNSS | cnss-affiliation-7 | `7456193` | manque | 7456193 | oui |  |
| rh-paie/bulletinMa/002 | CNSS | cnss-affiliation-7 | `1590991` | manque | 1590991 | oui |  |
| rh-paie/bulletinMa/003 | CNSS | cnss-affiliation-7 | `8710871` | manque | 8710871 | oui |  |
| rh-paie/bulletinMa/004 | CNSS | cnss-affiliation-7 | `9135145` | manque | 9135145 | oui |  |
| rh-paie/bulletinMa/005 | CNSS | cnss-affiliation-7 | `2140584` | manque | 2140584 | oui |  |
| rh-paie/bulletinMa/006 | CNSS | cnss-affiliation-7 | `8806146` | manque | 8806146 | oui |  |
| rh-paie/bulletinMa/007 | CNSS | cnss-affiliation-7 | `5398685` | manque | 5398685 | oui |  |
| rh-paie/bulletinMa/008 | CNSS | cnss-affiliation-7 | `1843021` | manque | 1843021 | oui |  |
| rh-paie/bulletinMa/009 | CNSS | cnss-affiliation-7 | `1856059` | manque | 1856059 | oui |  |
| rh-paie/bulletinMa/010 | CNSS | cnss-affiliation-7 | `4295445` | manque | 4295445 | oui |  |
| rh-paie/bulletinMa/011 | CNSS | cnss-affiliation-7 | `7501593` | manque | 7501593 | oui |  |
| rh-paie/bulletinMa/012 | CNSS | cnss-affiliation-7 | `8109948` | manque | 8109948 | oui |  |
| rh-paie/bulletinFr/001 | IBAN | iban-fr-par-4 | `FR76 2245 1259 3502 5177 5787 675` | partiel | 5787 675 | non | REF, CARTE |
| core/courrier/003 | NIR | nir-cle-tiret | `1 68 07 94 443 898 - 83` | partiel | 83 | oui | CIN |
| core/courrier/010 | NIR | nir-cle-tiret | `2 75 09 2A 724 241 - 85` | partiel | 85 | oui | CIN |
| core/courrier/011 | NIR | nir-cle-tiret | `1 56 11 13 135 111 - 48` | partiel | 48 | oui | CIN |
| core/courrier/012 | NIR | nir-cle-tiret | `1 47 12 31 177 146 - 82` | partiel | 82 | oui | CIN |
| core/courrier/013 | NIR | nir-cle-tiret | `1 06 11 75 696 892 - 91` | partiel | 91 | oui | CIN |
| core/courrier/014 | NIR | nir-cle-tiret | `2 10 08 13 249 802 - 33` | partiel | 33 | oui | CIN |
| juridique-fr/assignation/003 | NIR | nir-cle-tiret | `1 00 06 31 924 607 - 79` | partiel | 79 | oui | CIN |
| juridique-fr/assignation/004 | NIR | nir-cle-tiret | `2 90 07 2B 561 069 - 42` | partiel | 42 | oui | CIN |
| juridique-fr/assignation/005 | NIR | nir-cle-tiret | `1 25 03 31 794 881 - 07` | partiel | 07 | oui | CIN |
| juridique-fr/assignation/011 | NIR | nir-cle-tiret | `1 65 02 2B 075 554 - 06` | partiel | 06 | oui | CIN |
| juridique-fr/assignation/012 | NIR | nir-cle-tiret | `2 20 01 2A 954 424 - 31` | partiel | 31 | oui | CIN |
| rh-paie/bulletinFr/004 | NIR | nir-cle-tiret | `1 97 02 67 473 063 - 22` | partiel | 22 | oui | CIN |
| rh-paie/bulletinFr/010 | NIR | nir-cle-tiret | `1 75 07 67 244 439 - 11` | partiel | 11 | oui | CIN |
| rh-paie/bulletinFr/011 | NIR | nir-cle-tiret | `1 49 04 31 392 783 - 44` | partiel | 44 | oui | CIN |
| sante/lettreLiaison/005 | NIR | nir-cle-tiret | `2 14 12 99 789 906 - 93` | partiel | 93 | oui | CIN |
| sante/lettreLiaison/006 | NIR | nir-cle-tiret | `2 42 07 94 077 945 - 18` | partiel | 18 | oui | CIN |
| sante/lettreLiaison/009 | NIR | nir-cle-tiret | `2 62 09 94 388 520 - 59` | partiel | 59 | oui | CIN |
| banque-assurance/releve/003 | PERSONNE | mag-ben-espace · prenom-apostrophe | `Ma'ati Ben Chekroun` | partiel | Ma | oui | CODE, NOM |
| banque-assurance/releve/006 | PERSONNE | mag-ould | `Nesrine Ould Bah` | partiel | Bah | oui | PRENOM |
| banque-assurance/releve/011 | PERSONNE | mag-double · prenom-apostrophe, nom-majuscules | `Ma'ati IDRISSI KAITOUNI` | partiel | Ma | oui | CODE, NOM |
| banque-assurance/sinistre/001 | PERSONNE | mag-simple | `Cheikh Saidi` | partiel | Cheikh | oui | NOM |
| core/mailTransfert/013 | PERSONNE | mag-ait-espace · prenom-seul | `R'kia` | partiel | R | oui | CODE |
| core/mailTransfert/013 | PERSONNE | mag-ait-espace · prenom-apostrophe | `R'kia Ait Taleb` | partiel | R | oui | CODE, NOM |
| expertise-comptable/grandLivre/001 | PERSONNE | mag-ould | `Rachida Ould Bah` | partiel | Bah | oui | NOM-002 |
| expertise-comptable/grandLivre/002 | PERSONNE | mag-el-espace · prenom-apostrophe | `Ma'ati El Moussaoui` | partiel | Ma | oui | CODE, NOM |
| expertise-comptable/grandLivre/007 | PERSONNE | mag-ould | `Mehdi Ould Bah` | partiel | Bah | oui | PRENOM |
| expertise-comptable/grandLivre/009 | PERSONNE | fr-particule | `Sophie Le Roux` | partiel | Roux | oui | PRENOM |
| juridique-fr/conclusions/005 | PERSONNE | fr-particule | `Inès de La Fontaine` | partiel | Fontaine | oui | PRENOM |
| juridique-fr/conclusions/005 | PERSONNE | fr-particule · nom-seul | `de La Fontaine` | manque | Fontaine | oui |  |
| banque-assurance/virement/003 | RIB | rib-ma-par-4 | `3509 6618 2146 6793 3256 3429` | partiel | 3256 3429 | non | CARTE |
| banque-assurance/virement/012 | RIB | rib-ma-groupes | `007 224 4161941191840505 25` | partiel | 007 25 | oui | CARTE |
| expertise-comptable/facture/010 | RIB | rib-ma-par-4 | `0117 2663 0845 1886 7116 7673` | partiel | 7116 7673 | non | CARTE |
| juridique-fr/conclusions/008 | ADRESSE (indirect) | fr-rue | `41 rue de la République` | manque | République | oui |  |
| juridique-fr/conclusions/011 | ADRESSE (indirect) | fr-batiment | `Bâtiment C, 27 quai de la Fosse` | manque | Fosse | oui | NOM, PRENOM |
| rh-paie/bulletinFr/005 | ADRESSE (indirect) | fr-rue | `49 quai de la Fosse` | manque | Fosse | oui |  |
| rh-paie/bulletinFr/009 | ADRESSE (indirect) | fr-batiment | `Bâtiment B, 90 quai de la Fosse` | manque | Fosse | oui |  |
| sante/lettreLiaison/001 | ADRESSE (indirect) | fr-bis | `31 bis rue de la République` | manque | République | oui |  |
| sante/lettreLiaison/003 | ADRESSE (indirect) | fr-rue | `71 quai de la Fosse` | manque | Fosse | oui |  |
| sante/lettreLiaison/007 | ADRESSE (indirect) | fr-batiment | `Bâtiment C, 5 rue de la République` | manque | République | oui | NOM, PRENOM |
| core/fiche/003 | NAISSANCE (indirect) | jj-mm-aaaa | `12/05/2003` | manque | 12 05 2003 | oui |  |
| core/fiche/004 | NAISSANCE (indirect) | jj-mm-aaaa | `22/08/1962` | manque | 22 08 1962 | oui |  |
| core/fiche/009 | NAISSANCE (indirect) | lettres | `16 juin 1988` | manque | 16 juin 1988 | oui |  |
| core/fiche/011 | NAISSANCE (indirect) | lettres | `8 août 1997` | manque | 8 août 1997 | oui |  |
| core/fiche/013 | NAISSANCE (indirect) | jj-mm-aaaa | `10/07/1998` | manque | 10 07 1998 | oui |  |
| core/fiche/014 | NAISSANCE (indirect) | jj-mm-aaaa | `02/06/1973` | manque | 02 06 1973 | oui |  |
| sante/compteRendu/001 | NAISSANCE (indirect) | lettres | `25 mai 2004` | manque | 25 mai 2004 | oui |  |
| sante/compteRendu/002 | NAISSANCE (indirect) | jj-mm-aaaa | `03/03/1982` | manque | 03 03 1982 | oui |  |
| sante/compteRendu/003 | NAISSANCE (indirect) | lettres | `27 août 1988` | manque | 27 août 1988 | oui |  |
| sante/compteRendu/004 | NAISSANCE (indirect) | jj-mm-aaaa | `18/12/1967` | manque | 18 12 1967 | oui |  |
| sante/compteRendu/005 | NAISSANCE (indirect) | lettres | `25 mars 1957` | manque | 25 mars 1957 | oui |  |
| sante/compteRendu/006 | NAISSANCE (indirect) | lettres | `25 octobre 1957` | manque | 25 octobre 1957 | oui |  |
| sante/compteRendu/007 | NAISSANCE (indirect) | lettres | `13 juin 1992` | manque | 13 juin 1992 | oui |  |
| sante/compteRendu/008 | NAISSANCE (indirect) | lettres | `19 juin 1985` | manque | 19 juin 1985 | oui |  |
| sante/compteRendu/009 | NAISSANCE (indirect) | jj-mm-aaaa | `16/11/1974` | manque | 16 11 1974 | oui |  |
| sante/compteRendu/010 | NAISSANCE (indirect) | jj-mm-aaaa | `03/12/1981` | manque | 03 12 1981 | oui |  |
| sante/compteRendu/011 | NAISSANCE (indirect) | lettres | `12 avril 1996` | manque | 12 avril 1996 | oui |  |
| sante/compteRendu/012 | NAISSANCE (indirect) | jj-mm-aaaa | `25/10/2000` | manque | 25 10 2000 | oui |  |

## Leurres codés à tort (170)

| Document | Leurre | Valeur | Préfixes |
|---|---|---|---|
| core/mailTransfert/010 | MOT | `Noël` | PRENOM |
| core/manuel/sms-darija | MOT · darija | `inchallah` | CODE |
| telecom-ma/ticket/002 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/ticket/005 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/ticket/009 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/ticket/011 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/portabilite/001 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/001 | MOT | `Noël` | PRENOM |
| telecom-ma/portabilite/002 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/003 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/004 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/004 | MOT | `Noël` | PRENOM |
| telecom-ma/portabilite/005 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/006 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/007 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/008 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/009 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/010 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/011 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/012 | SIGLE | `ANRT` | NOM |
| juridique-fr/conclusions/001 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/001 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/002 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/003 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/004 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/005 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/006 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/006 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/006 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/008 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/009 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/009 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/009 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/010 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/010 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/010 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/011 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/011 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/012 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/012 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/012 | MOT | `Noël` | PRENOM |
| juridique-fr/assignation/006 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/assignation/009 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/assignation/011 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/001 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/noteDossier/003 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/004 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/004 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/005 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/006 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/noteDossier/012 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/manuel/leurres-seuls | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| banque-assurance/virement/010 | MOT | `Noël` | PRENOM |
| sante/compteRendu/001 | PRODUIT | `ECG` | NOM |
| sante/compteRendu/002 | PRODUIT | `HbA1c` | REF |
| sante/compteRendu/002 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/compteRendu/003 | PRODUIT | `HbA1c` | REF |
| sante/compteRendu/004 | PRODUIT | `insuline glargine` | CODE |
| sante/compteRendu/006 | PRODUIT | `insuline glargine` | CODE |
| sante/compteRendu/006 | MOT | `Noël` | PRENOM |
| sante/compteRendu/008 | MOT | `Noël` | PRENOM |
| sante/compteRendu/009 | PRODUIT | `insuline glargine` | CODE |
| sante/compteRendu/010 | PRODUIT | `insuline glargine` | CODE |
| sante/compteRendu/012 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/001 | PRODUIT | `HbA1c` | REF |
| sante/lettreLiaison/002 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/lettreLiaison/003 | PRODUIT | `insuline glargine` | CODE |
| sante/lettreLiaison/004 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/006 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/lettreLiaison/007 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/008 | MOT | `Noël` | PRENOM |
| sante/lettreLiaison/009 | PRODUIT | `HbA1c` | REF |
| sante/lettreLiaison/011 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/001 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/ordonnance/002 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/ordonnance/006 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/007 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/ordonnance/007 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/008 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/009 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/009 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/010 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/012 | PRODUIT | `insuline glargine` | CODE |
| sante/manuel/transmission-orale | PRODUIT | `insuline glargine` | CODE |
| sante/manuel/transmission-orale | MESURE | `12 UI` | NOM |
| expertise-comptable/grandLivre/002 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/003 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/006 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/010 | SIGLE | `PCGE` | NOM |
| expertise-comptable/lettreMission/010 | MOT | `Noël` | PRENOM |
| rh-paie/bulletinMa/001 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · milliers | `47 076 MAD` | SOCIETE |
| rh-paie/bulletinMa/001 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · milliers | `56 405,37 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · milliers | `30 267,48 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · milliers | `20 050,55 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · centaines | `255 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · grand | `4.170.902,64 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · milliers | `39 103,66 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · grand | `7.606.725 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · centaines | `861,50 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · centaines | `911 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · milliers | `47 762,09 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · grand | `4 290 256,83 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · grand | `3 081 328,67 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · grand | `7 505 814 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · grand | `6 137 548,14 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · grand | `5 249 273 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · grand | `9 662 583 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · milliers | `41 393,44 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · grand | `9.564.495,35 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · milliers | `91 861 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · grand | `9 668 158,96 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · milliers | `84.966,59 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · milliers | `91 413,62 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · milliers | `53.320,30 MAD` | SOCIETE |
| rh-paie/bulletinFr/001 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/001 | MONTANT · grand | `900 068,22 €` | SOCIETE |
| rh-paie/bulletinFr/002 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/002 | MONTANT · milliers | `32 290,31 €` | SOCIETE |
| rh-paie/bulletinFr/003 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/003 | MONTANT · milliers | `44.825,08 €` | SOCIETE |
| rh-paie/bulletinFr/004 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/004 | MONTANT · milliers | `14 098 €` | SOCIETE |
| rh-paie/bulletinFr/005 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/005 | MONTANT · grand | `1 843 924 €` | SOCIETE |
| rh-paie/bulletinFr/006 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/006 | MONTANT · milliers | `17.464,33 €` | SOCIETE |
| rh-paie/bulletinFr/007 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/007 | MONTANT · centaines | `475 €` | SOCIETE |
| rh-paie/bulletinFr/008 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/008 | MONTANT · milliers | `4 692,59 €` | SOCIETE |
| rh-paie/bulletinFr/009 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/009 | MONTANT · milliers | `96 518 €` | SOCIETE |
| rh-paie/bulletinFr/010 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/010 | MONTANT · milliers | `65 423,40 €` | SOCIETE |
| rh-paie/bulletinFr/011 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/011 | MONTANT · milliers | `20.786 €` | SOCIETE |
| rh-paie/bulletinFr/012 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/012 | MONTANT · centaines | `873 €` | SOCIETE |
| rh-paie/attestation/009 | MOT | `Noël` | PRENOM |
| rh-paie/manuel/leurres-paie | SIGLE | `AMO` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `8 450,00 MAD` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `190,97 MAD` | SOCIETE |

## Codé hors étiquette (413 passages, 51 distincts — 40 plus fréquents)

Ni une valeur étiquetée, ni un leurre : surtout des mots du gabarit que le verrou ne connaît pas. Sur-coder est sûr, mais rend le texte moins utile à l'IA.

| Passage | Fois |
|---|---:|
| CODE « joignable » | 36 |
| NOM « PRLV » | 18 |
| NOM « TR » | 14 |
| SOCIETE « FICHE CONTACT » | 14 |
| NOM « RECU » | 13 |
| NOM « VIR » | 13 |
| CODE « confraternellement » | 12 |
| CODE « requérante » | 12 |
| CODE « télédéclarations » | 12 |
| NOM « Bien » | 12 |
| NOM « DEVANT » | 12 |
| NOM « EMIS » | 12 |
| NOM « EXTRAIT » | 12 |
| NOM « INTERNE » | 12 |
| NOM « LIAISON » | 12 |
| NOM « SAV » | 12 |
| NOM « TICKET » | 12 |
| NOM « VIREMENT » | 12 |
| NOM-001 « FACTURE » | 12 |
| SOCIETE « DÉCLARATION DE SINISTRE » | 12 |
| SOCIETE « DEMANDE DE PORTABILITÉ DU NUMÉRO » | 12 |
| SOCIETE « LETTRE DE MISSION » | 12 |
| NOM « CHQ » | 11 |
| NOM « REMIS » | 11 |
| NOM « Reprise » | 11 |
| SINISTRE « Police » | 11 |
| NOM « Inchallah » | 6 |
| SOCIETE « ORDRE DE VIREMENT PERMANENT » | 6 |
| CODE « choukran » | 5 |
| NOM « Enfant » | 5 |
| NOM « Salam » | 5 |
| NOM « Syntec » | 5 |
| CODE « glycémique » | 4 |
| SOCIETE « ORDRE DE VIREMENT OCCASIONNEL » | 4 |
| SOCIETE « PLAISE AU CONSEIL » | 4 |
| NOM « GSM » | 3 |
| NOM « Mb » | 3 |
| NOM « Hamdoullah » | 2 |
| NOM-002-002 « Facture » | 2 |
| NOM-003 « Facture » | 2 |
