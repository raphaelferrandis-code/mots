# Analyse du poids des cartes et du savoir

Simulation reproductible : 2000 combats par scénario, règles actuelles (20 PV, 10 manches maximum). Exécuter : node --experimental-strip-types simulateurs/analyse-combat.mjs.

Cartes réelles de l’édition, decks sans doublons ni carte partagée entre camps. « Faibles » et « fortes » : quart inférieur/supérieur des communes selon attaque + défense en jeu. Légendaires : échantillon de toutes les légendaires. Nouveaux decks pour chaque graine.

Attaques automatiques dans les deux camps. Parade du joueur à 75 % et du double à 75 %, sauf indication dans la ligne. Le scénario faible expert contre fort hésitant utilise des parades de 95 % contre 65 %. Le scénario de joute utilise les parades par défaut : 30 % contre les légendaires et 85 % contre les communes. Ces probabilités sont des hypothèses, pas des observations de joueurs.

Le double utilise la politique réelle des joutes (meilleure carte brute avec enchaînement). Le joueur choisit le meilleur échange immédiat en espérance, sauf scénario au hasard : il dispose donc d’un calcul idéal, ne planifie pas plusieurs manches, et bénéficie de la réponse à une carte visible et de la première attaque. Les résultats ne représentent pas un duel humain symétrique.

Construction : mêmes collections de 60 communes et mêmes adversaires entre les quatre méthodes. Force = dix meilleurs totaux attaque + défense ; types = rotation nom/adjectif/verbe en prenant la plus forte disponible ; faction = meilleure faction ayant dix cartes, sinon force. Ce sont des heuristiques, pas une recherche du deck optimal. Les lignes « Face à un deck fort » construisent aussi le deck adverse à partir des dix plus fortes cartes d’une autre collection de 60 communes, pour éviter un effet plafond face à un deck aléatoire.

Échantillon de 2 000 combats par ligne : incertitude binomiale maximale d’environ ±2,2 points à 95 %, sans inclure l’incertitude du modèle. Zéro victoire observée ne prouve pas une impossibilité.

| Scénario | Victoires % | Nuls % | Manches | Att./Déf. joueur | Att./Déf. adverse |
|---|---:|---:|---:|---:|---:|
| Communes variées, parade 65 % | 57 | 4 | 8.5 | 5.2 / 6.7 | 5.2 / 6.6 |
| Communes variées, parade 75 % | 65.3 | 3.8 | 8.7 | 5.2 / 6.7 | 5.2 / 6.6 |
| Communes variées, parade 95 % | 81.7 | 3.6 | 9 | 5.2 / 6.7 | 5.2 / 6.6 |
| Communes variées, choix au hasard | 45.4 | 3.9 | 8.8 | 5.2 / 6.7 | 5.2 / 6.6 |
| Communes faibles contre communes fortes, parade 75 % | 0 | 0 | 5.8 | 3.2 / 4.1 | 7.9 / 8.4 |
| Communes faibles contre communes fortes, parade 95 % | 0 | 0 | 6.9 | 3.2 / 4.1 | 7.9 / 8.4 |
| Communes faibles contre communes fortes, parade 100 % | 0 | 0 | 7.3 | 3.2 / 4.1 | 7.9 / 8.4 |
| Communes fortes contre légendaires, parade 75 % | 72.5 | 0 | 5.3 | 7.9 / 8.4 | 8.6 / 5.7 |
| Communes fortes contre légendaires, parade 95 % | 90.1 | 0 | 5.6 | 7.9 / 8.4 | 8.6 / 5.7 |
| Communes faibles expertes contre fortes hésitantes | 0 | 0 | 6.9 | 3.2 / 4.1 | 7.9 / 8.4 |
| Collection identique de 60 communes : aleatoire | 65.2 | 4.1 | 8.7 | 5.2 / 6.7 | 5.2 / 6.6 |
| Collection identique de 60 communes : force | 99.6 | 0 | 6.1 | 8.3 / 8.7 | 5.2 / 6.6 |
| Collection identique de 60 communes : types | 99.7 | 0 | 6.1 | 8.1 / 8.4 | 5.2 / 6.6 |
| Collection identique de 60 communes : faction | 95.4 | 0.8 | 7.2 | 6.4 / 8 | 5.2 / 6.6 |
| Face à un deck fort : aleatoire | 6.3 | 0.1 | 6.8 | 5.2 / 6.7 | 8.3 / 8.6 |
| Face à un deck fort : force | 75.3 | 0.1 | 6.5 | 8.3 / 8.7 | 8.3 / 8.6 |
| Face à un deck fort : types | 73.6 | 0.1 | 6.5 | 8.1 / 8.4 | 8.3 / 8.6 |
| Face à un deck fort : faction | 39.2 | 0.6 | 6.8 | 6.4 / 8 | 8.3 / 8.6 |
| Face à un deck fort : force, sans bonus | 55.7 | 2 | 7.6 | 8.3 / 8.7 | 8.3 / 8.6 |
| Communes fortes contre légendaires : savoirs par défaut des joutes | 24.6 | 0 | 4.6 | 7.9 / 8.4 | 8.6 / 5.7 |
| Collection de 60 communes : force, sans bonus | 99.5 | 0 | 7.2 | 8.3 / 8.7 | 5.2 / 6.6 |

Le scénario sans bonus retire les bonus des deux camps : il mesure leur effet net sur ce duel, pas uniquement le bénéfice personnel du joueur.
