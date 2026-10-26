# HT-Bench 0.2.0 — rapport de détection

Moteur Hidden Tokens **v2.30.0** · jeu `50932d2282937e5f…` (synthétique, graine fixe) · 383 documents · 3483 valeurs à coder · 3082 leurres.

Chemin mesuré : anonymiser_fichier sur un .md (MCP stdio, fichier *-anonymise.md écrit sur le poste) — moteur + verrou, pack du document activé par reglages.json ; verrou de sortie mesuré à part sur la réponse de coder_texte. Une valeur compte comme détectée si toutes ses lettres et chiffres sont sous un code (les particules d'un nom — Ben, El, Aït, de… — peuvent rester en clair). Une valeur codée en partie est une fuite : elle compte comme manquée. Définitions complètes : `bench/ht-bench/README.md`.

**Identifiants directs (noms, pièces et identifiants, téléphones, e-mails, IBAN/RIB, IMEI/IMSI) : 100.0 %** (2583/2583) — cible ≥ 99 % par pack.

Verrou de sortie : sur 0 identifiant(s) direct(s) manqué(s) ou partiel(s) par le moteur, 0 resteraient lisibles dans la réponse de coder_texte (le reste est rattrapé par le dernier filet, « [MASQUÉ] » / « ••• » — mais le fichier écrit sur le poste, lui, les contient).

## Par pack

| Pack | Docs | Rappel direct | Cible | Rappel (tout) | Précision | F1 | Leurres codés | « ••• » en sortie |
|---|---:|---:|:-:|---:|---:|---:|---:|---:|
| core | 48 | 100.0 % (342/342) | ✅ | 98.5 % | 96.0 % | 97.2 % | 2/152 (1.3 %) | 0 |
| telecom-ma | 37 | 100.0 % (249/249) | ✅ | 100.0 % | 84.3 % | 91.5 % | 6/158 (3.8 %) | 0 |
| juridique-fr | 38 | 100.0 % (279/279) | ✅ | 99.8 % | 89.9 % | 94.6 % | 36/309 (11.7 %) | 0 |
| banque-assurance | 98 | 100.0 % (657/657) | ✅ | 100.0 % | 86.6 % | 92.8 % | 15/675 (2.2 %) | 0 |
| sante | 38 | 100.0 % (209/209) | ✅ | 96.1 % | 82.2 % | 88.6 % | 27/248 (10.9 %) | 0 |
| expertise-comptable | 86 | 100.0 % (617/617) | ✅ | 98.7 % | 96.6 % | 97.7 % | 1/1154 (0.1 %) | 0 |
| rh-paie | 38 | 100.0 % (230/230) | ✅ | 99.4 % | 95.3 % | 97.3 % | 13/386 (3.4 %) | 24 |

Précision du pack = passages codés qui recouvrent une valeur étiquetée / tous les passages codés : le verrou code tout mot inconnu du lexique, un mot courant codé à tort la fait baisser (cf. « Codé hors étiquette »). « ••• » en sortie : passages masqués par le verrou de sortie dans la réponse de coder_texte (souvent un code déjà posé que le motif d'un pack reconnaît à nouveau : l'IA ne peut plus le citer).

**Aller-retour : ✅** les 383 documents, décodés avec leur clé, rendent le texte d'origine (aucun code imbriqué, aucun morceau de mot recodé).

## Les cinq plus gros écarts (identifiants directs)

| # | Type · écriture | Perdues | Rappel |
|---:|---|---:|---:|

## Par type d'entité

| Type | Direct | Valeurs | Rappel | Partielles | Précision | F1 | Bon préfixe |
|---|:-:|---:|---:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 986 | 100.0 % | 0 | 85.7 % (1911/2231) | 92.3 % | 976/986 |
| CIN — CIN marocaine | oui | 187 | 100.0 % | 0 | 67.3 % (136/202) | 80.5 % | 136/187 |
| NIR — NIR (sécurité sociale, France) | oui | 48 | 100.0 % | 0 | — (0/0) | — | 48/48 |
| CNSS — N° CNSS | oui | 77 | 100.0 % | 0 | 100.0 % (77/77) | 100.0 % | 77/77 |
| ICE — ICE | oui | 164 | 100.0 % | 0 | 99.4 % (164/165) | 99.7 % | 164/164 |
| IF — Identifiant fiscal (IF) | oui | 64 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/64 |
| RC — Registre de commerce (RC) | oui | 57 | 100.0 % | 0 | 100.0 % (57/57) | 100.0 % | 57/57 |
| SIREN — SIREN | oui | 24 | 100.0 % | 0 | 12.6 % (24/191) | 22.3 % | 24/24 |
| SIRET — SIRET | oui | 28 | 100.0 % | 0 | — (0/0) | — | 12/28 |
| TEL — Téléphone | oui | 473 | 100.0 % | 0 | 100.0 % (440/440) | 100.0 % | 440/473 |
| EMAIL — E-mail | oui | 201 | 100.0 % | 0 | 100.0 % (201/201) | 100.0 % | 201/201 |
| IBAN — IBAN | oui | 54 | 100.0 % | 0 | 32.0 % (54/169) | 48.4 % | 54/54 |
| RIB — RIB | oui | 115 | 100.0 % | 0 | — (0/0) | — | 115/115 |
| IMEI — IMEI | oui | 26 | 100.0 % | 0 | 100.0 % (25/25) | 100.0 % | 25/26 |
| IMSI — IMSI | oui | 19 | 100.0 % | 0 | 100.0 % (19/19) | 100.0 % | 19/19 |
| CARTE — Numéro de carte bancaire | oui | 24 | 100.0 % | 0 | 57.1 % (24/42) | 72.7 % | 24/24 |
| CVV — Cryptogramme (CVV / CVC) | oui | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| PASSEPORT — Passeport, titre de séjour, permis | oui | 24 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 24/24 |
| BIC — BIC / SWIFT |  | 24 | 100.0 % | 0 | — (0/0) | — | 0/24 |
| ICCID — ICCID (carte SIM) |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| ADRESSE — Adresse postale |  | 185 | 97.8 % | 0 | 99.5 % (189/190) | 98.6 % | 165/181 |
| SOCIETE — Société |  | 279 | 100.0 % | 0 | 62.8 % (279/444) | 77.2 % | 279/279 |
| NAISSANCE — Date de naissance |  | 86 | 79.1 % | 0 | 100.0 % (68/68) | 88.3 % | 68/68 |
| PATENTE — N° de patente |  | 9 | 100.0 % | 0 | 100.0 % (9/9) | 100.0 % | 9/9 |
| TVA — N° de TVA intracommunautaire |  | 4 | 100.0 % | 0 | 100.0 % (4/4) | 100.0 % | 4/4 |
| MATRICULE — Matricule salarié |  | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| PATIENT — N° de dossier patient / IPP |  | 25 | 100.0 % | 0 | 100.0 % (25/25) | 100.0 % | 25/25 |
| PRATICIEN — Identifiant praticien (INPE, RPPS) |  | 36 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/36 |
| POLICE — N° de police d'assurance |  | 12 | 100.0 % | 0 | 100.0 % (11/11) | 100.0 % | 11/12 |
| SINISTRE — N° de sinistre |  | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| FACTURE — N° de facture / pièce |  | 48 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/48 |
| RG — N° RG / parquet |  | 48 | 100.0 % | 0 | 100.0 % (36/36) | 100.0 % | 36/48 |
| IMMAT — Immatriculation (véhicule) |  | 24 | 100.0 % | 0 | 100.0 % (24/24) | 100.0 % | 24/24 |
| EFFET — N° de chèque ou de LCN |  | 47 | 76.6 % | 0 | 100.0 % (36/36) | 86.7 % | 36/36 |
| CONTRAT — N° de contrat ou de dossier de crédit |  | 25 | 100.0 % | 0 | — (0/0) | — | 24/25 |

Précision(type) = passages codés sous un préfixe de ce type qui recouvrent bien une valeur de ce type. « Bon préfixe » : parmi les valeurs détectées, celles codées sous un préfixe attendu (une valeur codée REF au lieu de SIRET est protégée, mais mal nommée).

## Rappel direct, pack × type

| Pack | CARTE | CIN | CNSS | CVV | EMAIL | IBAN | ICE | IF | IMEI | IMSI | NIR | PASSEPORT | PERSONNE | RC | RIB | SIREN | SIRET | TEL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| core |  | 100.0 % (19) | 100.0 % (1) |  | 100.0 % (57) |  |  |  |  |  | 100.0 % (12) |  | 100.0 % (149) |  |  |  |  | 100.0 % (104) |
| telecom-ma |  | 100.0 % (36) |  |  | 100.0 % (24) |  | 100.0 % (5) |  | 100.0 % (26) | 100.0 % (19) |  |  | 100.0 % (72) |  |  |  |  | 100.0 % (67) |
| juridique-fr |  | 100.0 % (12) |  |  | 100.0 % (24) |  |  |  |  |  | 100.0 % (12) |  | 100.0 % (147) |  |  | 100.0 % (24) | 100.0 % (12) | 100.0 % (48) |
| banque-assurance | 100.0 % (24) | 100.0 % (72) |  | 100.0 % (12) | 100.0 % (24) | 100.0 % (37) | 100.0 % (17) | 100.0 % (7) |  |  |  | 100.0 % (24) | 100.0 % (262) |  | 100.0 % (82) |  |  | 100.0 % (96) |
| sante |  | 100.0 % (12) | 100.0 % (25) |  | 100.0 % (12) |  |  |  |  |  | 100.0 % (12) |  | 100.0 % (99) |  |  |  |  | 100.0 % (49) |
| expertise-comptable |  | 100.0 % (12) | 100.0 % (13) |  | 100.0 % (48) | 100.0 % (5) | 100.0 % (118) | 100.0 % (45) |  |  |  |  | 100.0 % (209) | 100.0 % (45) | 100.0 % (21) |  | 100.0 % (4) | 100.0 % (97) |
| rh-paie |  | 100.0 % (24) | 100.0 % (38) |  | 100.0 % (12) | 100.0 % (12) | 100.0 % (24) | 100.0 % (12) |  |  | 100.0 % (12) |  | 100.0 % (48) | 100.0 % (12) | 100.0 % (12) |  | 100.0 % (12) | 100.0 % (12) |

## Par écriture

| Type · écriture | Direct | Valeurs | Rappel | Partielles |
|---|:-:|---:|---:|---:|
| ADRESSE · fr-batiment |  | 22 | 90.9 % | 0 |
| ADRESSE · fr-bis |  | 24 | 100.0 % | 0 |
| ADRESSE · fr-rue |  | 28 | 92.9 % | 0 |
| ADRESSE · ma-douar-hay |  | 30 | 100.0 % | 0 |
| ADRESSE · ma-lotissement |  | 27 | 100.0 % | 0 |
| ADRESSE · ma-residence |  | 24 | 100.0 % | 0 |
| ADRESSE · ma-rue |  | 30 | 100.0 % | 0 |
| BIC · bic-11 |  | 11 | 100.0 % | 0 |
| BIC · bic-8 |  | 13 | 100.0 % | 0 |
| CARTE · carte-collee | oui | 6 | 100.0 % | 0 |
| CARTE · carte-groupes | oui | 6 | 100.0 % | 0 |
| CARTE · carte-masquee | oui | 2 | 100.0 % | 0 |
| CARTE · carte-tirets | oui | 10 | 100.0 % | 0 |
| CIN · cin-colle | oui | 84 | 100.0 % | 0 |
| CIN · cin-espace | oui | 52 | 100.0 % | 0 |
| CIN · cin-tiret | oui | 51 | 100.0 % | 0 |
| CNSS · cnss-affiliation-7 | oui | 27 | 100.0 % | 0 |
| CNSS · cnss-assure-9 | oui | 50 | 100.0 % | 0 |
| CONTRAT · credit-numerique |  | 13 | 100.0 % | 0 |
| CONTRAT · credit-prefixe |  | 11 | 100.0 % | 0 |
| CONTRAT · — |  | 1 | 100.0 % | 0 |
| CVV · cvv-3 | oui | 12 | 100.0 % | 0 |
| EFFET · cheque-7 |  | 35 | 68.6 % | 0 |
| EFFET · lcn-7 |  | 12 | 100.0 % | 0 |
| EMAIL · generique | oui | 12 | 100.0 % | 0 |
| EMAIL · initiale.nom | oui | 38 | 100.0 % | 0 |
| EMAIL · majuscules | oui | 38 | 100.0 % | 0 |
| EMAIL · nom_prenom | oui | 36 | 100.0 % | 0 |
| EMAIL · prenom.nom | oui | 45 | 100.0 % | 0 |
| EMAIL · prenomnom-chiffres | oui | 32 | 100.0 % | 0 |
| FACTURE · declaration |  | 12 | 100.0 % | 0 |
| FACTURE · lot |  | 12 | 100.0 % | 0 |
| FACTURE · — |  | 24 | 100.0 % | 0 |
| IBAN · iban-fr-colle | oui | 16 | 100.0 % | 0 |
| IBAN · iban-fr-par-4 | oui | 13 | 100.0 % | 0 |
| IBAN · iban-ma-colle | oui | 13 | 100.0 % | 0 |
| IBAN · iban-ma-par-4 | oui | 12 | 100.0 % | 0 |
| ICCID · iccid-colle |  | 12 | 100.0 % | 0 |
| ICE · ice-colle | oui | 112 | 100.0 % | 0 |
| ICE · ice-par-3 | oui | 52 | 100.0 % | 0 |
| IF · if-nombre | oui | 64 | 100.0 % | 0 |
| IMEI · imei-colle | oui | 7 | 100.0 % | 0 |
| IMEI · imei-groupes | oui | 7 | 100.0 % | 0 |
| IMEI · imei-tirets | oui | 12 | 100.0 % | 0 |
| IMMAT · plaque-ma-barres |  | 12 | 100.0 % | 0 |
| IMMAT · plaque-ma-slash |  | 5 | 100.0 % | 0 |
| IMMAT · plaque-ma-tirets |  | 7 | 100.0 % | 0 |
| IMSI · imsi-colle | oui | 19 | 100.0 % | 0 |
| MATRICULE · — |  | 24 | 100.0 % | 0 |
| NAISSANCE · jj-mm-aaaa |  | 43 | 79.1 % | 0 |
| NAISSANCE · lettres |  | 43 | 79.1 % | 0 |
| NIR · nir-cle-tiret | oui | 19 | 100.0 % | 0 |
| NIR · nir-colle | oui | 10 | 100.0 % | 0 |
| NIR · nir-groupes | oui | 19 | 100.0 % | 0 |
| PASSEPORT · passeport-ma | oui | 6 | 100.0 % | 0 |
| PASSEPORT · permis | oui | 12 | 100.0 % | 0 |
| PASSEPORT · titre-sejour | oui | 6 | 100.0 % | 0 |
| PATENTE · patente |  | 9 | 100.0 % | 0 |
| PATIENT · — |  | 25 | 100.0 % | 0 |
| PERSONNE · fr-nom-mot-courant | oui | 38 | 100.0 % | 0 |
| PERSONNE · fr-particule | oui | 42 | 100.0 % | 0 |
| PERSONNE · fr-simple | oui | 190 | 100.0 % | 0 |
| PERSONNE · mag-ait-apostrophe | oui | 18 | 100.0 % | 0 |
| PERSONNE · mag-ait-espace | oui | 33 | 100.0 % | 0 |
| PERSONNE · mag-ait-tiret | oui | 34 | 100.0 % | 0 |
| PERSONNE · mag-ait-trema | oui | 23 | 100.0 % | 0 |
| PERSONNE · mag-al-espace | oui | 32 | 100.0 % | 0 |
| PERSONNE · mag-ben-colle | oui | 42 | 100.0 % | 0 |
| PERSONNE · mag-ben-espace | oui | 53 | 100.0 % | 0 |
| PERSONNE · mag-ben-tiret | oui | 34 | 100.0 % | 0 |
| PERSONNE · mag-double | oui | 87 | 100.0 % | 0 |
| PERSONNE · mag-el-colle | oui | 20 | 100.0 % | 0 |
| PERSONNE · mag-el-espace | oui | 39 | 100.0 % | 0 |
| PERSONNE · mag-el-tiret | oui | 26 | 100.0 % | 0 |
| PERSONNE · mag-ould | oui | 49 | 100.0 % | 0 |
| PERSONNE · mag-simple | oui | 226 | 100.0 % | 0 |
| POLICE · — |  | 12 | 100.0 % | 0 |
| PRATICIEN · — |  | 36 | 100.0 % | 0 |
| RC · rc-nombre | oui | 57 | 100.0 % | 0 |
| RG · parquet |  | 12 | 100.0 % | 0 |
| RG · pourvoi |  | 12 | 100.0 % | 0 |
| RG · rg |  | 24 | 100.0 % | 0 |
| RIB · rib-ma-colle | oui | 30 | 100.0 % | 0 |
| RIB · rib-ma-groupes | oui | 30 | 100.0 % | 0 |
| RIB · rib-ma-par-4 | oui | 26 | 100.0 % | 0 |
| RIB · rib-ma-tirets | oui | 29 | 100.0 % | 0 |
| SINISTRE · — |  | 12 | 100.0 % | 0 |
| SIREN · siren-colle | oui | 12 | 100.0 % | 0 |
| SIREN · siren-groupes | oui | 12 | 100.0 % | 0 |
| SIRET · siret-colle | oui | 16 | 100.0 % | 0 |
| SIRET · siret-groupes | oui | 12 | 100.0 % | 0 |
| SOCIETE · casse-titre |  | 88 | 100.0 % | 0 |
| SOCIETE · majuscules |  | 91 | 100.0 % | 0 |
| SOCIETE · societe-forme |  | 100 | 100.0 % | 0 |
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
| TEL · ma-fixe-00212 | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-intl-3-6 | oui | 8 | 100.0 % | 0 |
| TEL · ma-fixe-intl-colle | oui | 11 | 100.0 % | 0 |
| TEL · ma-fixe-intl-espaces | oui | 7 | 100.0 % | 0 |
| TEL · ma-fixe-intl-tirets | oui | 7 | 100.0 % | 0 |
| TEL · ma-fixe-intl-zero-parenthese | oui | 3 | 100.0 % | 0 |
| TEL · ma-fixe-msisdn-sans-plus | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-national-4-2-2-2 | oui | 11 | 100.0 % | 0 |
| TEL · ma-fixe-national-colle | oui | 11 | 100.0 % | 0 |
| TEL · ma-fixe-national-espaces | oui | 9 | 100.0 % | 0 |
| TEL · ma-fixe-national-points | oui | 13 | 100.0 % | 0 |
| TEL · ma-fixe-national-tirets | oui | 8 | 100.0 % | 0 |
| TEL · ma-mobile-00212 | oui | 25 | 100.0 % | 0 |
| TEL · ma-mobile-espaces-irreguliers | oui | 1 | 100.0 % | 0 |
| TEL · ma-mobile-intl-3-6 | oui | 30 | 100.0 % | 0 |
| TEL · ma-mobile-intl-colle | oui | 17 | 100.0 % | 0 |
| TEL · ma-mobile-intl-espaces | oui | 24 | 100.0 % | 0 |
| TEL · ma-mobile-intl-tirets | oui | 16 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese | oui | 21 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese-colle | oui | 1 | 100.0 % | 0 |
| TEL · ma-mobile-msisdn-sans-plus | oui | 26 | 100.0 % | 0 |
| TEL · ma-mobile-national-4-2-2-2 | oui | 24 | 100.0 % | 0 |
| TEL · ma-mobile-national-colle | oui | 20 | 100.0 % | 0 |
| TEL · ma-mobile-national-espaces | oui | 26 | 100.0 % | 0 |
| TEL · ma-mobile-national-points | oui | 18 | 100.0 % | 0 |
| TEL · ma-mobile-national-tirets | oui | 20 | 100.0 % | 0 |
| TEL · ma-mobile-slash | oui | 1 | 100.0 % | 0 |
| TVA · tva-fr-colle |  | 2 | 100.0 % | 0 |
| TVA · tva-fr-groupes |  | 2 | 100.0 % | 0 |

## Par trait (noms)

| Type · trait | Valeurs | Rappel | Partielles |
|---|---:|---:|---:|
| PERSONNE · cheikh-prenom | 2 | 100.0 % | 0 |
| PERSONNE · minuscules | 10 | 100.0 % | 0 |
| PERSONNE · nom-majuscules | 123 | 100.0 % | 0 |
| PERSONNE · nom-majuscules-avant | 177 | 100.0 % | 0 |
| PERSONNE · nom-seul | 75 | 100.0 % | 0 |
| PERSONNE · prenom-apostrophe | 62 | 100.0 % | 0 |
| PERSONNE · prenom-compose | 125 | 100.0 % | 0 |
| PERSONNE · prenom-seul | 66 | 100.0 % | 0 |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés à tort | Taux |
|---|---:|---:|---:|
| MONTANT — Montant | 1017 | 0 | 0.0 % |
| DATE — Date (hors naissance) | 787 | 0 | 0.0 % |
| ARTICLE — Article ou texte de loi | 88 | 35 | 39.8 % |
| SIGLE — Sigle ou terme du lexique | 463 | 24 | 5.2 % |
| MOT — Mot courant qui ressemble à un nom | 138 | 13 | 9.4 % |
| VILLE — Ville | 205 | 0 | 0.0 % |
| PRODUIT — Offre, opérateur, médicament | 103 | 27 | 26.2 % |
| COMPTE — N° de compte comptable | 104 | 0 | 0.0 % |
| MESURE — Durée, quantité, dosage | 177 | 1 | 0.6 % |

## Valeurs manquées ou partielles (33)

| Document | Type | Écriture | Valeur (synthétique) | Statut | Resté en clair | Vu par l'IA | Préfixes posés |
|---|---|---|---|---|---|:-:|---|
| juridique-fr/conclusions/011 | ADRESSE (indirect) | fr-batiment | `Bâtiment C, 27 quai de la Fosse` | manque | Fosse | oui | NOM |
| rh-paie/bulletinFr/005 | ADRESSE (indirect) | fr-rue | `49 quai de la Fosse` | manque | Fosse | oui |  |
| rh-paie/bulletinFr/009 | ADRESSE (indirect) | fr-batiment | `Bâtiment B, 90 quai de la Fosse` | manque | Fosse | oui |  |
| sante/lettreLiaison/003 | ADRESSE (indirect) | fr-rue | `71 quai de la Fosse` | manque | Fosse | oui |  |
| expertise-comptable/rapprochement/001 | EFFET (indirect) | cheque-7 | `4237529` | manque | 4237529 | oui |  |
| expertise-comptable/rapprochement/002 | EFFET (indirect) | cheque-7 | `4457560` | manque | 4457560 | oui |  |
| expertise-comptable/rapprochement/002 | EFFET (indirect) | cheque-7 | `5347766` | manque | 5347766 | oui |  |
| expertise-comptable/rapprochement/003 | EFFET (indirect) | cheque-7 | `0537828` | manque | 0537828 | oui |  |
| expertise-comptable/rapprochement/003 | EFFET (indirect) | cheque-7 | `3159073` | manque | 3159073 | oui |  |
| expertise-comptable/rapprochement/005 | EFFET (indirect) | cheque-7 | `0744611` | manque | 0744611 | oui |  |
| expertise-comptable/rapprochement/009 | EFFET (indirect) | cheque-7 | `2449558` | manque | 2449558 | oui |  |
| expertise-comptable/rapprochement/010 | EFFET (indirect) | cheque-7 | `7339130` | manque | 7339130 | oui |  |
| expertise-comptable/rapprochement/010 | EFFET (indirect) | cheque-7 | `8691572` | manque | 8691572 | oui |  |
| expertise-comptable/rapprochement/011 | EFFET (indirect) | cheque-7 | `7691163` | manque | 7691163 | oui |  |
| expertise-comptable/rapprochement/012 | EFFET (indirect) | cheque-7 | `5563453` | manque | 5563453 | oui |  |
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

## Leurres codés à tort (100)

| Document | Leurre | Valeur | Préfixes |
|---|---|---|---|
| core/mailTransfert/010 | MOT | `Noël` | PRENOM |
| telecom-ma/ticket/002 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/ticket/005 | PRODUIT | `forfait 4G+ 20 Go` | NOM |
| telecom-ma/ticket/009 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/ticket/011 | PRODUIT | `Fibre 100 Méga` | NOM |
| telecom-ma/portabilite/001 | MOT | `Noël` | PRENOM |
| telecom-ma/portabilite/004 | MOT | `Noël` | PRENOM |
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
| banque-assurance/virement/010 | MOT | `Noël` | PRENOM |
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
| banque-assurance/effets/002 | MOT | `Noël` | PRENOM |
| banque-assurance/effets/007 | MOT | `Noël` | PRENOM |
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
| sante/lettreLiaison/003 | PRODUIT | `insuline glargine` | CODE |
| sante/lettreLiaison/004 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/007 | PRODUIT | `NFS` | NOM |
| sante/lettreLiaison/008 | MOT | `Noël` | PRENOM |
| sante/lettreLiaison/009 | PRODUIT | `HbA1c` | REF |
| sante/lettreLiaison/011 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/006 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/007 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/008 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/009 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/009 | PRODUIT | `insuline glargine` | CODE |
| sante/ordonnance/010 | PRODUIT | `Doliprane 1000 mg` | NOM |
| sante/ordonnance/012 | PRODUIT | `insuline glargine` | CODE |
| expertise-comptable/lettreMission/010 | MOT | `Noël` | PRENOM |
| rh-paie/bulletinFr/001 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/002 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/003 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/004 | SIGLE | `CRDS` | NOM |
| rh-paie/bulletinFr/005 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/006 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/007 | SIGLE | `CRDS` | NOM |
| rh-paie/bulletinFr/008 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/009 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/010 | SIGLE | `CRDS` | NOM |
| rh-paie/bulletinFr/011 | SIGLE | `CSG` | NOM |
| rh-paie/bulletinFr/012 | SIGLE | `CSG` | NOM |
| rh-paie/attestation/009 | MOT | `Noël` | PRENOM |
| core/manuel/sms-darija | MOT · darija | `inchallah` | CODE |
| juridique-fr/manuel/leurres-seuls | ARTICLE · jurisprudence | `Soc., 27 septembre 2023, n° 21-24.782` | POURVOI |
| sante/manuel/transmission-orale | PRODUIT | `insuline glargine` | CODE |
| sante/manuel/transmission-orale | MESURE | `12 UI` | NOM |

## Codé hors étiquette (381 passages, 44 distincts — 40 plus fréquents)

Ni une valeur étiquetée, ni un leurre : surtout des mots du gabarit que le verrou ne connaît pas. Sur-coder est sûr, mais rend le texte moins utile à l'IA.

| Passage | Fois |
|---|---:|
| SOCIETE « FICHE CONTACT » | 14 |
| NOM « RECU » | 13 |
| CODE « confraternellement » | 12 |
| CODE « télédéclarations » | 12 |
| NOM « Bien » | 12 |
| NOM « Co-emprunteur » | 12 |
| NOM « CRÉDIT » | 12 |
| NOM « DEVANT » | 12 |
| NOM « DOSSIER » | 12 |
| NOM « EMIS » | 12 |
| NOM « LIAISON » | 12 |
| NOM « RAS » | 12 |
| NOM « Reprise » | 12 |
| NOM « SAV » | 12 |
| NOM « Télédéclaration » | 12 |
| NOM « TICKET » | 12 |
| NOM « VIREMENT » | 12 |
| SOCIETE « COMPTE RENDU DE CONSULTATION » | 12 |
| SOCIETE « CONSTAT AMIABLE » | 12 |
| SOCIETE « DÉCLARATION DE SINISTRE » | 12 |
| SOCIETE « DEMANDE DE PORTABILITÉ DU NUMÉRO » | 12 |
| SOCIETE « EXTRAIT DU GRAND LIVRE » | 12 |
| SOCIETE « NOTE INTERNE » | 12 |
| SOCIETE « OPPOSITION SUR CARTE BANCAIRE » | 12 |
| SOCIETE « OUVERTURE DE COMPTE » | 12 |
| NOM « REMIS » | 11 |
| NOM « IMMOBILIER » | 7 |
| NOM « Inchallah » | 6 |
| SOCIETE « ORDRE DE VIREMENT PERMANENT » | 6 |
| CODE « choukran » | 5 |
| NOM « CONSOMMATION » | 5 |
| NOM « Salam » | 5 |
| NOM « Syntec » | 5 |
| CODE « glycémique » | 4 |
| SOCIETE « ORDRE DE VIREMENT OCCASIONNEL » | 4 |
| SOCIETE « PLAISE AU CONSEIL » | 4 |
| NOM « GSM » | 3 |
| NOM « Mb » | 3 |
| NOM « Enfant » | 2 |
| NOM « Hamdoullah » | 2 |
