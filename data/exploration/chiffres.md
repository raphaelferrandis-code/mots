# Exploration des données — chiffres bruts

*Fichier généré par `npm run exploration` en 24 secondes. Ne pas modifier à la main.*

## 1. Lexique 4

- Lignes dans le fichier : **189 863**
- Lemmes retenus (nom, verbe, adjectif, adverbe) : **64 598** couples (mot, nature), dont 0 lignes fusionnées (même mot et même nature sur deux lignes)
- Lemmes retenus qui ont une mesure de prévalence : **34 678** (53.7 %)

| Lignes écartées | Nombre |
|---|---|
| forme fléchie (pas un lemme) | 124 213 |
| nature non retenue (pronom, préposition…) | 789 |
| contient une espace ou une apostrophe | 263 |

## 2. Wiktionnaire

- Entrées dans le fichier (toutes langues) : **7 473 968**
- Entrées de langue française : **2 110 406** (28.2 %)

| Langue (code) | Entrées |
|---|---|
| fr | 2 110 406 |
| it | 1 198 790 |
| se | 736 111 |
| de | 530 275 |
| pt | 307 885 |
| fi | 241 141 |
| es | 219 150 |
| ru | 212 605 |

| Nature des entrées françaises (champ `pos`) | Entrées |
|---|---|
| verb | 1 265 971 |
| noun | 474 036 |
| adj | 207 651 |
| name | 144 880 |
| adv | 8 386 |
| phrase | 2 021 |
| intj | 1 907 |
| typographic variant | 1 456 |
| prefix | 1 249 |
| pron | 660 |
| suffix | 635 |
| prep | 539 |
| conj | 282 |
| onomatopoeia | 268 |
| symbol | 196 |

## 3. Croisement Lexique × Wiktionnaire

- Entrées du Wiktionnaire correspondant à un lemme de Lexique : **57 331** (+ 1 943 écartées car ce sont de simples formes fléchies)
- Couples (mot, nature) distincts trouvés dans les deux sources : **53 294** sur 64 598 lemmes de Lexique (82.5 %)
- Dont avec au moins une définition utilisable : **52 378** → c'est la taille approximative de la base complète de cartes
- Homographes de même nature (plusieurs entrées pour le même couple) : **3 179**, par exemple : terrier, bande, pratique, beau, bocage, bretelle, ket, étranger, confident, mu, seconde, daille, accordance, kan, coquard

| Nature | Cartes possibles |
|---|---|
| NOM | 34 162 |
| ADJ | 10 655 |
| VER | 5 942 |
| ADV | 1 619 |

| Intitulé de nature dans le Wiktionnaire (`pos_title`) | Entrées |
|---|---|
| Nom commun | 32 269 |
| Adjectif | 10 583 |
| Verbe | 5 650 |
| Nom commun 2 | 2 697 |
| Nom commun 1 | 2 690 |
| Adverbe | 1 620 |
| Nom commun 3 | 582 |
| Verbe 1 | 315 |
| Verbe 2 | 314 |
| Adjectif 1 | 155 |
| Nom commun 4 | 154 |
| Adjectif 2 | 152 |

### Lemmes de Lexique absents du Wiktionnaire (11 304)

| Nature | Absents |
|---|---|
| NOM | 9 745 |
| ADJ | 1 293 |
| ADV | 243 |
| VER | 23 |

