# HT-Bench 0.2.0 (jeu test) — Hidden Tokens face à Presidio

Même jeu synthétique (`4881c8d2bc9febe5…`, 366 documents), mêmes règles de score (`lib/score.mjs`). **Hidden Tokens v2.25.0** : anonymiser_fichier (.md), pack du document activé. **Presidio presidio-analyzer 2.2.358** : reconnaisseurs par défaut, en + fr (union), en_core_web_lg + fr_core_news_lg, sans seuil, en local, sans réseau. Une étendue rendue par Presidio compte comme un passage codé.

Jeu de **test** : aucune règle du moteur n'est réglée dessus — ce sont les chiffres à publier.

**Identifiants directs : Hidden Tokens 98.2 % (2478/2523) — Presidio 77.5 % (1956/2523)** (+20.7 pts).

## Par pack

| Pack | Direct — HT | Direct — Presidio | Écart | Précision HT | Précision Presidio | Leurres codés HT | Leurres codés Presidio |
|---|---:|---:|---:|---:|---:|---:|---:|
| core | 99.7 % (321/322) | 87.0 % (280/322) | +12.7 pts | 93.5 % | 59.9 % | 2.1 % | 69.5 % |
| telecom-ma | 100.0 % (242/242) | 81.8 % (198/242) | +18.2 pts | 82.7 % | 51.8 % | 10.8 % | 46.8 % |
| juridique-fr | 96.0 % (265/276) | 82.2 % (227/276) | +13.8 pts | 87.1 % | 50.3 % | 9.7 % | 51.0 % |
| banque-assurance | 99.5 % (649/652) | 64.4 % (420/652) | +35.1 pts | 81.7 % | 54.1 % | 3.7 % | 46.6 % |
| sante | 96.1 % (196/204) | 86.3 % (176/204) | +9.8 pts | 81.3 % | 50.5 % | 14.2 % | 51.7 % |
| expertise-comptable | 99.3 % (595/599) | 81.8 % (490/599) | +17.5 pts | 95.5 % | 60.6 % | 0.1 % | 23.7 % |
| rh-paie | 92.1 % (210/228) | 72.4 % (165/228) | +19.7 pts | 89.2 % | 51.8 % | 19.9 % | 28.0 % |
| **Global** | **98.2 % (2478/2523)** | **77.5 % (1956/2523)** | +20.7 pts | 87.2 % | 54.7 % | 6.0 % | 37.6 % |

Précision = passages codés qui recouvrent une valeur étiquetée / tous les passages codés. Leurres codés = montants, dates, articles, sigles, mots courants, villes seules… rendus illisibles à tort.

## Par type (rappel)

