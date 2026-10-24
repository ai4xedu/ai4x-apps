# HT-Bench 0.2.0 (jeu test) — rapport de détection

Moteur Hidden Tokens **v2.23.2** · jeu `63cd677aedcfc663…` (synthétique, graine fixe) · 318 documents · 2964 valeurs à coder · 2312 leurres.

Chemin mesuré : anonymiser_fichier sur un .md (MCP stdio, fichier *-anonymise.md écrit sur le poste) — moteur + verrou, pack du document activé par reglages.json ; verrou de sortie mesuré à part sur la réponse de coder_texte. Une valeur compte comme détectée si toutes ses lettres et chiffres sont sous un code (les particules d'un nom — Ben, El, Aït, de… — peuvent rester en clair). Une valeur codée en partie est une fuite : elle compte comme manquée. Définitions complètes : `bench/ht-bench/README.md`.

**Identifiants directs (noms, pièces et identifiants, téléphones, e-mails, IBAN/RIB, IMEI/IMSI) : 97.1 %** (2137/2201) — cible ≥ 99 % par pack.

Verrou de sortie : sur 64 identifiant(s) direct(s) manqué(s) ou partiel(s) par le moteur, 58 resteraient lisibles dans la réponse de coder_texte (le reste est rattrapé par le dernier filet, « [MASQUÉ] » / « ••• » — mais le fichier écrit sur le poste, lui, les contient).

## Par pack

| Pack | Docs | Rappel direct | Cible | Rappel (tout) | Précision | F1 | Leurres codés | « ••• » en sortie |
|---|---:|---:|:-:|---:|---:|---:|---:|---:|
| core | 42 | 99.7 % (321/322) | ✅ | 98.1 % | 93.5 % | 95.7 % | 3/141 (2.1 %) | 0 |
| telecom-ma | 36 | 100.0 % (242/242) | ✅ | 100.0 % | 82.7 % | 90.5 % | 17/158 (10.8 %) | 0 |
| juridique-fr | 36 | 96.0 % (265/276) | ❌ | 95.0 % | 87.1 % | 90.9 % | 29/300 (9.7 %) | 0 |
| banque-assurance | 96 | 96.3 % (628/652) | ❌ | 93.3 % | 76.2 % | 83.8 % | 81/676 (12.0 %) | 12 |
| sante | 36 | 96.1 % (196/204) | ❌ | 92.9 % | 81.3 % | 86.7 % | 34/240 (14.2 %) | 57 |
| expertise-comptable | 36 | 99.3 % (275/277) | ✅ | 99.2 % | 87.6 % | 93.0 % | 11/425 (2.6 %) | 12 |
| rh-paie | 36 | 92.1 % (210/228) | ❌ | 94.2 % | 89.2 % | 91.7 % | 74/372 (19.9 %) | 24 |

Précision du pack = passages codés qui recouvrent une valeur étiquetée / tous les passages codés : le verrou code tout mot inconnu du lexique, un mot courant codé à tort la fait baisser (cf. « Codé hors étiquette »). « ••• » en sortie : passages masqués par le verrou de sortie dans la réponse de coder_texte (souvent un code déjà posé que le motif d'un pack reconnaît à nouveau : l'IA ne peut plus le citer).

**Sortie corrompue : 44 document(s)** dont le texte codé n'est plus « l'origine + des codes » (codes imbriqués comme `NOM-001-002`, morceau de mot recodé) — banque-assurance : 12, sante : 9, expertise-comptable : 23. La valeur est protégée, mais le décodage ne rend pas le texte d'origine. Ces documents sont notés par plus longue sous-suite commune (cf. README).

## Les cinq plus gros écarts (identifiants directs)

| # | Type · écriture | Perdues | Rappel |
|---:|---|---:|---:|
| 1 | NIR · nir-cle-tiret | 14/14 (dont 14 partielles) | 0.0 % |
| 2 | CVV · cvv-3 | 12/12 (dont 0 partielles) | 0.0 % |
| 3 | CNSS · cnss-affiliation-7 | 12/24 (dont 0 partielles) | 50.0 % |
| 4 | PERSONNE · fr-particule | 9/34 (dont 6 partielles) | 73.5 % |
| 5 | RIB · rib-ma-groupes | 6/29 (dont 6 partielles) | 79.3 % |

## Par type d'entité

| Type | Direct | Valeurs | Rappel | Partielles | Précision | F1 | Bon préfixe |
|---|:-:|---:|---:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 847 | 98.3 % | 11 | 74.4 % (1595/2143) | 84.7 % | 827/833 |
| CIN — CIN marocaine | oui | 192 | 100.0 % | 0 | 73.6 % (159/216) | 84.8 % | 159/192 |
| NIR — NIR (sécurité sociale, France) | oui | 40 | 65.0 % | 14 | — (0/0) | — | 26/26 |
| CNSS — N° CNSS | oui | 72 | 83.3 % | 0 | 100.0 % (48/48) | 90.9 % | 48/60 |
| ICE — ICE | oui | 87 | 100.0 % | 0 | 100.0 % (87/87) | 100.0 % | 87/87 |
| IF — Identifiant fiscal (IF) | oui | 46 | 100.0 % | 0 | 100.0 % (27/27) | 100.0 % | 27/46 |
| RC — Registre de commerce (RC) | oui | 41 | 100.0 % | 0 | 100.0 % (41/41) | 100.0 % | 41/41 |
| SIREN — SIREN | oui | 24 | 100.0 % | 0 | 13.4 % (24/179) | 23.6 % | 24/24 |
| SIRET — SIRET | oui | 31 | 100.0 % | 0 | — (0/0) | — | 12/31 |
| TEL — Téléphone | oui | 390 | 100.0 % | 0 | 100.0 % (367/367) | 100.0 % | 367/390 |
| EMAIL — E-mail | oui | 176 | 100.0 % | 0 | 100.0 % (176/176) | 100.0 % | 176/176 |
| IBAN — IBAN | oui | 55 | 98.2 % | 1 | 38.6 % (54/140) | 55.4 % | 54/54 |
| RIB — RIB | oui | 97 | 88.7 % | 11 | — (0/0) | — | 86/86 |
| IMEI — IMEI | oui | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| IMSI — IMSI | oui | 19 | 100.0 % | 0 | 100.0 % (19/19) | 100.0 % | 19/19 |
| CARTE — Numéro de carte bancaire | oui | 24 | 100.0 % | 0 | 43.6 % (24/55) | 60.8 % | 24/24 |
| CVV — Cryptogramme (CVV / CVC) | oui | 12 | 0.0 % | 0 | — (0/0) | — | 0/0 |
| PASSEPORT — Passeport, titre de séjour, permis | oui | 24 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 24/24 |
| BIC — BIC / SWIFT |  | 24 | 100.0 % | 0 | — (0/0) | — | 0/24 |
| ICCID — ICCID (carte SIM) |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| ADRESSE — Adresse postale |  | 184 | 92.4 % | 0 | 100.0 % (172/172) | 96.0 % | 153/170 |
| SOCIETE — Société |  | 181 | 100.0 % | 0 | 50.8 % (156/307) | 67.4 % | 156/181 |
| NAISSANCE — Date de naissance |  | 86 | 79.1 % | 0 | 100.0 % (68/68) | 88.3 % | 68/68 |
| PATENTE — N° de patente |  | 5 | 100.0 % | 0 | 100.0 % (5/5) | 100.0 % | 5/5 |
| TVA — N° de TVA intracommunautaire |  | 7 | 100.0 % | 0 | 100.0 % (7/7) | 100.0 % | 7/7 |
| MATRICULE — Matricule salarié |  | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| PATIENT — N° de dossier patient / IPP |  | 24 | 100.0 % | 0 | 80.0 % (24/30) | 88.9 % | 24/24 |
| PRATICIEN — Identifiant praticien (INPE, RPPS) |  | 36 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/36 |
| POLICE — N° de police d'assurance |  | 12 | 100.0 % | 0 | — (0/0) | — | 0/12 |
| SINISTRE — N° de sinistre |  | 12 | 100.0 % | 0 | 50.0 % (12/24) | 66.7 % | 12/12 |
| FACTURE — N° de facture / pièce |  | 24 | 100.0 % | 0 | 0.0 % (0/2) | 0.0 % | 0/24 |
| RG — N° RG / parquet |  | 48 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/48 |
| IMMAT — Immatriculation (véhicule) |  | 24 | 4.2 % | 6 | 100.0 % (1/1) | 8.0 % | 1/1 |
| EFFET — N° de chèque ou de LCN |  | 36 | 66.7 % | 0 | 100.0 % (24/24) | 80.0 % | 24/24 |
| CONTRAT — N° de contrat ou de dossier de crédit |  | 24 | 100.0 % | 0 | — (0/0) | — | 24/24 |

Précision(type) = passages codés sous un préfixe de ce type qui recouvrent bien une valeur de ce type. « Bon préfixe » : parmi les valeurs détectées, celles codées sous un préfixe attendu (une valeur codée REF au lieu de SIRET est protégée, mais mal nommée).

## Rappel direct, pack × type

| Pack | CARTE | CIN | CNSS | CVV | EMAIL | IBAN | ICE | IF | IMEI | IMSI | NIR | PASSEPORT | PERSONNE | RC | RIB | SIREN | SIRET | TEL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| core |  | 100.0 % (24) |  |  | 100.0 % (56) |  |  |  |  |  | 100.0 % (4) |  | 99.3 % (140) |  |  |  |  | 100.0 % (98) |
| telecom-ma |  | 100.0 % (36) |  |  | 100.0 % (24) |  | 100.0 % (3) |  | 100.0 % (24) | 100.0 % (19) |  |  | 100.0 % (72) |  |  |  |  | 100.0 % (64) |
| juridique-fr |  | 100.0 % (12) |  |  | 100.0 % (24) |  |  |  |  |  | 75.0 % (12) |  | 94.4 % (144) |  |  | 100.0 % (24) | 100.0 % (12) | 100.0 % (48) |
| banque-assurance | 100.0 % (24) | 100.0 % (72) |  | 0.0 % (12) | 100.0 % (24) | 100.0 % (36) | 100.0 % (19) | 100.0 % (5) |  |  |  | 100.0 % (24) | 98.8 % (260) |  | 88.8 % (80) |  |  | 100.0 % (96) |
| sante |  | 100.0 % (12) | 100.0 % (24) |  | 100.0 % (12) |  |  |  |  |  | 41.7 % (12) |  | 99.0 % (96) |  |  |  |  | 100.0 % (48) |
| expertise-comptable |  | 100.0 % (12) | 100.0 % (12) |  | 100.0 % (24) | 85.7 % (7) | 100.0 % (41) | 100.0 % (29) |  |  |  |  | 98.9 % (87) | 100.0 % (29) | 100.0 % (5) |  | 100.0 % (7) | 100.0 % (24) |
| rh-paie |  | 100.0 % (24) | 66.7 % (36) |  | 100.0 % (12) | 100.0 % (12) | 100.0 % (24) | 100.0 % (12) |  |  | 66.7 % (12) |  | 100.0 % (48) | 100.0 % (12) | 83.3 % (12) |  | 100.0 % (12) | 100.0 % (12) |

## Par écriture

| Type · écriture | Direct | Valeurs | Rappel | Partielles |
|---|:-:|---:|---:|---:|
| ADRESSE · fr-batiment |  | 25 | 84.0 % | 0 |
| ADRESSE · fr-bis |  | 25 | 84.0 % | 0 |
| ADRESSE · fr-rue |  | 21 | 71.4 % | 0 |
| ADRESSE · ma-douar-hay |  | 30 | 100.0 % | 0 |
| ADRESSE · ma-lotissement |  | 29 | 100.0 % | 0 |
| ADRESSE · ma-residence |  | 25 | 100.0 % | 0 |
| ADRESSE · ma-rue |  | 29 | 100.0 % | 0 |
| BIC · bic-11 |  | 9 | 100.0 % | 0 |
| BIC · bic-8 |  | 15 | 100.0 % | 0 |
| CARTE · carte-collee | oui | 8 | 100.0 % | 0 |
| CARTE · carte-groupes | oui | 4 | 100.0 % | 0 |
| CARTE · carte-masquee | oui | 9 | 100.0 % | 0 |
| CARTE · carte-tirets | oui | 3 | 100.0 % | 0 |
| CIN · cin-colle | oui | 113 | 100.0 % | 0 |
| CIN · cin-espace | oui | 46 | 100.0 % | 0 |
| CIN · cin-tiret | oui | 33 | 100.0 % | 0 |
| CNSS · cnss-affiliation-7 | oui | 24 | 50.0 % | 0 |
| CNSS · cnss-assure-9 | oui | 48 | 100.0 % | 0 |
| CONTRAT · credit-numerique |  | 11 | 100.0 % | 0 |
| CONTRAT · credit-prefixe |  | 13 | 100.0 % | 0 |
| CVV · cvv-3 | oui | 12 | 0.0 % | 0 |
| EFFET · cheque-7 |  | 24 | 100.0 % | 0 |
| EFFET · lcn-7 |  | 12 | 0.0 % | 0 |
| EMAIL · generique | oui | 12 | 100.0 % | 0 |
| EMAIL · initiale.nom | oui | 44 | 100.0 % | 0 |
| EMAIL · majuscules | oui | 33 | 100.0 % | 0 |
| EMAIL · nom_prenom | oui | 31 | 100.0 % | 0 |
| EMAIL · prenom.nom | oui | 27 | 100.0 % | 0 |
| EMAIL · prenomnom-chiffres | oui | 29 | 100.0 % | 0 |
| FACTURE · lot |  | 12 | 100.0 % | 0 |
| FACTURE · — |  | 12 | 100.0 % | 0 |
| IBAN · iban-fr-colle | oui | 14 | 100.0 % | 0 |
| IBAN · iban-fr-par-4 | oui | 13 | 92.3 % | 1 |
| IBAN · iban-ma-colle | oui | 13 | 100.0 % | 0 |
| IBAN · iban-ma-par-4 | oui | 15 | 100.0 % | 0 |
| ICCID · iccid-colle |  | 12 | 100.0 % | 0 |
| ICE · ice-colle | oui | 52 | 100.0 % | 0 |
| ICE · ice-par-3 | oui | 35 | 100.0 % | 0 |
| IF · if-nombre | oui | 46 | 100.0 % | 0 |
| IMEI · imei-colle | oui | 7 | 100.0 % | 0 |
| IMEI · imei-groupes | oui | 8 | 100.0 % | 0 |
| IMEI · imei-tirets | oui | 9 | 100.0 % | 0 |
| IMMAT · plaque-ma-barres |  | 10 | 0.0 % | 0 |
| IMMAT · plaque-ma-slash |  | 6 | 0.0 % | 6 |
| IMMAT · plaque-ma-tirets |  | 8 | 12.5 % | 0 |
| IMSI · imsi-colle | oui | 19 | 100.0 % | 0 |
| MATRICULE · — |  | 24 | 100.0 % | 0 |
| NAISSANCE · jj-mm-aaaa |  | 44 | 84.1 % | 0 |
| NAISSANCE · lettres |  | 42 | 73.8 % | 0 |
| NIR · nir-cle-tiret | oui | 14 | 0.0 % | 14 |
| NIR · nir-colle | oui | 15 | 100.0 % | 0 |
| NIR · nir-groupes | oui | 11 | 100.0 % | 0 |
| PASSEPORT · passeport-ma | oui | 5 | 100.0 % | 0 |
| PASSEPORT · permis | oui | 12 | 100.0 % | 0 |
| PASSEPORT · titre-sejour | oui | 7 | 100.0 % | 0 |
| PATENTE · patente |  | 5 | 100.0 % | 0 |
| PATIENT · — |  | 24 | 100.0 % | 0 |
| PERSONNE · fr-nom-mot-courant | oui | 36 | 100.0 % | 0 |
| PERSONNE · fr-particule | oui | 34 | 73.5 % | 6 |
| PERSONNE · fr-simple | oui | 189 | 100.0 % | 0 |
| PERSONNE · mag-ait-apostrophe | oui | 26 | 100.0 % | 0 |
| PERSONNE · mag-ait-espace | oui | 32 | 100.0 % | 0 |
| PERSONNE · mag-ait-tiret | oui | 39 | 100.0 % | 0 |
| PERSONNE · mag-ait-trema | oui | 24 | 100.0 % | 0 |
| PERSONNE · mag-al-espace | oui | 18 | 100.0 % | 0 |
| PERSONNE · mag-ben-colle | oui | 16 | 93.8 % | 1 |
| PERSONNE · mag-ben-espace | oui | 47 | 97.9 % | 1 |
| PERSONNE · mag-ben-tiret | oui | 21 | 100.0 % | 0 |
| PERSONNE · mag-double | oui | 83 | 100.0 % | 0 |
| PERSONNE · mag-el-colle | oui | 21 | 100.0 % | 0 |
| PERSONNE · mag-el-espace | oui | 45 | 100.0 % | 0 |
| PERSONNE · mag-el-tiret | oui | 14 | 100.0 % | 0 |
| PERSONNE · mag-ould | oui | 28 | 92.9 % | 2 |
| PERSONNE · mag-simple | oui | 174 | 99.4 % | 1 |
| POLICE · — |  | 12 | 100.0 % | 0 |
| PRATICIEN · — |  | 36 | 100.0 % | 0 |
| RC · rc-nombre | oui | 41 | 100.0 % | 0 |
| RG · parquet |  | 12 | 100.0 % | 0 |
| RG · pourvoi |  | 12 | 100.0 % | 0 |
| RG · rg |  | 24 | 100.0 % | 0 |
| RIB · rib-ma-colle | oui | 28 | 100.0 % | 0 |
| RIB · rib-ma-groupes | oui | 29 | 79.3 % | 6 |
| RIB · rib-ma-par-4 | oui | 24 | 79.2 % | 5 |
| RIB · rib-ma-tirets | oui | 16 | 100.0 % | 0 |
| SINISTRE · — |  | 12 | 100.0 % | 0 |
| SIREN · siren-colle | oui | 13 | 100.0 % | 0 |
| SIREN · siren-groupes | oui | 11 | 100.0 % | 0 |
| SIRET · siret-colle | oui | 18 | 100.0 % | 0 |
| SIRET · siret-groupes | oui | 13 | 100.0 % | 0 |
| SOCIETE · casse-titre |  | 63 | 100.0 % | 0 |
| SOCIETE · majuscules |  | 52 | 100.0 % | 0 |
| SOCIETE · societe-forme |  | 66 | 100.0 % | 0 |
| TEL · fr-fixe-0033 | oui | 3 | 100.0 % | 0 |
| TEL · fr-fixe-intl-colle | oui | 2 | 100.0 % | 0 |
| TEL · fr-fixe-intl-espaces | oui | 9 | 100.0 % | 0 |
| TEL · fr-fixe-intl-zero-parenthese | oui | 2 | 100.0 % | 0 |
| TEL · fr-fixe-national-colle | oui | 5 | 100.0 % | 0 |
| TEL · fr-fixe-national-espaces | oui | 9 | 100.0 % | 0 |
| TEL · fr-fixe-national-points | oui | 7 | 100.0 % | 0 |
| TEL · fr-fixe-national-tirets | oui | 8 | 100.0 % | 0 |
| TEL · fr-mobile-0033 | oui | 7 | 100.0 % | 0 |
| TEL · fr-mobile-intl-colle | oui | 2 | 100.0 % | 0 |
| TEL · fr-mobile-intl-espaces | oui | 8 | 100.0 % | 0 |
| TEL · fr-mobile-intl-zero-parenthese | oui | 4 | 100.0 % | 0 |
| TEL · fr-mobile-national-colle | oui | 10 | 100.0 % | 0 |
| TEL · fr-mobile-national-espaces | oui | 6 | 100.0 % | 0 |
| TEL · fr-mobile-national-points | oui | 5 | 100.0 % | 0 |
| TEL · fr-mobile-national-tirets | oui | 2 | 100.0 % | 0 |
| TEL · ma-fixe-00212 | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-intl-3-6 | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-intl-colle | oui | 7 | 100.0 % | 0 |
| TEL · ma-fixe-intl-espaces | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-intl-tirets | oui | 7 | 100.0 % | 0 |
| TEL · ma-fixe-intl-zero-parenthese | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-msisdn-sans-plus | oui | 9 | 100.0 % | 0 |
| TEL · ma-fixe-national-4-2-2-2 | oui | 9 | 100.0 % | 0 |
| TEL · ma-fixe-national-colle | oui | 11 | 100.0 % | 0 |
| TEL · ma-fixe-national-espaces | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-national-points | oui | 7 | 100.0 % | 0 |
| TEL · ma-fixe-national-tirets | oui | 7 | 100.0 % | 0 |
| TEL · ma-mobile-00212 | oui | 20 | 100.0 % | 0 |
| TEL · ma-mobile-intl-3-6 | oui | 21 | 100.0 % | 0 |
| TEL · ma-mobile-intl-colle | oui | 19 | 100.0 % | 0 |
| TEL · ma-mobile-intl-espaces | oui | 21 | 100.0 % | 0 |
| TEL · ma-mobile-intl-tirets | oui | 17 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese | oui | 17 | 100.0 % | 0 |
| TEL · ma-mobile-msisdn-sans-plus | oui | 12 | 100.0 % | 0 |
| TEL · ma-mobile-national-4-2-2-2 | oui | 16 | 100.0 % | 0 |
| TEL · ma-mobile-national-colle | oui | 22 | 100.0 % | 0 |
| TEL · ma-mobile-national-espaces | oui | 16 | 100.0 % | 0 |
| TEL · ma-mobile-national-points | oui | 21 | 100.0 % | 0 |
| TEL · ma-mobile-national-tirets | oui | 13 | 100.0 % | 0 |
| TVA · tva-fr-colle |  | 2 | 100.0 % | 0 |
| TVA · tva-fr-groupes |  | 5 | 100.0 % | 0 |

## Par trait (noms)

| Type · trait | Valeurs | Rappel | Partielles |
|---|---:|---:|---:|
| PERSONNE · minuscules | 6 | 100.0 % | 0 |
| PERSONNE · nom-majuscules | 84 | 98.8 % | 1 |
| PERSONNE · nom-majuscules-avant | 163 | 100.0 % | 0 |
| PERSONNE · nom-seul | 74 | 95.9 % | 0 |
| PERSONNE · prenom-apostrophe | 52 | 98.1 % | 1 |
| PERSONNE · prenom-compose | 124 | 99.2 % | 1 |
| PERSONNE · prenom-seul | 40 | 100.0 % | 0 |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés à tort | Taux |
|---|---:|---:|---:|
| MONTANT — Montant | 613 | 36 | 5.9 % |
| DATE — Date (hors naissance) | 672 | 10 | 1.5 % |
| ARTICLE — Article ou texte de loi | 84 | 26 | 31.0 % |
| SIGLE — Sigle ou terme du lexique | 325 | 126 | 38.8 % |
| MOT — Mot courant qui ressemble à un nom | 130 | 16 | 12.3 % |
| VILLE — Ville | 189 | 0 | 0.0 % |
| PRODUIT — Offre, opérateur, médicament | 103 | 35 | 34.0 % |
| COMPTE — N° de compte comptable | 76 | 0 | 0.0 % |
| MESURE — Durée, quantité, dosage | 120 | 0 | 0.0 % |

## Valeurs manquées ou partielles (131)

| Document | Type | Écriture | Valeur (synthétique) | Statut | Resté en clair | Vu par l'IA | Préfixes posés |
|---|---|---|---|---|---|:-:|---|
| rh-paie/bulletinMa/001 | CNSS | cnss-affiliation-7 | `6414242` | manque | 6414242 | oui |  |
| rh-paie/bulletinMa/002 | CNSS | cnss-affiliation-7 | `4739372` | manque | 4739372 | oui |  |
| rh-paie/bulletinMa/003 | CNSS | cnss-affiliation-7 | `4185614` | manque | 4185614 | oui |  |
| rh-paie/bulletinMa/004 | CNSS | cnss-affiliation-7 | `4699625` | manque | 4699625 | oui |  |
| rh-paie/bulletinMa/005 | CNSS | cnss-affiliation-7 | `4319603` | manque | 4319603 | oui |  |
| rh-paie/bulletinMa/006 | CNSS | cnss-affiliation-7 | `4466676` | manque | 4466676 | oui |  |
| rh-paie/bulletinMa/007 | CNSS | cnss-affiliation-7 | `4816866` | manque | 4816866 | oui |  |
| rh-paie/bulletinMa/008 | CNSS | cnss-affiliation-7 | `4195007` | manque | 4195007 | oui |  |
| rh-paie/bulletinMa/009 | CNSS | cnss-affiliation-7 | `3768382` | manque | 3768382 | oui |  |
| rh-paie/bulletinMa/010 | CNSS | cnss-affiliation-7 | `3306771` | manque | 3306771 | oui |  |
| rh-paie/bulletinMa/011 | CNSS | cnss-affiliation-7 | `4261359` | manque | 4261359 | oui |  |
| rh-paie/bulletinMa/012 | CNSS | cnss-affiliation-7 | `4236726` | manque | 4236726 | oui |  |
| banque-assurance/carte/001 | CVV | cvv-3 | `274` | manque | 274 | oui |  |
| banque-assurance/carte/002 | CVV | cvv-3 | `549` | manque | 549 | oui |  |
| banque-assurance/carte/003 | CVV | cvv-3 | `732` | manque | 732 | oui |  |
| banque-assurance/carte/004 | CVV | cvv-3 | `111` | manque | 111 | oui |  |
| banque-assurance/carte/005 | CVV | cvv-3 | `599` | manque | 599 | oui |  |
| banque-assurance/carte/006 | CVV | cvv-3 | `267` | manque | 267 | oui |  |
| banque-assurance/carte/007 | CVV | cvv-3 | `069` | manque | 069 | oui |  |
| banque-assurance/carte/008 | CVV | cvv-3 | `317` | manque | 317 | oui |  |
| banque-assurance/carte/009 | CVV | cvv-3 | `699` | manque | 699 | oui |  |
| banque-assurance/carte/010 | CVV | cvv-3 | `040` | manque | 040 | oui |  |
| banque-assurance/carte/011 | CVV | cvv-3 | `884` | manque | 884 | oui |  |
| banque-assurance/carte/012 | CVV | cvv-3 | `091` | manque | 091 | oui |  |
| expertise-comptable/facture/005 | IBAN | iban-fr-par-4 | `FR76 0911 8285 7545 9534 6781 263` | partiel | 6781 263 | non | REF, CARTE |
| juridique-fr/assignation/002 | NIR | nir-cle-tiret | `1 53 02 13 263 407 - 86` | partiel | 86 | oui | CIN |
| juridique-fr/assignation/006 | NIR | nir-cle-tiret | `2 15 07 92 510 647 - 52` | partiel | 52 | oui | CIN |
| juridique-fr/assignation/012 | NIR | nir-cle-tiret | `2 25 03 92 868 769 - 82` | partiel | 82 | oui | CIN |
| rh-paie/bulletinFr/003 | NIR | nir-cle-tiret | `1 10 07 31 853 125 - 83` | partiel | 83 | oui | CIN |
| rh-paie/bulletinFr/004 | NIR | nir-cle-tiret | `2 55 10 69 246 885 - 41` | partiel | 41 | oui | CIN |
| rh-paie/bulletinFr/008 | NIR | nir-cle-tiret | `2 61 07 13 710 515 - 77` | partiel | 77 | oui | CIN |
| rh-paie/bulletinFr/010 | NIR | nir-cle-tiret | `2 72 01 13 030 569 - 97` | partiel | 97 | oui | CIN |
| sante/lettreLiaison/001 | NIR | nir-cle-tiret | `2 74 01 67 788 524 - 96` | partiel | 96 | oui | CIN |
| sante/lettreLiaison/002 | NIR | nir-cle-tiret | `1 19 01 92 621 953 - 54` | partiel | 54 | oui | CIN |
| sante/lettreLiaison/003 | NIR | nir-cle-tiret | `2 93 02 2B 404 123 - 09` | partiel | 09 | oui | CIN |
| sante/lettreLiaison/005 | NIR | nir-cle-tiret | `1 70 07 2A 005 393 - 38` | partiel | 38 | oui | CIN |
| sante/lettreLiaison/007 | NIR | nir-cle-tiret | `2 01 02 93 999 223 - 62` | partiel | 62 | oui | CIN |
| sante/lettreLiaison/008 | NIR | nir-cle-tiret | `1 18 11 92 466 679 - 46` | partiel | 46 | oui | CIN |
| sante/lettreLiaison/009 | NIR | nir-cle-tiret | `1 11 09 93 599 385 - 29` | partiel | 29 | oui | CIN |
| banque-assurance/releve/003 | PERSONNE | fr-particule | `Clément Le Roux` | partiel | Roux | oui | PRENOM |
| banque-assurance/releve/004 | PERSONNE | mag-ben-colle | `Cheikh Benjelloun` | partiel | Cheikh | oui | NOM |
| banque-assurance/releve/007 | PERSONNE | mag-ould | `Lahcen Ould Bah` | partiel | Bah | oui | PRENOM |
| core/fiche/010 | PERSONNE | mag-simple · nom-majuscules | `Cheikh SKALLI` | partiel | Cheikh | oui | NOM |
| expertise-comptable/facture/010 | PERSONNE | mag-ben-espace · prenom-apostrophe | `R'kia Ben Moussa` | partiel | R | oui | CODE, PRENOM |
| juridique-fr/assignation/005 | PERSONNE | fr-particule | `Damien de La Fontaine` | partiel | Fontaine | oui | PRENOM |
| juridique-fr/conclusions/001 | PERSONNE | fr-particule | `Sophie de La Fontaine` | partiel | Fontaine | oui | PRENOM |
| juridique-fr/conclusions/001 | PERSONNE | fr-particule · nom-seul | `de La Fontaine` | manque | Fontaine | oui |  |
| juridique-fr/conclusions/008 | PERSONNE | fr-particule | `Lucas Des Roches` | partiel | Roches | oui | PRENOM |
| juridique-fr/conclusions/008 | PERSONNE | fr-particule · nom-seul | `Des Roches` | manque | Roches | oui |  |
| juridique-fr/conclusions/009 | PERSONNE | fr-particule | `Romain Le Roux` | partiel | Roux | oui | PRENOM |
| juridique-fr/conclusions/009 | PERSONNE | fr-particule · nom-seul | `Le Roux` | manque | Roux | oui |  |
| juridique-fr/noteDossier/012 | PERSONNE | fr-particule | `Romain Des Roches` | partiel | Roches | oui | PRENOM |
| sante/ordonnance/012 | PERSONNE | mag-ould · prenom-compose | `Oum-Kalthoum Ould Cheikh` | partiel | Cheikh | oui | NOM |
| banque-assurance/credit/004 | RIB | rib-ma-groupes | `011 752 1263285606303532 80` | partiel | 011 80 | oui | CARTE |
| banque-assurance/credit/012 | RIB | rib-ma-groupes | `350 782 3730023137204845 42` | partiel | 350 42 | oui | CARTE |
| banque-assurance/kyc/007 | RIB | rib-ma-groupes | `230 422 2060615323988897 43` | partiel | 230 43 | oui | CARTE |
| banque-assurance/sinistre/011 | RIB | rib-ma-groupes | `145 998 7978088593679782 05` | partiel | 145 05 | oui | CARTE |
| banque-assurance/sinistreAuto/006 | RIB | rib-ma-par-4 | `0074 4334 2908 9505 0576 9074` | partiel | 0576 9074 | non | CARTE |
| banque-assurance/sinistreAuto/007 | RIB | rib-ma-groupes | `230 631 4396229678749876 16` | partiel | 230 16 | oui | CARTE |
| banque-assurance/sinistreAuto/010 | RIB | rib-ma-groupes | `021 829 6822544840184542 85` | partiel | 021 85 | oui | CARTE |
| banque-assurance/sinistreAuto/012 | RIB | rib-ma-par-4 | `0226 7401 6198 4918 8662 0685` | partiel | 8662 0685 | non | CARTE |
| banque-assurance/virement/012 | RIB | rib-ma-par-4 | `3500 4197 7991 6262 8734 9489` | partiel | 8734 9489 | non | CARTE |
| rh-paie/bulletinMa/003 | RIB | rib-ma-par-4 | `1901 4255 4202 9381 0913 9928` | partiel | 0913 9928 | non | CARTE |
| rh-paie/bulletinMa/009 | RIB | rib-ma-par-4 | `0217 4762 6311 3343 1499 3025` | partiel | 1499 3025 | non | CARTE |
| expertise-comptable/facture/011 | ADRESSE (indirect) | fr-rue | `101 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/assignation/005 | ADRESSE (indirect) | fr-batiment | `Bâtiment C, 90 rue de la République` | manque | République | oui | NOM, PRENOM |
| juridique-fr/assignation/009 | ADRESSE (indirect) | fr-rue | `81 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/003 | ADRESSE (indirect) | fr-rue | `105 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/003 | ADRESSE (indirect) | fr-bis | `17 bis rue de la République` | manque | République | oui |  |
| juridique-fr/conclusions/004 | ADRESSE (indirect) | fr-rue | `63 rue de la République` | manque | République | oui |  |
| juridique-fr/conclusions/007 | ADRESSE (indirect) | fr-bis | `22 bis quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/009 | ADRESSE (indirect) | fr-rue | `99 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/010 | ADRESSE (indirect) | fr-batiment | `Bâtiment C, 28 quai de la Fosse` | manque | Fosse | oui | NOM, PRENOM |
| juridique-fr/conclusions/012 | ADRESSE (indirect) | fr-rue | `52 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/012 | ADRESSE (indirect) | fr-batiment | `Bâtiment A, 16 rue de la République` | manque | République | oui | NOM, PRENOM |
| sante/lettreLiaison/009 | ADRESSE (indirect) | fr-bis | `24 bis rue de la République` | manque | République | oui |  |
| sante/lettreLiaison/011 | ADRESSE (indirect) | fr-bis | `3 bis rue de la République` | manque | République | oui |  |
| sante/lettreLiaison/012 | ADRESSE (indirect) | fr-batiment | `Bâtiment B, 57 rue de la République` | manque | République | oui | NOM, PRENOM |
| banque-assurance/effets/001 | EFFET (indirect) | lcn-7 | `1948346` | manque | 1948346 | oui |  |
| banque-assurance/effets/002 | EFFET (indirect) | lcn-7 | `3210061` | manque | 3210061 | oui |  |
| banque-assurance/effets/003 | EFFET (indirect) | lcn-7 | `9386019` | manque | 9386019 | oui |  |
| banque-assurance/effets/004 | EFFET (indirect) | lcn-7 | `6328422` | manque | 6328422 | oui |  |
| banque-assurance/effets/005 | EFFET (indirect) | lcn-7 | `7653882` | manque | 7653882 | oui |  |
| banque-assurance/effets/006 | EFFET (indirect) | lcn-7 | `4231921` | manque | 4231921 | oui |  |
| banque-assurance/effets/007 | EFFET (indirect) | lcn-7 | `9763246` | manque | 9763246 | oui |  |
| banque-assurance/effets/008 | EFFET (indirect) | lcn-7 | `0054774` | manque | 0054774 | oui |  |
| banque-assurance/effets/009 | EFFET (indirect) | lcn-7 | `0990721` | manque | 0990721 | oui |  |
| banque-assurance/effets/010 | EFFET (indirect) | lcn-7 | `1046345` | manque | 1046345 | oui |  |
| banque-assurance/effets/011 | EFFET (indirect) | lcn-7 | `0917819` | manque | 0917819 | oui |  |
| banque-assurance/effets/012 | EFFET (indirect) | lcn-7 | `0310688` | manque | 0310688 | oui |  |
| banque-assurance/sinistreAuto/001 | IMMAT (indirect) | plaque-ma-barres | `36571 \| E \| 24` | manque | 36571 E 24 | oui |  |
| banque-assurance/sinistreAuto/001 | IMMAT (indirect) | plaque-ma-tirets | `96340-E-88` | manque | 96340 E 88 | oui |  |
| banque-assurance/sinistreAuto/002 | IMMAT (indirect) | plaque-ma-barres | `72345 \| D \| 11` | manque | 72345 D 11 | oui |  |
| banque-assurance/sinistreAuto/002 | IMMAT (indirect) | plaque-ma-slash | `67022/B/11` | partiel | 67022 | oui | REF |
| banque-assurance/sinistreAuto/003 | IMMAT (indirect) | plaque-ma-tirets | `52569-D-64` | manque | 52569 D 64 | oui |  |
| banque-assurance/sinistreAuto/004 | IMMAT (indirect) | plaque-ma-tirets | `40344-B-85` | manque | 40344 B 85 | oui |  |
| banque-assurance/sinistreAuto/004 | IMMAT (indirect) | plaque-ma-tirets | `69612-A-51` | manque | 69612 A 51 | oui |  |
| banque-assurance/sinistreAuto/005 | IMMAT (indirect) | plaque-ma-slash | `77548/B/45` | partiel | 77548 | oui | REF |
| banque-assurance/sinistreAuto/005 | IMMAT (indirect) | plaque-ma-barres | `56363 \| H \| 6` | manque | 56363 H 6 | oui |  |
| banque-assurance/sinistreAuto/006 | IMMAT (indirect) | plaque-ma-barres | `2962 \| A \| 76` | manque | 2962 A 76 | oui |  |
| banque-assurance/sinistreAuto/006 | IMMAT (indirect) | plaque-ma-slash | `67043/H/65` | partiel | 67043 | oui | REF |
| banque-assurance/sinistreAuto/007 | IMMAT (indirect) | plaque-ma-slash | `57227/E/48` | partiel | 57227 | oui | REF |
| banque-assurance/sinistreAuto/007 | IMMAT (indirect) | plaque-ma-tirets | `70173-H-68` | manque | 70173 H 68 | oui |  |
| banque-assurance/sinistreAuto/008 | IMMAT (indirect) | plaque-ma-barres | `91199 \| D \| 49` | manque | 91199 D 49 | oui |  |
| banque-assurance/sinistreAuto/008 | IMMAT (indirect) | plaque-ma-barres | `3449 \| D \| 74` | manque | 3449 D 74 | oui |  |
| banque-assurance/sinistreAuto/009 | IMMAT (indirect) | plaque-ma-tirets | `29373-D-76` | manque | 29373 D 76 | oui |  |
| banque-assurance/sinistreAuto/009 | IMMAT (indirect) | plaque-ma-barres | `11472 \| H \| 26` | manque | 11472 H 26 | oui |  |
| banque-assurance/sinistreAuto/010 | IMMAT (indirect) | plaque-ma-tirets | `63098-A-84` | manque | 63098 A 84 | oui |  |
| banque-assurance/sinistreAuto/010 | IMMAT (indirect) | plaque-ma-slash | `75385/H/43` | partiel | 75385 | oui | REF |
| banque-assurance/sinistreAuto/011 | IMMAT (indirect) | plaque-ma-slash | `40942/B/14` | partiel | 40942 | oui | REF |
| banque-assurance/sinistreAuto/011 | IMMAT (indirect) | plaque-ma-barres | `22017 \| B \| 73` | manque | 22017 B 73 | oui |  |
| banque-assurance/sinistreAuto/012 | IMMAT (indirect) | plaque-ma-barres | `94803 \| A \| 44` | manque | 94803 A 44 | oui |  |
| banque-assurance/sinistreAuto/012 | IMMAT (indirect) | plaque-ma-barres | `55114 \| A \| 39` | manque | 55114 A 39 | oui |  |
| core/fiche/004 | NAISSANCE (indirect) | jj-mm-aaaa | `06/08/1987` | manque | 06 08 1987 | oui |  |
| core/fiche/005 | NAISSANCE (indirect) | lettres | `15 février 1952` | manque | 15 février 1952 | oui |  |
| core/fiche/006 | NAISSANCE (indirect) | lettres | `24 avril 1972` | manque | 24 avril 1972 | oui |  |
| core/fiche/008 | NAISSANCE (indirect) | lettres | `1 novembre 1995` | manque | 1 novembre 1995 | oui |  |
| core/fiche/009 | NAISSANCE (indirect) | lettres | `20 septembre 2004` | manque | 20 septembre 2004 | oui |  |
| core/fiche/014 | NAISSANCE (indirect) | lettres | `16 avril 1962` | manque | 16 avril 1962 | oui |  |
| sante/compteRendu/001 | NAISSANCE (indirect) | lettres | `15 août 1953` | manque | 15 août 1953 | oui |  |
| sante/compteRendu/002 | NAISSANCE (indirect) | lettres | `3 novembre 1975` | manque | 3 novembre 1975 | oui |  |
| sante/compteRendu/003 | NAISSANCE (indirect) | jj-mm-aaaa | `26/08/1997` | manque | 26 08 1997 | oui |  |
| sante/compteRendu/004 | NAISSANCE (indirect) | lettres | `26 mars 1977` | manque | 26 mars 1977 | oui |  |
| sante/compteRendu/005 | NAISSANCE (indirect) | lettres | `4 août 1969` | manque | 4 août 1969 | oui |  |
| sante/compteRendu/006 | NAISSANCE (indirect) | jj-mm-aaaa | `26/08/1997` | manque | 26 08 1997 | oui |  |
| sante/compteRendu/007 | NAISSANCE (indirect) | jj-mm-aaaa | `01/02/1954` | manque | 01 02 1954 | oui |  |
| sante/compteRendu/008 | NAISSANCE (indirect) | lettres | `5 novembre 1985` | manque | 5 novembre 1985 | oui |  |
| sante/compteRendu/009 | NAISSANCE (indirect) | jj-mm-aaaa | `06/11/1992` | manque | 06 11 1992 | oui |  |
| sante/compteRendu/010 | NAISSANCE (indirect) | jj-mm-aaaa | `10/02/1969` | manque | 10 02 1969 | oui |  |
| sante/compteRendu/011 | NAISSANCE (indirect) | lettres | `28 septembre 1989` | manque | 28 septembre 1989 | oui |  |
| sante/compteRendu/012 | NAISSANCE (indirect) | jj-mm-aaaa | `19/04/1973` | manque | 19 04 1973 | oui |  |

## Leurres codés à tort (249)

| Document | Leurre | Valeur | Préfixes |
|---|---|---|---|
| core/courrier/001 | MOT | `Noël` | PRENOM |
| core/mailTransfert/001 | MOT | `Noël` | PRENOM |
| core/mailTransfert/002 | MOT | `Noël` | PRENOM |
| telecom-ma/transcription/005 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/transcription/007 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/transcription/011 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/ticket/003 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/ticket/012 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/portabilite/001 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/002 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/003 | SIGLE | `ANRT` | NOM |
| telecom-ma/portabilite/004 | SIGLE | `ANRT` | NOM |
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
| juridique-fr/conclusions/001 | MOT | `Noël` | PRENOM |
| juridique-fr/conclusions/001 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/002 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/002 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/003 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/003 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/004 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/004 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/005 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/005 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/006 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/007 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/008 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/008 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/009 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/009 | MOT | `Noël` | PRENOM |
| juridique-fr/conclusions/010 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/011 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/011 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/012 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/conclusions/012 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/conclusions/012 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/assignation/010 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/001 | ARTICLE · code-fr | `article R. 4624-31` | REF |
| juridique-fr/noteDossier/003 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/noteDossier/008 | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| juridique-fr/noteDossier/011 | MOT | `Noël` | PRENOM |
| banque-assurance/virement/002 | MOT | `Noël` | PRENOM |
| banque-assurance/kyc/001 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/001 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/001 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/001 | SIGLE | `BAM` | NOM |
| banque-assurance/kyc/002 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/002 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/002 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/002 | SIGLE | `BAM` | NOM |
| banque-assurance/kyc/003 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/003 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/003 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/003 | SIGLE | `BAM` | NOM |
| banque-assurance/kyc/004 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/004 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/004 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/004 | SIGLE | `BAM` | NOM |
| banque-assurance/kyc/005 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/005 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/005 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/006 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/006 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/006 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/007 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/007 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/007 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/007 | SIGLE | `BAM` | NOM |
| banque-assurance/kyc/008 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/008 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/008 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/008 | SIGLE | `BAM` | NOM |
| banque-assurance/kyc/009 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/009 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/009 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/010 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/010 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/010 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/011 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/011 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/011 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/011 | SIGLE | `BAM` | NOM |
| banque-assurance/kyc/012 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/012 | SIGLE | `PPE` | NOM |
| banque-assurance/kyc/012 | SIGLE | `UTRF` | NOM |
| banque-assurance/kyc/012 | SIGLE | `BAM` | NOM |
| banque-assurance/carte/001 | DATE · points | `04.07.2024` | SOCIETE |
| banque-assurance/carte/002 | DATE · jj-mm-aaaa | `25/04/2019` | SOCIETE |
| banque-assurance/carte/004 | DATE · points | `08.03.2023` | SOCIETE |
| banque-assurance/carte/005 | DATE · jj-mm-aaaa | `13/07/2021` | SOCIETE |
| banque-assurance/carte/007 | DATE · points | `04.08.2020` | SOCIETE |
| banque-assurance/carte/008 | DATE · jj-mm-aaaa | `16/12/2024` | SOCIETE |
| banque-assurance/carte/009 | DATE · iso | `2022-09-10` | SOCIETE |
| banque-assurance/carte/010 | DATE · points | `10.10.2023` | SOCIETE |
| banque-assurance/carte/011 | DATE · jj-mm-aaaa | `08/09/2023` | SOCIETE |
| banque-assurance/carte/012 | DATE · jj-mm-aaaa | `12/06/2025` | SOCIETE |
| banque-assurance/effets/001 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/002 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/003 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/004 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/005 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/006 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/007 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/007 | MOT | `Noël` | PRENOM |
| banque-assurance/effets/008 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/009 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/010 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/010 | MOT | `Noël` | PRENOM |
| banque-assurance/effets/011 | SIGLE | `LCN` | NOM |
| banque-assurance/effets/012 | SIGLE | `LCN` | NOM |
| banque-assurance/credit/001 | SIGLE | `TEG` | NOM |
| banque-assurance/credit/002 | SIGLE | `TEG` | NOM |
| banque-assurance/credit/003 | SIGLE | `TAEG` | NOM |
| banque-assurance/credit/004 | SIGLE | `TAEG` | NOM |
| banque-assurance/credit/005 | SIGLE | `TAEG` | NOM |
| banque-assurance/credit/006 | SIGLE | `TAEG` | NOM |
| banque-assurance/credit/007 | SIGLE | `TEG` | NOM |
| banque-assurance/credit/008 | SIGLE | `TAEG` | NOM |
| banque-assurance/credit/009 | SIGLE | `TEG` | NOM |
| banque-assurance/credit/010 | SIGLE | `TAEG` | NOM |
| banque-assurance/credit/011 | SIGLE | `TAEG` | NOM |
| banque-assurance/credit/012 | SIGLE | `TEG` | NOM |
| sante/compteRendu/001 | PRODUIT | `NFS` | NOM |
| sante/compteRendu/001 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/compteRendu/001 | MOT | `Noël` | PRENOM |
| sante/compteRendu/002 | PRODUIT | `ECG` | NOM |
| sante/compteRendu/002 | PRODUIT | `insuline glargine` | CODE |
| sante/compteRendu/004 | PRODUIT | `HbA1c` | REF |
| sante/compteRendu/005 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/compteRendu/006 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/compteRendu/007 | PRODUIT | `HbA1c` | REF |
| sante/compteRendu/007 | PRODUIT | `insuline glargine` | CODE |
| sante/compteRendu/007 | MOT | `Noël` | PRENOM |
| sante/compteRendu/008 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/compteRendu/010 | PRODUIT | `HbA1c` | REF |
| sante/compteRendu/012 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/compteRendu/012 | MOT | `Noël` | PRENOM |
| sante/lettreLiaison/001 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/002 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/lettreLiaison/008 | PRODUIT | `HbA1c` | REF |
| sante/lettreLiaison/008 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/lettreLiaison/008 | MOT | `Noël` | PRENOM |
| sante/lettreLiaison/009 | PRODUIT | `insuline glargine` | CODE |
| sante/lettreLiaison/010 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/011 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/lettreLiaison/012 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/001 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| sante/ordonnance/001 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/002 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/003 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/004 | PRODUIT | `amoxicilline 1 g` | CODE-002 |
| sante/ordonnance/005 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/006 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/008 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/011 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/012 | PRODUIT | `amoxicilline 1 g` | CODE-001 |
| expertise-comptable/grandLivre/002 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/003 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/004 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/005 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/007 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/008 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/009 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/010 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/011 | SIGLE | `PCGE` | NOM |
| expertise-comptable/grandLivre/012 | SIGLE | `PCGE` | NOM |
| expertise-comptable/lettreMission/007 | MOT | `Noël` | PRENOM |
| rh-paie/bulletinMa/001 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · milliers | `71 080,83 MAD` | SOCIETE |
| rh-paie/bulletinMa/001 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/001 | MONTANT · grand | `1 170 078,89 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · centaines | `125,37 MAD` | SOCIETE |
| rh-paie/bulletinMa/002 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/002 | MONTANT · grand | `7 414 824 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · centaines | `953 MAD` | SOCIETE |
| rh-paie/bulletinMa/003 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/003 | MONTANT · grand | `1 359 875 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · grand | `6 881 868 MAD` | SOCIETE |
| rh-paie/bulletinMa/004 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/004 | MONTANT · milliers | `15.234,93 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · milliers | `15 645,04 MAD` | SOCIETE |
| rh-paie/bulletinMa/005 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/005 | MONTANT · centaines | `760,67 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · grand | `7.539.545 MAD` | SOCIETE |
| rh-paie/bulletinMa/006 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/006 | MONTANT · grand | `5.197.452,87 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · grand | `8 299 685,28 MAD` | SOCIETE |
| rh-paie/bulletinMa/007 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/007 | MONTANT · grand | `6.879.574,52 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · centaines | `718,43 MAD` | SOCIETE |
| rh-paie/bulletinMa/008 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/008 | MONTANT · milliers | `90 688,20 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · milliers | `49 891 MAD` | SOCIETE |
| rh-paie/bulletinMa/009 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/009 | MONTANT · milliers | `41.882,49 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · centaines | `350 MAD` | SOCIETE |
| rh-paie/bulletinMa/010 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/010 | MONTANT · milliers | `77 844,45 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · centaines | `236,81 MAD` | SOCIETE |
| rh-paie/bulletinMa/011 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/011 | MONTANT · centaines | `781 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | SIGLE | `AMO` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · grand | `965 000,63 MAD` | SOCIETE |
| rh-paie/bulletinMa/012 | SIGLE | `IR` | SOCIETE |
| rh-paie/bulletinMa/012 | MONTANT · milliers | `16 366,06 MAD` | SOCIETE |
| rh-paie/bulletinFr/001 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/001 | MONTANT · milliers | `23 121,36 €` | SOCIETE |
| rh-paie/bulletinFr/002 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/002 | MONTANT · milliers | `41.219 €` | SOCIETE |
| rh-paie/bulletinFr/003 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/003 | MONTANT · milliers | `22 675,29 €` | SOCIETE |
| rh-paie/bulletinFr/004 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/004 | MONTANT · grand | `8 253 682 €` | SOCIETE |
| rh-paie/bulletinFr/005 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/005 | MONTANT · milliers | `92 557 €` | SOCIETE |
| rh-paie/bulletinFr/006 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/006 | MONTANT · grand | `494 918 €` | SOCIETE |
| rh-paie/bulletinFr/007 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/007 | MONTANT · centaines | `584,48 €` | SOCIETE |
| rh-paie/bulletinFr/008 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/008 | MONTANT · milliers | `77 687,35 €` | SOCIETE |
| rh-paie/bulletinFr/009 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/009 | MONTANT · centaines | `504 €` | SOCIETE |
| rh-paie/bulletinFr/010 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/010 | MONTANT · centaines | `327,49 €` | SOCIETE |
| rh-paie/bulletinFr/011 | SIGLE | `CSG` | SOCIETE |
| rh-paie/bulletinFr/011 | MONTANT · milliers | `51 444 €` | SOCIETE |
| rh-paie/bulletinFr/012 | SIGLE | `CRDS` | SOCIETE |
| rh-paie/bulletinFr/012 | MONTANT · milliers | `69 156 €` | SOCIETE |
| rh-paie/attestation/002 | MOT | `Noël` | PRENOM |
| rh-paie/attestation/007 | MOT | `Noël` | PRENOM |

## Codé hors étiquette (542 passages, 57 distincts — 40 plus fréquents)

Ni une valeur étiquetée, ni un leurre : surtout des mots du gabarit que le verrou ne connaît pas. Sur-coder est sûr, mais rend le texte moins utile à l'IA.

| Passage | Fois |
|---|---:|
| CODE « joignable » | 48 |
| NOM « EMIS » | 18 |
| NOM « RECU » | 18 |
| NOM « VIR » | 18 |
| NOM « VIREMENT » | 18 |
| NOM « TR » | 14 |
| SOCIETE « FICHE CONTACT » | 14 |
| CODE « confraternellement » | 12 |
| CODE « requérante » | 12 |
| CODE « télédéclarations » | 12 |
| NOM « AMIABLE » | 12 |
| NOM « Bien » | 12 |
| NOM « Co-emprunteur » | 12 |
| NOM « Contrôle » | 12 |
| NOM « CRÉDIT » | 12 |
| NOM « CVV » | 12 |
| NOM « DEVANT » | 12 |
| NOM « DOSSIER » | 12 |
| NOM « EXTRAIT » | 12 |
| NOM « INTERNE » | 12 |
| NOM « LIAISON » | 12 |
| NOM « RAS » | 12 |
| NOM « Reprise » | 12 |
| NOM « SAV » | 12 |
| NOM « TICKET » | 12 |
| NOM-001 « FACTURE » | 12 |
| SINISTRE « Police » | 12 |
| SOCIETE « DÉCLARATION DE SINISTRE » | 12 |
| SOCIETE « DEMANDE DE PORTABILITÉ DU NUMÉRO » | 12 |
| SOCIETE « LETTRE DE MISSION » | 12 |
| NOM « CHQ » | 10 |
| NOM « PRLV » | 10 |
| NOM « REMIS » | 10 |
| NOM « CONSOMMATION » | 6 |
| NOM « IMMOBILIER » | 6 |
| NOM « REMISE » | 6 |
| NOM « Syntec » | 6 |
| NOM-003 « Facture » | 6 |
| PRENOM « À » | 6 |
| SOCIETE « PLAISE AU CONSEIL » | 6 |
