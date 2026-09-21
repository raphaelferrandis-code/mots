# Rapport de génération des cartes

*Généré par `npm run pipeline` en 24 secondes — version des données : 2026-09-18. Ne pas modifier à la main. Les réglages sont dans `pipeline/config.ts`.*

## 1. En bref

- Base complète : **52 053 cartes possibles**.
- Édition 1 : **3 016 cartes**, choisies parmi 22 767 cartes éligibles.
- Poids pour le jeu : 694 Ko chargés au démarrage, plus 1 413 Ko de détails répartis en 16 fichiers chargés à la demande.

## 2. Du fichier brut aux cartes

| Étape | Nombre |
|---|---|
| Lignes de Lexique 4 | 189 863 |
| — écartées : forme fléchie (conjugaison, pluriel…) | 124 213 |
| — écartées : nature non retenue (pronom, préposition, onomatopée…) | 789 |
| — écartées : contient une espace ou une apostrophe | 263 |
| Lemmes de Lexique retenus (mot + nature) | 64 598 |
| Entrées du Wiktionnaire, toutes langues | 7 473 968 |
| — dont entrées françaises | 2 110 406 |
| — dont entrées correspondant à un lemme de Lexique | 57 331 |
| — écartées : simples formes fléchies | 1 943 |
| Définitions écartées (simples renvois : « Pluriel de… ») | 1 578 |
| Mots présents dans les deux sources | 53 294 |
| — écartés : aucune définition utilisable | 1 241 |
| **Cartes de la base complète** | 52 053 |

## 3. La base complète

| Rareté | Cartes | Part | Attaque moyenne | Défense moyenne (brute) | Défense moyenne (avec le bonus de rareté) | Connu de… (moyenne) |
|---|---|---|---|---|---|---|
| Hors-série | 16 | 0,0 % | 5,3 | 7,4 | 8,8 | 79,7 % |
| Légendaire | 1 561 | 3,0 % | 5,7 | 4,4 | 6,3 | 17,8 % |
| Épique | 3 645 | 7,0 % | 5,8 | 4,4 | 5,4 | 41,0 % |
| Rare | 7 808 | 15,0 % | 5,9 | 4,6 | 5,5 | 63,8 % |
| Peu commune | 13 012 | 25,0 % | 5,7 | 5,0 | 5,0 | 84,5 % |
| Commune | 26 011 | 50,0 % | 5,2 | 6,3 | 6,3 | 97,1 % |

| Type | Cartes | Part |
|---|---|---|
| Nom | 33 891 | 65,1 % |
| Adjectif | 10 620 | 20,4 % |
| Verbe | 5 924 | 11,4 % |
| Adverbe | 1 618 | 3,1 % |

**Mots sans faction reconnue : 7 419 (14,3 %)** — ils restent dans la base complète mais ne peuvent pas entrer dans une édition.

| Faction | Cartes | Part |
|---|---|---|
| Latin | 29 657 | 57,0 % |
| Origine inconnue | 4 246 | 8,2 % |
| Anglais | 3 284 | 6,3 % |
| Formation française | 3 173 | 6,1 % |
| Grec | 2 466 | 4,7 % |
| Vieux français | 2 386 | 4,6 % |
| Italien | 1 449 | 2,8 % |
| Francique | 1 217 | 2,3 % |
| Langues d'ailleurs | 1 035 | 2,0 % |
| Allemand et néerlandais | 966 | 1,9 % |
| Espagnol et portugais | 706 | 1,4 % |
| Occitan | 567 | 1,1 % |
| Arabe | 404 | 0,8 % |
| Onomatopée | 266 | 0,5 % |
| Gaulois | 231 | 0,4 % |

Origine héritée d'un autre mot (« danseur » prend l'origine de « danser ») : 23 836 mots (45,8 %).

| Badge de registre | Cartes | Part |
|---|---|---|
| Familier | 2 267 | 4,4 % |
| Vieilli | 555 | 1,1 % |
| Injurieux | 105 | 0,2 % |
| Littéraire | 84 | 0,2 % |

- Prévalence mesurée : 32 808 cartes (63,0 %)
- Au moins une définition utilisable en duel : 37 376 cartes (71,8 %)
- Date de première apparition connue : 11 659 cartes (22,4 %)
- Homographes regroupés en une seule carte : 3 169, par exemple fils, banal, pouf, beau, bocage, bretelle, nazi, livre, composter, ya, seconde, daille, accordance, kan, coquard, chambrer, grimaud, marner, broc, slop, tonga, colon, pli, arène, triton

## 4. L'Édition 1

Pour être éligible, une carte doit avoir une faction reconnue, une prévalence mesurée (au moins 10 personnes interrogées) et au moins une définition utilisable en duel. **22 767 cartes éligibles.**

| Rareté | Cartes | Part | Attaque moyenne | Défense moyenne (brute) | Défense moyenne (avec le bonus de rareté) | Connu de… (moyenne) |
|---|---|---|---|---|---|---|
| Hors-série | 16 | 0,5 % | 5,6 | 6,4 | 7,9 | 79,7 % |
| Légendaire | 90 | 3,0 % | 5,6 | 3,8 | 5,7 | 22,9 % |
| Épique | 210 | 7,0 % | 5,6 | 4,4 | 5,4 | 37,8 % |
| Rare | 450 | 14,9 % | 5,4 | 4,3 | 5,3 | 48,3 % |
| Peu commune | 750 | 24,9 % | 6,0 | 4,5 | 4,5 | 90,9 % |
| Commune | 1 500 | 49,7 % | 5,2 | 6,6 | 6,6 | 97,4 % |

*Les notes d'attaque et de défense sont calculées entre les cartes de l'édition : les 10 % de cartes les plus fortes du jeu ont 10, les 10 % les plus faibles ont 1.*

