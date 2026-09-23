# Simulation de marché

*Généré par `npm run simulation:marche`. 60 joueurs fictifs (30 occasionnels, 20 réguliers, 10 acharnés) pendant 120 jours, avec les vraies cartes, les vraies règles des paquets et les vrais réglages du marché (`src/config/equilibrage.ts`). Chaque enchère dure une journée. Un joueur vend les timbres dont il possède un autre exemplaire dans une autre finition : sa collection reste entière.*

## Ce que ce simulateur prouve, et ce qu’il suppose

Scénarios **gratuits uniquement** : l’ancienne rente payante de 300 Encre/jour et les plafonds supprimés pour les abonnés ont été retirés. Les nombres de paquets ouverts, de duels et le taux de victoire restent des hypothèses. Les règles de gain et de commission utilisent la configuration du jeu ; chaque scénario vérifie la conservation de l’Encre. Les retours d’enchères conservent leurs exemplaires, les doublons tirés dans les paquets sont convertis. Le « désir » représente une disposition à payer supposée : ces résultats ne remplacent pas des observations de joueurs.

## 1. L'Encre du jeu : ce qui entre, ce qui sort

| Réglages | Encre créée par joueur et par jour | Encre détruite | Part détruite par la commission | Encre gardée par le joueur du milieu | Ventes par jour | Prix moyen |
|---|---|---|---|---|---|---|
| Désir ×2 — réglages actuels | 884 | 3 | 100 % | 94 262 | 66 | 27 |
| Désir ×5 — réglages actuels | 885 | 29 | 100 % | 86 222 | 397 | 41 |
| Désir ×10 — réglages actuels | 882 | 44 | 100 % | 81 027 | 395 | 65 |
| Désir ×5 — commission 0 % | 884 | 0 | 0 % | 90 713 | 396 | 41 |
| Désir ×5 — commission 20 % | 883 | 58 | 100 % | 81 794 | 396 | 42 |
| Désir ×5 — sans plafond pour personne | 880 | 43 | 100 % | 87 616 | 577 | 42 |


## 2. Les prix planchers, rareté par rareté

**Désir ×2** — un timbre qui manque vaut 2 fois son Encre de doublon. Invendus : 87 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 50 629 | 10 | 11 | 100 % |
| Peu commune | 3 | 10 | 7 226 | 4 201 | 10 | 42 % |
| Rare | 10 | 30 | 8 853 | 4 220 | 34 | 52 % |
| Épique | 30 | 100 | 423 | 364 | 105 | 14 % |
| Légendaire | 100 | 300 | 16 | 15 | 355 | 6 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Désir ×5** — un timbre qui manque vaut 5 fois son Encre de doublon. Invendus : 24 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 13 150 | 9 704 | 9 | 26 % |
| Peu commune | 3 | 10 | 21 168 | 15 967 | 23 | 25 % |
| Rare | 10 | 30 | 26 118 | 20 395 | 67 | 22 % |
| Épique | 30 | 100 | 1 436 | 1 062 | 249 | 26 % |
| Légendaire | 100 | 300 | 79 | 79 | 865 | 0 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Désir ×10** — un timbre qui manque vaut 10 fois son Encre de doublon. Invendus : 22 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 13 749 | 10 581 | 17 | 23 % |
| Peu commune | 3 | 10 | 20 779 | 16 275 | 40 | 22 % |
| Rare | 10 | 30 | 26 207 | 20 079 | 120 | 23 % |
| Épique | 30 | 100 | 1 048 | 940 | 400 | 10 % |
| Légendaire | 100 | 300 | 70 | 70 | 1 200 | 0 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Sans aucun plancher, au désir ×2** : 24 % d'invendus, contre 87 % avec les planchers actuels. L'écart est ce que les planchers coûtent en ventes manquées ; ils empêchent en échange de brader un timbre rare.

