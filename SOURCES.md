# Sources de données

Les cartes du jeu sont fabriquées à partir de deux bases de données ouvertes. Ce fichier note d'où elles viennent, sous quelle licence, et ce que ces licences nous obligent à faire.

Les fichiers eux-mêmes ne sont pas dans Git (ils sont trop gros). La commande `npm run sources` les télécharge dans `data/brut/` et écrit dans `data/brut/sources.json` l'adresse, la date, la taille et l'empreinte de chaque fichier.

## 1. Wiktionnaire français (définitions, étymologies, étiquettes)

| | |
|---|---|
| Ce que c'est | Le contenu du Wiktionnaire francophone, transformé en données lisibles par un programme par le projet **wiktextract** |
| Page | https://kaikki.org/frwiktionary/rawdata.html |
| Fichier | `raw-wiktextract-data.jsonl.gz` — 685 Mo (6,3 Go une fois décompressé) |
| Version utilisée | Extraction du 18 septembre 2026, à partir de la sauvegarde du Wiktionnaire du 1er septembre 2026 |
| Contenu | 7,5 millions d'entrées dans toutes les langues, dont 2,1 millions en français |
| Licence | **CC BY-SA 4.0** (Creative Commons Attribution – Partage dans les mêmes conditions), avec la GFDL en alternative. Vérifié le 21/09/2026 sur https://fr.wiktionary.org/wiki/Wiktionnaire:Copyright |

Le fichier « français seulement » proposé par kaikki.org est annoncé comme obsolète et voué à disparaître : on utilise le fichier complet et on ne garde que les entrées françaises.

**Crédit à afficher :** « Définitions et étymologies adaptées du Wiktionnaire (fr.wiktionary.org), licence CC BY-SA 4.0 », avec sur chaque fiche un lien vers la page du mot (c'est là que se trouve la liste des auteurs, exigée par la licence).

**Crédit de courtoisie pour l'outil d'extraction :** Tatu Ylonen, *Wiktextract: Wiktionary as Machine-Readable Structured Data*, Proceedings of the 13th Conference on Language Resources and Evaluation (LREC), p. 1317-1325, Marseille, 2022.

## 2. Lexique 4 (fréquence des mots, mots connus ou non)

| | |
|---|---|
| Ce que c'est | Base de données scientifique sur 190 000 formes de mots français : fréquence dans 316 millions de mots de sous-titres, lemme, nature grammaticale, structure du mot, et **prévalence** (part des gens qui connaissent le mot) |
| Page | http://www.lexique.org |
| Fichier | `Lexique400.zip` — 49 Mo, dont on extrait `Lexique4.tsv` (33 Mo) |
| Version utilisée | Lexique 4.00, fichier daté du 20 mai 2026 |
| Licence | **CC BY-SA 4.0** (indiqué sur lexique.org et dans le fichier README de l'archive) |

**Citation demandée par les auteurs :** New, B., Pallier, C., Schalchli, G., Bourgin, J., & Gimenes, M. (2026). Lexique 4: A major upgrade of the "Lexique" French lexical database. *Behavior Research Methods*, 58(5), 140.

## 3. Ce que ces licences impliquent pour le jeu

- **Créditer** les deux sources, de façon visible : sur chaque fiche carte (Wiktionnaire) et sur une page Crédits complète (les deux).
- **Signaler que les textes sont adaptés** (définitions raccourcies et nettoyées).
- **Partager dans les mêmes conditions** : les fichiers de cartes que nous générons à partir de ces données restent sous licence CC BY-SA 4.0. Cela ne concerne que les données : le code du jeu, son interface, ses graphismes, son nom et ses règles restent la propriété du projet.
