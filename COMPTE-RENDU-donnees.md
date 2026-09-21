# Compte rendu — ce que contiennent vraiment les données

*Phase 0a, 21 septembre 2026. Tous les chiffres détaillés sont dans [data/exploration/chiffres.md](data/exploration/chiffres.md), regénérable avec `npm run exploration` (30 secondes).*

---

## 1. En bref

- Les deux sources sont téléchargées, lisibles, et **se croisent très bien** : on obtient une base d'environ **52 000 cartes possibles**.
- Le jeu est faisable tel que décrit dans le brief. Aucune mauvaise surprise bloquante.
- **La grande découverte : la « prévalence » de Lexique 4** (la part des gens qui connaissent un mot). Sans elle, les Légendaires sont ternes et choisies au hasard. Avec elle, elles deviennent exactement ce que tu cherchais (*valétudinaire*, *tabellion*, *cuistrerie*…). C'est la décision la plus importante à prendre (§4).
- 5 décisions à confirmer, listées au §7. Aucune n'est urgente au point de bloquer la suite, sauf la n° 1.

---

## 2. Les chiffres clés

| | |
|---|---|
| Entrées dans le fichier du Wiktionnaire | 7,5 millions (toutes langues) |
| Dont entrées françaises | 2,1 millions (surtout des formes conjuguées) |
| Mots « de base » dans Lexique 4 (noms, verbes, adjectifs, adverbes) | 64 598 |
| **Trouvés dans les deux sources, avec une définition utilisable** | **52 378** |
| — noms | 34 162 |
| — adjectifs | 10 655 |
| — verbes | 5 942 |
| — adverbes | 1 619 |
| Mots qui ont une étymologie rédigée | 91 % |
| Mots dont la prévalence est mesurée | 32 894 (63 % de la base) |
| Mots à badge « Familier » (sens principal familier, argotique ou vulgaire) | environ 2 700 (5 %) |

Pour une Édition 1 de 3 000 cartes, on a donc **dix-sept fois plus de mots que nécessaire** : on peut se permettre d'être très exigeant sur la qualité.

---

## 3. Les bonnes nouvelles

- **Lexique 4 fournit bien la fréquence « du mot entier »** (toutes ses formes additionnées). Le piège des verbes faussement rares, signalé dans mon rapport, est évité.
- **Le croisement fait le ménage tout seul.** Lexique 4 contient des erreurs (des formes conjuguées classées comme noms : *connaitraient*, *révèlerons*…). Comme le Wiktionnaire ne les connaît pas comme noms, elles disparaissent d'elles-mêmes.
- **Presque tous les verbes sont là** : seulement 23 verbes de Lexique manquent au Wiktionnaire.
- **Les dates gênent peu la détection des étymologies.** Je craignais que beaucoup commencent par « (XIIe siècle) ». En réalité, seules 2,5 % commencent par une parenthèse : l'extraction range les dates dans un champ à part.
- **Bonus inattendu : ce champ des dates.** Pour 31 % des mots, on connaît la date de première apparition (*accueil* : XIIe siècle, *encyclopédie* : 1532, *manga* : XXe siècle). On pourrait l'afficher sur la carte (« Attesté depuis 1532 »). C'est du charme gratuit.
- **Lexique 4 indique de quel mot un mot est dérivé** (*danseur* → *danser*, *sourire* → *rire*). C'est exactement ce qu'il faut pour qu'un mot dérivé hérite de la faction de son mot d'origine.
- **Le traitement complet prend 24 secondes.** Le pipeline sera relançable à volonté.

---

## 4. La grande découverte : fréquence seule ou fréquence + prévalence ?

### Le problème

Dans Lexique 4, **10 % des mots ont exactement la même fréquence, la plus basse possible** (une seule apparition dans tout le corpus). Les 20 % de mots les plus rares ne se partagent que trois valeurs de fréquence.

Conséquence : si la Légendaire est « les 3 % les plus rares », il faut en choisir 1 571 parmi 5 295 ex æquo. Le choix est arbitraire. Avec un départage alphabétique, **toutes les Légendaires commenceraient par A, B, C ou D**.

### Option A — fréquence seule (le brief actuel)

25 Légendaires tirées au hasard : *cintrage, arpon, chaconne, courtaille, aphonie, clochardisation, bourrine, chiffrier, antidreyfusisme, avaliseur, découlement, bullaire, cavum, albuminurie, asphyxique, cyrène, cynips, cicatrisant, datable, cosmographe, choisisseur, contextuellement, bimétallique, antibois, destinateur.*

