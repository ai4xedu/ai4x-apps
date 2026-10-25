# HT-Bench 0.2.0 (jeu dev) — quels packs préinstaller ?

Moteur v2.28.0. Chaque document passe **sans pack**, avec **son pack**, puis avec **les six packs ensemble**, puis avec le **candidat** (telecom-ma, juridique-fr, rh-paie, banque-assurance, expertise-comptable) pour tous. Identifiants directs = noms, CIN, NIR, CNSS, ICE, IF, RC, SIREN, SIRET, téléphones, e-mails, IBAN, RIB, IMEI, IMSI. « Corrompus » = documents dont la sortie n'est plus l'original + des codes (codes imbriqués).

## Par métier

| Documents | Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---|---:|---:|---:|---:|---:|
| **core** | aucun | 100.0 % | 98.5 % | 93.4 % | 1.3 % | 0 |
|  | tous | 100.0 % | 98.5 % | 93.4 % | 1.3 % | 0 |
|  | candidat | 100.0 % | 98.5 % | 93.4 % | 1.3 % | 0 |
| **telecom-ma** | aucun | 100.0 % | 100.0 % | 78.3 % | 23.4 % | 0 |
|  | propre | 100.0 % | 100.0 % | 81.9 % | 11.4 % | 0 |
|  | tous | 100.0 % | 100.0 % | 81.9 % | 11.4 % | 0 |
|  | candidat | 100.0 % | 100.0 % | 81.9 % | 11.4 % | 0 |
| **juridique-fr** | aucun | 100.0 % | 93.9 % | 87.5 % | 8.7 % | 0 |
|  | propre | 100.0 % | 99.5 % | 86.8 % | 11.7 % | 0 |
|  | tous | 100.0 % | 99.5 % | 86.8 % | 11.7 % | 0 |
|  | candidat | 100.0 % | 99.5 % | 86.8 % | 11.7 % | 0 |
| **banque-assurance** | aucun | 98.2 % | 90.8 % | 76.4 % | 14.4 % | 0 |
|  | propre | 100.0 % | 100.0 % | 82.9 % | 3.7 % | 0 |
|  | tous | 100.0 % | 100.0 % | 82.9 % | 3.7 % | 0 |
|  | candidat | 100.0 % | 100.0 % | 82.9 % | 3.7 % | 0 |
| **sante** | aucun | 100.0 % | 94.3 % | 73.2 % | 25.0 % | 0 |
|  | propre | 100.0 % | 95.5 % | 81.6 % | 10.9 % | 0 |
|  | tous | 100.0 % | 95.5 % | 81.6 % | 10.9 % | 0 |
|  | candidat | 100.0 % | 94.3 % | 73.2 % | 25.0 % | 0 |
| **expertise-comptable** | aucun | 100.0 % | 98.5 % | 84.3 % | 6.8 % | 0 |
|  | propre | 100.0 % | 98.7 % | 95.6 % | 0.1 % | 0 |
|  | tous | 100.0 % | 100.0 % | 95.6 % | 0.1 % | 0 |
|  | candidat | 100.0 % | 100.0 % | 95.6 % | 0.1 % | 0 |
| **rh-paie** | aucun | 100.0 % | 95.2 % | 84.0 % | 22.8 % | 0 |
|  | propre | 100.0 % | 99.4 % | 89.5 % | 19.7 % | 0 |
|  | tous | 100.0 % | 99.4 % | 89.5 % | 19.7 % | 0 |
|  | candidat | 100.0 % | 99.4 % | 89.5 % | 19.7 % | 0 |

## Ce que chaque pack apporte chez lui (propre − aucun, en points)

| Pack | Direct | Tout | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|---:|
| telecom-ma | +0.0 | +0.0 | +3.6 | -12.0 | 0 |
| juridique-fr | +0.0 | +5.7 | -0.7 | +2.9 | 0 |
| banque-assurance | +1.8 | +9.2 | +6.5 | -10.7 | 0 |
| sante | +0.0 | +1.2 | +8.4 | -14.1 | 0 |
| expertise-comptable | +0.0 | +0.2 | +11.3 | -6.8 | 0 |
| rh-paie | +0.0 | +4.1 | +5.5 | -3.1 | 0 |

## Tout préchargé : ce que coûtent les six packs aux AUTRES métiers (tous − propre)

| Documents | Direct | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|
| core | +0.0 | +0.0 | +0.0 | 0 |
| telecom-ma | +0.0 | +0.0 | +0.0 | 0 |
| juridique-fr | +0.0 | +0.0 | +0.0 | 0 |
| banque-assurance | +0.0 | +0.0 | +0.0 | 0 |
| sante | +0.0 | +0.0 | +0.0 | 0 |
| expertise-comptable | +0.0 | +0.0 | +0.0 | 0 |
| rh-paie | +0.0 | +0.0 | +0.0 | 0 |

## Global

| Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---:|---:|---:|---:|---:|
| aucun | 99.5 % | 95.4 % | 81.7 % | 12.7 % | 0 |
| propre | 100.0 % | 99.0 % | 87.6 % | 6.0 % | 0 |
| tous | 100.0 % | 99.3 % | 87.6 % | 6.0 % | 0 |
| candidat (telecom-ma, juridique-fr, rh-paie, banque-assurance, expertise-comptable) | 100.0 % | 99.2 % | 86.6 % | 7.1 % | 0 |
