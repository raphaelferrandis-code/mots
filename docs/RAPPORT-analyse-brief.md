# Rapport d'analyse — Brief « MOTS »

*Analyse du brief du jeu de cartes à collectionner des mots de la langue française.*
*Date : 21 septembre 2026 — la version améliorée se trouve dans `BRIEF-v2.md`.*

---

## 1. Verdict en bref

**Le concept est excellent et le brief est solide.** L'idée centrale (rareté de la carte = rareté réelle du mot, tout généré depuis des données ouvertes) est élégante, peu coûteuse à produire, et le plaisir visé est bien identifié. Le périmètre V1 est raisonnable, l'architecture pense déjà au multijoueur, et le fichier d'équilibrage unique est une très bonne idée pour un directeur de projet non développeur.

En revanche, l'analyse fait ressortir **5 problèmes sérieux** qui, laissés tels quels, abîmeraient le jeu, plus une série de trous et d'ambiguïtés. Aucun ne remet en cause le concept : ils se corrigent tous sur le papier, avant d'écrire une ligne de code.

| # | Problème | Gravité | Corrigé dans le brief v2 |
|---|---|---|---|
| 1 | Le duel ne laisse aucun choix au joueur | 🔴 Critique | Oui (§5.4 réécrit) |
| 2 | ~40 000 cartes : collection impossible à finir, économie morte, fichier trop lourd | 🔴 Critique | Oui (« Édition 1 » de ~3 000 cartes) |
| 3 | Mauvaise colonne de fréquence : les verbes seraient tous faussement « rares » | 🔴 Critique (bug de données) | Oui (§4.3) |
| 4 | Les Légendaires seraient nulles au combat (défense toujours à 1) | 🟠 Important | Oui (§4.3 + risque/récompense) |
| 5 | Factions très déséquilibrées et détection d'étymologie fragile | 🟠 Important | Oui (§4.3) |

---

## 2. Ce qui est réussi (à conserver tel quel)

