# Simulation de duel

*Généré par `npm run simulation:duel`. 100 duels simulés par ligne, avec les vraies cartes de l'édition. À chaque manche, l'ordinateur pose un mot, le joueur lui répond, et les deux attaques sont réglées ensemble. Le joueur fictif aligne les dix meilleures cartes de sa collection et répond par la carte qui lui promet le meilleur échange ; ses chances de retrouver une définition baissent avec la rareté du mot (hypothèses en tête de `simulateurs/duel.ts`). L'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans `src/config/equilibrage.ts`.*

**Format actuel :** 20 PV, 10 manches maximum. Chaque carte ne se joue qu’une fois ; à épuisement d’un camp, les PV restants départagent les joueurs.

**Limite du modèle :** le joueur simulé calcule le meilleur échange immédiat. En jeu, les dégâts ne sont révélés qu’après la manche ; ces résultats ne mesurent pas la difficulté de ce choix pour un humain.

## Avec les réglages actuels — un « bon lecteur », selon sa collection

| Collection et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Débutant (3 paquets ouverts) — ordinateur Facile | 6,7 | 5 à 10 | 97 % | 0 % | 15 % | 3,0 | 31 % | 90 % | 2,6 |
| Débutant (3 paquets ouverts) — ordinateur Normal | 6,2 | 4 à 9 | 70 % | 0 % | 7 % | 3,5 | 18 % | 80 % | 2,6 |
| Débutant (3 paquets ouverts) — ordinateur Difficile | 5,3 | 4 à 8 | 34 % | 0 % | 2 % | 3,9 | 14 % | 67 % | 2,6 |
| Collection moyenne (60 paquets) — ordinateur Facile | 6,0 | 4 à 8 | 100 % | 0 % | 1 % | 3,4 | 3 % | 90 % | 1,5 |
| Collection moyenne (60 paquets) — ordinateur Normal | 6,1 | 4 à 8 | 83 % | 0 % | 1 % | 3,4 | 2 % | 84 % | 1,5 |
| Collection moyenne (60 paquets) — ordinateur Difficile | 5,6 | 4 à 7 | 43 % | 0 % | 0 % | 3,7 | 2 % | 73 % | 1,5 |
| Grande collection (600 paquets) — ordinateur Facile | 5,5 | 4 à 7 | 99 % | 0 % | 0 % | 3,7 | 0 % | 90 % | 2,3 |
| Grande collection (600 paquets) — ordinateur Normal | 5,6 | 4 à 7 | 88 % | 0 % | 0 % | 3,7 | 0 % | 82 % | 2,3 |
| Grande collection (600 paquets) — ordinateur Difficile | 5,4 | 4 à 7 | 48 % | 0 % | 0 % | 3,9 | 0 % | 72 % | 2,3 |

## Selon le joueur (collection moyenne)

| Joueur et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Joueur hésitant — ordinateur Facile | 7,2 | 5 à 10 | 88 % | 1 % | 4 % | 3,3 | 6 % | 78 % | 0,6 |
| Joueur hésitant — ordinateur Normal | 6,9 | 5 à 8 | 53 % | 0 % | 1 % | 3,3 | 3 % | 65 % | 0,6 |
| Joueur hésitant — ordinateur Difficile | 5,3 | 4 à 7 | 8 % | 0 % | 0 % | 3,8 | 3 % | 52 % | 0,6 |
| Bon lecteur — ordinateur Facile | 6,0 | 4 à 8 | 100 % | 0 % | 1 % | 3,4 | 3 % | 90 % | 1,5 |
| Bon lecteur — ordinateur Normal | 6,1 | 4 à 8 | 83 % | 0 % | 1 % | 3,4 | 2 % | 84 % | 1,5 |
| Bon lecteur — ordinateur Difficile | 5,6 | 4 à 7 | 43 % | 0 % | 0 % | 3,7 | 2 % | 73 % | 1,5 |
| Expert des mots — ordinateur Facile | 5,2 | 4 à 7 | 100 % | 0 % | 0 % | 3,8 | 1 % | 96 % | 2,9 |
| Expert des mots — ordinateur Normal | 5,6 | 4 à 7 | 88 % | 0 % | 0 % | 3,6 | 1 % | 91 % | 2,9 |
| Expert des mots — ordinateur Difficile | 5,5 | 4 à 7 | 74 % | 0 % | 0 % | 3,8 | 1 % | 88 % | 2,9 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Facile | 4,5 | 4 à 6 | 100 % | 0 % | 0 % | 4,3 | 0 % | 86 % | 4,5 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Normal | 4,4 | 3 à 6 | 91 % | 0 % | 0 % | 4,5 | 0 % | 72 % | 4,5 |
| Bon lecteur qui connaît son deck par cœur — ordinateur Difficile | 4,1 | 3 à 5 | 78 % | 0 % | 0 % | 5,0 | 0 % | 64 % | 4,5 |

## Et si… (bon lecteur, collection moyenne, ordinateur Normal)

| Variante | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Réglages actuels | 6,1 | 4 à 8 | 83 % | 0 % | 1 % | 3,4 | 2 % | 84 % | 1,5 |
| La défense compte entièrement | 10,0 | 10 à 10 | 94 % | 6 % | 100 % | 0,7 | 84 % | 87 % | 1,5 |
| La défense compte pour 75 % | 9,2 | 7 à 10 | 93 % | 3 % | 53 % | 1,7 | 53 % | 86 % | 1,5 |
| 15 points de vie | 4,7 | 3 à 6 | 82 % | 0 % | 0 % | 3,4 | 1 % | 83 % | 1,5 |
| 25 points de vie | 7,7 | 6 à 10 | 88 % | 0 % | 6 % | 3,4 | 2 % | 85 % | 1,5 |
| 30 points de vie | 8,9 | 7 à 10 | 84 % | 1 % | 30 % | 3,3 | 3 % | 86 % | 1,5 |
| Une parade annule toute l'attaque | 9,2 | 7 à 10 | 85 % | 0 % | 69 % | 1,3 | 76 % | 87 % | 1,5 |
| Sans parade (ni pour le joueur, ni pour l'ordinateur) | 4,1 | 3 à 5 | 85 % | 0 % | 0 % | 5,5 | 0 % | 83 % | 1,5 |
| Sans triangle des types ni bonus de faction | 7,2 | 6 à 9 | 81 % | 0 % | 2 % | 2,9 | 4 % | 84 % | 1,5 |
