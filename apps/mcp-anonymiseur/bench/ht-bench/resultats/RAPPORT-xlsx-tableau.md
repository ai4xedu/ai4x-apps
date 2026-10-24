# HT-Bench 0.2.0 — rapport de détection, chemin xlsx-tableau

Moteur Hidden Tokens **v2.22.0** · jeu `393d374e88cb6f29…` (synthétique, graine fixe) · 28 documents · 976 valeurs à coder · 389 leurres.

Chemin mesuré : anonymiser_fichier sur un .xlsx en mode tableau (exports : une ligne d'en-têtes, une ligne par enregistrement ; colonnes reconnues codées en entier, verrou sur le reste) ; on relit les cellules de *-anonymise.xlsx. Une valeur compte comme détectée si toutes ses lettres et chiffres sont sous un code (les particules d'un nom — Ben, El, Aït, de… — peuvent rester en clair). Une valeur codée en partie est une fuite : elle compte comme manquée. Définitions complètes : `bench/ht-bench/README.md`.

**Identifiants directs (noms, pièces et identifiants, téléphones, e-mails, IBAN/RIB, IMEI/IMSI) : 99.8 %** (805/807) — cible ≥ 99 % par pack.

## Par pack

| Pack | Docs | Rappel direct | Cible | Rappel (tout) | Précision | F1 | Leurres codés | Texte lisible |
|---|---:|---:|:-:|---:|---:|---:|---:|---:|
| banque-assurance | 4 | 91.7 % (22/24) | ❌ | 91.7 % | 40.2 % | 55.9 % | 9/99 (9.1 %) | 80.7 % |
| core | 4 | 100.0 % (153/153) | ✅ | 100.0 % | 84.5 % | 91.6 % | 8/58 (13.8 %) | 79.6 % |
| expertise-comptable | 4 | 100.0 % (186/186) | ✅ | 100.0 % | 87.5 % | 93.3 % | 31/31 (100.0 %) | 55.0 % |
| juridique-fr | 4 | 100.0 % (109/109) | ✅ | 100.0 % | 100.0 % | 100.0 % | 0/30 (0.0 %) | 95.4 % |
| rh-paie | 4 | 100.0 % (124/124) | ✅ | 100.0 % | 100.0 % | 100.0 % | 0/93 (0.0 %) | 100.0 % |
| sante | 4 | 100.0 % (99/99) | ✅ | 80.0 % | 92.3 % | 85.7 % | 11/33 (33.3 %) | 79.8 % |
| telecom-ma | 4 | 100.0 % (112/112) | ✅ | 100.0 % | 88.5 % | 93.9 % | 15/45 (33.3 %) | 92.7 % |

Texte lisible = part des lettres et chiffres hors de toute valeur étiquetée (le texte du document, leurres compris) restée en clair. Précision du pack = passages codés qui recouvrent une valeur étiquetée / tous les passages codés : le verrou code tout mot inconnu du lexique, un mot courant codé à tort la fait baisser (cf. « Codé hors étiquette »). « ••• » en sortie : passages masqués par le verrou de sortie dans la réponse de coder_texte (souvent un code déjà posé que le motif d'un pack reconnaît à nouveau : l'IA ne peut plus le citer).

## Par langue

| Langue | Docs | Rappel direct | Rappel (tout) | Précision | Leurres codés | Texte lisible |
|---|---:|---:|---:|---:|---:|---:|
| fr — français | 24 | 99.7 % (652/654) | 95.7 % | 86.8 % | 66/331 (19.9 %) | 87.4 % |
| fr-ar — bilingue français / arabe | 4 | 100.0 % (153/153) | 100.0 % | 84.5 % | 8/58 (13.8 %) | 79.6 % |

**Sortie corrompue : 1 document(s)** dont le texte codé n'est plus « l'origine + des codes » (codes imbriqués comme `NOM-001-002`, morceau de mot recodé) — core : 1. La valeur est protégée, mais le décodage ne rend pas le texte d'origine. Ces documents sont notés par plus longue sous-suite commune (cf. README).

