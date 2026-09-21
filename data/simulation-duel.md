# Simulation de duel

*Généré par `npm run simulation:duel`. 3 000 duels simulés par ligne, avec les vraies cartes de l'édition. À chaque manche, l'ordinateur pose un mot, le joueur lui répond, et les deux attaques sont réglées ensemble. Le joueur fictif aligne les dix meilleures cartes de sa collection et répond par la carte qui lui promet le meilleur échange ; ses chances de retrouver une définition baissent avec la rareté du mot (hypothèses en tête de `simulateurs/duel.ts`). L'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans `src/config/equilibrage.ts`.*

**Cible du brief :** 6 à 10 manches par partie.

## Avec les réglages actuels — un « bon lecteur », selon sa collection

| Collection et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Débutant (3 paquets ouverts) — ordinateur Facile | 8,7 | 5 à 12 | 98 % | 0 % | 0 % | 3,0 | 29 % | 89 % | 2,7 |
| Débutant (3 paquets ouverts) — ordinateur Normal | 8,0 | 5 à 11 | 67 % | 0 % | 0 % | 3,4 | 19 % | 79 % | 2,7 |
| Débutant (3 paquets ouverts) — ordinateur Difficile | 6,7 | 5 à 9 | 28 % | 0 % | 0 % | 3,8 | 15 % | 67 % | 2,7 |
| Collection moyenne (60 paquets) — ordinateur Facile | 7,4 | 5 à 9 | 99 % | 0 % | 0 % | 3,4 | 3 % | 92 % | 1,7 |
| Collection moyenne (60 paquets) — ordinateur Normal | 7,7 | 6 à 10 | 88 % | 0 % | 0 % | 3,4 | 2 % | 83 % | 1,7 |
| Collection moyenne (60 paquets) — ordinateur Difficile | 7,0 | 5 à 9 | 43 % | 0 % | 0 % | 3,7 | 3 % | 73 % | 1,7 |
| Grande collection (600 paquets) — ordinateur Facile | 7,0 | 5 à 9 | 99 % | 0 % | 0 % | 3,6 | 0 % | 91 % | 2,4 |
| Grande collection (600 paquets) — ordinateur Normal | 7,2 | 5 à 9 | 89 % | 0 % | 0 % | 3,6 | 0 % | 82 % | 2,4 |
| Grande collection (600 paquets) — ordinateur Difficile | 6,6 | 5 à 8 | 50 % | 0 % | 0 % | 4,0 | 0 % | 71 % | 2,4 |

## Selon le joueur (collection moyenne)

| Joueur et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Joueur hésitant — ordinateur Facile | 9,2 | 7 à 12 | 92 % | 0 % | 0 % | 3,3 | 6 % | 78 % | 0,7 |
| Joueur hésitant — ordinateur Normal | 8,7 | 7 à 11 | 57 % | 0 % | 0 % | 3,3 | 3 % | 67 % | 0,7 |
| Joueur hésitant — ordinateur Difficile | 6,7 | 5 à 9 | 9 % | 0 % | 0 % | 3,8 | 4 % | 53 % | 0,7 |
| Bon lecteur — ordinateur Facile | 7,4 | 5 à 9 | 99 % | 0 % | 0 % | 3,4 | 3 % | 92 % | 1,7 |
| Bon lecteur — ordinateur Normal | 7,7 | 6 à 10 | 88 % | 0 % | 0 % | 3,4 | 2 % | 83 % | 1,7 |
| Bon lecteur — ordinateur Difficile | 7,0 | 5 à 9 | 43 % | 0 % | 0 % | 3,7 | 3 % | 73 % | 1,7 |
| Expert des mots — ordinateur Facile | 6,5 | 5 à 8 | 100 % | 0 % | 0 % | 3,7 | 1 % | 96 % | 3,1 |
| Expert des mots — ordinateur Normal | 6,8 | 5 à 9 | 95 % | 0 % | 0 % | 3,6 | 1 % | 91 % | 3,1 |
| Expert des mots — ordinateur Difficile | 6,6 | 5 à 8 | 77 % | 0 % | 0 % | 3,9 | 1 % | 86 % | 3,1 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Facile | 5,5 | 4 à 7 | 100 % | 0 % | 0 % | 4,3 | 0 % | 86 % | 4,5 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Normal | 5,6 | 4 à 7 | 92 % | 0 % | 0 % | 4,4 | 0 % | 72 % | 4,5 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Difficile | 5,3 | 4 à 7 | 72 % | 0 % | 0 % | 4,8 | 1 % | 65 % | 4,5 |

## Et si… (bon lecteur, collection moyenne, ordinateur Normal)

| Variante | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Réglages actuels | 7,7 | 6 à 10 | 88 % | 0 % | 0 % | 3,4 | 2 % | 83 % | 1,7 |
| La défense compte entièrement | 19,3 | 17 à 20 | 99 % | 0 % | 73 % | 0,8 | 82 % | 84 % | 1,7 |
| La défense compte pour 75 % | 12,6 | 9 à 16 | 98 % | 0 % | 1 % | 1,8 | 52 % | 84 % | 1,7 |
| 15 points de vie | 4,6 | 3 à 6 | 83 % | 0 % | 0 % | 3,4 | 1 % | 82 % | 1,7 |
| 20 points de vie | 6,1 | 4 à 8 | 86 % | 0 % | 0 % | 3,4 | 1 % | 83 % | 1,7 |
| 30 points de vie | 9,2 | 7 à 11 | 89 % | 0 % | 0 % | 3,4 | 2 % | 84 % | 1,7 |
| Une parade annule toute l'attaque | 13,9 | 8 à 20 | 91 % | 1 % | 15 % | 1,5 | 74 % | 84 % | 1,7 |
| Sans parade (ni pour le joueur, ni pour l'ordinateur) | 5,0 | 4 à 6 | 83 % | 0 % | 0 % | 5,5 | 0 % | 83 % | 1,7 |
| Sans triangle des types ni bonus de faction | 8,9 | 7 à 11 | 86 % | 0 % | 0 % | 2,9 | 4 % | 84 % | 1,7 |
