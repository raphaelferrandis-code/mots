# Simulation de marché

*Généré par `npm run simulation:marche`. 60 joueurs fictifs (30 occasionnels, 20 réguliers, 10 acharnés) pendant 120 jours, avec les vraies cartes, les vraies règles des paquets et les vrais réglages du marché (`src/config/equilibrage.ts`). Chaque enchère dure une journée. Un joueur vend les timbres dont il possède un autre exemplaire dans une autre finition : sa collection reste entière.*

## Ce que ce simulateur prouve, et ce qu’il suppose

Les entrées et les sorties d'Encre sont **exactes** : elles ne dépendent que des règles du jeu (doublons, duels, paquets achetés, commission). Ce que les joueurs sont prêts à payer, en revanche, est une **hypothèse**, réglée ici par le « désir » : un timbre qui manque vaut son Encre de doublon multipliée par le désir. Chaque tableau est donc donné pour trois désirs. Ce qui reste vrai dans les trois colonnes est solide ; le reste demande de vrais joueurs.

## 1. L'Encre du jeu : ce qui entre, ce qui sort

| Réglages | Encre créée par joueur et par jour | Encre détruite | Part détruite par la commission | Encre gardée par le joueur du milieu | Ventes par jour | Prix moyen |
|---|---|---|---|---|---|---|
| Désir ×2 — réglages actuels | 1 124 | 1 122 | 0 % | 239 | 18 | 27 |
| Désir ×5 — réglages actuels | 1 119 | 1 117 | 1 % | 221 | 117 | 38 |
| Désir ×10 — réglages actuels | 1 124 | 1 123 | 1 % | 225 | 117 | 55 |
| Désir ×5 — commission 0 % | 1 124 | 1 122 | 0 % | 243 | 116 | 37 |
| Désir ×5 — commission 20 % | 1 123 | 1 121 | 1 % | 231 | 118 | 38 |
| Désir ×5 — un joueur sur dix est payant | 1 160 | 1 158 | 1 % | 245 | 141 | 37 |
| Désir ×5 — sans plafond pour personne | 1 117 | 1 115 | 3 % | 228 | 546 | 37 |


## 2. Les prix planchers, rareté par rareté

**Désir ×2** — un timbre qui manque vaut 2 fois son Encre de doublon. Invendus : 87 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 15 751 | 5 | 11 | 100 % |
| Peu commune | 3 | 10 | 2 848 | 1 396 | 10 | 51 % |
| Rare | 10 | 30 | 1 976 | 1 068 | 34 | 46 % |
| Épique | 30 | 100 | 147 | 124 | 106 | 16 % |
| Légendaire | 100 | 300 | 18 | 4 | 300 | 78 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Désir ×5** — un timbre qui manque vaut 5 fois son Encre de doublon. Invendus : 31 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 5 232 | 3 772 | 9 | 28 % |
| Peu commune | 3 | 10 | 7 352 | 5 045 | 23 | 31 % |
| Rare | 10 | 30 | 7 234 | 4 842 | 65 | 33 % |
| Épique | 30 | 100 | 499 | 406 | 236 | 19 % |
| Légendaire | 100 | 300 | 81 | 41 | 333 | 49 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Désir ×10** — un timbre qui manque vaut 10 fois son Encre de doublon. Invendus : 32 % de ce qui est proposé.

| Rareté | Encre si doublon | Plancher | Mis en vente | Vendus | Prix médian obtenu | Invendus |
|---|---|---|---|---|---|---|
| Commune | 1 | 5 | 5 459 | 4 105 | 17 | 25 % |
| Peu commune | 3 | 10 | 6 914 | 4 606 | 40 | 33 % |
| Rare | 10 | 30 | 7 552 | 4 747 | 120 | 37 % |
| Épique | 30 | 100 | 489 | 435 | 297 | 11 % |
| Légendaire | 100 | 300 | 33 | 26 | 383 | 21 % |
| Hors-série | 500 | 1 000 | 0 | 0 | — | — |

**Sans aucun plancher, au désir ×2** : 31 % d'invendus, contre 87 % avec les planchers actuels. L'écart est ce que les planchers coûtent en ventes manquées ; ils empêchent en échange de brader un timbre rare.

**Les timbres Hors-série ne sont jamais proposés** dans cette simulation, et c’est normal : ils n’ont pas de finition (toujours « Normale »), donc un joueur n’en possède jamais deux exemplaires, et la règle de vente retenue ici ne vend que les timbres dont on garde un autre exemplaire. Leur plancher de 1000 Encre n’est donc pas mis à l’épreuve ici.

### Et si le plancher valait simplement le double de l’Encre d’un doublon ?

Planchers essayés : commune 2, peu commune 6, rare 20, épique 60, légendaire 200, hors-série 1000.

| Désir | Invendus avec les planchers actuels | Invendus avec des planchers doublés |
|---|---|---|
| ×2 | 87 % | 33 % |
| ×5 | 31 % | 29 % |
| ×10 | 32 % | 31 % |

## 3. Les plafonds des joueurs gratuits

Avec les réglages actuels (3 ventes en cours, 3 achats par jour), au désir ×5 : **60 joueurs sur 60** ont buté sur le plafond de ventes au moins une fois, 55 fois par jour en tout pour l'ensemble des joueurs.

## Ce que ces chiffres disent

**1. La commission n'est pas ce qui tient l'économie.** Elle ne détruit que 1 % de l'Encre qui disparaît : tout le reste part en paquets achetés. La passer de 10 % à 20 % ne change presque rien au total. C'est donc un prix de service raisonnable, pas un levier d'équilibrage. Si un jour l'Encre s'accumule, c'est le prix du paquet qu'il faudra regarder, pas la commission.

**2. Le plancher des timbres communs bloque le marché si les joueurs ne sont pas très demandeurs.** Au désir ×2, 15 751 timbres communs sont proposés et 5 trouvent preneur : le plancher de 5 Encre est au-dessus de ce que vaut un timbre commun pour un joueur tiède. Des planchers au double de l'Encre d'un doublon ramènent les invendus de 87 % à 33 %. À l'inverse, un plancher haut évite un marché noyé sous les timbres communs : c'est un choix, pas une erreur.

**3. Le plancher des Légendaires est le plus dur.** Même au désir ×5, 49 % des Légendaires proposées restent invendues à 300 Encre.

**4. Le plafond de 3 ventes en cours touche tout le monde, pas seulement les revendeurs.** 60 joueurs sur 60 y butent. Sans plafond, le marché voit 547 ventes par jour au lieu de 116. La raison est simple : un joueur qui ouvre ses paquets accumule sans cesse des timbres en double finition, bien plus vite que 3 à la fois.

## Comment lire ces chiffres

- **Si l'Encre créée dépasse durablement l'Encre détruite**, elle s'accumule et les prix montent : c'est l'inflation. La sortie principale reste l'achat de paquets, pas la commission du marché.
- **Un taux d'invendus élevé pour une rareté** veut dire que son plancher est au-dessus de ce que les joueurs peuvent payer.
- **Beaucoup de joueurs au plafond** veut dire que la limite gêne le jeu ordinaire, et pas seulement les revendeurs.