## Les 2 plus gros écarts (identifiants directs)

| # | Type · écriture | Perdues | Rappel |
|---:|---|---:|---:|
| 1 | PERSONNE · mag-ben-espace | 1/22 (dont 1 partielles) | 95.5 % |
| 2 | PERSONNE · mag-double | 1/34 (dont 1 partielles) | 97.1 % |

## Par type d'entité

| Type | Direct | Valeurs | Rappel | Partielles | Précision | F1 | Bon préfixe |
|---|:-:|---:|---:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 356 | 99.4 % | 2 | 79.0 % (263/333) | 88.0 % | 240/354 |
| CIN — CIN marocaine | oui | 65 | 100.0 % | 0 | 100.0 % (64/64) | 100.0 % | 64/65 |
| CNSS — N° CNSS | oui | 31 | 100.0 % | 0 | 100.0 % (31/31) | 100.0 % | 31/31 |
| ICE — ICE | oui | 31 | 100.0 % | 0 | 100.0 % (31/31) | 100.0 % | 31/31 |
| IF — Identifiant fiscal (IF) | oui | 31 | 100.0 % | 0 | 100.0 % (31/31) | 100.0 % | 31/31 |
| RC — Registre de commerce (RC) | oui | 31 | 100.0 % | 0 | 100.0 % (31/31) | 100.0 % | 31/31 |
| TEL — Téléphone | oui | 163 | 100.0 % | 0 | 84.4 % (162/192) | 91.5 % | 162/163 |
| EMAIL — E-mail | oui | 51 | 100.0 % | 0 | 100.0 % (51/51) | 100.0 % | 51/51 |
| RIB — RIB | oui | 36 | 100.0 % | 0 | — (0/0) | — | 36/36 |
| IMEI — IMEI | oui | 12 | 100.0 % | 0 | 100.0 % (12/12) | 100.0 % | 12/12 |
| SOCIETE — Société |  | 42 | 100.0 % | 0 | 100.0 % (31/31) | 100.0 % | 31/42 |
| NAISSANCE — Date de naissance |  | 33 | 0.0 % | 0 | — (0/0) | — | 0/0 |
| MATRICULE — Matricule salarié |  | 31 | 100.0 % | 0 | 100.0 % (31/31) | 100.0 % | 31/31 |
| PATIENT — N° de dossier patient / IPP |  | 33 | 100.0 % | 0 | 50.0 % (33/66) | 66.7 % | 33/33 |
| RG — N° RG / parquet |  | 30 | 100.0 % | 0 | — (0/0) | — | 30/30 |

Précision(type) = passages codés sous un préfixe de ce type qui recouvrent bien une valeur de ce type. « Bon préfixe » : parmi les valeurs détectées, celles codées sous un préfixe attendu (une valeur codée REF au lieu de SIRET est protégée, mais mal nommée).

## Rappel direct, pack × type

| Pack | CIN | CNSS | EMAIL | ICE | IF | IMEI | PERSONNE | RC | RIB | TEL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| banque-assurance | 100.0 % (3) |  |  |  |  |  | 87.5 % (16) |  | 100.0 % (5) |  |
| core | 100.0 % (27) |  | 100.0 % (20) |  |  |  | 100.0 % (73) |  |  | 100.0 % (33) |
| expertise-comptable |  |  | 100.0 % (31) | 100.0 % (31) | 100.0 % (31) |  | 100.0 % (31) | 100.0 % (31) |  | 100.0 % (31) |
| juridique-fr |  |  |  |  |  |  | 100.0 % (79) |  |  | 100.0 % (30) |
| rh-paie | 100.0 % (31) | 100.0 % (31) |  |  |  |  | 100.0 % (31) |  | 100.0 % (31) |  |
| sante |  |  |  |  |  |  | 100.0 % (66) |  |  | 100.0 % (33) |
| telecom-ma | 100.0 % (4) |  |  |  |  | 100.0 % (12) | 100.0 % (60) |  |  | 100.0 % (36) |

