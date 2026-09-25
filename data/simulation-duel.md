# Simulation de duel

*Généré par `npm run simulation:duel`. 3 000 duels simulés par ligne, avec les vraies cartes de l'édition. À chaque manche, l'un pose un mot face cachée (en Facile, toujours l'ordinateur ; sinon chacun son tour, le joueur d'abord), l'autre lui répond, et les deux attaques sont réglées ensemble. Le joueur fictif aligne les dix meilleures cartes de sa collection ; quand il répond, il joue la carte qui lui promet le meilleur échange contre la face cachée adverse, et quand il pose le premier, sa carte la plus solide. En Difficile, l'ordinateur qui répond joue une carte dont le type bat celui du joueur, s'il en a une ; les attaques sont automatiques et ses chances de parer baissent avec la rareté du mot adverse (hypothèses en tête de `simulateurs/duel.ts`). L'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans `src/config/equilibrage.ts`.*

**Format actuel :** 20 PV, 10 manches maximum. Chaque carte ne se joue qu’une fois ; à épuisement d’un camp, les PV restants départagent les joueurs.

**Limite du modèle :** le joueur simulé calcule le meilleur échange immédiat. En jeu, les dégâts ne sont révélés qu’après la manche ; ces résultats ne mesurent pas la difficulté de ce choix pour un humain.

## Avec les réglages actuels — un « bon lecteur », selon sa collection

| Collection et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Débutant (3 paquets ouverts) — ordinateur Facile | 5,8 | 4 à 8 | 96 % | 0 % | 3 % | 3,0 | 29 % | 88 % | 2,9 |
| Débutant (3 paquets ouverts) — ordinateur Normal | 5,4 | 4 à 7 | 65 % | 0 % | 1 % | 3,6 | 16 % | 78 % | 2,9 |
| Débutant (3 paquets ouverts) — ordinateur Difficile | 4,5 | 3 à 6 | 28 % | 0 % | 0 % | 4,1 | 12 % | 66 % | 2,9 |
| Collection moyenne (60 paquets) — ordinateur Facile | 4,4 | 3 à 6 | 98 % | 0 % | 0 % | 4,2 | 1 % | 86 % | 4,6 |
| Collection moyenne (60 paquets) — ordinateur Normal | 4,4 | 3 à 6 | 78 % | 0 % | 0 % | 4,5 | 0 % | 71 % | 4,6 |
| Collection moyenne (60 paquets) — ordinateur Difficile | 4,0 | 3 à 5 | 58 % | 0 % | 0 % | 4,9 | 0 % | 64 % | 4,6 |
| Grande collection (600 paquets) — ordinateur Facile | 3,6 | 3 à 4 | 99 % | 0 % | 0 % | 5,2 | 0 % | 76 % | 8,2 |
| Grande collection (600 paquets) — ordinateur Normal | 3,5 | 3 à 4 | 85 % | 0 % | 0 % | 5,8 | 0 % | 60 % | 8,2 |
| Grande collection (600 paquets) — ordinateur Difficile | 3,4 | 3 à 4 | 80 % | 0 % | 0 % | 6,1 | 0 % | 56 % | 8,2 |

## Selon le joueur (collection moyenne)

| Joueur et niveau | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Joueur hésitant — ordinateur Facile | 4,4 | 3 à 6 | 91 % | 0 % | 0 % | 4,4 | 1 % | 67 % | 4,6 |
| Joueur hésitant — ordinateur Normal | 4,2 | 3 à 5 | 63 % | 0 % | 0 % | 4,8 | 0 % | 52 % | 4,6 |
| Joueur hésitant — ordinateur Difficile | 3,7 | 3 à 5 | 40 % | 0 % | 0 % | 5,3 | 0 % | 44 % | 4,6 |
| Bon lecteur — ordinateur Facile | 4,4 | 3 à 6 | 98 % | 0 % | 0 % | 4,2 | 1 % | 86 % | 4,6 |
| Bon lecteur — ordinateur Normal | 4,4 | 3 à 6 | 78 % | 0 % | 0 % | 4,5 | 0 % | 71 % | 4,6 |
| Bon lecteur — ordinateur Difficile | 4,0 | 3 à 5 | 58 % | 0 % | 0 % | 4,9 | 0 % | 64 % | 4,6 |
| Expert des mots — ordinateur Facile | 4,5 | 3 à 6 | 100 % | 0 % | 0 % | 4,0 | 1 % | 94 % | 4,6 |
| Expert des mots — ordinateur Normal | 4,6 | 3 à 6 | 91 % | 0 % | 0 % | 4,2 | 0 % | 88 % | 4,6 |
| Expert des mots — ordinateur Difficile | 4,4 | 3 à 6 | 78 % | 0 % | 0 % | 4,6 | 0 % | 83 % | 4,6 |

## Et si… (bon lecteur, collection moyenne, ordinateur Normal)

| Variante | Manches par partie (moyenne) | 8 parties sur 10 durent | Victoires du joueur | Matchs nuls | Parties arrêtées par la limite | Dégâts d'une attaque qui porte (moyenne) | Attaques à 1 dégât ou moins | Attaques de l'ordinateur parées par le joueur | Cartes rares ou mieux dans le deck (sur 10) |
|---|---|---|---|---|---|---|---|---|---|
| Réglages actuels | 4,4 | 3 à 6 | 78 % | 0 % | 0 % | 4,5 | 0 % | 71 % | 4,6 |
| La défense compte entièrement | 9,7 | 9 à 10 | 83 % | 5 % | 78 % | 1,3 | 68 % | 76 % | 4,6 |
| La défense compte pour 75 % | 6,9 | 5 à 9 | 84 % | 0 % | 5 % | 2,7 | 32 % | 73 % | 4,6 |
| 15 points de vie | 3,3 | 2 à 4 | 77 % | 0 % | 0 % | 4,6 | 0 % | 70 % | 4,6 |
| 25 points de vie | 5,6 | 4 à 7 | 79 % | 0 % | 0 % | 4,4 | 0 % | 72 % | 4,6 |
| 30 points de vie | 6,7 | 5 à 8 | 81 % | 0 % | 1 % | 4,3 | 1 % | 73 % | 4,6 |
| Une parade annule toute l'attaque | 6,5 | 3 à 10 | 79 % | 1 % | 16 % | 2,5 | 63 % | 73 % | 4,6 |
| Sans parade (ni pour le joueur, ni pour l'ordinateur) | 3,3 | 3 à 4 | 76 % | 0 % | 0 % | 6,6 | 0 % | 69 % | 4,6 |
| Sans triangle des types ni bonus de faction | 5,0 | 4 à 6 | 77 % | 0 % | 0 % | 4,0 | 1 % | 71 % | 4,6 |
