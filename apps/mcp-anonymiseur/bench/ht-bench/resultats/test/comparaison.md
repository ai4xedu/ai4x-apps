# HT-Bench 0.1.0 (jeu test) — Hidden Tokens face à Presidio

Même jeu synthétique (`bd2f5ba27838f749…`, 258 documents), mêmes règles de score (`lib/score.mjs`). **Hidden Tokens v2.22.0** : anonymiser_fichier (.md), pack du document activé. **Presidio presidio-analyzer 2.2.358** : reconnaisseurs par défaut, en + fr (union), en_core_web_lg + fr_core_news_lg, sans seuil, en local, sans réseau. Une étendue rendue par Presidio compte comme un passage codé.

Jeu de **test** : aucune règle du moteur n'est réglée dessus — ce sont les chiffres à publier.

**Identifiants directs : Hidden Tokens 97.5 % (1772/1817) — Presidio 79.5 % (1444/1817)** (+18.1 pts).

## Par pack

| Pack | Direct — HT | Direct — Presidio | Écart | Précision HT | Précision Presidio | Leurres codés HT | Leurres codés Presidio |
|---|---:|---:|---:|---:|---:|---:|---:|
| core | 99.7 % (321/322) | 87.0 % (280/322) | +12.7 pts | 93.5 % | 59.9 % | 2.1 % | 69.5 % |
| telecom-ma | 100.0 % (242/242) | 81.8 % (198/242) | +18.2 pts | 82.7 % | 51.8 % | 10.8 % | 46.8 % |
| juridique-fr | 96.0 % (265/276) | 82.2 % (227/276) | +13.8 pts | 87.1 % | 50.3 % | 9.7 % | 51.0 % |
| banque-assurance | 98.1 % (263/268) | 63.8 % (171/268) | +34.3 pts | 76.8 % | 50.5 % | 0.4 % | 57.5 % |
| sante | 96.1 % (196/204) | 86.3 % (176/204) | +9.8 pts | 81.3 % | 50.5 % | 14.2 % | 51.7 % |
| expertise-comptable | 99.3 % (275/277) | 81.9 % (227/277) | +17.3 pts | 87.6 % | 57.9 % | 2.6 % | 37.4 % |
| rh-paie | 92.1 % (210/228) | 72.4 % (165/228) | +19.7 pts | 89.2 % | 51.8 % | 19.9 % | 28.0 % |
| **Global** | **97.5 % (1772/1817)** | **79.5 % (1444/1817)** | +18.1 pts | 85.2 % | 53.2 % | 8.8 % | 45.6 % |

Précision = passages codés qui recouvrent une valeur étiquetée / tous les passages codés. Leurres codés = montants, dates, articles, sigles, mots courants, villes seules… rendus illisibles à tort.

## Par type (rappel)