Exemples : briens (NOM, fréq. 0.003) · saoudien (NOM, fréq. 0.598) · footballer (NOM, fréq. 0.047) · raurais (NOM, fréq. 0.013) · bêbête (NOM, fréq. 0.041) · soixante-seizième (ADJ, fréq. 0.003) · ex-leader (NOM, fréq. 0.016) · portefolios (NOM, fréq. 0.006) · soûlard (ADJ, fréq. 0.063) · maquiladoras (NOM, fréq. 0.009) · moonwalks (NOM, fréq. 0.003) · monoculturelles (NOM, fréq. 0.003) · révèlerons (NOM, fréq. 0.022) · orgasmer (NOM, fréq. 0.009) · hotdogs (NOM, fréq. 0.168) · accoté (NOM, fréq. 0.003) · tondo (ADV, fréq. 0.016) · bébelles (NOM, fréq. 0.028) · râcle (NOM, fréq. 0.047) · connaitraient (NOM, fréq. 0.028) · dysleptique (ADJ, fréq. 0.003) · biomécanisme (NOM, fréq. 0.003) · électrodéposition (NOM, fréq. 0.003) · nl (NOM, fréq. 0.038) · post-industrielle (ADJ, fréq. 0.013) · cèderez (NOM, fréq. 0.019) · hotspots (NOM, fréq. 0.006) · bourlets (NOM, fréq. 0.006) · sénégalais (NOM, fréq. 0.038) · orcs (NOM, fréq. 0.196) · abreuvé (ADJ, fréq. 0.013) · ibo (ADJ, fréq. 0.016) · rétroplacentaire (NOM, fréq. 0.006) · behavioriste (NOM, fréq. 0.006) · bouillote (NOM, fréq. 0.019) · redépart (NOM, fréq. 0.006) · jocko (ADJ, fréq. 0.123) · golfait (NOM, fréq. 0.013) · orishas (NOM, fréq. 0.022) · détesté (ADJ, fréq. 0.62)

## 4. Champs réellement disponibles

| Champ d'une entrée | Présent dans | Part |
|---|---|---|
| `categories` | 57 331 | 100.0 % |
| `lang` | 57 331 | 100.0 % |
| `lang_code` | 57 331 | 100.0 % |
| `pos` | 57 331 | 100.0 % |
| `pos_title` | 57 331 | 100.0 % |
| `senses` | 57 331 | 100.0 % |
| `word` | 57 331 | 100.0 % |
| `sounds` | 56 802 | 99.1 % |
| `forms` | 52 601 | 91.7 % |
| `etymology_texts` | 52 280 | 91.2 % |
| `tags` | 50 323 | 87.8 % |
| `translations` | 44 351 | 77.4 % |
| `anagrams` | 28 254 | 49.3 % |
| `derived` | 22 460 | 39.2 % |
| `attestations` | 17 769 | 31.0 % |
| `synonyms` | 16 575 | 28.9 % |
| `related` | 13 994 | 24.4 % |
| `raw_tags` | 7 936 | 13.8 % |
| `antonyms` | 4 614 | 8.0 % |
| `notes` | 3 052 | 5.3 % |
| `hypernyms` | 2 907 | 5.1 % |
| `hyponyms` | 2 331 | 4.1 % |
| `paronyms` | 1 460 | 2.5 % |
| `proverbs` | 1 386 | 2.4 % |
| `abbreviations` | 569 | 1.0 % |
| `etymology_examples` | 530 | 0.9 % |
| `meronyms` | 439 | 0.8 % |
| `holonyms` | 367 | 0.6 % |
| `descendants` | 281 | 0.5 % |
| `troponyms` | 24 | 0.0 % |

| Champ d'un sens | Présent dans | Part |
|---|---|---|
| `glosses` | 132 428 | 100.0 % |
| `categories` | 124 715 | 94.2 % |
| `examples` | 108 895 | 82.2 % |
| `tags` | 40 195 | 30.4 % |
| `topics` | 39 468 | 29.8 % |
| `raw_tags` | 16 950 | 12.8 % |
| `alt_of` | 1 162 | 0.9 % |
| `note` | 928 | 0.7 % |
| `attestations` | 107 | 0.1 % |

Sens au total : 132 437, dont 1 171 simples renvois (« Pluriel de… », « Variante de… ») écartés.

Exemples du champ `attestations` :

- accueil : [{"date":"XIIᵉ siècle"}]
- encyclopédie : [{"date":"1532"}]
- manga : [{"date":"XXᵉ siècle"}]
- siège : [{"date":"XIᵉ siècle"}]

## 5. Étiquettes (registre, domaine)