Beaucoup sont des dérivés sans saveur (« *découlement* : action de découler », « *contextuellement* : de façon contextuelle »). C'est le défaut que je redoutais : **rare ne veut pas dire désirable**.

### Option B — fréquence + prévalence

La prévalence mesure combien de gens connaissent réellement le mot (*callipyge* : 33 % ; *bagnole* : 100 %). En combinant les deux, 25 Légendaires tirées au hasard :

*cachexie, cuistrerie, tabellion, lurex, térébrant, grandet, guaracha, remploi, scrofuleux, valétudinaire, ondatra, pendeur, blocaille, bourdillon, jaculatoire, quattrocento, hautesse, téléologique, pharmacognosie, tchékiste, lymphatisme, épitomé, pharisaïsme, menhaden, catachrèse.*

C'est nettement plus proche de l'esprit « j'ai eu *callipyge* en légendaire ! ».

### Ce que ça apporte en plus

- La prévalence mesure directement **la difficulté d'un mot en duel**. Le principe « un mot rare est puissant mais difficile à maîtriser » repose alors sur une vraie mesure scientifique, pas sur une supposition.
- Elle n'est mesurée que pour 63 % de la base (32 894 mots). C'est encore onze fois la taille de l'Édition 1, donc **je propose que l'Édition 1 ne contienne que des mots dont la prévalence est connue.**
- **Le revers, vérifié après coup :** quelques beaux mots n'ont pas été mesurés par les chercheurs et seraient donc écartés — *procrastiner*, *procrastination*, *sérendipité*, *zeugma*, *rodomontade*. La liste « coups de cœur » (`data/coups-de-coeur.txt`) sert justement à les rattraper un par un.

### Où tomberaient des mots que tu connais

| Mot | Connu de | Option A (fréquence seule) | Option B (fréquence + prévalence) |
|---|---|---|---|
| callipyge | 33 % | Épique (par le hasard du départage) | **Légendaire** |
| cacochyme | 35 % | Rare | **Légendaire** |
| thuriféraire | 29 % | Rare | Épique |
| sycophante | 25 % | Peu commune | Épique |
| amphigourique | 20 % | Peu commune | Épique |
| parangon | 42 % | Commune | Rare |
| flagorneur | 48 % | Commune | Rare |
| mansuétude | 69 % | Commune | Rare |
| pusillanime | 37 % | Peu commune | Rare |
| oxymore | 63 % | Commune | Peu commune |
| quidam | 95 % | Commune | Commune |
| énergumène | 96 % | Commune | Commune |

### Une nuance à garder en tête

Les mots connus de 0 à 5 % des gens (*ondatra*, *menhaden*) sont parfois trop obscurs pour être amusants. Les plus savoureux sont souvent connus de 10 à 50 % des gens : on les a déjà entendus sans être sûr du sens. On pourra régler ce curseur en phase 0b, en regardant les exemples du rapport de génération.

---

## 5. Les factions : ordre de grandeur