| Type | Direct | Valeurs | Hidden Tokens | Presidio | Écart |
|---|:-:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 727 | 98.1 % | 82.4 % | +15.7 pts |
| CIN — CIN marocaine | oui | 144 | 100.0 % | 66.0 % | +34.0 pts |
| NIR — NIR (sécurité sociale, France) | oui | 40 | 65.0 % | 32.5 % | +32.5 pts |
| CNSS — N° CNSS | oui | 72 | 83.3 % | 100.0 % | -16.7 pts |
| ICE — ICE | oui | 68 | 100.0 % | 63.2 % | +36.8 pts |
| IF — Identifiant fiscal (IF) | oui | 41 | 100.0 % | 100.0 % | +0.0 pts |
| RC — Registre de commerce (RC) | oui | 41 | 100.0 % | 87.8 % | +12.2 pts |
| SIREN — SIREN | oui | 24 | 100.0 % | 70.8 % | +29.2 pts |
| SIRET — SIRET | oui | 31 | 100.0 % | 58.1 % | +41.9 pts |
| TEL — Téléphone | oui | 330 | 100.0 % | 87.0 % | +13.0 pts |
| EMAIL — E-mail | oui | 164 | 100.0 % | 100.0 % | +0.0 pts |
| IBAN — IBAN | oui | 43 | 97.7 % | 60.5 % | +37.2 pts |
| RIB — RIB | oui | 49 | 91.8 % | 0.0 % | +91.8 pts |
| IMEI — IMEI | oui | 24 | 100.0 % | 58.3 % | +41.7 pts |
| IMSI — IMSI | oui | 19 | 100.0 % | 100.0 % | +0.0 pts |
| BIC — BIC / SWIFT |  | 24 | 100.0 % | 8.3 % | +91.7 pts |
| ICCID — ICCID (carte SIM) |  | 12 | 100.0 % | 16.7 % | +83.3 pts |
| ADRESSE — Adresse postale |  | 160 | 91.3 % | 85.0 % | +6.3 pts |
| SOCIETE — Société |  | 150 | 100.0 % | 3.3 % | +96.7 pts |
| NAISSANCE — Date de naissance |  | 74 | 75.7 % | 66.2 % | +9.5 pts |
| PATENTE — N° de patente |  | 5 | 100.0 % | 100.0 % | +0.0 pts |
| TVA — N° de TVA intracommunautaire |  | 7 | 100.0 % | 28.6 % | +71.4 pts |
| MATRICULE — Matricule salarié |  | 24 | 100.0 % | 33.3 % | +66.7 pts |
| PATIENT — N° de dossier patient / IPP |  | 24 | 100.0 % | 100.0 % | +0.0 pts |
| PRATICIEN — Identifiant praticien (INPE, RPPS) |  | 36 | 100.0 % | 100.0 % | +0.0 pts |
| POLICE — N° de police d'assurance |  | 12 | 100.0 % | 0.0 % | +100.0 pts |
| SINISTRE — N° de sinistre |  | 12 | 100.0 % | 16.7 % | +83.3 pts |
| FACTURE — N° de facture / pièce |  | 24 | 100.0 % | 50.0 % | +50.0 pts |
| RG — N° RG / parquet |  | 48 | 100.0 % | 8.3 % | +91.7 pts |

## Formats du Maghreb et du français : où l'écart se creuse

Écritures des identifiants directs, triées par écart de rappel (Hidden Tokens − Presidio).