| Étiquette de sens (`tags`) | Sens |
|---|---|
| figuratively | 7 745 |
| broadly | 6 264 |
| familiar | 4 693 |
| dated | 3 914 |
| especially | 3 527 |
| obsolete | 1 941 |
| slang | 1 938 |
| analogy | 1 753 |
| pronominal | 1 567 |
| pejorative | 1 332 |
| Anglicism | 1 265 |
| alt-of | 1 162 |
| metonymically | 1 025 |
| colloquial | 915 |
| rare | 888 |
| physical | 695 |
| ellipsis | 690 |
| intransitive | 686 |
| transitive | 575 |
| plural | 552 |
| vulgar | 403 |
| Ancient | 394 |
| literary | 332 |
| uncountable | 260 |
| hyperbole | 215 |
| ironic | 209 |
| offensive | 207 |
| common | 170 |
| singular | 165 |
| literally | 160 |
| poetic | 138 |
| collective | 134 |
| formal | 134 |
| archaic | 125 |
| rhetoric | 99 |
| neologism | 98 |
| generically | 76 |
| specifically | 72 |
| euphemism | 67 |
| childish | 62 |
| impersonal | 53 |
| Biblical | 47 |
| Ancient-Roman | 43 |
| Judaism | 40 |
| Middle-Ages | 37 |

| Étiquette de sens non normalisée (`raw_tags`) | Sens |
|---|---|
| Québec | 900 |
| Canada | 635 |
| France | 496 |
| Didactique | 450 |
| Absolument | 396 |
| Belgique | 364 |
| Économie | 334 |
| Suisse | 284 |
| Imprimerie | 244 |
| Industrie | 232 |
| Nosologie | 217 |
| Peinture | 213 |
| Justice | 205 |
| Régionalisme | 204 |
| Armement | 203 |
| Élevage | 200 |
| Administration | 170 |
| Métier | 169 |
| Internet | 168 |
| Cartes à jouer | 166 |
| Audiovisuel | 159 |
| Viticulture | 155 |
| Jardinage | 150 |
| Pharmacie | 134 |
| Navigation | 127 |
| Plus courant | 126 |
| Plus rare | 121 |
| Génétique | 113 |
| Sports hippiques | 110 |
| Au masculin | 109 |
| Médecine vétérinaire | 106 |
| Lorraine | 104 |
| Boucherie | 99 |
| Optique | 98 |
| Par plaisanterie | 95 |
| Industrie minière | 91 |
| Fantastique | 90 |
| Hippologie | 82 |
| Pâtisserie | 80 |
| Travail | 80 |
| Funéraire | 78 |
| Horlogerie | 75 |
| Provence | 73 |
| Manège | 70 |
| Cosmétologie | 68 |

| Domaine (`topics`) | Sens |
|---|---|
| medicine | 2 490 |
| botany | 1 882 |
| music | 1 356 |
| nautical | 1 345 |
| chemistry | 1 263 |
| religion | 1 209 |
| military | 1 171 |
| law | 1 149 |
| history | 1 079 |
| anatomy | 1 012 |
| cuisine | 1 010 |
| linguistic | 828 |
| computing | 820 |
| architecture | 756 |
| zoology | 734 |
| heraldry | 697 |
| mathematics | 650 |
| technical | 639 |
| politics | 622 |
| agriculture | 621 |
| sports | 619 |
| art | 604 |
| geography | 553 |
| biology | 544 |
| ornithology | 495 |

| Étiquette d'entrée | Entrées |
|---|---|
| masculine | 29 956 |
| feminine | 19 855 |
| 1ᵉʳ groupe (brut) | 5 623 |
| transitive | 5 133 |
| intransitive | 1 507 |
| singular | 1 036 |
| invariable | 989 |
| orthographe traditionnelle (brut) | 726 |
| pronominal | 699 |
| plural | 678 |
| orthographe rectifiée de 1990 (brut) | 479 |
| singular-only | 377 |
| 3ᵉ groupe (brut) | 369 |
| 2ᵉ groupe (brut) | 285 |
| Anglicism | 124 |
| uncountable | 69 |
| Illustration souhaitable (voir le fonctionnement, l’aide, la liste) (brut) | 56 |
| indirect | 48 |
| transitif direct (brut) | 34 |
| plural-only | 31 |

## 6. Définitions

| Nombre de sens | Mots | Part |
|---|---|---|
| 0 | 916 | 1.7 % |
| 1 | 24 636 | 46.2 % |
| 2 | 11 553 | 21.7 % |
| 3 | 6 209 | 11.7 % |
| 4 à 5 | 5 522 | 10.4 % |
| 6 à 9 | 3 167 | 5.9 % |
| 10 et plus | 1 291 | 2.4 % |

| Longueur de la première définition | Mots | Part |
|---|---|---|
| moins de 30 caractères | 14 470 | 27.6 % |
| 30 à 80 | 23 736 | 45.3 % |
| 81 à 200 | 12 670 | 24.2 % |
| plus de 200 | 1 502 | 2.9 % |

