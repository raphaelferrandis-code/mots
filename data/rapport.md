# Rapport de génération des cartes

*Généré par `npm run pipeline` en 25 secondes — version des données : 2026-09-18. Ne pas modifier à la main. Les réglages sont dans `pipeline/config.ts`.*

## 1. En bref

- Base complète : **52 053 cartes possibles**.
- Édition 1 : **3 000 cartes**, choisies parmi 22 775 cartes éligibles.
- Poids pour le jeu : 396 Ko chargés au démarrage, plus 1 404 Ko de détails répartis en 16 fichiers chargés à la demande.

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
| Légendaire | 1 561 | 3,0 % | 5,7 | 4,4 | 6,3 | 17,8 % |
| Épique | 3 645 | 7,0 % | 5,8 | 4,4 | 5,4 | 41,0 % |
| Rare | 7 807 | 15,0 % | 5,9 | 4,6 | 5,5 | 63,8 % |
| Peu commune | 13 014 | 25,0 % | 5,7 | 5,0 | 5,0 | 84,5 % |
| Commune | 26 026 | 50,0 % | 5,2 | 6,3 | 6,3 | 97,1 % |

| Type | Cartes | Part |
|---|---|---|
| Nom | 33 891 | 65,1 % |
| Adjectif | 10 620 | 20,4 % |
| Verbe | 5 924 | 11,4 % |
| Adverbe | 1 618 | 3,1 % |

**Mots sans faction reconnue : 7 420 (14,3 %)** — ils restent dans la base complète mais ne peuvent pas entrer dans une édition.

| Faction | Cartes | Part |
|---|---|---|
| Latin | 29 657 | 57,0 % |
| Origine inconnue | 4 246 | 8,2 % |
| Anglais | 3 284 | 6,3 % |
| Formation française | 3 174 | 6,1 % |
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

Pour être éligible, une carte doit avoir une faction reconnue, une prévalence mesurée (au moins 10 personnes interrogées) et au moins une définition utilisable en duel. **22 775 cartes éligibles.**

| Rareté | Cartes | Part | Attaque moyenne | Défense moyenne (brute) | Défense moyenne (avec le bonus de rareté) | Connu de… (moyenne) |
|---|---|---|---|---|---|---|
| Légendaire | 90 | 3,0 % | 5,6 | 3,7 | 5,6 | 22,8 % |
| Épique | 210 | 7,0 % | 5,6 | 4,4 | 5,4 | 37,7 % |
| Rare | 450 | 15,0 % | 5,4 | 4,4 | 5,4 | 48,3 % |
| Peu commune | 750 | 25,0 % | 6,0 | 4,5 | 4,5 | 90,9 % |
| Commune | 1 500 | 50,0 % | 5,2 | 6,6 | 6,6 | 97,4 % |

*Les notes d'attaque et de défense sont calculées entre les cartes de l'édition : les 10 % de cartes les plus fortes du jeu ont 10, les 10 % les plus faibles ont 1.*

| Faction | Mots éligibles | Part réelle | Cartes dans l'édition | Part dans l'édition | dont Légendaires | dont Épiques |
|---|---|---|---|---|---|---|
| Latin | 15 844 | 69,6 % | 954 | 31,8 % | 29 | 67 |
| Vieux français | 1 398 | 6,1 % | 283 | 9,4 % | 8 | 20 |
| Anglais | 1 185 | 5,2 % | 260 | 8,7 % | 8 | 18 |
| Grec | 854 | 3,7 % | 222 | 7,4 % | 7 | 16 |
| Italien | 841 | 3,7 % | 220 | 7,3 % | 7 | 15 |
| Francique | 720 | 3,2 % | 203 | 6,8 % | 6 | 14 |
| Allemand et néerlandais | 429 | 1,9 % | 157 | 5,2 % | 5 | 11 |
| Langues d'ailleurs | 377 | 1,7 % | 146 | 4,9 % | 4 | 10 |
| Espagnol et portugais | 354 | 1,6 % | 142 | 4,7 % | 4 | 10 |
| Occitan | 332 | 1,5 % | 139 | 4,6 % | 4 | 10 |
| Arabe | 173 | 0,8 % | 99 | 3,3 % | 3 | 7 |
| Onomatopée | 141 | 0,6 % | 90 | 3,0 % | 3 | 6 |
| Gaulois | 127 | 0,6 % | 85 | 2,8 % | 2 | 6 |

| Type | Cartes | Part |
|---|---|---|
| Nom | 1 714 | 57,1 % |
| Adjectif | 657 | 21,9 % |
| Verbe | 593 | 19,8 % |
| Adverbe | 36 | 1,2 % |

| Badge de registre | Cartes | Part |
|---|---|---|
| Familier | 150 | 5,0 % |
| Vieilli | 36 | 1,2 % |
| Littéraire | 12 | 0,4 % |
| Injurieux | 10 | 0,3 % |

