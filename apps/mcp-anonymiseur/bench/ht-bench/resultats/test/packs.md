# HT-Bench 0.2.0 (jeu test) — quels packs préinstaller ?

Moteur v2.23.2. Chaque document passe **sans pack**, avec **son pack**, puis avec **les six packs ensemble**, puis avec le **candidat** (telecom-ma, juridique-fr, rh-paie, banque-assurance, expertise-comptable) pour tous. Identifiants directs = noms, CIN, NIR, CNSS, ICE, IF, RC, SIREN, SIRET, téléphones, e-mails, IBAN, RIB, IMEI, IMSI. « Corrompus » = documents dont la sortie n'est plus l'original + des codes (codes imbriqués).

## Par métier

| Documents | Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---|---:|---:|---:|---:|---:|
| **core** | aucun | 99.7 % | 98.1 % | 93.5 % | 2.1 % | 0 |
|  | tous | 99.7 % | 98.1 % | 89.5 % | 2.1 % | 0 |
|  | candidat | 99.7 % | 98.1 % | 92.9 % | 2.1 % | 0 |
| **telecom-ma** | aucun | 100.0 % | 100.0 % | 79.3 % | 21.5 % | 0 |
|  | propre | 100.0 % | 100.0 % | 82.7 % | 10.8 % | 0 |
|  | tous | 100.0 % | 100.0 % | 82.7 % | 10.8 % | 0 |
|  | candidat | 100.0 % | 100.0 % | 82.7 % | 10.8 % | 0 |
| **juridique-fr** | aucun | 96.0 % | 89.3 % | 89.0 % | 4.0 % | 0 |
|  | propre | 96.0 % | 95.0 % | 87.1 % | 9.7 % | 0 |
|  | tous | 96.0 % | 95.0 % | 87.1 % | 9.7 % | 3 |
|  | candidat | 96.0 % | 95.0 % | 87.1 % | 9.7 % | 0 |
| **banque-assurance** | aucun | 96.2 % | 89.0 % | 75.7 % | 14.3 % | 0 |
|  | propre | 99.5 % | 99.7 % | 81.7 % | 3.7 % | 0 |
|  | tous | 99.5 % | 99.7 % | 81.7 % | 3.7 % | 1 |
|  | candidat | 99.5 % | 99.7 % | 81.7 % | 3.7 % | 0 |
| **sante** | aucun | 96.1 % | 90.7 % | 74.0 % | 25.0 % | 0 |
|  | propre | 96.1 % | 92.9 % | 81.3 % | 14.2 % | 9 |
|  | tous | 96.1 % | 92.9 % | 81.3 % | 14.2 % | 9 |
|  | candidat | 96.1 % | 90.7 % | 74.0 % | 25.0 % | 0 |
| **expertise-comptable** | aucun | 99.3 % | 97.4 % | 83.4 % | 7.5 % | 0 |
|  | propre | 99.3 % | 98.0 % | 95.5 % | 0.1 % | 0 |
|  | tous | 99.5 % | 99.5 % | 95.5 % | 0.1 % | 4 |
|  | candidat | 99.5 % | 99.5 % | 95.5 % | 0.1 % | 0 |
| **rh-paie** | aucun | 92.1 % | 89.4 % | 83.7 % | 23.1 % | 0 |
|  | propre | 92.1 % | 94.2 % | 89.2 % | 19.9 % | 0 |
|  | tous | 93.0 % | 94.9 % | 84.0 % | 19.9 % | 0 |
|  | candidat | 93.0 % | 94.9 % | 89.1 % | 19.9 % | 0 |

## Ce que chaque pack apporte chez lui (propre − aucun, en points)

| Pack | Direct | Tout | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|---:|
| telecom-ma | +0.0 | +0.0 | +3.4 | -10.8 | 0 |
| juridique-fr | +0.0 | +5.7 | -1.9 | +5.7 | 0 |
| banque-assurance | +3.4 | +10.6 | +6.0 | -10.7 | 0 |
| sante | +0.0 | +2.2 | +7.3 | -10.8 | 9 |
| expertise-comptable | +0.0 | +0.6 | +12.0 | -7.4 | 0 |
| rh-paie | +0.0 | +4.8 | +5.5 | -3.2 | 0 |

## Tout préchargé : ce que coûtent les six packs aux AUTRES métiers (tous − propre)

| Documents | Direct | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|
| core | +0.0 | -4.0 | +0.0 | 0 |
| telecom-ma | +0.0 | +0.0 | +0.0 | 0 |
| juridique-fr | +0.0 | +0.0 | +0.0 | 3 |
| banque-assurance | +0.0 | +0.0 | +0.0 | 1 |
| sante | +0.0 | +0.0 | +0.0 | 0 |
| expertise-comptable | +0.2 | +0.0 | +0.0 | 4 |
| rh-paie | +0.9 | -5.2 | +0.0 | 0 |

## Global

| Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---:|---:|---:|---:|---:|
| aucun | 97.3 % | 93.2 % | 81.5 % | 12.5 % | 0 |
| propre | 98.2 % | 97.4 % | 87.2 % | 6.0 % | 9 |
| tous | 98.3 % | 97.8 % | 86.4 % | 6.0 % | 17 |
| candidat (telecom-ma, juridique-fr, rh-paie, banque-assurance, expertise-comptable) | 98.3 % | 97.6 % | 86.3 % | 6.9 % | 0 |