| Type | Direct | Valeurs | Hidden Tokens | Presidio | Écart |
|---|:-:|---:|---:|---:|---:|
| PERSONNE — Nom de personne | oui | 965 | 98.3 % | 82.2 % | +16.2 pts |
| CIN — CIN marocaine | oui | 192 | 100.0 % | 69.8 % | +30.2 pts |
| NIR — NIR (sécurité sociale, France) | oui | 40 | 65.0 % | 32.5 % | +32.5 pts |
| CNSS — N° CNSS | oui | 72 | 83.3 % | 100.0 % | -16.7 pts |
| ICE — ICE | oui | 159 | 100.0 % | 66.0 % | +34.0 pts |
| IF — Identifiant fiscal (IF) | oui | 58 | 100.0 % | 100.0 % | +0.0 pts |
| RC — Registre de commerce (RC) | oui | 53 | 100.0 % | 88.7 % | +11.3 pts |
| SIREN — SIREN | oui | 24 | 100.0 % | 70.8 % | +29.2 pts |
| SIRET — SIRET | oui | 31 | 100.0 % | 58.1 % | +41.9 pts |
| TEL — Téléphone | oui | 462 | 100.0 % | 87.9 % | +12.1 pts |
| EMAIL — E-mail | oui | 200 | 100.0 % | 100.0 % | +0.0 pts |
| IBAN — IBAN | oui | 55 | 98.2 % | 56.4 % | +41.8 pts |
| RIB — RIB | oui | 109 | 98.2 % | 5.5 % | +92.7 pts |
| IMEI — IMEI | oui | 24 | 100.0 % | 58.3 % | +41.7 pts |
| IMSI — IMSI | oui | 19 | 100.0 % | 100.0 % | +0.0 pts |
| CARTE — Numéro de carte bancaire | oui | 24 | 100.0 % | 62.5 % | +37.5 pts |
| CVV — Cryptogramme (CVV / CVC) | oui | 12 | 100.0 % | 0.0 % | +100.0 pts |
| PASSEPORT — Passeport, titre de séjour, permis | oui | 24 | 100.0 % | 33.3 % | +66.7 pts |
| BIC — BIC / SWIFT |  | 24 | 100.0 % | 8.3 % | +91.7 pts |
| ICCID — ICCID (carte SIM) |  | 12 | 100.0 % | 16.7 % | +83.3 pts |
| ADRESSE — Adresse postale |  | 184 | 92.4 % | 85.3 % | +7.1 pts |
| SOCIETE — Société |  | 279 | 100.0 % | 1.8 % | +98.2 pts |
| NAISSANCE — Date de naissance |  | 86 | 79.1 % | 66.3 % | +12.8 pts |
| PATENTE — N° de patente |  | 5 | 100.0 % | 100.0 % | +0.0 pts |
| TVA — N° de TVA intracommunautaire |  | 7 | 100.0 % | 28.6 % | +71.4 pts |
| MATRICULE — Matricule salarié |  | 24 | 100.0 % | 33.3 % | +66.7 pts |
| PATIENT — N° de dossier patient / IPP |  | 24 | 100.0 % | 100.0 % | +0.0 pts |
| PRATICIEN — Identifiant praticien (INPE, RPPS) |  | 36 | 100.0 % | 100.0 % | +0.0 pts |
| POLICE — N° de police d'assurance |  | 12 | 100.0 % | 0.0 % | +100.0 pts |
| SINISTRE — N° de sinistre |  | 12 | 100.0 % | 16.7 % | +83.3 pts |
| FACTURE — N° de facture / pièce |  | 48 | 100.0 % | 25.0 % | +75.0 pts |
| RG — N° RG / parquet |  | 48 | 100.0 % | 8.3 % | +91.7 pts |
| IMMAT — Immatriculation (véhicule) |  | 24 | 100.0 % | 37.5 % | +62.5 pts |
| EFFET — N° de chèque ou de LCN |  | 48 | 75.0 % | 100.0 % | -25.0 pts |
| CONTRAT — N° de contrat ou de dossier de crédit |  | 24 | 100.0 % | 87.5 % | +12.5 pts |

## Formats du Maghreb et du français : où l'écart se creuse

Écritures des identifiants directs, triées par écart de rappel (Hidden Tokens − Presidio).

