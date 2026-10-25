# HT-Bench 0.2.0 (jeu test) — quels packs préinstaller ?

Moteur v2.28.0. Chaque document passe **sans pack**, avec **son pack**, puis avec **les six packs ensemble**, puis avec le **candidat** (telecom-ma, juridique-fr, rh-paie, banque-assurance, expertise-comptable) pour tous. Identifiants directs = noms, CIN, NIR, CNSS, ICE, IF, RC, SIREN, SIRET, téléphones, e-mails, IBAN, RIB, IMEI, IMSI. « Corrompus » = documents dont la sortie n'est plus l'original + des codes (codes imbriqués).

## Par métier

| Documents | Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---|---:|---:|---:|---:|---:|
| **core** | aucun | 100.0 % | 98.4 % | 93.5 % | 2.1 % | 0 |
|  | tous | 100.0 % | 98.4 % | 93.5 % | 2.1 % | 0 |
|  | candidat | 100.0 % | 98.4 % | 93.5 % | 2.1 % | 0 |
| **telecom-ma** | aucun | 100.0 % | 100.0 % | 79.3 % | 21.5 % | 0 |
|  | propre | 100.0 % | 100.0 % | 82.7 % | 10.8 % | 0 |
|  | tous | 100.0 % | 100.0 % | 82.7 % | 10.8 % | 0 |
|  | candidat | 100.0 % | 100.0 % | 82.7 % | 10.8 % | 0 |
| **juridique-fr** | aucun | 100.0 % | 91.9 % | 87.4 % | 8.0 % | 0 |
|  | propre | 100.0 % | 97.6 % | 87.2 % | 9.7 % | 0 |
|  | tous | 100.0 % | 97.6 % | 87.2 % | 9.7 % | 0 |
|  | candidat | 100.0 % | 97.6 % | 87.2 % | 9.7 % | 0 |
| **banque-assurance** | aucun | 98.2 % | 90.5 % | 75.3 % | 14.3 % | 0 |
|  | propre | 100.0 % | 100.0 % | 81.7 % | 3.7 % | 0 |
|  | tous | 100.0 % | 100.0 % | 81.7 % | 3.7 % | 0 |
|  | candidat | 100.0 % | 100.0 % | 81.7 % | 3.7 % | 0 |
| **sante** | aucun | 100.0 % | 93.2 % | 73.9 % | 25.0 % | 0 |
|  | propre | 100.0 % | 95.4 % | 82.4 % | 11.3 % | 0 |
|  | tous | 100.0 % | 95.4 % | 82.4 % | 11.3 % | 0 |
|  | candidat | 100.0 % | 93.2 % | 73.9 % | 25.0 % | 0 |
| **expertise-comptable** | aucun | 100.0 % | 97.9 % | 83.4 % | 7.5 % | 0 |
|  | propre | 100.0 % | 98.5 % | 95.5 % | 0.1 % | 0 |
|  | tous | 100.0 % | 99.9 % | 95.5 % | 0.1 % | 0 |
|  | candidat | 100.0 % | 99.9 % | 95.5 % | 0.1 % | 0 |
| **rh-paie** | aucun | 100.0 % | 95.2 % | 83.8 % | 23.1 % | 0 |
|  | propre | 100.0 % | 100.0 % | 89.3 % | 19.9 % | 0 |
|  | tous | 100.0 % | 100.0 % | 89.3 % | 19.9 % | 0 |
|  | candidat | 100.0 % | 100.0 % | 89.3 % | 19.9 % | 0 |

## Ce que chaque pack apporte chez lui (propre − aucun, en points)

| Pack | Direct | Tout | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|---:|
| telecom-ma | +0.0 | +0.0 | +3.4 | -10.8 | 0 |
| juridique-fr | +0.0 | +5.7 | -0.2 | +1.7 | 0 |
| banque-assurance | +1.8 | +9.5 | +6.3 | -10.7 | 0 |
| sante | +0.0 | +2.2 | +8.5 | -13.8 | 0 |
| expertise-comptable | +0.0 | +0.6 | +12.1 | -7.4 | 0 |
| rh-paie | +0.0 | +4.8 | +5.5 | -3.2 | 0 |

## Tout préchargé : ce que coûtent les six packs aux AUTRES métiers (tous − propre)

| Documents | Direct | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|
| core | +0.0 | +0.0 | +0.0 | 0 |
| telecom-ma | +0.0 | +0.0 | +0.0 | 0 |
| juridique-fr | +0.0 | +0.0 | +0.0 | 0 |
| banque-assurance | +0.0 | +0.0 | +0.0 | 0 |
| sante | +0.0 | +0.0 | +0.0 | 0 |
| expertise-comptable | +0.0 | +0.1 | +0.0 | 0 |
| rh-paie | +0.0 | +0.0 | +0.0 | 0 |

## Global

| Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---:|---:|---:|---:|---:|
| aucun | 99.5 % | 94.8 % | 81.3 % | 12.9 % | 0 |
| propre | 100.0 % | 98.7 % | 87.3 % | 5.8 % | 0 |
| tous | 100.0 % | 99.1 % | 87.4 % | 5.8 % | 0 |
| candidat (telecom-ma, juridique-fr, rh-paie, banque-assurance, expertise-comptable) | 100.0 % | 98.9 % | 86.4 % | 6.9 % | 0 |