## Par écriture

| Type · écriture | Direct | Valeurs | Rappel | Partielles |
|---|:-:|---:|---:|---:|
| CIN · cin-colle | oui | 37 | 100.0 % | 0 |
| CIN · cin-espace | oui | 11 | 100.0 % | 0 |
| CIN · cin-tiret | oui | 17 | 100.0 % | 0 |
| CNSS · cnss-assure-9 | oui | 31 | 100.0 % | 0 |
| EMAIL · initiale.nom | oui | 7 | 100.0 % | 0 |
| EMAIL · majuscules | oui | 7 | 100.0 % | 0 |
| EMAIL · nom_prenom | oui | 10 | 100.0 % | 0 |
| EMAIL · prenom.nom | oui | 16 | 100.0 % | 0 |
| EMAIL · prenomnom-chiffres | oui | 11 | 100.0 % | 0 |
| ICE · ice-colle | oui | 21 | 100.0 % | 0 |
| ICE · ice-par-3 | oui | 10 | 100.0 % | 0 |
| IF · if-nombre | oui | 31 | 100.0 % | 0 |
| IMEI · imei-colle | oui | 5 | 100.0 % | 0 |
| IMEI · imei-groupes | oui | 3 | 100.0 % | 0 |
| IMEI · imei-tirets | oui | 4 | 100.0 % | 0 |
| MATRICULE · — |  | 31 | 100.0 % | 0 |
| NAISSANCE · jj-mm-aaaa |  | 16 | 0.0 % | 0 |
| NAISSANCE · lettres |  | 17 | 0.0 % | 0 |
| PATIENT · — |  | 33 | 100.0 % | 0 |
| PERSONNE · ar-ait | oui | 3 | 100.0 % | 0 |
| PERSONNE · ar-ben | oui | 9 | 100.0 % | 0 |
| PERSONNE · ar-double | oui | 4 | 100.0 % | 0 |
| PERSONNE · ar-nasab | oui | 1 | 100.0 % | 0 |
| PERSONNE · ar-simple | oui | 12 | 100.0 % | 0 |
| PERSONNE · arabizi | oui | 6 | 100.0 % | 0 |
| PERSONNE · fr-nom-mot-courant | oui | 13 | 100.0 % | 0 |
| PERSONNE · fr-particule | oui | 13 | 100.0 % | 0 |
| PERSONNE · fr-simple | oui | 58 | 100.0 % | 0 |
| PERSONNE · mag-ait-apostrophe | oui | 4 | 100.0 % | 0 |
| PERSONNE · mag-ait-espace | oui | 11 | 100.0 % | 0 |
| PERSONNE · mag-ait-tiret | oui | 12 | 100.0 % | 0 |
| PERSONNE · mag-ait-trema | oui | 3 | 100.0 % | 0 |
| PERSONNE · mag-al-espace | oui | 2 | 100.0 % | 0 |
| PERSONNE · mag-ben-colle | oui | 8 | 100.0 % | 0 |
| PERSONNE · mag-ben-espace | oui | 22 | 95.5 % | 1 |
| PERSONNE · mag-ben-tiret | oui | 5 | 100.0 % | 0 |
| PERSONNE · mag-double | oui | 34 | 97.1 % | 1 |
| PERSONNE · mag-el-colle | oui | 4 | 100.0 % | 0 |
| PERSONNE · mag-el-espace | oui | 11 | 100.0 % | 0 |
| PERSONNE · mag-el-tiret | oui | 9 | 100.0 % | 0 |
| PERSONNE · mag-ould | oui | 9 | 100.0 % | 0 |
| PERSONNE · mag-simple | oui | 49 | 100.0 % | 0 |
| PERSONNE · mag-translitteration | oui | 54 | 100.0 % | 0 |
| RC · rc-nombre | oui | 31 | 100.0 % | 0 |
| RG · rg |  | 30 | 100.0 % | 0 |
| RIB · rib-ma-colle | oui | 36 | 100.0 % | 0 |
| SOCIETE · casse-titre |  | 17 | 100.0 % | 0 |
| SOCIETE · majuscules |  | 14 | 100.0 % | 0 |
| SOCIETE · societe-forme |  | 11 | 100.0 % | 0 |
| TEL · excel-nombre | oui | 20 | 100.0 % | 0 |
| TEL · fr-fixe-intl-colle | oui | 3 | 100.0 % | 0 |
| TEL · fr-fixe-intl-zero-parenthese | oui | 2 | 100.0 % | 0 |
| TEL · fr-fixe-national-points | oui | 1 | 100.0 % | 0 |
| TEL · fr-fixe-national-tirets | oui | 1 | 100.0 % | 0 |
| TEL · fr-mobile-0033 | oui | 1 | 100.0 % | 0 |
| TEL · fr-mobile-intl-colle | oui | 2 | 100.0 % | 0 |
| TEL · fr-mobile-intl-espaces | oui | 1 | 100.0 % | 0 |
| TEL · fr-mobile-intl-zero-parenthese | oui | 1 | 100.0 % | 0 |
| TEL · fr-mobile-national-espaces | oui | 1 | 100.0 % | 0 |
| TEL · fr-mobile-national-points | oui | 1 | 100.0 % | 0 |
| TEL · fr-mobile-national-tirets | oui | 1 | 100.0 % | 0 |
| TEL · ma-fixe-00212 | oui | 2 | 100.0 % | 0 |
| TEL · ma-fixe-intl-3-6 | oui | 1 | 100.0 % | 0 |
| TEL · ma-fixe-intl-colle | oui | 2 | 100.0 % | 0 |
| TEL · ma-fixe-intl-espaces | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-intl-tirets | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-intl-zero-parenthese | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-msisdn-sans-plus | oui | 5 | 100.0 % | 0 |
| TEL · ma-fixe-national-4-2-2-2 | oui | 4 | 100.0 % | 0 |
| TEL · ma-fixe-national-colle | oui | 3 | 100.0 % | 0 |
| TEL · ma-fixe-national-espaces | oui | 1 | 100.0 % | 0 |
| TEL · ma-fixe-national-points | oui | 1 | 100.0 % | 0 |
| TEL · ma-fixe-national-tirets | oui | 2 | 100.0 % | 0 |
| TEL · ma-mobile-00212 | oui | 6 | 100.0 % | 0 |
| TEL · ma-mobile-intl-3-6 | oui | 7 | 100.0 % | 0 |
| TEL · ma-mobile-intl-colle | oui | 11 | 100.0 % | 0 |
| TEL · ma-mobile-intl-espaces | oui | 6 | 100.0 % | 0 |
| TEL · ma-mobile-intl-tirets | oui | 8 | 100.0 % | 0 |
| TEL · ma-mobile-intl-zero-parenthese | oui | 7 | 100.0 % | 0 |
| TEL · ma-mobile-msisdn-sans-plus | oui | 6 | 100.0 % | 0 |
| TEL · ma-mobile-national-4-2-2-2 | oui | 6 | 100.0 % | 0 |
| TEL · ma-mobile-national-colle | oui | 8 | 100.0 % | 0 |
| TEL · ma-mobile-national-espaces | oui | 12 | 100.0 % | 0 |
| TEL · ma-mobile-national-points | oui | 8 | 100.0 % | 0 |
| TEL · ma-mobile-national-tirets | oui | 9 | 100.0 % | 0 |

