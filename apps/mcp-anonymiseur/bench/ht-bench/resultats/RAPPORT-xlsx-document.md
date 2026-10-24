# HT-Bench 0.2.0 — rapport de détection, chemin xlsx-document

Moteur Hidden Tokens **v2.22.0** · jeu `393d374e88cb6f29…` (synthétique, graine fixe) · 374 documents · 3380 valeurs à coder · 2579 leurres.

Chemin mesuré : anonymiser_fichier sur un .xlsx en mode document (le même document mis en cellules : « Libellé : valeur », « a | b ») ; on relit les cellules de *-anonymise.xlsx. Une valeur compte comme détectée si toutes ses lettres et chiffres sont sous un code (les particules d'un nom — Ben, El, Aït, de… — peuvent rester en clair). Une valeur codée en partie est une fuite : elle compte comme manquée. Définitions complètes : `bench/ht-bench/README.md`.

**Identifiants directs (noms, pièces et identifiants, téléphones, e-mails, IBAN/RIB, IMEI/IMSI) : 98.1 %** (2607/2658) — cible ≥ 99 % par pack.

## Par pack

| Pack | Docs | Rappel direct | Cible | Rappel (tout) | Précision | F1 | Leurres codés | Texte lisible |
|---|---:|---:|:-:|---:|---:|---:|---:|---:|
| banque-assurance | 49 | 96.8 % (331/342) | ❌ | 97.4 % | 62.2 % | 75.9 % | 115/325 (35.4 %) | 65.1 % |
| core | 91 | 98.6 % (727/737) | ❌ | 95.5 % | 55.1 % | 69.9 % | 186/377 (49.3 %) | 60.2 % |
| expertise-comptable | 37 | 98.3 % (282/287) | ❌ | 98.3 % | 73.4 % | 84.0 % | 132/439 (30.1 %) | 77.5 % |
| juridique-fr | 37 | 97.8 % (270/276) | ❌ | 95.5 % | 85.3 % | 90.1 % | 41/308 (13.3 %) | 90.2 % |
| rh-paie | 49 | 94.7 % (284/300) | ❌ | 95.2 % | 63.8 % | 76.4 % | 163/455 (35.8 %) | 68.1 % |
| sante | 49 | 99.0 % (288/291) | ❌ | 93.3 % | 74.4 % | 82.8 % | 73/292 (25.0 %) | 75.1 % |
| telecom-ma | 62 | 100.0 % (425/425) | ✅ | 100.0 % | 39.1 % | 56.2 % | 195/383 (50.9 %) | 65.2 % |

Texte lisible = part des lettres et chiffres hors de toute valeur étiquetée (le texte du document, leurres compris) restée en clair. Précision du pack = passages codés qui recouvrent une valeur étiquetée / tous les passages codés : le verrou code tout mot inconnu du lexique, un mot courant codé à tort la fait baisser (cf. « Codé hors étiquette »). « ••• » en sortie : passages masqués par le verrou de sortie dans la réponse de coder_texte (souvent un code déjà posé que le motif d'un pack reconnaît à nouveau : l'IA ne peut plus le citer).

## Par langue

| Langue | Docs | Rappel direct | Rappel (tout) | Précision | Leurres codés | Texte lisible |
|---|---:|---:|---:|---:|---:|---:|
| ar — écriture arabe | 52 | 98.5 % (318/323) | 98.6 % | 37.9 % | 243/259 (93.8 %) | 3.6 % |
| darija-latin — darija en lettres latines (arabizi) | 27 | 100.0 % (240/240) | 100.0 % | 30.1 % | 204/273 (74.7 %) | 47.1 % |
| fr — français | 268 | 97.6 % (1808/1853) | 96.3 % | 77.1 % | 395/1955 (20.2 %) | 86.7 % |
| fr-ar — bilingue français / arabe | 27 | 99.6 % (241/242) | 91.2 % | 53.2 % | 63/92 (68.5 %) | 43.5 % |

**Sortie corrompue : 57 document(s)** dont le texte codé n'est plus « l'origine + des codes » (codes imbriqués comme `NOM-001-002`, morceau de mot recodé) — banque-assurance : 1, expertise-comptable : 22, sante : 10, telecom-ma : 24. La valeur est protégée, mais le décodage ne rend pas le texte d'origine. Ces documents sont notés par plus longue sous-suite commune (cf. README).

## Les 10 plus gros écarts (identifiants directs)

| # | Type · écriture | Perdues | Rappel |
|---:|---|---:|---:|
| 1 | NIR · nir-cle-tiret | 17/17 (dont 17 partielles) | 0.0 % |
| 2 | CNSS · cnss-affiliation-7 | 12/25 (dont 0 partielles) | 52.0 % |
| 3 | RIB · rib-ma-groupes·ar | 4/4 (dont 4 partielles) | 0.0 % |
| 4 | PERSONNE · mag-ait-espace | 3/23 (dont 3 partielles) | 87.0 % |
| 5 | PERSONNE · mag-ould | 3/36 (dont 3 partielles) | 91.7 % |
| 6 | RIB · rib-ma-par-4 | 2/11 (dont 2 partielles) | 81.8 % |
| 7 | PERSONNE · fr-particule | 2/35 (dont 1 partielles) | 94.3 % |
| 8 | RIB · rib-ma-tirets·ar | 1/1 (dont 1 partielles) | 0.0 % |
| 9 | PERSONNE · ar-nasab | 1/11 (dont 1 partielles) | 90.9 % |
| 10 | IBAN · iban-fr-par-4 | 1/12 (dont 1 partielles) | 91.7 % |

## Par type d'entité

| Type | Direct | Valeurs | Rappel | Partielles | Précision | F1 | Bon préfixe |
|---|:-:|---:|---:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 1155 | 98.9 % | 12 | 81.5 % (1522/1868) | 89.3 % | 815/1142 |
| CIN — CIN marocaine | oui | 223 | 100.0 % | 0 | 71.2 % (156/219) | 83.2 % | 156/223 |
| NIR — NIR (sécurité sociale, France) | oui | 46 | 63.0 % | 17 | — (0/0) | — | 29/29 |
| CNSS — N° CNSS | oui | 87 | 86.2 % | 0 | 100.0 % (50/50) | 92.6 % | 50/75 |
| ICE — ICE | oui | 98 | 100.0 % | 0 | 99.0 % (98/99) | 99.5 % | 98/98 |
| IF — Identifiant fiscal (IF) | oui | 45 | 100.0 % | 0 | 100.0 % (27/27) | 100.0 % | 27/45 |
| RC — Registre de commerce (RC) | oui | 45 | 100.0 % | 0 | 100.0 % (45/45) | 100.0 % | 45/45 |
| SIREN — SIREN | oui | 24 | 100.0 % | 0 | 3.4 % (24/698) | 6.6 % | 24/24 |
| SIRET — SIRET | oui | 28 | 100.0 % | 0 | — (0/0) | — | 12/28 |
| TEL — Téléphone | oui | 507 | 100.0 % | 0 | 100.0 % (426/426) | 100.0 % | 426/507 |
| EMAIL — E-mail | oui | 224 | 100.0 % | 0 | 100.0 % (224/224) | 100.0 % | 224/224 |
| IBAN — IBAN | oui | 41 | 97.6 % | 1 | 42.1 % (40/95) | 58.8 % | 40/40 |
| RIB — RIB | oui | 66 | 87.9 % | 8 | — (0/0) | — | 55/58 |
| IMEI — IMEI | oui | 50 | 100.0 % | 0 | 100.0 % (25/25) | 100.0 % | 25/50 |
| IMSI — IMSI | oui | 19 | 100.0 % | 0 | 100.0 % (7/7) | 100.0 % | 7/19 |
| BIC — BIC / SWIFT |  | 24 | 100.0 % | 0 | — (0/0) | — | 0/24 |
| ICCID — ICCID (carte SIM) |  | 12 | 100.0 % | 0 | — (0/0) | — | 0/12 |
| ADRESSE — Adresse postale |  | 189 | 96.8 % | 0 | 99.4 % (154/155) | 98.1 % | 150/183 |
| SOCIETE — Société |  | 180 | 98.9 % | 2 | 11.7 % (168/1438) | 20.9 % | 168/178 |
| NAISSANCE — Date de naissance |  | 100 | 48.0 % | 0 | 100.0 % (43/43) | 64.9 % | 43/48 |
| PATENTE — N° de patente |  | 9 | 100.0 % | 0 | 100.0 % (9/9) | 100.0 % | 9/9 |
| TVA — N° de TVA intracommunautaire |  | 4 | 100.0 % | 0 | 100.0 % (4/4) | 100.0 % | 4/4 |
| MATRICULE — Matricule salarié |  | 24 | 95.8 % | 0 | 100.0 % (12/12) | 97.9 % | 12/23 |
| PATIENT — N° de dossier patient / IPP |  | 36 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/36 |
| PRATICIEN — Identifiant praticien (INPE, RPPS) |  | 48 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/48 |
| POLICE — N° de police d'assurance |  | 12 | 100.0 % | 0 | 100.0 % (11/11) | 100.0 % | 11/12 |
| SINISTRE — N° de sinistre |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| FACTURE — N° de facture / pièce |  | 24 | 100.0 % | 0 | 0.0 % (0/4) | 0.0 % | 0/24 |
| RG — N° RG / parquet |  | 48 | 75.0 % | 0 | 100.0 % (24/24) | 85.7 % | 24/36 |

Précision(type) = passages codés sous un préfixe de ce type qui recouvrent bien une valeur de ce type. « Bon préfixe » : parmi les valeurs détectées, celles codées sous un préfixe attendu (une valeur codée REF au lieu de SIRET est protégée, mais mal nommée).

## Rappel direct, pack × type

| Pack | CIN | CNSS | EMAIL | IBAN | ICE | IF | IMEI | IMSI | NIR | PERSONNE | RC | RIB | SIREN | SIRET | TEL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| banque-assurance | 100.0 % (24) |  | 100.0 % (24) | 100.0 % (25) | 100.0 % (12) |  |  |  |  | 97.5 % (163) |  | 84.8 % (46) |  |  | 100.0 % (48) |
| core | 100.0 % (55) | 100.0 % (2) | 100.0 % (92) |  |  |  |  |  | 40.0 % (10) | 99.0 % (397) |  |  |  |  | 100.0 % (181) |
| expertise-comptable | 100.0 % (12) | 100.0 % (13) | 100.0 % (24) | 100.0 % (4) | 100.0 % (45) | 100.0 % (33) |  |  |  | 95.4 % (87) | 100.0 % (33) | 87.5 % (8) |  | 100.0 % (4) | 100.0 % (24) |
| juridique-fr | 100.0 % (12) |  | 100.0 % (24) |  |  |  |  |  | 58.3 % (12) | 99.3 % (144) |  |  | 100.0 % (24) | 100.0 % (12) | 100.0 % (48) |
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
| ADRESSE · fr-rue |  | 28 | 92.9 % | 0 |
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
| MATRICULE · — |  | 24 | 95.8 % | 0 |
| NAISSANCE · jj-mm-aaaa |  | 49 | 49.0 % | 0 |
| NAISSANCE · lettres |  | 51 | 47.1 % | 0 |
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
| PERSONNE · fr-particule | oui | 35 | 94.3 % | 1 |
| PERSONNE · fr-simple | oui | 175 | 100.0 % | 0 |
| PERSONNE · mag-ait-apostrophe | oui | 9 | 100.0 % | 0 |
| PERSONNE · mag-ait-espace | oui | 23 | 87.0 % | 3 |
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
| RG · parquet |  | 12 | 0.0 % | 0 |
| RG · pourvoi |  | 12 | 100.0 % | 0 |
| RG · rg |  | 24 | 100.0 % | 0 |
| RIB · rib-ma-colle | oui | 10 | 100.0 % | 0 |
| RIB · rib-ma-colle·ar | oui | 3 | 100.0 % | 0 |
| RIB · rib-ma-groupes | oui | 16 | 93.8 % | 1 |
| RIB · rib-ma-groupes·ar | oui | 4 | 0.0 % | 4 |
| RIB · rib-ma-par-4 | oui | 11 | 81.8 % | 2 |
| RIB · rib-ma-tirets | oui | 21 | 100.0 % | 0 |
| RIB · rib-ma-tirets·ar | oui | 1 | 0.0 % | 1 |
| SINISTRE · — |  | 12 | 100.0 % | 0 |
| SIREN · siren-colle | oui | 12 | 100.0 % | 0 |
| SIREN · siren-groupes | oui | 12 | 100.0 % | 0 |
| SIRET · siret-colle | oui | 16 | 100.0 % | 0 |
| SIRET · siret-groupes | oui | 12 | 100.0 % | 0 |
| SOCIETE · casse-titre |  | 57 | 100.0 % | 0 |
| SOCIETE · majuscules |  | 61 | 98.4 % | 1 |
| SOCIETE · societe-forme |  | 62 | 98.4 % | 1 |
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
| PERSONNE · prenom-apostrophe | 46 | 89.1 % | 5 |
| PERSONNE · prenom-compose | 111 | 100.0 % | 0 |
| PERSONNE · prenom-seul | 108 | 99.1 % | 1 |
| PERSONNE · proclitique | 16 | 93.8 % | 1 |
| PERSONNE · sans-hamza | 12 | 100.0 % | 0 |
| PERSONNE · tachkil | 1 | 0.0 % | 1 |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés à tort | Taux |
|---|---:|---:|---:|
| MONTANT — Montant | 591 | 314 | 53.1 % |
| DATE — Date (hors naissance) | 689 | 88 | 12.8 % |
| ARTICLE — Article ou texte de loi | 88 | 35 | 39.8 % |
| SIGLE — Sigle ou terme du lexique | 247 | 52 | 21.1 % |
| MOT — Mot courant qui ressemble à un nom | 398 | 286 | 71.9 % |
| VILLE — Ville | 223 | 51 | 22.9 % |
| PRODUIT — Offre, opérateur, médicament | 150 | 66 | 44.0 % |
| COMPTE — N° de compte comptable | 79 | 0 | 0.0 % |
| MESURE — Durée, quantité, dosage | 114 | 13 | 11.4 % |

## Valeurs manquées ou partielles (124)

| Document | Type | Écriture | Valeur (synthétique) | Statut | Resté en clair | Vu par l'IA | Préfixes posés |
|---|---|---|---|---|---|:-:|---|
| rh-paie/bulletinMa/001 | CNSS | cnss-affiliation-7 | `7456193` | manque | 7456193 | — |  |
| rh-paie/bulletinMa/002 | CNSS | cnss-affiliation-7 | `1590991` | manque | 1590991 | — |  |
| rh-paie/bulletinMa/003 | CNSS | cnss-affiliation-7 | `8710871` | manque | 8710871 | — |  |
| rh-paie/bulletinMa/004 | CNSS | cnss-affiliation-7 | `9135145` | manque | 9135145 | — |  |
| rh-paie/bulletinMa/005 | CNSS | cnss-affiliation-7 | `2140584` | manque | 2140584 | — |  |
| rh-paie/bulletinMa/006 | CNSS | cnss-affiliation-7 | `8806146` | manque | 8806146 | — |  |
| rh-paie/bulletinMa/007 | CNSS | cnss-affiliation-7 | `5398685` | manque | 5398685 | — |  |
| rh-paie/bulletinMa/008 | CNSS | cnss-affiliation-7 | `1843021` | manque | 1843021 | — |  |
| rh-paie/bulletinMa/009 | CNSS | cnss-affiliation-7 | `1856059` | manque | 1856059 | — |  |
| rh-paie/bulletinMa/010 | CNSS | cnss-affiliation-7 | `4295445` | manque | 4295445 | — |  |
| rh-paie/bulletinMa/011 | CNSS | cnss-affiliation-7 | `7501593` | manque | 7501593 | — |  |
| rh-paie/bulletinMa/012 | CNSS | cnss-affiliation-7 | `8109948` | manque | 8109948 | — |  |
| rh-paie/bulletinFr/001 | IBAN | iban-fr-par-4 | `FR76 2245 1259 3502 5177 5787 675` | partiel | 5787 675 | — | REF, CARTE |
| core/courrier/003 | NIR | nir-cle-tiret | `1 68 07 94 443 898 - 83` | partiel | 83 | — | CIN |
| core/courrier/010 | NIR | nir-cle-tiret | `2 75 09 2A 724 241 - 85` | partiel | 85 | — | CIN |
| core/courrier/011 | NIR | nir-cle-tiret | `1 56 11 13 135 111 - 48` | partiel | 48 | — | CIN |
| core/courrier/012 | NIR | nir-cle-tiret | `1 47 12 31 177 146 - 82` | partiel | 82 | — | CIN |
| core/courrier/013 | NIR | nir-cle-tiret | `1 06 11 75 696 892 - 91` | partiel | 91 | — | CIN |
| core/courrier/014 | NIR | nir-cle-tiret | `2 10 08 13 249 802 - 33` | partiel | 33 | — | CIN |
| juridique-fr/assignation/003 | NIR | nir-cle-tiret | `1 00 06 31 924 607 - 79` | partiel | 79 | — | CIN |
| juridique-fr/assignation/004 | NIR | nir-cle-tiret | `2 90 07 2B 561 069 - 42` | partiel | 42 | — | CIN |
| juridique-fr/assignation/005 | NIR | nir-cle-tiret | `1 25 03 31 794 881 - 07` | partiel | 07 | — | CIN |
| juridique-fr/assignation/011 | NIR | nir-cle-tiret | `1 65 02 2B 075 554 - 06` | partiel | 06 | — | CIN |
| juridique-fr/assignation/012 | NIR | nir-cle-tiret | `2 20 01 2A 954 424 - 31` | partiel | 31 | — | CIN |
| rh-paie/bulletinFr/004 | NIR | nir-cle-tiret | `1 97 02 67 473 063 - 22` | partiel | 22 | — | CIN |
| rh-paie/bulletinFr/010 | NIR | nir-cle-tiret | `1 75 07 67 244 439 - 11` | partiel | 11 | — | CIN |
| rh-paie/bulletinFr/011 | NIR | nir-cle-tiret | `1 49 04 31 392 783 - 44` | partiel | 44 | — | CIN |
| sante/lettreLiaison/005 | NIR | nir-cle-tiret | `2 14 12 99 789 906 - 93` | partiel | 93 | — | CIN |
| sante/lettreLiaison/006 | NIR | nir-cle-tiret | `2 42 07 94 077 945 - 18` | partiel | 18 | — | CIN |
| sante/lettreLiaison/009 | NIR | nir-cle-tiret | `2 62 09 94 388 520 - 59` | partiel | 59 | — | CIN |
| banque-assurance/releve/003 | PERSONNE | mag-ben-espace · prenom-apostrophe | `Ma'ati Ben Chekroun` | partiel | Ma | — | CODE, NOM |
| banque-assurance/releve/006 | PERSONNE | mag-ould | `Nesrine Ould Bah` | partiel | Bah | — | PRENOM |
| banque-assurance/releve/011 | PERSONNE | mag-double · prenom-apostrophe, nom-majuscules | `Ma'ati IDRISSI KAITOUNI` | partiel | Ma | — | CODE, NOM |
| banque-assurance/sinistre/001 | PERSONNE | mag-simple | `Cheikh Saidi` | partiel | Cheikh | — | NOM |
| core/ficheBilingue/012 | PERSONNE | ar-nasab · tachkil, proclitique | `عُمَر بن سهام المنصوري` | partiel | مَر | — | CODE |
| core/mailTransfert/013 | PERSONNE | mag-ait-espace · prenom-apostrophe | `R'kia Ait Taleb` | partiel | R | — | CODE, NOM |
| core/mailTransfert/013 | PERSONNE | mag-ait-espace · prenom-seul | `R'kia` | partiel | R | — | CODE |
| core/mailTransfert/013 | PERSONNE | mag-ait-espace · prenom-apostrophe | `R'kia Ait Taleb` | partiel | R | — | CODE, NOM |
| expertise-comptable/grandLivre/001 | PERSONNE | mag-ould | `Rachida Ould Bah` | partiel | Bah | — | NOM-001 |
| expertise-comptable/grandLivre/002 | PERSONNE | mag-el-espace · prenom-apostrophe | `Ma'ati El Moussaoui` | partiel | Ma | — | CODE, NOM |
| expertise-comptable/grandLivre/007 | PERSONNE | mag-ould | `Mehdi Ould Bah` | partiel | Bah | — | PRENOM |
| expertise-comptable/grandLivre/009 | PERSONNE | fr-particule | `Sophie Le Roux` | partiel | Roux | — | PRENOM |
| juridique-fr/conclusions/005 | PERSONNE | fr-particule · nom-seul | `de La Fontaine` | manque | Fontaine | — |  |
| banque-assurance/avisVirementAr/001 | RIB | rib-ma-groupes·ar | `٣٥٠ ٨١٠ ٤٣٢٦٧٣١٤١٦٥٠٨٤٩٧ ٣١` | partiel | ٣٥٠ ٨١٠ ٣١ | — | REF |
| banque-assurance/avisVirementAr/002 | RIB | rib-ma-groupes·ar | `١٤٥ ٧٧٨ ٨٨٤١٥٤٣٨١٦٣٥٦٠٨٦ ٨٩` | partiel | ١٤٥ ٧٧٨ ٨٩ | — | REF |
| banque-assurance/avisVirementAr/009 | RIB | rib-ma-groupes·ar | `٢٣٠ ٧٨٩ ٥٣٠٨١٥٨٤٤٠١٢٧٠٧٣ ٢٣` | partiel | ٢٣٠ ٧٨٩ ٢٣ | — | REF |
| banque-assurance/avisVirementAr/010 | RIB | rib-ma-tirets·ar | `٢٣٠-٠١٠-٣٣٩٢٦٠٢٧٤٢١٧٨٨١٩-٤٠` | partiel | ٤٠ | — | REF-002-REF |
| banque-assurance/avisVirementAr/012 | RIB | rib-ma-groupes·ar | `٠٠٧ ٣٤٩ ١٨٦٩٨٩٤٧٨٣٣٤٥٩٤٦ ٥٩` | partiel | ٠٠٧ ٣٤٩ ٥٩ | — | REF |
| banque-assurance/virement/003 | RIB | rib-ma-par-4 | `3509 6618 2146 6793 3256 3429` | partiel | 3256 3429 | — | CARTE |
| banque-assurance/virement/012 | RIB | rib-ma-groupes | `007 224 4161941191840505 25` | partiel | 007 25 | — | CARTE |
| expertise-comptable/facture/010 | RIB | rib-ma-par-4 | `0117 2663 0845 1886 7116 7673` | partiel | 7116 7673 | — | CARTE |
| juridique-fr/conclusions/011 | ADRESSE (indirect) | fr-batiment | `Bâtiment C, 27 quai de la Fosse` | manque | Fosse | — | NOM, PRENOM |
| rh-paie/bulletinFr/005 | ADRESSE (indirect) | fr-rue | `49 quai de la Fosse` | manque | Fosse | — |  |
| rh-paie/bulletinFr/009 | ADRESSE (indirect) | fr-batiment | `Bâtiment B, 90 quai de la Fosse` | manque | Fosse | — |  |
| sante/lettreLiaison/001 | ADRESSE (indirect) | fr-bis | `31 bis rue de la République` | manque | République | — |  |
| sante/lettreLiaison/003 | ADRESSE (indirect) | fr-rue | `71 quai de la Fosse` | manque | Fosse | — |  |
| sante/lettreLiaison/007 | ADRESSE (indirect) | fr-batiment | `Bâtiment C, 5 rue de la République` | manque | République | — | NOM, PRENOM |
| rh-paie/bulletinMa/003 | MATRICULE (indirect) |  | `16908` | manque | 16908 | — |  |
| core/fiche/001 | NAISSANCE (indirect) | jj-mm-aaaa | `25/03/1976` | manque | 25 03 1976 | — |  |
| core/fiche/002 | NAISSANCE (indirect) | lettres | `10 novembre 1955` | manque | 10 novembre 1955 | — |  |
| core/fiche/003 | NAISSANCE (indirect) | jj-mm-aaaa | `12/05/2003` | manque | 12 05 2003 | — |  |
| core/fiche/004 | NAISSANCE (indirect) | jj-mm-aaaa | `22/08/1962` | manque | 22 08 1962 | — |  |
| core/fiche/005 | NAISSANCE (indirect) | jj-mm-aaaa | `10/06/1982` | manque | 10 06 1982 | — |  |
| core/fiche/006 | NAISSANCE (indirect) | jj-mm-aaaa | `28/09/1970` | manque | 28 09 1970 | — |  |
| core/fiche/007 | NAISSANCE (indirect) | lettres | `26 juin 1970` | manque | 26 juin 1970 | — |  |
| core/fiche/008 | NAISSANCE (indirect) | lettres | `10 juin 1956` | manque | 10 juin 1956 | — |  |
| core/fiche/009 | NAISSANCE (indirect) | lettres | `16 juin 1988` | manque | 16 juin 1988 | — |  |
| core/fiche/010 | NAISSANCE (indirect) | lettres | `8 janvier 1986` | manque | 8 janvier 1986 | — |  |
| core/fiche/011 | NAISSANCE (indirect) | lettres | `8 août 1997` | manque | 8 août 1997 | — |  |
| core/fiche/012 | NAISSANCE (indirect) | jj-mm-aaaa | `01/10/1975` | manque | 01 10 1975 | — |  |
| core/fiche/013 | NAISSANCE (indirect) | jj-mm-aaaa | `10/07/1998` | manque | 10 07 1998 | — |  |
| core/fiche/014 | NAISSANCE (indirect) | jj-mm-aaaa | `02/06/1973` | manque | 02 06 1973 | — |  |
| core/ficheBilingue/001 | NAISSANCE (indirect) | lettres | `14 août 1999` | manque | 14 août 1999 | — |  |
| core/ficheBilingue/002 | NAISSANCE (indirect) | lettres | `13 octobre 1999` | manque | 13 octobre 1999 | — |  |
| core/ficheBilingue/003 | NAISSANCE (indirect) | lettres | `10 décembre 2001` | manque | 10 décembre 2001 | — |  |
| core/ficheBilingue/004 | NAISSANCE (indirect) | jj-mm-aaaa | `03/02/1999` | manque | 03 02 1999 | — |  |
| core/ficheBilingue/005 | NAISSANCE (indirect) | lettres | `3 août 1984` | manque | 3 août 1984 | — |  |
| core/ficheBilingue/006 | NAISSANCE (indirect) | lettres | `6 octobre 2000` | manque | 6 octobre 2000 | — |  |
| core/ficheBilingue/007 | NAISSANCE (indirect) | lettres | `7 juillet 1991` | manque | 7 juillet 1991 | — |  |
| core/ficheBilingue/008 | NAISSANCE (indirect) | jj-mm-aaaa | `11/09/1998` | manque | 11 09 1998 | — |  |
| core/ficheBilingue/009 | NAISSANCE (indirect) | lettres | `2 juin 1960` | manque | 2 juin 1960 | — |  |
| core/ficheBilingue/010 | NAISSANCE (indirect) | lettres | `8 mai 1957` | manque | 8 mai 1957 | — |  |
| core/ficheBilingue/011 | NAISSANCE (indirect) | jj-mm-aaaa | `10/11/1985` | manque | 10 11 1985 | — |  |
| core/ficheBilingue/012 | NAISSANCE (indirect) | jj-mm-aaaa | `10/06/1972` | manque | 10 06 1972 | — |  |
| core/ficheBilingue/013 | NAISSANCE (indirect) | lettres | `7 avril 1987` | manque | 7 avril 1987 | — |  |
| core/ficheBilingue/014 | NAISSANCE (indirect) | lettres | `12 mars 1986` | manque | 12 mars 1986 | — |  |
| sante/certificatBilingue/001 | NAISSANCE (indirect) | jj-mm-aaaa | `07/07/1958` | manque | 07 07 1958 | — |  |
| sante/certificatBilingue/002 | NAISSANCE (indirect) | jj-mm-aaaa | `25/08/1980` | manque | 25 08 1980 | — |  |
| sante/certificatBilingue/003 | NAISSANCE (indirect) | jj-mm-aaaa | `14/09/2003` | manque | 14 09 2003 | — |  |
| sante/certificatBilingue/004 | NAISSANCE (indirect) | lettres | `7 décembre 1999` | manque | 7 décembre 1999 | — |  |
| sante/certificatBilingue/005 | NAISSANCE (indirect) | jj-mm-aaaa | `20/04/2001` | manque | 20 04 2001 | — |  |
| sante/certificatBilingue/006 | NAISSANCE (indirect) | jj-mm-aaaa | `11/09/1968` | manque | 11 09 1968 | — |  |
| sante/certificatBilingue/007 | NAISSANCE (indirect) | lettres | `6 mars 1999` | manque | 6 mars 1999 | — |  |
| sante/certificatBilingue/008 | NAISSANCE (indirect) | jj-mm-aaaa | `06/12/1970` | manque | 06 12 1970 | — |  |
| sante/certificatBilingue/009 | NAISSANCE (indirect) | jj-mm-aaaa | `11/05/1992` | manque | 11 05 1992 | — |  |
| sante/certificatBilingue/010 | NAISSANCE (indirect) | lettres | `7 avril 1970` | manque | 7 avril 1970 | — |  |
| sante/certificatBilingue/011 | NAISSANCE (indirect) | jj-mm-aaaa | `11/05/1981` | manque | 11 05 1981 | — |  |
| sante/certificatBilingue/012 | NAISSANCE (indirect) | lettres | `12 juin 1982` | manque | 12 juin 1982 | — |  |
| sante/compteRendu/001 | NAISSANCE (indirect) | lettres | `25 mai 2004` | manque | 25 mai 2004 | — |  |
| sante/compteRendu/002 | NAISSANCE (indirect) | jj-mm-aaaa | `03/03/1982` | manque | 03 03 1982 | — |  |
| sante/compteRendu/003 | NAISSANCE (indirect) | lettres | `27 août 1988` | manque | 27 août 1988 | — |  |
| sante/compteRendu/004 | NAISSANCE (indirect) | jj-mm-aaaa | `18/12/1967` | manque | 18 12 1967 | — |  |
| sante/compteRendu/005 | NAISSANCE (indirect) | lettres | `25 mars 1957` | manque | 25 mars 1957 | — |  |
| sante/compteRendu/006 | NAISSANCE (indirect) | lettres | `25 octobre 1957` | manque | 25 octobre 1957 | — |  |
| sante/compteRendu/007 | NAISSANCE (indirect) | lettres | `13 juin 1992` | manque | 13 juin 1992 | — |  |
| sante/compteRendu/008 | NAISSANCE (indirect) | lettres | `19 juin 1985` | manque | 19 juin 1985 | — |  |
| sante/compteRendu/009 | NAISSANCE (indirect) | jj-mm-aaaa | `16/11/1974` | manque | 16 11 1974 | — |  |
| sante/compteRendu/010 | NAISSANCE (indirect) | jj-mm-aaaa | `03/12/1981` | manque | 03 12 1981 | — |  |
| sante/compteRendu/011 | NAISSANCE (indirect) | lettres | `12 avril 1996` | manque | 12 avril 1996 | — |  |
| sante/compteRendu/012 | NAISSANCE (indirect) | jj-mm-aaaa | `25/10/2000` | manque | 25 10 2000 | — |  |
| juridique-fr/assignation/001 | RG (indirect) | parquet | `46 053 291526` | manque | 46 053 291526 | — |  |
| juridique-fr/assignation/002 | RG (indirect) | parquet | `75 065 772226` | manque | 75 065 772226 | — |  |
| juridique-fr/assignation/003 | RG (indirect) | parquet | `67 720 913239` | manque | 67 720 913239 | — |  |
| juridique-fr/assignation/004 | RG (indirect) | parquet | `55 415 812452` | manque | 55 415 812452 | — |  |
| juridique-fr/assignation/005 | RG (indirect) | parquet | `94 189 892544` | manque | 94 189 892544 | — |  |
| juridique-fr/assignation/006 | RG (indirect) | parquet | `36 871 810130` | manque | 36 871 810130 | — |  |
| juridique-fr/assignation/007 | RG (indirect) | parquet | `52 592 285565` | manque | 52 592 285565 | — |  |
| juridique-fr/assignation/008 | RG (indirect) | parquet | `36 792 314207` | manque | 36 792 314207 | — |  |
| juridique-fr/assignation/009 | RG (indirect) | parquet | `22 816 641856` | manque | 22 816 641856 | — |  |
| juridique-fr/assignation/010 | RG (indirect) | parquet | `60 673 937846` | manque | 60 673 937846 | — |  |
| juridique-fr/assignation/011 | RG (indirect) | parquet | `48 465 156977` | manque | 48 465 156977 | — |  |
| juridique-fr/assignation/012 | RG (indirect) | parquet | `02 099 986674` | manque | 02 099 986674 | — |  |
| expertise-comptable/grandLivre/001 | SOCIETE (indirect) | majuscules | `ALPHA TEXTILE SARL AU` | partiel | TE L R | — | NOM, ? |
| expertise-comptable/grandLivre/001 | SOCIETE (indirect) | societe-forme | `Société Tingis Immobilier SARL AU` | partiel | T L | — | NOM, ? |

## Leurres codés à tort (905)

| Document | Leurre | Valeur | Préfixes |
|---|---|---|---|
| banque-assurance/avisVirementAr/001 | VILLE · ar | `وجدة` | SOCIETE |
| banque-assurance/avisVirementAr/001 | DATE · ar-lettres-chiffres-arabes | `٣ نونبر ٢٠٢٢` | SOCIETE |
| banque-assurance/avisVirementAr/001 | MOT · arabe | `مبروك` | SOCIETE |
| banque-assurance/avisVirementAr/002 | VILLE · ar | `الدار البيضاء` | SOCIETE |
| banque-assurance/avisVirementAr/002 | MOT · arabe | `صباح` | SOCIETE |
| banque-assurance/avisVirementAr/003 | VILLE · ar | `طنجة` | SOCIETE |
| banque-assurance/avisVirementAr/003 | MONTANT · ar | `22 049,05 درهم` | SOCIETE |
| banque-assurance/avisVirementAr/003 | MOT · arabe | `مبروك` | SOCIETE |
| banque-assurance/avisVirementAr/004 | VILLE · ar | `مكناس` | SOCIETE |
| banque-assurance/avisVirementAr/004 | DATE · ar-lettres | `12 نونبر 2021` | SOCIETE |
| banque-assurance/avisVirementAr/004 | MOT · arabe | `مبروك` | SOCIETE |
| banque-assurance/avisVirementAr/005 | VILLE · ar | `الدار البيضاء` | SOCIETE |
| banque-assurance/avisVirementAr/005 | DATE · ar-lettres-chiffres-arabes | `١٠ دجنبر ٢٠٢٢` | SOCIETE |
| banque-assurance/avisVirementAr/005 | MOT · arabe | `السلامة` | SOCIETE |
| banque-assurance/avisVirementAr/006 | VILLE · ar | `مراكش` | SOCIETE |
| banque-assurance/avisVirementAr/006 | MOT · arabe | `مبروك` | SOCIETE |
| banque-assurance/avisVirementAr/007 | VILLE · ar | `الرباط` | SOCIETE |
| banque-assurance/avisVirementAr/007 | MOT · arabe | `سعيد` | SOCIETE |
| banque-assurance/avisVirementAr/008 | VILLE · ar | `طنجة` | SOCIETE |
| banque-assurance/avisVirementAr/008 | MONTANT · ar-chiffres-arabes | `١٢٣٠٥ درهم` | SOCIETE |
| banque-assurance/avisVirementAr/008 | MOT · arabe | `صباح` | SOCIETE |
| banque-assurance/avisVirementAr/009 | VILLE · ar | `تطوان` | SOCIETE |
| banque-assurance/avisVirementAr/009 | MONTANT · ar | `8 646,80 درهم` | SOCIETE |
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
| banque-assurance/releve/001 | MONTANT · milliers | `7.184 MAD` | SOCIETE |
| banque-assurance/releve/001 | MONTANT · centaines | `891,86 MAD` | SOCIETE |
| banque-assurance/releve/001 | MONTANT · centaines | `863,76 MAD` | SOCIETE |
| banque-assurance/releve/001 | MONTANT · centaines | `220,37 MAD` | SOCIETE |
| banque-assurance/releve/001 | MONTANT · grand | `8 917 897,26 MAD` | SOCIETE |
| banque-assurance/releve/002 | MONTANT · milliers | `86 702 MAD` | SOCIETE |
| banque-assurance/releve/002 | MONTANT · grand | `3 117 971 MAD` | SOCIETE |
| banque-assurance/releve/002 | MONTANT · milliers | `90.581,14 MAD` | SOCIETE |
| banque-assurance/releve/002 | MONTANT · grand | `8 778 940,92 MAD` | SOCIETE |
| banque-assurance/releve/002 | MONTANT · milliers | `15 477,86 MAD` | SOCIETE |
| banque-assurance/releve/003 | MONTANT · milliers | `43.296,56 EUR` | SOCIETE |
| banque-assurance/releve/003 | MONTANT · centaines | `748,18 EUR` | SOCIETE |
| banque-assurance/releve/003 | MONTANT · centaines | `713,64 EUR` | SOCIETE |
| banque-assurance/releve/003 | MONTANT · milliers | `91 932,93 EUR` | SOCIETE |
| banque-assurance/releve/003 | MONTANT · milliers | `38 533,99 EUR` | SOCIETE |
| banque-assurance/releve/003 | MONTANT · centaines | `826 EUR` | SOCIETE |
| banque-assurance/releve/003 | MONTANT · centaines | `183 EUR` | SOCIETE |
| banque-assurance/releve/004 | MONTANT · grand | `7 301 683 MAD` | SOCIETE |
| banque-assurance/releve/004 | MONTANT · milliers | `21 409,08 MAD` | SOCIETE |
| banque-assurance/releve/004 | MONTANT · centaines | `605 MAD` | SOCIETE |
| banque-assurance/releve/004 | MONTANT · milliers | `32.832,21 MAD` | SOCIETE |
| banque-assurance/releve/004 | MONTANT · milliers | `50 125,26 MAD` | SOCIETE |
| banque-assurance/releve/004 | MONTANT · grand | `7 187 591 MAD` | SOCIETE |
| banque-assurance/releve/004 | MONTANT · grand | `8.467.338,24 MAD` | SOCIETE |
| banque-assurance/releve/005 | MONTANT · milliers | `49 977,34 MAD` | SOCIETE |
| banque-assurance/releve/005 | MONTANT · milliers | `45 911,12 MAD` | SOCIETE |
| banque-assurance/releve/005 | MONTANT · centaines | `765,35 MAD` | SOCIETE |
| banque-assurance/releve/005 | MONTANT · centaines | `331,16 MAD` | SOCIETE |
| banque-assurance/releve/006 | MONTANT · grand | `6.337.389 MAD` | SOCIETE |
| banque-assurance/releve/006 | MONTANT · milliers | `49 204 MAD` | SOCIETE |
| banque-assurance/releve/006 | MONTANT · grand | `4 805 043,79 MAD` | SOCIETE |
| banque-assurance/releve/006 | MONTANT · grand | `5 845 840,01 MAD` | SOCIETE |
| banque-assurance/releve/006 | MONTANT · milliers | `40 204 MAD` | SOCIETE |
| banque-assurance/releve/006 | MONTANT · centaines | `738 MAD` | SOCIETE |
| banque-assurance/releve/007 | MONTANT · centaines | `823 MAD` | SOCIETE |
| banque-assurance/releve/007 | MONTANT · milliers | `82 244 MAD` | SOCIETE |
| banque-assurance/releve/007 | MONTANT · milliers | `46.649 MAD` | SOCIETE |
| banque-assurance/releve/007 | MONTANT · grand | `6 560 156 MAD` | SOCIETE |
| banque-assurance/releve/007 | MONTANT · centaines | `932 MAD` | SOCIETE |
| banque-assurance/releve/007 | MONTANT · centaines | `600,51 MAD` | SOCIETE |
| banque-assurance/releve/007 | MONTANT · grand | `6 537 695 MAD` | SOCIETE |
| banque-assurance/releve/008 | MONTANT · milliers | `48 929,49 EUR` | SOCIETE |
| banque-assurance/releve/008 | MONTANT · milliers | `7 730,90 EUR` | SOCIETE |
| banque-assurance/releve/008 | MONTANT · milliers | `41 610 EUR` | SOCIETE |
| banque-assurance/releve/008 | MONTANT · milliers | `2.938,26 EUR` | SOCIETE |
| banque-assurance/releve/008 | MONTANT · milliers | `94 617,22 EUR` | SOCIETE |
| banque-assurance/releve/009 | MONTANT · centaines | `598 EUR` | SOCIETE |
| banque-assurance/releve/009 | MONTANT · milliers | `89.278,40 EUR` | SOCIETE |
| banque-assurance/releve/009 | MONTANT · grand | `8 188 957 EUR` | SOCIETE |
| banque-assurance/releve/009 | MONTANT · grand | `7 883 958 EUR` | SOCIETE |
| banque-assurance/releve/009 | MONTANT · centaines | `387,66 EUR` | SOCIETE |
| banque-assurance/releve/010 | MONTANT · milliers | `33.670 MAD` | SOCIETE |
| banque-assurance/releve/010 | MONTANT · centaines | `457,32 MAD` | SOCIETE |
| banque-assurance/releve/010 | MONTANT · grand | `2 874 896,68 MAD` | SOCIETE |
| banque-assurance/releve/010 | MONTANT · centaines | `967 MAD` | SOCIETE |
| banque-assurance/releve/011 | MONTANT · grand | `5.522.434,97 MAD` | SOCIETE |
| banque-assurance/releve/011 | MONTANT · grand | `8 909 839 MAD` | SOCIETE |
| banque-assurance/releve/011 | MONTANT · milliers | `39 683,66 MAD` | SOCIETE |
| banque-assurance/releve/011 | MONTANT · milliers | `31 804,01 MAD` | SOCIETE |
| banque-assurance/releve/011 | MONTANT · milliers | `79 762 MAD` | SOCIETE |
| banque-assurance/releve/012 | MONTANT · grand | `9.318.790,73 MAD` | SOCIETE |
| banque-assurance/releve/012 | MONTANT · milliers | `9 784 MAD` | SOCIETE |
| banque-assurance/releve/012 | MONTANT · milliers | `58 295 MAD` | SOCIETE |
| banque-assurance/releve/012 | MONTANT · grand | `1 568 059,31 MAD` | SOCIETE |
| banque-assurance/releve/012 | MONTANT · milliers | `84.845,41 MAD` | SOCIETE |
| banque-assurance/releve/012 | MONTANT · grand | `4 633 328 MAD` | SOCIETE |
| banque-assurance/virement/001 | MONTANT · milliers | `64 670 MAD` | SOCIETE |
| banque-assurance/virement/002 | MONTANT · grand | `4 692 047 EUR` | SOCIETE |
| banque-assurance/virement/003 | MONTANT · milliers | `78.279,02 EUR` | SOCIETE |
| banque-assurance/virement/004 | MONTANT · milliers | `45 571,22 EUR` | SOCIETE |
| banque-assurance/virement/005 | MONTANT · grand | `966 709 EUR` | SOCIETE |
| banque-assurance/virement/006 | MONTANT · grand | `9 663 032 EUR` | SOCIETE |
| banque-assurance/virement/007 | MONTANT · grand | `4.780.171 EUR` | SOCIETE |
| banque-assurance/virement/008 | MONTANT · milliers | `2 525 EUR` | SOCIETE |
| banque-assurance/virement/009 | MONTANT · centaines | `852 EUR` | SOCIETE |
| banque-assurance/virement/010 | MONTANT · grand | `5 906 579 EUR` | SOCIETE |
| banque-assurance/virement/010 | MOT | `Noël` | PRENOM |
| banque-assurance/virement/011 | MONTANT · centaines | `861 MAD` | SOCIETE |
| banque-assurance/virement/012 | MONTANT · milliers | `65 289 MAD` | SOCIETE |
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
| core/ficheBilingue/001 | VILLE · ar | `طنجة` | SOCIETE |
| core/ficheBilingue/001 | MOT · arabe | `النور` | SOCIETE |
| core/ficheBilingue/002 | MOT · arabe | `النور` | SOCIETE |
| core/ficheBilingue/003 | MOT · arabe | `صباح` | SOCIETE |
| core/ficheBilingue/004 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/005 | VILLE · ar | `الرباط` | SOCIETE |
| core/ficheBilingue/005 | MOT · arabe | `سعيد` | SOCIETE |
| core/ficheBilingue/006 | VILLE · ar | `وجدة` | SOCIETE |
| core/ficheBilingue/006 | MOT · arabe | `السلامة` | SOCIETE |
| core/ficheBilingue/007 | VILLE · ar | `الرباط` | SOCIETE |
| core/ficheBilingue/007 | MOT · arabe | `سعيد` | SOCIETE |
| core/ficheBilingue/008 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/009 | MOT · arabe | `الجميل` | SOCIETE |
| core/ficheBilingue/010 | MOT · arabe | `النور` | SOCIETE |
| core/ficheBilingue/011 | VILLE · ar | `وجدة` | SOCIETE |
| core/ficheBilingue/011 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/012 | VILLE · ar | `الدار البيضاء` | SOCIETE |
| core/ficheBilingue/012 | MOT · arabe | `أمل` | SOCIETE |
| core/ficheBilingue/013 | MOT · arabe | `الجميل` | SOCIETE |
| core/ficheBilingue/014 | VILLE · ar | `أكادير` | SOCIETE |
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
| expertise-comptable/facture/001 | MONTANT · centaines | `750,25 MAD` | SOCIETE |
| expertise-comptable/facture/001 | MONTANT · grand | `4 013 193 MAD` | SOCIETE |
| expertise-comptable/facture/001 | MONTANT · centaines | `243,62 MAD` | SOCIETE |
| expertise-comptable/facture/001 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/001 | MONTANT · centaines | `369 MAD` | SOCIETE |
| expertise-comptable/facture/002 | MONTANT · centaines | `997,69 MAD` | SOCIETE |
| expertise-comptable/facture/002 | MONTANT · grand | `6 943 578 MAD` | SOCIETE |
| expertise-comptable/facture/002 | MONTANT · grand | `3 186 471,77 MAD` | SOCIETE |
| expertise-comptable/facture/002 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/002 | MONTANT · milliers | `18.173,49 MAD` | SOCIETE |
| expertise-comptable/facture/003 | MONTANT · centaines | `779 MAD` | SOCIETE |
| expertise-comptable/facture/003 | MONTANT · grand | `5 727 515,87 MAD` | SOCIETE |
| expertise-comptable/facture/003 | MONTANT · milliers | `46 893,88 MAD` | SOCIETE |
| expertise-comptable/facture/003 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/003 | MONTANT · grand | `383.278 MAD` | SOCIETE |
| expertise-comptable/facture/004 | MONTANT · centaines | `949,61 MAD` | SOCIETE |
| expertise-comptable/facture/004 | MONTANT · grand | `1 978 375,45 MAD` | SOCIETE |
| expertise-comptable/facture/004 | MONTANT · milliers | `32 291,13 MAD` | SOCIETE |
| expertise-comptable/facture/004 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/004 | MONTANT · milliers | `48 502 MAD` | SOCIETE |
| expertise-comptable/facture/005 | MONTANT · milliers | `11 471,50 MAD` | SOCIETE |
| expertise-comptable/facture/005 | MONTANT · milliers | `11 802,90 MAD` | SOCIETE |
| expertise-comptable/facture/005 | MONTANT · grand | `9 761 636,22 MAD` | SOCIETE |
| expertise-comptable/facture/005 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/005 | MONTANT · milliers | `42 937 MAD` | SOCIETE |
| expertise-comptable/facture/006 | MONTANT · milliers | `89 652 MAD` | SOCIETE |
| expertise-comptable/facture/006 | MONTANT · milliers | `23 540 MAD` | SOCIETE |
| expertise-comptable/facture/006 | MONTANT · centaines | `368 MAD` | SOCIETE |
| expertise-comptable/facture/006 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/006 | MONTANT · milliers | `62 532,27 MAD` | SOCIETE |
| expertise-comptable/facture/007 | MONTANT · milliers | `70 727,02 MAD` | SOCIETE |
| expertise-comptable/facture/007 | MONTANT · milliers | `47 638,63 MAD` | SOCIETE |
| expertise-comptable/facture/007 | MONTANT · milliers | `72.216 MAD` | SOCIETE |
| expertise-comptable/facture/007 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/007 | MONTANT · grand | `3 578 738 MAD` | SOCIETE |
| expertise-comptable/facture/008 | MONTANT · milliers | `46 504,23 MAD` | SOCIETE |
| expertise-comptable/facture/008 | MONTANT · milliers | `18 911 MAD` | SOCIETE |
| expertise-comptable/facture/008 | MONTANT · milliers | `57 029,32 MAD` | SOCIETE |
| expertise-comptable/facture/008 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/008 | MONTANT · grand | `4 527 293,88 MAD` | SOCIETE |
| expertise-comptable/facture/009 | MONTANT · grand | `8.603.205,30 MAD` | SOCIETE |
| expertise-comptable/facture/009 | MONTANT · milliers | `37 283,72 MAD` | SOCIETE |
| expertise-comptable/facture/009 | MONTANT · milliers | `89 477,34 MAD` | SOCIETE |
| expertise-comptable/facture/009 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/009 | MONTANT · grand | `7.795.944 MAD` | SOCIETE |
| expertise-comptable/facture/010 | MONTANT · grand | `8 425 695,47 MAD` | SOCIETE |
| expertise-comptable/facture/010 | MONTANT · milliers | `1.751 MAD` | SOCIETE |
| expertise-comptable/facture/010 | MONTANT · centaines | `202 MAD` | SOCIETE |
| expertise-comptable/facture/010 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/010 | MONTANT · centaines | `629 MAD` | SOCIETE |
| expertise-comptable/facture/011 | MONTANT · centaines | `453,70 MAD` | SOCIETE |
| expertise-comptable/facture/011 | MONTANT · grand | `7 976 862,26 MAD` | SOCIETE |
| expertise-comptable/facture/011 | MONTANT · milliers | `2 328,62 MAD` | SOCIETE |
| expertise-comptable/facture/011 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/011 | MONTANT · milliers | `33 803 MAD` | SOCIETE |
| expertise-comptable/facture/012 | MONTANT · grand | `8.075.538 MAD` | SOCIETE |
| expertise-comptable/facture/012 | MONTANT · milliers | `29 648,82 MAD` | SOCIETE |
| expertise-comptable/facture/012 | MONTANT · milliers | `12 417 MAD` | SOCIETE |
| expertise-comptable/facture/012 | SIGLE | `TVA` | SOCIETE |
| expertise-comptable/facture/012 | MONTANT · centaines | `827,93 MAD` | SOCIETE |
| expertise-comptable/grandLivre/001 | MONTANT · milliers | `60 046 MAD` | NOM, ? |
| expertise-comptable/grandLivre/001 | MONTANT · milliers | `40.937 MAD` | ? |
| expertise-comptable/grandLivre/001 | MONTANT · milliers | `44 216,37 MAD` | ?, NOM |
| expertise-comptable/grandLivre/001 | MONTANT · milliers | `88.397 MAD` | NOM, ? |
| expertise-comptable/grandLivre/002 | SIGLE | `PCGE` | SOCIETE |
| expertise-comptable/grandLivre/002 | MONTANT · milliers | `52 910,40 MAD` | SOCIETE |
| expertise-comptable/grandLivre/002 | MONTANT · milliers | `63 690 MAD` | SOCIETE |
| expertise-comptable/grandLivre/002 | MONTANT · centaines | `129 MAD` | SOCIETE |
| expertise-comptable/grandLivre/002 | MONTANT · centaines | `842,75 MAD` | SOCIETE |
| expertise-comptable/grandLivre/002 | MONTANT · milliers | `66.210,87 MAD` | SOCIETE |
| expertise-comptable/grandLivre/002 | MONTANT · milliers | `23 326 MAD` | SOCIETE |
| expertise-comptable/grandLivre/002 | MONTANT · centaines | `788,42 MAD` | SOCIETE |
| expertise-comptable/grandLivre/003 | SIGLE | `PCGE` | SOCIETE |
| expertise-comptable/grandLivre/003 | MONTANT · centaines | `640 MAD` | SOCIETE |
| expertise-comptable/grandLivre/003 | MONTANT · centaines | `708 MAD` | SOCIETE |
| expertise-comptable/grandLivre/003 | MONTANT · milliers | `85.104 MAD` | SOCIETE |
| expertise-comptable/grandLivre/003 | MONTANT · milliers | `58 927 MAD` | SOCIETE |
| expertise-comptable/grandLivre/003 | MONTANT · milliers | `74 769 MAD` | SOCIETE |
| expertise-comptable/grandLivre/004 | MONTANT · milliers | `5 467,10 MAD` | SOCIETE |
| expertise-comptable/grandLivre/004 | MONTANT · milliers | `16 852 MAD` | SOCIETE |
| expertise-comptable/grandLivre/004 | MONTANT · milliers | `1 593,59 MAD` | SOCIETE |
| expertise-comptable/grandLivre/004 | MONTANT · milliers | `24 084,67 MAD` | SOCIETE |
| expertise-comptable/grandLivre/004 | MONTANT · grand | `9 159 240 MAD` | SOCIETE |
| expertise-comptable/grandLivre/005 | MONTANT · centaines | `161,37 MAD` | NOM-001-TEL-002-REF-001 |
| expertise-comptable/grandLivre/005 | MONTANT · milliers | `83 064,99 MAD` | NOM-001-TEL-002-REF-001 |
| expertise-comptable/grandLivre/005 | MONTANT · centaines | `560 MAD` | NOM-001-TEL-002-REF-001 |
| expertise-comptable/grandLivre/005 | MONTANT · centaines | `197 MAD` | NOM-001-TEL-002-REF-001 |
| expertise-comptable/grandLivre/005 | MONTANT · milliers | `81 374 MAD` | NOM-001-TEL-002-REF-001 |
| expertise-comptable/grandLivre/006 | SIGLE | `PCGE` | SOCIETE |
| expertise-comptable/grandLivre/006 | MONTANT · centaines | `944 MAD` | SOCIETE |
| expertise-comptable/grandLivre/006 | MONTANT · milliers | `81 722,49 MAD` | SOCIETE |
| expertise-comptable/grandLivre/006 | MONTANT · grand | `5.259.975,66 MAD` | SOCIETE |
| expertise-comptable/grandLivre/006 | MONTANT · milliers | `34 245 MAD` | SOCIETE |
| expertise-comptable/grandLivre/006 | MONTANT · centaines | `938,97 MAD` | SOCIETE |
| expertise-comptable/grandLivre/007 | MONTANT · grand | `288 222,52 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/007 | MONTANT · centaines | `423,68 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/007 | MONTANT · centaines | `835 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/007 | MONTANT · grand | `7 132 197 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/007 | MONTANT · centaines | `445 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/007 | MONTANT · centaines | `891,24 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/008 | MONTANT · milliers | `65 584,84 MAD` | SOCIETE |
| expertise-comptable/grandLivre/008 | MONTANT · milliers | `6.118 MAD` | SOCIETE |
| expertise-comptable/grandLivre/008 | MONTANT · centaines | `395,44 MAD` | SOCIETE |
| expertise-comptable/grandLivre/008 | MONTANT · centaines | `720,63 MAD` | SOCIETE |
| expertise-comptable/grandLivre/008 | MONTANT · centaines | `614 MAD` | SOCIETE |
| expertise-comptable/grandLivre/008 | MONTANT · grand | `6 893 827,98 MAD` | SOCIETE |
| expertise-comptable/grandLivre/009 | MONTANT · milliers | `73 123,01 MAD` | SOCIETE |
| expertise-comptable/grandLivre/009 | MONTANT · grand | `3 763 253,90 MAD` | SOCIETE |
| expertise-comptable/grandLivre/009 | MONTANT · milliers | `38 336,12 MAD` | SOCIETE |
| expertise-comptable/grandLivre/009 | MONTANT · milliers | `47 567 MAD` | SOCIETE |
| expertise-comptable/grandLivre/009 | MONTANT · milliers | `1 268 MAD` | SOCIETE |
| expertise-comptable/grandLivre/009 | MONTANT · milliers | `97.960,41 MAD` | SOCIETE |
| expertise-comptable/grandLivre/009 | MONTANT · milliers | `33 012 MAD` | SOCIETE |
| expertise-comptable/grandLivre/010 | SIGLE | `PCGE` | SOCIETE |
| expertise-comptable/grandLivre/010 | MONTANT · grand | `4.425.348,53 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/010 | MONTANT · milliers | `22 487,40 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/010 | MONTANT · milliers | `32.181 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/010 | MONTANT · grand | `6 549 320 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/010 | MONTANT · grand | `8 075 336 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/010 | MONTANT · milliers | `49 970,28 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/010 | MONTANT · milliers | `60 662 MAD` | NOM-001-002-REF-001 |
| expertise-comptable/grandLivre/011 | MONTANT · milliers | `18 739,07 MAD` | SOCIETE |
| expertise-comptable/grandLivre/011 | MONTANT · milliers | `86 476 MAD` | SOCIETE |
| expertise-comptable/grandLivre/011 | MONTANT · milliers | `37.509 MAD` | SOCIETE |
| expertise-comptable/grandLivre/011 | MONTANT · milliers | `81 699 MAD` | SOCIETE |
| expertise-comptable/grandLivre/011 | MONTANT · centaines | `302 MAD` | SOCIETE |
| expertise-comptable/grandLivre/011 | MONTANT · grand | `3.015.613,67 MAD` | SOCIETE |
| expertise-comptable/grandLivre/012 | MONTANT · centaines | `418 MAD` | SOCIETE |
| expertise-comptable/grandLivre/012 | MONTANT · milliers | `35 326,15 MAD` | SOCIETE |
| expertise-comptable/grandLivre/012 | MONTANT · milliers | `61 768 MAD` | SOCIETE |
| expertise-comptable/grandLivre/012 | MONTANT · milliers | `75 763,30 MAD` | SOCIETE |
| expertise-comptable/lettreMission/010 | MOT | `Noël` | PRENOM |
| juridique-fr/assignation/006 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/assignation/009 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/assignation/011 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/001 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/001 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/002 | VILLE | `Rabat` | ADRESSE |
| juridique-fr/conclusions/002 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/003 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/004 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/005 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/006 | VILLE | `Paris` | ADRESSE |
| juridique-fr/conclusions/006 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/006 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/006 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/008 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/009 | VILLE | `Lille` | ADRESSE |
| juridique-fr/conclusions/009 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/009 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/009 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/010 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/010 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/010 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/011 | VILLE | `Marseille` | ADRESSE |
| juridique-fr/conclusions/011 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/011 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/012 | VILLE | `Strasbourg` | ADRESSE |
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
| rh-paie/bulletinFr/002 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/003 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/004 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/005 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/006 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/007 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/008 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/009 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/010 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/011 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/012 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · milliers | `2 731,18 MAD` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · milliers | `56 378 MAD` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · centaines | `200 MAD` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · milliers | `47 076 MAD` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · milliers | `56 405,37 MAD` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · milliers | `95 974,01 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · centaines | `694,56 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · grand | `9 335 253,05 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · grand | `4 416 559 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · milliers | `30 267,48 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · milliers | `20 050,55 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · milliers | `84 595,72 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · grand | `6.424.272,52 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · grand | `4.906.990,93 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · milliers | `83 751 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · centaines | `255 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · grand | `4.170.902,64 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · milliers | `79 244,19 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · centaines | `421 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · centaines | `671,11 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · milliers | `41 367,62 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · milliers | `39 103,66 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · grand | `7.606.725 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · milliers | `21 248,59 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · milliers | `59 371,98 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · centaines | `476 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · milliers | `52 780,05 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · centaines | `861,50 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · centaines | `911 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · milliers | `17 116 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · grand | `9 948 110,53 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · grand | `4 096 191,36 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · milliers | `67 398,93 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · milliers | `47 762,09 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · grand | `4 290 256,83 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · grand | `4 416 755,70 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · milliers | `94 408,38 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · centaines | `848 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · milliers | `75 949,24 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · grand | `3 081 328,67 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · grand | `7 505 814 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · grand | `1.218.369,51 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · grand | `7.561.551,10 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · grand | `9 659 359,54 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · milliers | `67 677 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · grand | `6 137 548,14 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · grand | `5 249 273 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · milliers | `79 935,53 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · centaines | `835,75 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · grand | `2 981 244 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · milliers | `94 298,12 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · grand | `9 662 583 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · milliers | `41 393,44 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · milliers | `27 301 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · centaines | `979 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · grand | `6 146 368 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · grand | `7 003 405 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · grand | `9.564.495,35 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · milliers | `91 861 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · milliers | `12 451,39 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · milliers | `66 310 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · milliers | `70 290 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · milliers | `48 730,79 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · grand | `9 668 158,96 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · milliers | `84.966,59 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · grand | `2 567 527 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · milliers | `90.293 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · centaines | `806 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · milliers | `61.419 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · milliers | `91 413,62 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · milliers | `53.320,30 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · milliers | `32 975,96 MAD` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `6 000,00 MAD` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `268,80 MAD` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `8 450,00 MAD` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `190,97 MAD` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `7 991,23 MAD` | SOCIETE |
| rh-paie/manuel/leurres-paie | MONTANT | `1 135,12 MAD` | SOCIETE |
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

## Codé hors étiquette (2164 passages, 222 distincts — 40 plus fréquents)

Ni une valeur étiquetée, ni un leurre : surtout des mots du gabarit que le verrou ne connaît pas. Sur-coder est sûr, mais rend le texte moins utile à l'IA.

| Passage | Fois |
|---|---:|
| SOCIETE « Conseiller » | 121 |
| CODE « dyal » | 56 |
| CODE « joignable » | 50 |
| CODE « على » | 35 |
| CODE « ghadi » | 34 |
| CODE « أنا » | 33 |
| CODE « salam » | 27 |
| SOCIETE « الهاتف » | 27 |
| CODE « من » | 25 |
| CODE « mochkil » | 24 |
| SOCIETE « BIC » | 24 |
| SOCIETE « IMEI » | 24 |
| CODE « liya » | 23 |
| CODE « lih » | 20 |
| CODE « dir » | 18 |
| NOM « PRLV » | 18 |
| CODE « khassni » | 17 |
| CODE « nchoufou » | 17 |
| CODE « sift » | 17 |
| REF « 3ndi » | 17 |
| CODE « ديالي » | 16 |
| NOM « Allah » | 16 |
| CODE « بيا » | 15 |
| CODE « تصلو » | 15 |
| CODE « kolchi » | 14 |
| CODE « nta » | 14 |
| CODE « wach » | 14 |
| CODE « الازدياد » | 14 |
| CODE « الاسم » | 14 |
| CODE « العنوان » | 14 |
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
