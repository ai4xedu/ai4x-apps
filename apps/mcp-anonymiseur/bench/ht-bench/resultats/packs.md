# HT-Bench 0.2.0 (jeu dev) — quels packs préinstaller ?

Moteur v2.23.2. Chaque document passe **sans pack**, avec **son pack**, puis avec **les six packs ensemble**, puis avec le **candidat** (telecom-ma, juridique-fr, rh-paie, banque-assurance, expertise-comptable) pour tous. Identifiants directs = noms, CIN, NIR, CNSS, ICE, IF, RC, SIREN, SIRET, téléphones, e-mails, IBAN, RIB, IMEI, IMSI. « Corrompus » = documents dont la sortie n'est plus l'original + des codes (codes imbriqués).

## Par métier

| Documents | Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---|---:|---:|---:|---:|---:|
| **core** | aucun | 97.6 % | 96.4 % | 93.3 % | 1.4 % | 0 |
|  | tous | 97.6 % | 96.4 % | 89.4 % | 1.4 % | 0 |
|  | candidat | 97.6 % | 96.4 % | 92.8 % | 1.4 % | 0 |
| **telecom-ma** | aucun | 100.0 % | 100.0 % | 78.3 % | 23.4 % | 0 |
|  | propre | 100.0 % | 100.0 % | 81.9 % | 11.4 % | 0 |
|  | tous | 100.0 % | 100.0 % | 81.9 % | 11.4 % | 0 |
|  | candidat | 100.0 % | 100.0 % | 81.9 % | 11.4 % | 0 |
| **juridique-fr** | aucun | 97.5 % | 92.1 % | 89.1 % | 4.9 % | 0 |
|  | propre | 97.5 % | 97.9 % | 86.7 % | 11.7 % | 0 |
|  | tous | 97.5 % | 97.9 % | 86.8 % | 11.7 % | 3 |
|  | candidat | 97.5 % | 97.9 % | 86.7 % | 11.7 % | 0 |
| **banque-assurance** | aucun | 96.0 % | 89.1 % | 76.5 % | 14.4 % | 0 |
|  | propre | 98.8 % | 99.1 % | 82.8 % | 3.7 % | 0 |
|  | tous | 98.8 % | 99.1 % | 82.8 % | 3.7 % | 0 |
|  | candidat | 98.8 % | 99.1 % | 82.8 % | 3.7 % | 0 |
| **sante** | aucun | 98.6 % | 93.3 % | 73.4 % | 25.0 % | 0 |
|  | propre | 98.6 % | 94.5 % | 81.0 % | 13.1 % | 9 |
|  | tous | 98.6 % | 94.5 % | 81.0 % | 13.1 % | 9 |
|  | candidat | 98.6 % | 93.3 % | 73.4 % | 25.0 % | 0 |
| **expertise-comptable** | aucun | 98.9 % | 97.7 % | 84.2 % | 6.9 % | 0 |
|  | propre | 98.9 % | 97.9 % | 95.6 % | 0.1 % | 0 |
|  | tous | 99.2 % | 99.4 % | 95.6 % | 0.1 % | 5 |
|  | candidat | 99.2 % | 99.4 % | 95.6 % | 0.1 % | 0 |
| **rh-paie** | aucun | 93.0 % | 90.1 % | 83.7 % | 23.0 % | 0 |
|  | propre | 93.0 % | 94.2 % | 89.3 % | 19.8 % | 0 |
|  | tous | 93.4 % | 94.6 % | 83.8 % | 19.8 % | 0 |
|  | candidat | 93.4 % | 94.6 % | 89.1 % | 19.8 % | 0 |

## Ce que chaque pack apporte chez lui (propre − aucun, en points)

| Pack | Direct | Tout | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|---:|
| telecom-ma | +0.0 | +0.0 | +3.6 | -12.0 | 0 |
| juridique-fr | +0.0 | +5.7 | -2.4 | +6.8 | 0 |
| banque-assurance | +2.8 | +9.9 | +6.3 | -10.7 | 0 |
| sante | +0.0 | +1.2 | +7.6 | -11.9 | 9 |
| expertise-comptable | +0.0 | +0.2 | +11.4 | -6.8 | 0 |
| rh-paie | +0.0 | +4.2 | +5.5 | -3.1 | 0 |

## Tout préchargé : ce que coûtent les six packs aux AUTRES métiers (tous − propre)

| Documents | Direct | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|
| core | +0.0 | -3.8 | +0.0 | 0 |
| telecom-ma | +0.0 | +0.0 | +0.0 | 0 |
| juridique-fr | +0.0 | +0.1 | +0.0 | 3 |
| banque-assurance | +0.0 | +0.0 | +0.0 | 0 |
| sante | +0.0 | +0.0 | +0.0 | 0 |
| expertise-comptable | +0.3 | +0.0 | +0.0 | 5 |
| rh-paie | +0.4 | -5.4 | +0.0 | 0 |

## Global

| Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---:|---:|---:|---:|---:|
| aucun | 97.4 % | 93.8 % | 81.8 % | 12.4 % | 0 |
| propre | 98.1 % | 97.5 % | 87.4 % | 6.2 % | 9 |
| tous | 98.2 % | 97.9 % | 86.6 % | 6.2 % | 17 |
| candidat (telecom-ma, juridique-fr, rh-paie, banque-assurance, expertise-comptable) | 98.2 % | 97.8 % | 86.5 % | 7.1 % | 0 |