## Par trait (noms)

| Type · trait | Valeurs | Rappel | Partielles |
|---|---:|---:|---:|
| PERSONNE · majuscules | 12 | 83.3 % | 2 |
| PERSONNE · nom-avant | 8 | 100.0 % | 0 |
| PERSONNE · nom-majuscules | 10 | 100.0 % | 0 |
| PERSONNE · nom-majuscules-avant | 52 | 100.0 % | 0 |
| PERSONNE · nom-seul | 90 | 100.0 % | 0 |
| PERSONNE · prenom-apostrophe | 17 | 88.2 % | 2 |
| PERSONNE · prenom-compose | 31 | 100.0 % | 0 |
| PERSONNE · prenom-seul | 57 | 100.0 % | 0 |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés à tort | Taux |
|---|---:|---:|---:|
| MONTANT — Montant | 102 | 0 | 0.0 % |
| DATE — Date (hors naissance) | 162 | 0 | 0.0 % |
| SIGLE — Sigle ou terme du lexique | 8 | 0 | 0.0 % |
| MOT — Mot courant qui ressemble à un nom | 15 | 15 | 100.0 % |
| VILLE — Ville | 29 | 8 | 27.6 % |
| PRODUIT — Offre, opérateur, médicament | 42 | 20 | 47.6 % |
| COMPTE — N° de compte comptable | 31 | 31 | 100.0 % |

