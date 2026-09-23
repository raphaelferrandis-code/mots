# Simulation de marché

*Généré par `npm run simulation:marche`. 60 joueurs fictifs (30 occasionnels, 20 réguliers, 10 acharnés) pendant 120 jours, avec les vraies cartes, les vraies règles des paquets et les vrais réglages du marché (`src/config/equilibrage.ts`). Chaque enchère dure une journée. Un joueur vend les timbres dont il possède un autre exemplaire dans une autre finition : sa collection reste entière.*

## Ce que ce simulateur prouve, et ce qu’il suppose

Les entrées et les sorties d'Encre sont **exactes** : elles ne dépendent que des règles du jeu (doublons, duels, commission). Ce que les joueurs sont prêts à payer, en revanche, est une **hypothèse**, réglée ici par le « désir » : un timbre qui manque vaut son Encre de doublon multipliée par le désir. Chaque tableau est donc donné pour trois désirs. Ce qui reste vrai dans les trois colonnes est solide ; le reste demande de vrais joueurs.

## 1. L'Encre du jeu : ce qui entre, ce qui sort

| Réglages | Encre créée par joueur et par jour | Encre détruite | Part détruite par la commission | Encre gardée par le joueur du milieu | Ventes par jour | Prix moyen |
|---|---|---|---|---|---|---|
| Désir ×2 — réglages actuels | 884 | 3 | 100 % | 94 799 | 67 | 27 |
| Désir ×5 — réglages actuels | 881 | 30 | 100 % | 87 272 | 402 | 42 |
| Désir ×10 — réglages actuels | 885 | 44 | 100 % | 83 151 | 404 | 64 |
| Désir ×5 — commission 0 % | 884 | 0 | 0 % | 90 413 | 405 | 43 |
| Désir ×5 — commission 20 % | 881 | 60 | 100 % | 82 946 | 410 | 42 |
| Désir ×5 — un joueur sur dix est payant | 912 | 31 | 100 % | 86 932 | 420 | 41 |
| Désir ×5 — sans plafond pour personne | 882 | 43 | 100 % | 89 594 | 582 | 42 |


## 2. Les prix planchers, rareté par rareté

**Désir ×2** — un timbre qui manque vaut 2 fois son Encre de doublon. Invendus : 87 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 51 932 | 17 | 11 | 100 % |
| Peu commune | 3 | 10 | 7 699 | 4 373 | 10 | 43 % |
| Rare | 10 | 30 | 7 035 | 3 941 | 33 | 44 % |
| Épique | 30 | 100 | 535 | 413 | 105 | 23 % |
| Légendaire | 100 | 300 | 37 | 37 | 355 | 0 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Désir ×5** — un timbre qui manque vaut 5 fois son Encre de doublon. Invendus : 23 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 13 695 | 10 173 | 9 | 26 % |
| Peu commune | 3 | 10 | 21 340 | 16 411 | 23 | 23 % |
| Rare | 10 | 30 | 25 972 | 20 610 | 68 | 21 % |
| Épique | 30 | 100 | 1 163 | 946 | 255 | 19 % |
| Légendaire | 100 | 300 | 75 | 75 | 865 | 0 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Désir ×10** — un timbre qui manque vaut 10 fois son Encre de doublon. Invendus : 22 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 14 129 | 10 479 | 17 | 26 % |
| Peu commune | 3 | 10 | 20 595 | 15 921 | 40 | 23 % |
| Rare | 10 | 30 | 26 000 | 20 939 | 120 | 19 % |
| Épique | 30 | 100 | 1 359 | 1 035 | 400 | 24 % |
| Légendaire | 100 | 300 | 69 | 69 | 1 200 | 0 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Sans aucun plancher, au désir ×2** : 21 % d'invendus, contre 87 % avec les planchers actuels. L'écart est ce que les planchers coûtent en ventes manquées ; ils empêchent en échange de brader un timbre rare.

