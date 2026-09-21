# Brief projet v2 — Jeu de cartes à collectionner des mots de la langue française

*Nom de code : **MOTS** (piste sérieuse pour le nom définitif : « Mots de Maîtres », à vérifier à l'INPI).*
*Version 2.3 du 21 septembre 2026 — intègre les décisions de Raphaël (voir §10.1), les enseignements de l'exploration des données (voir `COMPTE-RENDU-donnees.md`) et ceux de la première fabrication des cartes (voir `data/rapport.md`). Les raisons des changements par rapport à la v1 sont dans `RAPPORT-analyse-brief.md`.*

> **Légende :** 🟡 = proposition par défaut **encore à confirmer par Raphaël** (liste au §10.2). Tout le reste est validé.

---

## 1. Contexte et vision

MOTS est un jeu de cartes à collectionner (TCG) où **chaque carte est un vrai mot de la langue française**. Le principe s'inspire des jeux où chaque carte est un article d'encyclopédie, appliqué ici au dictionnaire.

Tout le contenu est généré à partir de **données ouvertes**. Aucune carte n'est créée à la main :
- **Rareté** = fréquence d'usage réelle du mot. Plus un mot est rare dans la langue, plus la carte est rare.
- **Stats** = propriétés linguistiques du mot (valeur des lettres, richesse du mot).
- **Type** = nature grammaticale.
- **Faction** = origine étymologique (latin, grec, arabe, anglais…).

### Les trois plaisirs recherchés
1. **La surprise** à l'ouverture d'un paquet (« j'ai eu *callipyge* en légendaire ! »).
2. **La collection** par familles étymologiques.
3. **La maîtrise** : un duel où connaître le sens des mots fait gagner — on apprend sans en avoir l'air.

### Le principe d'équilibre du jeu
**Un mot rare est puissant, mais difficile à maîtriser.** En duel, une carte n'attaque que si le joueur prouve qu'il en connaît le sens. Jouer une Légendaire est donc un pari. Ce principe doit guider tous les choix d'équilibrage.

### Rôle de chacun
- **Raphaël** est directeur du projet : vision, game design et direction artistique. **Il n'est pas développeur.**
- **Claude Code** se charge de toute l'implémentation. Il explique ses choix en français simple, propose, et demande validation avant les décisions structurantes.

---

## 2. Périmètre

### V1 — Prototype solo (objet de ce brief)
- Pipeline de données qui génère la base de cartes et l'**Édition 1**
- Ouverture de paquets : **un nouveau paquet toutes les 10 minutes, jusqu'à 10 en stock**
- Collection consultable avec filtres et progression
- Duel contre une IA
- Sauvegarde locale sur l'appareil, sans compte ni serveur, avec **export / import de la sauvegarde** dans un fichier
- **Un site web classique**, qui s'ouvre dans le navigateur (téléphone et ordinateur), **mis en ligne sur un hébergement gratuit**. Pas d'application à installer pour le moment
- Simulateur d'équilibrage (outil interne, voir §5.5)

### Hors périmètre V1 (prévu plus tard, l'architecture doit le permettre)
- Comptes utilisateurs et backend
- Duels entre joueurs, échanges, enchères, guildes, classements
- **Version installable (PWA)** : icône sur l'écran d'accueil du téléphone et jeu hors-ligne. Elle s'ajoute au site existant sans rien reconstruire, le moment venu
- **Monétisation : accélération payante** (payer pour recevoir ses paquets plus vite — direction décidée, voir §5.6). Elle exige un serveur, donc elle arrive avec le backend
- Notifications (« ton stock de paquets est plein »)
- Éditions suivantes / extensions de cartes
- Quêtes quotidiennes, mot du jour

> **À savoir dès maintenant :** en multijoueur, les tirages de paquets devront se faire côté serveur (sinon la triche est triviale). Les collections créées en V1 locale ne pourront donc probablement pas être importées telles quelles dans un futur mode compétitif. Ce n'est pas un problème pour un prototype, mais il ne faut pas promettre le contraire aux testeurs.

---

## 3. Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Pipeline de données | **TypeScript (Node.js)** | Un seul outil à installer pour tout le projet ; le format des cartes et le calcul des stats sont partagés entre le pipeline et l'application ; un seul système de tests |
| Application | Vite + React + TypeScript | Rapide, typé, très bien maîtrisé par Claude Code |
| Tests | L'outil de test intégré à Node, pour le pipeline comme pour la logique du jeu | Rien à installer, une seule commande (`npm test`). Vitest ne sera ajouté que si l'on teste un jour l'interface elle-même |
| Stockage V1 | IndexedDB (via une petite lib type `idb`) | Collection sauvegardée sur l'appareil |
| Distribution | **Site web** accessible par une simple adresse | Rien à installer, partageable par un lien, plus simple à construire et à mettre à jour qu'une application. La version installable (PWA) pourra être ajoutée plus tard sans toucher au reste |
| Hébergement V1 | 🟡 Cloudflare Pages, Netlify ou GitHub Pages (gratuits, HTTPS) | Un site doit être en ligne pour être ouvert sur un téléphone ou partagé à des testeurs. Pendant le développement, il tourne aussi sur l'ordinateur de Raphaël sans hébergement |
| Backend futur | Supabase (à valider le moment venu) | Auth + base de données + temps réel pour le multi |

### Contraintes d'architecture
- **Couche de service unique** : tout accès aux données (collection, paquets, monnaie, progression) passe par `src/services/`. Passer de IndexedDB à un backend ne devra modifier que cette couche.
- **Logique de jeu pure** : le tirage des paquets et les règles du duel sont des fonctions sans interface ni stockage (`src/jeu/`), avec un **générateur aléatoire** et une **horloge** injectables (graine et heure fixes dans les tests et les simulateurs ; plus tard, l'heure viendra du serveur).
- **Sauvegarde robuste** :
  - numéro de version dans la sauvegarde + migrations ;
  - une carte possédée qui n'existe plus dans la base ne doit jamais faire planter l'app ;
  - demander le stockage persistant au navigateur (`navigator.storage.persist()`), car **sur iPhone, Safari peut effacer les données d'un site qui n'a pas été visité depuis environ une semaine** (risque propre à un site non installé) ;
  - rappeler régulièrement au joueur d'exporter sa sauvegarde (par exemple après une Légendaire ou tous les 100 paquets) ;
  - export / import de la sauvegarde en fichier depuis l'écran Réglages.
- **Identifiants de carte stables** d'une génération à l'autre (`mot-nature`).

---

## 4. Pipeline de données

### 4.1 Sources
*(Adresses et tailles vérifiées le 21 septembre 2026.)*

1. **Wiktionnaire français** : extraction JSON du projet **wiktextract**, disponible sur **kaikki.org**. Prendre l'extraction de l'*édition française* du Wiktionnaire (pas les mots français de l'édition anglaise). Elle fournit le mot, la nature grammaticale, les définitions, l'étymologie, les synonymes, les dérivés et les étiquettes (vulgaire, vieilli, familier…).
   - Fichier : `raw-wiktextract-data.jsonl.gz`, page `https://kaikki.org/frwiktionary/rawdata.html` — **685 Mo compressé, 6,3 Go décompressé** (extraction du 18/09/2026).
   - Ce fichier contient **toutes les langues** décrites par le Wiktionnaire français : le pipeline ne garde que les entrées de langue française. Le fichier « français seulement » proposé par kaikki.org est annoncé comme obsolète et voué à disparaître : ne pas l'utiliser.
   - Lire le fichier compressé directement, en flux, sans le décompresser sur le disque.
2. **Lexique** (lexique.org), licence CC BY-SA 4.0. Deux versions existent :
   - **Lexique 4.00** (`Lexique400.zip`, 49 Mo, publié en 2026) : 190 000 formes, fréquences tirées d'un corpus de sous-titres de 316 millions de mots, lemmes, et surtout la **prévalence** (la part des gens qui connaissent réellement le mot) ;
   - **Lexique 3.83** (`Lexique383.zip`, 27 Mo) : environ 140 000 formes, colonnes `ortho`, `lemme`, `cgram`, **`freqlemfilms2`**, **`freqlemlivres`**.
   - **On part sur Lexique 4 seul.** L'exploration (voir `COMPTE-RENDU-donnees.md`) a confirmé qu'il fournit la fréquence par lemme. Colonnes utiles : `1_Mot`, `5_Cgram`, `12_FreqLemme`, `14_IsLem` (1 = forme de base), `30_MorphoBase` (mot dont celui-ci dérive : *danseur* → *danser*), `33_Preval` (prévalence en %), `34_PrevalNb` (nombre de personnes interrogées). Il n'a plus de fréquence « livres » : on utilise celle des sous-titres seule.
   - Citation demandée : New, B., Pallier, C., Schalchli, G., Bourgin, J., & Gimenes, M. (2026). *Lexique 4: A major upgrade of the "Lexique" French lexical database.* Behavior Research Methods, 58(5), 140.

**Règles pour les sources :**
- **Étape 0 obligatoire : explorer les vraies données avant de coder.** Les noms de champs cités dans ce brief sont indicatifs. Claude Code télécharge les fichiers, en inspecte un échantillon, et présente à Raphaël un court compte rendu (champs réellement disponibles, exemples, surprises).
- Le fichier du Wiktionnaire est très gros : le lire **ligne par ligne** (flux), jamais en entier en mémoire.
- Les fichiers bruts ne sont **pas** versionnés dans Git (`data/brut/` dans `.gitignore`). Un script les télécharge ; la date et l'adresse de chaque fichier sont consignées pour que la génération soit reproductible.
- Vérifier la licence exacte et la citation demandée pour chaque source, et les consigner dans `SOURCES.md`.

### 4.2 Filtrage
- **Lemmes uniquement** : formes de base, pas de conjugaisons ni de pluriels. Regrouper Lexique par couple (`lemme`, `cgram`).
- **Jointure sur le couple (mot, nature grammaticale)**, jamais sur le mot seul. Correspondance vérifiée : `NOM`, `VER`, `ADJ`, `ADV` dans Lexique ↔ `noun`, `verb`, `adj`, `adv` dans le champ `pos` du Wiktionnaire (les noms propres y sont à part, sous `name`). Écarter les entrées du Wiktionnaire étiquetées `form-of` (simples formes fléchies).
- **Natures conservées** : noms communs, verbes, adjectifs, adverbes. Exclure noms propres, sigles, abréviations, symboles, locutions.
- **Mots composés** : garder ceux à trait d'union (« arc-en-ciel ») ; exclure ceux contenant une espace ou une apostrophe.
- **Garder uniquement les mots présents dans les deux sources**, pour avoir à la fois une définition et une fréquence.
- Un mot qui a plusieurs natures (« sourire » nom et verbe) donne **une carte par nature**.
- **Homographes de même nature** (« avocat » fruit / juriste) : 🟡 une seule carte en V1 ; les définitions sont fusionnées, la faction vient de la première étymologie. Les cas sont listés dans le rapport de génération.

**Filtrage des sens (définition par définition) :**
- Retirer les sens qui ne sont que des renvois : « Pluriel de… », « Féminin de… », « Variante (orthographique) de… », « Participe passé de… ».
- Un mot qui n'a plus aucun sens utilisable après ce tri est exclu.
- Nettoyer le texte : pas de balisage wiki, pas d'exemples ; conserver au plus **3 définitions** de **200 caractères** maximum chacune (coupe propre).
- Marquer, pour chaque définition, si elle **contient le mot lui-même ou un mot de la même famille** (« *danse* : action de danser ») : ces définitions sont affichables sur la fiche, mais ne doivent pas servir de question en duel (ou alors avec le mot masqué).

**Mots familiers, vulgaires, péjoratifs ou injurieux :**
- **Décision de Raphaël : tous les mots sont dans le jeu, y compris les mots injurieux.** Le pipeline ne retire aucun mot ni aucun sens pour cette raison. C'est un dictionnaire : ces mots existent, et leur définition dit ce qu'ils sont.
- Ces mots ne sont pas retirés, mais ils sont **étiquetés**, d'après les étiquettes du Wiktionnaire :
  - badge **« Familier »** : sens familier, populaire, argotique, enfantin ou vulgaire (environ 2 700 mots dans la base) ;
  - badge **« Injurieux »** : sens étiqueté `offensive` dans le Wiktionnaire (182 mots concernés dans la base, dont 59 n'ont que des sens injurieux).
  - Une carte porte le badge quand son sens principal est étiqueté ainsi. Quand seul un sens secondaire l'est, la carte n'a pas le badge, et ce sens est simplement signalé « (familier) » ou « (injurieux) ».
- Ces étiquettes doivent figurer dans l'index des cartes (champ `registre`) : ce sont elles qui permettent au joueur de masquer ces mots depuis les Réglages (§5.3), et à Raphaël de changer d'avis plus tard sans tout regénérer.
- `data/exclusions.txt` (un mot par ligne) reste disponible si Raphaël veut un jour retirer un mot précis.
- Le pipeline écrit `data/mots-sensibles.md` : la liste, pour information, des mots injurieux, vulgaires ou péjoratifs présents dans l'Édition 1.

### 4.3 Calcul des attributs

**Fréquence :** `12_FreqLemme` de Lexique 4 (occurrences par million de mots).
*(C'est bien la fréquence du lemme, qui additionne toutes les formes du mot. Avec la fréquence de la forme seule, tous les verbes paraîtraient faussement rares.)*

**Rareté par percentile**, du plus rare au plus fréquent. **Le classement combine la fréquence et la prévalence** (la part des gens qui connaissent le mot) : on calcule le rang du mot selon chacune des deux mesures, et on fait la moyenne des deux rangs. Raison : 10 % des mots de la base ont exactement la même fréquence, la plus basse possible ; avec la fréquence seule, les Légendaires seraient choisies au hasard parmi des milliers d'ex æquo, et beaucoup seraient des dérivés sans saveur. La prévalence les départage et donne des cartes rares désirables (*valétudinaire*, *tabellion*, *cuistrerie*…). Elle sert aussi de mesure de difficulté en duel.
- La prévalence n'est prise en compte que si au moins 10 personnes ont été interrogées (`34_PrevalNb`).
- Pour les mots sans prévalence mesurée (37 % de la base), la rareté repose sur la fréquence seule. **Les deux groupes sont classés séparément**, chacun entre eux : sinon les milliers de mots non mesurés, ex æquo à la fréquence la plus basse, rempliraient à eux seuls les raretés les plus hautes (et *callipyge* ne serait plus Légendaire). **L'Édition 1 ne contient que des mots dont la prévalence est mesurée** (il y en a près de 33 000, onze fois plus que nécessaire), plus les « coups de cœur » de Raphaël : quelques beaux mots n'ont pas été mesurés (*procrastiner*, *sérendipité*, *zeugma*…) et se rattrapent par cette liste.
- Le poids de chaque mesure est réglable dans la configuration du pipeline.
- En cas d'égalité, départage **déterministe** qui ne dépende pas de l'ordre alphabétique (sinon toutes les cartes rares commenceraient par A ou B) : par exemple une empreinte calculée à partir du mot. La rareté d'un mot ne doit jamais changer d'une génération à l'autre.

| Rareté | Part de la base | Couleur de bordure indicative |
|---|---|---|
| Légendaire | 3 % les plus rares | Or |
| Épique | 7 % suivants | Violet |
| Rare | 15 % suivants | Bleu |
| Peu commune | 25 % suivants | Vert |
| Commune | 50 % restants | Gris |

**Attaque (1 à 10) — « valeur des lettres » :** somme des valeurs des lettres du mot. Barème : A E I L N O R S T U = 1 · D G M = 2 · B C P = 3 · F H V = 4 · J Q = 8 · K W X Y Z = 10. Lettres accentuées ramenées à leur lettre de base, `œ` → `oe`, `æ` → `ae`, traits d'union ignorés. Le score brut est ramené sur 1–10 **par percentile**. Ce classement se fait **entre les cartes de l'édition** (les 10 % de cartes les plus fortes du jeu ont 10), et non sur toute la base : les cartes choisies pour une édition étant plus riches que la moyenne, un classement sur toute la base donnerait des défenses presque toutes élevées. Réglage `notesCalculeesSur` dans `pipeline/config.ts`.
*(Ne jamais afficher le nom « Scrabble » dans le jeu : c'est une marque déposée. Voir §7.)*

**Défense (1 à 10) — « richesse du mot » :** score combinant le nombre de sens, le nombre de synonymes et le nombre de mots dérivés recensés par le Wiktionnaire, ramené sur 1–10 par percentile.
*(Le seul nombre de sens ne suffit pas : plus de la moitié des mots n'ont qu'un sens, et presque toutes les Légendaires auraient une défense de 1.)*

**Bonus de rareté :** un petit bonus de stats par rareté (par défaut +0 / +0 / +1 / +1 / +2 en défense, plafonné à 10), réglable dans le fichier d'équilibrage, pour qu'une carte rare ne soit jamais décevante.

**Type :** Nom, Verbe, Adjectif, Adverbe.

**Registre (badges facultatifs) :** Familier, Injurieux, Littéraire, Vieilli — d'après les étiquettes du Wiktionnaire.

**Date de première apparition :** quand le Wiktionnaire la donne (champ `attestations`, 31 % des mots), elle est conservée et affichée sur la fiche de la carte (« Attesté depuis 1532 »). Aucun effet sur le jeu.

**Faction (étymologie) :**
1. Prendre le texte d'étymologie (champ `etymology_texts`, présent pour 91 % des mots), **ignorer les parenthèses initiales** (« *(Adjectif)* De l'anglais… » ; seules 2,5 % des étymologies sont concernées, les dates étant rangées à part dans le champ `attestations`) et réparer les mots collés par l'extraction (« Motdérivé de »).
2. Chercher les mots-clés d'origine : latin, grec ancien, arabe, anglais, italien, espagnol, allemand, néerlandais, germanique / francique, gaulois / celtique, occitan / provençal, onomatopée… La liste des mots-clés est dans un fichier de configuration du pipeline.
3. **Héritage** : si l'étymologie dit « Dérivé de X », « Composé de X et… », « Déverbal de X » ou simplement « De X » (où X est un mot français), le mot hérite de la faction de X (deux niveaux maximum : *danseur* → *danser* → francique). À défaut, utiliser le mot d'origine indiqué par Lexique (`30_MorphoBase`). Un premier essai d'héritage à un seul niveau reclasse déjà 14 700 mots.
4. Sinon : « **Formation française** » si l'étymologie décrit une construction interne au français, « **Origine inconnue** » s'il n'y a rien d'exploitable.
5. Les langues qui comptent moins d'une cinquantaine de mots sont regroupées dans une faction « **Langues d'ailleurs** » (la langue exacte reste affichée sur la fiche).
6. Conserver le texte d'étymologie brut pour l'affichage.

### 4.4 L'Édition 1

La base complète compte environ 52 000 cartes possibles (chiffre mesuré) : c'est trop pour un jeu (collection infinissable, quasiment aucun doublon donc pas d'Encre, fichier trop lourd, beaucoup de mots rares sans charme). Le jeu fonctionne donc **par éditions**, comme les vrais TCG.

- Le pipeline génère la **base complète** (elle sert aussi de réservoir pour les leurres du duel et pour les futures éditions).
- Il en extrait l'**Édition 1 : environ 3 000 cartes**, en conservant la répartition des raretés (3 / 7 / 15 / 25 / 50 %).
- Sélection par **score de qualité** : faction reconnue, au moins une définition utilisable en duel, définition ni trop courte ni trop technique. Parmi les mots rares, favoriser les mots « déjà entendus mais mal connus » (connus de 10 à 60 % des gens) plutôt que les mots totalement inconnus ; léger bonus pour les mots littéraires ou vieillis.
- **Équilibre des types de mots :** dans la langue, deux mots sur trois sont des noms, alors que le duel repose sur le triangle Nom > Adjectif > Verbe > Nom. L'édition vise donc 50 % de noms, 22 % d'adjectifs, 22 % de verbes et 6 % d'adverbes (les adverbes intéressants sont rares : on en obtient environ 1 %). Réglage `partsDesTypes`.
- **Corrections d'origine :** la détection automatique de l'origine se trompe dans environ 5 % des cas (homonymes, étymologies discutées). `data/corrections-factions.txt` permet à Raphaël de corriger un mot (`goulu = Latin`) ; ses dérivés héritent de la correction.
- **Équilibre des factions :** l'édition ne respecte pas les proportions réelles de la langue (le latin pèserait 57 %, l'arabe 0,7 %). Le latin est **plafonné vers 35 %**, les petites factions sont volontairement gonflées, et les toutes petites langues (turc, persan, russe, japonais, chinois, sanskrit, langues d'Amérique, hébreu…) sont regroupées dans **« Langues d'ailleurs »**. Le jeu peut rappeler la vérité ailleurs (« dans la vraie langue, près de 6 mots sur 10 viennent du latin »). Réglage dans la configuration du pipeline.
- `data/coups-de-coeur.txt` : mots que Raphaël **impose** dans l'édition. `data/exclusions.txt` : mots qu'il interdit.
- Taille de l'édition et critères réglables dans la configuration du pipeline. 🟡 Avec un paquet toutes les 10 minutes, 3 000 cartes pourraient se compléter plus vite que prévu : la taille définitive sera fixée à l'aide du simulateur de collection (§5.5).

### 4.5 Rapport de génération

Le pipeline produit `data/rapport.md`, que Raphaël utilise pour valider que le résultat « sonne juste » :
- nombre de cartes par rareté, par type, par faction (base complète **et** Édition 1) ;
- **pourcentage de mots sans faction reconnue** ;
- **moyenne d'attaque et de défense par rareté** ;
- 20 exemples aléatoires par rareté, 10 par faction ;
- liste des homographes fusionnés et nombre de mots exclus par chaque règle de filtrage.

### 4.6 Format de sortie

Deux niveaux de fichiers, pour que l'application reste légère sur mobile :

**`public/data/edition-1.index.json`** — chargé au démarrage, toutes les cartes de l'édition, champs courts uniquement :

```json
{
  "meta": {
    "edition": 1,
    "version": "2026-09-18",
    "cartes": 3000,
    "lots": 16,
    "sources": "Wiktionnaire (fr.wiktionary.org) et Lexique 4 (lexique.org)",
    "licence": "CC BY-SA 4.0 — définitions et étymologies adaptées du Wiktionnaire"
  },
  "cartes": [
    {
      "id": "callipyge-adj",
      "mot": "callipyge",
      "type": "Adjectif",
      "rarete": "Légendaire",
      "attaque": 10,
      "defense": 5,
      "faction": "Grec",
      "registre": []
    }
  ]
}
```

**`public/data/details/lot-XX.json`** — chargés à la demande (fiche carte, duel), découpés en 16 lots :

```json
{
  "callipyge-adj": {
    "definitions": [
      { "texte": "Qui a de belles fesses, aux formes harmonieuses.", "quiz": true },
      { "texte": "Qui a des formes arrondies. Gros et gras.", "quiz": true }
    ],
    "etymologie": "Emprunté au grec ancien καλλίπυγος, kallípugos (« qui a de belles fesses »), épithète d’Aphrodite.",
    "langueOrigine": "Grec",
    "frequence": 0.003,
    "prevalence": 33,
    "attestation": "1786"
  }
}
```

*(Exemples réels, tirés de la première génération. Le format exact est décrit dans `src/partage/types.ts`, partagé entre le pipeline et le jeu.)*

- `version` est la date d'extraction du Wiktionnaire : deux générations faites à partir des mêmes données donnent exactement le même résultat.
- `defense` est la note brute ; le bonus de rareté est appliqué par le jeu, d'après `equilibrage.ts`.
- `quiz` indique si la définition peut servir de question en duel ; une définition peut aussi porter un `registre` (« Familier », « Injurieux »…) pour pouvoir être masquée.
- `frequence` est exprimée en occurrences par million de mots ; `prevalence` est la part des gens qui connaissent le mot, en % ; `attestation` n'est présent que si la date est connue.
- Le lot d'une carte se calcule à partir de son identifiant (`src/partage/lots.ts`).
- Le lien vers la page Wiktionnaire se déduit du mot, inutile de le stocker.
- Poids mesuré : **400 Ko** pour l'index (avant compression), 1,4 Mo pour l'ensemble des détails.

Le pipeline doit être **relançable en une commande** (`npm run pipeline`) et documenté dans le README.

---

## 5. Mécaniques de jeu V1

> **Règle d'or :** tous les chiffres d'équilibrage (probabilités, points de vie, bonus, coûts, durées) sont regroupés dans **un seul fichier `src/config/equilibrage.ts`**, commenté en français, pour que Raphaël puisse les ajuster sans toucher au code. Tous les chiffres ci-dessous sont des valeurs de départ.

### 5.1 Paquets
- **Un paquet gratuit toutes les 10 minutes**, que l'application soit ouverte ou fermée.
- **Stock** : les paquets non ouverts s'accumulent jusqu'à **10**. Quand le stock est plein, le compte à rebours s'arrête ; il repart dès qu'un paquet est ouvert.
- L'accueil affiche le stock (« 7 / 10 ») et le temps restant avant le prochain paquet.
- La recharge se calcule à partir de l'heure : à chaque ouverture de l'app, on ajoute les paquets gagnés depuis la dernière visite. Garde-fou simple : si l'heure du téléphone est antérieure à la dernière heure enregistrée, aucun paquet n'est accordé. *(Avancer l'heure du téléphone permet de tricher : acceptable pour un prototype solo, inacceptable dès qu'il y aura de l'argent en jeu — voir §5.6.)*
- **5 cartes par paquet** :

| Emplacement | Commune | Peu commune | Rare | Épique | Légendaire |
|---|---|---|---|---|---|
| 1 à 3 | 70 % | 25 % | 5 % | — | — |
| 4 | — | 75 % | 20 % | 5 % | — |
| 5 | — | — | 74 % | 22 % | 4 % |

- Tirage en deux temps : d'abord la rareté, puis un mot au hasard dans cette rareté. Pas deux fois la même carte dans un paquet.
- 🟡 **Taux de Légendaire ramené de 8 % à 4 %** : avec des dizaines de paquets par jour au lieu d'un seul, une Légendaire à 8 % tomberait deux ou trois fois par jour et n'aurait plus rien de légendaire. À 4 %, un joueur qui ouvre une trentaine de paquets par jour en obtient environ une par jour.
- **Compteur de garantie :** 🟡 une Légendaire est garantie au plus tard au **40e** paquet sans Légendaire.
- **Transparence :** les probabilités sont consultables dans le jeu (écran d'information des paquets).
- **Animation d'ouverture** : cartes face cachée, retournées une à une, effet plus marqué selon la rareté. Comme on ouvre souvent plusieurs paquets d'affilée : bouton « tout retourner », et enchaînement direct sur le paquet suivant du stock sans repasser par l'accueil.
- **Démarrage :** le joueur commence avec 3 paquets en stock, **garantis sans doublon** (15 cartes différentes), pour pouvoir composer un deck de 10 cartes tout de suite.

### 5.2 Doublons et monnaie
- Un doublon se convertit en **Encre** : Commune 1 · Peu commune 3 · Rare 10 · Épique 30 · Légendaire 100.
- L'Encre sert à **obtenir un paquet tout de suite, sans attendre** (coût de départ : 50). C'est la forme d'accélération disponible en V1 (voir §5.6).
- **Règle de sécurité de l'économie :** un paquet doit toujours rapporter en moyenne nettement moins d'Encre (par ses doublons) qu'il n'en coûte, sinon les paquets deviennent infinis. Le simulateur vérifie cette règle à chaque changement de chiffres.
- **Plafond quotidien** sur l'Encre gagnée en duel (par défaut : récompense pleine pour les 3 premières victoires du jour, réduite ensuite), sinon les paquets deviennent illimités.

### 5.3 Collection
- Grille de cartes avec filtres (rareté, type, faction, registre), tri et recherche.
- Progression affichée **par faction** au sein de l'édition (« Mots venus de l'arabe : 12 / 84 »).
- Fiche détaillée d'une carte : définitions, étymologie, stats, niveau de maîtrise, lien vers la page Wiktionnaire et crédit visible.
- Les cartes non possédées ne sont pas listées une à une, pour préserver la surprise. Seuls les compteurs sont visibles.
- **Options « Masquer les mots familiers » et « Masquer les mots injurieux »** (Réglages, deux options séparées, 🟡 toutes deux désactivées par défaut : tous les mots sont visibles, conformément à la décision de Raphaël ; la valeur par défaut est un simple réglage, à revoir selon le public visé avant d'ouvrir le jeu à tous). Quand une option est active, 🟡 les cartes portant le badge correspondant ne tombent plus dans les paquets et n'apparaissent plus dans la collection, la construction de deck, le deck de l'IA ni les leurres du duel ; les sens signalés « (familier) » sont masqués sur les fiches. Les compteurs de progression ne comptent alors que les cartes visibles. Les cartes déjà possédées ne sont pas supprimées : elles réapparaissent si l'option est désactivée.
- **Maîtrise** : chaque carte compte ses bonnes réponses en duel. À 5 réussites, elle gagne le badge « Maîtrisée » (compteur global visible dans la collection). Aucun effet sur les stats en V1.

### 5.4 Duel contre l'IA

**Mise en place**
- **Deck de 10 cartes** composé par le joueur. **20 points de vie** chacun. **3 cartes en main.**
- Chaque camp possède un seul emplacement : son **mot en jeu** (la dernière carte qu'il a posée). Il sert de défenseur.
- Le premier joueur est tiré au sort.
- **Deck de l'IA** : tiré dans l'Édition 1 avec un profil de raretés proche de celui du deck du joueur, pour que le duel reste équitable quel que soit l'avancement de la collection.

**Déroulement d'un tour**
1. **Choix** : le joueur **choisit** une carte de sa main. Il voit le mot en jeu adverse, et peut donc viser le triangle des types ou le bonus de faction.
2. **Épreuve de maîtrise** : le jeu affiche **4 définitions** — la bonne et 3 leurres tirés de mots de **même nature grammaticale et de rareté voisine**. Le joueur a **15 secondes** pour désigner celle de son mot. Seules les définitions marquées utilisables en quiz sont employées ; la définition demandée varie d'une fois sur l'autre quand le mot en a plusieurs.
3. **Résolution**
   - **Réussite** : la carte attaque. Dégâts = attaque + bonus − défense du mot en jeu adverse, **minimum 1**. Si l'adversaire n'a pas encore de mot en jeu, la défense compte pour 0.
   - **Échec ou temps écoulé** : « le mot vous échappe », pas d'attaque. **La bonne définition est affichée** : c'est le moment où l'on apprend.
   - Dans les deux cas, la carte devient le nouveau mot en jeu du joueur (l'ancien part à la défausse), et le joueur pioche une carte.
4. **Tour de l'IA** : même déroulement. Son épreuve de maîtrise est remplacée par un taux de réussite : Facile 50 % · Normal 70 % · Difficile 90 %. En Facile elle choisit sa carte au hasard ; en Normal et Difficile elle choisit la carte qui inflige le plus de dégâts.

**Bonus**
- **Triangle des types** (+2 dégâts) : Nom > Adjectif > Verbe > Nom. Les Adverbes sont neutres.
- **Bonus de faction** : +1 dégât si la carte précédente jouée par le même camp était de la même faction ; **+2 pour les petites factions** (seuil défini dans le fichier d'équilibrage), car enchaîner deux mots venus de l'arabe est bien plus difficile que deux mots latins.

**Fin de partie**
- Un camp tombe à 0 point de vie : il perd.
- Deck épuisé : la défausse est mélangée et reforme le deck.
- Limite de **20 tours** : le camp qui a le plus de points de vie gagne (égalité = match nul).
- **Récompense** : de l'Encre en cas de victoire (montant et plafond dans le fichier d'équilibrage), une petite consolation en cas de défaite.

**Variantes de question (phase 4, si le temps le permet)** : « De quelle langue vient ce mot ? » en alternance avec la définition, pour que le joueur qui connaît son deck par cœur reste mis au défi.

### 5.5 Simulateur d'équilibrage
Commande `npm run simulation` : fait s'affronter deux IA sur 10 000 duels avec des decks aléatoires et affiche la **durée moyenne d'une partie**, le taux de victoire du premier joueur, et le taux de victoire par profil de deck (communes contre rares, mono-faction contre mixte). **Cible de départ : 6 à 10 tours par partie.** C'est l'outil qui permet à Raphaël de régler les chiffres sans jouer des centaines de parties.

**Simulation de collection** (`npm run simulation:collection`) : simule des mois d'ouverture de paquets pour trois profils de joueur (occasionnel : 10 paquets par jour ; régulier : 30 ; acharné : 100) et affiche le temps nécessaire pour réunir 50 %, 90 % et 100 % de l'édition, le nombre de Légendaires par semaine et l'Encre gagnée. **Cible de départ : un joueur régulier termine l'édition en 6 mois à 1 an.** Cet outil sert à fixer la taille de l'édition, les taux de rareté et le prix des paquets, et à vérifier la règle de sécurité de l'économie (§5.2).

### 5.6 Accélération : à l'Encre en V1, payante ensuite

**Direction décidée :** le modèle économique du jeu sera l'**accélération payante**. Le jeu est gratuit et généreux (un paquet toutes les 10 minutes), et le joueur pressé peut payer pour aller plus vite.

**En V1 (aucun argent réel) :** la seule accélération est l'achat immédiat d'un paquet avec de l'Encre (§5.2). Cela permet de tester la mécanique et de régler les prix.

**Plus tard (avec le backend) :** offres en argent réel — par exemple remplir le stock d'un coup, réduire le délai entre deux paquets pendant une durée donnée, ou agrandir le stock. 🟡 Ce n'est pas faisable proprement en V1, pour trois raisons :
1. **Sécurité** : en V1 tout vit sur le téléphone du joueur. Avancer l'heure du téléphone donne des paquets gratuits, et la sauvegarde est modifiable. Personne ne paiera pour ce qu'on obtient en changeant l'heure. Il faut que l'heure, les tirages et les achats soient gérés par un serveur.
2. **Paiement** : encaisser de l'argent demande un prestataire (Stripe sur le web ; système d'achat d'Apple et de Google si le jeu est publié sur les stores), des conditions générales de vente et la gestion de la TVA.
3. **Légal** : voir §7.

**Ce que la V1 doit préparer :**
- toute la logique de recharge (délai, stock maximum, paquets disponibles) passe par la couche de service, avec une horloge injectable : le jour venu, le serveur remplace l'horloge du téléphone sans toucher au reste ;
- les offres d'accélération sont décrites comme des **données** dans `equilibrage.ts` (nom, effet, prix en Encre) : ajouter plus tard un prix en argent réel ne demandera pas de restructurer le code ;
- **principe de design recommandé :** le jeu doit rester agréable et complet sans jamais payer. Payer fait gagner du temps, jamais des cartes exclusives.

---

## 6. Interface et direction artistique

- **Pensé d'abord pour le téléphone** (écran de 380 px de large, portrait, jouable à une main), **mais confortable sur ordinateur** : contenu centré, grille de collection plus large, duel jouable à la souris et au clavier.
- **Écrans V1** : Accueil (stock de paquets, compte à rebours, Encre) · Ouverture de paquet · Collection · Fiche carte · Construction de deck · Duel · Réglages / Crédits.
- **Design de carte** : le mot en grand, type et faction en icônes, attaque et défense bien lisibles, bordure colorée selon la rareté, effet brillant pour Épique et Légendaire, badges de registre et de maîtrise.
- 🟡 **Direction artistique recommandée : typographique, esprit « page de dictionnaire »** (papier, belle typographie à empattements, un motif ou un ornement par faction). Raison décisive : il est impossible d'illustrer des milliers de cartes ; le héros de la carte doit être **le mot lui-même**. La décision finale appartient à Raphaël.
- En attendant, style sobre et neutre, facile à remplacer : **couleurs, polices et ornements centralisés dans un fichier de thème**.
- **Contenu (écran Réglages)** : options « Masquer les mots familiers » et « Masquer les mots injurieux » (§5.3).
- **Accessibilité (écran Réglages)** : allonger ou désactiver le chronomètre du duel, réduire les animations, couper le son. La rareté ne doit jamais être indiquée par la couleur seule (ajouter un symbole ou un libellé). Contrastes lisibles.

---

## 7. Aspects légaux

- **Le Wiktionnaire et Lexique sont sous licence CC BY-SA** (vérifié sur lexique.org pour Lexique : CC BY-SA 4.0). Conséquences :
  - crédit visible sur chaque fiche carte, avec lien vers la page du mot et mention « définition adaptée du Wiktionnaire » ;
  - page **Crédits / Sources** complète, avec la citation scientifique demandée par les auteurs de Lexique et un crédit au projet wiktextract / kaikki.org ;
  - **les fichiers de données de cartes restent sous CC BY-SA** (partage dans les mêmes conditions). Le code, l'interface, les graphismes, le nom et les règles restent la propriété du projet.
- **« Scrabble » est une marque déposée** : le mot n'apparaît nulle part dans le jeu, ni dans sa communication. On parle de « valeur des lettres ».
- **Inspiration** : ne reprendre ni le nom, ni les visuels, ni les textes d'un jeu existant.
- **Nom définitif** : vérifier la disponibilité (INPI, nom de domaine, stores) avant de s'y attacher.
- **Pas de marques ni de personnes réelles** dans les cartes : le filtrage des noms propres le garantit.
- **Paquets aléatoires et accélération payante** : afficher les probabilités dès la V1. Payer pour recevoir plus vite des paquets au contenu aléatoire revient, aux yeux de certaines réglementations, à vendre des tirages aléatoires : quelques pays les interdisent ou les encadrent strictement (la Belgique notamment), les stores imposent l'affichage des taux, et la protection des mineurs entre en jeu. **À faire vérifier par un juriste avant d'encaisser le premier euro** ; à détailler dans le brief dédié au backend.
- **Vie privée** : la V1 ne collecte aucune donnée personnelle et n'embarque aucun outil de mesure d'audience.

---

## 8. Plan de travail et critères de validation

| Phase | Contenu | Validé quand… |
|---|---|---|
| **0a. Exploration** *(travail fait le 21/09/2026, en attente de lecture)* | Dépôt Git, téléchargement des sources, compte rendu sur les données réelles, `SOURCES.md` | Raphaël a lu le compte rendu et confirmé ou corrigé les propositions 🟡 du §10.2 |
| **0b. Données** *(travail fait le 21/09/2026, en attente de lecture)* | Pipeline complet, base + Édition 1, rapport de génération, tests | Raphaël a relu `data/rapport.md` : la répartition et les exemples lui conviennent |
| **1. Squelette** *(site fait le 21/09/2026 ; mise en ligne en attente du choix de l'hébergeur et de l'accord de Raphaël)* | Projet Vite/React/TS, thème, navigation entre écrans vides, mise en ligne | Le site s'ouvre à une adresse web, sur le téléphone et sur l'ordinateur de Raphaël |
| **2. Paquets + Collection** | Tirage, recharge toutes les 10 minutes, animation, sauvegarde locale, export/import, Encre, collection filtrable, option « masquer les mots familiers », fiche carte, simulateur de collection | Les paquets se rechargent avec le temps, même application fermée, sans jamais dépasser 10 ; on retrouve sa collection après fermeture et on peut la restaurer depuis un fichier ; le simulateur de collection donne des durées qui conviennent à Raphaël |
| **3. Duel** | Construction de deck, duel complet contre l'IA à 3 niveaux, simulateur de duel | Une partie se joue de bout en bout sans bug, gagnable et perdable ; le simulateur donne 6 à 10 tours en moyenne |
| **4. Finitions** | Sons, effets de rareté, accessibilité, écran crédits, équilibrage, partage d'une carte en image, variantes de question | Raphaël valide le ressenti ; 5 testeurs extérieurs ont joué plusieurs jours et leurs retours sont notés |
| **5. (futur)** | Backend, comptes, accélération payante, multijoueur, échanges, éditions suivantes | Nouveau brief dédié |

---

## 9. Consignes de travail pour Claude Code

- **Expliquer en français simple** ce qui est fait et pourquoi, sans jargon inutile. Raphaël n'est pas développeur.
- **Vérifier avant de supposer** : inspecter les données réelles avant d'écrire le pipeline ; si une hypothèse de ce brief se révèle fausse, le dire et proposer une adaptation.
- **Avancer par petites étapes testables**, avec un commit Git à chaque étape fonctionnelle.
- **Demander validation** avant tout choix structurant : changement de stack, nouvelle dépendance importante, modification du format des cartes ou de la sauvegarde.
- **Ne jamais mettre en ligne ni publier quoi que ce soit sans l'accord explicite de Raphaël.**
- **Tests automatiques** au minimum sur le pipeline (filtrage, fréquence, stats, factions), la logique de tirage et de recharge (probabilités, garantie, délai de 10 minutes, stock maximum, recul de l'horloge), le combat et les migrations de sauvegarde.
- **README à jour** : comment installer, lancer le pipeline, lancer l'app, lancer la simulation, modifier l'équilibrage, modifier les listes de mots.
- **Ne jamais coder un chiffre d'équilibrage en dur** en dehors de `equilibrage.ts`.
- En cas de doute sur un point de game design, **proposer 2 ou 3 options** avec leurs avantages plutôt que trancher seul.
- À la fin de chaque phase, **indiquer à Raphaël quoi tester et comment**, étape par étape.

---

## 10. Décisions et questions ouvertes

### 10.1 Décisions validées par Raphaël (21 septembre 2026)

| # | Sujet | Décision |
|---|---|---|
| 1 | Taille du jeu | Édition 1 d'environ 3 000 cartes (taille à affiner au simulateur) |
| 2 | Tour de duel | Le joueur choisit sa carte, puis épreuve de maîtrise à 4 définitions |
| 3 | Défense | Richesse du mot (sens + synonymes + dérivés) + bonus de rareté |
| 4 | Langage du pipeline | TypeScript |
| 5 | Mots familiers et argotiques | Conservés avec badge « Familier », **et option dans les Réglages pour les masquer** |
| 6 | Rythme des paquets | **Un paquet toutes les 10 minutes, 10 en stock au maximum** |
| 7 | Modèle économique | **Accélération payante** : à l'Encre en V1, en argent réel avec le backend |
| 8 | Forme du jeu | **Site web classique pour le moment** ; la version installable (PWA) est repoussée à plus tard |
| 9 | Rareté | **Fréquence + prévalence** ; l'Édition 1 ne pioche que parmi les mots dont la prévalence est mesurée, plus les « coups de cœur » de Raphaël |
| 10 | Source des fréquences | **Lexique 4 seul** |
| 11 | Date de première apparition du mot | **Affichée sur la fiche** quand elle est connue, sans effet sur le jeu |
| 12 | Mots familiers, vulgaires, péjoratifs, injurieux | **Tous les mots sont dans le jeu, même injurieux.** Ils sont étiquetés, pas retirés |
| 13 | Équilibre des factions | **Latin plafonné vers 35 %**, petites factions gonflées, toutes petites langues regroupées dans « Langues d'ailleurs » |
| 14 | Rapport de génération de l'Édition 1 | **Validé** (« tout ok ») : la répartition et les exemples conviennent |
| 15 | Liste des factions | **13 factions** : Latin, Vieux français, Anglais, Grec, Italien, Francique, Allemand et néerlandais, Langues d'ailleurs, Occitan, Espagnol et portugais, Arabe, Gaulois, Onomatopée |
| 16 | Équilibre des types de mots | Viser **50 % de noms, 22 % d'adjectifs, 22 % de verbes, 6 % d'adverbes** |
| 17 | Notes d'attaque et de défense | **Calculées entre les cartes de l'édition** |
| 18 | Outils de test | **Celui intégré à Node**, pour le pipeline comme pour la logique du jeu (rien à installer) ; Vitest seulement si l'on teste un jour l'interface elle-même |

### 10.2 Propositions encore à confirmer (🟡)

Aucune ne bloque le démarrage : ce sont des réglages, ou des choix qui se présenteront en cours de route.

| Sujet | Proposition par défaut | Où |
|---|---|---|
| Taux de Légendaire | 4 % au lieu de 8 %, garantie au 40e paquet, à cause du nouveau rythme des paquets | §5.1 |
| Portée de l'option « masquer les mots familiers » | Les cartes ne tombent plus dans les paquets et disparaissent partout ; les compteurs s'adaptent | §5.3 |
| Argent réel | Pas en V1 (impossible à sécuriser sans serveur) ; la V1 prépare le terrain | §5.6 |
| Taille définitive de l'édition | À fixer avec le simulateur de collection | §4.4, §5.5 |
| Mots injurieux : visibles ou masqués par défaut ? | Visibles par défaut (deux options séparées dans les Réglages pour masquer les familiers et les injurieux) | §5.3 |
| Homographes (« avocat ») | Une seule carte, faction de la première étymologie | §4.2 |
| Hébergement | Cloudflare Pages, Netlify ou GitHub Pages | §3 |
| Direction artistique | Typographique, esprit « page de dictionnaire » | §6 |

### 10.3 Questions de fond
- **Nom définitif du jeu** (« Mots de Maîtres » ?)
- **Public visé** : grand public, amoureux des mots, scolaire ? La réponse influencera le ton, la difficulté, le réglage par défaut de l'option « masquer les mots familiers » et, plus tard, les règles applicables aux achats (mineurs).