## Valeurs manquées ou partielles (35)

| Document | Type | Écriture | Valeur (synthétique) | Statut | Resté en clair | Vu par l'IA | Préfixes posés |
|---|---|---|---|---|---|:-:|---|
| banque-assurance/tableau-releve/001 | PERSONNE | mag-ben-espace · prenom-apostrophe, majuscules | `M'BAREK BEN MOUSSA` | partiel | MOUSSA | — | NOM |
| banque-assurance/tableau-releve/003 | PERSONNE | mag-double · prenom-apostrophe, majuscules | `R'KIA FASSI-FIHRI` | partiel | R | — | NOM |
| sante/tableau-listePatients/001 | NAISSANCE (indirect) | jj-mm-aaaa | `18/04/1959` | manque | 18 04 1959 | — |  |
| sante/tableau-listePatients/001 | NAISSANCE (indirect) | lettres | `27 novembre 2003` | manque | 27 novembre 2003 | — |  |
| sante/tableau-listePatients/001 | NAISSANCE (indirect) | jj-mm-aaaa | `06/06/1965` | manque | 06 06 1965 | — |  |
| sante/tableau-listePatients/001 | NAISSANCE (indirect) | lettres | `18 septembre 1978` | manque | 18 septembre 1978 | — |  |
| sante/tableau-listePatients/001 | NAISSANCE (indirect) | lettres | `8 mai 1982` | manque | 8 mai 1982 | — |  |
| sante/tableau-listePatients/001 | NAISSANCE (indirect) | jj-mm-aaaa | `12/06/1999` | manque | 12 06 1999 | — |  |
| sante/tableau-listePatients/001 | NAISSANCE (indirect) | lettres | `22 août 1999` | manque | 22 août 1999 | — |  |
| sante/tableau-listePatients/001 | NAISSANCE (indirect) | jj-mm-aaaa | `07/08/1999` | manque | 07 08 1999 | — |  |
| sante/tableau-listePatients/002 | NAISSANCE (indirect) | jj-mm-aaaa | `06/03/1991` | manque | 06 03 1991 | — |  |
| sante/tableau-listePatients/002 | NAISSANCE (indirect) | lettres | `15 mars 2003` | manque | 15 mars 2003 | — |  |
| sante/tableau-listePatients/002 | NAISSANCE (indirect) | lettres | `23 novembre 1973` | manque | 23 novembre 1973 | — |  |
| sante/tableau-listePatients/002 | NAISSANCE (indirect) | jj-mm-aaaa | `05/11/1969` | manque | 05 11 1969 | — |  |
| sante/tableau-listePatients/002 | NAISSANCE (indirect) | lettres | `3 janvier 1996` | manque | 3 janvier 1996 | — |  |
| sante/tableau-listePatients/002 | NAISSANCE (indirect) | lettres | `16 février 1952` | manque | 16 février 1952 | — |  |
| sante/tableau-listePatients/002 | NAISSANCE (indirect) | jj-mm-aaaa | `11/09/1992` | manque | 11 09 1992 | — |  |
| sante/tableau-listePatients/002 | NAISSANCE (indirect) | lettres | `17 octobre 1997` | manque | 17 octobre 1997 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | jj-mm-aaaa | `18/07/1967` | manque | 18 07 1967 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | jj-mm-aaaa | `17/05/1952` | manque | 17 05 1952 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | jj-mm-aaaa | `09/08/1986` | manque | 09 08 1986 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | lettres | `17 janvier 1986` | manque | 17 janvier 1986 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | lettres | `12 juillet 1951` | manque | 12 juillet 1951 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | jj-mm-aaaa | `28/02/1976` | manque | 28 02 1976 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | jj-mm-aaaa | `10/10/1984` | manque | 10 10 1984 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | lettres | `25 avril 2001` | manque | 25 avril 2001 | — |  |
| sante/tableau-listePatients/003 | NAISSANCE (indirect) | jj-mm-aaaa | `01/06/1955` | manque | 01 06 1955 | — |  |
| sante/tableau-listePatients/004 | NAISSANCE (indirect) | lettres | `1 mars 1956` | manque | 1 mars 1956 | — |  |
| sante/tableau-listePatients/004 | NAISSANCE (indirect) | lettres | `7 juin 1973` | manque | 7 juin 1973 | — |  |
| sante/tableau-listePatients/004 | NAISSANCE (indirect) | jj-mm-aaaa | `27/09/1985` | manque | 27 09 1985 | — |  |
| sante/tableau-listePatients/004 | NAISSANCE (indirect) | lettres | `13 octobre 1984` | manque | 13 octobre 1984 | — |  |
| sante/tableau-listePatients/004 | NAISSANCE (indirect) | lettres | `6 septembre 2002` | manque | 6 septembre 2002 | — |  |
| sante/tableau-listePatients/004 | NAISSANCE (indirect) | jj-mm-aaaa | `07/10/1972` | manque | 07 10 1972 | — |  |
| sante/tableau-listePatients/004 | NAISSANCE (indirect) | jj-mm-aaaa | `20/11/1959` | manque | 20 11 1959 | — |  |
| sante/tableau-listePatients/004 | NAISSANCE (indirect) | lettres | `12 novembre 1967` | manque | 12 novembre 1967 | — |  |

