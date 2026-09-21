# Simulation de collection

*Généré par `npm run simulation:collection`. Édition de 3 000 cartes ordinaires dont 90 Légendaires, plus 16 cartes Hors-série comptées à part ; 20 joueurs simulés par ligne (on retient le joueur du milieu) ; chaque joueur dépense son Encre en paquets dès qu'il le peut. Les réglages sont dans `src/config/equilibrage.ts`.*

## Avec les réglages actuels

| Profil de joueur | 50 % de la collection | 90 % | 100 % | Légendaires par semaine (2 premiers mois) | Paquets payés avec l'Encre | Première carte Hors-série | Cartes Hors-série tirées en un an (il en existe 16) | Cartes brillantes ou holographiques le premier mois |
|---|---|---|---|---|---|---|---|---|
| Occasionnel (une visite par jour) — 10 paquets gratuits par jour | 41 jours | 4,4 mois | 23,0 mois | 3,7 | 19 % | 44 jours | 4,7 | 150 |
| Régulier (trois visites par jour) — 30 paquets gratuits par jour | 14 jours | 45 jours | 7,7 mois | 11,9 | 20 % | 15 jours | 14,4 | 471 |
| Acharné (dix visites par jour) — 100 paquets gratuits par jour | 5 jours | 14 jours | 2,3 mois | 42,7 | 23 % | 5 jours | 47,2 | 1695 |

**Économie de l'Encre :** un paquet coûte 150 Encre et en rapporte au maximum 38,4 en moyenne (quand toutes ses cartes sont des doublons), soit 26 % de son prix. Plus ce chiffre approche de 100 %, plus l'Encre multiplie les paquets.

**Cible du brief :** un joueur régulier termine l'édition en 6 mois à 1 an, avec environ une Légendaire par jour (7 par semaine).

## Et si… (joueur régulier, 30 paquets gratuits par jour)

| Variante | 50 % de la collection | 90 % | 100 % | Légendaires par semaine (2 premiers mois) | Paquets payés avec l'Encre | Première carte Hors-série | Cartes Hors-série tirées en un an (il en existe 16) | Cartes brillantes ou holographiques le premier mois |
|---|---|---|---|---|---|---|---|---|
| Réglages actuels | 14 jours | 45 jours | 7,7 mois | 11,9 | 20 % | 15 jours | 14,4 | 471 |
| Paquet à 50 Encre | 13 jours | 34 jours | 4,1 mois | 18,7 | 68 % | 14 jours | 33,6 | 623 |
| Paquet à 100 Encre | 14 jours | 43 jours | 6,8 mois | 13,0 | 31 % | 15 jours | 15,8 | 499 |
| Paquet à 250 Encre | 14 jours | 48 jours | 8,4 mois | 11,3 | 12 % | 15 jours | 13,0 | 453 |
| Légendaire à 2 % au lieu de 4 % | 14 jours | 46 jours | 10,3 mois | 8,6 | 20 % | 24 jours | 13,8 | 463 |
| Carte Hors-série : 1 paquet sur 300 | 14 jours | 45 jours | 8,1 mois | 11,9 | 21 % | 7 jours | 47,1 | 469 |
| Carte Hors-série : 1 paquet sur 3000 | 14 jours | 45 jours | 7,2 mois | 12,1 | 20 % | 47 jours | 5,1 | 473 |
| Sans achat de paquets avec l'Encre | 15 jours | 51 jours | 9,4 mois | 10,6 | 0 % | 16 jours | 11,1 | 431 |
