# Simulation de collection

*Généré par `npm run simulation:collection`. Édition de 3 000 cartes ordinaires dont 90 Légendaires, plus 16 cartes Hors-série comptées à part ; 20 joueurs simulés par ligne (on retient le joueur du milieu) ; les joueurs ouvrent uniquement les paquets reçus avec le temps. Les réglages sont dans `src/config/equilibrage.ts`.*

## Avec les réglages actuels

| Profil de joueur | 50 % de la collection | 90 % | 100 % | Légendaires par semaine (2 premiers mois) | Paquets payés avec l'Encre | Première carte Hors-série | Cartes Hors-série tirées en un an (il en existe 16) | Cartes brillantes ou holographiques le premier mois |
|---|---|---|---|---|---|---|---|---|
| Occasionnel (une visite par jour) — 10 paquets gratuits par jour | 37 jours | 4,5 mois | 18,2 mois | 7,0 | 0 % | 2,3 mois | 3,8 | 171 |
| Régulier (trois visites par jour) — 30 paquets gratuits par jour | 13 jours | 46 jours | 6,1 mois | 20,9 | 0 % | 24 jours | 11,2 | 514 |
| Acharné (dix visites par jour) — 100 paquets gratuits par jour | 4 jours | 14 jours | 56 jours | 69,9 | 0 % | 8 jours | 37,3 | 1725 |

**Économie de l’Encre :** l’Encre sert uniquement aux enchères. Aucun paquet ne peut être acheté. Cette simulation ne modélise pas les échanges du marché.

**Cible du brief :** un joueur régulier termine l'édition en 6 mois à 1 an, avec environ une Légendaire par jour (7 par semaine).

## Et si… (joueur régulier, 30 paquets gratuits par jour)

| Variante | 50 % de la collection | 90 % | 100 % | Légendaires par semaine (2 premiers mois) | Paquets payés avec l'Encre | Première carte Hors-série | Cartes Hors-série tirées en un an (il en existe 16) | Cartes brillantes ou holographiques le premier mois |
|---|---|---|---|---|---|---|---|---|
| Réglages actuels | 13 jours | 46 jours | 6,1 mois | 20,9 | 0 % | 24 jours | 11,2 | 514 |
| Avant le 26/09 : cinq timbres, garantie au 40e paquet | 15 jours | 51 jours | 9,4 mois | 10,6 | 0 % | 16 jours | 11,1 | 431 |
| Légendaire à 2 % au lieu de 4 % | 13 jours | 47 jours | 7,1 mois | 15,1 | 0 % | 28 jours | 11,1 | 520 |
| Carte Hors-série : 1 paquet sur 300 | 13 jours | 46 jours | 6,3 mois | 20,8 | 0 % | 9 jours | 37,3 | 515 |
| Carte Hors-série : 1 paquet sur 3000 | 13 jours | 46 jours | 6,3 mois | 20,8 | 0 % | 3,2 mois | 3,3 | 517 |