**Les timbres Hors-série ne sont jamais proposés** dans cette simulation, et c’est normal : ils n’ont pas de finition (toujours « Normale »), donc un joueur n’en possède jamais deux exemplaires, et la règle de vente retenue ici ne vend que les timbres dont on garde un autre exemplaire. Leur plancher de 1000 Encre n’est donc pas mis à l’épreuve ici.

### Et si le plancher valait simplement le double de l’Encre d’un doublon ?

Planchers essayés : commune 2, peu commune 6, rare 20, épique 60, légendaire 200, hors-série 1000.

| Désir | Invendus avec les planchers actuels | Invendus avec des planchers doublés |
|---|---|---|
| ×2 | 87 % | 24 % |
| ×5 | 24 % | 24 % |
| ×10 | 22 % | 23 % |

## 3. Les plafonds des joueurs gratuits

Réglages actuels : **10 ventes en cours** et **10 achats par jour** pour un joueur gratuit. Au désir ×5 :

| Plafond | Joueurs qui y butent | Fois par jour, tous joueurs confondus |
|---|---|---|
| 10 ventes en cours | 60 sur 60 | 47 |
| 10 achats par jour | 50 sur 60 | 26 |


### Quel couple de plafonds ?

Ce qui compte n'est pas chaque plafond pris à part, mais l'équilibre entre ce qu'un joueur peut vendre et ce qu'il peut acheter. Si les vendeurs sont plus libres que les acheteurs, le marché se remplit d'invendus. Au désir ×5 :

| Ventes en cours | Achats par jour | Ventes conclues par jour | Invendus | Encre gardée par le joueur du milieu |
|---|---|---|---|---|
| 3 | 3 | 120 | 29 % | 91 189 |
| 10 | 3 | 136 | 73 % | 85 369 |
| 3 | 10 | 155 | 9 % | 92 561 |
| 10 | 10 | 397 | 23 % | 86 600 |
| 20 | 20 | 575 | 6 % | 87 678 |
| sans limite | sans limite | 573 | 6 % | 86 753 |


## Ce que ces chiffres disent

**1. L’Encre ne paie plus de paquets.** La commission des enchères est désormais la seule sortie d’Encre simulée. Il faut comparer les entrées et les sorties avant de fixer les bonus payants ou de vendre de l’Encre.

**2. Le plancher des timbres communs bloque le marché si les joueurs ne sont pas très demandeurs.** Au désir ×2, 50 629 timbres communs sont proposés et 10 trouvent preneur : le plancher de 5 Encre est au-dessus de ce que vaut un timbre commun pour un joueur tiède. Des planchers au double de l'Encre d'un doublon ramènent les invendus de 87 % à 24 %. À l'inverse, un plancher haut évite un marché noyé sous les timbres communs : c'est un choix, pas une erreur.

**3. Le plancher des Légendaires est le plus dur.** Même au désir ×5, 0 % des Légendaires proposées restent invendues à 300 Encre.

**4. Des deux plafonds, c'est celui des achats qui pèse le plus.** 60 joueurs sur 60 butent sur les 10 ventes en cours, 50 sur 60 sur les 10 achats par jour. Sans aucun plafond, le marché voit 575 ventes par jour au lieu de 391. Un joueur accumule des timbres en double finition bien plus vite qu'il ne peut en acheter : si les vendeurs sont plus libres que les acheteurs, les invendus montent.

## Comment lire ces chiffres

- **Si l'Encre créée dépasse durablement l'Encre détruite**, elle s'accumule et les prix montent : c'est l'inflation. Les paquets ne détruisent plus d’Encre ; seule la commission le fait dans cette simulation. Les prix restent une hypothèse de comportement, pas une prévision.
- **Un taux d'invendus élevé pour une rareté** veut dire que son plancher est au-dessus de ce que les joueurs peuvent payer.
- **Beaucoup de joueurs au plafond** veut dire que la limite gêne le jeu ordinaire, et pas seulement les revendeurs.
