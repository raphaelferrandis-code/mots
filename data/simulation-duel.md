# Simulation de duel

*Généré par `npm run simulation:duel`. 100 duels simulés par ligne, avec les vraies cartes de l'édition. À chaque manche, l'ordinateur pose un mot, le joueur lui répond, et les deux attaques sont réglées ensemble. Le joueur fictif aligne les dix meilleures cartes de sa collection et répond par la carte qui lui promet le meilleur échange ; les attaques sont automatiques et ses chances de parer baissent avec la rareté du mot adverse (hypothèses en tête de `simulateurs/duel.ts`). L'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans `src/config/equilibrage.ts`.*

**Format actuel :** 20 PV, 10 manches maximum. Chaque carte ne se joue qu’une fois ; à épuisement d’un camp, les PV restants départagent les joueurs.

**Limite du modèle :** le joueur simulé calcule le meilleur échange immédiat. En jeu, les dégâts ne sont révélés qu’après la manche ; ces résultats ne mesurent pas la difficulté de ce choix pour un humain.

## Avec les réglages actuels — un « bon lecteur », selon sa collection

| Collection et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Débutant (3 paquets ouverts) — ordinateur Facile | 5,7 | 4 à 8 | 95 % | 0 % | 2 % | 3,0 | 31 % | 87 % | 2,9 |
| Débutant (3 paquets ouverts) — ordinateur Normal | 5,2 | 4 à 7 | 63 % | 0 % | 1 % | 3,6 | 13 % | 77 % | 2,9 |
| Débutant (3 paquets ouverts) — ordinateur Difficile | 4,6 | 3 à 6 | 38 % | 0 % | 0 % | 4,2 | 12 % | 65 % | 2,9 |
| Collection moyenne (60 paquets) — ordinateur Facile | 4,4 | 3 à 6 | 100 % | 0 % | 0 % | 4,3 | 0 % | 84 % | 4,5 |
| Collection moyenne (60 paquets) — ordinateur Normal | 4,4 | 3 à 6 | 79 % | 0 % | 0 % | 4,5 | 0 % | 69 % | 4,5 |
| Collection moyenne (60 paquets) — ordinateur Difficile | 4,0 | 3 à 5 | 73 % | 0 % | 0 % | 5,0 | 0 % | 66 % | 4,5 |
| Grande collection (600 paquets) — ordinateur Facile | 3,7 | 3 à 5 | 98 % | 0 % | 0 % | 5,1 | 0 % | 79 % | 8,3 |
| Grande collection (600 paquets) — ordinateur Normal | 3,5 | 3 à 4 | 83 % | 0 % | 0 % | 5,7 | 0 % | 58 % | 8,3 |
| Grande collection (600 paquets) — ordinateur Difficile | 3,4 | 3 à 4 | 90 % | 0 % | 0 % | 6,0 | 0 % | 57 % | 8,3 |

## Selon le joueur (collection moyenne)

| Joueur et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Joueur hésitant — ordinateur Facile | 4,3 | 3 à 6 | 95 % | 0 % | 0 % | 4,5 | 1 % | 66 % | 4,5 |
| Joueur hésitant — ordinateur Normal | 4,2 | 3 à 5 | 64 % | 0 % | 0 % | 4,8 | 0 % | 51 % | 4,5 |
| Joueur hésitant — ordinateur Difficile | 3,7 | 3 à 5 | 56 % | 0 % | 0 % | 5,3 | 1 % | 45 % | 4,5 |
| Bon lecteur — ordinateur Facile | 4,4 | 3 à 6 | 100 % | 0 % | 0 % | 4,3 | 0 % | 84 % | 4,5 |
| Bon lecteur — ordinateur Normal | 4,4 | 3 à 6 | 79 % | 0 % | 0 % | 4,5 | 0 % | 69 % | 4,5 |
| Bon lecteur — ordinateur Difficile | 4,0 | 3 à 5 | 73 % | 0 % | 0 % | 5,0 | 0 % | 66 % | 4,5 |
| Expert des mots — ordinateur Facile | 4,4 | 3 à 6 | 100 % | 0 % | 0 % | 4,1 | 0 % | 93 % | 4,5 |
| Expert des mots — ordinateur Normal | 4,5 | 3 à 6 | 92 % | 0 % | 0 % | 4,2 | 0 % | 87 % | 4,5 |
| Expert des mots — ordinateur Difficile | 4,3 | 3 à 6 | 88 % | 0 % | 0 % | 4,6 | 0 % | 87 % | 4,5 |

## Et si… (bon lecteur, collection moyenne, ordinateur Normal)

| Variante | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Réglages actuels | 4,4 | 3 à 6 | 79 % | 0 % | 0 % | 4,5 | 0 % | 69 % | 4,5 |
| La défense compte entièrement | 9,5 | 8 à 10 | 94 % | 1 % | 73 % | 1,3 | 67 % | 76 % | 4,5 |
| La défense compte pour 75 % | 6,8 | 4 à 9 | 89 % | 0 % | 4 % | 2,7 | 33 % | 73 % | 4,5 |
| 15 points de vie | 3,3 | 2 à 5 | 73 % | 0 % | 0 % | 4,6 | 0 % | 67 % | 4,5 |
| 25 points de vie | 5,5 | 4 à 7 | 80 % | 0 % | 0 % | 4,4 | 0 % | 71 % | 4,5 |
| 30 points de vie | 6,7 | 5 à 8 | 90 % | 0 % | 0 % | 4,4 | 0 % | 72 % | 4,5 |
| Une parade annule toute l'attaque | 6,4 | 4 à 10 | 79 % | 0 % | 14 % | 2,5 | 62 % | 72 % | 4,5 |
| Sans parade (ni pour le joueur, ni pour l'ordinateur) | 3,4 | 3 à 4 | 81 % | 0 % | 0 % | 6,5 | 0 % | 69 % | 4,5 |
| Sans triangle des types ni bonus de faction | 4,9 | 4 à 6 | 70 % | 0 % | 0 % | 4,0 | 1 % | 69 % | 4,5 |