Première définition qui contient le mot lui-même ou sa racine (inutilisable telle quelle en duel) : **11 740** (22.4 %)

Mots avec au moins un synonyme : 16 226 (31.0 %) · avec au moins un dérivé : 21 833 (41.7 %)

## 7. Étymologie et factions (premier essai)

- Entrées avec une étymologie rédigée : **52 052** (90.8 %)
- Dont commençant par une parenthèse (date, siècle) : **1 301** (2.5 %)

| Deux premiers mots de l'étymologie (hors parenthèses) | Entrées |
|---|---|
| dérivé de | 11 311 |
| du latin | 9 373 |
| composé de | 1 767 |
| de l’anglais | 1 710 |
| motdérivé de | 1 323 |
| → voir | 1 265 |
| de l’ancien | 1 232 |
| du grec | 1 133 |
| de l’italien | 671 |
| dénominal de | 625 |
| déverbal de | 548 |
| du participe | 539 |
| du moyen | 507 |
| dérivé du | 491 |
| apocope de | 432 |
| emprunté au | 405 |
| de l’espagnol | 380 |
| participe passé | 379 |
| du verbe | 347 |
| du nom | 320 |
| participe présent | 281 |
| emprunté à | 276 |
| composé du | 261 |
| de l’allemand | 235 |
| de l’occitan | 225 |
| de l’arabe | 218 |
| du bas | 209 |
| mot composé | 185 |
| en ancien | 181 |
| de l'anglais | 163 |
| du japonais | 156 |
| de « | 130 |
| emprunt à | 121 |
| adjectivation du | 119 |
| du préfixe | 114 |
| emprunt de | 114 |
| de l'ancien | 105 |
| verbedérivé de | 104 |
| variante de | 101 |
| du portugais | 99 |

### Répartition par faction, sans héritage

| Faction devinée | Mots | Part |
|---|---|---|
| Formation française (dérivé, composé…) | 23 320 | 44.5 % |
| Latin | 12 075 | 23.1 % |
| (aucune étymologie) | 3 795 | 7.2 % |
| (non reconnue) | 3 525 | 6.7 % |
| Anglais | 2 717 | 5.2 % |
| Grec | 1 587 | 3.0 % |
| Ancien français (sans origine plus lointaine) | 1 055 | 2.0 % |
| Italien | 955 | 1.8 % |
| Espagnol | 502 | 1.0 % |
| Occitan / provençal | 462 | 0.9 % |
| Allemand | 457 | 0.9 % |
| Germanique / francique | 363 | 0.7 % |
| Arabe | 315 | 0.6 % |
| Japonais / chinois | 222 | 0.4 % |
| Néerlandais | 174 | 0.3 % |
| Russe / slave | 151 | 0.3 % |
| Onomatopée | 137 | 0.3 % |
| Inde (sanskrit, hindi…) | 135 | 0.3 % |
| Gaulois / celtique | 123 | 0.2 % |
| Turc / persan | 114 | 0.2 % |
| Portugais | 113 | 0.2 % |
| Langues d'Amérique | 43 | 0.1 % |
| Hébreu | 38 | 0.1 % |

### Répartition par faction, avec héritage par la « base » de Lexique (14 673 mots reclassés)

| Faction | Mots | Part |
|---|---|---|
| Latin | 23 610 | 45.1 % |
| Formation française (dérivé, composé…) | 11 229 | 21.4 % |
| Anglais | 2 971 | 5.7 % |
| (aucune étymologie) | 2 522 | 4.8 % |
| (non reconnue) | 2 216 | 4.2 % |
| Grec | 1 877 | 3.6 % |
| Ancien français (sans origine plus lointaine) | 1 719 | 3.3 % |
| Italien | 1 361 | 2.6 % |
| Germanique / francique | 1 017 | 1.9 % |
| Occitan / provençal | 618 | 1.2 % |
| Espagnol | 596 | 1.1 % |
| Allemand | 571 | 1.1 % |
| Arabe | 376 | 0.7 % |
| Néerlandais | 309 | 0.6 % |
| Onomatopée | 281 | 0.5 % |
| Japonais / chinois | 234 | 0.4 % |
| Gaulois / celtique | 214 | 0.4 % |
| Russe / slave | 156 | 0.3 % |
| Turc / persan | 148 | 0.3 % |
| Inde (sanskrit, hindi…) | 138 | 0.3 % |
| Portugais | 129 | 0.2 % |
| Langues d'Amérique | 45 | 0.1 % |
| Hébreu | 41 | 0.1 % |