- **La vision** : claire, en une phrase, avec un exemple qui donne envie (« j'ai eu *callipyge* en légendaire ! »).
- **Zéro contenu fait main** : le jeu peut exister sans équipe de création.
- **Le découpage V1 / hors V1** et la **couche de service unique** qui prépare le backend.
- **`equilibrage.ts`** : tous les chiffres au même endroit, commentés en français.
- **Le rapport de génération** avec exemples aléatoires pour valider « à l'oreille ».
- **Le plan par phases avec critères de validation** concrets.
- **Les consignes de travail** (petites étapes, validation avant choix structurants, options plutôt que décisions unilatérales).
- **Le réflexe légal** (licences, crédits, liste d'exclusion modifiable).

---

## 3. Les 5 problèmes majeurs

### 3.1 🔴 Le duel ne laisse aucun choix au joueur

Dans le brief, c'est **le jeu** qui choisit quelle carte sera jouée (il affiche la définition d'une carte de la main, le joueur doit la retrouver). Conséquences :

- Le **triangle des types** et le **bonus de faction** deviennent du pur hasard : le joueur ne peut pas les exploiter puisqu'il ne choisit pas sa carte.
- Retrouver un mot parmi **3 cartes de son propre deck** est trivial (souvent la nature grammaticale suffit : une définition qui commence par « Qui… » désigne l'adjectif).
- Construire un deck n'a presque plus d'intérêt.

**Correction proposée : inverser le tour.** Le joueur **choisit** la carte qu'il joue (stratégie), puis doit **prouver qu'il maîtrise le mot** : le jeu affiche 4 définitions (la bonne + 3 leurres de même nature grammaticale), 15 secondes pour trouver. Réussite → la carte attaque. Échec → pas d'attaque, et la bonne définition est montrée (c'est là qu'on apprend).

Effet bonus très intéressant : **les mots rares sont puissants mais difficiles à maîtriser**. Jouer une Légendaire devient un pari risque/récompense, ce qui équilibre naturellement le jeu sans ajouter de règle.

Autres trous du duel comblés dans la v2 : la notion de « carte adverse en jeu » n'était pas définie (que se passe-t-il au premier tour ?), rien n'était prévu quand le deck de 10 cartes est épuisé, ni d'où vient le deck de l'IA, ni qui commence.

### 3.2 🔴 Trop de cartes : ~40 000

Le croisement Lexique × Wiktionnaire donnera environ **35 000 à 45 000 cartes**. Avec 5 cartes par jour :

- **Collection infinissable** : ~1 800 cartes par an, soit plus de 20 ans pour tout avoir. Le compteur « Mots venus du latin : 34 / 18 000 » est décourageant, pas motivant.
- **Économie morte** : avec autant de cartes, on n'obtient quasiment jamais de doublon, donc jamais d'Encre, donc jamais de paquet bonus.
- **Poids** : un `cards.json` complet pèserait 15 à 30 Mo — inacceptable sur mobile.
- **Qualité** : les 3 % de mots les plus rares de Lexique ne sont pas tous des *callipyge*. Beaucoup sont ternes (dérivés techniques, adverbes en *-ment* obscurs). Rare ≠ désirable.

**Correction proposée : fonctionner par éditions, comme les vrais TCG.** Le pipeline génère la base complète, mais le jeu sort une **« Édition 1 » d'environ 3 000 cartes** sélectionnées par un score de qualité (étymologie reconnue, bonne définition, mots « savoureux » favorisés parmi les rares) + une liste de **coups de cœur** que Raphaël peut imposer. Les éditions suivantes deviennent du contenu futur tout trouvé (« Extension : mots venus d'ailleurs »…). Le fichier léger tient alors en ~1 Mo.

### 3.3 🔴 Bug de données : mauvaise colonne de fréquence

Le brief utilise `freqfilms2` / `freqlivres`, qui mesurent la fréquence d'**une forme précise**. Or pour un verbe, on ne garde que l'infinitif : « être » à l'infinitif est bien moins fréquent que « est », « suis », « était »… Résultat : **tous les verbes paraîtraient artificiellement rares**.

**Correction :** utiliser les colonnes de fréquence **du lemme** (`freqlemfilms2`, `freqlemlivres`), qui additionnent toutes les formes. De plus, la jointure entre les deux sources doit se faire sur le couple **(mot, nature grammaticale)** et pas sur le mot seul, sinon « sourire » nom et « sourire » verbe se mélangent.

Autre détail : beaucoup de mots rares ont exactement la même fréquence. Il faut une règle de départage **déterministe**, sinon la rareté d'un mot peut changer d'une génération à l'autre.

### 3.4 🟠 Les Légendaires seraient faibles au combat

Défense = nombre de sens. Or **un mot rare a presque toujours un seul sens** (défense 1), tandis que « prendre » ou « passer » en ont des dizaines (défense 10). Plus de la moitié de la base aurait une défense de 1, et quasiment toutes les Légendaires. Ouvrir une Légendaire injouable, c'est frustrant.

**Correction proposée :** défense = « richesse » du mot, calculée sur plusieurs signaux (sens + synonymes + mots dérivés) et ramenée sur 1–10 par percentile, **plus** un petit bonus de stats par rareté réglable dans `equilibrage.ts`. Et le rapport de génération affiche la moyenne attaque/défense par rareté pour que tu puisses juger. Note : les cartes communes « tanks » et les rares « canons de verre », c'est défendable comme parti pris — mais ça doit être un choix, pas un accident.

Dans le même esprit, l'attaque « Scrabble » favorise mécaniquement les mots **longs**. C'est acceptable (et même logique), mais à savoir.

### 3.5 🟠 Factions déséquilibrées, détection fragile

- Le latin représentera probablement **plus de la moitié** des mots à étymologie connue. Le bonus de faction sera quasi automatique en deck latin, quasi impossible ailleurs.
- La faction fourre-tout « Origine française / inconnue » sera **énorme**, car d'innombrables étymologies du Wiktionnaire disent simplement « Dérivé de *danser* avec le suffixe *-eur* ».
- Les étymologies du Wiktionnaire commencent très souvent par une date — « *(XIIe siècle)* Du latin… » — donc chercher le mot-clé « au début du texte » échouera souvent.

**Corrections :** ignorer les parenthèses de date ; pour un mot dérivé, **hériter de la faction du mot d'origine** (*danseur* → *danser* → francique) ; séparer « Formation française » de « Origine inconnue » ; regrouper les toutes petites langues ; rendre le bonus de faction **plus fort pour les petites factions**. Le rapport de génération doit montrer la taille de chaque faction et le pourcentage de mots non classés.

---

## 4. Problèmes secondaires et oublis

### Données
- **Définitions inutilisables en quiz** : « Pluriel de… », « Variante de… », ou définitions qui contiennent le mot lui-même (« *Danse* : action de danser »). À filtrer ou masquer.
- **Étiquettes par sens, pas par mot** : un mot peut avoir 5 sens corrects et 1 sens vulgaire. Il faut retirer le sens, pas forcément le mot.
- **Homographes** (« avocat » le fruit / le juriste : même nature, deux étymologies) : non traité. Proposé : une seule carte en V1, faction de la première étymologie.
- **Mots composés** (« arc-en-ciel ») : non traité. Proposé : garder ceux à trait d'union, exclure ceux avec espace ou apostrophe.
- **Le champ `source` répété sur chaque carte** : gaspillage, à mettre une seule fois dans les métadonnées.
- **Les noms de champs des sources n'ont pas été vérifiés** : le brief v2 demande d'inspecter les vraies données avant de coder, et de figer la date des fichiers téléchargés pour que le pipeline soit reproductible.

### Technique
- **Python + Node = deux installations** pour un non-développeur. Recommandation : tout faire en **TypeScript** (un seul outil, types de cartes partagés entre pipeline et application, un seul système de tests). Python reste possible si tu préfères.
- **Risque de perte de sauvegarde** : sans compte, tout repose sur le stockage du navigateur, que iOS peut effacer après quelques semaines d'inactivité. Il faut demander le stockage persistant **et** proposer un **export / import de sauvegarde**.
- **Version de sauvegarde** : si la base de cartes change, une vieille sauvegarde ne doit pas planter.
- **Hébergement oublié** : pour « s'installer sur téléphone » (critère de la phase 1), l'application doit être en ligne en HTTPS (Cloudflare Pages, Netlify, GitHub Pages : gratuits).
- **Paquet quotidien** : changer l'heure du téléphone permet de tricher (acceptable en solo, mais un garde-fou simple existe). Et rater un jour est punitif → proposer un **stock de 3 paquets maximum**.
- **Emplacement 4 du paquet** : « au moins Peu commune » mais sans probabilités. Complété.
- **Encre infinie** : les victoires en duel donnent de l'Encre sans limite → paquets illimités. Il faut un plafond quotidien.
- **Aucun outil d'équilibrage** : proposé, un **simulateur** qui joue 10 000 duels IA contre IA et indique la durée moyenne d'une partie. Indispensable pour régler les chiffres sans jouer 200 parties à la main.

### Légal
- **« Scrabble » est une marque déposée** (Mattel / Hasbro). Utiliser le barème ne pose pas de souci, mais le mot ne doit apparaître **nulle part dans le jeu** ni dans sa communication. Dire « valeur des lettres ».
- **CC BY-SA est « virale » sur les données** : le fichier de cartes (dérivé du Wiktionnaire et de Lexique, lui aussi sous CC BY-SA) doit être redistribué sous la même licence. Le code, le design et les règles restent à toi. Bonne pratique : lien vers la page Wiktionnaire de chaque mot et mention « définition adaptée ».
- **Paquets aléatoires payants** (futur) : réglementés dans certains pays, et les stores exigent d'afficher les probabilités. Autant **afficher les taux dès la V1**, ça ne coûte rien.
- **Nom du jeu** : à vérifier à l'INPI avant de s'y attacher. Éviter toute proximité avec « WikiMasters ».

### Expérience de jeu
- **Accessibilité** : le chrono de 15 s exclut certains joueurs → option pour l'allonger ou le couper ; option « réduire les animations » ; couper le son.
- **Mémorisation du deck** : après quelques parties, le joueur connaît ses 10 définitions par cœur. C'est le but pédagogique… mais le défi disparaît. Proposé : varier les questions (définition, origine du mot) et ajouter un compteur de **Maîtrise** par carte (badge après 5 réussites) — un second axe de collection qui colle au thème.
- **Partage** : un bouton « partager ma carte » (image) est le meilleur levier viral pour ce concept, et il est peu coûteux. À garder pour la phase 4.

---

## 5. Mes recommandations sur tes questions ouvertes

| Question | Recommandation |
|---|---|
| **Nom** | Le dossier s'appelle déjà « motsdemaitres » : *Mots de Maîtres* fonctionne bien, surtout avec la mécanique de Maîtrise. À vérifier à l'INPI. |
| **Direction artistique** | **Typographique / papier de dictionnaire.** Argument décisif : il est impossible d'illustrer des milliers de cartes. Le héros de la carte, c'est le mot lui-même. Une belle typo, une texture papier, un motif par faction, et c'est tenable. Le pixel art exigerait une illustration par carte. |
| **Mots familiers / argot** | **Oui, les garder**, avec un badge « Familier ». Ce sont souvent les cartes les plus drôles à obtenir. Seuls les mots injurieux ou visant des groupes sont exclus. |
| **Modèle économique** | Ne rien décider maintenant, mais préférer à terme **cosmétiques + éditions** aux paquets payants (moins de contraintes légales, meilleure image pour un jeu culturel). |

---

## 6. Ce qui a changé dans le brief v2

1. **Nouvelle section « Décisions à valider avant de coder »** en tête des questions ouvertes : les 6 choix structurants, chacun avec ma recommandation.
2. **§2** : ajout de l'export/import de sauvegarde et de la mise en ligne dans le périmètre V1.
3. **§3** : pipeline en TypeScript (recommandé), hébergement, sauvegarde versionnée.
4. **§4** entièrement renforcé : bonnes colonnes de fréquence, jointure par (mot, nature), départage déterministe, filtrage des sens, factions par héritage, **Édition 1**, format de sortie en deux fichiers (index léger + détails à la demande).
5. **§5.4 Duel** réécrit : le joueur choisit sa carte, épreuve de maîtrise à 4 définitions, règles complètes (mot en jeu, deck épuisé, deck de l'IA, fin de partie).
6. **§5** : probabilités complètes, stock de paquets, plafond d'Encre, taux affichés, simulateur d'équilibrage.
7. **§7 Légal** : marque Scrabble, portée de la CC BY-SA, affichage des taux.
8. **§8** : phase 0 coupée en deux (exploration des données, puis génération) pour valider tôt ; critères de validation précisés.
9. **§9** : ajout de « vérifier les données réelles avant de coder » et « ne jamais mettre en ligne sans accord ».

---

## 7. Suites données (21 septembre 2026)

Ce rapport reste une photo de l'analyse du brief d'origine. **Pour les décisions, c'est `BRIEF-v2.md` (§10.1) qui fait foi.**

Raphaël a validé les recommandations 1 à 4, et modifié deux points :
- les mots familiers sont conservés, **avec une option dans les Réglages pour les masquer** ;
- les paquets arrivent **toutes les 10 minutes, 10 en stock au maximum** (au lieu d'un par jour), avec pour modèle économique une **accélération payante** : à l'Encre en V1, en argent réel une fois le backend en place.

Conséquences intégrées au brief (version 2.1) : taux de Légendaire proposé à 4 % au lieu de 8 %, simulateur de collection, règle de sécurité de l'économie, horloge remplaçable par un serveur, paragraphe légal renforcé.

Vérification des sources faite le même jour : le fichier du Wiktionnaire pèse 685 Mo (6,3 Go décompressé), et **Lexique 4.00 est sorti en 2026** avec une mesure de « prévalence » (la part des gens qui connaissent le mot), à examiner pendant l'exploration des données.
