# Simulation de marché

*Généré par `npm run simulation:marche`. 60 joueurs fictifs (30 occasionnels, 20 réguliers, 10 acharnés) pendant 120 jours, avec les vraies cartes, les vraies règles des paquets et les vrais réglages du marché (`src/config/equilibrage.ts`). Chaque enchère dure une journée. Un joueur vend les timbres dont il possède un autre exemplaire dans une autre finition : sa collection reste entière.*

## Ce que ce simulateur prouve, et ce qu’il suppose

Les entrées et les sorties d'Encre sont **exactes** : elles ne dépendent que des règles du jeu (doublons, duels, paquets achetés, commission). Ce que les joueurs sont prêts à payer, en revanche, est une **hypothèse**, réglée ici par le « désir » : un timbre qui manque vaut son Encre de doublon multipliée par le désir. Chaque tableau est donc donné pour trois désirs. Ce qui reste vrai dans les trois colonnes est solide ; le reste demande de vrais joueurs.

## 1. L'Encre du jeu : ce qui entre, ce qui sort

| Réglages | Encre créée par joueur et par jour | Encre détruite | Part détruite par la commission | Encre gardée par le joueur du milieu | Ventes par jour | Prix moyen |
|---|---|---|---|---|---|---|
| Désir ×2 — réglages actuels | 1 122 | 1 120 | 0 % | 228 | 74 | 27 |
| Désir ×5 — réglages actuels | 1 119 | 1 118 | 2 % | 248 | 391 | 38 |
| Désir ×10 — réglages actuels | 1 116 | 1 115 | 3 % | 235 | 386 | 54 |
| Désir ×5 — commission 0 % | 1 123 | 1 122 | 0 % | 241 | 399 | 38 |
| Désir ×5 — commission 20 % | 1 115 | 1 114 | 5 % | 240 | 389 | 38 |
| Désir ×5 — un joueur sur dix est payant | 1 159 | 1 158 | 2 % | 239 | 407 | 37 |
| Désir ×5 — sans plafond pour personne | 1 117 | 1 115 | 3 % | 228 | 546 | 37 |


## 2. Les prix planchers, rareté par rareté

**Désir ×2** — un timbre qui manque vaut 2 fois son Encre de doublon. Invendus : 86 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 49 233 | 12 | 11 | 100 % |
| Peu commune | 3 | 10 | 8 410 | 4 308 | 10 | 49 % |
| Rare | 10 | 30 | 8 761 | 4 494 | 33 | 49 % |
| Épique | 30 | 100 | 541 | 401 | 105 | 26 % |
| Légendaire | 100 | 300 | 69 | 29 | 300 | 58 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Désir ×5** — un timbre qui manque vaut 5 fois son Encre de doublon. Invendus : 24 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 13 875 | 10 225 | 9 | 26 % |
| Peu commune | 3 | 10 | 21 014 | 15 797 | 21 | 25 % |
| Rare | 10 | 30 | 25 818 | 20 273 | 58 | 21 % |
| Épique | 30 | 100 | 1 407 | 1 027 | 227 | 27 % |
| Légendaire | 100 | 300 | 218 | 57 | 464 | 74 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Désir ×10** — un timbre qui manque vaut 10 fois son Encre de doublon. Invendus : 25 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 13 857 | 10 461 | 17 | 25 % |
| Peu commune | 3 | 10 | 21 109 | 16 076 | 39 | 24 % |
| Rare | 10 | 30 | 25 315 | 18 332 | 95 | 28 % |
| Épique | 30 | 100 | 1 385 | 1 098 | 309 | 21 % |
| Légendaire | 100 | 300 | 69 | 66 | 598 | 4 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Sans aucun plancher, au désir ×2** : 24 % d'invendus, contre 86 % avec les planchers actuels. L'écart est ce que les planchers coûtent en ventes manquées ; ils empêchent en échange de brader un timbre rare.

