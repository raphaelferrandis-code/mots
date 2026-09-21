# Simulation de collection

*Généré par `npm run simulation:collection`. Édition de 3 000 cartes dont 90 Légendaires ; 20 joueurs simulés par ligne (on retient le joueur du milieu) ; chaque joueur dépense son Encre en paquets dès qu'il le peut. Les réglages sont dans `src/config/equilibrage.ts`.*

## Avec les réglages actuels

| Profil de joueur | 50 % de la collection | 90 % | 100 % | Légendaires par semaine (2 premiers mois) | Paquets payés avec l'Encre |
|---|---|---|---|---|---|
| Occasionnel (une visite par jour) — 10 paquets gratuits par jour | 41 jours | 4,4 mois | 23,5 mois | 3,6 | 18 % |
| Régulier (trois visites par jour) — 30 paquets gratuits par jour | 14 jours | 45 jours | 7,8 mois | 11,8 | 18 % |
| Acharné (dix visites par jour) — 100 paquets gratuits par jour | 5 jours | 14 jours | 2,4 mois | 42,6 | 18 % |

**Économie de l'Encre :** un paquet coûte 150 Encre et en rapporte au maximum 29,6 en moyenne (quand toutes ses cartes sont des doublons), soit 20 % de son prix. Plus ce chiffre approche de 100 %, plus l'Encre multiplie les paquets.

**Cible du brief :** un joueur régulier termine l'édition en 6 mois à 1 an, avec environ une Légendaire par jour (7 par semaine).

## Et si… (joueur régulier, 30 paquets gratuits par jour)

| Variante | 50 % de la collection | 90 % | 100 % | Légendaires par semaine (2 premiers mois) | Paquets payés avec l'Encre |
|---|---|---|---|---|---|
| Réglages actuels | 14 jours | 45 jours | 7,8 mois | 11,8 | 18 % |
| Paquet à 50 Encre | 12 jours | 33 jours | 4,3 mois | 19,2 | 55 % |
| Paquet à 100 Encre | 14 jours | 42 jours | 6,9 mois | 12,9 | 28 % |
| Paquet à 250 Encre | 14 jours | 47 jours | 8,6 mois | 11,1 | 11 % |
| Légendaire à 2 % au lieu de 4 % | 14 jours | 46 jours | 11,3 mois | 8,6 | 18 % |
| Sans achat de paquets avec l'Encre | 15 jours | 51 jours | 9,6 mois | 10,2 | 0 % |