Cartes avec une date de première apparition : 1 027 (34,2 %).

Coups de cœur ajoutés : procrastiner-verbe, procrastination-nom, sérendipité-nom, zeugma-nom, rodomontade-nom.

Corrections d'origine faites à la main (`data/corrections-factions.txt`) : goulu → Latin, reggae → Anglais, rodomont → Italien, rodomontade → Italien.

## 5. Exemples tirés au hasard dans l'édition

*Lecture : (type, faction, attaque/défense brute, part des gens qui connaissent le mot). C'est ici que l'on juge si la répartition « sonne juste ».*

### Légendaire

- **bouloir** *(Nom, Vieux français, 3/5, connu de 14 %)* — Instrument avec lequel on remue la chaux quand on l’éteint et quand on la mêle avec le sable ou le ciment.
- **radôme** *(Nom, Anglais, 2/1, connu de 36 %)* — Abri en forme de dôme protégeant une antenne de radar, au sol, au sommet d'un bâtiment ou encore sur un véhicule.
- **gabare** *(Nom, Occitan, 3/7, connu de 11 % · attesté : 1338)* — Voilier à rames, qui sert à naviguer sur les rivières, à charger et à décharger les bâtiments, etc.
- **grenouillard** *(Adjectif, Latin, 7/2, connu de 32 %)* — Relatif à Ondreville-sur-Essonne, commune française située dans le département du Loiret.
- **ribote** *(Nom, Vieux français, 2/9, connu de 13 %)* — Réunion, fête mondaine avec épouse ou amis dans le monde des officiers de Marine.
- **sunna** *(Nom, Arabe, 1/3, connu de 13 %)* — Livre qui contient certaines traditions de la religion musulmane.
- **ubiquitaire** *(Adjectif, Latin, 10/7, connu de 28 %)* — Qui possède ou semble posséder le don d’ubiquité; qui est présent partout à la fois.
- **aubain** *(Nom, Francique, 2/4, connu de 18 % · attesté : XIIᵉ siècle)* — Étranger qui n’était pas naturalisé, et qui était privé du droit de tester et d’hériter.
- **coryphée** *(Nom, Latin, 10/4, connu de 10 %)* — Chef de chœur dans le théâtre antique ou dans une fête moderne.
- **couaquer** *(Verbe, Onomatopée, 9/2, connu de 25 %)* — Se moquer d'un prêtre en faisant un couac, en imitant le corbeau, quand il passe.
- **abstrus** *(Adjectif, Latin, 3/6, connu de 24 % · Littéraire · attesté : 1327)* — Qui est difficile à comprendre, à saisir par l’esprit.
- **refendre** *(Verbe, Latin, 6/4, connu de 35 %)* — Scier en long, fendre, diviser.
- **syriaque** *(Nom, Latin, 10/3, connu de 21 %)* — Araméen, langue que parlaient les anciens peuples de la Syrie.
- **escopette** *(Nom, Italien, 6/3, connu de 25 % · attesté : 1516)* — Arme à feu, fusil ou carabine que l’on portait ordinairement en bandoulière.
- **minaudière** *(Nom, Gaulois, 6/2, connu de 33 %)* — Élégante petite pochette où les femmes peuvent ranger le minimum nécessaire, petit mouchoir, fards, poudres, rouge à lèvres pou…
- **aède** *(Nom, Grec, 1/4, connu de 14 %)* — Poète de la Grèce antique qui chantait ses œuvres.
- **shipchandler** *(Nom, Anglais, 10/1, connu de 17 %)* — Avitailleur, fournisseur d’accastillage.
- **marmiteux** *(Adjectif, Vieux français, 10/1, connu de 40 % · Familier)* — Qui est piteux, qui est mal sous le rapport de la fortune, des vêtements ou de la santé, et qui s’en plaint habituellement.
- **tarare** *(Nom, Onomatopée, 1/3, connu de 11 %)* — Appareil, sorte de ventilateur, qui sert à nettoyer le grain des balles et la menue paille, après le battage.
- **souchet** *(Nom, Gaulois, 6/7, connu de 20 %)* — Plante monocotylédone de la famille des Cypéracées, dont les diverses espèces croissent dans les endroits humides.

### Épique