**Les timbres Hors-série ne sont jamais proposés** dans cette simulation, et c’est normal : ils n’ont pas de finition (toujours « Normale »), donc un joueur n’en possède jamais deux exemplaires, et la règle de vente retenue ici ne vend que les timbres dont on garde un autre exemplaire. Leur plancher de 1000 Encre n’est donc pas mis à l’épreuve ici.

### Et si le plancher valait simplement le double de l’Encre d’un doublon ?

Planchers essayés : commune 2, peu commune 6, rare 20, épique 60, légendaire 200, hors-série 1000.

| Désir | Invendus avec les planchers actuels | Invendus avec des planchers doublés |
|---|---|---|
| ×2 | 86 % | 25 % |
| ×5 | 24 % | 22 % |
| ×10 | 25 % | 23 % |

## 3. Les plafonds des joueurs gratuits

Réglages actuels : **10 ventes en cours** et **10 achats par jour** pour un joueur gratuit. Au désir ×5 :

| Plafond | Joueurs qui y butent | Fois par jour, tous joueurs confondus |
|---|---|---|
| 10 ventes en cours | 60 sur 60 | 47 |
| 10 achats par jour | 50 sur 60 | 24 |


### Quel couple de plafonds ?

Ce qui compte n'est pas chaque plafond pris à part, mais l'équilibre entre ce qu'un joueur peut vendre et ce qu'il peut acheter. Si les vendeurs sont plus libres que les acheteurs, le marché se remplit d'invendus. Au désir ×5 :

| Ventes en cours | Achats par jour | Ventes conclues par jour | Invendus | Encre gardée par le joueur du milieu |
|---|---|---|---|---|
| 3 | 3 | 119 | 30 % | 235 |
| 10 | 3 | 146 | 72 % | 243 |
| 3 | 10 | 145 | 15 % | 239 |
| 10 | 10 | 392 | 24 % | 224 |
| 20 | 20 | 547 | 11 % | 232 |
| sans limite | sans limite | 546 | 11 % | 242 |


## Ce que ces chiffres disent

**1. La commission n'est pas ce qui tient l'économie.** Elle ne détruit que 2 % de l'Encre qui disparaît : tout le reste part en paquets achetés. La passer de 10 % à 20 % ne change presque rien au total. C'est donc un prix de service raisonnable, pas un levier d'équilibrage. Si un jour l'Encre s'accumule, c'est le prix du paquet qu'il faudra regarder, pas la commission.

**2. Le plancher des timbres communs bloque le marché si les joueurs ne sont pas très demandeurs.** Au désir ×2, 49 233 timbres communs sont proposés et 12 trouvent preneur : le plancher de 5 Encre est au-dessus de ce que vaut un timbre commun pour un joueur tiède. Des planchers au double de l'Encre d'un doublon ramènent les invendus de 86 % à 25 %. À l'inverse, un plancher haut évite un marché noyé sous les timbres communs : c'est un choix, pas une erreur.

**3. Le plancher des Légendaires est le plus dur.** Même au désir ×5, 74 % des Légendaires proposées restent invendues à 300 Encre.

**4. Des deux plafonds, c'est celui des achats qui pèse le plus.** 60 joueurs sur 60 butent sur les 10 ventes en cours, 50 sur 60 sur les 10 achats par jour. Sans aucun plafond, le marché voit 547 ventes par jour au lieu de 390. Un joueur accumule des timbres en double finition bien plus vite qu'il ne peut en acheter : si les vendeurs sont plus libres que les acheteurs, les invendus montent.

## Comment lire ces chiffres

- **Si l'Encre créée dépasse durablement l'Encre détruite**, elle s'accumule et les prix montent : c'est l'inflation. La sortie principale reste l'achat de paquets, pas la commission du marché.
- **Un taux d'invendus élevé pour une rareté** veut dire que son plancher est au-dessus de ce que les joueurs peuvent payer.
- **Beaucoup de joueurs au plafond** veut dire que la limite gêne le jeu ordinaire, et pas seulement les revendeurs.
