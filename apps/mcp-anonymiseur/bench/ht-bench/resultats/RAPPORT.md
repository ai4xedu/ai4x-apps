# HT-Bench 0.2.0 — synthèse par chemin

Moteur Hidden Tokens **v2.22.0** · jeu `393d374e88cb6f29…` (synthétique, graine fixe). Le même document étiqueté passe par chaque chemin : un .md, un .docx, un .xlsx en mode document ; les exports en tableau passent par un .xlsx en mode tableau. Le détail de chaque chemin est dans `RAPPORT-<chemin>.md`.

## Identifiants directs, par chemin et par pack

| Chemin | Docs | Global | banque-assurance | core | expertise-comptable | juridique-fr | rh-paie | sante | telecom-ma |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| [md](RAPPORT-md.md) | 374 | **98.3 %** | 98.2 % ❌ | 98.8 % ❌ | 98.3 % ❌ | 97.5 % ❌ | 94.7 % ❌ | 99.0 % ❌ | 100.0 % ✅ |
| [docx](RAPPORT-docx.md) | 374 (1 refusés) | **98.3 %** | 98.2 % ❌ | 98.8 % ❌ | 98.3 % ❌ | 97.5 % ❌ | 94.7 % ❌ | 99.0 % ❌ | 100.0 % ✅ |
| [xlsx-document](RAPPORT-xlsx-document.md) | 374 | **98.1 %** | 96.8 % ❌ | 98.6 % ❌ | 98.3 % ❌ | 97.8 % ❌ | 94.7 % ❌ | 99.0 % ❌ | 100.0 % ✅ |
| [xlsx-tableau](RAPPORT-xlsx-tableau.md) | 28 | **99.8 %** | 91.7 % ❌ | 100.0 % ✅ | 100.0 % ✅ | 100.0 % ✅ | 100.0 % ✅ | 100.0 % ✅ | 100.0 % ✅ |

Cible : ≥ 99 % par pack. Un document refusé (le moteur n'écrit pas de fichier, par prudence) n'entre pas dans les taux ; la CI échoue si leur nombre augmente.

## Par langue

**Rappel des identifiants directs**

| Chemin | ar | darija-latin | fr | fr-ar |
|---|---:|---:|---:|---:|
| md | 100.0 % (323/323) | 100.0 % (240/240) | 97.6 % (1808/1853) | 99.6 % (241/242) |
| docx | 100.0 % (323/323) | 100.0 % (228/228) | 97.6 % (1808/1853) | 99.6 % (241/242) |
| xlsx-document | 98.5 % (318/323) | 100.0 % (240/240) | 97.6 % (1808/1853) | 99.6 % (241/242) |
| xlsx-tableau |  |  | 99.7 % (652/654) | 100.0 % (153/153) |

**Leurres codés à tort**

| Chemin | ar | darija-latin | fr | fr-ar |
|---|---:|---:|---:|---:|
| md | 98.5 % (255/259) | 74.7 % (204/273) | 8.7 % (170/1955) | 68.5 % (63/92) |
| docx | 98.5 % (255/259) | 74.3 % (197/265) | 16.9 % (330/1955) | 68.5 % (63/92) |
| xlsx-document | 93.8 % (243/259) | 74.7 % (204/273) | 20.2 % (395/1955) | 68.5 % (63/92) |
| xlsx-tableau |  |  | 19.9 % (66/331) | 13.8 % (8/58) |

**Texte lisible (hors valeurs étiquetées)**

| Chemin | ar | darija-latin | fr | fr-ar |
|---|---:|---:|---:|---:|
| md | 1.8 % | 52.4 % | 92.1 % | 38.2 % |
| docx | 1.8 % | 52.4 % | 90.0 % | 38.2 % |
| xlsx-document | 3.6 % | 47.1 % | 86.7 % | 43.5 % |
| xlsx-tableau |  |  | 87.4 % | 79.6 % |

`fr` : français · `ar` : écriture arabe · `fr-ar` : bilingue français / arabe · `darija-latin` : darija en lettres latines (arabizi). Texte lisible : part des lettres et chiffres hors de toute valeur étiquetée restée en clair — un document codé d'un seul bloc a un rappel parfait et rien de lisible.

## Précision et sortie

| Chemin | Rappel (tout) | Précision | Leurres codés | Texte lisible | Sortie corrompue |
|---|---:|---:|---:|---:|---:|
| md | 97.1 % | 65.2 % | 26.8 % | 75.1 % | 47 |
| docx | 97.1 % | 63.5 % | 32.9 % | 73.6 % | 47 |
| xlsx-document | 96.3 % | 59.9 % | 35.1 % | 71.2 % | 57 |
| xlsx-tableau | 96.4 % | 86.4 % | 19.0 % | 86.4 % | 1 |

## Les plus gros écarts, par chemin (identifiants directs)

| Chemin | Type · écriture | Perdues | Rappel |
|---|---|---:|---:|
| md | NIR · nir-cle-tiret | 17/17 | 0.0 % |
| md | CNSS · cnss-affiliation-7 | 12/25 | 52.0 % |
| md | PERSONNE · fr-particule | 3/35 | 91.4 % |
| md | PERSONNE · mag-ould | 3/36 | 91.7 % |
| md | RIB · rib-ma-par-4 | 2/11 | 81.8 % |
| docx | NIR · nir-cle-tiret | 17/17 | 0.0 % |
| docx | CNSS · cnss-affiliation-7 | 12/25 | 52.0 % |
| docx | PERSONNE · fr-particule | 3/35 | 91.4 % |
| docx | PERSONNE · mag-ould | 3/36 | 91.7 % |
| docx | RIB · rib-ma-par-4 | 2/11 | 81.8 % |
| xlsx-document | NIR · nir-cle-tiret | 17/17 | 0.0 % |
| xlsx-document | CNSS · cnss-affiliation-7 | 12/25 | 52.0 % |
| xlsx-document | RIB · rib-ma-groupes·ar | 4/4 | 0.0 % |
| xlsx-document | PERSONNE · mag-ait-espace | 3/23 | 87.0 % |
| xlsx-document | PERSONNE · mag-ould | 3/36 | 91.7 % |
| xlsx-tableau | PERSONNE · mag-ben-espace | 1/22 | 95.5 % |
| xlsx-tableau | PERSONNE · mag-double | 1/34 | 97.1 % |
