# Analyse du poids des cartes et du savoir

Simulation reproductible : 2000 combats par scénario, règles actuelles (20 PV, 10 manches maximum). Exécuter : node --experimental-strip-types simulateurs/analyse-combat.mjs.

Cartes réelles de l’édition, decks sans doublons ni carte partagée entre camps. « Faibles » et « fortes » : quart inférieur/supérieur des communes selon attaque + défense en jeu. Légendaires : échantillon de toutes les légendaires. Nouveaux decks pour chaque graine.

Connaissance 85/75 = 85 % de réussite de sa propre définition, 75 % de parade. Adversaire fixé à 85/75 sauf scénario « hésitantes » (65/65). Ces probabilités sont des hypothèses, uniformes entre raretés pour isoler les facteurs. Exceptions explicites : les deux scénarios de joutes utilisent les estimations configurées (communes : attaque 90 %, parade 85 % ; légendaires : attaque 50 %, parade 30 %), puis des attaques apprises à 95 % en conservant ces parades. Hors de ces exceptions, ce ne sont pas les valeurs par défaut du jeu ; aucun de ces profils ne constitue une mesure des joueurs.

Le double utilise la politique réelle des joutes (meilleure carte brute avec enchaînement). Le joueur choisit le meilleur échange immédiat en espérance, sauf scénario au hasard : il dispose donc d’un calcul idéal, ne planifie pas plusieurs manches, et bénéficie de la réponse à une carte visible et de la première attaque. Les résultats ne représentent pas un duel humain symétrique.

Construction : mêmes collections de 60 communes et mêmes adversaires entre les quatre méthodes. Force = dix meilleurs totaux attaque + défense ; types = rotation nom/adjectif/verbe en prenant la plus forte disponible ; faction = meilleure faction ayant dix cartes, sinon force. Ce sont des heuristiques, pas une recherche du deck optimal. Les lignes « Face à un deck fort » construisent aussi le deck adverse à partir des dix plus fortes cartes d’une autre collection de 60 communes, pour éviter un effet plafond face à un deck aléatoire.

Échantillon de 2 000 combats par ligne : incertitude binomiale maximale d’environ ±2,2 points à 95 %, sans inclure l’incertitude du modèle. Zéro victoire observée ne prouve pas une impossibilité.

| Scénario | Victoires % | Nuls % | Manches | Att./Déf. joueur | Att./Déf. adverse |
|---|---:|---:|---:|---:|---:|
| Communes variées, connaissance 65/65 | 36.9 | 4 | 9.4 | 5.2 / 6.7 | 5.2 / 6.6 |
| Communes variées, connaissance 85/75 | 62.3 | 5.2 | 9.2 | 5.2 / 6.7 | 5.2 / 6.6 |
| Communes variées, connaissance 95/95 | 84.8 | 2.2 | 9.1 | 5.2 / 6.7 | 5.2 / 6.6 |
| Communes variées, choix au hasard | 46.4 | 5 | 9.2 | 5.2 / 6.7 | 5.2 / 6.6 |
| Communes faibles contre communes fortes, 85/75 | 0 | 0 | 6.7 | 3.2 / 4.1 | 7.9 / 8.4 |
| Communes faibles contre communes fortes, 95/95 | 0 | 0.1 | 7.9 | 3.2 / 4.1 | 7.9 / 8.4 |
| Communes faibles contre communes fortes, 100/100 | 0.1 | 0.1 | 8.3 | 3.2 / 4.1 | 7.9 / 8.4 |
| Communes fortes contre légendaires, 85/75 | 69.2 | 0.1 | 6.1 | 7.9 / 8.4 | 8.6 / 5.7 |
| Communes fortes contre légendaires, 95/95 | 92.4 | 0.1 | 5.9 | 7.9 / 8.4 | 8.6 / 5.7 |
| Communes faibles expertes contre fortes hésitantes | 2.1 | 1 | 9.1 | 3.2 / 4.1 | 7.9 / 8.4 |
| Collection identique de 60 communes : aleatoire | 62.9 | 3.9 | 9.2 | 5.2 / 6.7 | 5.2 / 6.6 |
| Collection identique de 60 communes : force | 99 | 0.1 | 7.1 | 8.3 / 8.7 | 5.2 / 6.6 |
| Collection identique de 60 communes : types | 98.9 | 0.1 | 7 | 8.1 / 8.4 | 5.2 / 6.6 |
| Collection identique de 60 communes : faction | 93.2 | 1.4 | 8 | 6.4 / 8 | 5.2 / 6.6 |
| Face à un deck fort : aleatoire | 5.8 | 0.6 | 7.7 | 5.2 / 6.7 | 8.3 / 8.6 |
| Face à un deck fort : force | 67.5 | 1.1 | 7.4 | 8.3 / 8.7 | 8.3 / 8.6 |
| Face à un deck fort : types | 66 | 1.3 | 7.4 | 8.1 / 8.4 | 8.3 / 8.6 |
| Face à un deck fort : faction | 35.5 | 2.5 | 7.7 | 6.4 / 8 | 8.3 / 8.6 |
| Face à un deck fort : force, sans bonus | 50.1 | 3.9 | 8.5 | 8.3 / 8.7 | 8.3 / 8.6 |
| Communes fortes contre légendaires : savoirs par défaut des joutes | 76.8 | 0.1 | 6.4 | 7.9 / 8.4 | 8.6 / 5.7 |
| Communes fortes contre légendaires : deux decks appris à 95 %, parades par défaut | 26.4 | 0 | 4.8 | 7.9 / 8.4 | 8.6 / 5.7 |
| Collection de 60 communes : force, sans bonus | 98.3 | 0.4 | 8.2 | 8.3 / 8.7 | 5.2 / 6.6 |

Le scénario sans bonus retire les bonus des deux camps : il mesure leur effet net sur ce duel, pas uniquement le bénéfice personnel du joueur.