| Faction | Mots éligibles | Part réelle | Cartes dans l'édition | Part dans l'édition | dont Légendaires | dont Épiques |
|---|---|---|---|---|---|---|
| Latin | 15 838 | 69,6 % | 963 | 31,9 % | 29 | 67 |
| Vieux français | 1 397 | 6,1 % | 284 | 9,4 % | 8 | 20 |
| Anglais | 1 185 | 5,2 % | 261 | 8,7 % | 8 | 18 |
| Grec | 854 | 3,8 % | 226 | 7,5 % | 7 | 16 |
| Italien | 840 | 3,7 % | 221 | 7,3 % | 7 | 15 |
| Francique | 720 | 3,2 % | 203 | 6,7 % | 6 | 14 |
| Allemand et néerlandais | 429 | 1,9 % | 157 | 5,2 % | 5 | 11 |
| Langues d'ailleurs | 377 | 1,7 % | 146 | 4,8 % | 4 | 10 |
| Espagnol et portugais | 354 | 1,6 % | 142 | 4,7 % | 4 | 10 |
| Occitan | 332 | 1,5 % | 139 | 4,6 % | 4 | 10 |
| Arabe | 173 | 0,8 % | 99 | 3,3 % | 3 | 7 |
| Onomatopée | 141 | 0,6 % | 90 | 3,0 % | 3 | 6 |
| Gaulois | 127 | 0,6 % | 85 | 2,8 % | 2 | 6 |

| Type | Cartes | Part |
|---|---|---|
| Nom | 1 722 | 57,1 % |
| Adjectif | 659 | 21,9 % |
| Verbe | 598 | 19,8 % |
| Adverbe | 37 | 1,2 % |

| Badge de registre | Cartes | Part |
|---|---|---|
| Familier | 150 | 5,0 % |
| Vieilli | 36 | 1,2 % |
| Littéraire | 12 | 0,4 % |
| Injurieux | 10 | 0,3 % |

Cartes avec une date de première apparition : 1 036 (34,4 %).

Coups de cœur ajoutés (`data/coups-de-coeur.txt`). Quand la prévalence d'un mot n'est pas mesurée, sa rareté vient de sa seule fréquence, comparée à celle des mots mesurés :

| Coup de cœur | Rareté | Fréquence (par million de mots) | Rareté calculée d'après… |
|---|---|---|---|
| procrastiner-verbe | Rare | 0,056 | la fréquence seule (prévalence non mesurée) |
| procrastination-nom | Peu commune | 0,098 | la fréquence seule (prévalence non mesurée) |
| sérendipité-nom | Légendaire | 0,006 | la fréquence seule (prévalence non mesurée) |
| zeugma-nom | Rare | 0,028 | la fréquence seule (prévalence non mesurée) |
| rodomontade-nom | Épique | 0,022 | la fréquence seule (prévalence non mesurée) |

Corrections d'origine faites à la main (`data/corrections-factions.txt`) : goulu → Latin, reggae → Anglais, rodomont → Italien, rodomontade → Italien, pyroclastique → Grec.

### Les cartes Hors-série (rang ultime)

*Des mots qui détiennent un record, trouvés dans les données, plus ceux de `data/hors-serie.txt`. Elles s'ajoutent aux cartes ordinaires et sont comptées à part dans la collection.*

| Mot | Type | Faction | Attaque / défense | Titre de la carte |
|---|---|---|---|---|
| oiseau | Nom | Latin | 1 / 10 | Les cinq voyelles en 6 lettres seulement |
| prendre | Verbe | Latin | 4 / 10 | Le mot aux sens les plus nombreux · 70 sens |
| mot | Nom | Latin | 1 / 10 | Le mot « mot » |
| faire | Verbe | Latin | 2 / 10 | La plus grande famille · 1 282 mots dérivés |
| amour | Nom | Vieux français | 1 / 10 | Le plus vieux mot daté · attesté en 842, dans les Serments de Strasbourg |
| marron | Nom | Italien | 2 / 10 | Le mot aux synonymes les plus nombreux · 161 |
| anticonstitutionnellement | Adverbe | Latin | 10 / 2 | Le plus long mot de la langue · 25 lettres |
| hapax | Nom | Grec | 9 / 8 | Le mot qui désigne un mot que l'on ne rencontre qu'une seule fois |
| ressasser | Verbe | Latin | 3 / 7 | Le plus long palindrome · il se lit dans les deux sens |
| lexie | Nom | Grec | 7 / 2 | Le mot que presque personne ne connaît · connu de 0 % des gens |
| être | Verbe | Latin | 1 / 10 | Le mot le plus employé de la langue |
| électro-encéphalogramme | Nom | Grec | 10 / 1 | Le plus long mot composé · 22 lettres |
| pyroclastique | Adjectif | Grec | 10 / 1 | Le plus long mot sans lettre répétée · 13 lettres |
| psychophysiologique | Adjectif | Latin | 10 / 1 | Les lettres les plus chères · 57 points |
| dictionnaire | Nom | Latin | 8 / 10 | La maison de tous les autres |
| jazzy | Adjectif | Anglais | 10 / 1 | La plus forte valeur par lettre · 7,8 points en moyenne |

## 5. Exemples tirés au hasard dans l'édition

*Lecture : (type, faction, attaque/défense brute, part des gens qui connaissent le mot). C'est ici que l'on juge si la répartition « sonne juste ».*

### Hors-série