**Les timbres Hors-série ne sont jamais proposés** dans cette simulation, et c’est normal : ils n’ont pas de finition (toujours « Normale »), donc un joueur n’en possède jamais deux exemplaires, et la règle de vente retenue ici ne vend que les timbres dont on garde un autre exemplaire. Leur plancher de 1000 Encre n’est donc pas mis à l’épreuve ici.

### Et si le plancher valait simplement le double de l’Encre d’un doublon ?

Planchers essayés : commune 2, peu commune 6, rare 20, épique 60, légendaire 200, hors-série 1000.

| Désir | Invendus avec les planchers actuels | Invendus avec des planchers doublés |
|---|---|---|
| ×2 | 87 % | 23 % |
| ×5 | 23 % | 22 % |
| ×10 | 22 % | 21 % |

## 3. Les plafonds des joueurs gratuits

Réglages actuels : **10 ventes en cours** et **10 achats par jour** pour un joueur gratuit. Au désir ×5 :

| Plafond | Joueurs qui y butent | Fois par jour, tous joueurs confondus |
|---|---|---|
| 10 ventes en cours | 60 sur 60 | 47 |
| 10 achats par jour | 50 sur 60 | 27 |


### Quel couple de plafonds ?

Ce qui compte n'est pas chaque plafond pris à part, mais l'équilibre entre ce qu'un joueur peut vendre et ce qu'il peut acheter. Si les vendeurs sont plus libres que les acheteurs, le marché se remplit d'invendus. Au désir ×5 :

| Ventes en cours | Achats par jour | Ventes conclues par jour | Invendus | Encre gardée par le joueur du milieu |
|---|---|---|---|---|
| 3 | 3 | 121 | 29 % | 91 193 |
| 10 | 3 | 146 | 71 % | 87 310 |
| 3 | 10 | 152 | 10 % | 93 886 |
| 10 | 10 | 400 | 23 % | 87 666 |
| 20 | 20 | 574 | 6 % | 88 945 |
| sans limite | sans limite | 577 | 6 % | 86 326 |


## Ce que ces chiffres disent

**1. L’Encre ne paie plus de paquets.** La commission des enchères est désormais la seule sortie d’Encre simulée. Il faut comparer les entrées et les sorties avant de fixer les bonus payants ou de vendre de l’Encre.

**2. Le plancher des timbres communs bloque le marché si les joueurs ne sont pas très demandeurs.** Au désir ×2, 51 932 timbres communs sont proposés et 17 trouvent preneur : le plancher de 5 Encre est au-dessus de ce que vaut un timbre commun pour un joueur tiède. Des planchers au double de l'Encre d'un doublon ramènent les invendus de 87 % à 23 %. À l'inverse, un plancher haut évite un marché noyé sous les timbres communs : c'est un choix, pas une erreur.

**3. Le plancher des Légendaires est le plus dur.** Même au désir ×5, 0 % des Légendaires proposées restent invendues à 300 Encre.

**4. Des deux plafonds, c'est celui des achats qui pèse le plus.** 60 joueurs sur 60 butent sur les 10 ventes en cours, 50 sur 60 sur les 10 achats par jour. Sans aucun plafond, le marché voit 575 ventes par jour au lieu de 406. Un joueur accumule des timbres en double finition bien plus vite qu'il ne peut en acheter : si les vendeurs sont plus libres que les acheteurs, les invendus montent.

## Comment lire ces chiffres

- **Si l'Encre créée dépasse durablement l'Encre détruite**, elle s'accumule et les prix montent : c'est l'inflation. Les paquets ne détruisent plus d’Encre ; seule la commission le fait dans cette simulation. Les prix restent une hypothèse de comportement, pas une prévision.
- **Un taux d'invendus élevé pour une rareté** veut dire que son plancher est au-dessus de ce que les joueurs peuvent payer.
- **Beaucoup de joueurs au plafond** veut dire que la limite gêne le jeu ordinaire, et pas seulement les revendeurs.
