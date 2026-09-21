# Simulation de duel

*Généré par `npm run simulation:duel`. 3 000 duels simulés par ligne, avec les vraies cartes de l'édition. Une manche = chaque camp a joué une fois. Le joueur fictif choisit la carte qui lui promet le plus de dégâts ; ses chances de connaître un mot baissent avec la rareté (hypothèses en tête de `simulateurs/duel.ts`). Il aligne les dix meilleures cartes de sa collection ; l'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans `src/config/equilibrage.ts`.*

**Cible du brief :** 6 à 10 manches par partie.

## Avec les réglages actuels — un « bon lecteur », selon son deck

| Deck et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Victoires de celui qui commence | Parties arrêtées par la limite | Dégâts d'une attaque réussie (moyenne) | Attaques réduites au minimum |
|---|---|---|---|---|---|---|---|
| Débutant (3 paquets ouverts) — ordinateur Facile | 7,0 | 4 à 10 | 95 % | 52 % | 0 % | 3,3 | 35 % |
| Débutant (3 paquets ouverts) — ordinateur Normal | 6,4 | 4 à 9 | 58 % | 56 % | 0 % | 3,6 | 27 % |
| Débutant (3 paquets ouverts) — ordinateur Difficile | 5,6 | 4 à 8 | 31 % | 58 % | 0 % | 3,7 | 25 % |
| Collection moyenne (60 paquets) — ordinateur Facile | 7,9 | 6 à 10 | 99 % | 51 % | 0 % | 2,7 | 23 % |
| Collection moyenne (60 paquets) — ordinateur Normal | 8,2 | 6 à 10 | 64 % | 56 % | 0 % | 2,8 | 16 % |
| Collection moyenne (60 paquets) — ordinateur Difficile | 7,4 | 6 à 9 | 32 % | 57 % | 0 % | 2,8 | 15 % |
| Grande collection (600 paquets) — ordinateur Facile | 7,7 | 6 à 9 | 99 % | 51 % | 0 % | 2,7 | 16 % |
| Grande collection (600 paquets) — ordinateur Normal | 7,6 | 6 à 9 | 88 % | 54 % | 0 % | 2,8 | 8 % |
| Grande collection (600 paquets) — ordinateur Difficile | 7,3 | 6 à 9 | 68 % | 58 % | 0 % | 2,8 | 8 % |

## Selon le joueur (collection moyenne)

| Joueur et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Victoires de celui qui commence | Parties arrêtées par la limite | Dégâts d'une attaque réussie (moyenne) | Attaques réduites au minimum |
|---|---|---|---|---|---|---|---|
| Joueur hésitant — ordinateur Facile | 9,4 | 7 à 13 | 96 % | 52 % | 0 % | 2,6 | 25 % |
| Joueur hésitant — ordinateur Normal | 8,9 | 6 à 12 | 41 % | 55 % | 0 % | 2,8 | 16 % |
| Joueur hésitant — ordinateur Difficile | 7,5 | 6 à 10 | 14 % | 52 % | 0 % | 2,8 | 14 % |
| Bon lecteur — ordinateur Facile | 7,9 | 6 à 10 | 99 % | 51 % | 0 % | 2,7 | 23 % |
| Bon lecteur — ordinateur Normal | 8,2 | 6 à 10 | 64 % | 56 % | 0 % | 2,8 | 16 % |
| Bon lecteur — ordinateur Difficile | 7,4 | 6 à 9 | 32 % | 57 % | 0 % | 2,8 | 15 % |
| Expert des mots — ordinateur Facile | 7,4 | 6 à 9 | 99 % | 51 % | 0 % | 2,7 | 21 % |
| Expert des mots — ordinateur Normal | 7,7 | 6 à 10 | 71 % | 56 % | 0 % | 2,8 | 14 % |
| Expert des mots — ordinateur Difficile | 7,1 | 6 à 9 | 37 % | 59 % | 0 % | 2,9 | 12 % |

