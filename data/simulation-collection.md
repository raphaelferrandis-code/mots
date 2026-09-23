# Simulation de collection

*Généré par `npm run simulation:collection`. Édition de 3 000 cartes ordinaires dont 90 Légendaires, plus 16 cartes Hors-série comptées à part ; 20 joueurs simulés par ligne (on retient le joueur du milieu) ; les joueurs ouvrent uniquement les paquets reçus avec le temps. Les réglages sont dans `src/config/equilibrage.ts`.*

## Avec les réglages actuels

| Profil de joueur | 50 % de la collection | 90 % | 100 % | Légendaires par semaine (2 premiers mois) | Paquets payés avec l'Encre | Première carte Hors-série | Cartes Hors-série tirées en un an (il en existe 16) | Cartes brillantes ou holographiques le premier mois |
|---|---|---|---|---|---|---|---|---|
| Occasionnel (une visite par jour) — 10 paquets gratuits par jour | 43 jours | 5,0 mois | 2,4 ans | 3,4 | 0 % | 47 jours | 4,2 | 145 |
| Régulier (trois visites par jour) — 30 paquets gratuits par jour | 15 jours | 51 jours | 9,4 mois | 10,6 | 0 % | 16 jours | 11,1 | 431 |
| Acharné (dix visites par jour) — 100 paquets gratuits par jour | 5 jours | 16 jours | 2,8 mois | 34,9 | 0 % | 5 jours | 36,4 | 1432 |

**Économie de l’Encre :** l’Encre sert uniquement aux enchères. Aucun paquet ne peut être acheté. Cette simulation ne modélise pas les échanges du marché.

**Cible du brief :** un joueur régulier termine l'édition en 6 mois à 1 an, avec environ une Légendaire par jour (7 par semaine).

## Et si… (joueur régulier, 30 paquets gratuits par jour)

| Variante | 50 % de la collection | 90 % | 100 % | Légendaires par semaine (2 premiers mois) | Paquets payés avec l'Encre | Première carte Hors-série | Cartes Hors-série tirées en un an (il en existe 16) | Cartes brillantes ou holographiques le premier mois |
|---|---|---|---|---|---|---|---|---|
| Réglages actuels | 15 jours | 51 jours | 9,4 mois | 10,6 | 0 % | 16 jours | 11,1 | 431 |
| Légendaire à 2 % au lieu de 4 % | 15 jours | 51 jours | 12,7 mois | 7,7 | 0 % | 25 jours | 11,4 | 423 |
| Carte Hors-série : 1 paquet sur 300 | 15 jours | 51 jours | 10,0 mois | 10,4 | 0 % | 7 jours | 37,3 | 428 |
| Carte Hors-série : 1 paquet sur 3000 | 15 jours | 51 jours | 8,9 mois | 10,6 | 0 % | 52 jours | 4,3 | 432 |