## Leurres codés à tort (74)

| Document | Leurre | Valeur | Préfixes |
|---|---|---|---|
| banque-assurance/tableau-releve/001 | PRODUIT | `LABEL VIE` | NOM |
| banque-assurance/tableau-releve/002 | PRODUIT | `LABEL VIE` | NOM |
| banque-assurance/tableau-releve/002 | PRODUIT | `MARJANE` | PRENOM |
| banque-assurance/tableau-releve/002 | PRODUIT | `LABEL VIE` | NOM |
| banque-assurance/tableau-releve/003 | PRODUIT | `MARJANE` | PRENOM |
| banque-assurance/tableau-releve/003 | PRODUIT | `LABEL VIE` | NOM |
| banque-assurance/tableau-releve/004 | PRODUIT | `ACIMA` | NOM |
| banque-assurance/tableau-releve/004 | PRODUIT | `ACIMA` | NOM |
| banque-assurance/tableau-releve/004 | PRODUIT | `MARJANE` | PRENOM |
| core/tableau-listeClients/001 | VILLE · ar | `مراكش` | CODE |
| core/tableau-listeClients/001 | VILLE · ar | `مكناس` | CODE |
| core/tableau-listeClients/002 | VILLE · ar | `تطوان` | CODE |
| core/tableau-listeClients/002 | VILLE · ar | `فاس` | CODE |
| core/tableau-listeClients/003 | VILLE · ar | `مكناس` | CODE |
| core/tableau-listeClients/003 | VILLE · ar | `الرباط` | CODE |
| core/tableau-listeClients/004 | VILLE · ar | `وجدة` | CODE |
| core/tableau-listeClients/004 | VILLE · ar | `تطوان` | CODE |
| expertise-comptable/tableau-fichierTiers/001 | COMPTE | `4411` | RIB |
| expertise-comptable/tableau-fichierTiers/001 | COMPTE | `3421` | RIB |
| expertise-comptable/tableau-fichierTiers/001 | COMPTE | `6111` | RIB |
| expertise-comptable/tableau-fichierTiers/001 | COMPTE | `411000` | RIB |
| expertise-comptable/tableau-fichierTiers/001 | COMPTE | `3421` | RIB |
| expertise-comptable/tableau-fichierTiers/001 | COMPTE | `7111` | RIB |
| expertise-comptable/tableau-fichierTiers/002 | COMPTE | `3421` | RIB |
| expertise-comptable/tableau-fichierTiers/002 | COMPTE | `6111` | RIB |
| expertise-comptable/tableau-fichierTiers/002 | COMPTE | `6121` | RIB |
| expertise-comptable/tableau-fichierTiers/002 | COMPTE | `706000` | RIB |
| expertise-comptable/tableau-fichierTiers/002 | COMPTE | `411000` | RIB |
| expertise-comptable/tableau-fichierTiers/002 | COMPTE | `401000` | RIB |
| expertise-comptable/tableau-fichierTiers/002 | COMPTE | `512100` | RIB |
| expertise-comptable/tableau-fichierTiers/002 | COMPTE | `706000` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `706000` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `3421` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `6111` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `445660` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `706000` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `411000` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `4455` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `401000` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `4455` | RIB |
| expertise-comptable/tableau-fichierTiers/003 | COMPTE | `6111` | RIB |
| expertise-comptable/tableau-fichierTiers/004 | COMPTE | `7111` | RIB |
| expertise-comptable/tableau-fichierTiers/004 | COMPTE | `401000` | RIB |
| expertise-comptable/tableau-fichierTiers/004 | COMPTE | `6111` | RIB |
| expertise-comptable/tableau-fichierTiers/004 | COMPTE | `411000` | RIB |
| expertise-comptable/tableau-fichierTiers/004 | COMPTE | `6121` | RIB |
| expertise-comptable/tableau-fichierTiers/004 | COMPTE | `411000` | RIB |
| expertise-comptable/tableau-fichierTiers/004 | COMPTE | `445660` | RIB |
| sante/tableau-listePatients/001 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/001 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/001 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/001 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/002 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/002 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/003 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/003 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/004 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/004 | PRODUIT | `amoxicilline 1 g` | CODE |
| sante/tableau-listePatients/004 | PRODUIT | `amoxicilline 1 g` | CODE |
| telecom-ma/tableau-journalAppels/001 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/001 | MOT · darija | `safi` | CODE |
| telecom-ma/tableau-journalAppels/001 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/002 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/002 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/002 | MOT · darija | `safi` | CODE |
| telecom-ma/tableau-journalAppels/002 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/002 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/003 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/003 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/003 | MOT · darija | `safi` | CODE |
| telecom-ma/tableau-journalAppels/004 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/004 | MOT · darija | `safi` | CODE |
| telecom-ma/tableau-journalAppels/004 | MOT · darija | `m9elle9` | REF |
| telecom-ma/tableau-journalAppels/004 | MOT · darija | `safi` | CODE |

## Codé hors étiquette (80 passages, 17 distincts — 40 plus fréquents)

Ni une valeur étiquetée, ni un leurre : surtout des mots du gabarit que le verrou ne connaît pas. Sur-coder est sûr, mais rend le texte moins utile à l'IA.

| Passage | Fois |
|---|---:|
| NOM « CB » | 9 |
| NOM « PAIEMENT » | 9 |
| NOM « VIR » | 9 |
| CODE « التواصل » | 6 |
| CODE « بالعربية » | 6 |
| CODE « يفضل » | 6 |
| NOM « PRLV » | 6 |
| CODE « الاسم » | 4 |
| CODE « الكامل » | 4 |
| CODE « تحويل » | 4 |
| CODE « من » | 4 |
| NOM « EMIS » | 3 |
| NOM « RECU » | 3 |
| NOM « GAB » | 2 |
| NOM « RETRAIT » | 2 |
| NOM « VERSEMENT » | 2 |
| NOM « CIN » | 1 |