| Type · écriture | Valeurs | Hidden Tokens | Presidio | Écart |
|---|---:|---:|---:|---:|
| IBAN · iban-ma-par-4 | 9 | 100.0 % | 0.0 % | +100.0 pts |
| NIR · nir-groupes | 11 | 100.0 % | 0.0 % | +100.0 pts |
| RIB · rib-ma-colle | 13 | 100.0 % | 0.0 % | +100.0 pts |
| RIB · rib-ma-tirets | 6 | 100.0 % | 0.0 % | +100.0 pts |
| SIRET · siret-groupes | 13 | 100.0 % | 0.0 % | +100.0 pts |
| TEL · ma-fixe-intl-zero-parenthese | 4 | 100.0 % | 0.0 % | +100.0 pts |
| RIB · rib-ma-groupes | 17 | 94.1 % | 0.0 % | +94.1 pts |
| ICE · ice-par-3 | 28 | 100.0 % | 10.7 % | +89.3 pts |
| IMEI · imei-tirets | 9 | 100.0 % | 11.1 % | +88.9 pts |
| TEL · ma-fixe-intl-3-6 | 6 | 100.0 % | 16.7 % | +83.3 pts |
| TEL · ma-fixe-intl-tirets | 5 | 100.0 % | 20.0 % | +80.0 pts |
| CIN · cin-espace | 37 | 100.0 % | 21.6 % | +78.4 pts |
| RIB · rib-ma-par-4 | 13 | 76.9 % | 0.0 % | +76.9 pts |
| CIN · cin-tiret | 26 | 100.0 % | 23.1 % | +76.9 pts |
| IBAN · iban-ma-colle | 7 | 100.0 % | 28.6 % | +71.4 pts |
| TEL · ma-fixe-intl-espaces | 3 | 100.0 % | 33.3 % | +66.7 pts |
| SIREN · siren-groupes | 11 | 100.0 % | 36.4 % | +63.6 pts |
| PERSONNE · mag-el-tiret | 10 | 100.0 % | 50.0 % | +50.0 pts |
| TEL · fr-fixe-national-espaces | 9 | 100.0 % | 55.6 % | +44.4 pts |
| TEL · fr-fixe-national-points | 7 | 100.0 % | 57.1 % | +42.9 pts |
| PERSONNE · mag-el-espace | 28 | 100.0 % | 64.3 % | +35.7 pts |
| PERSONNE · mag-al-espace | 15 | 100.0 % | 66.7 % | +33.3 pts |
| TEL · ma-fixe-00212 | 3 | 100.0 % | 66.7 % | +33.3 pts |
| PERSONNE · mag-ait-trema | 19 | 100.0 % | 68.4 % | +31.6 pts |
| TEL · fr-mobile-0033 | 7 | 100.0 % | 71.4 % | +28.6 pts |
| TEL · ma-mobile-intl-espaces | 18 | 100.0 % | 72.2 % | +27.8 pts |
| PERSONNE · mag-double | 71 | 100.0 % | 74.6 % | +25.4 pts |
| IMEI · imei-groupes | 8 | 100.0 % | 75.0 % | +25.0 pts |
| PERSONNE · mag-ait-apostrophe | 24 | 100.0 % | 75.0 % | +25.0 pts |
| PERSONNE · fr-nom-mot-courant | 35 | 100.0 % | 77.1 % | +22.9 pts |
| PERSONNE · mag-ait-tiret | 31 | 100.0 % | 77.4 % | +22.6 pts |
| TEL · ma-mobile-intl-tirets | 14 | 100.0 % | 78.6 % | +21.4 pts |
| PERSONNE · mag-ait-espace | 30 | 100.0 % | 80.0 % | +20.0 pts |
| PERSONNE · mag-el-colle | 15 | 100.0 % | 80.0 % | +20.0 pts |
| TEL · fr-mobile-national-espaces | 6 | 100.0 % | 83.3 % | +16.7 pts |
| IBAN · iban-fr-par-4 | 13 | 92.3 % | 76.9 % | +15.4 pts |
| PERSONNE · mag-simple | 142 | 99.3 % | 85.2 % | +14.1 pts |
| NIR · nir-colle | 15 | 100.0 % | 86.7 % | +13.3 pts |
| TEL · ma-mobile-00212 | 15 | 100.0 % | 86.7 % | +13.3 pts |
| TEL · fr-fixe-national-tirets | 8 | 100.0 % | 87.5 % | +12.5 pts |
| RC · rc-nombre | 41 | 100.0 % | 87.8 % | +12.2 pts |
| PERSONNE · mag-ben-tiret | 17 | 100.0 % | 88.2 % | +11.8 pts |
| TEL · ma-mobile-intl-3-6 | 17 | 100.0 % | 88.2 % | +11.8 pts |
| PERSONNE · mag-ben-espace | 38 | 97.4 % | 86.8 % | +10.5 pts |
| PERSONNE · fr-simple | 181 | 100.0 % | 90.6 % | +9.4 pts |
| TEL · ma-mobile-national-tirets | 11 | 100.0 % | 90.9 % | +9.1 pts |
| TEL · ma-mobile-intl-zero-parenthese | 13 | 100.0 % | 92.3 % | +7.7 pts |
| TEL · ma-mobile-national-4-2-2-2 | 13 | 100.0 % | 92.3 % | +7.7 pts |
| PERSONNE · mag-ben-colle | 15 | 93.3 % | 86.7 % | +6.7 pts |
| TEL · ma-mobile-national-points | 19 | 100.0 % | 94.7 % | +5.3 pts |
| CIN · cin-colle | 81 | 100.0 % | 100.0 % | +0.0 pts |
| CNSS · cnss-assure-9 | 48 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · generique | 12 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · initiale.nom | 43 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · majuscules | 30 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · nom_prenom | 26 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · prenom.nom | 26 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · prenomnom-chiffres | 27 | 100.0 % | 100.0 % | +0.0 pts |
| IBAN · iban-fr-colle | 14 | 100.0 % | 100.0 % | +0.0 pts |
| ICE · ice-colle | 40 | 100.0 % | 100.0 % | +0.0 pts |
| IF · if-nombre | 41 | 100.0 % | 100.0 % | +0.0 pts |
| IMEI · imei-colle | 7 | 100.0 % | 100.0 % | +0.0 pts |
| IMSI · imsi-colle | 19 | 100.0 % | 100.0 % | +0.0 pts |
| NIR · nir-cle-tiret | 14 | 0.0 % | 0.0 % | +0.0 pts |
| SIREN · siren-colle | 13 | 100.0 % | 100.0 % | +0.0 pts |
| SIRET · siret-colle | 18 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-fixe-0033 | 3 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-fixe-intl-colle | 2 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-fixe-intl-espaces | 9 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-fixe-intl-zero-parenthese | 2 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-fixe-national-colle | 5 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-mobile-intl-colle | 2 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-mobile-intl-espaces | 8 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-mobile-intl-zero-parenthese | 4 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-mobile-national-colle | 10 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-mobile-national-points | 5 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · fr-mobile-national-tirets | 2 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-intl-colle | 4 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-msisdn-sans-plus | 8 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-4-2-2-2 | 7 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-colle | 9 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-espaces | 8 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-points | 7 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-tirets | 2 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-mobile-intl-colle | 13 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-mobile-msisdn-sans-plus | 11 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-mobile-national-colle | 17 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-mobile-national-espaces | 14 | 100.0 % | 100.0 % | +0.0 pts |
| PERSONNE · mag-ould | 22 | 90.9 % | 95.5 % | -4.5 pts |
| PERSONNE · fr-particule | 34 | 73.5 % | 82.4 % | -8.8 pts |
| CNSS · cnss-affiliation-7 | 24 | 50.0 % | 100.0 % | -50.0 pts |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés — HT | Codés — Presidio |
|---|---:|---:|---:|
| MONTANT — Montant | 505 | 7.1 % | 11.9 % |
| DATE — Date (hors naissance) | 564 | 0.0 % | 83.2 % |
| ARTICLE — Article ou texte de loi | 84 | 31.0 % | 38.1 % |
| SIGLE — Sigle ou terme du lexique | 229 | 25.3 % | 19.2 % |
| MOT — Mot courant qui ressemble à un nom | 118 | 11.9 % | 23.7 % |
| VILLE — Ville | 153 | 0.0 % | 88.2 % |
| PRODUIT — Offre, opérateur, médicament | 103 | 34.0 % | 37.9 % |
| COMPTE — N° de compte comptable | 76 | 0.0 % | 53.9 % |
| MESURE — Durée, quantité, dosage | 84 | 0.0 % | 29.8 % |