Exemples d'étymologies non reconnues :

- **renommer** : De re- et nommer
- **ionosphère** : De ionisation et -sphère.
- **teint** : De teindre.
- **flemmer** : De flemme.
- **foufoune** : De fouine, par analogie avec la fourrure.
- **hémodialyse** : De hémo- et dialyse.
- **romanche** : Du romanche rumantsch.
- **éblouissement** : Du verbe éblouir.
- **buna** : Des premières syllabes de butadiène et de natrium.
- **tampe** : Même radical que tampon.
- **inuit** : De l’inuktitut ᐃᓄᐃᑦ, inuit (« êtres humains »).
- **morave** : Voyez Morave.
- **louanger** : De louange.
- **doublonner** : De doublon.
- **mohawk** : Viendrait du terme Mohowawogs, qui signifierait « ils mangent des choses vivantes » dans une langue algonquienne de Nouvelle-Angleterre — terme faisant probable
- **sima** : Des deux premières lettres des noms des deux éléments chimiques silicium et magnésium.
- **maigrelet** : De maigre et -elet
- **radical-socialiste** : De radical et socialiste.
- **fruitier** : Apparaît avec le sens de « personne qui prend soin des fruits (pour son seigneur) ». L’adjectif date de 1519. De fruit et -ier.
- **beefalo** : De beef, pour «bovin» et buffalo, «bison d'Amérique».
- **bitumer** : De bitume.
- **hitchcockien** : Du nom de famille du cinéaste Alfred Hitchcock.
- **mariné** : De mariner.
- **vamper** : De vamp.
- **retailler** : De re- et tailler.

## 8. Aperçu de la rareté

Les fréquences les plus basses, et le nombre de mots ex æquo à chacune :

| Fréquence (par million) | Mots ex æquo | Part de la base |
|---|---|---|
| 0.003 | 5 295 | 10.1 % |
| 0.006 | 3 216 | 6.1 % |
| 0.009 | 2 090 | 4.0 % |
| 0.012 | 1 | 0.0 % |
| 0.013 | 1 737 | 3.3 % |

### Option A — fréquence seule : 25 mots au hasard parmi les 3 % les plus rares (1 571 mots)

