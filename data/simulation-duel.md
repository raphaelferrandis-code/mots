# Simulation de duel

*Généré par `npm run simulation:duel`. 3 000 duels simulés par ligne, avec les vraies cartes de l'édition. À chaque manche, l'ordinateur pose un mot, le joueur lui répond, et les deux attaques sont réglées ensemble. Le joueur fictif aligne les dix meilleures cartes de sa collection et répond par la carte qui lui promet le meilleur échange ; ses chances de retrouver une définition baissent avec la rareté du mot (hypothèses en tête de `simulateurs/duel.ts`). L'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans `src/config/equilibrage.ts`.*

**Cible du brief :** 6 à 10 manches par partie.

## Avec les réglages actuels — un « bon lecteur », selon sa collection

| Collection et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Débutant (3 paquets ouverts) — ordinateur Facile | 8,6 | 6 à 12 | 99 % | 0 % | 0 % | 3,0 | 29 % | 89 % | 2,8 |
| Débutant (3 paquets ouverts) — ordinateur Normal | 8,0 | 5 à 11 | 67 % | 0 % | 0 % | 3,3 | 19 % | 79 % | 2,8 |
| Débutant (3 paquets ouverts) — ordinateur Difficile | 6,5 | 5 à 9 | 26 % | 0 % | 0 % | 3,9 | 14 % | 66 % | 2,8 |
| Collection moyenne (60 paquets) — ordinateur Facile | 7,4 | 6 à 9 | 99 % | 0 % | 0 % | 3,4 | 4 % | 92 % | 1,6 |
| Collection moyenne (60 paquets) — ordinateur Normal | 7,7 | 6 à 10 | 87 % | 0 % | 0 % | 3,4 | 2 % | 84 % | 1,6 |
| Collection moyenne (60 paquets) — ordinateur Difficile | 6,8 | 5 à 9 | 44 % | 0 % | 0 % | 3,8 | 2 % | 73 % | 1,6 |
| Grande collection (600 paquets) — ordinateur Facile | 6,9 | 5 à 9 | 99 % | 0 % | 0 % | 3,7 | 0 % | 91 % | 2,2 |
| Grande collection (600 paquets) — ordinateur Normal | 7,2 | 5 à 9 | 90 % | 0 % | 0 % | 3,6 | 0 % | 82 % | 2,2 |
| Grande collection (600 paquets) — ordinateur Difficile | 6,5 | 5 à 8 | 50 % | 0 % | 0 % | 4,0 | 0 % | 72 % | 2,2 |

## Selon le joueur (collection moyenne)

| Joueur et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Joueur hésitant — ordinateur Facile | 9,3 | 7 à 12 | 91 % | 0 % | 0 % | 3,3 | 6 % | 78 % | 0,6 |
| Joueur hésitant — ordinateur Normal | 8,8 | 7 à 11 | 57 % | 0 % | 0 % | 3,2 | 4 % | 67 % | 0,6 |
| Joueur hésitant — ordinateur Difficile | 6,7 | 5 à 8 | 9 % | 0 % | 0 % | 3,8 | 5 % | 53 % | 0,6 |
| Bon lecteur — ordinateur Facile | 7,4 | 6 à 9 | 99 % | 0 % | 0 % | 3,4 | 4 % | 92 % | 1,6 |
| Bon lecteur — ordinateur Normal | 7,7 | 6 à 10 | 87 % | 0 % | 0 % | 3,4 | 2 % | 84 % | 1,6 |
| Bon lecteur — ordinateur Difficile | 6,8 | 5 à 9 | 44 % | 0 % | 0 % | 3,8 | 2 % | 73 % | 1,6 |
| Expert des mots — ordinateur Facile | 6,4 | 5 à 8 | 100 % | 0 % | 0 % | 3,7 | 1 % | 96 % | 3,1 |
| Expert des mots — ordinateur Normal | 6,8 | 5 à 9 | 95 % | 0 % | 0 % | 3,7 | 1 % | 91 % | 3,1 |
| Expert des mots — ordinateur Difficile | 6,4 | 5 à 8 | 77 % | 0 % | 0 % | 4,0 | 1 % | 86 % | 3,1 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Facile | 5,5 | 4 à 7 | 100 % | 0 % | 0 % | 4,3 | 0 % | 85 % | 4,7 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Normal | 5,6 | 4 à 7 | 91 % | 0 % | 0 % | 4,5 | 1 % | 71 % | 4,7 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Difficile | 5,2 | 4 à 7 | 73 % | 0 % | 0 % | 4,9 | 0 % | 64 % | 4,7 |

## Et si… (bon lecteur, collection moyenne, ordinateur Normal)

| Variante | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Réglages actuels | 7,7 | 6 à 10 | 87 % | 0 % | 0 % | 3,4 | 2 % | 84 % | 1,6 |
| La défense compte entièrement | 19,5 | 18 à 20 | 99 % | 1 % | 79 % | 0,8 | 83 % | 84 % | 1,6 |
| La défense compte pour 75 % | 12,9 | 9 à 17 | 98 % | 0 % | 1 % | 1,8 | 54 % | 84 % | 1,6 |
| 15 points de vie | 4,6 | 3 à 6 | 84 % | 0 % | 0 % | 3,4 | 2 % | 83 % | 1,6 |
| 20 points de vie | 6,2 | 4 à 8 | 85 % | 0 % | 0 % | 3,4 | 2 % | 83 % | 1,6 |
| 30 points de vie | 9,2 | 7 à 11 | 88 % | 0 % | 0 % | 3,4 | 2 % | 84 % | 1,6 |
| Une parade annule toute l'attaque | 13,9 | 8 à 20 | 91 % | 0 % | 15 % | 1,5 | 74 % | 84 % | 1,6 |
| Sans parade (ni pour le joueur, ni pour l'ordinateur) | 5,0 | 4 à 6 | 82 % | 0 % | 0 % | 5,5 | 0 % | 83 % | 1,6 |
| Sans triangle des types ni bonus de faction | 8,9 | 7 à 11 | 85 % | 0 % | 0 % | 2,9 | 5 % | 84 % | 1,6 |
