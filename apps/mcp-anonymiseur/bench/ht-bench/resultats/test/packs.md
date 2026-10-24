# HT-Bench 0.1.0 (jeu test) — quels packs préinstaller ?

Moteur v2.23.2. Chaque document passe **sans pack**, avec **son pack**, puis avec **les six packs ensemble**, puis avec le **candidat** (telecom-ma, juridique-fr, rh-paie) pour tous. Identifiants directs = noms, CIN, NIR, CNSS, ICE, IF, RC, SIREN, SIRET, téléphones, e-mails, IBAN, RIB, IMEI, IMSI. « Corrompus » = documents dont la sortie n'est plus l'original + des codes (codes imbriqués).

## Par métier

| Documents | Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---|---:|---:|---:|---:|---:|
| **core** | aucun | 99.7 % | 98.1 % | 93.5 % | 2.1 % | 0 |
|  | tous | 99.7 % | 98.1 % | 87.9 % | 2.1 % | 0 |
|  | candidat | 99.7 % | 98.1 % | 92.9 % | 2.1 % | 0 |
| **telecom-ma** | aucun | 100.0 % | 100.0 % | 79.3 % | 21.5 % | 0 |
|  | propre | 100.0 % | 100.0 % | 82.7 % | 10.8 % | 0 |
|  | tous | 100.0 % | 100.0 % | 79.3 % | 10.8 % | 12 |
|  | candidat | 100.0 % | 100.0 % | 82.7 % | 10.8 % | 0 |
| **juridique-fr** | aucun | 96.0 % | 89.3 % | 89.0 % | 4.0 % | 0 |
|  | propre | 96.0 % | 95.0 % | 87.1 % | 9.7 % | 0 |
|  | tous | 96.0 % | 95.0 % | 87.1 % | 9.7 % | 3 |
|  | candidat | 96.0 % | 95.0 % | 87.1 % | 9.7 % | 0 |
| **banque-assurance** | aucun | 98.1 % | 95.0 % | 78.7 % | 0.4 % | 0 |
|  | propre | 98.1 % | 98.5 % | 76.8 % | 0.4 % | 12 |
|  | tous | 98.1 % | 98.5 % | 76.8 % | 0.4 % | 12 |
|  | candidat | 98.1 % | 95.0 % | 78.7 % | 0.4 % | 0 |
| **sante** | aucun | 96.1 % | 90.7 % | 74.0 % | 25.0 % | 0 |
|  | propre | 96.1 % | 92.9 % | 81.3 % | 14.2 % | 9 |
|  | tous | 96.1 % | 92.9 % | 81.3 % | 14.2 % | 9 |
|  | candidat | 96.1 % | 90.7 % | 74.0 % | 25.0 % | 0 |
| **expertise-comptable** | aucun | 99.3 % | 97.9 % | 87.4 % | 2.6 % | 0 |
|  | propre | 99.3 % | 99.2 % | 87.6 % | 2.6 % | 23 |
|  | tous | 99.6 % | 99.5 % | 87.5 % | 2.6 % | 24 |
|  | candidat | 99.3 % | 97.9 % | 87.4 % | 2.6 % | 0 |
| **rh-paie** | aucun | 92.1 % | 89.4 % | 83.7 % | 23.1 % | 0 |
|  | propre | 92.1 % | 94.2 % | 89.2 % | 19.9 % | 0 |
|  | tous | 92.1 % | 94.2 % | 84.0 % | 19.9 % | 0 |
|  | candidat | 92.1 % | 94.2 % | 89.2 % | 19.9 % | 0 |

## Ce que chaque pack apporte chez lui (propre − aucun, en points)

| Pack | Direct | Tout | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|---:|
| telecom-ma | +0.0 | +0.0 | +3.4 | -10.8 | 0 |
| juridique-fr | +0.0 | +5.7 | -1.9 | +5.7 | 0 |
| banque-assurance | +0.0 | +3.5 | -1.9 | +0.0 | 12 |
| sante | +0.0 | +2.2 | +7.3 | -10.8 | 9 |
| expertise-comptable | +0.0 | +1.3 | +0.2 | +0.0 | 23 |
| rh-paie | +0.0 | +4.8 | +5.5 | -3.2 | 0 |

## Tout préchargé : ce que coûtent les six packs aux AUTRES métiers (tous − propre)

| Documents | Direct | Précision | Leurres codés | Corrompus ajoutés |
|---|---:|---:|---:|---:|
| core | +0.0 | -5.6 | +0.0 | 0 |
| telecom-ma | +0.0 | -3.4 | +0.0 | 12 |
| juridique-fr | +0.0 | +0.0 | +0.0 | 3 |
| banque-assurance | +0.0 | +0.0 | +0.0 | 0 |
| sante | +0.0 | +0.0 | +0.0 | 0 |
| expertise-comptable | +0.4 | -0.1 | +0.0 | 1 |
| rh-paie | +0.0 | -5.2 | +0.0 | 0 |

## Global

| Config | Direct | Tout | Précision | Leurres codés | Corrompus |
|---|---:|---:|---:|---:|---:|
| aucun | 97.5 % | 94.2 % | 83.6 % | 10.8 % | 0 |
| propre | 97.5 % | 96.8 % | 85.2 % | 8.8 % | 44 |
| tous | 97.6 % | 96.9 % | 83.5 % | 8.8 % | 60 |
| candidat (telecom-ma, juridique-fr, rh-paie) | 97.5 % | 95.8 % | 84.3 % | 10.2 % | 0 |