- **ressasser** *(Verbe, Latin, 3/7, connu de 100 %)* — Revenir constamment en esprit sur le même sujet ou revenir sans cesse sur les mêmes propos.
- **psychophysiologique** *(Adjectif, Latin, 10/1, connu de 68 % · attesté : XIXᵉ siècle)* — Relatif à la psychophysiologie.
- **jazzy** *(Adjectif, Anglais, 10/1, connu de 75 %)* — Proche du jazz, qui évoque le jazz.
- **marron** *(Nom, Italien, 2/10, connu de 100 % · attesté : 1526)* — Fruit rond comestible de certaines variétés de châtaigniers, plus gros qu’une châtaigne ordinaire, de couleur brune.
- **lexie** *(Nom, Grec, 7/2, connu de 0 %)* — Élément unitaire du lexique, comme un mot simple (lexème), une locution ou un proverbe. Par exemple, jeune, jeune homme et les …
- **dictionnaire** *(Nom, Latin, 8/10, connu de 100 % · attesté : c. 1501)* — Ouvrage de référence qui répertorie des mots dans un ordre convenu (alphabétique en général) fournissant pour chacun d’eux diff…
- **hapax** *(Nom, Grec, 9/8, prévalence non mesurée · attesté : XXᵉ siècle)* — Mot, spécialement pour les langues anciennes, dont on ne connaît qu’une seule occurrence dans le corpus d’une langue donnée, gl…
- **électro-encéphalogramme** *(Nom, Grec, 10/1, prévalence non mesurée)* — Enregistrement d’une électro-encéphalographie, résultat de cet enregistrement.
- **oiseau** *(Nom, Latin, 1/10, connu de 100 % · attesté : c. 1100)* — Animal vertébré théropode, à deux pattes et deux ailes, ovipare, homéotherme, au corps couvert de plumes et qui possède un bec …
- **mot** *(Nom, Latin, 1/10, prévalence non mesurée · attesté : Xᵉ siècle)* — Succession de sons dans les langues parlées, ou de signes dans les langues des signes ou écrites, qui a un sens propre.
- **être** *(Verbe, Latin, 1/10, connu de 100 %)* — Définir un état, une caractéristique du sujet.
- **pyroclastique** *(Adjectif, Grec, 10/1, connu de 18 %)* — Qui contient de la matière bouillante composée de cendres, de terre, de gaz et de roches éclatées.
- **anticonstitutionnellement** *(Adverbe, Latin, 10/2, prévalence non mesurée · attesté : XIXᵉ siècle)* — Contrairement aux règles constitutionnelles de l’organisation des pouvoirs publics d’un gouvernement.
- **prendre** *(Verbe, Latin, 4/10, connu de 95 % · attesté : IXᵉ siècle)* — Saisir, mettre en sa main.
- **amour** *(Nom, Vieux français, 1/10, connu de 100 % · attesté : 842)* — Sentiment intense et agréable qui incite les êtres à s’unir.
- **faire** *(Verbe, Latin, 2/10, connu de 100 % · attesté : IXᵉ siècle)* — Créer, produire, fabriquer, en parlant de toute œuvre matérielle.

### Légendaire

- **enclosure** *(Nom, Anglais, 5/2, connu de 31 % · attesté : 1804)* — Clôture, notamment dans le contexte seigneurial du début de la Renaissance et des révolutions agricoles.
- **mousqueterie** *(Nom, Italien, 10/2, connu de 22 %)* — Décharge de plusieurs mousquets, de plusieurs fusils tirés en même temps.
- **blédard** *(Nom, Arabe, 5/8, connu de 14 % · attesté : Vers 1920)* — Immigré dont les coutumes et la culture différentes sont encore visibles par manque d’intégration.
- **souchet** *(Nom, Gaulois, 6/7, connu de 20 %)* — Plante monocotylédone de la famille des Cypéracées, dont les diverses espèces croissent dans les endroits humides.
- **abstrus** *(Adjectif, Latin, 3/6, connu de 24 % · Littéraire · attesté : 1327)* — Qui est difficile à comprendre, à saisir par l’esprit.
- **épiphane** *(Adjectif, Grec, 8/2, connu de 31 %)* — Illustre, nom donné à quelques souverains parmi les successeurs d’Alexandre le Grand.
- **offertoire** *(Nom, Latin, 8/5, connu de 33 %)* — Prière qui, dans la messe, précède immédiatement l’oblation du pain et du vin.
- **baret** *(Nom, Onomatopée, 2/1, connu de 10 % · Vieilli)* — Cri de l’éléphant ou du rhinocéros.
- **couaquer** *(Verbe, Onomatopée, 9/2, connu de 25 %)* — Se moquer d'un prêtre en faisant un couac, en imitant le corbeau, quand il passe.
- **sarigue** *(Nom, Espagnol et portugais, 2/4, connu de 26 %)* — Petit mammifère à longue queue préhensile de l’ordre des marsupiaux. La femelle porte les petits sur son dos lorsqu'ils sont so…
- **rouf** *(Nom, Allemand et néerlandais, 2/3, connu de 16 % · attesté : 1582)* — Petit logement généralement situé à l'arrière du pont supérieur d'un bateau et ne s'étendant pas sur toute la largeur comme la …
- **coryphée** *(Nom, Latin, 10/4, connu de 10 %)* — Chef de chœur dans le théâtre antique ou dans une fête moderne.
- **guarani** *(Nom, Espagnol et portugais, 2/2, connu de 21 %)* — Unité monétaire du Paraguay. Son symbole est ₲ (Unicode U+20B2).
- **rétrogression** *(Nom, Latin, 7/6, connu de 29 % · attesté : 1836)* — Action de rétrograder, déclin vers une forme plus simple, moins complexe, moins évoluée.
- **miton** *(Nom, Vieux français, 1/7, connu de 27 %)* — Gantelet d’une armure, ou partie du gantelet, qui ne recouvre que la moitié supérieur de la main, laissant les doigts découverts.
- **carole** *(Nom, Latin, 2/6, connu de 27 % · attesté : XIIᵉ siècle)* — Forme de danse festive et populaire, très répandue au Moyen Âge, se présentant sous forme de chaîne ouverte ou fermée.
- **mortaiser** *(Verbe, Vieux français, 4/1, connu de 31 % · attesté : 1302)* — Entailler le bois de façon à créer un logement qui reçoit une pièce de bois généralement amincie, appelée le tenon.
- **radôme** *(Nom, Anglais, 2/1, connu de 36 %)* — Abri en forme de dôme protégeant une antenne de radar, au sol, au sommet d'un bâtiment ou encore sur un véhicule.
- **mignard** *(Adjectif, Francique, 4/2, connu de 33 %)* — Qui a de la gentillesse et de l’afféterie.
- **shipchandler** *(Nom, Anglais, 10/1, connu de 17 %)* — Avitailleur, fournisseur d’accastillage.

### Épique

