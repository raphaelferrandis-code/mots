# Rapport de génération des cartes

*Généré par `npm run pipeline` en 26 secondes — version des données : 2026-09-18. Ne pas modifier à la main. Les réglages sont dans `pipeline/config.ts`.*

## 1. En bref

- Base complète : **52 046 cartes possibles**.
- Édition 1 : **3 016 cartes**, choisies parmi 22 757 cartes éligibles.
- Poids pour le jeu : 694 Ko chargés au démarrage, plus 1 413 Ko de détails répartis en 16 fichiers chargés à la demande.
- L'édition est en jeu : ses cartes sont gardées telles quelles, seuls leurs textes et leurs notes sont recalculés (réglage `figee` de `pipeline/config.ts`, détail au §4).

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
| Définitions écartées (pas encore rédigées : « Définition manquante ou à compléter » ; le sens compte dans la richesse du mot) | 121 |
| Mots présents dans les deux sources | 53 294 |
| — écartés : aucune définition utilisable | 1 248 |
| **Cartes de la base complète** | 52 046 |

## 3. La base complète

| Rareté | Cartes | Part | Attaque moyenne | Défense moyenne (brute) | Défense moyenne (avec le bonus de rareté) | Connu de… (moyenne) |
|---|---|---|---|---|---|---|
| Hors-série | 16 | 0,0 % | 5,3 | 7,4 | 9,3 | 79,7 % |
| Légendaire | 1 561 | 3,0 % | 5,7 | 4,4 | 6,3 | 17,8 % |
| Épique | 3 644 | 7,0 % | 5,8 | 4,4 | 5,4 | 41,0 % |
| Rare | 7 808 | 15,0 % | 5,9 | 4,6 | 5,5 | 63,9 % |
| Peu commune | 13 009 | 25,0 % | 5,7 | 5,0 | 5,0 | 84,5 % |
| Commune | 26 008 | 50,0 % | 5,2 | 6,3 | 6,3 | 97,1 % |

| Type | Cartes | Part |
|---|---|---|
| Nom | 33 886 | 65,1 % |
| Adjectif | 10 618 | 20,4 % |
| Verbe | 5 924 | 11,4 % |
| Adverbe | 1 618 | 3,1 % |

**Mots sans faction reconnue : 7 414 (14,2 %)** — ils restent dans la base complète mais ne peuvent pas entrer dans une édition.

| Faction | Cartes | Part |
|---|---|---|
| Latin | 29 656 | 57,0 % |
| Origine inconnue | 4 241 | 8,1 % |
| Anglais | 3 284 | 6,3 % |
| Formation française | 3 173 | 6,1 % |
| Grec | 2 465 | 4,7 % |
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

Origine héritée d'un autre mot (« danseur » prend l'origine de « danser ») : 23 835 mots (45,8 %).

| Badge de registre | Cartes | Part |
|---|---|---|
| Familier | 2 268 | 4,4 % |
| Vieilli | 556 | 1,1 % |
| Injurieux | 104 | 0,2 % |
| Littéraire | 84 | 0,2 % |

- Prévalence mesurée : 32 806 cartes (63,0 %)
- Au moins une définition utilisable en duel : 37 351 cartes (71,8 %)
- Date de première apparition connue : 11 659 cartes (22,4 %)
- Homographes regroupés en une seule carte : 3 169, par exemple fils, banal, pouf, beau, bocage, bretelle, nazi, livre, composter, ya, seconde, daille, accordance, kan, coquard, chambrer, grimaud, marner, broc, slop, tonga, colon, pli, arène, triton

## 4. L'Édition 1

Pour être éligible, une carte doit avoir une faction reconnue, une prévalence mesurée (au moins 10 personnes interrogées) et au moins une définition utilisable en duel. **22 757 cartes éligibles.**

**L'édition est en jeu : ses 3 016 cartes sont gardées telles quelles.** Composée aujourd'hui avec les mêmes réglages, elle perdrait 4 cartes (chipie-nom, coquerie-nom, recourber-verbe, ronronnement-nom) et en gagnerait 4 (yéti-nom, chuchotement-nom, pâmer-verbe, pochon-nom).

| Rareté | Cartes | Part | Attaque moyenne | Défense moyenne (brute) | Défense moyenne (avec le bonus de rareté) | Connu de… (moyenne) |
|---|---|---|---|---|---|---|
| Hors-série | 16 | 0,5 % | 5,6 | 6,4 | 9,3 | 79,7 % |
| Légendaire | 90 | 3,0 % | 5,6 | 3,8 | 5,7 | 22,9 % |
| Épique | 210 | 7,0 % | 5,6 | 4,4 | 5,4 | 37,8 % |
| Rare | 450 | 14,9 % | 5,4 | 4,3 | 5,3 | 48,3 % |
| Peu commune | 750 | 24,9 % | 6,0 | 4,5 | 4,5 | 90,9 % |
| Commune | 1 500 | 49,7 % | 5,2 | 6,6 | 6,6 | 97,4 % |

*Les notes d'attaque et de défense sont calculées entre les cartes de l'édition : les 10 % de cartes les plus fortes du jeu ont 10, les 10 % les plus faibles ont 1.*

