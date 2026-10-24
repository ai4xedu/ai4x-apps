# HT-Bench 0.2.0 — rapport de détection, chemin md

Moteur Hidden Tokens **v2.22.0** · jeu `393d374e88cb6f29…` (synthétique, graine fixe) · 374 documents · 3380 valeurs à coder · 2579 leurres.

Chemin mesuré : anonymiser_fichier sur un .md (fichier *-anonymise.md écrit sur le poste) — moteur + verrou ; verrou de sortie mesuré à part sur la réponse de coder_texte. Une valeur compte comme détectée si toutes ses lettres et chiffres sont sous un code (les particules d'un nom — Ben, El, Aït, de… — peuvent rester en clair). Une valeur codée en partie est une fuite : elle compte comme manquée. Définitions complètes : `bench/ht-bench/README.md`.

**Identifiants directs (noms, pièces et identifiants, téléphones, e-mails, IBAN/RIB, IMEI/IMSI) : 98.3 %** (2612/2658) — cible ≥ 99 % par pack.

Verrou de sortie : sur 46 identifiant(s) direct(s) manqué(s) ou partiel(s) par le moteur, 43 resteraient lisibles dans la réponse de coder_texte (le reste est rattrapé par le dernier filet, « [MASQUÉ] » / « ••• » — mais le fichier écrit sur le poste, lui, les contient).

## Par pack

| Pack | Docs | Rappel direct | Cible | Rappel (tout) | Précision | F1 | Leurres codés | Texte lisible | « ••• » en sortie |
|---|---:|---:|:-:|---:|---:|---:|---:|---:|---:|
| banque-assurance | 49 | 98.2 % (336/342) | ❌ | 98.6 % | 70.3 % | 82.1 % | 49/325 (15.1 %) | 68.3 % | 12 |
| core | 91 | 98.8 % (728/737) | ❌ | 96.5 % | 57.2 % | 71.9 % | 186/377 (49.3 %) | 58.9 % | 0 |
| expertise-comptable | 37 | 98.3 % (282/287) | ❌ | 98.8 % | 88.6 % | 93.4 % | 5/439 (1.1 %) | 89.4 % | 13 |
| juridique-fr | 37 | 97.5 % (269/276) | ❌ | 97.9 % | 86.7 % | 91.9 % | 36/308 (11.7 %) | 96.0 % | 0 |
| rh-paie | 49 | 94.7 % (284/300) | ❌ | 95.5 % | 70.4 % | 81.1 % | 148/455 (32.5 %) | 69.8 % | 24 |
| sante | 49 | 99.0 % (288/291) | ❌ | 93.3 % | 76.0 % | 83.8 % | 73/292 (25.0 %) | 78.4 % | 70 |
| telecom-ma | 62 | 100.0 % (425/425) | ✅ | 100.0 % | 43.0 % | 60.2 % | 195/383 (50.9 %) | 71.4 % | 0 |

Texte lisible = part des lettres et chiffres hors de toute valeur étiquetée (le texte du document, leurres compris) restée en clair. Précision du pack = passages codés qui recouvrent une valeur étiquetée / tous les passages codés : le verrou code tout mot inconnu du lexique, un mot courant codé à tort la fait baisser (cf. « Codé hors étiquette »). « ••• » en sortie : passages masqués par le verrou de sortie dans la réponse de coder_texte (souvent un code déjà posé que le motif d'un pack reconnaît à nouveau : l'IA ne peut plus le citer).

## Par langue

| Langue | Docs | Rappel direct | Rappel (tout) | Précision | Leurres codés | Texte lisible |
|---|---:|---:|---:|---:|---:|---:|
| ar — écriture arabe | 52 | 100.0 % (323/323) | 100.0 % | 39.2 % | 255/259 (98.5 %) | 1.8 % |
| darija-latin — darija en lettres latines (arabizi) | 27 | 100.0 % (240/240) | 100.0 % | 31.7 % | 204/273 (74.7 %) | 52.4 % |
| fr — français | 268 | 97.6 % (1808/1853) | 97.2 % | 85.5 % | 170/1955 (8.7 %) | 92.1 % |
| fr-ar — bilingue français / arabe | 27 | 99.6 % (241/242) | 91.2 % | 54.7 % | 63/92 (68.5 %) | 38.2 % |

**Sortie corrompue : 47 document(s)** dont le texte codé n'est plus « l'origine + des codes » (codes imbriqués comme `NOM-001-002`, morceau de mot recodé) — banque-assurance : 11, expertise-comptable : 22, sante : 14. La valeur est protégée, mais le décodage ne rend pas le texte d'origine. Ces documents sont notés par plus longue sous-suite commune (cf. README).

## Les 5 plus gros écarts (identifiants directs)

| # | Type · écriture | Perdues | Rappel |
|---:|---|---:|---:|
| 1 | NIR · nir-cle-tiret | 17/17 (dont 17 partielles) | 0.0 % |
| 2 | CNSS · cnss-affiliation-7 | 12/25 (dont 0 partielles) | 52.0 % |
| 3 | PERSONNE · fr-particule | 3/35 (dont 2 partielles) | 91.4 % |
| 4 | PERSONNE · mag-ould | 3/36 (dont 3 partielles) | 91.7 % |
| 5 | RIB · rib-ma-par-4 | 2/11 (dont 2 partielles) | 81.8 % |

## Par type d'entité

| Type | Direct | Valeurs | Rappel | Partielles | Précision | F1 | Bon préfixe |
|---|:-:|---:|---:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 1155 | 98.9 % | 12 | 78.6 % (1520/1933) | 87.6 % | 835/1142 |
| CIN — CIN marocaine | oui | 223 | 100.0 % | 0 | 70.1 % (136/194) | 82.4 % | 136/223 |
| NIR — NIR (sécurité sociale, France) | oui | 46 | 63.0 % | 17 | — (0/0) | — | 29/29 |
| CNSS — N° CNSS | oui | 87 | 86.2 % | 0 | 100.0 % (50/50) | 92.6 % | 50/75 |
| ICE — ICE | oui | 98 | 100.0 % | 0 | 99.0 % (98/99) | 99.5 % | 98/98 |
| IF — Identifiant fiscal (IF) | oui | 45 | 100.0 % | 0 | 100.0 % (27/27) | 100.0 % | 27/45 |
| RC — Registre de commerce (RC) | oui | 45 | 100.0 % | 0 | 100.0 % (45/45) | 100.0 % | 45/45 |
| SIREN — SIREN | oui | 24 | 100.0 % | 0 | 3.6 % (24/669) | 6.9 % | 24/24 |
| SIRET — SIRET | oui | 28 | 100.0 % | 0 | — (0/0) | — | 12/28 |
| TEL — Téléphone | oui | 507 | 100.0 % | 0 | 100.0 % (408/408) | 100.0 % | 408/507 |
| EMAIL — E-mail | oui | 224 | 100.0 % | 0 | 100.0 % (224/224) | 100.0 % | 224/224 |
| IBAN — IBAN | oui | 41 | 97.6 % | 1 | 42.1 % (40/95) | 58.8 % | 40/40 |
| RIB — RIB | oui | 66 | 95.5 % | 3 | — (0/0) | — | 55/63 |
| IMEI — IMEI | oui | 50 | 100.0 % | 0 | 100.0 % (49/49) | 100.0 % | 49/50 |
| IMSI — IMSI | oui | 19 | 100.0 % | 0 | 100.0 % (19/19) | 100.0 % | 19/19 |
| BIC — BIC / SWIFT |  | 24 | 100.0 % | 0 | — (0/0) | — | 0/24 |
| ICCID — ICCID (carte SIM) |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| ADRESSE — Adresse postale |  | 189 | 96.3 % | 0 | 99.4 % (165/166) | 97.8 % | 146/182 |
| SOCIETE — Société |  | 180 | 100.0 % | 0 | 22.3 % (168/754) | 36.4 % | 168/180 |
| NAISSANCE — Date de naissance |  | 100 | 56.0 % | 0 | 100.0 % (56/56) | 71.8 % | 56/56 |
| PATENTE — N° de patente |  | 9 | 100.0 % | 0 | 100.0 % (9/9) | 100.0 % | 9/9 |
| TVA — N° de TVA intracommunautaire |  | 4 | 100.0 % | 0 | 100.0 % (4/4) | 100.0 % | 4/4 |
| MATRICULE — Matricule salarié |  | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| PATIENT — N° de dossier patient / IPP |  | 36 | 100.0 % | 0 | 80.0 % (36/45) | 88.9 % | 36/36 |
| PRATICIEN — Identifiant praticien (INPE, RPPS) |  | 48 | 100.0 % | 0 | 100.0 % (48/48) | 100.0 % | 48/48 |
| POLICE — N° de police d'assurance |  | 12 | 100.0 % | 0 | — (0/0) | — | 0/12 |
| SINISTRE — N° de sinistre |  | 12 | 100.0 % | 0 | 52.2 % (12/23) | 68.6 % | 12/12 |
| FACTURE — N° de facture / pièce |  | 24 | 100.0 % | 0 | 0.0 % (0/4) | 0.0 % | 0/24 |
| RG — N° RG / parquet |  | 48 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/48 |

Précision(type) = passages codés sous un préfixe de ce type qui recouvrent bien une valeur de ce type. « Bon préfixe » : parmi les valeurs détectées, celles codées sous un préfixe attendu (une valeur codée REF au lieu de SIRET est protégée, mais mal nommée).

## Rappel direct, pack × type

| Pack | CIN | CNSS | EMAIL | IBAN | ICE | IF | IMEI | IMSI | NIR | PERSONNE | RC | RIB | SIREN | SIRET | TEL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| banque-assurance | 100.0 % (24) |  | 100.0 % (24) | 100.0 % (25) | 100.0 % (12) |  |  |  |  | 97.5 % (163) |  | 95.7 % (46) |  |  | 100.0 % (48) |
| core | 100.0 % (55) | 100.0 % (2) | 100.0 % (92) |  |  |  |  |  | 40.0 % (10) | 99.2 % (397) |  |  |  |  | 100.0 % (181) |
| expertise-comptable | 100.0 % (12) | 100.0 % (13) | 100.0 % (24) | 100.0 % (4) | 100.0 % (45) | 100.0 % (33) |  |  |  | 95.4 % (87) | 100.0 % (33) | 87.5 % (8) |  | 100.0 % (4) | 100.0 % (24) |
| juridique-fr | 100.0 % (12) |  | 100.0 % (24) |  |  |  |  |  | 58.3 % (12) | 98.6 % (144) |  |  | 100.0 % (24) | 100.0 % (12) | 100.0 % (48) |
| rh-paie | 100.0 % (36) | 75.0 % (48) | 100.0 % (12) | 91.7 % (12) | 100.0 % (36) | 100.0 % (12) |  |  | 75.0 % (12) | 100.0 % (72) | 100.0 % (12) | 100.0 % (12) |  | 100.0 % (12) | 100.0 % (24) |
| sante | 100.0 % (24) | 100.0 % (24) | 100.0 % (12) |  |  |  |  |  | 75.0 % (12) | 100.0 % (158) |  |  |  |  | 100.0 % (61) |
| telecom-ma | 100.0 % (60) |  | 100.0 % (36) |  | 100.0 % (5) |  | 100.0 % (50) | 100.0 % (19) |  | 100.0 % (134) |  |  |  |  | 100.0 % (121) |

## Par écriture

| Type · écriture | Direct | Valeurs | Rappel | Partielles |
|---|:-:|---:|---:|---:|
| ADRESSE · ar-douar |  | 2 | 100.0 % | 0 |
| ADRESSE · ar-lotissement |  | 3 | 100.0 % | 0 |
| ADRESSE · ar-residence |  | 4 | 100.0 % | 0 |
| ADRESSE · ar-rue |  | 12 | 100.0 % | 0 |
| ADRESSE · fr-batiment |  | 22 | 86.4 % | 0 |
| ADRESSE · fr-bis |  | 24 | 95.8 % | 0 |
| ADRESSE · fr-rue |  | 28 | 89.3 % | 0 |
| ADRESSE · ma-douar-hay |  | 24 | 100.0 % | 0 |
| ADRESSE · ma-lotissement |  | 23 | 100.0 % | 0 |
| ADRESSE · ma-residence |  | 23 | 100.0 % | 0 |
| ADRESSE · ma-rue |  | 24 | 100.0 % | 0 |
| BIC · bic-11 |  | 11 | 100.0 % | 0 |
| BIC · bic-8 |  | 13 | 100.0 % | 0 |
| CIN · cin-colle | oui | 95 | 100.0 % | 0 |
| CIN · cin-colle·ar | oui | 9 | 100.0 % | 0 |
| CIN · cin-espace | oui | 60 | 100.0 % | 0 |
| CIN · cin-espace·ar | oui | 5 | 100.0 % | 0 |
| CIN · cin-tiret | oui | 49 | 100.0 % | 0 |
| CIN · cin-tiret·ar | oui | 5 | 100.0 % | 0 |
| CNSS · cnss-affiliation-7 | oui | 25 | 52.0 % | 0 |
| CNSS · cnss-assure-9 | oui | 57 | 100.0 % | 0 |
| CNSS · cnss-assure-9·ar | oui | 5 | 100.0 % | 0 |
| EMAIL · generique | oui | 24 | 100.0 % | 0 |
| EMAIL · initiale.nom | oui | 40 | 100.0 % | 0 |
| EMAIL · majuscules | oui | 42 | 100.0 % | 0 |
| EMAIL · nom_prenom | oui | 37 | 100.0 % | 0 |
| EMAIL · prenom.nom | oui | 46 | 100.0 % | 0 |
| EMAIL · prenomnom-chiffres | oui | 35 | 100.0 % | 0 |
| FACTURE · lot |  | 12 | 100.0 % | 0 |
| FACTURE · — |  | 12 | 100.0 % | 0 |
| IBAN · iban-fr-colle | oui | 16 | 100.0 % | 0 |
| IBAN · iban-fr-par-4 | oui | 12 | 91.7 % | 1 |
| IBAN · iban-ma-colle | oui | 7 | 100.0 % | 0 |
| IBAN · iban-ma-par-4 | oui | 6 | 100.0 % | 0 |
| ICCID · iccid-colle |  | 12 | 100.0 % | 0 |
| ICE · ice-colle | oui | 69 | 100.0 % | 0 |
| ICE · ice-par-3 | oui | 29 | 100.0 % | 0 |
| IF · if-nombre | oui | 45 | 100.0 % | 0 |
| IMEI · imei-colle | oui | 15 | 100.0 % | 0 |
| IMEI · imei-groupes | oui | 11 | 100.0 % | 0 |
| IMEI · imei-tirets | oui | 24 | 100.0 % | 0 |
| IMSI · imsi-colle | oui | 19 | 100.0 % | 0 |
| MATRICULE · — |  | 24 | 100.0 % | 0 |
| NAISSANCE · jj-mm-aaaa |  | 49 | 57.1 % | 0 |
| NAISSANCE · lettres |  | 51 | 54.9 % | 0 |
| NIR · nir-cle-tiret | oui | 17 | 0.0 % | 17 |
| NIR · nir-colle | oui | 10 | 100.0 % | 0 |
| NIR · nir-groupes | oui | 19 | 100.0 % | 0 |
| PATENTE · patente |  | 9 | 100.0 % | 0 |
| PATIENT · — |  | 36 | 100.0 % | 0 |
| PERSONNE · ar-ait | oui | 30 | 100.0 % | 0 |
| PERSONNE · ar-ben | oui | 35 | 100.0 % | 0 |
| PERSONNE · ar-double | oui | 11 | 100.0 % | 0 |
| PERSONNE · ar-nasab | oui | 11 | 90.9 % | 1 |
| PERSONNE · ar-ould | oui | 15 | 100.0 % | 0 |
| PERSONNE · ar-simple | oui | 88 | 100.0 % | 0 |
| PERSONNE · arabizi | oui | 167 | 100.0 % | 0 |
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
| PERSONNE · mag-translitteration | oui | 65 | 100.0 % | 0 |
| POLICE · — |  | 12 | 100.0 % | 0 |
| PRATICIEN · — |  | 48 | 100.0 % | 0 |
| RC · rc-nombre | oui | 45 | 100.0 % | 0 |
| RG · parquet |  | 12 | 100.0 % | 0 |
| RG · pourvoi |  | 12 | 100.0 % | 0 |
| RG · rg |  | 24 | 100.0 % | 0 |
| RIB · rib-ma-colle | oui | 10 | 100.0 % | 0 |
| RIB · rib-ma-colle·ar | oui | 3 | 100.0 % | 0 |
| RIB · rib-ma-groupes | oui | 16 | 93.8 % | 1 |
| RIB · rib-ma-groupes·ar | oui | 4 | 100.0 % | 0 |
| RIB · rib-ma-par-4 | oui | 11 | 81.8 % | 2 |
| RIB · rib-ma-tirets | oui | 21 | 100.0 % | 0 |
| RIB · rib-ma-tirets·ar | oui | 1 | 100.0 % | 0 |
| SINISTRE · — |  | 12 | 100.0 % | 0 |
| SIREN · siren-colle | oui | 12 | 100.0 % | 0 |
| SIREN · siren-groupes | oui | 12 | 100.0 % | 0 |
| SIRET · siret-colle | oui | 16 | 100.0 % | 0 |
| SIRET · siret-groupes | oui | 12 | 100.0 % | 0 |
| SOCIETE · casse-titre |  | 57 | 100.0 % | 0 |
| SOCIETE · majuscules |  | 61 | 100.0 % | 0 |
| SOCIETE · societe-forme |  | 62 | 100.0 % | 0 |
| TEL · fr-fixe-0033 | oui | 5 | 100.0 % | 0 |
| TEL · fr-fixe-intl-colle | oui | 10 | 100.0 % | 0 |
| TEL · fr-fixe-intl-espaces | oui | 8 | 100.0 % | 0 |
| TEL · fr-fixe-intl-zero-parenthese | oui | 10 | 100.0 % | 0 |
| TEL · fr-fixe-national-colle | oui | 5 | 100.0 % | 0 |
| TEL · fr-fixe-national-espaces | oui | 10 | 100.0 % | 0 |
| TEL · fr-fixe-national-points | oui | 2 | 100.0 % | 0 |
| TEL · fr-fixe-national-tirets | oui | 4 | 100.0 % | 0 |
| TEL · fr-mobile-0033 | oui | 4 | 100.0 % | 0 |
| TEL · fr-mobile-intl-colle | oui | 6 | 100.0 % | 0 |
| TEL · fr-mobile-intl-espaces | oui | 7 | 100.0 % | 0 |
| TEL · fr-mobile-intl-irregulier | oui | 1 | 100.0 % | 0 |
| TEL · fr-mobile-intl-zero-parenthese | oui | 11 | 100.0 % | 0 |
| TEL · fr-mobile-national-colle | oui | 6 | 100.0 % | 0 |
| TEL · fr-mobile-national-espaces | oui | 5 | 100.0 % | 0 |
| TEL · fr-mobile-national-points | oui | 6 | 100.0 % | 0 |
| TEL · fr-mobile-national-tirets | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-00212 | oui | 6 | 100.0 % | 0 |
| TEL · ma-fixe-00212-colle·ar | oui | 6 | 100.0 % | 0 |
| TEL · ma-fixe-intl-3-6 | oui | 7 | 100.0 % | 0 |
| TEL · ma-fixe-intl-colle | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-intl-espaces | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-intl-espaces·ar | oui | 1 | 100.0 % | 0 |
| TEL · ma-fixe-intl-tirets | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-intl-zero-parenthese | oui | 2 | 100.0 % | 0 |
| TEL · ma-fixe-msisdn-sans-plus | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-national-4-2-2-2 | oui | 7 | 100.0 % | 0 |
| TEL · ma-fixe-national-colle | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-national-colle·ar | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-national-espaces | oui | 13 | 100.0 % | 0 |
| TEL · ma-fixe-national-espaces·ar | oui | 6 | 100.0 % | 0 |
| TEL · ma-fixe-national-points | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-national-tirets | oui | 7 | 100.0 % | 0 |
| TEL · ma-mobile-00212 | oui | 22 | 100.0 % | 0 |
| TEL · ma-mobile-00212-colle·ar | oui | 18 | 100.0 % | 0 |
| TEL · ma-mobile-espaces-irreguliers | oui | 1 | 100.0 % | 0 |
| TEL · ma-mobile-intl-3-6 | oui | 29 | 100.0 % | 0 |
| TEL · ma-mobile-intl-colle | oui | 15 | 100.0 % | 0 |
| TEL · ma-mobile-intl-espaces | oui | 20 | 100.0 % | 0 |
| TEL · ma-mobile-intl-espaces·ar | oui | 16 | 100.0 % | 0 |
| TEL · ma-mobile-intl-tirets | oui | 17 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese | oui | 23 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese-colle | oui | 1 | 100.0 % | 0 |
| TEL · ma-mobile-msisdn-sans-plus | oui | 19 | 100.0 % | 0 |
| TEL · ma-mobile-national-4-2-2-2 | oui | 21 | 100.0 % | 0 |
| TEL · ma-mobile-national-colle | oui | 18 | 100.0 % | 0 |
| TEL · ma-mobile-national-colle·ar | oui | 14 | 100.0 % | 0 |
| TEL · ma-mobile-national-espaces | oui | 18 | 100.0 % | 0 |
| TEL · ma-mobile-national-espaces·ar | oui | 19 | 100.0 % | 0 |
| TEL · ma-mobile-national-points | oui | 12 | 100.0 % | 0 |
| TEL · ma-mobile-national-tirets | oui | 16 | 100.0 % | 0 |
| TEL · ma-mobile-slash | oui | 1 | 100.0 % | 0 |
| TVA · tva-fr-colle |  | 2 | 100.0 % | 0 |
| TVA · tva-fr-groupes |  | 2 | 100.0 % | 0 |

## Par trait (noms)

| Type · trait | Valeurs | Rappel | Partielles |
|---|---:|---:|---:|
| PERSONNE · bilingue | 65 | 100.0 % | 0 |
| PERSONNE · minuscules | 27 | 100.0 % | 0 |
| PERSONNE · nom-avant | 38 | 100.0 % | 0 |
| PERSONNE · nom-majuscules | 81 | 98.8 % | 1 |
| PERSONNE · nom-majuscules-avant | 132 | 100.0 % | 0 |
| PERSONNE · nom-seul | 104 | 99.0 % | 0 |
| PERSONNE · prenom-apostrophe | 46 | 91.3 % | 4 |
| PERSONNE · prenom-compose | 111 | 100.0 % | 0 |
| PERSONNE · prenom-seul | 108 | 99.1 % | 1 |
| PERSONNE · proclitique | 16 | 93.8 % | 1 |
| PERSONNE · sans-hamza | 12 | 100.0 % | 0 |
| PERSONNE · tachkil | 1 | 0.0 % | 1 |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés à tort | Taux |
|---|---:|---:|---:|
| MONTANT — Montant | 591 | 87 | 14.7 % |
| DATE — Date (hors naissance) | 689 | 94 | 13.6 % |
| ARTICLE — Article ou texte de loi | 88 | 35 | 39.8 % |
| SIGLE — Sigle ou terme du lexique | 247 | 65 | 26.3 % |
| MOT — Mot courant qui ressemble à un nom | 398 | 286 | 71.9 % |
| VILLE — Ville | 223 | 46 | 20.6 % |
| PRODUIT — Offre, opérateur, médicament | 150 | 66 | 44.0 % |
| COMPTE — N° de compte comptable | 79 | 0 | 0.0 % |
| MESURE — Durée, quantité, dosage | 114 | 13 | 11.4 % |

## Valeurs manquées ou partielles (97)

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
| core/ficheBilingue/012 | PERSONNE | ar-nasab · tachkil, proclitique | `عُمَر بن سهام المنصوري` | partiel | مَر | oui | CODE |
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
| core/ficheBilingue/001 | NAISSANCE (indirect) | lettres | `14 août 1999` | manque | 14 août 1999 | oui |  |
| core/ficheBilingue/002 | NAISSANCE (indirect) | lettres | `13 octobre 1999` | manque | 13 octobre 1999 | oui |  |
| core/ficheBilingue/003 | NAISSANCE (indirect) | lettres | `10 décembre 2001` | manque | 10 décembre 2001 | oui |  |
| core/ficheBilingue/004 | NAISSANCE (indirect) | jj-mm-aaaa | `03/02/1999` | manque | 03 02 1999 | oui |  |
| core/ficheBilingue/005 | NAISSANCE (indirect) | lettres | `3 août 1984` | manque | 3 août 1984 | oui |  |
| core/ficheBilingue/006 | NAISSANCE (indirect) | lettres | `6 octobre 2000` | manque | 6 octobre 2000 | oui |  |
| core/ficheBilingue/007 | NAISSANCE (indirect) | lettres | `7 juillet 1991` | manque | 7 juillet 1991 | oui |  |
| core/ficheBilingue/008 | NAISSANCE (indirect) | jj-mm-aaaa | `11/09/1998` | manque | 11 09 1998 | oui |  |
| core/ficheBilingue/009 | NAISSANCE (indirect) | lettres | `2 juin 1960` | manque | 2 juin 1960 | oui |  |
| core/ficheBilingue/010 | NAISSANCE (indirect) | lettres | `8 mai 1957` | manque | 8 mai 1957 | oui |  |
| core/ficheBilingue/011 | NAISSANCE (indirect) | jj-mm-aaaa | `10/11/1985` | manque | 10 11 1985 | oui |  |
| core/ficheBilingue/012 | NAISSANCE (indirect) | jj-mm-aaaa | `10/06/1972` | manque | 10 06 1972 | oui |  |
| core/ficheBilingue/013 | NAISSANCE (indirect) | lettres | `7 avril 1987` | manque | 7 avril 1987 | oui |  |
| core/ficheBilingue/014 | NAISSANCE (indirect) | lettres | `12 mars 1986` | manque | 12 mars 1986 | oui |  |
| sante/certificatBilingue/001 | NAISSANCE (indirect) | jj-mm-aaaa | `07/07/1958` | manque | 07 07 1958 | oui |  |
| sante/certificatBilingue/002 | NAISSANCE (indirect) | jj-mm-aaaa | `25/08/1980` | manque | 25 08 1980 | oui |  |
| sante/certificatBilingue/003 | NAISSANCE (indirect) | jj-mm-aaaa | `14/09/2003` | manque | 14 09 2003 | oui |  |
| sante/certificatBilingue/004 | NAISSANCE (indirect) | lettres | `7 décembre 1999` | manque | 7 décembre 1999 | oui |  |
| sante/certificatBilingue/005 | NAISSANCE (indirect) | jj-mm-aaaa | `20/04/2001` | manque | 20 04 2001 | oui |  |
| sante/certificatBilingue/006 | NAISSANCE (indirect) | jj-mm-aaaa | `11/09/1968` | manque | 11 09 1968 | oui |  |
| sante/certificatBilingue/007 | NAISSANCE (indirect) | lettres | `6 mars 1999` | manque | 6 mars 1999 | oui |  |
| sante/certificatBilingue/008 | NAISSANCE (indirect) | jj-mm-aaaa | `06/12/1970` | manque | 06 12 1970 | oui |  |
| sante/certificatBilingue/009 | NAISSANCE (indirect) | jj-mm-aaaa | `11/05/1992` | manque | 11 05 1992 | oui |  |
| sante/certificatBilingue/010 | NAISSANCE (indirect) | lettres | `7 avril 1970` | manque | 7 avril 1970 | oui |  |
| sante/certificatBilingue/011 | NAISSANCE (indirect) | jj-mm-aaaa | `11/05/1981` | manque | 11 05 1981 | oui |  |
| sante/certificatBilingue/012 | NAISSANCE (indirect) | lettres | `12 juin 1982` | manque | 12 juin 1982 | oui |  |
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

## Leurres codés à tort (692)

| Document | Leurre | Valeur | Préfixes |
|---|---|---|---|
| banque-assurance/avisVirementAr/001 | VILLE · ar | `وجدة` | SOCIETE |
| banque-assurance/avisVirementAr/001 | MONTANT · ar | `92541 د.م.` | SOCIETE |
| banque-assurance/avisVirementAr/001 | DATE · ar-lettres-chiffres-arabes | `٣ نونبر ٢٠٢٢` | SOCIETE |
| banque-assurance/avisVirementAr/001 | MOT · arabe | `مبروك` | SOCIETE |
| banque-assurance/avisVirementAr/002 | VILLE · ar | `الدار البيضاء` | SOCIETE |
| banque-assurance/avisVirementAr/002 | MONTANT · ar | `99706 د.م.` | SOCIETE |
| banque-assurance/avisVirementAr/002 | DATE · ar-chiffres-arabes | `١٨/٠٤/٢٠٢٦` | SOCIETE |
| banque-assurance/avisVirementAr/002 | MOT · arabe | `صباح` | SOCIETE |
| banque-assurance/avisVirementAr/003 | VILLE · ar | `طنجة` | SOCIETE |
| banque-assurance/avisVirementAr/003 | MONTANT · ar | `22 049,05 درهم` | SOCIETE |
| banque-assurance/avisVirementAr/003 | DATE · jj-mm-aaaa | `22/09/2021` | SOCIETE |
| banque-assurance/avisVirementAr/003 | MOT · arabe | `مبروك` | SOCIETE |
| banque-assurance/avisVirementAr/004 | VILLE · ar | `مكناس` | SOCIETE |
| banque-assurance/avisVirementAr/004 | MONTANT · ar | `684 د.م.` | SOCIETE |
| banque-assurance/avisVirementAr/004 | DATE · ar-lettres | `12 نونبر 2021` | SOCIETE |
| banque-assurance/avisVirementAr/004 | MOT · arabe | `مبروك` | SOCIETE |
| banque-assurance/avisVirementAr/005 | VILLE · ar | `الدار البيضاء` | SOCIETE |
| banque-assurance/avisVirementAr/005 | MONTANT · ar | `45885 د.م.` | SOCIETE |
| banque-assurance/avisVirementAr/005 | DATE · ar-lettres-chiffres-arabes | `١٠ دجنبر ٢٠٢٢` | SOCIETE |
| banque-assurance/avisVirementAr/005 | MOT · arabe | `السلامة` | SOCIETE |
| banque-assurance/avisVirementAr/006 | VILLE · ar | `مراكش` | SOCIETE |
| banque-assurance/avisVirementAr/006 | MONTANT · ar | `99909 د.م.` | SOCIETE |
| banque-assurance/avisVirementAr/006 | DATE · ar-chiffres-arabes | `١٦/٠٩/٢٠٢١` | SOCIETE |
| banque-assurance/avisVirementAr/006 | MOT · arabe | `مبروك` | SOCIETE |
| banque-assurance/avisVirementAr/007 | VILLE · ar | `الرباط` | SOCIETE |
| banque-assurance/avisVirementAr/007 | MONTANT · ar | `13018 د.م.` | SOCIETE |
| banque-assurance/avisVirementAr/007 | DATE · ar-chiffres-arabes | `٢٣/١٢/٢٠٢٤` | SOCIETE |
| banque-assurance/avisVirementAr/007 | MOT · arabe | `سعيد` | SOCIETE |
| banque-assurance/avisVirementAr/008 | VILLE · ar | `طنجة` | SOCIETE |
| banque-assurance/avisVirementAr/008 | MONTANT · ar-chiffres-arabes | `١٢٣٠٥ درهم` | SOCIETE |
| banque-assurance/avisVirementAr/008 | DATE · jj-mm-aaaa | `02/06/2020` | SOCIETE |
| banque-assurance/avisVirementAr/008 | MOT · arabe | `صباح` | SOCIETE |
| banque-assurance/avisVirementAr/009 | VILLE · ar | `تطوان` | SOCIETE |
| banque-assurance/avisVirementAr/009 | MONTANT · ar | `8 646,80 درهم` | SOCIETE |
| banque-assurance/avisVirementAr/009 | DATE · jj-mm-aaaa | `28/10/2019` | SOCIETE |
| banque-assurance/avisVirementAr/009 | MOT · arabe | `الجميل` | SOCIETE |
| banque-assurance/avisVirementAr/010 | VILLE · ar | `مكناس` | SOCIETE |
| banque-assurance/avisVirementAr/010 | MONTANT · ar-chiffres-arabes | `١٦٣٩٢ درهم` | SOCIETE |
| banque-assurance/avisVirementAr/010 | DATE · ar-lettres-chiffres-arabes | `٢ ماي ٢٠٢٢` | SOCIETE |
| banque-assurance/avisVirementAr/010 | MOT · arabe | `النور` | SOCIETE |
| banque-assurance/avisVirementAr/011 | VILLE · ar | `الرباط` | SOCIETE |
| banque-assurance/avisVirementAr/011 | MONTANT · ar-chiffres-arabes | `٦٧٨٠٦ درهم` | SOCIETE |
| banque-assurance/avisVirementAr/011 | DATE · ar-lettres | `11 ماي 2026` | SOCIETE |
| banque-assurance/avisVirementAr/011 | MOT · arabe | `أمل` | SOCIETE |
| banque-assurance/avisVirementAr/012 | VILLE · ar | `مكناس` | SOCIETE |
| banque-assurance/avisVirementAr/012 | MONTANT · ar-chiffres-arabes | `٥٢٦٤٩ درهم` | SOCIETE |
| banque-assurance/avisVirementAr/012 | DATE · ar-lettres | `19 أبريل 2021` | SOCIETE |
| banque-assurance/avisVirementAr/012 | MOT · arabe | `أمل` | SOCIETE |
| banque-assurance/virement/010 | MOT | `Noël` | PRENOM |
| core/courrierAr/001 | VILLE · ar | `الرباط` | SOCIETE |
| core/courrierAr/001 | DATE · ar-chiffres-arabes | `١٢/٠٢/٢٠٢٤` | SOCIETE |
| core/courrierAr/001 | DATE · ar-lettres-chiffres-arabes | `٢٦ أكتوبر ٢٠٢٦` | SOCIETE |
| core/courrierAr/001 | MONTANT · ar | `63 422,26 درهم` | SOCIETE |
| core/courrierAr/001 | MOT · arabe | `السلامة` | SOCIETE |
| core/courrierAr/002 | VILLE · ar | `طنجة` | SOCIETE |
| core/courrierAr/002 | DATE · jj-mm-aaaa | `18/06/2025` | SOCIETE |
| core/courrierAr/002 | DATE · ar-chiffres-arabes | `١٣/٠٣/٢٠٢٥` | SOCIETE |
| core/courrierAr/002 | MONTANT · ar | `860,03 درهم` | SOCIETE |
| core/courrierAr/002 | MOT · arabe | `صباح` | SOCIETE |
| core/courrierAr/003 | VILLE · ar | `وجدة` | SOCIETE |
| core/courrierAr/003 | DATE · ar-chiffres-arabes | `١٦/٠٨/٢٠١٩` | SOCIETE |
| core/courrierAr/003 | DATE · ar-lettres | `12 يوليوز 2024` | SOCIETE |
| core/courrierAr/003 | MONTANT · ar-chiffres-arabes | `٣٨٣٩ درهم` | SOCIETE |
| core/courrierAr/003 | MOT · arabe | `مبروك` | SOCIETE |
| core/courrierAr/004 | VILLE · ar | `مراكش` | SOCIETE |
| core/courrierAr/004 | DATE · jj-mm-aaaa | `28/10/2024` | SOCIETE |
| core/courrierAr/004 | MONTANT · ar | `44 247,18 درهم` | SOCIETE |
| core/courrierAr/004 | MOT · arabe | `سعيد` | SOCIETE |
| core/courrierAr/005 | VILLE · ar | `تطوان` | SOCIETE |
| core/courrierAr/005 | DATE · ar-lettres-chiffres-arabes | `١٦ غشت ٢٠٢٦` | SOCIETE |
| core/courrierAr/005 | MONTANT · ar | `472 د.م.` | SOCIETE |
| core/courrierAr/005 | MOT · arabe | `كريم` | SOCIETE |
| core/courrierAr/006 | VILLE · ar | `وجدة` | SOCIETE |
| core/courrierAr/006 | DATE · ar-lettres | `19 أبريل 2020` | SOCIETE |
| core/courrierAr/006 | DATE · ar-chiffres-arabes | `٢٦/٠٧/٢٠٢٥` | SOCIETE |
| core/courrierAr/006 | MONTANT · ar | `14 920,25 درهم` | SOCIETE |
| core/courrierAr/006 | MOT · arabe | `صباح` | SOCIETE |
| core/courrierAr/007 | VILLE · ar | `أكادير` | SOCIETE |
| core/courrierAr/007 | DATE · ar-lettres-chiffres-arabes | `٢ أكتوبر ٢٠٢١` | SOCIETE |
| core/courrierAr/007 | DATE · ar-lettres | `7 دجنبر 2023` | SOCIETE |
| core/courrierAr/007 | MONTANT · ar | `71 545,94 درهم` | SOCIETE |
| core/courrierAr/007 | MOT · arabe | `كريم` | SOCIETE |
| core/courrierAr/008 | VILLE · ar | `الرباط` | SOCIETE |
| core/courrierAr/008 | DATE · jj-mm-aaaa | `11/06/2026` | SOCIETE |
| core/courrierAr/008 | DATE · ar-lettres | `26 ماي 2023` | SOCIETE |
| core/courrierAr/008 | MONTANT · ar | `68 016,40 درهم` | SOCIETE |
| core/courrierAr/008 | MOT · arabe | `السلامة` | SOCIETE |
| core/courrierAr/009 | VILLE · ar | `فاس` | SOCIETE |
| core/courrierAr/009 | DATE · jj-mm-aaaa | `08/11/2024` | SOCIETE |
| core/courrierAr/009 | MONTANT · ar-chiffres-arabes | `٩٧٤١٧ درهم` | SOCIETE |
| core/courrierAr/009 | MOT · arabe | `مبروك` | SOCIETE |
| core/courrierAr/010 | VILLE · ar | `الرباط` | SOCIETE |
| core/courrierAr/010 | DATE · ar-lettres-chiffres-arabes | `١٧ غشت ٢٠٢٤` | SOCIETE |
| core/courrierAr/010 | MONTANT · ar | `364,53 درهم` | SOCIETE |
| core/courrierAr/010 | MOT · arabe | `سعيد` | SOCIETE |
| core/courrierAr/011 | VILLE · ar | `وجدة` | SOCIETE |
| core/courrierAr/011 | DATE · ar-lettres | `10 أبريل 2023` | SOCIETE |
| core/courrierAr/011 | MONTANT · ar-chiffres-arabes | `٩٦٣ درهم` | SOCIETE |
| core/courrierAr/011 | MOT · arabe | `النور` | SOCIETE |
| core/courrierAr/012 | VILLE · ar | `فاس` | SOCIETE |
| core/courrierAr/012 | DATE · ar-lettres-chiffres-arabes | `٢٣ أبريل ٢٠٢٦` | SOCIETE |
| core/courrierAr/012 | DATE · ar-lettres | `17 يونيو 2020` | SOCIETE |
| core/courrierAr/012 | MONTANT · ar-chiffres-arabes | `٦٠٣ درهم` | SOCIETE |
| core/courrierAr/012 | MOT · arabe | `النور` | SOCIETE |
| core/courrierAr/013 | VILLE · ar | `فاس` | SOCIETE |
| core/courrierAr/013 | DATE · ar-chiffres-arabes | `٠٥/٠٢/٢٠٢٥` | SOCIETE |
| core/courrierAr/013 | DATE · ar-chiffres-arabes | `١٨/٠٢/٢٠٢٢` | SOCIETE |
| core/courrierAr/013 | MONTANT · ar | `587 د.م.` | SOCIETE |
| core/courrierAr/013 | MOT · arabe | `أمل` | SOCIETE |
| core/courrierAr/014 | VILLE · ar | `طنجة` | SOCIETE |
| core/courrierAr/014 | DATE · jj-mm-aaaa | `04/08/2019` | SOCIETE |
| core/courrierAr/014 | MONTANT · ar | `55 469,95 درهم` | SOCIETE |
| core/courrierAr/014 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/001 | VILLE · ar | `طنجة` | CODE |
| core/ficheBilingue/001 | MOT · arabe | `النور` | SOCIETE |
| core/ficheBilingue/002 | MOT · arabe | `النور` | SOCIETE |
| core/ficheBilingue/003 | MOT · arabe | `صباح` | SOCIETE |
| core/ficheBilingue/004 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/005 | VILLE · ar | `الرباط` | CODE |
| core/ficheBilingue/005 | MOT · arabe | `سعيد` | SOCIETE |
| core/ficheBilingue/006 | VILLE · ar | `وجدة` | CODE |
| core/ficheBilingue/006 | MOT · arabe | `السلامة` | SOCIETE |
| core/ficheBilingue/007 | VILLE · ar | `الرباط` | CODE |
| core/ficheBilingue/007 | MOT · arabe | `سعيد` | SOCIETE |
| core/ficheBilingue/008 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/009 | MOT · arabe | `الجميل` | SOCIETE |
| core/ficheBilingue/010 | MOT · arabe | `النور` | SOCIETE |
| core/ficheBilingue/011 | VILLE · ar | `وجدة` | CODE |
| core/ficheBilingue/011 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/012 | VILLE · ar | `الدار البيضاء` | CODE |
| core/ficheBilingue/012 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/013 | MOT · arabe | `الجميل` | SOCIETE |
| core/ficheBilingue/014 | VILLE · ar | `أكادير` | CODE |
| core/ficheBilingue/014 | MOT · arabe | `مبروك` | SOCIETE |
| core/mailTransfert/010 | MOT | `Noël` | PRENOM |
| core/manuel/arabe-proclitiques | VILLE · ar | `الدار البيضاء` | SOCIETE |
| core/manuel/arabe-proclitiques | DATE · ar-lettres | `3 مارس 2026` | SOCIETE |
| core/manuel/arabe-proclitiques | MONTANT · ar | `1 200,00 درهم` | SOCIETE |
| core/manuel/chiffres-arabes-en-francais | MONTANT · ar-chiffres-arabes | `١٢٥٠ درهم` | CODE |
| core/manuel/sms-darija | MOT · darija | `inchallah` | CODE |
| core/whatsapp/001 | MOT · darija | `bslama` | CODE |
| core/whatsapp/001 | MOT · darija | `3afak` | REF |
| core/whatsapp/001 | MOT · darija | `3afak` | REF |
| core/whatsapp/001 | MOT · darija | `inchallah` | CODE |
| core/whatsapp/001 | MOT · darija | `ghda` | CODE |
| core/whatsapp/001 | MOT · darija | `ghda` | CODE |
| core/whatsapp/001 | MOT · darija | `bslama` | CODE |
| core/whatsapp/001 | MOT · darija | `3afak` | REF |
| core/whatsapp/002 | MOT · darija | `wakha` | CODE |
| core/whatsapp/002 | MOT · darija | `safi` | CODE |
| core/whatsapp/002 | MOT · darija | `3afak` | REF |
| core/whatsapp/002 | MOT · darija | `bslama` | CODE |
| core/whatsapp/002 | MOT · darija | `3afak` | REF |
| core/whatsapp/002 | MOT · darija | `ghda` | CODE |
| core/whatsapp/002 | MOT · darija | `inchallah` | CODE |
| core/whatsapp/002 | MOT · darija | `ghda` | CODE |
| core/whatsapp/003 | MOT · darija | `hamdoullah` | CODE |
| core/whatsapp/003 | MOT · darija | `3afak` | REF |
| core/whatsapp/003 | MOT · darija | `hamdoullah` | CODE |
| core/whatsapp/003 | MOT · darija | `ghda` | CODE |
| core/whatsapp/003 | MOT · darija | `chokran` | CODE |
| core/whatsapp/003 | MOT · darija | `bzaf` | CODE |
| core/whatsapp/004 | MOT · darija | `inchallah` | CODE |
| core/whatsapp/004 | MOT · darija | `ghda` | CODE |
| core/whatsapp/004 | MOT · darija | `3afak` | REF |
| core/whatsapp/004 | MOT · darija | `Mabrouk` | NOM |
| core/whatsapp/004 | MOT · darija | `ghda` | CODE |
| core/whatsapp/004 | MOT · darija | `inchallah` | CODE |
| core/whatsapp/004 | MOT · darija | `ghda` | CODE |
| core/whatsapp/005 | MOT · darija | `Mabrouk` | NOM |
| core/whatsapp/005 | MOT · darija | `3afak` | REF |
| core/whatsapp/005 | MOT · darija | `hamdoullah` | CODE |
| core/whatsapp/005 | MOT · darija | `ghda` | CODE |
| core/whatsapp/005 | MOT · darija | `hamdoullah` | CODE |
| core/whatsapp/006 | MOT · darija | `hamdoullah` | CODE |
| core/whatsapp/006 | MOT · darija | `3afak` | REF |
| core/whatsapp/006 | MOT · darija | `chokran` | CODE |
| core/whatsapp/006 | MOT · darija | `bzaf` | CODE |
| core/whatsapp/006 | MOT · darija | `ghda` | CODE |
| core/whatsapp/006 | MOT · darija | `bslama` | CODE |
| core/whatsapp/006 | MOT · darija | `3afak` | REF |
| core/whatsapp/007 | MOT · darija | `sbah` | CODE |
| core/whatsapp/007 | MOT · darija | `khouya` | CODE |
| core/whatsapp/007 | MOT · darija | `3afak` | REF |
| core/whatsapp/007 | MOT · darija | `chokran` | CODE |
| core/whatsapp/007 | MOT · darija | `bzaf` | CODE |
| core/whatsapp/007 | MOT · darija | `inchallah` | CODE |
| core/whatsapp/007 | MOT · darija | `ghda` | CODE |
| core/whatsapp/008 | MOT · darija | `sbah` | CODE |
| core/whatsapp/008 | MOT · darija | `khouya` | CODE |
| core/whatsapp/008 | MOT · darija | `3afak` | REF |
| core/whatsapp/008 | MOT · darija | `Karim` | PRENOM |
| core/whatsapp/008 | MOT · darija | `daba` | CODE |
| core/whatsapp/008 | MOT · darija | `ghda` | CODE |
| core/whatsapp/008 | MOT · darija | `hamdoullah` | CODE |
| core/whatsapp/009 | MOT · darija | `wakha` | CODE |
| core/whatsapp/009 | MOT · darija | `safi` | CODE |
| core/whatsapp/009 | MOT · darija | `3afak` | REF |
| core/whatsapp/009 | MOT · darija | `inchallah` | CODE |
| core/whatsapp/009 | MOT · darija | `ghda` | CODE |
| core/whatsapp/009 | MOT · darija | `Mabrouk` | NOM |
| core/whatsapp/010 | MOT · darija | `Karim` | PRENOM |
| core/whatsapp/010 | MOT · darija | `daba` | CODE |
| core/whatsapp/010 | MOT · darija | `3afak` | REF |
| core/whatsapp/010 | MOT · darija | `Karim` | PRENOM |
| core/whatsapp/010 | MOT · darija | `daba` | CODE |
| core/whatsapp/010 | MOT · darija | `ghda` | CODE |
| core/whatsapp/010 | MOT · darija | `wakha` | CODE |
| core/whatsapp/010 | MOT · darija | `safi` | CODE |
| core/whatsapp/011 | MOT · darija | `inchallah` | CODE |
| core/whatsapp/011 | MOT · darija | `ghda` | CODE |
| core/whatsapp/011 | MOT · darija | `3afak` | REF |
| core/whatsapp/011 | MOT · darija | `Mabrouk` | NOM |
| core/whatsapp/011 | MOT · darija | `bslama` | CODE |
| core/whatsapp/011 | MOT · darija | `3afak` | REF |
| core/whatsapp/012 | MOT · darija | `Karim` | PRENOM |
| core/whatsapp/012 | MOT · darija | `daba` | CODE |
| core/whatsapp/012 | MOT · darija | `3afak` | REF |
| core/whatsapp/012 | MOT · darija | `wakha` | CODE |
| core/whatsapp/012 | MOT · darija | `safi` | CODE |
| core/whatsapp/012 | MOT · darija | `inchallah` | CODE |
| core/whatsapp/012 | MOT · darija | `ghda` | CODE |
| core/whatsapp/013 | MOT · darija | `hamdoullah` | CODE |
| core/whatsapp/013 | MOT · darija | `3afak` | REF |
| core/whatsapp/013 | MOT · darija | `Karim` | PRENOM |
| core/whatsapp/013 | MOT · darija | `daba` | CODE |
| core/whatsapp/013 | MOT · darija | `bslama` | CODE |
| core/whatsapp/013 | MOT · darija | `3afak` | REF |
| core/whatsapp/014 | MOT · darija | `chokran` | CODE |
| core/whatsapp/014 | MOT · darija | `bzaf` | CODE |
| core/whatsapp/014 | MOT · darija | `3afak` | REF |
| core/whatsapp/014 | MOT · darija | `chokran` | CODE |
| core/whatsapp/014 | MOT · darija | `bzaf` | CODE |
| core/whatsapp/014 | MOT · darija | `wakha` | CODE |
| core/whatsapp/014 | MOT · darija | `safi` | CODE |
| expertise-comptable/grandLivre/002 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/003 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/006 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/010 | SIGLE | `PCGE` | NOM |
| expertise-comptable/lettreMission/010 | MOT | `Noël` | PRENOM |
| juridique-fr/assignation/006 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/assignation/009 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/assignation/011 | ARTICLE · code-fr | `article R. 4624-31` | REF |
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
| juridique-fr/manuel/leurres-seuls | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/noteDossier/001 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/noteDossier/003 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/004 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/004 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/005 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/006 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/noteDossier/012 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| rh-paie/attestation/009 | MOT | `Noël` | PRENOM |
| rh-paie/attestationAr/001 | DATE · ar-chiffres-arabes | `٢٣/٠٦/٢٠٢٣` | SOCIETE |
| rh-paie/attestationAr/001 | SIGLE | `CDI` | SOCIETE |
| rh-paie/attestationAr/001 | MONTANT · ar | `55 031,68 درهم` | SOCIETE |
| rh-paie/attestationAr/001 | MOT · arabe | `سعيد` | SOCIETE |
| rh-paie/attestationAr/001 | VILLE · ar | `تطوان` | SOCIETE |
| rh-paie/attestationAr/001 | DATE · ar-chiffres-arabes | `١٥/٠١/٢٠٢٦` | SOCIETE |
| rh-paie/attestationAr/002 | DATE · jj-mm-aaaa | `24/11/2021` | SOCIETE |
| rh-paie/attestationAr/002 | SIGLE | `CDD` | SOCIETE |
| rh-paie/attestationAr/002 | MONTANT · ar | `642 د.م.` | SOCIETE |
| rh-paie/attestationAr/002 | MOT · arabe | `النور` | SOCIETE |
| rh-paie/attestationAr/002 | VILLE · ar | `الرباط` | SOCIETE |
| rh-paie/attestationAr/002 | DATE · ar-lettres-chiffres-arabes | `٧ دجنبر ٢٠٢٠` | SOCIETE |
| rh-paie/attestationAr/003 | DATE · jj-mm-aaaa | `14/11/2025` | SOCIETE |
| rh-paie/attestationAr/003 | SIGLE | `CDI` | SOCIETE |
| rh-paie/attestationAr/003 | MONTANT · ar | `43651 د.م.` | SOCIETE |
| rh-paie/attestationAr/003 | MOT · arabe | `أمل` | SOCIETE |
| rh-paie/attestationAr/003 | VILLE · ar | `مراكش` | SOCIETE |
| rh-paie/attestationAr/003 | DATE · ar-lettres | `14 أبريل 2021` | SOCIETE |
| rh-paie/attestationAr/004 | DATE · ar-chiffres-arabes | `٢٧/١٢/٢٠٢٦` | SOCIETE |
| rh-paie/attestationAr/004 | SIGLE | `CDD` | SOCIETE |
| rh-paie/attestationAr/004 | MONTANT · ar | `88 065,55 درهم` | SOCIETE |
| rh-paie/attestationAr/004 | MOT · arabe | `النور` | SOCIETE |
| rh-paie/attestationAr/004 | VILLE · ar | `وجدة` | SOCIETE |
| rh-paie/attestationAr/004 | DATE · ar-chiffres-arabes | `١٠/٠٧/٢٠٢١` | SOCIETE |
| rh-paie/attestationAr/005 | DATE · ar-lettres | `25 شتنبر 2025` | SOCIETE |
| rh-paie/attestationAr/005 | SIGLE | `CDI` | SOCIETE |
| rh-paie/attestationAr/005 | MONTANT · ar | `54 474,50 درهم` | SOCIETE |
| rh-paie/attestationAr/005 | MOT · arabe | `الجميل` | SOCIETE |
| rh-paie/attestationAr/005 | VILLE · ar | `مراكش` | SOCIETE |
| rh-paie/attestationAr/005 | DATE · ar-chiffres-arabes | `٢٢/٠٧/٢٠٢٠` | SOCIETE |
| rh-paie/attestationAr/006 | DATE · ar-lettres | `20 يوليوز 2026` | SOCIETE |
| rh-paie/attestationAr/006 | SIGLE | `CDD` | SOCIETE |
| rh-paie/attestationAr/006 | MONTANT · ar | `72 539,30 درهم` | SOCIETE |
| rh-paie/attestationAr/006 | MOT · arabe | `الجميل` | SOCIETE |
| rh-paie/attestationAr/006 | VILLE · ar | `أكادير` | SOCIETE |
| rh-paie/attestationAr/006 | DATE · ar-chiffres-arabes | `٠٥/٠١/٢٠٢٢` | SOCIETE |
| rh-paie/attestationAr/007 | DATE · ar-lettres | `10 أبريل 2023` | SOCIETE |
| rh-paie/attestationAr/007 | SIGLE | `CDI` | SOCIETE |
| rh-paie/attestationAr/007 | MONTANT · ar | `47 139,98 درهم` | SOCIETE |
| rh-paie/attestationAr/007 | MOT · arabe | `كريم` | SOCIETE |
| rh-paie/attestationAr/007 | VILLE · ar | `أكادير` | SOCIETE |
| rh-paie/attestationAr/007 | DATE · ar-lettres-chiffres-arabes | `١٢ مارس ٢٠٢٢` | SOCIETE |
| rh-paie/attestationAr/008 | DATE · ar-chiffres-arabes | `٠٧/٠٥/٢٠٢٢` | SOCIETE |
| rh-paie/attestationAr/008 | SIGLE | `CDI` | SOCIETE |
| rh-paie/attestationAr/008 | MONTANT · ar | `18 734,59 درهم` | SOCIETE |
| rh-paie/attestationAr/008 | MOT · arabe | `صباح` | SOCIETE |
| rh-paie/attestationAr/008 | VILLE · ar | `مراكش` | SOCIETE |
| rh-paie/attestationAr/008 | DATE · ar-chiffres-arabes | `٠٣/١٠/٢٠٢١` | SOCIETE |
| rh-paie/attestationAr/009 | DATE · jj-mm-aaaa | `18/12/2019` | SOCIETE |
| rh-paie/attestationAr/009 | SIGLE | `CDD` | SOCIETE |
| rh-paie/attestationAr/009 | MONTANT · ar-chiffres-arabes | `٤٦٢٤٢ درهم` | SOCIETE |
| rh-paie/attestationAr/009 | MOT · arabe | `مبروك` | SOCIETE |
| rh-paie/attestationAr/009 | VILLE · ar | `أكادير` | SOCIETE |
| rh-paie/attestationAr/009 | DATE · ar-lettres | `13 شتنبر 2023` | SOCIETE |
| rh-paie/attestationAr/010 | DATE · jj-mm-aaaa | `23/07/2025` | SOCIETE |
| rh-paie/attestationAr/010 | SIGLE | `CDI` | SOCIETE |
| rh-paie/attestationAr/010 | MONTANT · ar | `15 058,79 درهم` | SOCIETE |
| rh-paie/attestationAr/010 | MOT · arabe | `صباح` | SOCIETE |
| rh-paie/attestationAr/010 | VILLE · ar | `مكناس` | SOCIETE |
| rh-paie/attestationAr/010 | DATE · ar-lettres-chiffres-arabes | `٢٤ شتنبر ٢٠٢٠` | SOCIETE |
| rh-paie/attestationAr/011 | DATE · ar-lettres-chiffres-arabes | `٧ نونبر ٢٠٢٣` | SOCIETE |
| rh-paie/attestationAr/011 | SIGLE | `CDD` | SOCIETE |
| rh-paie/attestationAr/011 | MONTANT · ar-chiffres-arabes | `٣٦٦٠٠ درهم` | SOCIETE |
| rh-paie/attestationAr/011 | MOT · arabe | `السلامة` | SOCIETE |
| rh-paie/attestationAr/011 | VILLE · ar | `الدار البيضاء` | SOCIETE |
| rh-paie/attestationAr/011 | DATE · jj-mm-aaaa | `03/07/2025` | SOCIETE |
| rh-paie/attestationAr/012 | DATE · ar-lettres | `16 مارس 2022` | SOCIETE |
| rh-paie/attestationAr/012 | SIGLE | `CDD` | SOCIETE |
| rh-paie/attestationAr/012 | MONTANT · ar | `21891 د.م.` | SOCIETE |
| rh-paie/attestationAr/012 | MOT · arabe | `النور` | SOCIETE |
| rh-paie/attestationAr/012 | VILLE · ar | `القنيطرة` | SOCIETE |
| rh-paie/attestationAr/012 | DATE · ar-chiffres-arabes | `٠٧/١١/٢٠٢١` | SOCIETE |
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
| rh-paie/manuel/leurres-paie | SIGLE | `AMO` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `8 450,00 MAD` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `190,97 MAD` | SOCIETE |
| sante/certificatBilingue/001 | DATE · ar-chiffres-arabes | `٠٣/٠٩/٢٠٢٦` | SOCIETE |
| sante/certificatBilingue/001 | MESURE | `10 أيام` | SOCIETE |
| sante/certificatBilingue/001 | PRODUIT | `amoxicilline 1 g` | CODE-004 |
| sante/certificatBilingue/001 | MOT · arabe | `مبروك` | CODE |
| sante/certificatBilingue/002 | DATE · ar-lettres | `11 يناير 2019` | SOCIETE |
| sante/certificatBilingue/002 | MESURE | `10 أيام` | SOCIETE |
| sante/certificatBilingue/002 | PRODUIT | `amoxicilline 1 g` | CODE-004 |
| sante/certificatBilingue/002 | MOT · arabe | `الجميل` | CODE |
| sante/certificatBilingue/003 | DATE · ar-lettres | `8 مارس 2020` | SOCIETE |
| sante/certificatBilingue/003 | MESURE | `10 أيام` | SOCIETE |
| sante/certificatBilingue/003 | MOT · arabe | `الجميل` | CODE |
| sante/certificatBilingue/004 | DATE · jj-mm-aaaa | `27/03/2025` | SOCIETE |
| sante/certificatBilingue/004 | MESURE | `10 أيام` | SOCIETE |
| sante/certificatBilingue/004 | PRODUIT | `amoxicilline 1 g` | CODE-005 |
| sante/certificatBilingue/004 | MOT · arabe | `مبروك` | CODE |
| sante/certificatBilingue/005 | DATE · ar-chiffres-arabes | `٢١/١١/٢٠٢٦` | SOCIETE |
| sante/certificatBilingue/005 | MESURE | `شهر واحد` | SOCIETE |
| sante/certificatBilingue/005 | MOT · arabe | `الجميل` | CODE |
| sante/certificatBilingue/006 | DATE · jj-mm-aaaa | `07/09/2026` | SOCIETE |
| sante/certificatBilingue/006 | MESURE | `10 أيام` | SOCIETE |
| sante/certificatBilingue/006 | PRODUIT | `amoxicilline 1 g` | CODE-004 |
| sante/certificatBilingue/006 | MOT · arabe | `السلامة` | CODE |
| sante/certificatBilingue/007 | DATE · jj-mm-aaaa | `10/05/2019` | SOCIETE |
| sante/certificatBilingue/007 | MESURE | `١٥ يوما` | SOCIETE |
| sante/certificatBilingue/007 | PRODUIT | `amoxicilline 1 g` | CODE-005 |
| sante/certificatBilingue/007 | MOT · arabe | `كريم` | CODE |
| sante/certificatBilingue/008 | DATE · ar-lettres-chiffres-arabes | `٢٦ شتنبر ٢٠٢٠` | SOCIETE |
| sante/certificatBilingue/008 | MESURE | `10 أيام` | SOCIETE |
| sante/certificatBilingue/008 | MOT · arabe | `النور` | CODE |
| sante/certificatBilingue/009 | DATE · ar-lettres-chiffres-arabes | `٢٤ يونيو ٢٠٢٠` | SOCIETE |
| sante/certificatBilingue/009 | MESURE | `شهر واحد` | SOCIETE |
| sante/certificatBilingue/009 | MOT · arabe | `كريم` | CODE |
| sante/certificatBilingue/010 | DATE · ar-chiffres-arabes | `١٦/٠٨/٢٠٢١` | SOCIETE |
| sante/certificatBilingue/010 | MESURE | `شهر واحد` | SOCIETE |
| sante/certificatBilingue/010 | MOT · arabe | `الجميل` | CODE |
| sante/certificatBilingue/011 | DATE · ar-chiffres-arabes | `٢٣/٠٨/٢٠٢٦` | SOCIETE |
| sante/certificatBilingue/011 | MESURE | `١٥ يوما` | SOCIETE |
| sante/certificatBilingue/011 | MOT · arabe | `مبروك` | CODE |
| sante/certificatBilingue/012 | DATE · ar-chiffres-arabes | `٠٥/١١/٢٠٢٠` | SOCIETE |
| sante/certificatBilingue/012 | MESURE | `10 أيام` | SOCIETE |
| sante/certificatBilingue/012 | MOT · arabe | `السلامة` | CODE |
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
| sante/manuel/transmission-orale | PRODUIT | `insuline glargine` | CODE |
| sante/manuel/transmission-orale | MESURE | `12 UI` | NOM |
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
| telecom-ma/manuel/darija-faux-amis | MOT · darija | `karim` | CODE |
| telecom-ma/manuel/darija-faux-amis | MOT · darija | `sa3id` | REF |
| telecom-ma/manuel/darija-faux-amis | MOT · darija | `mabrouk` | CODE |
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
| telecom-ma/smsAr/001 | PRODUIT | `إنوي` | SOCIETE |
| telecom-ma/smsAr/001 | PRODUIT | `تعبئة *3` | SOCIETE |
| telecom-ma/smsAr/001 | DATE · jj-mm-aaaa | `04/01/2021` | SOCIETE |
| telecom-ma/smsAr/001 | DATE · ar-lettres-chiffres-arabes | `١٥ غشت ٢٠٢٣` | SOCIETE |
| telecom-ma/smsAr/001 | MONTANT · ar-chiffres-arabes | `٧٢٦٤٧ درهم` | SOCIETE |
| telecom-ma/smsAr/001 | MOT · arabe | `سعيد` | SOCIETE |
| telecom-ma/smsAr/002 | PRODUIT | `أورونج` | SOCIETE |
| telecom-ma/smsAr/002 | PRODUIT | `الألياف البصرية` | SOCIETE |
| telecom-ma/smsAr/002 | DATE · ar-lettres | `14 فبراير 2023` | SOCIETE |
| telecom-ma/smsAr/002 | DATE · jj-mm-aaaa | `17/03/2021` | SOCIETE |
| telecom-ma/smsAr/002 | MONTANT · ar-chiffres-arabes | `٥٥٤٦٤ درهم` | SOCIETE |
| telecom-ma/smsAr/002 | MOT · arabe | `كريم` | SOCIETE |
| telecom-ma/smsAr/003 | PRODUIT | `اتصالات المغرب` | SOCIETE |
| telecom-ma/smsAr/003 | PRODUIT | `تعبئة *3` | SOCIETE |
| telecom-ma/smsAr/003 | DATE · ar-lettres | `7 يناير 2024` | SOCIETE |
| telecom-ma/smsAr/003 | DATE · ar-lettres | `10 يوليوز 2020` | CODE |
| telecom-ma/smsAr/003 | MONTANT · ar | `503,41 درهم` | CODE |
| telecom-ma/smsAr/003 | MOT · arabe | `الجميل` | SOCIETE |
| telecom-ma/smsAr/004 | PRODUIT | `إنوي` | SOCIETE |
| telecom-ma/smsAr/004 | PRODUIT | `عرض جوال` | SOCIETE |
| telecom-ma/smsAr/004 | DATE · jj-mm-aaaa | `25/11/2024` | SOCIETE |
| telecom-ma/smsAr/004 | MONTANT · ar-chiffres-arabes | `٢٤٧٨١ درهم` | CODE |
| telecom-ma/smsAr/004 | MOT · arabe | `مبروك` | SOCIETE |
| telecom-ma/smsAr/005 | PRODUIT | `أورونج` | SOCIETE |
| telecom-ma/smsAr/005 | PRODUIT | `عرض جوال` | SOCIETE |
| telecom-ma/smsAr/005 | DATE · ar-chiffres-arabes | `٠٦/٠١/٢٠٢١` | SOCIETE |
| telecom-ma/smsAr/005 | DATE · ar-lettres | `21 فبراير 2026` | CODE |
| telecom-ma/smsAr/005 | MONTANT · ar-chiffres-arabes | `٤٨٣٧٢ درهم` | CODE |
| telecom-ma/smsAr/005 | MOT · arabe | `سعيد` | SOCIETE |
| telecom-ma/smsAr/006 | PRODUIT | `إنوي` | SOCIETE |
| telecom-ma/smsAr/006 | PRODUIT | `باقة الإنترنت 10 دراهم` | SOCIETE |
| telecom-ma/smsAr/006 | DATE · ar-lettres-chiffres-arabes | `١ فبراير ٢٠٢١` | SOCIETE |
| telecom-ma/smsAr/006 | DATE · ar-chiffres-arabes | `١٣/١٢/٢٠٢٥` | SOCIETE |
| telecom-ma/smsAr/006 | MONTANT · ar-chiffres-arabes | `١٥٢ درهم` | SOCIETE |
| telecom-ma/smsAr/006 | MOT · arabe | `النور` | SOCIETE |
| telecom-ma/smsAr/007 | PRODUIT | `اتصالات المغرب` | SOCIETE |
| telecom-ma/smsAr/007 | PRODUIT | `عرض جوال` | SOCIETE |
| telecom-ma/smsAr/007 | DATE · ar-lettres-chiffres-arabes | `٢٢ أكتوبر ٢٠١٩` | SOCIETE |
| telecom-ma/smsAr/007 | DATE · ar-lettres-chiffres-arabes | `٢٣ يوليوز ٢٠٢١` | CODE |
| telecom-ma/smsAr/007 | MOT · arabe | `صباح` | SOCIETE |
| telecom-ma/smsAr/008 | PRODUIT | `اتصالات المغرب` | SOCIETE |
| telecom-ma/smsAr/008 | PRODUIT | `تعبئة *3` | SOCIETE |
| telecom-ma/smsAr/008 | DATE · ar-lettres-chiffres-arabes | `٩ شتنبر ٢٠٢١` | SOCIETE |
| telecom-ma/smsAr/008 | DATE · ar-lettres-chiffres-arabes | `٢١ شتنبر ٢٠٢٣` | CODE |
| telecom-ma/smsAr/008 | MONTANT · ar-chiffres-arabes | `٧١٥٥٢ درهم` | CODE |
| telecom-ma/smsAr/008 | MOT · arabe | `كريم` | SOCIETE |
| telecom-ma/smsAr/009 | PRODUIT | `اتصالات المغرب` | SOCIETE |
| telecom-ma/smsAr/009 | PRODUIT | `باقة الإنترنت 10 دراهم` | SOCIETE |
| telecom-ma/smsAr/009 | DATE · jj-mm-aaaa | `06/04/2021` | SOCIETE |
| telecom-ma/smsAr/009 | DATE · jj-mm-aaaa | `13/06/2020` | SOCIETE |
| telecom-ma/smsAr/009 | MONTANT · ar | `5 875,02 درهم` | SOCIETE |
| telecom-ma/smsAr/009 | MOT · arabe | `السلامة` | SOCIETE |
| telecom-ma/smsAr/010 | PRODUIT | `اتصالات المغرب` | SOCIETE |
| telecom-ma/smsAr/010 | PRODUIT | `باقة الإنترنت 10 دراهم` | SOCIETE |
| telecom-ma/smsAr/010 | DATE · ar-lettres-chiffres-arabes | `١٥ ماي ٢٠١٩` | SOCIETE |
| telecom-ma/smsAr/010 | DATE · ar-lettres-chiffres-arabes | `١٩ دجنبر ٢٠٢٥` | CODE |
| telecom-ma/smsAr/010 | MOT · arabe | `الجميل` | SOCIETE |
| telecom-ma/smsAr/011 | PRODUIT | `أورونج` | SOCIETE |
| telecom-ma/smsAr/011 | PRODUIT | `الألياف البصرية` | SOCIETE |
| telecom-ma/smsAr/011 | DATE · jj-mm-aaaa | `14/03/2024` | SOCIETE |
| telecom-ma/smsAr/011 | DATE · jj-mm-aaaa | `15/03/2023` | SOCIETE |
| telecom-ma/smsAr/011 | MONTANT · ar | `39 391,89 درهم` | SOCIETE |
| telecom-ma/smsAr/011 | MOT · arabe | `أمل` | SOCIETE |
| telecom-ma/smsAr/012 | PRODUIT | `إنوي` | SOCIETE |
| telecom-ma/smsAr/012 | PRODUIT | `الألياف البصرية` | SOCIETE |
| telecom-ma/smsAr/012 | DATE · ar-chiffres-arabes | `١٥/٠١/٢٠٢٠` | SOCIETE |
| telecom-ma/smsAr/012 | DATE · ar-lettres-chiffres-arabes | `٤ أبريل ٢٠٢٥` | CODE |
| telecom-ma/smsAr/012 | MOT · arabe | `مبروك` | SOCIETE |
| telecom-ma/ticket/002 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/ticket/005 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/ticket/009 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/ticket/011 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `Karim` | PRENOM |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `daba` | CODE |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `bslama` | CODE |
| telecom-ma/transcriptionDarija/001 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/002 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/002 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/002 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/transcriptionDarija/002 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/002 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/002 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/002 | MOT · darija | `inchallah` | CODE |
| telecom-ma/transcriptionDarija/002 | MOT · darija | `ghda` | CODE |
| telecom-ma/transcriptionDarija/002 | MOT · darija | `hamdoullah` | CODE |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/003 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `Karim` | PRENOM |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `daba` | CODE |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/003 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/004 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `inchallah` | CODE |
| telecom-ma/transcriptionDarija/004 | MOT · darija | `ghda` | CODE |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `sbah` | CODE |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `khouya` | CODE |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/005 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `sbah` | CODE |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `khouya` | CODE |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `chokran` | CODE |
| telecom-ma/transcriptionDarija/006 | MOT · darija | `bzaf` | CODE |
| telecom-ma/transcriptionDarija/007 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/007 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/007 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/007 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/007 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/007 | MOT · darija | `Mabrouk` | NOM |
| telecom-ma/transcriptionDarija/007 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/007 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/008 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/008 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/008 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/transcriptionDarija/008 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/008 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/008 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/008 | MOT · darija | `Karim` | PRENOM |
| telecom-ma/transcriptionDarija/008 | MOT · darija | `daba` | CODE |
| telecom-ma/transcriptionDarija/008 | MOT · darija | `hamdoullah` | CODE |
| telecom-ma/transcriptionDarija/009 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/009 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/009 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/009 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/009 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/009 | MOT · darija | `hamdoullah` | CODE |
| telecom-ma/transcriptionDarija/009 | MOT · darija | `Mabrouk` | NOM |
| telecom-ma/transcriptionDarija/010 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/010 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/010 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/transcriptionDarija/010 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/010 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/010 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/010 | MOT · darija | `bslama` | CODE |
| telecom-ma/transcriptionDarija/010 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/010 | MOT · darija | `Mabrouk` | NOM |
| telecom-ma/transcriptionDarija/011 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/011 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/011 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/011 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/011 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/011 | MOT · darija | `chokran` | CODE |
| telecom-ma/transcriptionDarija/011 | MOT · darija | `bzaf` | CODE |
| telecom-ma/transcriptionDarija/011 | MOT · darija | `hamdoullah` | CODE |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `salam` | CODE |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `3likom` | REF |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `safi` | CODE |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `bslama` | CODE |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `3afak` | REF |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `wakha` | CODE |
| telecom-ma/transcriptionDarija/012 | MOT · darija | `safi` | CODE |

## Codé hors étiquette (1845 passages, 210 distincts — 40 plus fréquents)

Ni une valeur étiquetée, ni un leurre : surtout des mots du gabarit que le verrou ne connaît pas. Sur-coder est sûr, mais rend le texte moins utile à l'IA.

| Passage | Fois |
|---|---:|
| CODE « joignable » | 50 |
| CODE « dyal » | 49 |
| CODE « على » | 40 |
| CODE « ghadi » | 34 |
| CODE « أنا » | 33 |
| CODE « salam » | 27 |
| CODE « mochkil » | 24 |
| CODE « liya » | 23 |
| CODE « ديالي » | 21 |
| CODE « lih » | 20 |
| CODE « بيا » | 20 |
| CODE « تصلو » | 20 |
| NOM « PRLV » | 18 |
| CODE « khassni » | 17 |
| CODE « nchoufou » | 17 |
| CODE « sift » | 17 |
| REF « 3ndi » | 17 |
| NOM « Allah » | 16 |
| CODE « البريد » | 15 |
| CODE « kolchi » | 14 |
| CODE « nta » | 14 |
| CODE « wach » | 14 |
| CODE « الإلكتروني » | 14 |
| CODE « الازدياد » | 14 |
| CODE « الاسم » | 14 |
| CODE « الكامل » | 14 |
| CODE « المدينة » | 14 |
| CODE « الملف » | 14 |
| CODE « بغيت » | 14 |
| CODE « تاريخ » | 14 |
| CODE « فين » | 14 |
| CODE « نعرف » | 14 |
| CODE « وصل » | 14 |
| NOM « TR » | 14 |
| PRENOM « ana » | 14 |
| REF « 3iyet » | 14 |
| REF « 3likom » | 14 |
| REF « n3ayet » | 14 |
| REF « tri9 » | 14 |
| SOCIETE « FICHE CLIENT — بطاقة الزبون » | 14 |
