# Simulation de duel

*Généré par `npm run simulation:duel`. 3 000 duels simulés par ligne, avec les vraies cartes de l'édition. Une manche = chaque camp a joué une fois. Le joueur fictif choisit la carte qui lui promet le plus de dégâts ; ses chances de connaître un mot baissent avec la rareté (hypothèses en tête de `simulateurs/duel.ts`). Il aligne les dix meilleures cartes de sa collection ; l'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans `src/config/equilibrage.ts`.*

**Cible du brief :** 6 à 10 manches par partie.

## Avec les réglages actuels — un « bon lecteur », selon son deck

| Deck et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Victoires de celui qui commence | Parties arrêtées par la limite | Dégâts d'une attaque réussie (moyenne) | Attaques réduites au minimum |
|---|---|---|---|---|---|---|---|
| Débutant (3 paquets ouverts) — ordinateur Facile | 7,0 | 4 à 10 | 95 % | 52 % | 0 % | 3,2 | 36 % |
| Débutant (3 paquets ouverts) — ordinateur Normal | 6,4 | 4 à 9 | 58 % | 57 % | 0 % | 3,6 | 27 % |
| Débutant (3 paquets ouverts) — ordinateur Difficile | 5,6 | 4 à 8 | 30 % | 56 % | 0 % | 3,7 | 25 % |
| Collection moyenne (60 paquets) — ordinateur Facile | 8,0 | 6 à 10 | 99 % | 51 % | 0 % | 2,7 | 23 % |
| Collection moyenne (60 paquets) — ordinateur Normal | 8,2 | 6 à 10 | 62 % | 57 % | 0 % | 2,8 | 15 % |
| Collection moyenne (60 paquets) — ordinateur Difficile | 7,3 | 6 à 9 | 30 % | 59 % | 0 % | 2,8 | 14 % |
| Grande collection (600 paquets) — ordinateur Facile | 7,7 | 6 à 9 | 100 % | 50 % | 0 % | 2,7 | 16 % |
| Grande collection (600 paquets) — ordinateur Normal | 7,6 | 6 à 9 | 88 % | 54 % | 0 % | 2,8 | 9 % |
| Grande collection (600 paquets) — ordinateur Difficile | 7,3 | 6 à 9 | 67 % | 58 % | 0 % | 2,8 | 8 % |

## Selon le joueur (collection moyenne)

| Joueur et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Victoires de celui qui commence | Parties arrêtées par la limite | Dégâts d'une attaque réussie (moyenne) | Attaques réduites au minimum |
|---|---|---|---|---|---|---|---|
| Joueur hésitant — ordinateur Facile | 9,5 | 7 à 13 | 96 % | 52 % | 0 % | 2,6 | 25 % |
| Joueur hésitant — ordinateur Normal | 9,0 | 7 à 12 | 41 % | 57 % | 0 % | 2,8 | 16 % |
| Joueur hésitant — ordinateur Difficile | 7,6 | 6 à 10 | 13 % | 54 % | 0 % | 2,8 | 15 % |
| Bon lecteur — ordinateur Facile | 8,0 | 6 à 10 | 99 % | 51 % | 0 % | 2,7 | 23 % |
| Bon lecteur — ordinateur Normal | 8,2 | 6 à 10 | 62 % | 57 % | 0 % | 2,8 | 15 % |
| Bon lecteur — ordinateur Difficile | 7,3 | 6 à 9 | 30 % | 59 % | 0 % | 2,8 | 14 % |
| Expert des mots — ordinateur Facile | 7,5 | 6 à 9 | 100 % | 50 % | 0 % | 2,7 | 21 % |
| Expert des mots — ordinateur Normal | 7,8 | 6 à 10 | 72 % | 57 % | 0 % | 2,8 | 13 % |
| Expert des mots — ordinateur Difficile | 7,1 | 6 à 9 | 39 % | 60 % | 0 % | 2,9 | 12 % |
| Connaît son deck par cœur — ordinateur Facile | 6,9 | 5 à 8 | 99 % | 50 % | 0 % | 2,9 | 16 % |
| Connaît son deck par cœur — ordinateur Normal | 7,1 | 6 à 9 | 74 % | 55 % | 0 % | 3,0 | 10 % |
| Connaît son deck par cœur — ordinateur Difficile | 6,6 | 5 à 8 | 43 % | 59 % | 0 % | 3,1 | 9 % |