| Type · écriture | Valeurs | Hidden Tokens | Presidio | Écart |
|---|---:|---:|---:|---:|
| CARTE · carte-masquee | 9 | 100.0 % | 0.0 % | +100.0 pts |
| CVV · cvv-3 | 12 | 100.0 % | 0.0 % | +100.0 pts |
| IBAN · iban-ma-par-4 | 15 | 100.0 % | 0.0 % | +100.0 pts |
| NIR · nir-groupes | 11 | 100.0 % | 0.0 % | +100.0 pts |
| RIB · rib-ma-groupes | 32 | 100.0 % | 0.0 % | +100.0 pts |
| RIB · rib-ma-tirets | 18 | 100.0 % | 0.0 % | +100.0 pts |
| SIRET · siret-groupes | 13 | 100.0 % | 0.0 % | +100.0 pts |
| TEL · ma-fixe-intl-zero-parenthese | 5 | 100.0 % | 0.0 % | +100.0 pts |
| ICE · ice-par-3 | 60 | 100.0 % | 10.0 % | +90.0 pts |
| IMEI · imei-tirets | 9 | 100.0 % | 11.1 % | +88.9 pts |
| TEL · ma-fixe-intl-3-6 | 9 | 100.0 % | 11.1 % | +88.9 pts |
| RIB · rib-ma-colle | 33 | 100.0 % | 12.1 % | +87.9 pts |
| PASSEPORT · titre-sejour | 7 | 100.0 % | 14.3 % | +85.7 pts |
| RIB · rib-ma-par-4 | 26 | 92.3 % | 7.7 % | +84.6 pts |
| PASSEPORT · permis | 12 | 100.0 % | 16.7 % | +83.3 pts |
| CIN · cin-espace | 46 | 100.0 % | 23.9 % | +76.1 pts |
| TEL · ma-fixe-intl-espaces | 4 | 100.0 % | 25.0 % | +75.0 pts |
| CIN · cin-tiret | 33 | 100.0 % | 30.3 % | +69.7 pts |
| SIREN · siren-groupes | 11 | 100.0 % | 36.4 % | +63.6 pts |
| TEL · ma-fixe-intl-tirets | 8 | 100.0 % | 37.5 % | +62.5 pts |
| TEL · ma-fixe-00212 | 5 | 100.0 % | 40.0 % | +60.0 pts |
| PERSONNE · mag-el-tiret | 18 | 100.0 % | 50.0 % | +50.0 pts |
| IBAN · iban-ma-colle | 13 | 100.0 % | 53.8 % | +46.2 pts |
| TEL · fr-fixe-national-espaces | 9 | 100.0 % | 55.6 % | +44.4 pts |
| TEL · fr-fixe-national-points | 7 | 100.0 % | 57.1 % | +42.9 pts |
| PERSONNE · mag-ait-trema | 34 | 100.0 % | 61.8 % | +38.2 pts |
| PERSONNE · mag-el-espace | 50 | 100.0 % | 64.0 % | +36.0 pts |
| PERSONNE · mag-al-espace | 20 | 100.0 % | 70.0 % | +30.0 pts |
| TEL · fr-mobile-0033 | 7 | 100.0 % | 71.4 % | +28.6 pts |
| PERSONNE · mag-double | 90 | 100.0 % | 73.3 % | +26.7 pts |
| PERSONNE · mag-ait-tiret | 43 | 100.0 % | 74.4 % | +25.6 pts |
| IMEI · imei-groupes | 8 | 100.0 % | 75.0 % | +25.0 pts |
| PERSONNE · mag-ait-espace | 35 | 100.0 % | 77.1 % | +22.9 pts |
| TEL · ma-mobile-intl-espaces | 27 | 100.0 % | 77.8 % | +22.2 pts |
| PERSONNE · fr-nom-mot-courant | 37 | 100.0 % | 78.4 % | +21.6 pts |
| PERSONNE · mag-ait-apostrophe | 29 | 100.0 % | 79.3 % | +20.7 pts |
| PERSONNE · mag-el-colle | 25 | 100.0 % | 80.0 % | +20.0 pts |
| TEL · fr-mobile-national-espaces | 6 | 100.0 % | 83.3 % | +16.7 pts |
| IBAN · iban-fr-par-4 | 13 | 92.3 % | 76.9 % | +15.4 pts |
| TEL · ma-mobile-intl-tirets | 21 | 100.0 % | 85.7 % | +14.3 pts |
| NIR · nir-colle | 15 | 100.0 % | 86.7 % | +13.3 pts |
| TEL · fr-fixe-national-tirets | 8 | 100.0 % | 87.5 % | +12.5 pts |
| TEL · ma-mobile-00212 | 25 | 100.0 % | 88.0 % | +12.0 pts |
| RC · rc-nombre | 53 | 100.0 % | 88.7 % | +11.3 pts |
| PERSONNE · mag-simple | 205 | 99.0 % | 87.8 % | +11.2 pts |
| PERSONNE · mag-ben-espace | 58 | 98.3 % | 87.9 % | +10.3 pts |
| PERSONNE · fr-simple | 206 | 100.0 % | 90.3 % | +9.7 pts |
| TEL · ma-mobile-national-4-2-2-2 | 25 | 100.0 % | 92.0 % | +8.0 pts |
| TEL · ma-mobile-national-points | 26 | 100.0 % | 92.3 % | +7.7 pts |
| TEL · ma-mobile-intl-3-6 | 28 | 100.0 % | 92.9 % | +7.1 pts |
| TEL · ma-mobile-national-tirets | 16 | 100.0 % | 93.8 % | +6.3 pts |
| PERSONNE · mag-ben-colle | 17 | 94.1 % | 88.2 % | +5.9 pts |
| TEL · ma-mobile-national-espaces | 19 | 100.0 % | 94.7 % | +5.3 pts |
| TEL · ma-mobile-intl-zero-parenthese | 21 | 100.0 % | 95.2 % | +4.8 pts |
| PERSONNE · mag-ben-tiret | 27 | 96.3 % | 92.6 % | +3.7 pts |
| CARTE · carte-collee | 8 | 100.0 % | 100.0 % | +0.0 pts |
| CARTE · carte-groupes | 4 | 100.0 % | 100.0 % | +0.0 pts |
| CARTE · carte-tirets | 3 | 100.0 % | 100.0 % | +0.0 pts |
| CIN · cin-colle | 113 | 100.0 % | 100.0 % | +0.0 pts |
| CNSS · cnss-assure-9 | 48 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · generique | 12 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · initiale.nom | 49 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · majuscules | 41 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · nom_prenom | 37 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · prenom.nom | 29 | 100.0 % | 100.0 % | +0.0 pts |
| EMAIL · prenomnom-chiffres | 32 | 100.0 % | 100.0 % | +0.0 pts |
| IBAN · iban-fr-colle | 14 | 100.0 % | 100.0 % | +0.0 pts |
| ICE · ice-colle | 99 | 100.0 % | 100.0 % | +0.0 pts |
| IF · if-nombre | 58 | 100.0 % | 100.0 % | +0.0 pts |
| IMEI · imei-colle | 7 | 100.0 % | 100.0 % | +0.0 pts |
| IMSI · imsi-colle | 19 | 100.0 % | 100.0 % | +0.0 pts |
| NIR · nir-cle-tiret | 14 | 0.0 % | 0.0 % | +0.0 pts |
| PASSEPORT · passeport-ma | 5 | 100.0 % | 100.0 % | +0.0 pts |
| PERSONNE · mag-ould | 37 | 94.6 % | 94.6 % | +0.0 pts |
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
| TEL · ma-fixe-intl-colle | 9 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-msisdn-sans-plus | 10 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-4-2-2-2 | 12 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-colle | 13 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-espaces | 9 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-points | 8 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-fixe-national-tirets | 7 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-mobile-intl-colle | 20 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-mobile-msisdn-sans-plus | 20 | 100.0 % | 100.0 % | +0.0 pts |
| TEL · ma-mobile-national-colle | 26 | 100.0 % | 100.0 % | +0.0 pts |
| PERSONNE · fr-particule | 34 | 73.5 % | 82.4 % | -8.8 pts |
| CNSS · cnss-affiliation-7 | 24 | 50.0 % | 100.0 % | -50.0 pts |