| Faction | Mots éligibles | Part réelle | Cartes dans l'édition | Part dans l'édition | dont Légendaires | dont Épiques |
|---|---|---|---|---|---|---|
| Latin | 15 832 | 69,6 % | 963 | 31,9 % | 29 | 67 |
| Vieux français | 1 395 | 6,1 % | 284 | 9,4 % | 8 | 20 |
| Anglais | 1 185 | 5,2 % | 261 | 8,7 % | 8 | 18 |
| Grec | 853 | 3,7 % | 226 | 7,5 % | 7 | 16 |
| Italien | 840 | 3,7 % | 221 | 7,3 % | 7 | 15 |
| Francique | 720 | 3,2 % | 203 | 6,7 % | 6 | 14 |
| Allemand et néerlandais | 429 | 1,9 % | 157 | 5,2 % | 5 | 11 |
| Langues d'ailleurs | 377 | 1,7 % | 146 | 4,8 % | 4 | 10 |
| Espagnol et portugais | 354 | 1,6 % | 142 | 4,7 % | 4 | 10 |
| Occitan | 332 | 1,5 % | 139 | 4,6 % | 4 | 10 |
| Arabe | 173 | 0,8 % | 99 | 3,3 % | 3 | 7 |
| Onomatopée | 140 | 0,6 % | 90 | 3,0 % | 3 | 6 |
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
| amour | Nom | Vieux français | 1 / 10 | Le plus vieux mot daté · attesté en 842, dans les Serments de Strasbourg |
| anticonstitutionnellement | Adverbe | Latin | 10 / 2 | Le plus long mot de la langue · 25 lettres |
| dictionnaire | Nom | Latin | 8 / 10 | La maison de tous les autres |
| électro-encéphalogramme | Nom | Grec | 10 / 1 | Le plus long mot composé · 22 lettres |
| être | Verbe | Latin | 1 / 10 | Le mot le plus employé de la langue |
| faire | Verbe | Latin | 2 / 10 | La plus grande famille · 1 282 mots dérivés |
| hapax | Nom | Grec | 9 / 8 | Le mot qui désigne un mot que l'on ne rencontre qu'une seule fois |
| jazzy | Adjectif | Anglais | 10 / 1 | La plus forte valeur par lettre · 7,8 points en moyenne |
| lexie | Nom | Grec | 7 / 2 | Le mot que presque personne ne connaît · connu de 0 % des gens |
| marron | Nom | Italien | 2 / 10 | Le mot aux synonymes les plus nombreux · 161 |
| mot | Nom | Latin | 1 / 10 | Le mot « mot » |
| oiseau | Nom | Latin | 1 / 10 | Les cinq voyelles en 6 lettres seulement |
| prendre | Verbe | Latin | 4 / 10 | Le mot aux sens les plus nombreux · 70 sens |
| psychophysiologique | Adjectif | Latin | 10 / 1 | Les lettres les plus chères · 57 points |
| pyroclastique | Adjectif | Grec | 10 / 1 | Le plus long mot sans lettre répétée · 13 lettres |
| ressasser | Verbe | Latin | 3 / 7 | Le plus long palindrome · il se lit dans les deux sens |

## 5. Exemples tirés au hasard dans l'édition

*Lecture : (type, faction, attaque/défense brute, part des gens qui connaissent le mot). C'est ici que l'on juge si la répartition « sonne juste ».*

### Hors-série

- **lexie** *(Nom, Grec, 7/2, connu de 0 %)* — Élément unitaire du lexique, comme un mot simple (lexème), une locution ou un proverbe. Par exemple, jeune, jeune homme et les …
- **psychophysiologique** *(Adjectif, Latin, 10/1, connu de 68 % · attesté : XIXᵉ siècle)* — Relatif à la psychophysiologie.
- **ressasser** *(Verbe, Latin, 3/7, connu de 100 %)* — Revenir constamment en esprit sur le même sujet ou revenir sans cesse sur les mêmes propos.
- **faire** *(Verbe, Latin, 2/10, connu de 100 % · attesté : IXᵉ siècle)* — Créer, produire, fabriquer, en parlant de toute œuvre matérielle.
- **marron** *(Nom, Italien, 2/10, connu de 100 % · attesté : 1526)* — Fruit rond comestible de certaines variétés de châtaigniers, plus gros qu’une châtaigne ordinaire, de couleur brune.
- **pyroclastique** *(Adjectif, Grec, 10/1, connu de 18 %)* — Qui contient de la matière bouillante composée de cendres, de terre, de gaz et de roches éclatées.
- **jazzy** *(Adjectif, Anglais, 10/1, connu de 75 %)* — Proche du jazz, qui évoque le jazz.
- **oiseau** *(Nom, Latin, 1/10, connu de 100 % · attesté : c. 1100)* — Animal vertébré théropode, à deux pattes et deux ailes, ovipare, homéotherme, au corps couvert de plumes et qui possède un bec …
- **amour** *(Nom, Vieux français, 1/10, connu de 100 % · attesté : 842)* — Sentiment intense et agréable qui incite les êtres à s’unir.
- **dictionnaire** *(Nom, Latin, 8/10, connu de 100 % · attesté : c. 1501)* — Ouvrage de référence qui répertorie des mots dans un ordre convenu (alphabétique en général) fournissant pour chacun d’eux diff…
- **mot** *(Nom, Latin, 1/10, prévalence non mesurée · attesté : Xᵉ siècle)* — Succession de sons dans les langues parlées, ou de signes dans les langues des signes ou écrites, qui a un sens propre.
- **prendre** *(Verbe, Latin, 4/10, connu de 95 % · attesté : IXᵉ siècle)* — Saisir, mettre en sa main.
- **hapax** *(Nom, Grec, 9/8, prévalence non mesurée · attesté : XXᵉ siècle)* — Mot, spécialement pour les langues anciennes, dont on ne connaît qu’une seule occurrence dans le corpus d’une langue donnée, gl…
- **anticonstitutionnellement** *(Adverbe, Latin, 10/2, prévalence non mesurée · attesté : XIXᵉ siècle)* — Contrairement aux règles constitutionnelles de l’organisation des pouvoirs publics d’un gouvernement.
- **être** *(Verbe, Latin, 1/10, connu de 100 %)* — Définir un état, une caractéristique du sujet.
- **électro-encéphalogramme** *(Nom, Grec, 10/1, prévalence non mesurée)* — Enregistrement d’une électro-encéphalographie, résultat de cet enregistrement.