## Et si… (bon lecteur, collection moyenne, ordinateur Normal)

| Variante | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Victoires de celui qui commence | Parties arrêtées par la limite | Dégâts d'une attaque réussie (moyenne) | Attaques réduites au minimum |
|---|---|---|---|---|---|---|---|
| Réglages actuels | 8,2 | 6 à 10 | 64 % | 56 % | 0 % | 2,8 | 16 % |
| La défense compte entièrement (formule du brief) | 15,3 | 12 à 19 | 67 % | 53 % | 2 % | 1,4 | 71 % |
| La défense compte pour 50 % | 4,3 | 4 à 5 | 69 % | 62 % | 0 % | 5,4 | 0 % |
| La défense compte pour 25 % | 3,1 | 3 à 4 | 73 % | 67 % | 0 % | 7,8 | 0 % |
| La défense ne compte pas | 2,2 | 2 à 3 | 62 % | 70 % | 0 % | 10,4 | 0 % |
| 15 points de vie | 6,0 | 4 à 8 | 62 % | 59 % | 0 % | 2,8 | 15 % |
| 25 points de vie | 10,3 | 8 à 13 | 65 % | 56 % | 0 % | 2,7 | 16 % |
| 30 points de vie | 12,3 | 10 à 15 | 64 % | 55 % | 0 % | 2,7 | 16 % |
| Défense entière et 12 points de vie | 9,1 | 7 à 11 | 65 % | 56 % | 0 % | 1,4 | 71 % |
| Sans triangle des types ni bonus de faction | 12,0 | 10 à 15 | 63 % | 55 % | 0 % | 1,9 | 38 % |

## Grille de réglage (même joueur, même deck, ordinateur Normal)

Dans chaque case : **durée moyenne · victoires de celui qui commence · attaques réussies réduites au minimum**. 1 000 duels par case.

**Chaque camp commence avec un mot en jeu**

|  | 20 points de vie | 25 points de vie | 30 points de vie | 35 points de vie | 40 points de vie |
|---|---|---|---|---|---|
| Défense entière (formule du brief) | 15,3 manches · 53 % · 71 % | 18,3 manches · 50 % · 71 % | 19,7 manches · 48 % · 70 % | 20,0 manches · 48 % · 70 % | 20,0 manches · 47 % · 70 % |
| Défense à 75 % | 8,1 manches · 57 % · 15 % | 10,2 manches · 57 % · 15 % | 12,2 manches · 57 % · 15 % | 14,3 manches · 55 % · 15 % | 16,2 manches · 55 % · 15 % |
| Défense à 50 % | 4,3 manches · 64 % · 0 % | 5,3 manches · 62 % · 0 % | 6,4 manches · 60 % · 0 % | 7,5 manches · 58 % · 0 % | 8,6 manches · 60 % · 0 % |

**Sans mot en jeu au départ (la première attaque ne rencontre aucune défense)**

|  | 20 points de vie | 25 points de vie | 30 points de vie | 35 points de vie | 40 points de vie |
|---|---|---|---|---|---|
| Défense entière (formule du brief) | 11,1 manches · 88 % · 68 % | 15,0 manches · 84 % · 69 % | 18,1 manches · 81 % · 69 % | 19,6 manches · 80 % · 69 % | 19,9 manches · 80 % · 69 % |
| Défense à 75 % | 6,4 manches · 85 % · 14 % | 8,6 manches · 83 % · 15 % | 10,8 manches · 79 % · 16 % | 12,9 manches · 77 % · 15 % | 14,9 manches · 75 % · 15 % |
| Défense à 50 % | 3,8 manches · 78 % · 0 % | 4,9 manches · 75 % · 0 % | 6,0 manches · 73 % · 0 % | 7,0 manches · 72 % · 0 % | 8,2 manches · 69 % · 0 % |