## Leurres (doivent rester lisibles)

| Leurre | Nombre | Codés — HT | Codés — Presidio |
|---|---:|---:|---:|
| MONTANT — Montant | 1002 | 3.6 % | 6.9 % |
| DATE — Date (hors naissance) | 785 | 1.3 % | 81.8 % |
| ARTICLE — Article ou texte de loi | 84 | 31.0 % | 38.1 % |
| SIGLE — Sigle ou terme du lexique | 456 | 13.2 % | 13.8 % |
| MOT — Mot courant qui ressemble à un nom | 130 | 12.3 % | 23.1 % |
| VILLE — Ville | 201 | 0.0 % | 85.1 % |
| PRODUIT — Offre, opérateur, médicament | 103 | 34.0 % | 37.9 % |
| COMPTE — N° de compte comptable | 100 | 0.0 % | 53.0 % |
| MESURE — Durée, quantité, dosage | 168 | 0.0 % | 23.8 % |

## Ce que rend Presidio

| Entité Presidio | Étendues |
|---|---:|
| PERSON | 2042 |
| DATE_TIME | 1146 |
| IN_PAN | 1074 |
| LOCATION | 1010 |
| US_DRIVER_LICENSE | 929 |
| US_BANK_NUMBER | 502 |
| PHONE_NUMBER | 482 |
| URL | 283 |
| EMAIL_ADDRESS | 200 |
| US_SSN | 180 |
| US_PASSPORT | 117 |
| NRP | 49 |
| CREDIT_CARD | 37 |
| IBAN_CODE | 24 |
| AU_TFN | 21 |
| AU_ACN | 15 |
| IN_AADHAAR | 10 |
| UK_NHS | 4 |
| IN_VEHICLE_REGISTRATION | 3 |
| US_ITIN | 2 |
| MEDICAL_LICENSE | 1 |
| AU_ABN | 1 |

## Limites de la comparaison

- Presidio est noté tel que livré : aucun reconnaisseur maison (CIN, ICE, RIB marocain, NIR…) n'a été ajouté. Un intégrateur peut en écrire ; c'est précisément le travail que les packs Hidden Tokens livrent déjà.
- L'union en + fr sans seuil de score est la configuration la plus favorable au rappel de Presidio ; elle lui coûte en précision et en leurres codés.
- Texte seul (le chemin .md) ; une seule configuration de packs par document côté Hidden Tokens.
- Jeu synthétique : les valeurs ont la forme des vraies, les tournures sont celles des gabarits. Les chiffres disent où chaque outil tient ou casse sur ces formats ; ils ne remplacent pas une mesure sur des documents réels.