Premier essai de détection, avec héritage simple (un dérivé prend la faction de son mot d'origine) :

| Faction | Mots | Part |
|---|---|---|
| Latin | 23 610 | 45 % |
| Formation française (pas encore rattachée) | 11 229 | 21 % |
| Anglais | 2 971 | 5,7 % |
| Sans étymologie | 2 522 | 4,8 % |
| Étymologie non reconnue | 2 216 | 4,2 % |
| Grec | 1 877 | 3,6 % |
| Ancien français (sans origine plus lointaine) | 1 719 | 3,3 % |
| Italien | 1 361 | 2,6 % |
| Germanique / francique | 1 017 | 1,9 % |
| Occitan / provençal | 618 | 1,2 % |
| Espagnol | 596 | 1,1 % |
| Allemand | 571 | 1,1 % |
| Arabe | 376 | 0,7 % |
| Néerlandais | 309 | 0,6 % |
| Onomatopée | 281 | 0,5 % |
| Japonais / chinois | 234 | 0,4 % |
| Gaulois / celtique | 214 | 0,4 % |
| Autres (russe, turc, persan, sanskrit, portugais, langues d'Amérique, hébreu) | environ 660 | 1,3 % |

**Ce qu'il faut en retenir :**
- Comme prévu, **le latin écrase tout**, et sa part montera encore (vers 55 à 60 %) quand les « formations françaises » seront mieux rattachées. Beaucoup d'étymologies non reconnues sont du type « De *flemme* » ou « De *re-* et *nommer* » : faciles à traiter.
- Les petites factions existent bel et bien (376 mots arabes, 214 gaulois, 234 japonais ou chinois) : **de quoi les rendre collectionnables** dans une édition de 3 000 cartes, à condition de les sur-représenter volontairement et de plafonner le latin (par exemple à 35 % de l'édition).
- Si l'on se limite aux mots dont la prévalence est mesurée et que l'on respecte les proportions réelles de la langue, l'édition compterait **1 724 cartes latines sur 3 000 (57 %)**, contre 21 arabes, 15 gauloises, 7 japonaises ou chinoises et 2 hébraïques. Les réserves disponibles sont bien plus grandes (228 mots arabes, 165 gaulois…), sauf pour les toutes petites langues, à regrouper dans « Langues d'ailleurs » (471 mots disponibles au total).
- La détection par mots-clés fait des erreurs (*antibois* classé « grec » à cause du préfixe *anti-*). En phase 0b, je mesurerai son taux d'erreur sur un échantillon vérifié à la main.
- La liste définitive des factions (combien, lesquelles regrouper) est une décision de game design : je te proposerai 2 ou 3 découpages en phase 0b, chiffres à l'appui.

---

## 6. Les petits problèmes découverts (tous gérables)

| Problème | Ampleur | Traitement prévu |
|---|---|---|
| Lexique 4 n'a **plus de fréquence dans les livres**, seulement dans les sous-titres | toute la base | Utiliser la fréquence des sous-titres seule. Le corpus est six fois plus gros que celui de Lexique 3, donc plus fiable pour les mots rares. Les mots littéraires paraîtront un peu plus rares qu'ils ne le sont : pour ce jeu, c'est plutôt un avantage. |
| **Homographes** : même mot, même nature, plusieurs origines (*avocat* a 3 entrées : le juriste, le fruit, la couleur) | 3 179 mots (6 %) | Une seule carte, définitions regroupées, faction de la première entrée (proposition du brief). |
| Définition qui **contient le mot ou sa racine** (« *datable* : que l'on peut dater ») | 22 % des mots | Inutilisable en duel. Ces mots seront défavorisés dans le choix de l'Édition 1, ou utiliseront une autre de leurs définitions. |
| **46 % des mots n'ont qu'un seul sens** | confirmé | C'est pourquoi la défense repose sur la « richesse du mot » et non sur le nombre de sens (décision 3, déjà validée). 31 % des mots ont des synonymes et 42 % des dérivés : la mesure sera utilisable. |
| Définitions **très courtes** (moins de 30 caractères) | 28 % | Souvent de simples synonymes (« *bourdillon* : merrain »). À défavoriser dans l'Édition 1. |
| **Résidus de mise en forme** : « ^([1]) », « XVII^(ème) », « Motdérivé de » (mots collés) | quelques centaines | Nettoyage automatique. |
| **Contenus sensibles** : sens étiquetés « offensant » | 182 mots concernés, dont 59 entièrement | Sens retirés automatiquement ; le mot disparaît s'il ne lui reste rien. |
| Mots dont le sens principal est **péjoratif ou vulgaire** | environ 530 dans toute la base | La plupart sont inoffensifs (*hobereau*, *plouc*, *politicard*), quelques-uns sont sexistes. Impossible à trier automatiquement : le pipeline produira une **courte liste à relire** pour ceux qui entrent dans l'Édition 1 (une trentaine de mots), et tu décideras. |

---

## 7. Décisions à confirmer

| # | Question | Ma recommandation |
|---|---|---|
| 1 | **Rareté : fréquence seule, ou fréquence + prévalence ?** | **Fréquence + prévalence**, et une Édition 1 limitée aux mots dont la prévalence est mesurée. C'est ce qui rend les cartes rares désirables. |
| 2 | Lexique 4 seul, ou Lexique 4 + les fréquences « livres » de Lexique 3 ? | **Lexique 4 seul.** Plus simple, plus récent, et suffisant. |
| 3 | Afficher la date de première apparition du mot sur la carte, quand elle est connue ? | **Oui**, c'est gratuit et charmant. Simple mention sur la fiche, sans effet sur le jeu. |
| 4 | Mots péjoratifs ou vulgaires : tri manuel d'une courte liste ? | **Oui** : retrait automatique des sens « offensants », et une liste d'une trentaine de mots à relire pour l'Édition 1. |
| 5 | Plafonner le latin et sur-représenter les petites factions dans l'Édition 1 ? | **Oui**, sinon plus d'une carte sur deux serait latine. Le plafond exact (35 % ?) se réglera en phase 0b. |

---

## 8. La suite : phase 0b

Écrire le vrai pipeline (avec ses tests), générer la base complète et l'Édition 1, et te fournir le **rapport de génération** : répartitions, exemples par rareté et par faction, liste des mots à relire. C'est sur ce rapport que tu valideras que le jeu « sonne juste ».