- **colback** *(Nom, Langues d'ailleurs, 10/2, connu de 21 %)* — Ancienne coiffure militaire, bonnet de fourrure en forme de cône tronqué dont la partie supérieure était plate.
- **subreptice** *(Adjectif, Latin, 8/4, connu de 45 %)* — Qualifie une décision, une grâce, un jugement obtenu sur un faux exposé.
- **lèchefrite** *(Nom, Vieux français, 9/4, connu de 57 %)* — Ustensile de cuisine, ordinairement de fer, qu’on place sous le gril ou sous la broche, pour recueillir la graisse et le jus de…
- **anamnèse** *(Nom, Grec, 3/7, connu de 23 % · attesté : 1831)* — Prière qui, dans la messe, suit la consécration et rappelle le souvenir de la rédemption.
- **tapotis** *(Nom, Onomatopée, 3/1, connu de 45 %)* — Bruit produit par de petits coups secs.
- **skating** *(Nom, Anglais, 9/6, connu de 59 %)* — (Ski de randonnée) Technique de glisse, variante du ski de fond, créée dans les années 2000 et inspirée par le patinage.
- **criailler** *(Verbe, Latin, 5/7, connu de 24 % · Familier · attesté : 1555)* — Crier, se plaindre souvent et pour des sujets de peu d’importance.
- **démotique** *(Adjectif, Grec, 9/1, connu de 18 %)* — Populaire, courant, en parlant de la langue ou de l’écriture, en particulier l’égyptien ancien et le grec moderne.
- **bordage** *(Nom, Francique, 5/8, connu de 44 %)* — Planche, fer ou acier revêtant le corps d’un bâtiment, tant à l’extérieur qu’à l'intérieur.
- **liséré** *(Nom, Vieux français, 1/5, connu de 43 %)* — Tresse ou ruban fort étroit dont on borde un vêtement.
- **baronner** *(Verbe, Latin, 4/2, connu de 18 % · Familier)* — Pour un membre du personnel d'un débit de boisson, s'installer et consommer au bar ou à la terrasse pour attirer les clients.
- **espagnolette** *(Nom, Espagnol et portugais, 8/4, connu de 52 %)* — Ferrure à poignée tournante servant à fermer et à ouvrir les châssis d’une fenêtre.
- **fourgonner** *(Verbe, Latin, 7/7, connu de 38 %)* — Remuer le feu d’un foyer d’appartement avec les pincettes, et parfois le déranger en voulant l’accommoder.
- **stencil** *(Nom, Anglais, 3/2, connu de 52 %)* — Feuille intermédiaire permettant la reproduction de documents.
- **ovalaire** *(Adjectif, Latin, 5/5, connu de 16 %)* — Qui est de forme approximativement ovale.
- **copte** *(Nom, Arabe, 3/2, connu de 50 % · attesté : 1665)* — Chrétien d’Égypte et d’Éthiopie, généralement de confession monophysite.
- **piauler** *(Verbe, Francique, 3/5, connu de 38 % · attesté : 1607)* — Crier, en parlant des petits poulets.
- **lobulaire** *(Adjectif, Grec, 5/1, connu de 27 %)* — Qui a la forme d’un lobule, qui appartient à un lobule.
- **bégum** *(Nom, Langues d'ailleurs, 3/2, connu de 33 %)* — Titre d’honneur des princesses et des femmes de qualité de l’Indoustan.
- **logogriphe** *(Nom, Grec, 9/3, connu de 20 % · attesté : 1623)* — Jeu d’esprit qui consiste à former d’autres mots avec les lettres d’un mot.

### Rare

- **paroxystique** *(Adjectif, Latin, 10/1, connu de 50 %)* — Qui se présente sous forme de paroxysme, aigu, sévère, extrême.
- **fourbir** *(Verbe, Francique, 6/6, connu de 65 %)* — Rendre clair un objet de métal en le frottant.
- **cotre** *(Nom, Anglais, 2/4, connu de 19 %)* — Petit bâtiment de guerre à un mât dont la grande voile a beaucoup d’étendue.
- **inique** *(Adjectif, Latin, 6/4, connu de 59 %)* — Qui n'est pas juste, pas égal; qui manque d’équité.
- **hémoculture** *(Nom, Grec, 9/1, connu de 33 %)* — Culture bactériologique depuis un prélèvement de sang veineux.
- **hère** *(Nom, Vieux français, 2/6, connu de 52 % · attesté : début XVIIᵉ siècle)* — Jeu de cartes qui se joue entre plusieurs personnes qu’on appelle aussi l’As qui court ou la Bête noire.
- **schizoïde** *(Adjectif, Allemand et néerlandais, 10/3, connu de 50 % · attesté : 1927)* — Se dit des individus repliés, inhibés, fuyant le contact d’autrui et se réfugiant dans un autisme plus ou moins complet et énig…
- **suranné** *(Adjectif, Latin, 2/8, connu de 59 % · attesté : XIIᵉ siècle)* — Qui a dépassé la date d’expiration et n’est plus valide.
- **ingénier** *(Verbe, Latin, 3/1, connu de 59 %)* — Chercher, tâcher de trouver dans son esprit quelque moyen pour réussir.
- **babil** *(Nom, Onomatopée, 3/2, connu de 37 %)* — Bavardage enfantin où le plaisir passe avant la volonté d’être compris.
- **bonard** *(Adjectif, Vieux français, 3/1, connu de 66 %)* — Orthographe alternative de bonnard, bon en plus péjoratif.
- **étale** *(Adjectif, Francique, 1/9, connu de 83 %)* — Qualifie la mer qui ne monte ni ne descend à la fin du flot ou du jusant.
- **columbarium** *(Nom, Latin, 9/2, connu de 55 %)* — Édifice sépulcral dans les parois duquel étaient pratiquées des niches destinées à recevoir des urnes mortuaires.
- **corroder** *(Verbe, Latin, 5/7, connu de 57 % · attesté : 1314)* — Ronger. Il se dit des substances qui, en vertu d’une qualité caustique, rongent, brûlent quelque partie du corps vivant ou de q…
- **imprescriptible** *(Adjectif, Anglais, 10/1, connu de 81 %)* — Qui n’est pas susceptible de prescription.
- **gaélique** *(Adjectif, Anglais, 8/6, connu de 63 % · attesté : 1614)* — En rapport avec les langues et la culture celtique d’Irlande et d’Écosse.
- **soma** *(Nom, Grec, 1/4, connu de 29 %)* — Péricaryon ou corps cellulaire, partie centrale d'un neurone.
- **aman** *(Nom, Arabe, 1/4, connu de 25 %)* — Grâce en droit musulman par laquelle un ennemi vaincu obtient la vie sauve ou une amnistie.
- **consumérisme** *(Nom, Anglais, 8/3, connu de 60 %)* — Protection des intérêts du consommateur par des associations.
- **synesthésie** *(Nom, Grec, 10/5, connu de 14 %)* — Trouble de la perception des sensations, qui fait éprouver deux perceptions simultanées à la sollicitation d’un seul sens.

### Peu commune

- **matraquer** *(Verbe, Espagnol et portugais, 9/8, connu de 72 % · attesté : 1927)* — Marteler, répéter de façon très insistante (une publicité, en particulier), mitrailler.
- **florentin** *(Adjectif, Italien, 6/9, connu de 86 %)* — Qui présente des caractéristiques propres à cette ville et à ses habitants.
- **embellie** *(Nom, Latin, 5/4, connu de 95 %)* — Amélioration du temps, devenant beau pour un moment, après une bourrasque, un grain violent ou un coup de vent obstiné.
- **balayette** *(Nom, Gaulois, 10/6, connu de 93 % · attesté : XIXᵉ siècle)* — Petit balai, parfois sans manche.
- **thermique** *(Nom, Grec, 10/4, connu de 95 %)* — Partie de la physique portant sur tout ce qui concerne la production et l’utilisation de la chaleur.
- **myopathie** *(Nom, Anglais, 10/1, connu de 90 % · attesté : 1884)* — Maladie neuromusculaire se traduisant par une dégénérescence du tissu musculaire.
- **cisaille** *(Nom, Latin, 4/5, connu de 91 % · attesté : 1214)* — Outil servant à découper des matériaux durs ou épais.
- **calque** *(Nom, Italien, 8/8, connu de 91 %)* — Feuille de papier translucide servant à la reproduction d’un dessin par superposition.
- **souteneur** *(Nom, Latin, 3/9, connu de 91 %)* — Celui qui, vivant du gain d’un(e) prostitué(e), prétend assurer, en retour, sa protection.
- **tabatière** *(Nom, Espagnol et portugais, 5/8, connu de 96 %)* — Petite boite où l’on met du tabac à priser.
- **thermos** *(Nom, Grec, 5/4, connu de 96 %)* — Récipient isolant conservant la température d’un liquide pendant quelques heures.
- **mystification** *(Nom, Grec, 10/4, connu de 90 % · attesté : Attesté en 1768)* — Action de mystifier, de berner, de duper.
- **mohair** *(Nom, Anglais, 4/2, connu de 92 %)* — Laine provenant du poil des chèvres de race angora et permettant la confection d’étoffes soyeuses et légères.
- **bédouin** *(Adjectif, Arabe, 4/8, connu de 85 %)* — Relatif aux communautés nomades, tribales.
- **funiculaire** *(Adjectif, Latin, 8/2, connu de 100 % · attesté : 1725)* — Qui est mis en mouvement par un ensemble de câbles ou de cordes.
- **jonchée** *(Nom, Latin, 9/4, connu de 95 %)* — Arrangement d’herbes, de fleurs et de branchages disposé sur le sol, dans les rues, les églises, etc., lors d’une cérémonie.
- **miséreux** *(Adjectif, Latin, 9/1, connu de 94 % · Vieilli)* — Qui donne l’impression d’une extrême pauvreté.
- **parité** *(Nom, Latin, 2/9, connu de 90 %)* — Égalité, similitude entre des objets de même qualité, de même nature.
- **embusquer** *(Verbe, Vieux français, 9/4, connu de 90 % · attesté : 1611)* — Parvenir à se dérober aux plus dures exigences du service militaire.
- **dribble** *(Nom, Anglais, 6/3, connu de 92 %)* — Dans les sports de balle, action consistant à esquiver son adversaire tout en conservant le ballon.

### Commune

- **abstenir** *(Verbe, Latin, 4/6, connu de 90 %)* — S’empêcher de faire quelque chose; se priver de l’usage de quelque chose.
- **inceste** *(Nom, Latin, 3/8, connu de 90 %)* — Relation sexuelle illicite entre les personnes qui sont parentes ou alliées au degré prohibé par les lois civiles ou religieuses.
- **décrassage** *(Nom, Latin, 7/6, connu de 100 %)* — Opération consistant à retirer le laitier flottant au-dessus de l'acier en fusion.
- **tango** *(Nom, Espagnol et portugais, 1/8, connu de 91 %)* — Danse exécutée en couple et originaire du Río de la Plata.
- **brasserie** *(Nom, Gaulois, 5/8, connu de 100 % · attesté : 1371)* — Société qui fabrique de la bière et la met en marché.
- **tape** *(Nom, Onomatopée, 1/7, connu de 100 % · Familier)* — Coup de la main, soit ouverte, soit fermée.
- **bloc** *(Nom, Allemand et néerlandais, 2/10, connu de 100 % · attesté : 1262)* — Masse, gros morceau d’une matière pesante et dure, telle que la pierre, le marbre, le fer non encore travaillés.
- **vide** *(Adjectif, Latin, 2/10, connu de 100 %)* — Qui ne contient rien; qui est totalement dépourvu de.
- **humeur** *(Nom, Latin, 4/10, connu de 100 %)* — État d’esprit plus ou moins durable, particulièrement en ce qu’il est plutôt agréable ou non.
- **glouton** *(Nom, Latin, 2/8, connu de 100 %)* — Personne ou animal qui mange avidement sa nourriture.
- **tapisserie** *(Nom, Grec, 6/8, connu de 100 % · attesté : XIVᵉ siècle)* — Ouvrage fait à l’aiguille sur du canevas, avec de la laine, de la soie, etc.
- **braguette** *(Nom, Gaulois, 6/9, connu de 96 % · attesté : 1534)* — Ouverture sur le devant d’un pantalon, d’une culotte d’homme.
- **surtout** *(Adverbe, Latin, 2/1, connu de 95 %)* — Principalement; plus que toute autre chose.
- **corporation** *(Nom, Anglais, 8/6, connu de 95 % · attesté : 1672)* — Ensemble de personnes, considérées comme formant un tout au sens où elles partagent une caractéristique commune, notamment un m…
- **macédoine** *(Nom, Italien, 6/6, connu de 100 %)* — Association d’éléments hétéroclites, mosaïque.
- **hôtellerie** *(Nom, Latin, 6/6, connu de 96 % · attesté : c. 1180)* — Corps de logis destiné à recevoir les étrangers, dans les grandes abbayes.
- **anthropologie** *(Nom, Grec, 9/9, connu de 92 % · attesté : 1534)* — Branche des sciences qui étudie l'être humain sous tous ses aspects à la fois :
- **milliardaire** *(Adjectif, Italien, 7/2, connu de 92 %)* — Qui possède un ou plusieurs milliards, qui est extrêmement riche.
- **calotte** *(Nom, Occitan, 3/10, connu de 94 % · attesté : 1394)* — Espèce de petit bonnet qui ne couvre ordinairement que le haut de la tête et qui est surtout en usage parmi les gens d’Église.
- **chatouiller** *(Verbe, Latin, 8/9, connu de 95 %)* — Causer, par des attouchements légers et répétés, un tressaillement qui provoque le rire.

### Par faction

**Latin** : grenaille *(peu commune)*, polonais *(commune)*, grammaire *(commune)*, clairvoyance *(commune)*, roulure *(rare)*, largesse *(peu commune)*, soufflerie *(peu commune)*, cryptique *(rare)*, ânerie *(commune)*, cornard *(rare)*, poison *(commune)*, obnubiler *(peu commune)*, ramener *(commune)*, dépuceler *(commune)*

**Vieux français** : fourrière *(commune)*, billevesée *(rare)*, arraisonner *(rare)*, congédier *(commune)*, ramoner *(commune)*, rapetasser *(légendaire)*, crotte *(commune)*, fourrage *(peu commune)*, luger *(rare)*, marquage *(commune)*, papillote *(peu commune)*, degré *(commune)*, tôlier *(peu commune)*, brouet *(épique)*

**Anglais** : skating *(épique)*, soda *(commune)*, techno *(peu commune)*, chips *(peu commune)*, sélecteur *(peu commune)*, léviter *(peu commune)*, formaliser *(peu commune)*, snober *(commune)*, dumper *(épique)*, dérailleur *(peu commune)*, écrasé *(commune)*, dribble *(peu commune)*, infinitésimal *(peu commune)*, radôme *(légendaire)*

**Grec** : mécanicien *(commune)*, presbyte *(peu commune)*, scaphandre *(commune)*, aérodynamique *(peu commune)*, troque *(peu commune)*, radiographie *(commune)*, oxyder *(commune)*, dynamisme *(commune)*, enthousiasme *(commune)*, réhydrater *(commune)*, tapisser *(commune)*, éclectique *(peu commune)*, antipathie *(peu commune)*, prototype *(commune)*

**Italien** : gouache *(peu commune)*, cavalcade *(peu commune)*, contrebasse *(commune)*, encadrer *(commune)*, désinvolture *(commune)*, impolitesse *(commune)*, isolateur *(rare)*, salami *(commune)*, saccager *(commune)*, trombone *(commune)*, mousqueterie *(légendaire)*, forcé *(commune)*, décalcomanie *(commune)*, bombarder *(commune)*

**Francique** : mijoter *(commune)*, patrouille *(commune)*, fourbir *(rare)*, défraîchi *(commune)*, zigounette *(peu commune)*, harder *(rare)*, motte *(peu commune)*, chouette *(commune)*, début *(commune)*, branlée *(commune)*, échevin *(rare)*, estoc *(rare)*, gourme *(rare)*, déguiser *(commune)*

**Allemand et néerlandais** : pouffiasse *(commune)*, schizoïde *(rare)*, louvoyer *(rare)*, loquer *(épique)*, drôle *(commune)*, blaser *(peu commune)*, bouquiner *(peu commune)*, drome *(épique)*, haire *(légendaire)*, reluquer *(commune)*, hourvari *(épique)*, démarrer *(commune)*, valse *(commune)*, morphologie *(commune)*

**Langues d'ailleurs** : bandoulière *(peu commune)*, galérer *(commune)*, gréer *(rare)*, russe *(commune)*, bazarder *(peu commune)*, youyou *(rare)*, mikado *(commune)*, kolkhoze *(peu commune)*, caftan *(rare)*, russophone *(épique)*, bidon *(commune)*, décaféiné *(commune)*, manouche *(peu commune)*, chagrin *(commune)*

**Espagnol et portugais** : quadrille *(peu commune)*, récif *(commune)*, chihuahua *(commune)*, placer *(commune)*, mirador *(commune)*, condé *(rare)*, sombrero *(commune)*, matraquer *(peu commune)*, palabrer *(peu commune)*, pimenter *(commune)*, carioca *(rare)*, rumba *(peu commune)*, tchatcher *(peu commune)*, nègre *(commune)*

**Occitan** : violon *(commune)*, badiner *(commune)*, escargot *(commune)*, causse *(rare)*, accalmie *(peu commune)*, cassoulet *(peu commune)*, liche *(rare)*, praire *(rare)*, entrave *(commune)*, cambouis *(peu commune)*, rôder *(commune)*, cabri *(peu commune)*, muscat *(peu commune)*, péquin *(rare)*

**Arabe** : émir *(commune)*, copte *(rare)*, goudronné *(commune)*, imam *(commune)*, bédouin *(peu commune)*, mamelouk *(épique)*, satin *(commune)*, sultan *(commune)*, alcool *(commune)*, goudronneux *(peu commune)*, douar *(légendaire)*, burnous *(rare)*, sarbacane *(commune)*, cafteur *(peu commune)*

**Onomatopée** : miauler *(commune)*, croquant *(commune)*, croquant *(commune)*, nanan *(rare)*, poufiasse *(commune)*, piaf *(commune)*, chique *(peu commune)*, tapoter *(commune)*, bouder *(commune)*, tapant *(peu commune)*, tapotis *(épique)*, baba *(peu commune)*, crachat *(commune)*, huer *(commune)*

**Gaulois** : piécette *(commune)*, bourbon *(commune)*, brassage *(commune)*, gober *(commune)*, brasser *(commune)*, renfrogner *(peu commune)*, trogne *(rare)*, cohue *(commune)*, brailler *(commune)*, lise *(commune)*, désembourber *(rare)*, bijoutier *(commune)*, raie *(commune)*, pilou *(rare)*

## 6. Origines des mots et choix des factions

### Langues détectées (base complète)

| Langue d'origine détectée | Cartes de la base | dont éligibles | Faction par défaut |
|---|---|---|---|
| Latin | 29 657 | 15 835 | Latin |
| Origine inconnue | 4 246 | 0 | Origine inconnue |
| Anglais | 3 284 | 1 184 | Anglais |
| Formation française | 3 173 | 0 | Formation française |
| Grec | 2 466 | 854 | Grec |
| Ancien français | 2 117 | 1 246 | Vieux français |
| Italien | 1 449 | 839 | Italien |
| Francique et germanique ancien | 1 217 | 720 | Francique |
| Allemand | 606 | 237 | Allemand et néerlandais |
| Occitan | 567 | 332 | Occitan |
| Espagnol | 562 | 286 | Espagnol et portugais |
| Arabe | 404 | 173 | Arabe |
| Néerlandais | 360 | 192 | Allemand et néerlandais |
| Parlers régionaux | 269 | 151 | Vieux français |
| Onomatopée | 266 | 141 | Onomatopée |
| Gaulois et celtique | 231 | 127 | Gaulois |
| Russe et langues slaves | 177 | 71 | Langues d'ailleurs |
| Langues de l'Inde et d'Asie | 176 | 51 | Langues d'ailleurs |
| Japonais | 175 | 49 | Langues d'ailleurs |
| Turc et persan | 146 | 81 | Langues d'ailleurs |
| Portugais | 144 | 68 | Espagnol et portugais |
| Autres langues | 102 | 38 | Langues d'ailleurs |
| Langues scandinaves | 71 | 33 | Langues d'ailleurs |
| Chinois | 54 | 11 | Langues d'ailleurs |
| Langues d'Amérique | 50 | 21 | Langues d'ailleurs |
| Hébreu et yiddish | 48 | 14 | Langues d'ailleurs |
| Langues d'Afrique | 36 | 8 | Langues d'ailleurs |

### Trois découpages possibles

*Pour chaque découpage : le nombre de mots éligibles, puis le nombre de cartes que la faction aurait dans une édition de 3 000 (avec les réglages actuels : petites factions gonflées, plafond à 35 %).*

**Découpage A — par défaut (celui utilisé pour cette génération)** — 13 factions

| Faction | Mots éligibles | Cartes dans l'édition (environ) |
|---|---|---|
| Latin | 15 835 | 953 |
| Vieux français | 1 397 | 283 |
| Anglais | 1 184 | 261 |
| Grec | 854 | 221 |
| Italien | 839 | 219 |
| Francique | 720 | 203 |
| Allemand et néerlandais | 429 | 157 |
| Langues d'ailleurs | 377 | 147 |
| Espagnol et portugais | 354 | 142 |
| Occitan | 332 | 138 |
| Arabe | 173 | 100 |
| Onomatopée | 141 | 90 |
| Gaulois | 127 | 85 |

**Découpage B — resserré** — 9 factions

| Faction | Mots éligibles | Cartes dans l'édition (environ) |
|---|---|---|
| Latin | 15 835 | 1 050 |
| Langues romanes | 1 525 | 346 |
| Vieux français et gaulois | 1 524 | 346 |
| Anglais | 1 184 | 305 |
| Langues germaniques | 1 182 | 305 |
| Grec | 854 | 259 |
| Arabe et Orient | 268 | 145 |
| Langues d'ailleurs | 249 | 140 |
| Onomatopée | 141 | 105 |

**Découpage C — détaillé (une faction par langue d'au moins 60 mots éligibles)** — 18 factions

| Faction | Mots éligibles | Cartes dans l'édition (environ) |
|---|---|---|
| Latin | 15 835 | 869 |
| Ancien français | 1 246 | 244 |
| Anglais | 1 184 | 238 |
| Grec | 854 | 202 |
| Italien | 839 | 200 |
| Francique et germanique ancien | 720 | 185 |
| Occitan | 332 | 126 |
| Espagnol | 286 | 117 |
| Allemand | 237 | 106 |
| Langues d'ailleurs | 225 | 104 |
| Néerlandais | 192 | 96 |
| Arabe | 173 | 91 |
| Parlers régionaux | 151 | 85 |
| Onomatopée | 141 | 82 |
| Gaulois et celtique | 127 | 78 |
| Turc et persan | 81 | 62 |
| Russe et langues slaves | 71 | 58 |
| Portugais | 68 | 57 |

### Échantillon de contrôle de la détection

*60 cartes de l'édition au hasard : la faction trouvée, et le début de l'étymologie du Wiktionnaire. Sert à mesurer le taux d'erreur.*

| Mot | Faction | Héritée de | Début de l'étymologie |
|---|---|---|---|
| froufrou | Onomatopée |  | Onomatopée. |
| tapissier | Grec | tapis | Dérivé de tapis, avec le suffixe -ier. |
| asticot | Vieux français | asticoter | Déverbal de asticoter (« agacer »), d’où asticot (« ce qui sert à agacer, à attirer le poisson ») (→ voir taquiner le go |
| homogène | Grec |  | Du grec ancien ὁμογενής, homogenês (« de même race, de même sorte, semblable »), en passant par le latin homogeneus (mêm |
| canton | Occitan |  | De l’ancien occitan canton; le mot est venu de l'Italie du Nord où cantone est passé du sens de « coin » (→ voir chant,  |
| excréter | Latin |  | Du latin excernere (« cribler, séparer, trier »). |
| kaiser | Allemand et néerlandais |  | De l’allemand Kaiser, dérivé du latin Caesar (« César, empereur romain »). |
| panard | Occitan |  | (Adjectif) D’origine incertaine. Viendrait de l’occitan panard (« boiteux ») issu par substitution de suffixe de panet ( |
| jungle | Anglais |  | De l’anglais jungle, lui-même du hindi जंगल, jaṅgal (« forêt ») ou de l’ourdou جنگل, jaṅgal, de même sens, issu du sansk |
| neutre | Latin |  | Du latin neuter (« ni l’un, ni l’autre », « indifférent », « neutre »), composé de ne et uter (inter. « qui des deux ? » |
| barrer | Arabe |  | (Verbe 1) Dénominal de barre.Dérivé de barre, avec le suffixe -er. (Verbe 2) De l’arabe بَرًّا, barran (« dehors »). |
| immodeste | Latin | modeste | De modeste, avec le préfixe in- modifié en im-. |
| bonification | Vieux français | bonifier | De bonifier avec le suffixe -ation. |
| voyeur | Vieux français |  | Dérivé de voir, avec le suffixe -eur, en ancien français veor (« guetteur »). |
| embellie | Latin | embellir | Déverbal de embellir. |
| endiguer | Allemand et néerlandais | diguer | Verbedérivé de diguer, avec le préfixe en-. |
| tisserand | Vieux français |  | De l’ancien français tissier (« tisserand ») avec la finale germanique -anc avec un ‹ d › non-étymologique comme dans al |
| ribote | Vieux français |  | Attesté en ancien français sous la forme riboi, de riber et -ote → voir ribaud et ribaude. Pour « baratte » → voir ribot |
| rééquilibrage | Latin | rééquilibrer | Dérivé de rééquilibrer, avec le suffixe -age. |
| androïde | Grec |  | Du grec ancien ἀνδρός, andrós (« d’homme ») et εἶδος, eîdos (« aspect extérieur »). |
| varech | Vieux français |  | Du normand, du norrois vágrek (« épave marine, ce qui est rejeté sur la côte »). Apparenté à l'anglais wreck et au néerl |
| rétribuer | Latin |  | Du latin retribuere, « donner en échange, en retour ». |
| formaliser | Anglais |  | Au sens pronominal,dérivé de formel, avec le suffixe -iser. Forme transitive, de l’anglais formalize (« rendre formel ») |
| salade | Occitan |  | De l’occitan salada (« salée »), dérivé de sal (« sel »). |
| misogynie | Grec |  | Du grec ancien μισογυνία, misogunía → voir misogyne et -ie. |
| éteignoir | Latin | éteindre | Dérivé du verbe éteindre avec le suffixe -oir. |
| rencontrer | Latin | contre | Verbedérivé de encontrer, avec le préfixe re-, « venir en face », de encontre. → voir à l’encontre |
| piperade | Occitan |  | De l'occitan (« salade de piments, omelette de piments »), piper en béarnais, dérivé du latin piper (« poivre »). |
| impulsion | Latin |  | Du latin impulsio (« choc »). |
| pourlécher | Latin | pour | (aucune) |
| yearling | Anglais |  | De l’anglais yearling (« qui a un an »). |
| shipchandler | Anglais |  | De l’anglais ship chandler. |
| rouste | Occitan |  | De l’occitan rosta (« raclée »). |
| écologique | Allemand et néerlandais | écologie | Dérivé du nom écologie, avec le suffixe -ique. |
| indigo | Espagnol et portugais |  | Du portugais índigo. |
| compiler | Latin |  | Du latin compilare. |
| escamoter | Espagnol et portugais |  | Peut-être de l'occitan escamotar ou escambotar, dérivé de escamar « effilocher », lui-même issu du latin squama « écaill |
| surhomme | Allemand et néerlandais |  | Calque de l’allemand Übermensch,dérivé de homme, avec le préfixe sur-. |
| pocher | Francique | poche | Dénominal de poche. Le sens de « faire un œil au beurre noir » peut venir aussi de l'ancien verbe poucher, « froisser av |
| lampée | Onomatopée | lamper | De lamper. |
| excellentissime | Italien |  | Emprunté à l’italien eccellentissimo, composé de excellent et du suffixe -issime. |
| marabout | Espagnol et portugais |  | Du portugais maraboto, marabuto, lui-même de l’arabe مُرَابِطٌ (murâbiTũ), celui qui se رَابَطَ (râbaTa) : moine-soldat, |
| conjonction | Latin |  | Du latin conjunctio qui donne l’ancien français conjoncion. |
| superstructure | Latin | structure | Dérivé de structure, avec le préfixe super-. |
| dynamisme | Grec | dynamique | Dérivé de dynamie, avec le suffixe -isme. |
| lurex | Anglais |  | Antonomase du nom de marque Lurex (Marque commerciale) (→ voir Lurex) dérivé de l’anglais lure (« attrait; appât »), ave |
| momie | Latin |  | Du latin médiéval mummia, lui-même issu de l’arabe مومياء, mūmyāʾ (« mélange de poix et de bitume utilisé pour embaumer  |
| délayer | Vieux français |  | Origine incertaine : peut-être du latin deliquare (« décanter, transvaser, éclaircir ») avec influence de l’ancien franç |
| sabir | Espagnol et portugais |  | Altération de l’espagnol saber (« savoir »). |
| crayonner | Latin | crayon | → voir crayon |
| stérilisateur | Latin | stériliser | De stériliser avec le suffixe -ateur. |
| bassine | Latin | bassin | → voir bassin |
| refendre | Latin | fendre | Dérivé de fendre, avec le préfixe re-. |
| gargouille | Latin |  | De l’ancien français gargouille, gargoule « gorge, tuyau de descente », composé de garg- (cf. jargon), du latin tardif g |
| capitulaire | Latin |  | Du latin capitulum (« chapitre ») avec le suffixe -aire. |
| médiatique | Anglais | média | Dérivé de média, avec le suffixe -ique. |
| ornière | Vieux français |  | De l’ancien français ordiere (« ornière ») avec l’influence de orne (« rang »), du latin vulgaire *orbitaria → voir orbi |
| bazar | Langues d'ailleurs |  | Du persan بازار, bâzâr (« marché ») ou de l’arabe بازار, bāzār (« marché »). |
| renfrogné | Gaulois | renfrogner | Participe passé adjectivé de renfrogner. |
| hanap | Francique |  | De l’ancien bas vieux-francique hnapp (« écuelle ») apparenté au néerlandais nap (« hanap, écuelle »), à l’allemand Napf |