### Légendaire

- **ribote** *(Nom, Vieux français, 2/9, connu de 13 %)* — Réunion, fête mondaine avec épouse ou amis dans le monde des officiers de Marine.
- **douar** *(Nom, Arabe, 1/4, connu de 11 %)* — Groupe de tentes disposées en cercle, de façon à remiser les troupeaux dans l’espace laissé libre au centre.
- **sunna** *(Nom, Arabe, 1/3, connu de 13 %)* — Livre qui contient certaines traditions de la religion musulmane.
- **yatagan** *(Nom, Langues d'ailleurs, 9/1, connu de 23 %)* — Sabre turc, à lame recourbée et dont le tranchant forme, vers la pointe, une courbe rentrante.
- **blédard** *(Nom, Arabe, 5/8, connu de 14 % · attesté : Vers 1920)* — Immigré dont les coutumes et la culture différentes sont encore visibles par manque d’intégration.
- **pennage** *(Nom, Latin, 4/2, connu de 26 %)* — Plumage des oiseaux de proie, qui se renouvelle à différents âges.
- **aubain** *(Nom, Francique, 2/4, connu de 18 % · attesté : XIIᵉ siècle)* — Étranger qui n’était pas naturalisé, et qui était privé du droit de tester et d’hériter.
- **tangence** *(Nom, Latin, 5/5, connu de 42 % · attesté : 1838)* — Correspondance limite entre deux pensées.
- **tarare** *(Nom, Onomatopée, 1/3, connu de 11 %)* — Appareil, sorte de ventilateur, qui sert à nettoyer le grain des balles et la menue paille, après le battage.
- **radôme** *(Nom, Anglais, 2/1, connu de 36 %)* — Abri en forme de dôme protégeant une antenne de radar, au sol, au sommet d'un bâtiment ou encore sur un véhicule.
- **marmoréen** *(Adjectif, Latin, 5/2, connu de 21 %)* — Qui a la nature ou l’apparence du marbre.
- **bayadère** *(Adjectif, Espagnol et portugais, 10/1, connu de 24 % · attesté : XVIIᵉ siècle)* — Qui présente des rayures de couleurs différentes.
- **rapetasser** *(Verbe, Vieux français, 6/7, connu de 31 % · Familier)* — Raccommoder grossièrement de vieux vêtements, de vieux meubles ou des chaussures, y mettre des pièces.
- **basane** *(Nom, Occitan, 2/7, connu de 40 % · attesté : Deuxième moitié du XIIIᵉ dans sa forme actuelle)* — Peau de mouton préparée qui sert à couvrir les livres et à d’autres usages.
- **haire** *(Nom, Allemand et néerlandais, 2/3, connu de 31 %)* — Petite chemise faite d’un tissu de poil de chèvre, de crin ou de tout autre poil rude et piquant, qu’on porte sur la chair par …
- **aboucher** *(Verbe, Latin, 8/9, connu de 23 % · attesté : XIIIᵉ siècle)* — Entrer en communication avec quelqu’un.
- **jaculatoire** *(Adjectif, Latin, 10/4, connu de 20 %)* — Marqué par un jaillissement intérieur intense, exalté, lyrique.
- **sérendipité** *(Nom, Anglais, 7/9, prévalence non mesurée · attesté : 1953)* — Fait de faire une découverte par hasard et par sagacité alors que l’on cherchait autre chose.
- **marmiteux** *(Adjectif, Vieux français, 10/1, connu de 40 % · Familier)* — Qui est piteux, qui est mal sous le rapport de la fortune, des vêtements ou de la santé, et qui s’en plaint habituellement.
- **shipchandler** *(Nom, Anglais, 10/1, connu de 17 %)* — Avitailleur, fournisseur d’accastillage.

### Épique

- **guéret** *(Nom, Latin, 2/2, connu de 26 %)* — Terre labourée et non ensemencée; voire terre laissée en jachère.
- **débardage** *(Nom, Occitan, 7/5, connu de 56 %)* — Transport de bois ou de pierre depuis le lieu d’obtention, forêt ou carrière, jusqu’au lieu de chargement.
- **halva** *(Nom, Arabe, 5/2, connu de 28 %)* — Confiserie orientale faite de farine, d'huile de sésame, de miel, de fruits et d'amandes ou de pistaches.
- **phraséologie** *(Nom, Latin, 9/4, connu de 44 % · attesté : 1678)* — Construction de phrases particulière à une langue, ou propre à un écrivain.
- **aléser** *(Verbe, Latin, 1/4, connu de 50 %)* — Agrandir, aux dimensions voulues, le diamètre d'un trou, d'un tube, d'un jour, le calibre d’un canon.
- **russophone** *(Adjectif, Langues d'ailleurs, 8/1, connu de 57 %)* — Qui parle la langue russe.
- **écornifler** *(Verbe, Latin, 8/7, connu de 25 % · Familier)* — Importuner, harceler quelqu’un de façon à lui arracher un profit ou simplement à surprendre un renseignement.
- **podestat** *(Nom, Italien, 5/4, connu de 26 %)* — Titre du premier magistrat dans certaines villes d’Italie au Moyen-Âge.
- **madré** *(Adjectif, Vieux français, 2/7, connu de 44 %)* — Qui est tacheté, marbré, marqué de diverses couleurs.
- **hiératique** *(Adjectif, Latin, 10/7, connu de 37 %)* — En rapport avec les choses sacrées, notamment les religions ou la liturgie.
- **émétique** *(Nom, Latin, 8/2, connu de 29 % · attesté : XVIᵉ siècle)* — Substance à base de tartrate double d’antimoine et de potassium utilisé comme vomitif.
- **recouler** *(Verbe, Latin, 4/4, connu de 41 %)* — Examiner les cartes pour enlever les ordures qui peuvent en salir les deux faces.
- **druidesse** *(Nom, Latin, 5/2, connu de 41 % · attesté : 1727)* — Nom des membres féminins de la classe sacerdotale des Celtes de l’Antiquité.
- **superfétatoire** *(Adjectif, Latin, 9/7, connu de 47 %)* — Qualifie la naissance d’un second enfant après le premier et dans un écart de temps qui dénote une superfécondation.
- **coulpe** *(Nom, Latin, 4/7, connu de 27 %)* — Tache spirituelle faite par une faute, conséquence personnelle d'un péché commis; se distingue de la peine comme punition mérit…
- **surfaçage** *(Nom, Latin, 8/4, connu de 40 %)* — Opération exécutée immédiatement avant la mise en peinture et consistant en une application d’enduit mince sur un subjectile pr…
- **médianoche** *(Nom, Espagnol et portugais, 9/1, connu de 15 % · Littéraire, Vieilli)* — Désigne à l’origine un repas pris après minuit, marquant le passage d’un jour maigre à un jour gras, puis, la mode évoluant, un…
- **pitonner** *(Verbe, Occitan, 4/8, connu de 42 %)* — Composer ou écrire sur un clavier.
- **glose** *(Nom, Latin, 1/9, connu de 42 % · attesté : XIIᵉ siècle)* — Mot vieilli ou difficile, recueilli dans les auteurs grecs et expliqué.
- **parégorique** *(Adjectif, Latin, 10/1, connu de 14 % · Vieilli)* — Qualifiait autrefois des remèdes qui calment les douleurs.

### Rare

- **chichiteux** *(Adjectif, Latin, 10/1, connu de 52 %)* — Qui fait des chichis, des manières, des simagrées.
- **lige** *(Adjectif, Latin, 1/6, connu de 23 %)* — Qualifie un vassal tenant un fief qui le lie d’une obligation exclusive envers son seigneur dominant.
- **remmener** *(Verbe, Latin, 4/1, connu de 41 %)* — Faire repartir une personne ou un animal qu’on avait amené.
- **capitonner** *(Verbe, Italien, 7/5, connu de 78 %)* — Rembourrer un siège, un fauteuil en piquant en plusieurs endroits.
- **oiseleur** *(Nom, Latin, 2/2, connu de 48 % · Littéraire · attesté : XIIIᵉ siècle)* — Celui qui prend les oiseaux à l’aide de filets ou de pièges.
- **fourbir** *(Verbe, Francique, 6/6, connu de 65 %)* — Rendre clair un objet de métal en le frottant.
- **menterie** *(Nom, Latin, 3/1, connu de 48 % · Familier, Vieilli)* — Propos par lequel on donne pour vrai ce qu’on sait être faux.
- **canner** *(Verbe, Latin, 2/6, connu de 52 %)* — Mettre en conserve, faire des conserves de.
- **cruchon** *(Nom, Francique, 7/2, connu de 50 %)* — Personne peu intelligente ou peu cultivée.
- **sujétion** *(Nom, Latin, 8/7, connu de 57 %)* — Dépendance, état de celui qui est soumis à un pouvoir, à une domination.
- **histrion** *(Nom, Latin, 5/7, connu de 27 %)* — (Rome antique) Comédien, mime, acteur qui jouait des farces.
- **lampée** *(Nom, Onomatopée, 3/2, connu de 45 % · Familier)* — Grande quantité de boisson qu’on ingurgite d’un coup.
- **barje** *(Adjectif, Latin, 7/1, connu de 56 %)* — Se dit d’une personne folle ou qui prend des risques.
- **concussion** *(Nom, Latin, 7/6, connu de 37 %)* — Profit illicite que l’on fait dans l’exercice d’une fonction publique.
- **scion** *(Nom, Vieux français, 2/4, connu de 17 %)* — Petit brin, petit rejeton tendre et très flexible d’un arbre, d’un arbrisseau.
- **schlass** *(Adjectif, Allemand et néerlandais, 6/2, connu de 54 % · Familier · attesté : XIXᵉ siècle)* — Qui est dans un état d’ébriété avancé.
- **myéloïde** *(Adjectif, Grec, 9/2, connu de 33 %)* — Qui ressemble à la moelle des os.
- **shunt** *(Nom, Anglais, 2/3, connu de 40 %)* — Dispositif de faible impédance qui permet au courant de passer d'un point à un autre d'un circuit électrique.
- **récipiendaire** *(Nom, Latin, 9/3, connu de 58 % · attesté : 1674)* — Personne qui est reçue dans quelque corps, dans quelque compagnie, avec une certaine solennité, avec un certain cérémonial.
- **morbidité** *(Nom, Latin, 6/4, connu de 54 %)* — Caractère maladif; ensemble des causes qui peuvent produire une maladie.

### Peu commune

- **personnalisation** *(Nom, Latin, 9/7, connu de 96 %)* — Adaptation d’un produit ou d’un service à la demande spécifique exprimée par un client, de façon à le rendre plus conforme à se…
- **électrodynamique** *(Adjectif, Grec, 10/1, connu de 90 %)* — Qui a rapport aux propriétés des courants électriques.
- **braiser** *(Verbe, Allemand et néerlandais, 3/1, connu de 88 %)* — Faire cuire doucement une viande, un poisson ou certains légumes dans un récipient fermé avec du jus comme liquide.
- **zébrure** *(Nom, Espagnol et portugais, 9/2, connu de 93 % · attesté : 1846)* — Effet pictural rappelant ou formant des rayures.
- **monocorde** *(Adjectif, Latin, 6/4, connu de 96 % · attesté : fin XIXᵉ siècle)* — Qualifie un instrument doté d’une seule corde.
- **redoublement** *(Nom, Latin, 8/8, connu de 96 %)* — Accroissement, augmentation considérable.
- **bonder** *(Verbe, Gaulois, 3/4, connu de 70 %)* — Remplir au maximum un bateau.
- **dessaisir** *(Verbe, Latin, 4/4, connu de 95 %)* — Déposséder un tribunal de ce dont il a été saisi.
- **assimilé** *(Nom, Latin, 3/5, connu de 100 %)* — Personne qui fait partie d’une catégorie du personnel sans en avoir le titre.
- **picador** *(Nom, Espagnol et portugais, 6/1, connu de 92 %)* — Cavalier qui dans les combats de taureaux attaque l’animal avec la pique.
- **monobloc** *(Adjectif, Allemand et néerlandais, 6/1, connu de 93 % · attesté : 1906)* — Qualifie une chose qui réunit tous ses éléments dans un même contenant, un unique ensemble.
- **mufle** *(Adjectif, Allemand et néerlandais, 3/1, connu de 93 % · Familier · attesté : XVIᵉ siècle)* — Dont la conduite est indélicate et grossière.
- **réarmer** *(Verbe, Latin, 2/4, connu de 95 % · attesté : 1470)* — Armer de nouveau. Il signifie particulièrement, armer un vaisseau qui a été désarmé pour réparation.
- **sémantique** *(Adjectif, Grec, 9/4, connu de 94 % · attesté : 1879)* — Relatif à la signification et au sens des unités linguistiques.
- **casbah** *(Nom, Arabe, 6/4, connu de 84 %)* — Forteresse d’une ville du Maghreb ou du Levant.
- **cabestan** *(Nom, Occitan, 6/5, connu de 88 %)* — Système tournant dont l’axe vertical permet, en enroulant un câble, de déployer une force très importante.
- **canonnier** *(Nom, Latin, 5/4, connu de 91 %)* — Soldat ou marin qui est chargé de servir une pièce de canon.
- **barda** *(Nom, Arabe, 2/9, connu de 77 % · attesté : 1848)* — Attirail encombrant porté sur le dos, bagage très lourd, encombrant.
- **hard** *(Nom, Anglais, 2/7, connu de 91 %)* — Pornographie insistant sur l’acte sexuel.
- **prout** *(Nom, Onomatopée, 2/10, connu de 80 % · Familier · attesté : 1782)* — Pet, bruit produit par l’évacuation de gaz du corps humain.

### Commune

- **démarrer** *(Verbe, Allemand et néerlandais, 4/10, connu de 100 %)* — Quitter le port en parlant d’un bâtiment.
- **bijoutier** *(Nom, Gaulois, 9/5, connu de 100 % · attesté : XVIIᵉ siècle)* — Artisan qui fabrique et qui vend des bijoux.
- **cabaret** *(Nom, Vieux français, 5/10, connu de 100 % · attesté : 1275)* — Taverne où l’on vend en détail du vin et des boissons spiritueuses et où l’on vend aussi à manger.
- **racaille** *(Nom, Anglais, 4/4, connu de 96 %)* — Ensemble des individus mauvais, appartenant à la partie la plus pauvre, la plus basse ou la plus méprisée du peuple.
- **turquoise** *(Adjectif, Langues d'ailleurs, 8/2, connu de 95 % · attesté : XIIIᵉ siècle)* — De la couleur bleu ciel à bleu-vert de la pierre du même nom.
- **surgir** *(Verbe, Latin, 2/6, connu de 100 %)* — Sortir de terre, en parlant de l’eau d’une source.
- **monopole** *(Nom, Latin, 5/8, connu de 90 % · attesté : XIVᵉ siècle)* — Trafic exclusif, fait en vertu d’un privilège.
- **concéder** *(Verbe, Latin, 6/5, connu de 90 %)* — Accorder, octroyer un privilège, une faveur.
- **besogne** *(Nom, Francique, 4/7, connu de 100 %)* — Travail qu’exige de chacun sa profession, action par laquelle on fait une œuvre.
- **biberon** *(Nom, Latin, 5/10, connu de 96 %)* — Flacon muni d’une tétine qui sert à allaiter artificiellement les enfants.
- **pieux** *(Adjectif, Latin, 8/9, connu de 90 % · attesté : Vers 980)* — Qui a de la piété; qui est attaché aux croyances, aux devoirs et aux pratiques de la religion.
- **valeur** *(Nom, Latin, 3/10, connu de 100 %)* — Qualité ou justesse d’une chose, d’une idée, d’un ouvrage.
- **distinct** *(Adjectif, Latin, 5/4, connu de 100 %)* — Qui est nettement séparé d’une autre, en parlant de certaines choses.
- **sauna** *(Nom, Langues d'ailleurs, 1/4, connu de 100 % · attesté : 1950)* — Pièce dans laquelle on prend un bain de chaleur.
- **emboutir** *(Verbe, Francique, 5/9, connu de 91 % · attesté : XIVᵉ siècle)* — Bomber un morceau de plomb et le rendre convexe d’un côté et concave de l’autre.
- **bassine** *(Nom, Latin, 3/7, connu de 100 %)* — Récipient en métal ou plus communément en plastique utilisé en général pour y mettre de l’eau, y faire la vaisselle, laver quel…
- **perfection** *(Nom, Latin, 9/9, connu de 95 % · attesté : c. 1140)* — Qualité de ce qui est parfait dans son genre.
- **enrober** *(Verbe, Vieux français, 3/7, connu de 94 %)* — Envelopper des médicaments, de la viande, etc., d’une couche isolante pour en masquer la saveur ou les préserver de l’air.
- **tituber** *(Verbe, Latin, 3/2, connu de 100 %)* — Avancer en marchant, en ayant du mal à garder son équilibre, d’une façon chancelante.
- **débloquer** *(Verbe, Allemand et néerlandais, 9/8, connu de 96 %)* — Rendre une somme d’argent accessible à une autre action.

### Par faction

**Latin** : menterie *(rare)*, correct *(commune)*, criailler *(épique)*, ambition *(commune)*, rabais *(commune)*, naturalisation *(commune)*, java *(peu commune)*, salé *(commune)*, décollage *(commune)*, quitte *(commune)*, délavé *(peu commune)*, profanation *(peu commune)*, hommasse *(rare)*, fiat *(rare)*

**Vieux français** : blesser *(commune)*, plaisanterie *(commune)*, souiller *(commune)*, éclabousser *(commune)*, embûche *(peu commune)*, voirie *(commune)*, camionneur *(commune)*, gratin *(commune)*, ronchonner *(peu commune)*, appoint *(commune)*, gifler *(commune)*, bourdonner *(commune)*, goberger *(rare)*, tôle *(commune)*

**Anglais** : tilbury *(épique)*, antitrust *(rare)*, patch *(commune)*, lisse *(commune)*, matérialisme *(peu commune)*, sélectif *(commune)*, romantique *(commune)*, imprescriptible *(rare)*, trigger *(rare)*, péniche *(commune)*, externalité *(épique)*, luminescent *(peu commune)*, quantifier *(commune)*, zapper *(commune)*

**Grec** : déshydrater *(commune)*, métaphore *(commune)*, céramique *(commune)*, millimétré *(peu commune)*, mécanisme *(commune)*, despote *(peu commune)*, anthropologie *(commune)*, aphérèse *(légendaire)*, électro-encéphalogramme *(hors-série)*, aérodynamique *(peu commune)*, analyser *(commune)*, paniquer *(commune)*, métèque *(commune)*, diaspora *(rare)*

**Italien** : manège *(commune)*, malandrin *(rare)*, cavalcade *(peu commune)*, favori *(commune)*, capiteux *(rare)*, cappuccino *(commune)*, saccager *(commune)*, braver *(commune)*, diva *(commune)*, buste *(commune)*, trombone *(commune)*, courtisan *(commune)*, cadencé *(peu commune)*, franquiste *(peu commune)*

**Francique** : estoc *(rare)*, bordure *(commune)*, salope *(commune)*, échevin *(rare)*, haler *(peu commune)*, rochet *(épique)*, gant *(commune)*, écailleux *(rare)*, cinoque *(épique)*, banc *(commune)*, mijoter *(commune)*, patinoire *(commune)*, mignard *(légendaire)*, étale *(rare)*

**Allemand et néerlandais** : bûcheur *(peu commune)*, sabrer *(peu commune)*, néerlandais *(commune)*, valse *(commune)*, drôle *(commune)*, morganatique *(légendaire)*, monobloc *(peu commune)*, transvaser *(commune)*, vasouillard *(épique)*, haire *(légendaire)*, vaguemestre *(épique)*, étriqué *(commune)*, biologique *(commune)*, bouquiner *(peu commune)*

**Langues d'ailleurs** : peul *(épique)*, ayatollah *(peu commune)*, russe *(commune)*, catalan *(commune)*, lascar *(peu commune)*, samouraï *(commune)*, chagrin *(commune)*, rabbin *(commune)*, saké *(commune)*, tsar *(commune)*, bandoulière *(peu commune)*, gréer *(rare)*, mikado *(commune)*, anorak *(commune)*

**Espagnol et portugais** : picador *(peu commune)*, escamotable *(commune)*, cannibalisme *(commune)*, gamelle *(commune)*, estampiller *(peu commune)*, placer *(commune)*, espagnolette *(épique)*, marabout *(commune)*, macho *(commune)*, cacique *(rare)*, savane *(commune)*, patache *(épique)*, luthier *(peu commune)*, débarrasser *(commune)*

**Occitan** : caler *(commune)*, décalage *(commune)*, carnier *(épique)*, nougat *(peu commune)*, désemparer *(commune)*, escagasser *(épique)*, paumelle *(légendaire)*, pastel *(commune)*, bastille *(commune)*, entrave *(commune)*, concombre *(commune)*, encanailler *(peu commune)*, entravé *(peu commune)*, muscat *(peu commune)*

**Arabe** : barrage *(commune)*, médina *(peu commune)*, accablant *(commune)*, casbah *(peu commune)*, emmagasiner *(peu commune)*, sultan *(commune)*, calife *(peu commune)*, barrer *(commune)*, copte *(épique)*, fakir *(peu commune)*, tasse *(commune)*, ottomane *(peu commune)*, bled *(commune)*, hégire *(épique)*

**Onomatopée** : crachouillis *(rare)*, baba *(peu commune)*, claquette *(commune)*, tapé *(commune)*, crachat *(commune)*, claquer *(commune)*, marmonner *(commune)*, croquis *(commune)*, croquette *(commune)*, déchiqueter *(commune)*, tarare *(légendaire)*, dinguer *(rare)*, bouder *(commune)*, croquer *(commune)*

**Gaulois** : bousin *(épique)*, balayette *(peu commune)*, braille *(peu commune)*, char *(commune)*, combe *(rare)*, habillé *(commune)*, renfrogner *(peu commune)*, balayer *(commune)*, dépecer *(commune)*, bourbeux *(rare)*, pilou *(rare)*, billard *(commune)*, brasserie *(commune)*, renfrogné *(peu commune)*

## 6. Origines des mots et choix des factions

### Langues détectées (base complète)

| Langue d'origine détectée | Cartes de la base | dont éligibles | Faction par défaut |
|---|---|---|---|
| Latin | 29 656 | 15 829 | Latin |
| Origine inconnue | 4 241 | 0 | Origine inconnue |
| Anglais | 3 284 | 1 184 | Anglais |
| Formation française | 3 173 | 0 | Formation française |
| Grec | 2 465 | 853 | Grec |
| Ancien français | 2 117 | 1 244 | Vieux français |
| Italien | 1 449 | 839 | Italien |
| Francique et germanique ancien | 1 217 | 720 | Francique |
| Allemand | 606 | 237 | Allemand et néerlandais |
| Occitan | 567 | 332 | Occitan |
| Espagnol | 562 | 286 | Espagnol et portugais |
| Arabe | 404 | 173 | Arabe |
| Néerlandais | 360 | 192 | Allemand et néerlandais |
| Parlers régionaux | 269 | 151 | Vieux français |
| Onomatopée | 266 | 140 | Onomatopée |
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
| Latin | 15 829 | 953 |
| Vieux français | 1 395 | 283 |
| Anglais | 1 184 | 261 |
| Grec | 853 | 221 |
| Italien | 839 | 219 |
| Francique | 720 | 203 |
| Allemand et néerlandais | 429 | 157 |
| Langues d'ailleurs | 377 | 147 |
| Espagnol et portugais | 354 | 143 |
| Occitan | 332 | 138 |
| Arabe | 173 | 100 |
| Onomatopée | 140 | 90 |
| Gaulois | 127 | 85 |

**Découpage B — resserré** — 9 factions

| Faction | Mots éligibles | Cartes dans l'édition (environ) |
|---|---|---|
| Latin | 15 829 | 1 050 |
| Langues romanes | 1 525 | 346 |
| Vieux français et gaulois | 1 522 | 346 |
| Anglais | 1 184 | 305 |
| Langues germaniques | 1 182 | 305 |
| Grec | 853 | 259 |
| Arabe et Orient | 268 | 145 |
| Langues d'ailleurs | 249 | 140 |
| Onomatopée | 140 | 105 |

**Découpage C — détaillé (une faction par langue d'au moins 60 mots éligibles)** — 18 factions

| Faction | Mots éligibles | Cartes dans l'édition (environ) |
|---|---|---|
| Latin | 15 829 | 869 |
| Ancien français | 1 244 | 244 |
| Anglais | 1 184 | 238 |
| Grec | 853 | 202 |
| Italien | 839 | 200 |
| Francique et germanique ancien | 720 | 185 |
| Occitan | 332 | 126 |
| Espagnol | 286 | 117 |
| Allemand | 237 | 106 |
| Langues d'ailleurs | 225 | 104 |
| Néerlandais | 192 | 96 |
| Arabe | 173 | 91 |
| Parlers régionaux | 151 | 85 |
| Onomatopée | 140 | 82 |
| Gaulois et celtique | 127 | 78 |
| Turc et persan | 81 | 62 |
| Russe et langues slaves | 71 | 58 |
| Portugais | 68 | 57 |

### Échantillon de contrôle de la détection

*60 cartes de l'édition au hasard : la faction trouvée, et le début de l'étymologie du Wiktionnaire. Sert à mesurer le taux d'erreur.*

| Mot | Faction | Héritée de | Début de l'étymologie |
|---|---|---|---|
| force | Latin |  | Du bas latin fortia, pluriel neutre substantivé de l’adjectif fortis (« courageux, ferme, brave »). Le maintien de o (on |
| myéloïde | Grec |  | Mot constitué des éléments: myélo-, du grec ancien μυελός (muelos) « moelle » et -oïde, du grec ancien -ειδής de εἶδος ( |
| coronal | Latin |  | Du latin coronalis (« de couronne »). |
| électro-encéphalogramme | Grec | encéphalogramme | Dérivé de encéphalogramme, avec le préfixe électro-. |
| gauchir | Vieux français |  | De l’ancien français gauchier → voir gauche. |
| radôme | Anglais | radar | De radar et de dôme. |
| saccager | Italien |  | De l’italien saccheggiare, attesté depuis le treizième siècle et dérivé de sacco (« saccage »). → voir sac |
| spiritualité | Vieux français |  | Sous la forme ancien français spiritüalitet (« vie spirituelle ») dans les textes en vers de Gilles Le Muisit. Il existe |
| étriqué | Allemand et néerlandais | étriquer | Participe passé adjectivé de étriquer. |
| bouder | Onomatopée |  | De l’onomatopée bod désignant quelque chose d’enflé comme l’est la lèvre du boudeur ou de la boudeuse. Pour le lien séma |
| abordé | Francique | aborder | Adjectivation du participe passé de aborder. |
| prospectus | Latin |  | Du latin prospectus (« perspective, vue d’ensemble ») avec, pour le français, le sens initial de « document d’annonce d' |
| madré | Vieux français |  | De l’ancien français madrer (« veiner, marbrer ») → voir madre (« bois tacheté, bigarré, varié en couleurs »). |
| contempteur | Latin |  | Du latin contemptor (même signification), dérivé de contemnere (« mépriser »), de cum (« avec ») et temnere (« dédaigner |
| impolitesse | Italien | politesse | Dérivé de politesse, avec le préfixe im-. |
| didactique | Grec |  | Du grec ancien διδακτικός, didaktikós (« doué pour l’enseignement »), dérivé du verbe διδάσκω didásko (« enseigner », «  |
| manquer | Italien |  | De l’italien mancare « faire défaut », du lombard *mangjan (cf. ancien haut allemand mengen « être privé de, ne pas réus |
| vasouillard | Allemand et néerlandais | vasouiller | Dérivé de vasouiller, avec le suffixe -ard. |
| imprimatur | Latin |  | Du latin imprimatur (« qu'il soit imprimé ») → voir déléatur, exequatur et admittatur. |
| douar | Arabe |  | De l'arabe دوار, َdouar (« hameau »), probablement du radical دار dar (« maison »). |
| retape | Onomatopée | retaper | Déverbal de retaper. |
| jachère | Vieux français |  | En ancien français jaschier (« terre de labour ») et jascherer (« labourer »), gasker, gieskerech (« juin, mois des labo |
| pareil | Latin |  | Du latin parilis (« semblable, égal »). |
| gamelle | Espagnol et portugais |  | De l’espagnol gamella (« auge, récipient »), lui-même du latin gamella (« coupe à boire »). |
| musard | Latin | muser | Motdérivé de muser, avec le suffixe -ard. |
| polygame | Grec |  | Du grec ancien πολύγαμος, polygamos → voir poly- et -game. |
| burnous | Arabe |  | De l’arabe برنوس, barnous, lui-même du berbère abernus, qui a aussi donné les variantes albornoz et alburno avec l’artic |
| trogne | Gaulois |  | Du gaulois trugna (« nez, museau »), voir aussi le gallois trwyn (« nez, museau »), cornique troen (« nez »), breton str |
| apparatchik | Langues d'ailleurs |  | Du russe аппарaтчик, apparattchik (« membre de l’appareil du parti communiste »). |
| tamponnement | Francique | tamponner | Dérivé de tamponner, avec le suffixe -ment. |
| signaleur | Latin | signaler | De signaler avec le suffixe -eur. |
| vote | Anglais |  | De l’anglais vote, issu du latin votum (« vœu »). |
| phénotype | Grec |  | Du grec ancien φαίνω, phaínô (« faire briller, montrer, paraître ») et de τύπος, tupos (« marque, type »). |
| désemparé | Occitan | désemparer | Composé de désemparer. |
| embellie | Latin | embellir | Déverbal de embellir. |
| cafétéria | Espagnol et portugais |  | De l’espagnol cafetería par l’anglais cafeteria. |
| embusqué | Vieux français | embusquer | Du participe passé de embusquer. |
| dénaturé | Latin | nature | (aucune) |
| misanthrope | Grec |  | Du grec ancien μισάνθρωπος, misánthrôpοs |
| sorbetière | Italien | sorbet | Dérivé de sorbet, avec le suffixe -ière. |
| rééquilibrage | Latin | rééquilibrer | Dérivé de rééquilibrer, avec le suffixe -age. |
| entraver | Occitan |  | De l’ancien occitan entravar, mettre une poutre (trau), via l’ancien français tref, « poutre ». → voir latin trabs. |
| incalculable | Latin | calculable | Dérivé de calculable, avec le préfixe in-. |
| humeur | Latin |  | (Nom commun 1) Emprunté au latin humor (« liquide, fait d’être « mouillé ») → voir humide. référence nécessaire (résoudr |
| doryphore | Grec |  | Du grec ancien δορυφόρος, doruphóros (« porteur de lance »). NC2 (2) car les réquisitions de nourriture et en particulie |
| voltige | Italien | voltiger | Déverbal de voltiger. |
| arachnéen | Grec |  | Du grec ancien ἀράχνη, arachné (« araignée »). |
| méditer | Latin |  | Du latin meditor. |
| tournebroche | Latin | tourner | (aucune) |
| jersey | Anglais |  | De l’anglais jersey. |
| guêtre | Francique |  | guestes; (1432) guietres; du vieux-francique wrist (« cou-de-pied »), par métonymie « vêtement couvrant cette partie du  |
| affidavit | Anglais |  | De l’anglais affidavit, mot introduit en droit français par le décret du 22 juin 1914. |
| vachette | Latin | vache | Dérivé de vache, avec le suffixe -ette. (champignon) car, jeune, il forme des gouttes de lait. |
| hallebarde | Allemand et néerlandais |  | De l’allemand Hellebarde (« hache à hampe »), composé de Halm (« hampe ») et de Barte (« hache »). |
| tyranniser | Grec |  | Dérivé de tyran, avec le suffixe -iser; en grec ancien τυραννίζω, turannízô a le sens de « être partisan de la tyrannie  |
| fardeau | Arabe | farde | En ancien français fardel (« botte d'herbe »)dérivé de farde, avec le suffixe -eau. |
| mânes | Latin |  | L’accent circonflexe est tardif, du latin manes (« âmes des morts »). |
| ciseau | Vieux français |  | De l’ancien français cisel ou chisel. |
| pieux | Latin |  | Du latin pius (« pieux, qui remplit ses devoirs envers la divinité, religieux, saint, sacré »). pius. |
| véloce | Latin |  | Du latin velox (« rapide »). |