## Et si… (bon lecteur, collection moyenne, ordinateur Normal)

| Variante | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Victoires de celui qui commence | Parties arrêtées par la limite | Dégâts d'une attaque réussie (moyenne) | Attaques réduites au minimum |
|---|---|---|---|---|---|---|---|
| Réglages actuels | 8,2 | 6 à 10 | 62 % | 57 % | 0 % | 2,8 | 15 % |
| La défense compte entièrement (formule du brief) | 15,4 | 12 à 19 | 67 % | 54 % | 2 % | 1,4 | 71 % |
| La défense compte pour 50 % | 4,3 | 4 à 5 | 70 % | 62 % | 0 % | 5,4 | 0 % |
| La défense compte pour 25 % | 3,1 | 3 à 4 | 74 % | 66 % | 0 % | 7,8 | 0 % |
| La défense ne compte pas | 2,2 | 2 à 3 | 64 % | 69 % | 0 % | 10,4 | 0 % |
| 15 points de vie | 6,0 | 4 à 8 | 62 % | 58 % | 0 % | 2,8 | 14 % |
| 25 points de vie | 10,3 | 8 à 13 | 65 % | 57 % | 0 % | 2,7 | 15 % |
| 30 points de vie | 12,4 | 10 à 15 | 66 % | 56 % | 0 % | 2,7 | 15 % |
| Défense entière et 12 points de vie | 9,1 | 7 à 11 | 64 % | 55 % | 0 % | 1,4 | 71 % |
| Sans triangle des types ni bonus de faction | 11,9 | 10 à 14 | 63 % | 57 % | 0 % | 1,9 | 37 % |

## Grille de réglage (même joueur, même deck, ordinateur Normal)

Dans chaque case : **durée moyenne · victoires de celui qui commence · attaques réussies réduites au minimum**. 1 000 duels par case.

**Chaque camp commence avec un mot en jeu**

|  | 20 points de vie | 25 points de vie | 30 points de vie | 35 points de vie | 40 points de vie |
|---|---|---|---|---|---|
| Défense entière (formule du brief) | 15,3 manches · 53 % · 71 % | 18,4 manches · 52 % · 70 % | 19,7 manches · 50 % · 70 % | 20,0 manches · 50 % · 70 % | 20,0 manches · 49 % · 70 % |
| Défense à 75 % | 8,1 manches · 54 % · 15 % | 10,2 manches · 55 % · 15 % | 12,2 manches · 54 % · 15 % | 14,3 manches · 52 % · 15 % | 16,2 manches · 50 % · 15 % |
| Défense à 50 % | 4,3 manches · 61 % · 0 % | 5,4 manches · 60 % · 0 % | 6,4 manches · 56 % · 0 % | 7,5 manches · 59 % · 0 % | 8,6 manches · 57 % · 0 % |

**Sans mot en jeu au départ (la première attaque ne rencontre aucune défense)**

|  | 20 points de vie | 25 points de vie | 30 points de vie | 35 points de vie | 40 points de vie |
|---|---|---|---|---|---|
| Défense entière (formule du brief) | 11,1 manches · 87 % · 68 % | 15,0 manches · 83 % · 69 % | 18,1 manches · 79 % · 69 % | 19,5 manches · 79 % · 69 % | 19,9 manches · 79 % · 69 % |
| Défense à 75 % | 6,4 manches · 82 % · 14 % | 8,6 manches · 79 % · 15 % | 10,8 manches · 78 % · 16 % | 12,9 manches · 74 % · 16 % | 14,9 manches · 72 % · 15 % |
| Défense à 50 % | 3,8 manches · 77 % · 0 % | 4,9 manches · 74 % · 0 % | 6,0 manches · 71 % · 0 % | 7,1 manches · 69 % · 0 % | 8,1 manches · 67 % · 0 % |
