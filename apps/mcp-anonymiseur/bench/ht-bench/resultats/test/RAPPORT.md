# HT-Bench 0.2.0 (jeu test) — rapport de détection

Moteur Hidden Tokens **v2.30.0** · jeu `4881c8d2bc9febe5…` (synthétique, graine fixe) · 366 documents · 3420 valeurs à coder · 3029 leurres.

Chemin mesuré : anonymiser_fichier sur un .md (MCP stdio, fichier *-anonymise.md écrit sur le poste) — moteur + verrou, pack du document activé par reglages.json ; verrou de sortie mesuré à part sur la réponse de coder_texte. Une valeur compte comme détectée si toutes ses lettres et chiffres sont sous un code (les particules d'un nom — Ben, El, Aït, de… — peuvent rester en clair). Une valeur codée en partie est une fuite : elle compte comme manquée. Définitions complètes : `bench/ht-bench/README.md`.

**Identifiants directs (noms, pièces et identifiants, téléphones, e-mails, IBAN/RIB, IMEI/IMSI) : 100.0 %** (2523/2523) — cible ≥ 99 % par pack.

Verrou de sortie : sur 0 identifiant(s) direct(s) manqué(s) ou partiel(s) par le moteur, 0 resteraient lisibles dans la réponse de coder_texte (le reste est rattrapé par le dernier filet, « [MASQUÉ] » / « ••• » — mais le fichier écrit sur le poste, lui, les contient).

## Par pack

| Pack | Docs | Rappel direct | Cible | Rappel (tout) | Précision | F1 | Leurres codés | « ••• » en sortie |
|---|---:|---:|:-:|---:|---:|---:|---:|---:|
| core | 42 | 100.0 % (322/322) | ✅ | 98.4 % | 96.0 % | 97.2 % | 3/141 (2.1 %) | 0 |
| telecom-ma | 36 | 100.0 % (242/242) | ✅ | 100.0 % | 85.3 % | 92.1 % | 5/158 (3.2 %) | 0 |
| juridique-fr | 36 | 100.0 % (276/276) | ✅ | 98.6 % | 90.4 % | 94.3 % | 29/300 (9.7 %) | 0 |
| banque-assurance | 96 | 100.0 % (652/652) | ✅ | 100.0 % | 85.2 % | 92.0 % | 15/676 (2.2 %) | 0 |
| sante | 36 | 100.0 % (204/204) | ✅ | 96.3 % | 82.7 % | 89.0 % | 27/240 (11.3 %) | 0 |
| expertise-comptable | 84 | 100.0 % (599/599) | ✅ | 98.5 % | 96.5 % | 97.5 % | 1/1142 (0.1 %) | 0 |
| rh-paie | 36 | 100.0 % (228/228) | ✅ | 100.0 % | 94.8 % | 97.3 % | 14/372 (3.8 %) | 24 |

Précision du pack = passages codés qui recouvrent une valeur étiquetée / tous les passages codés : le verrou code tout mot inconnu du lexique, un mot courant codé à tort la fait baisser (cf. « Codé hors étiquette »). « ••• » en sortie : passages masqués par le verrou de sortie dans la réponse de coder_texte (souvent un code déjà posé que le motif d'un pack reconnaît à nouveau : l'IA ne peut plus le citer).

**Aller-retour : ✅** les 366 documents, décodés avec leur clé, rendent le texte d'origine (aucun code imbriqué, aucun morceau de mot recodé).

## Les cinq plus gros écarts (identifiants directs)

| # | Type · écriture | Perdues | Rappel |
|---:|---|---:|---:|

## Par type d'entité

| Type | Direct | Valeurs | Rappel | Partielles | Précision | F1 | Bon préfixe |
|---|:-:|---:|---:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 965 | 100.0 % | 0 | 84.3 % (1870/2219) | 91.5 % | 960/965 |
| CIN — CIN marocaine | oui | 192 | 100.0 % | 0 | 73.6 % (159/216) | 84.8 % | 159/192 |
| NIR — NIR (sécurité sociale, France) | oui | 40 | 100.0 % | 0 | — (0/0) | — | 40/40 |
| CNSS — N° CNSS | oui | 72 | 100.0 % | 0 | 100.0 % (72/72) | 100.0 % | 72/72 |
| ICE — ICE | oui | 159 | 100.0 % | 0 | 100.0 % (159/159) | 100.0 % | 159/159 |
| IF — Identifiant fiscal (IF) | oui | 58 | 100.0 % | 0 | 100.0 % (31/31) | 100.0 % | 31/58 |
| RC — Registre de commerce (RC) | oui | 53 | 100.0 % | 0 | 100.0 % (53/53) | 100.0 % | 53/53 |
| SIREN — SIREN | oui | 24 | 100.0 % | 0 | 14.2 % (24/169) | 24.9 % | 24/24 |
| SIRET — SIRET | oui | 31 | 100.0 % | 0 | — (0/0) | — | 12/31 |
| TEL — Téléphone | oui | 462 | 100.0 % | 0 | 100.0 % (431/431) | 100.0 % | 431/462 |
| EMAIL — E-mail | oui | 200 | 100.0 % | 0 | 100.0 % (200/200) | 100.0 % | 200/200 |
| IBAN — IBAN | oui | 55 | 100.0 % | 0 | 33.5 % (55/164) | 50.2 % | 55/55 |
| RIB — RIB | oui | 109 | 100.0 % | 0 | — (0/0) | — | 109/109 |
| IMEI — IMEI | oui | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| IMSI — IMSI | oui | 19 | 100.0 % | 0 | 100.0 % (19/19) | 100.0 % | 19/19 |
| CARTE — Numéro de carte bancaire | oui | 24 | 100.0 % | 0 | 55.8 % (24/43) | 71.6 % | 24/24 |
| CVV — Cryptogramme (CVV / CVC) | oui | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| PASSEPORT — Passeport, titre de séjour, permis | oui | 24 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 24/24 |
| BIC — BIC / SWIFT |  | 24 | 100.0 % | 0 | — (0/0) | — | 0/24 |
| ICCID — ICCID (carte SIM) |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| ADRESSE — Adresse postale |  | 184 | 96.2 % | 0 | 100.0 % (180/180) | 98.1 % | 161/177 |
| SOCIETE — Société |  | 279 | 100.0 % | 0 | 63.0 % (279/443) | 77.3 % | 279/279 |
| NAISSANCE — Date de naissance |  | 86 | 79.1 % | 0 | 100.0 % (68/68) | 88.3 % | 68/68 |
| PATENTE — N° de patente |  | 5 | 100.0 % | 0 | 100.0 % (5/5) | 100.0 % | 5/5 |
| TVA — N° de TVA intracommunautaire |  | 7 | 100.0 % | 0 | 100.0 % (7/7) | 100.0 % | 7/7 |
| MATRICULE — Matricule salarié |  | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| PATIENT — N° de dossier patient / IPP |  | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| PRATICIEN — Identifiant praticien (INPE, RPPS) |  | 36 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/36 |
| POLICE — N° de police d'assurance |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| SINISTRE — N° de sinistre |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| FACTURE — N° de facture / pièce |  | 48 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/48 |
| RG — N° RG / parquet |  | 48 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/48 |
| IMMAT — Immatriculation (véhicule) |  | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| EFFET — N° de chèque ou de LCN |  | 48 | 75.0 % | 0 | 100.0 % (36/36) | 85.7 % | 36/36 |
| CONTRAT — N° de contrat ou de dossier de crédit |  | 24 | 100.0 % | 0 | — (0/0) | — | 24/24 |

Précision(type) = passages codés sous un préfixe de ce type qui recouvrent bien une valeur de ce type. « Bon préfixe » : parmi les valeurs détectées, celles codées sous un préfixe attendu (une valeur codée REF au lieu de SIRET est protégée, mais mal nommée).

## Rappel direct, pack × type

| Pack | CARTE | CIN | CNSS | CVV | EMAIL | IBAN | ICE | IF | IMEI | IMSI | NIR | PASSEPORT | PERSONNE | RC | RIB | SIREN | SIRET | TEL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| core |  | 100.0 % (24) |  |  | 100.0 % (56) |  |  |  |  |  | 100.0 % (4) |  | 100.0 % (140) |  |  |  |  | 100.0 % (98) |
| telecom-ma |  | 100.0 % (36) |  |  | 100.0 % (24) |  | 100.0 % (3) |  | 100.0 % (24) | 100.0 % (19) |  |  | 100.0 % (72) |  |  |  |  | 100.0 % (64) |
| juridique-fr |  | 100.0 % (12) |  |  | 100.0 % (24) |  |  |  |  |  | 100.0 % (12) |  | 100.0 % (144) |  |  | 100.0 % (24) | 100.0 % (12) | 100.0 % (48) |
| banque-assurance | 100.0 % (24) | 100.0 % (72) |  | 100.0 % (12) | 100.0 % (24) | 100.0 % (36) | 100.0 % (19) | 100.0 % (5) |  |  |  | 100.0 % (24) | 100.0 % (260) |  | 100.0 % (80) |  |  | 100.0 % (96) |
| sante |  | 100.0 % (12) | 100.0 % (24) |  | 100.0 % (12) |  |  |  |  |  | 100.0 % (12) |  | 100.0 % (96) |  |  |  |  | 100.0 % (48) |
| expertise-comptable |  | 100.0 % (12) | 100.0 % (12) |  | 100.0 % (48) | 100.0 % (7) | 100.0 % (113) | 100.0 % (41) |  |  |  |  | 100.0 % (205) | 100.0 % (41) | 100.0 % (17) |  | 100.0 % (7) | 100.0 % (96) |
| rh-paie |  | 100.0 % (24) | 100.0 % (36) |  | 100.0 % (12) | 100.0 % (12) | 100.0 % (24) | 100.0 % (12) |  |  | 100.0 % (12) |  | 100.0 % (48) | 100.0 % (12) | 100.0 % (12) |  | 100.0 % (12) | 100.0 % (12) |

## Par écriture

| Type · écriture | Direct | Valeurs | Rappel | Partielles |
|---|:-:|---:|---:|---:|
| ADRESSE · fr-batiment |  | 25 | 96.0 % | 0 |
| ADRESSE · fr-bis |  | 25 | 96.0 % | 0 |
| ADRESSE · fr-rue |  | 21 | 76.2 % | 0 |
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
| CNSS · cnss-affiliation-7 | oui | 24 | 100.0 % | 0 |
| CNSS · cnss-assure-9 | oui | 48 | 100.0 % | 0 |
| CONTRAT · credit-numerique |  | 11 | 100.0 % | 0 |
| CONTRAT · credit-prefixe |  | 13 | 100.0 % | 0 |
| CVV · cvv-3 | oui | 12 | 100.0 % | 0 |
| EFFET · cheque-7 |  | 36 | 66.7 % | 0 |
| EFFET · lcn-7 |  | 12 | 100.0 % | 0 |
| EMAIL · generique | oui | 12 | 100.0 % | 0 |
| EMAIL · initiale.nom | oui | 49 | 100.0 % | 0 |
| EMAIL · majuscules | oui | 41 | 100.0 % | 0 |
| EMAIL · nom_prenom | oui | 37 | 100.0 % | 0 |
| EMAIL · prenom.nom | oui | 29 | 100.0 % | 0 |
| EMAIL · prenomnom-chiffres | oui | 32 | 100.0 % | 0 |
| FACTURE · declaration |  | 12 | 100.0 % | 0 |
| FACTURE · lot |  | 12 | 100.0 % | 0 |
| FACTURE · — |  | 24 | 100.0 % | 0 |
| IBAN · iban-fr-colle | oui | 14 | 100.0 % | 0 |
| IBAN · iban-fr-par-4 | oui | 13 | 100.0 % | 0 |
| IBAN · iban-ma-colle | oui | 13 | 100.0 % | 0 |
| IBAN · iban-ma-par-4 | oui | 15 | 100.0 % | 0 |
| ICCID · iccid-colle |  | 12 | 100.0 % | 0 |
| ICE · ice-colle | oui | 99 | 100.0 % | 0 |
| ICE · ice-par-3 | oui | 60 | 100.0 % | 0 |
| IF · if-nombre | oui | 58 | 100.0 % | 0 |
| IMEI · imei-colle | oui | 7 | 100.0 % | 0 |
| IMEI · imei-groupes | oui | 8 | 100.0 % | 0 |
| IMEI · imei-tirets | oui | 9 | 100.0 % | 0 |
| IMMAT · plaque-ma-barres |  | 10 | 100.0 % | 0 |
| IMMAT · plaque-ma-slash |  | 6 | 100.0 % | 0 |
| IMMAT · plaque-ma-tirets |  | 8 | 100.0 % | 0 |
| IMSI · imsi-colle | oui | 19 | 100.0 % | 0 |
| MATRICULE · — |  | 24 | 100.0 % | 0 |
| NAISSANCE · jj-mm-aaaa |  | 44 | 84.1 % | 0 |
| NAISSANCE · lettres |  | 42 | 73.8 % | 0 |
| NIR · nir-cle-tiret | oui | 14 | 100.0 % | 0 |
| NIR · nir-colle | oui | 15 | 100.0 % | 0 |
| NIR · nir-groupes | oui | 11 | 100.0 % | 0 |
| PASSEPORT · passeport-ma | oui | 5 | 100.0 % | 0 |
| PASSEPORT · permis | oui | 12 | 100.0 % | 0 |
| PASSEPORT · titre-sejour | oui | 7 | 100.0 % | 0 |
| PATENTE · patente |  | 5 | 100.0 % | 0 |
| PATIENT · — |  | 24 | 100.0 % | 0 |
| PERSONNE · fr-nom-mot-courant | oui | 37 | 100.0 % | 0 |
| PERSONNE · fr-particule | oui | 34 | 100.0 % | 0 |
| PERSONNE · fr-simple | oui | 206 | 100.0 % | 0 |
| PERSONNE · mag-ait-apostrophe | oui | 29 | 100.0 % | 0 |
| PERSONNE · mag-ait-espace | oui | 35 | 100.0 % | 0 |
| PERSONNE · mag-ait-tiret | oui | 43 | 100.0 % | 0 |
| PERSONNE · mag-ait-trema | oui | 34 | 100.0 % | 0 |
| PERSONNE · mag-al-espace | oui | 20 | 100.0 % | 0 |
| PERSONNE · mag-ben-colle | oui | 17 | 100.0 % | 0 |
| PERSONNE · mag-ben-espace | oui | 58 | 100.0 % | 0 |
| PERSONNE · mag-ben-tiret | oui | 27 | 100.0 % | 0 |
| PERSONNE · mag-double | oui | 90 | 100.0 % | 0 |
| PERSONNE · mag-el-colle | oui | 25 | 100.0 % | 0 |
| PERSONNE · mag-el-espace | oui | 50 | 100.0 % | 0 |
| PERSONNE · mag-el-tiret | oui | 18 | 100.0 % | 0 |
| PERSONNE · mag-ould | oui | 37 | 100.0 % | 0 |
| PERSONNE · mag-simple | oui | 205 | 100.0 % | 0 |
| POLICE · — |  | 12 | 100.0 % | 0 |
| PRATICIEN · — |  | 36 | 100.0 % | 0 |
| RC · rc-nombre | oui | 53 | 100.0 % | 0 |
| RG · parquet |  | 12 | 100.0 % | 0 |
| RG · pourvoi |  | 12 | 100.0 % | 0 |
| RG · rg |  | 24 | 100.0 % | 0 |
| RIB · rib-ma-colle | oui | 33 | 100.0 % | 0 |
| RIB · rib-ma-groupes | oui | 32 | 100.0 % | 0 |
| RIB · rib-ma-par-4 | oui | 26 | 100.0 % | 0 |
| RIB · rib-ma-tirets | oui | 18 | 100.0 % | 0 |
| SINISTRE · — |  | 12 | 100.0 % | 0 |
| SIREN · siren-colle | oui | 13 | 100.0 % | 0 |
| SIREN · siren-groupes | oui | 11 | 100.0 % | 0 |
| SIRET · siret-colle | oui | 18 | 100.0 % | 0 |
| SIRET · siret-groupes | oui | 13 | 100.0 % | 0 |
| SOCIETE · casse-titre |  | 93 | 100.0 % | 0 |
| SOCIETE · majuscules |  | 93 | 100.0 % | 0 |
| SOCIETE · societe-forme |  | 93 | 100.0 % | 0 |
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
| TEL · ma-fixe-intl-3-6 | oui | 9 | 100.0 % | 0 |
| TEL · ma-fixe-intl-colle | oui | 9 | 100.0 % | 0 |
| TEL · ma-fixe-intl-espaces | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-intl-tirets | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-intl-zero-parenthese | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-msisdn-sans-plus | oui | 10 | 100.0 % | 0 |
| TEL · ma-fixe-national-4-2-2-2 | oui | 12 | 100.0 % | 0 |
| TEL · ma-fixe-national-colle | oui | 13 | 100.0 % | 0 |
| TEL · ma-fixe-national-espaces | oui | 9 | 100.0 % | 0 |
| TEL · ma-fixe-national-points | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-national-tirets | oui | 7 | 100.0 % | 0 |
| TEL · ma-mobile-00212 | oui | 25 | 100.0 % | 0 |
| TEL · ma-mobile-intl-3-6 | oui | 28 | 100.0 % | 0 |
| TEL · ma-mobile-intl-colle | oui | 20 | 100.0 % | 0 |
| TEL · ma-mobile-intl-espaces | oui | 27 | 100.0 % | 0 |
| TEL · ma-mobile-intl-tirets | oui | 21 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese | oui | 21 | 100.0 % | 0 |
| TEL · ma-mobile-msisdn-sans-plus | oui | 20 | 100.0 % | 0 |
| TEL · ma-mobile-national-4-2-2-2 | oui | 25 | 100.0 % | 0 |
| TEL · ma-mobile-national-colle | oui | 26 | 100.0 % | 0 |
| TEL · ma-mobile-national-espaces | oui | 19 | 100.0 % | 0 |
| TEL · ma-mobile-national-points | oui | 26 | 100.0 % | 0 |
| TEL · ma-mobile-national-tirets | oui | 16 | 100.0 % | 0 |
| TVA · tva-fr-colle |  | 2 | 100.0 % | 0 |
| TVA · tva-fr-groupes |  | 5 | 100.0 % | 0 |

## Par trait (noms)

| Type · trait | Valeurs | Rappel | Partielles |
|---|---:|---:|---:|
| PERSONNE · minuscules | 6 | 100.0 % | 0 |
| PERSONNE · nom-majuscules | 101 | 100.0 % | 0 |
| PERSONNE · nom-majuscules-avant | 184 | 100.0 % | 0 |
| PERSONNE · nom-seul | 74 | 100.0 % | 0 |
| PERSONNE · prenom-apostrophe | 56 | 100.0 % | 0 |
| PERSONNE · prenom-compose | 137 | 100.0 % | 0 |
| PERSONNE · prenom-seul | 64 | 100.0 % | 0 |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés à tort | Taux |
|---|---:|---:|---:|
| MONTANT — Montant | 1002 | 0 | 0.0 % |
| DATE — Date (hors naissance) | 785 | 0 | 0.0 % |
| ARTICLE — Article ou texte de loi | 84 | 26 | 31.0 % |
| SIGLE — Sigle ou terme du lexique | 456 | 24 | 5.3 % |
| MOT — Mot courant qui ressemble à un nom | 130 | 16 | 12.3 % |
| VILLE — Ville | 201 | 0 | 0.0 % |
| PRODUIT — Offre, opérateur, médicament | 103 | 28 | 27.2 % |
| COMPTE — N° de compte comptable | 100 | 0 | 0.0 % |
| MESURE — Durée, quantité, dosage | 168 | 0 | 0.0 % |

## Valeurs manquées ou partielles (37)

| Document | Type | Écriture | Valeur (synthétique) | Statut | Resté en clair | Vu par l'IA | Préfixes posés |
|---|---|---|---|---|---|:-:|---|
| expertise-comptable/facture/011 | ADRESSE (indirect) | fr-rue | `101 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/assignation/009 | ADRESSE (indirect) | fr-rue | `81 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/003 | ADRESSE (indirect) | fr-rue | `105 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/007 | ADRESSE (indirect) | fr-bis | `22 bis quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/009 | ADRESSE (indirect) | fr-rue | `99 quai de la Fosse` | manque | Fosse | oui |  |
| juridique-fr/conclusions/010 | ADRESSE (indirect) | fr-batiment | `Bâtiment C, 28 quai de la Fosse` | manque | Fosse | oui | NOM |
| juridique-fr/conclusions/012 | ADRESSE (indirect) | fr-rue | `52 quai de la Fosse` | manque | Fosse | oui |  |
| expertise-comptable/rapprochement/002 | EFFET (indirect) | cheque-7 | `9741521` | manque | 9741521 | oui |  |
| expertise-comptable/rapprochement/002 | EFFET (indirect) | cheque-7 | `2372484` | manque | 2372484 | oui |  |
| expertise-comptable/rapprochement/002 | EFFET (indirect) | cheque-7 | `1861490` | manque | 1861490 | oui |  |
| expertise-comptable/rapprochement/004 | EFFET (indirect) | cheque-7 | `9715629` | manque | 9715629 | oui |  |
| expertise-comptable/rapprochement/004 | EFFET (indirect) | cheque-7 | `1554378` | manque | 1554378 | oui |  |
| expertise-comptable/rapprochement/005 | EFFET (indirect) | cheque-7 | `3104208` | manque | 3104208 | oui |  |
| expertise-comptable/rapprochement/006 | EFFET (indirect) | cheque-7 | `0427578` | manque | 0427578 | oui |  |
| expertise-comptable/rapprochement/007 | EFFET (indirect) | cheque-7 | `0967775` | manque | 0967775 | oui |  |
| expertise-comptable/rapprochement/009 | EFFET (indirect) | cheque-7 | `9012630` | manque | 9012630 | oui |  |
| expertise-comptable/rapprochement/010 | EFFET (indirect) | cheque-7 | `3245471` | manque | 3245471 | oui |  |
| expertise-comptable/rapprochement/010 | EFFET (indirect) | cheque-7 | `7459442` | manque | 7459442 | oui |  |
| expertise-comptable/rapprochement/011 | EFFET (indirect) | cheque-7 | `1147693` | manque | 1147693 | oui |  |
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

## Leurres codés à tort (94)

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
| banque-assurance/kyc/002 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/003 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/004 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/005 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/006 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/007 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/008 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/009 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/010 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/011 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/kyc/012 | SIGLE | `KYC` | SOCIETE |
| banque-assurance/effets/007 | MOT | `Noël` | PRENOM |
| banque-assurance/effets/010 | MOT | `Noël` | PRENOM |
| sante/compteRendu/001 | PRODUIT | `NFS` | NOM |
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
| sante/compteRendu/012 | MOT | `Noël` | PRENOM |
| sante/lettreLiaison/001 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/008 | PRODUIT | `HbA1c` | REF |
| sante/lettreLiaison/008 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/lettreLiaison/008 | MOT | `Noël` | PRENOM |
| sante/lettreLiaison/009 | PRODUIT | `insuline glargine` | CODE |
| sante/lettreLiaison/010 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/012 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/001 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/002 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/003 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/005 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/006 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/008 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/011 | PRODUIT | `Doliprane 1000 mg` | NOM |
| expertise-comptable/lettreMission/007 | MOT | `Noël` | PRENOM |
| rh-paie/bulletinFr/001 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/002 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/003 | SIGLE | `CRDS` | NOM |
| rh-paie/bulletinFr/004 | SIGLE | `CRDS` | NOM |
| rh-paie/bulletinFr/005 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/006 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/007 | SIGLE | `CRDS` | NOM |
| rh-paie/bulletinFr/008 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/009 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/010 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/011 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/012 | SIGLE | `CRDS` | NOM |
| rh-paie/attestation/002 | MOT | `Noël` | PRENOM |
| rh-paie/attestation/007 | MOT | `Noël` | PRENOM |

## Codé hors étiquette (393 passages, 41 distincts — 40 plus fréquents)

Ni une valeur étiquetée, ni un leurre : surtout des mots du gabarit que le verrou ne connaît pas. Sur-coder est sûr, mais rend le texte moins utile à l'IA.

| Passage | Fois |
|---|---:|
| NOM « EMIS » | 18 |
| NOM « RECU » | 18 |
| NOM « VIREMENT » | 18 |
| SOCIETE « FICHE CONTACT » | 14 |
| CODE « confraternellement » | 12 |
| CODE « télédéclarations » | 12 |
| NOM « Bien » | 12 |
| NOM « Co-emprunteur » | 12 |
| NOM « CRÉDIT » | 12 |
| NOM « DEVANT » | 12 |
| NOM « DOSSIER » | 12 |
| NOM « LIAISON » | 12 |
| NOM « RAS » | 12 |
| NOM « Reprise » | 12 |
| NOM « SAV » | 12 |
| NOM « Télédéclaration » | 12 |
| NOM « TICKET » | 12 |
| SOCIETE « COMPTE RENDU DE CONSULTATION » | 12 |
| SOCIETE « CONSTAT AMIABLE » | 12 |
| SOCIETE « DÉCLARATION DE SINISTRE » | 12 |
| SOCIETE « DEMANDE DE PORTABILITÉ DU NUMÉRO » | 12 |
| SOCIETE « EXTRAIT DU GRAND LIVRE » | 12 |
| SOCIETE « NOTE INTERNE » | 12 |
| SOCIETE « OPPOSITION SUR CARTE BANCAIRE » | 12 |
| SOCIETE « OUVERTURE DE COMPTE » | 12 |
| NOM « REMIS » | 10 |
| NOM « CONSOMMATION » | 6 |
| NOM « IMMOBILIER » | 6 |
| NOM « REMISE » | 6 |
| NOM « Syntec » | 6 |
| SOCIETE « PLAISE AU CONSEIL » | 6 |
| NOM « Hamdoullah » | 5 |
| NOM « Salam » | 5 |
| SOCIETE « ORDRE DE VIREMENT INTERNATIONAL » | 5 |
| SOCIETE « ORDRE DE VIREMENT PERMANENT » | 4 |
| NOM « GSM » | 3 |
| NOM « Inchallah » | 3 |
| SOCIETE « ORDRE DE VIREMENT OCCASIONNEL » | 3 |
| CODE « glycémique » | 2 |
| NOM « Mb » | 2 |
