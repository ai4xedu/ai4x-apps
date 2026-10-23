# Sources des listes du verrou

- `fr.txt.gz` — 336 524 formes du français courant, paquet npm
  `an-array-of-french-words` 2.0.0 (licence MIT, cf. `LICENCE-an-array-of-french-words.txt`).
- `noms.json.gz` — dérivé des données ouvertes de l'INSEE, Licence Ouverte /
  Open Licence 2.0 (Etalab) :
  - « Fichier des noms de famille » (naissances 1891-2000, édition 2008) :
    seuls les noms portés par au moins 2 000 personnes ET qui sont aussi des
    mots du dictionnaire (Moulin, Boulanger, Robin… — 923 noms) : ce sont eux
    qu'un verrou fondé sur le dictionnaire laisserait passer.
  - « Fichier des prénoms » (édition 2023, 1900-2022) : les prénoms donnés au
    moins 500 fois (4 883 prénoms), pour reconnaître un prénom même quand
    c'est aussi un mot (Jacques, Marine, Aurore…).
  Régénération : `node scripts/generer-noms.mjs <dossier des fichiers INSEE>` (mode
  d'emploi en tête du script).
- `pseudonymes.json` — listes composées à la main pour le rendu lisible
  (v2.18, `server/pseudonymes.js`) : prénoms par genre et aire culturelle
  (FR / MA / EN), patronymes par aire, amorces et suites de raisons sociales,
  mots génériques du commerce, villes du Maroc et de France par taille. Des noms
  fréquents, aucune donnée personnelle. Un pseudonyme qui est aussi un mot du
  dictionnaire est écarté au chargement (il reste utile à l'inférence du genre).