- **druidesse** *(Nom, Latin, 5/2, connu de 41 % · attesté : 1727)* — Nom des membres féminins de la classe sacerdotale des Celtes de l’Antiquité.
- **tachymètre** *(Nom, Grec, 10/2, connu de 50 % · attesté : 1834)* — Appareil de mesure indiquant en continu la vitesse angulaire d’une machine tournante, par exemple l’arbre de sortie d’un moteur.
- **assonance** *(Nom, Latin, 5/4, connu de 58 %)* — Figure de style qui consiste en la répétition d'un son vocalique.
- **barbacane** *(Nom, Arabe, 8/5, connu de 22 % · attesté : XIIᵉ siècle)* — Ouvrage avancé, percé de meurtrières et destiné à renforcer les défenses d'une porte ou d'un passage.
- **felouque** *(Nom, Arabe, 9/1, connu de 33 % · Vieilli)* — Sorte de petit bâtiment léger, long et étroit, à voiles et à rames, et qui était principalement en usage dans la Méditerranée.
- **pantographe** *(Nom, Grec, 9/6, connu de 35 %)* — Instrument au moyen duquel on peut mécaniquement copier, agrandir ou réduire des dessins ou des gravures.
- **cinoque** *(Adjectif, Francique, 8/1, connu de 32 % · Familier)* — Qualifie quelqu’un ou quelque chose d’un peu fou, dérangé.
- **dispensation** *(Nom, Latin, 8/5, connu de 35 %)* — : la manifesteté de l’être, l’ensemble de l’étant
- **prognathe** *(Adjectif, Grec, 8/4, connu de 44 %)* — Qualifie une personne dont les mâchoires sont proéminentes ou dont la mâchoire inférieure fait saillie par rapport à la mâchoir…
- **vénerie** *(Nom, Latin, 4/7, connu de 27 % · attesté : XIIᵉ siècle)* — Art de chasser au chien courant toutes sortes de bêtes, principalement les bêtes fauves.
- **komi** *(Adjectif, Langues d'ailleurs, 7/1, connu de 21 %)* — Relatif aux Komis, peuple finno-ougrien habitant au nord-est de la partie européenne de la Russie.
- **espagnolette** *(Nom, Espagnol et portugais, 8/4, connu de 52 %)* — Ferrure à poignée tournante servant à fermer et à ouvrir les châssis d’une fenêtre.
- **colback** *(Nom, Langues d'ailleurs, 10/2, connu de 21 %)* — Ancienne coiffure militaire, bonnet de fourrure en forme de cône tronqué dont la partie supérieure était plate.
- **moiré** *(Nom, Anglais, 1/2, connu de 55 %)* — Effet de contraste changeant avec la déformation d'un objet, indépendamment des effets d'ombre.
- **madré** *(Adjectif, Vieux français, 2/7, connu de 44 %)* — Qui est tacheté, marbré, marqué de diverses couleurs.
- **égotisme** *(Nom, Anglais, 4/3, connu de 50 %)* — Étude sans complaisance qu’un écrivain fait de lui-même, de son physique et de son caractère, de sa personnalité; tendance, dis…
- **prévôté** *(Nom, Vieux français, 6/4, connu de 40 %)* — Territoire où s’exerçait cette juridiction.
- **écornifler** *(Verbe, Latin, 8/7, connu de 25 % · Familier)* — Importuner, harceler quelqu’un de façon à lui arracher un profit ou simplement à surprendre un renseignement.
- **brouet** *(Nom, Vieux français, 2/4, connu de 22 %)* — Sorte de mauvais ragoût, aliment détestable et peu consistant.
- **lobulaire** *(Adjectif, Grec, 5/1, connu de 27 %)* — Qui a la forme d’un lobule, qui appartient à un lobule.

### Rare

- **turne** *(Nom, Vieux français, 1/8, connu de 30 % · Familier)* — Maison, chambre, dans l’argot scolaire et universitaire.
- **mungo** *(Nom, Anglais, 2/7, connu de 14 %)* — Étoffe faite avec des morceaux de laine neufs, mais trop petits pour être employés par le tailleur.
- **enferrer** *(Verbe, Latin, 5/7, connu de 73 %)* — Percer avec la pointe d’une épée, d’une baïonnette, etc.
- **cacique** *(Nom, Espagnol et portugais, 9/8, connu de 40 %)* — Terme utilisé par les colons espagnols pour se référer aux dirigeants autochtones en Amérique.
- **harder** *(Verbe, Francique, 4/4, connu de 50 %)* — Attacher des chiens ensemble par un lien commun.
- **chaufferette** *(Nom, Vieux français, 10/3, connu de 57 %)* — Sorte de boîte percée de plusieurs trous dans le haut et dans laquelle on met généralement de la braise pour se tenir les pieds…
- **escrimer** *(Verbe, Italien, 5/6, connu de 69 %)* — S’appliquer; se donner du mal.
- **claper** *(Verbe, Anglais, 4/7, connu de 48 %)* — Faire un bruit sec avec la langue.
- **enclore** *(Verbe, Latin, 3/7, connu de 50 %)* — Entourer d'une clôture, enfermer, placer à l'intérieur d'une enceinte close.
- **cadi** *(Nom, Arabe, 2/3, connu de 33 %)* — Juge musulman qui remplit à la fois les fonctions civiles et religieuses.
- **salique** *(Adjectif, Latin, 7/4, connu de 43 %)* — Qualifie l’ancienne loi franque telle qu'elle fut recueillie en latin.
- **chorba** *(Nom, Arabe, 6/2, connu de 45 %)* — Soupe traditionnelle des pays du Maghreb, du monde arabe et de nombreux pays des Balkans, de l’Europe de l'Est et de l’Asie. El…
- **dégazer** *(Verbe, Allemand et néerlandais, 9/3, connu de 78 %)* — Expulser les gaz contenus dans un corps.
- **toréer** *(Verbe, Espagnol et portugais, 1/2, connu de 61 % · attesté : 1926)* — Affronter le taureau lors d’une corrida.
- **sapajou** *(Nom, Langues d'ailleurs, 8/5, connu de 50 %)* — Genre de singe d’Amérique, de la famille des cébidés, qui a la queue prenante et qui est fort petit.
- **taximètre** *(Nom, Grec, 9/6, connu de 52 % · attesté : 1856)* — Compteur qui enregistre le parcours fourni par une voiture de place et indique, d’après cette distance et d’après le temps écou…
- **corroder** *(Verbe, Latin, 5/7, connu de 57 % · attesté : 1314)* — Ronger. Il se dit des substances qui, en vertu d’une qualité caustique, rongent, brûlent quelque partie du corps vivant ou de q…
- **maquignon** *(Nom, Allemand et néerlandais, 9/5, connu de 50 %)* — Marchand de chevaux, et par extension, de bovins.
- **gimmick** *(Nom, Anglais, 10/8, connu de 50 %)* — Nouveauté, gadget astucieux, en particulier dans le champ publicitaire.
- **iridescent** *(Adjectif, Latin, 6/3, connu de 40 % · attesté : Attesté en 1807)* — Qui présente les couleurs de l’arc-en-ciel.

### Peu commune

- **mélomane** *(Nom, Grec, 4/1, connu de 94 %)* — Celui, celle qui aime la musique avec passion.
- **boniment** *(Nom, Vieux français, 5/8, connu de 90 %)* — Propos que débitent les camelots, les charlatans et les saltimbanques pour attirer les clients.
- **brique** *(Adjectif, Allemand et néerlandais, 8/1, connu de 88 %)* — Couleur rouge fade tirant sur le brun. #842E1B
- **surinvestissement** *(Nom, Latin, 10/5, connu de 100 %)* — Investissement excédentaire par rapport au marché de l'entreprise ou à la valeur du bien dans lequel on investit.
- **dévitaliser** *(Verbe, Latin, 8/2, connu de 92 %)* — Priver quelqu’un ou quelque chose de sa vitalité.
- **baba** *(Adjectif, Onomatopée, 2/5, connu de 87 %)* — Frappé d'un vif étonnement; ébahi.
- **bouchonné** *(Adjectif, Vieux français, 8/5, connu de 96 %)* — Pomponné, comme l’est un cheval qu’on a étrillé.
- **blafard** *(Adjectif, Francique, 6/1, connu de 92 %)* — Qui est d’une couleur ou d’un éclat pâle, terne.
- **solarium** *(Nom, Latin, 3/8, connu de 93 %)* — Établissement où l'on traite certaines affections par la lumière solaire.
- **dévorant** *(Adjectif, Latin, 6/7, connu de 90 %)* — Qui consomme beaucoup; qui excite à manger beaucoup et avidement.
- **plastiquer** *(Verbe, Anglais, 9/1, connu de 88 %)* — Faire exploser (théoriquement avec du plastic).
- **formaliser** *(Verbe, Anglais, 7/2, connu de 88 % · attesté : XVIᵉ siècle)* — Structurer de manière formelle, formuler avec précision selon les règles en vigueur dans un domaine scientifique.
- **thermos** *(Nom, Grec, 5/4, connu de 96 %)* — Récipient isolant conservant la température d’un liquide pendant quelques heures.
- **halal** *(Adjectif, Arabe, 2/6, connu de 75 %)* — Qui est permis par le Coran.
- **introspection** *(Nom, Anglais, 9/2, connu de 90 % · attesté : XIXᵉ siècle)* — Observation intérieure, observation par la conscience, examen fait par le sujet lui-même des phénomènes psychologiques qui se p…
- **grommeler** *(Verbe, Allemand et néerlandais, 6/5, connu de 94 % · Familier · attesté : 1375)* — Murmurer, se plaindre entre ses dents quand on est fâché.
- **cramoisi** *(Nom, Espagnol et portugais, 5/4, connu de 92 % · attesté : XIIIᵉ siècle)* — Quelque chose ou quelqu’un qui est très rouge.
- **bazarder** *(Verbe, Langues d'ailleurs, 10/3, connu de 88 % · Familier)* — Se séparer de quelque chose soit en le jetant, soit en le vendant à bas prix.
- **jonchée** *(Nom, Latin, 9/4, connu de 95 %)* — Arrangement d’herbes, de fleurs et de branchages disposé sur le sol, dans les rues, les églises, etc., lors d’une cérémonie.
- **balayette** *(Nom, Gaulois, 10/6, connu de 93 % · attesté : XIXᵉ siècle)* — Petit balai, parfois sans manche.

### Commune

- **biologique** *(Adjectif, Allemand et néerlandais, 10/9, connu de 100 %)* — Se dit des parents ayant fourni les gamètes dont est issu l'enfant; se dit de l'enfant lui-même.
- **baroque** *(Nom, Espagnol et portugais, 8/2, connu de 100 %)* — Cépage donnant du raisin dont les grains sont d'un blanc rosé, de petite taille et en grappes serrées. On le nomme aussi bordel…
- **emblème** *(Nom, Latin, 5/2, connu de 100 %)* — Espèce de figure symbolique, qui est d’ordinaire accompagnée de quelques paroles en forme de sentence.
- **dessus** *(Adverbe, Latin, 2/4, connu de 100 %)* — À la partie, à la face supérieure.
- **nomenclature** *(Nom, Latin, 8/4, connu de 100 %)* — Système des noms employés pour désigner les différents objets d’une science ou d’un art.
- **tactique** *(Adjectif, Grec, 9/8, connu de 100 %)* — Qui se rapporte à l’art de disposer les troupes sur le terrain, de les employer au combat dans la bataille.
- **homosexuel** *(Nom, Allemand et néerlandais, 10/10, connu de 100 % · attesté : 1891)* — Individu qui est attiré sexuellement vers les personnes de son sexe ou genre.
- **parano** *(Adjectif, Allemand et néerlandais, 2/1, connu de 95 % · Familier)* — Susceptible et extrêmement méfiant.
- **toque** *(Nom, Espagnol et portugais, 6/7, connu de 94 % · attesté : 1454)* — Couvre-chef sans bords ou à très petits bords.
- **express** *(Adjectif, Anglais, 9/6, connu de 100 %)* — Qualifie un train qui va plus vite que les trains ordinaires et qui ne s’arrête qu’à un petit nombre de stations.
- **stationnaire** *(Adjectif, Latin, 6/7, connu de 100 %)* — Qui reste au même point, sans avancer ni rétrograder.
- **trentaine** *(Nom, Latin, 3/5, connu de 95 %)* — Réunion de personnes ou de choses de même nature au nombre de trente ou environ.
- **immortalité** *(Nom, Latin, 6/5, connu de 100 %)* — Qualité, état de ce qui est immortel; de ce qui n'est pas soumis à la mort
- **fréquence** *(Nom, Latin, 10/9, connu de 96 % · attesté : XIIᵉ siècle)* — Répétition incessante et régulière d’une action ou d’un fait.
- **camionneur** *(Nom, Vieux français, 6/6, connu de 100 % · attesté : c. 1807)* — Celui qui conduit ou qui traîne un camion.
- **puma** *(Nom, Espagnol et portugais, 2/7, connu de 100 % · attesté : 1633)* — Félin carnassier d’Amérique, de taille moyenne, à pelage fauve à beige et sans crinière.
- **déserter** *(Verbe, Latin, 3/8, connu de 100 %)* — Abandonner un lieu, pour quelque cause que ce soit.
- **régime** *(Nom, Latin, 2/10, connu de 100 %)* — Ordre, règle dans la manière de vivre, par rapport à la santé.
- **entracte** *(Nom, Latin, 4/5, connu de 100 %)* — Intervalle qui, dans la représentation d’une pièce de théâtre, sépare un acte d’un autre.
- **balise** *(Nom, Espagnol et portugais, 2/10, connu de 95 %)* — Tout moyen de marquage d’un point de la surface terrestre.

### Par faction

**Latin** : cuvier *(légendaire)*, vénerie *(épique)*, miséreux *(peu commune)*, renseignement *(commune)*, fréquence *(commune)*, syntaxe *(commune)*, végéter *(peu commune)*, cuistance *(légendaire)*, obscène *(commune)*, aviné *(rare)*, dépuceler *(commune)*, règle *(commune)*, récriminer *(peu commune)*, dominer *(commune)*

**Vieux français** : madré *(épique)*, gâteux *(commune)*, méridien *(peu commune)*, robe *(commune)*, potage *(commune)*, marquage *(commune)*, beffroi *(rare)*, lionceau *(peu commune)*, jachère *(peu commune)*, blet *(rare)*, romancier *(commune)*, taudis *(commune)*, garnison *(commune)*, agrémenter *(peu commune)*

**Anglais** : dribbler *(commune)*, cool *(commune)*, tunnel *(commune)*, constable *(rare)*, gaélique *(rare)*, quantifier *(commune)*, superviser *(commune)*, radôme *(légendaire)*, jungle *(commune)*, stretching *(peu commune)*, jacobite *(rare)*, boycott *(commune)*, turnover *(peu commune)*, polo *(commune)*

**Grec** : ésotérisme *(peu commune)*, nécrologe *(épique)*, tachymètre *(épique)*, tyranniser *(commune)*, cryptographie *(peu commune)*, despote *(peu commune)*, cosmopolite *(peu commune)*, cosmopolite *(peu commune)*, millimétré *(peu commune)*, tonique *(commune)*, lepton *(épique)*, laryngite *(peu commune)*, opticien *(commune)*, thermos *(peu commune)*

**Italien** : solfège *(peu commune)*, lazzi *(légendaire)*, multimillionnaire *(commune)*, galbe *(peu commune)*, bouffon *(commune)*, cimeterre *(peu commune)*, ballotte *(peu commune)*, isolant *(commune)*, aparté *(commune)*, salami *(commune)*, favori *(commune)*, panache *(commune)*, cappuccino *(commune)*, cadencé *(peu commune)*

**Francique** : mulot *(peu commune)*, tiroir *(commune)*, avachi *(peu commune)*, haïssable *(peu commune)*, bordereau *(commune)*, border *(commune)*, loupe *(commune)*, maréchal *(commune)*, licher *(rare)*, grappin *(commune)*, croupir *(commune)*, chouette *(commune)*, piauler *(épique)*, banal *(commune)*

**Allemand et néerlandais** : écran *(commune)*, valser *(commune)*, flinguer *(commune)*, mufle *(commune)*, rosse *(rare)*, kitsch *(commune)*, monobloc *(peu commune)*, lippu *(rare)*, teckel *(peu commune)*, miteux *(commune)*, plaquage *(commune)*, valse *(commune)*, blitzkrieg *(rare)*, kobold *(rare)*

**Langues d'ailleurs** : suriner *(rare)*, danois *(commune)*, bazar *(commune)*, tamoul *(rare)*, gréement *(peu commune)*, tanka *(épique)*, chacal *(commune)*, bandoulière *(peu commune)*, dynamiter *(commune)*, russophone *(épique)*, upanishad *(légendaire)*, antisoviétique *(peu commune)*, décocher *(commune)*, judo *(commune)*

**Espagnol et portugais** : cannibale *(commune)*, hasarder *(commune)*, rumba *(peu commune)*, macho *(commune)*, canoter *(rare)*, macho *(commune)*, estampiller *(peu commune)*, adobe *(rare)*, balise *(commune)*, quadrille *(peu commune)*, cimarron *(rare)*, médianoche *(épique)*, embarrassé *(commune)*, remplacement *(commune)*

**Occitan** : cantonais *(peu commune)*, péquin *(rare)*, bader *(peu commune)*, décaler *(commune)*, salade *(commune)*, calmer *(commune)*, cramer *(commune)*, causse *(rare)*, frontalier *(commune)*, rouste *(peu commune)*, sournois *(commune)*, goujat *(commune)*, empapaouter *(rare)*, bramer *(peu commune)*

**Arabe** : goudronneux *(peu commune)*, tarif *(commune)*, bougie *(commune)*, sirop *(commune)*, bagage *(commune)*, alcali *(rare)*, goudronné *(commune)*, calife *(peu commune)*, salamalec *(rare)*, burnous *(rare)*, calibre *(commune)*, calfeutrer *(peu commune)*, barrage *(commune)*, cafarder *(peu commune)*

**Onomatopée** : tapageur *(peu commune)*, roucoulant *(rare)*, croquant *(commune)*, retape *(rare)*, craquement *(commune)*, taper *(commune)*, tapant *(peu commune)*, tapotis *(épique)*, miauler *(commune)*, coquet *(commune)*, marmonner *(commune)*, baba *(peu commune)*, baret *(légendaire)*, zézette *(rare)*

**Gaulois** : charrette *(commune)*, bonder *(peu commune)*, jaillir *(commune)*, gober *(commune)*, char *(commune)*, charron *(rare)*, raie *(commune)*, pornographie *(commune)*, menhir *(peu commune)*, braillard *(peu commune)*, embrasser *(commune)*, renfrogné *(peu commune)*, moutonner *(épique)*, dégobiller *(peu commune)*

## 6. Origines des mots et choix des factions

### Langues détectées (base complète)

| Langue d'origine détectée | Cartes de la base | dont éligibles | Faction par défaut |
|---|---|---|---|
| Latin | 29 657 | 15 841 | Latin |
| Origine inconnue | 4 246 | 0 | Origine inconnue |
| Anglais | 3 284 | 1 184 | Anglais |
| Formation française | 3 174 | 0 | Formation française |
| Grec | 2 465 | 854 | Grec |
| Ancien français | 2 117 | 1 246 | Vieux français |
| Italien | 1 449 | 840 | Italien |
| Francique et germanique ancien | 1 217 | 720 | Francique |
| Allemand | 606 | 237 | Allemand et néerlandais |
| Occitan | 567 | 332 | Occitan |
| Espagnol | 562 | 286 | Espagnol et portugais |
| Arabe | 404 | 173 | Arabe |
| Néerlandais | 360 | 192 | Allemand et néerlandais |
| Parlers régionaux | 269 | 152 | Vieux français |
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
| Latin | 15 841 | 953 |
| Vieux français | 1 398 | 283 |
| Anglais | 1 184 | 261 |
| Grec | 854 | 221 |
| Italien | 840 | 219 |
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
| Latin | 15 841 | 1 050 |
| Langues romanes | 1 526 | 346 |
| Vieux français et gaulois | 1 525 | 346 |
| Anglais | 1 184 | 305 |
| Langues germaniques | 1 182 | 305 |
| Grec | 854 | 259 |
| Arabe et Orient | 268 | 145 |
| Langues d'ailleurs | 249 | 140 |
| Onomatopée | 141 | 105 |

**Découpage C — détaillé (une faction par langue d'au moins 60 mots éligibles)** — 18 factions

| Faction | Mots éligibles | Cartes dans l'édition (environ) |
|---|---|---|
| Latin | 15 841 | 869 |
| Ancien français | 1 246 | 244 |
| Anglais | 1 184 | 238 |
| Grec | 854 | 202 |
| Italien | 840 | 200 |
| Francique et germanique ancien | 720 | 185 |
| Occitan | 332 | 126 |
| Espagnol | 286 | 117 |
| Allemand | 237 | 106 |
| Langues d'ailleurs | 225 | 104 |
| Néerlandais | 192 | 96 |
| Arabe | 173 | 91 |
| Parlers régionaux | 152 | 85 |
| Onomatopée | 141 | 82 |
| Gaulois et celtique | 127 | 78 |
| Turc et persan | 81 | 62 |
| Russe et langues slaves | 71 | 58 |
| Portugais | 68 | 57 |

### Échantillon de contrôle de la détection

*60 cartes de l'édition au hasard : la faction trouvée, et le début de l'étymologie du Wiktionnaire. Sert à mesurer le taux d'erreur.*

| Mot | Faction | Héritée de | Début de l'étymologie |
|---|---|---|---|
| kilt | Anglais |  | De l’anglais kilt. |
| métaphore | Grec |  | Du grec ancien μεταφορά, metaphorá dérivé de μεταφέρω, metaphérô (« transporter »). |
| contrôler | Vieux français |  | De l’ancien français contreroller ou contre-roller (« vérifier des comptes, des écritures d’un registre à l’aide d’un se |
| catapulte | Latin |  | Du latin catapulta (sens identique), lui-même isssu du grec ancien καταπέλτης, katapeltês, dérivé de κατά, kata (« de ha |
| salope | Francique | sale | Première attestation dans un texte tiré des Œuvres satyriques de Charles-Timoléon de Sigogne : Or, laissons paistre cest |
| thématique | Grec |  | Emprunt savant au grec ancien θεματικός, thematikós (« de thème »), de θέμα, théma (« thème »). |
| jungle | Anglais |  | De l’anglais jungle, lui-même du hindi जंगल, jaṅgal (« forêt ») ou de l’ourdou جنگل, jaṅgal, de même sens, issu du sansk |
| dévitaliser | Latin | vital | Dérivé de vital, avec le préfixe dé- et le suffixe -iser. |
| doryphore | Grec |  | Du grec ancien δορυφόρος, doruphóros (« porteur de lance »). NC2 (2) car les réquisitions de nourriture et en particulie |
| diaphane | Grec |  | Du grec ancien διαφανής, diaphanês (« transparent ») → voir dia- et -phane. |
| script | Anglais |  | Via l’anglais script, originellement un terme financier, abréviation de subscription dans le syntagme subscription recei |
| récupérer | Latin |  | Du latin recuperare dont est issu « recouvrer »; « récupérer » est une recréation savante et tardive. |
| biaisé | Occitan | biaiser | (Adjectif) Participe passé de biaiser. |
| prime | Latin |  | Du latin praemium (« gain, butin, récompense - avantage, bénéfice, prérogative, privilège, faveur, prémium »). |
| caniveau | Vieux français |  | Probablement une variante de l’ancien caniseau, canisel (« petit canal ») Un rattachement à canif → voir canivet et cani |
| anche | Francique |  | Du vieux-francique *ankya (« canal de l'os »), qui a donné l’ancien haut-allemand ancha (« jambe, tibia ») et le françai |
| couac | Onomatopée |  | Onomatopée exprimant un bruit sec et retentissant → voir cvak en tchèque, squawk en anglais, etc. |
| aérodynamique | Grec |  | Provient du grec aerios (qui concerne l'air) et dynamis (force). Dérivé de dynamique, avec le préfixe aéro-. |
| bâtard | Vieux français |  | De l’ancien français bastard (« né hors mariage »), dérivé de bast (« union illégitime »), avec le suffixe -ard. |
| philharmonique | Grec | philharmonie | Dérivé de philharmonie, avec le suffixe -ique. |
| cadenas | Occitan |  | De l’ancien occitan cadenat, du bas latin catenatum. |
| corroder | Latin |  | Du latin corrodere (« ronger »). |
| sandow | Allemand et néerlandais |  | Du nom du culturiste allemand Eugen Sandow qui inventa à la fin du XIXᵉ s. des appareils utilisant des câbles élastiques |
| madrier | Occitan |  | Faisait madier en ancien français avec le sens de « pièce de bois faisant partie de la membrure d’une galère et qui s’ap |
| rangée | Anglais | ranger | Du verbe ranger. |
| glacial | Latin |  | Du latin glacialis. |
| capeline | Occitan |  | De l’ancien occitan capelina. |
| sycomore | Latin |  | Du latin sycomorus. |
| turc | Langues d'ailleurs |  | De Turc par plaisanterie, également appelé morillon. |
| moufle | Vieux français |  | De l’ancien français mofle (« menotte, mitaine ou gant épais de cuir ou de laine »); (1464) mouffle « système de poulies |
| embellie | Latin | embellir | Déverbal de embellir. |
| déshydrater | Grec | hydrater | Dérivé de hydrater, avec le préfixe dés-. |
| balafre | Vieux français |  | Croisement de balèvre par analogie entre les lèvres d’une plaie et les lèvres du visage, et de l’ancien français laffru, |
| brimbaler | Latin | bringuebaler | → voir bringuebaler qui semble plus usité aujourd'hui, on trouve brinbaler au sens de « jouir d'une femme » dans un des  |
| rééquilibrage | Latin | rééquilibrer | Dérivé de rééquilibrer, avec le suffixe -age. |
| trilogie | Grec |  | Emprunté au grec ancien τριλογία, trilogia (« ensemble de trois tragédies »). |
| frette | Vieux français |  | De l’ancien français fraite, frette (« [ligne] brisée »), frete (« losange »). |
| dépareiller | Latin | pareil | Formé à partir du préfixe dé- et du suffixe -er servant à former un verbe, tiré de l'adjectif pareil, lui-même latin par |
| magenta | Anglais |  | De l’anglais magenta, nommé par Edward Chambers en l’honneur de la bataille de Magenta (1859), contemporaine de la décou |
| calotte | Occitan |  | De l’occitan calòta; plus avant : équivalent dudérivé de cale (« bonnet de femme »), avec le suffixe -otte; le provençal |
| presbyte | Grec |  | Du grec ancien πρεσβύτης, presbutēs (« vieillard »). |
| pigne | Latin |  | Du latin pinea (« pomme de pin ») en passant par l'occitan pinha, de même sens. |
| adopter | Latin |  | Ce mot provient du latin adoptare, composé de ad (« à ») et optare (« choisir », « souhaiter »). |
| stencil | Anglais |  | De l’anglais stencil dérivé de l’ancien français estanceler, estenceler (→ voir étinceler) au sens de « parer de couleur |
| relevé | Latin | lever | (aucune) |
| subreptice | Latin |  | Du latin subrepticius, de subripio. |
| claper | Anglais | clap | (aucune) |
| aérolithe | Grec |  | Du grec ancien ἀήρ, aêr (« air ») et λίθος, líthos (« pierre »). |
| muscat | Occitan |  | De l’occitan muscat → voir musc et muscade. |
| homophobe | Allemand et néerlandais | homo | Composé de homo (apocope de homosexuel) et du suffixe -phobe (peur). |
| caoutchouteux | Espagnol et portugais | caoutchouc | Composé de caoutchouc et du suffixe -eux utilisé pour formé des adjectifs. |
| baigner | Latin |  | En ancien français bagner, plus tard refait en baigner d’après bain. Du latin balneare, altéré en latin populaire en *ba |
| fanfaronner | Espagnol et portugais | fanfaron | Dérivé de fanfaron, avec le suffixe -er. |
| valse | Allemand et néerlandais |  | De l’allemand Walzer (« valse »), issu de wälzen (« tourner en cercle »). |
| trompeter | Francique | trompette | De trompette. |
| julep | Arabe |  | De l’arabe جلاب, julâb lui-même du persan گلاب, gul-âb, gul signifiant rose et âb, eau. Son premier sens est donc littér |
| trille | Italien |  | De l'italien trillo (« tremblement »). Du genre Trillium, qui vient du suédois trilling (« triplet »). |
| remplacement | Espagnol et portugais | remplacer | Du verbe remplacer avec le suffixe -ment. |
| conjonction | Latin |  | Du latin conjunctio qui donne l’ancien français conjoncion. |
| superstructure | Latin | structure | Dérivé de structure, avec le préfixe super-. |