## Ce que rend Presidio

| Entité Presidio | Étendues |
|---|---:|
| PERSON | 1623 |
| DATE_TIME | 841 |
| LOCATION | 825 |
| IN_PAN | 735 |
| US_DRIVER_LICENSE | 642 |
| US_BANK_NUMBER | 344 |
| PHONE_NUMBER | 323 |
| URL | 235 |
| EMAIL_ADDRESS | 164 |
| US_SSN | 146 |
| US_PASSPORT | 107 |
| IBAN_CODE | 24 |
| CREDIT_CARD | 21 |
| NRP | 20 |
| AU_TFN | 18 |
| AU_ACN | 11 |
| IN_AADHAAR | 5 |
| UK_NHS | 3 |
| US_ITIN | 2 |
| IN_VEHICLE_REGISTRATION | 2 |
| MEDICAL_LICENSE | 1 |
| AU_ABN | 1 |

## Limites de la comparaison

- Presidio est noté tel que livré : aucun reconnaisseur maison (CIN, ICE, RIB marocain, NIR…) n'a été ajouté. Un intégrateur peut en écrire ; c'est précisément le travail que les packs Hidden Tokens livrent déjà.
- L'union en + fr sans seuil de score est la configuration la plus favorable au rappel de Presidio ; elle lui coûte en précision et en leurres codés.
- Texte seul (le chemin .md) ; une seule configuration de packs par document côté Hidden Tokens.
- Jeu synthétique : les valeurs ont la forme des vraies, les tournures sont celles des gabarits. Les chiffres disent où chaque outil tient ou casse sur ces formats ; ils ne remplacent pas une mesure sur des documents réels.