- **cintrage** (NOM, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Opération qui consiste à donner à des pièces de bois, de fer, etc., la forme d’un cintre.
- **arpon** (NOM, (aucune étymologie), fréquence 0.003, prévalence inconnue) — Large et longue scie fort en usage dans les chantiers.
- **chaconne** (NOM, (aucune étymologie), fréquence 0.003, connu de 11 %) — Ancien air de danse ^([1]) ^([2]).
- **courtaille** (NOM, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Épingle mal façonnée, dont la fabrication est imparfaite.
- **aphonie** (NOM, Grec, fréquence 0.003, connu de 79 %) — Perte plus ou moins complète de la voix.
- **clochardisation** (NOM, Formation française (dérivé, composé…), fréquence 0.003, connu de 86 %) — Paupérisation au point de devenir clochard.
- **bourrine** (NOM, Germanique / francique, fréquence 0.003, prévalence inconnue) — Maison traditionnelle typique du marais breton-vendéen bâtie en terre et dont la couverte en roseaux se nom…
- **chiffrier** (NOM, (non reconnue), fréquence 0.003, prévalence inconnue) — Registre de comptabilité.
- **antidreyfusisme** (NOM, Formation française (dérivé, composé…), fréquence 0.003, connu de 61 %) — Activisme des antidreyfusards
- **avaliseur** (NOM, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Celui qui donne son aval.
- **découlement** (NOM, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Action de découler.
- **bullaire** (NOM, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Recueil de plusieurs bulles des papes.
- **cavum** (NOM, Latin, fréquence 0.003, prévalence inconnue) — Cavité, fosse, espace, poche, logette.
- **albuminurie** (NOM, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Maladie dans laquelle on émet des urines qui contiennent de l’albumine.
- **asphyxique** (ADJ, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Relatif ou propre à l’asphyxie.
- **cyrène** (NOM, Latin, fréquence 0.003, prévalence inconnue) — Nom donné à deux genres importants de mollusques d’eau douce (Corbicula et Polymesoda) que l’on rencontre e…
- **cynips** (NOM, (aucune étymologie), fréquence 0.003, prévalence inconnue) — Insecte hyménoptère appartenant à divers genres de la famille des cynipidés et dont les piqûres dans les vé…
- **cicatrisant** (NOM, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Remède propre à cicatriser les plaies.
- **datable** (ADJ, Formation française (dérivé, composé…), fréquence 0.003, connu de 77 %) — Que l'on peut dater.
- **cosmographe** (NOM, Latin, fréquence 0.003, prévalence inconnue) — Celui qui s’occupe de cosmographie.
- **choisisseur** (NOM, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Personne qui choisit, qui élit.
- **contextuellement** (ADV, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — De façon contextuelle.
- **bimétallique** (ADJ, Formation française (dérivé, composé…), fréquence 0.003, prévalence inconnue) — Qui a rapport au bimétallisme → voir bimétalliste.
- **antibois** (NOM, Grec, fréquence 0.003, prévalence inconnue) — Tringle mise sur le parquet d’une chambre, le long du mur, afin d’empêcher le frottement des meubles contre…
- **destinateur** (NOM, Latin, fréquence 0.003, prévalence inconnue) — Participant d’un acte de communication qui émet un message destiné à un destinataire.

### Option B — fréquence + prévalence, sur les 32 894 mots dont la prévalence est mesurée : 25 mots au hasard parmi les 3 % les plus rares (987 mots)

- **cachexie** (NOM, Latin, fréquence 0.013, connu de 5 %) — Grave affaiblissement de l’organisme (avec notamment une perte de poids et une atrophie musculaire), lié à …
- **cuistrerie** (NOM, Formation française (dérivé, composé…), fréquence 0.003, connu de 40 %) — Propos, manières, théorie de cuistre.
- **tabellion** (NOM, Latin, fréquence 0.003, connu de 10 %) — Officier public qui, dans les juridictions subalternes et seigneuriales, faisait fonction de notaire.
- **lurex** (NOM, Anglais, fréquence 0.006, connu de 11 %) — Fil textile recouvert de polyester et à l’aspect métallique.
- **térébrant** (ADJ, Latin, fréquence 0.003, connu de 4 %) — Perçant ; cri très aigu
- **grandet** (ADJ, Formation française (dérivé, composé…), fréquence 0.009, connu de 19 %) — ou (En parlant des personnes.) Déjà un peu grand ; grand pour son âge ; grandelet.
- **guaracha** (NOM, Espagnol, fréquence 0.009, connu de 15 %) — Musique cubaine apparue au XVII^(ème) siècle qui est une forme de chanson d’actualité satirique et burlesque.
- **remploi** (NOM, (aucune étymologie), fréquence 0.003, connu de 36 %) — Remplacement, nouvel emploi obligatoire des fonds provenant des valeurs spécifiées d’un contrat ou d’un hér…
- **scrofuleux** (ADJ, Formation française (dérivé, composé…), fréquence 0.013, connu de 11 %) — Qui a rapport à la scrofule, qui tient de la scrofule.
- **valétudinaire** (ADJ, Latin, fréquence 0.003, connu de 41 %) — Qui est maladif, qui est souvent malade.
- **ondatra** (NOM, (non reconnue), fréquence 0.006, connu de 0 %) — Rat musqué.
- **pendeur** (NOM, Formation française (dérivé, composé…), fréquence 0.003, connu de 14 %) — Celui qui pend.
- **blocaille** (NOM, (non reconnue), fréquence 0.006, connu de 0 %) — Matériau formé de débris de briques et de moellons, de petites pierres.
- **bourdillon** (NOM, Formation française (dérivé, composé…), fréquence 0.003, connu de 8 %) — Merrain.
- **jaculatoire** (ADJ, Latin, fréquence 0.006, connu de 20 %) — Marqué par un jaillissement intérieur intense, exalté, lyrique.
- **quattrocento** (NOM, Italien, fréquence 0.009, connu de 20 %) — Art du quinzième siècle italien.
- **hautesse** (NOM, Formation française (dérivé, composé…), fréquence 0.003, connu de 22 %) — Titre qu’on donnait au sultan.
- **téléologique** (ADJ, Formation française (dérivé, composé…), fréquence 0.003, connu de 9 %) — Se dit d'une démarche d'étude d'un phénomène qui se fait à la lumière d'un résultat connu d'avance.
- **pharmacognosie** (NOM, Grec, fréquence 0.003, connu de 14 %) — Science étudiant les substances naturelles d’origine végétale, animale, fongique ou minérale, utilisées ou …
- **tchékiste** (NOM, Formation française (dérivé, composé…), fréquence 0.009, connu de 20 %) — Membre de la Tchéka.
- **lymphatisme** (NOM, (aucune étymologie), fréquence 0.003, connu de 44 %) — Tempérament lymphatique.
- **épitomé** (NOM, Latin, fréquence 0.013, connu de 15 %) — Abrégé d’un livre, et particulièrement d’une histoire.
- **pharisaïsme** (NOM, Formation française (dérivé, composé…), fréquence 0.006, connu de 25 %) — Doctrine, attitude des pharisiens, qui consiste à surveiller uniquement le respect de la loi (les actes), s…
- **menhaden** (NOM, Anglais, fréquence 0.006, connu de 4 %) — Hareng vivant en bancs des côtes atlantiques de l’Amérique du Nord, objet d’une pêche industrielle intensive.
- **catachrèse** (NOM, Latin, fréquence 0.003, connu de 9 %) — Figure de style qui consiste à détourner un mot de son sens propre en étendant sa signification : le pied d…

### Pour comparer : 15 mots au hasard dans la moitié la plus fréquente (futures Communes)

- **désapprobateur** (ADJ, Formation française (dérivé, composé…), fréquence 0.158, connu de 87 %) — Qui désapprouve.
- **hostilité** (NOM, Latin, fréquence 3.184, connu de 100 %) — Acte d’un ennemi ou état de guerre.
- **ficher** (VER, Latin, fréquence 99.035, connu de 95 %) — Faire entrer par la pointe.
- **tweed** (NOM, Anglais, fréquence 0.44, connu de 76 %) — Tissu de laine, généralement de deux couleurs, originaire d’Écosse.
- **manifester** (VER, Latin, fréquence 8.642, connu de 100 %) — Rendre manifeste.
- **nationaliste** (NOM, Formation française (dérivé, composé…), fréquence 0.541, connu de 100 %) — Personne qui professe le nationalisme.
- **méritoire** (ADJ, Latin, fréquence 0.149, connu de 80 %) — Qui mérite l’approbation, l’estime.
- **robuste** (ADJ, Latin, fréquence 2.81, connu de 100 %) — Qui est fort, vigoureux, résistant.
- **subtiliser** (VER, Latin, fréquence 0.566, connu de 88 %) — Rendre subtil, volatiliser.
- **pistolet** (NOM, Allemand, fréquence 33.386, connu de 100 %) — Arme à feu courte et portative.
- **hermétiquement** (ADV, Formation française (dérivé, composé…), fréquence 0.351, prévalence inconnue) — D’une manière hermétique, en parlant de ce qui est bouché, de ce qui est fermé, étanche.
- **apeuré** (ADJ, (aucune étymologie), fréquence 1.297, connu de 94 %) — Qui est pris de peur.
- **chicorée** (NOM, Latin, fréquence 0.237, connu de 94 %) — Plante de la famille botanique des Astéracées et du genre Cichorium dont les fleurs ligulées sont bleues.
- **délasser** (VER, Formation française (dérivé, composé…), fréquence 0.25, connu de 86 %) — Délivrer de la lassitude, reposer.
- **au-dedans** (ADV, Formation française (dérivé, composé…), fréquence 0.127, prévalence inconnue) — À l’intérieur d’un lieu.

### Combien de gens connaissent les mots (prévalence)

| Connu de… | Mots | Part |
|---|---|---|
| 100 % | 9 878 | 30.0 % |
| 90 à 99 % | 9 410 | 28.6 % |
| 75 à 89 % | 6 078 | 18.5 % |
| 50 à 74 % | 3 891 | 11.8 % |
| 25 à 49 % | 2 126 | 6.5 % |
| moins de 25 % | 1 511 | 4.6 % |

