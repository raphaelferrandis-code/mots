# Brief projet v2 — Jeu de cartes à collectionner des mots de la langue française

*Nom de code : **MOTS** (piste sérieuse pour le nom définitif : « Mots de Maîtres », à vérifier à l'INPI).*
*Version 2.7 du 22 septembre 2026 (phase 4 : finitions — page Confidentialité et « Rejoindre les joutes », accessibilité, sons du duel, partage d'un timbre en image, effets de rareté à l'ouverture des paquets ; guide des testeurs `GUIDE-testeurs.md` ; la variante de question est laissée de côté, voir §5.4 ; le marché demandé par Raphaël est cadré dans `BRIEF-marche.md`). Version 2.6 du 21 septembre 2026 (phase 3 : le duel « mot contre mot » avec parade, réglé au simulateur — voir §5.4, §5.5 et `data/simulation-duel.md` ; et les joutes classées en version d'essai — voir §5.7 et `BRIEF-joutes.md`) — intègre les décisions de Raphaël (voir §10.1), les enseignements de l'exploration des données (voir `COMPTE-RENDU-donnees.md`) et ceux de la première fabrication des cartes (voir `data/rapport.md`). Les raisons des changements par rapport à la v1 sont dans `RAPPORT-analyse-brief.md`.*

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
- Duels entre joueurs **en direct**, échanges, enchères, guildes. *(Les duels différés contre le deck d'un autre joueur, avec classement, ont été avancés : voir §5.7.)*
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
| Hébergement V1 | **GitHub Pages** (gratuit, HTTPS), mise en ligne automatique à chaque envoi de code | Un site doit être en ligne pour être ouvert sur un téléphone ou partagé à des testeurs. Pendant le développement, il tourne aussi sur l'ordinateur de Raphaël sans hébergement |
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
- **Exception : un coup de cœur non mesuré est rangé parmi les mots mesurés**, d'après sa seule fréquence. Sa note est son rang de fréquence parmi les mots mesurés, et il reçoit la rareté du mot mesuré à côté duquel cette note le place, sans prendre la place de personne (aucun autre mot de la base ne change de rareté). Raison : les non mesurés sont presque tous rarissimes (la moitié apparaît au plus 0,016 fois par million de mots) ; classé parmi eux, *zeugma* (0,028) passait pour un mot courant et sortait en Commune, alors qu'il fait partie des 15 % de mots mesurés les moins fréquents. Contrôle fait sur les mots mesurés, en cachant leur prévalence : la fréquence seule retrouve la bonne rareté 7 fois sur 10, et 3 Légendaires sur 4. Résultat : *sérendipité* Légendaire, *rodomontade* Épique, *zeugma* et *procrastiner* Rares, *procrastination* Peu commune.
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

**Bonus de rareté :** un bonus de stats par rareté, réglable dans le fichier d'équilibrage, pour qu'une carte rare ne soit jamais décevante : +0 / +0 / +1 / +1 / +2 en défense (plafonnée à 10), et 🟡 +0 / +0 / +1 / +2 / +3 en attaque, **non plafonnée** (+3 en défense et +4 en attaque pour les Hors-série). Le bonus d'attaque a été ajouté avec le duel « mot contre mot » (§5.4) : mesuré, l'attaque brute ne dépend pas de la rareté, et sans lui un mot rare ne frappait pas plus fort qu'un mot courant.

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
- `data/coups-de-coeur.txt` : mots que Raphaël **impose** dans l'édition (leur rareté se calcule toute seule, voir §4.3). `data/exclusions.txt` : mots qu'il interdit.
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
- `attaque` et `defense` sont les notes brutes ; les bonus de rareté sont appliqués par le jeu, d'après `equilibrage.ts`.
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
- L'Encre sert à **obtenir un paquet tout de suite, sans attendre**. Prix : **150 Encre**. Le prix de départ de 50 était beaucoup trop bas : d'après le simulateur, l'Encre doublait alors le nombre de paquets (55 % des paquets ouverts étaient payés avec l'Encre) et un joueur régulier finissait l'édition en 4 mois, avec près de 3 Légendaires par jour. À 150, il lui faut environ 8 mois (cible : 6 mois à 1 an) et l'Encre paie encore un paquet sur six. C'est la forme d'accélération disponible en V1 (voir §5.6).
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

> **Version du 21 septembre 2026 (soir) : le duel « mot contre mot », avec parade.** Décidé par Raphaël après le premier essai : avec un deck de dix cartes, le joueur connaît vite toutes ses définitions, et l'épreuve devient une formalité. Désormais il est aussi interrogé sur **les mots de l'adversaire**, qui changent à chaque duel. Les chiffres marqués 🟡 ont été réglés au simulateur (`data/simulation-duel.md`) et restent à confirmer par Raphaël après essai.

**Mise en place**
- **Deck de 10 cartes** composé par le joueur. 🟡 **25 points de vie** chacun. **3 cartes en main.**
- **Construction du deck** (écran Deck) : on touche un timbre de sa collection pour l'ajouter, un timbre du deck pour le retirer ; le deck est enregistré dans la sauvegarde. Un bouton « Composer pour moi » aligne les dix cartes les plus fortes.
- **Deck de l'IA** : il répond carte pour carte à celui du joueur. 🟡 Mêmes raretés en Facile ; **un cran plus rares en Normal, deux crans en Difficile** (Commune → Peu commune → Rare → Épique → Légendaire), avec des cartes de force comparable (force = attaque + défense). Des mots plus rares frappent plus fort et, surtout, sont plus difficiles à parer : c'est le réglage qui pèse le plus sur la difficulté. Qui joue des mots rares affronte des mots rares.

**Déroulement d'une manche**
1. **L'ordinateur pose un mot** de sa main, face visible (sans sa définition) : au hasard en Facile, sa carte la plus solide sinon.
2. **Le joueur lui répond** par une carte de sa main. Il voit le mot adverse, et peut donc viser le triangle des types, l'enchaînement d'une langue, ou une bonne défense ; l'écran annonce ce qu'il infligerait et ce qu'il recevrait. **En duel, les cartes n'affichent pas leur définition** (elle est imprimée sur la carte partout ailleurs) : on révise ses cartes dans la collection, on est interrogé en duel.
3. **Épreuve sur son mot** : le jeu affiche **4 définitions** — la bonne et 3 leurres tirés de mots de **même nature grammaticale et de rareté voisine**. Le joueur a **15 secondes**. Trouvée : son attaque porte. Sinon, « le mot lui échappe » : pas d'attaque, et **la bonne définition est affichée** — c'est le moment où l'on apprend. Seules les définitions utilisables en quiz sont employées ; la définition demandée varie d'une fois sur l'autre quand le mot en a plusieurs, et le jeu préfère celle qui ne nomme pas un proche parent du mot.
4. **Parade sur le mot adverse** : même épreuve, sur le mot de l'ordinateur. Trouvée : le joueur **pare**, et ne reçoit que 🟡 **la moitié des dégâts** (arrondie en sa faveur). Sinon il reçoit l'attaque entière, et la définition du mot s'affiche. Si le joueur possède lui aussi ce mot, une bonne réponse compte pour sa maîtrise.
5. **Règlement** : l'attaque du joueur part la première ; si elle met l'ordinateur à zéro, le duel s'arrête là. Puis chacun pioche.
- **L'ordinateur ne passe pas d'épreuve.** 🟡 Il connaît son propre mot 65 % du temps en Facile, 85 % en Normal, 90 % en Difficile (sinon son mot lui échappe). Et il pare le mot du joueur **d'autant moins souvent que ce mot est rare** : 70 % pour une Commune, 60 % Peu commune, 45 % Rare, 30 % Épique, 15 % Légendaire, 10 % Hors-série (chances multipliées par 0,7 en Facile).

**Les dégâts**
- Dégâts = attaque de la carte + bonus − 🟡 **la moitié de la défense** de la carte d'en face, **minimum 1**. (La première version du brief retirait la défense entière. Mesuré : attaque et défense étant notées sur la même échelle, elles s'annulent dès que les decks sont bons ; la moitié des attaques ne faisaient que 1 dégât.)
- 🟡 **Bonus d'attaque par rareté** : +0 / +0 / +1 / +2 / +3 / +4 (Commune → Hors-série), **non plafonné** — l'attaque d'une Légendaire peut dépasser 10. C'est lui qui rend vrai le principe du §1, « un mot rare est puissant, mais difficile à maîtriser » : mesuré, l'attaque brute (les lettres du mot) ne dépend pas de la rareté (5,2 de moyenne pour une Commune, 5,6 pour une Légendaire), et une carte rare ne frappait donc pas plus fort qu'une autre. Le timbre affiche l'attaque bonus compris, comme il le fait déjà pour la défense.
- **Triangle des types** (+2 dégâts) : Nom > Adjectif > Verbe > Nom. Les Adverbes sont neutres.
- **Bonus de faction** : +1 dégât si la carte précédente jouée par le même camp était de la même faction ; **+2 pour les petites factions** (seuil défini dans le fichier d'équilibrage), car enchaîner deux mots venus de l'arabe est bien plus difficile que deux mots latins.

**Fin de partie**
- Un camp tombe à 0 point de vie : il perd. (Les deux camps ne tombent jamais ensemble : l'attaque du joueur part la première.)
- Deck épuisé : la défausse est mélangée et reforme le deck.
- Limite de **20 manches** : le camp qui a le plus de points de vie gagne (égalité = match nul).
- **Récompense** : de l'Encre en cas de victoire — 🟡 20 (Facile), 30 (Normal) ou 45 (Difficile) pour les 3 premières victoires de la journée, un quart ensuite — et 5 Encre de consolation en cas de défaite. Trente victoires en un jour rapportent moins de 4 paquets : le duel récompense, il ne remplace pas les paquets (un test le vérifie).
- **Abandon** : quitter un duel en cours ne rapporte rien. Un duel interrompu n'est pas repris.
- **Accessibilité** : le temps de réponse se règle (normal, doublé, sans limite) dans les Réglages.

**Ce que donne le simulateur** (collection moyenne ; Facile / Normal / Difficile) : parties de 5 à 9 manches ; victoires d'un joueur hésitant 92 % / 57 % / 9 %, d'un bon lecteur 99 % / 88 % / 43 %, d'un expert 100 % / 95 % / 77 %, d'un bon lecteur qui connaît son deck par cœur 100 % / 92 % / 72 %. Ce dernier ne pare plus que 65 % des attaques en Difficile : l'épreuve ne redevient jamais une formalité.

**Pistes écartées pour l'instant** (proposées le même jour) : « Maîtriser pour avancer » (la récompense vient des mots nouvellement maîtrisés, plus des victoires répétées) et « le deck du jour » (un défi quotidien avec dix cartes imposées, tirées de sa propre collection). Elles restent compatibles avec la parade.

**Variante de question « De quelle langue vient ce mot ? »** : prévue « si le temps le permet », **laissée de côté le 22/09/2026**. Raison : l'origine est imprimée en haut du timbre, et l'encre du timbre est celle de sa faction ; le joueur vient de voir le mot adverse posé sur la table quand la question lui serait posée — la réponse serait sous ses yeux. Deux pistes si Raphaël y tient : ne la poser qu'en parade, sur un timbre adverse imprimé à l'encre grise et sans mention d'origine pendant toute la manche ; ou une autre question qui ne se lit pas sur le timbre (« lequel de ces mots a cette définition ? », l'inverse de l'épreuve actuelle). Dans les deux cas, le double d'un joueur (joutes) devrait apprendre à répondre à cette question comme lui : de nouvelles données à garder. À décider avec le public visé (§10.3).

### 5.5 Simulateur d'équilibrage
Commande `npm run simulation:duel` (rapport dans `data/simulation-duel.md`) : des joueurs fictifs — hésitant, bon lecteur, expert, et « bon lecteur qui connaît son deck par cœur », dont les chances de retrouver une définition baissent avec la rareté du mot — ouvrent de vrais paquets, alignent leurs dix meilleures cartes et affrontent l'ordinateur aux trois niveaux, 3 000 duels par ligne. Le rapport donne la **durée d'une partie**, le taux de victoire du joueur, la part d'attaques à 1 dégât, la part d'attaques parées, le nombre de cartes rares dans les decks, et des variantes « et si… ». **Cible : 6 à 10 manches par partie** — à peu près atteinte avec les réglages actuels (5,3 à 9,2 selon les profils ; les plus courtes sont celles des joueurs qui alignent beaucoup de cartes rares). C'est l'outil qui permet à Raphaël de régler les chiffres sans jouer des centaines de parties.

**Simulation de collection** (`npm run simulation:collection`) : simule des mois d'ouverture de paquets pour trois profils de joueur (occasionnel : 10 paquets par jour ; régulier : 30 ; acharné : 100) et affiche le temps nécessaire pour réunir 50 %, 90 % et 100 % de l'édition, le nombre de Légendaires par semaine et l'Encre gagnée. **Cible de départ : un joueur régulier termine l'édition en 6 mois à 1 an.** Cet outil sert à fixer la taille de l'édition, les taux de rareté et le prix des paquets, et à vérifier la règle de sécurité de l'économie (§5.2).

### 5.7 Joutes classées (duel différé contre d'autres joueurs)

Décidé par Raphaël le 21/09/2026 : il attendait du duel qu'il oppose des joueurs entre eux, avec un classement pour affronter des adversaires de son niveau. Voie retenue : le **duel différé**. On affronte le **double** d'un autre joueur — son deck, joué par l'ordinateur, qui connaît ses mots ni mieux ni moins bien que lui — sans que cet autre joueur ait besoin d'être connecté. Le duel contre l'ordinateur (§5.4) reste l'entraînement ; le duel en direct viendra quand il y aura assez de joueurs.

- **Les règles de la manche sont celles du §5.4.** Seules changent les chances de l'adversaire : le double retrouve son mot, et pare celui du joueur, d'après les **vrais résultats** de son joueur (mêlés à une estimation par défaut tant qu'ils sont peu nombreux). Le jeu retient pour cela, pour chaque joueur, les questions posées et réussies sur chacun de ses mots, et ses parades par rareté.
- **Classement** de type Elo (celui des échecs) : cote de départ 1 000, gain ou perte d'au plus 32 points par joute ; battre plus fort que soi rapporte davantage. 🟡 Six **ligues** : Apprenti, Lecteur (1 100), Lettré (1 250), Érudit (1 400), Académicien (1 550), Immortel (1 700).
- **Adversaires proposés** : trois à chaque fois — un plus faible, un de sa cote, un plus fort — en évitant ceux qu'on vient d'affronter. On voit leur pseudonyme, leur cote, les raretés de leur deck (pas leurs mots), et l'enjeu de la joute.
- **Pseudonyme choisi librement par le joueur**, avec un filtre des mots offensants appliqué dans le jeu et sur le serveur (`src/jeu/pseudo.ts`, liste dans `src/config/pseudos-interdits.ts`). Le jeu en propose aussi un, tiré de ses mots (« Frangipane 43 »).
- **Récompense** : 35 Encre par victoire, avec le même plafond quotidien que les duels d'entraînement.
- **État au 21/09/2026.** Tout le mode est jouable. Tant que le jeu n'a pas de serveur, les adversaires sont **240 « joueurs maison »** fabriqués par le jeu, et la cote est rangée sur l'appareil ; sur décision de Raphaël, l'écran ne le signale pas (voir la mise en garde de `BRIEF-joutes.md`). Le serveur est prêt à être branché : hébergeur **Supabase** (validé), scripts de la base dans `serveur/`, mise en route décrite pas à pas dans **`GUIDE-supabase.md`**. Il suffira alors de remplir `src/config/serveur.ts`.

### 5.6 Accélération : à l'Encre en V1, payante ensuite

**Direction décidée :** le modèle économique du jeu sera l'**accélération payante**. Le jeu est gratuit et généreux (un paquet toutes les 10 minutes), et le joueur pressé peut payer pour aller plus vite.

**En V1 (aucun argent réel) :** la seule accélération est l'achat immédiat d'un paquet avec de l'Encre (§5.2). Cela permet de tester la mécanique et de régler les prix.

**Plus tard (avec le backend) :** offres en argent réel — par exemple remplir le stock d'un coup, réduire le délai entre deux paquets pendant une durée donnée, ou agrandir le stock. **Décision n° 34 (22/09/2026) : une version payante du jeu** — paquets plus rapides, Encre, statistiques des prix du marché, achats et reventes illimités (le détail et les préalables sont dans `BRIEF-marche.md`, §7 bis). 🟡 Ce n'est pas faisable proprement en V1, pour trois raisons :
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
- **Design de carte** : le mot en grand, **sa définition imprimée sur la carte** (le sens principal, 150 caractères au plus ; les définitions complètes sont sur la fiche), type et faction, attaque et défense bien lisibles, rareté lisible sans la couleur, effet brillant pour Épique et Légendaire, badges de registre et de maîtrise. En tout petit (grille de la collection), la définition s'efface et le mot grossit.
- **Direction artistique : les joueurs ne voient presque que les cartes, elle doit donc sortir de l'ordinaire** (demande de Raphaël). Contrainte décisive : il est impossible d'illustrer des milliers de cartes à la main ; tout le décor d'une carte est donc **calculé à partir du mot lui-même** (chaque carte est unique, et toujours identique à elle-même). Trois pistes ont été maquettées sur de vraies cartes (elles restent consultables dans l'historique Git) :
  1. **Enluminure** — la carte est une entrée de manuscrit ; l'illustration est la lettrine du mot sur un fond ornemental ; rareté = richesse du cadre, jusqu'à la feuille d'or.
  2. **Affiche** — la carte est une affiche typographique : le mot en capitales énormes joue avec des formes géométriques ; un duo de couleurs par faction ; rareté = richesse de l'impression, jusqu'à l'encre irisée.
  3. **Passeport** — les mots sont des voyageurs : tampon de la langue d'origine, date d'entrée en français (la première attestation), rosace de sécurité unique, ligne « lisible par une machine » ; rareté = niveau de sécurité du document.
  **Piste retenue par Raphaël : les timbres** (issue de la piste Passeport, dont il a aimé les cachets). Chaque mot est un timbre-poste émis par sa langue d'origine : dentelure, attaque et défense dans les coins comme des valeurs faciales, nom de la langue en haut comme un pays émetteur, rosace gravée unique calculée à partir du mot, cachet d'origine daté de la première apparition du mot. La collection devient un album de timbres. La rareté se lit à la qualité de l'impression (une encre, deux encres, double cadre, encre argentée, dorure) ; s'y ajoute une **finition** indépendante de la rareté (normale, brillante, holographique) dont le reflet suit le doigt ou la souris. Code : `src/composants/carte/` (`Carte.tsx`, `Tampon.tsx`, `decor.ts`, `timbre.css`).
  La piste retenue sera affinée, dotée de ses propres polices (libres de droits, livrées avec le jeu, rien n'est chargé chez un tiers), puis appliquée à tout le site.
- En attendant, style sobre et neutre, facile à remplacer : **couleurs, polices et ornements centralisés dans un fichier de thème**.
- **Contenu (écran Réglages)** : options « Masquer les mots familiers » et « Masquer les mots injurieux » (§5.3).
- **Accessibilité (écran Réglages)** : allonger ou désactiver le chronomètre du duel, réduire les animations, couper le son. La rareté ne doit jamais être indiquée par la couleur seule (ajouter un symbole ou un libellé). Contrastes lisibles. **Contrôle fait en phase 4 (21/09/2026)** : tous les textes dépassent le contraste 4,5 pour 1 (la plupart 7 pour 1) et le contour des champs de saisie 3 pour 1 ; l'onglet du navigateur porte le nom de l'écran ; à chaque changement d'écran le clavier repart du titre, et un lien « Aller au contenu » saute le menu ; onglets et niveaux de duel se pilotent aux flèches ; pendant un duel, le mot demandé prend la main et la correction est dite en toutes lettres aux lecteurs d'écran. Reste à faire avec de vrais utilisateurs : un essai complet au lecteur d'écran (VoiceOver, TalkBack).

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
- **Vie privée** : la partie reste sur l'appareil du joueur, et le jeu n'embarque ni publicité ni outil de mesure d'audience. Seules les **joutes classées** envoient des données à un serveur (pseudonyme, cote, deck, compteurs de bonnes réponses, attachés à un compte anonyme) — et seulement à partir du moment où le joueur clique sur « Rejoindre les joutes », après avoir lu ce qui sera envoyé. La page **Confidentialité** du jeu (`#/confidentialite`, accessible depuis les Réglages) le décrit en clair et porte le bouton **« Supprimer mon profil de joute »** ; « Effacer ma partie » supprime aussi ce profil. Texte rédigé de bonne foi : **à faire relire par un juriste avant d'ouvrir le jeu au grand public**, en même temps que la question des mineurs (§10.3).

---

## 8. Plan de travail et critères de validation

| Phase | Contenu | Validé quand… |
|---|---|---|
| **0a. Exploration** *(travail fait le 21/09/2026, en attente de lecture)* | Dépôt Git, téléchargement des sources, compte rendu sur les données réelles, `SOURCES.md` | Raphaël a lu le compte rendu et confirmé ou corrigé les propositions 🟡 du §10.2 |
| **0b. Données** *(travail fait le 21/09/2026, en attente de lecture)* | Pipeline complet, base + Édition 1, rapport de génération, tests | Raphaël a relu `data/rapport.md` : la répartition et les exemples lui conviennent |
| **1. Squelette** *(fait, en ligne, et validé par Raphaël sur son téléphone le 21/09/2026)* | Projet Vite/React/TS, thème, navigation entre écrans vides, mise en ligne | Le site s'ouvre à une adresse web, sur le téléphone et sur l'ordinateur de Raphaël |
| **2. Paquets + Collection** *(fait et publié le 21/09/2026, avec les timbres, les finitions et le rang Hors-série ; en attente du test de Raphaël sur son téléphone)* | Tirage, recharge toutes les 10 minutes, animation, sauvegarde locale, export/import, Encre, collection filtrable, option « masquer les mots familiers », fiche carte, simulateur de collection | Les paquets se rechargent avec le temps, même application fermée, sans jamais dépasser 10 ; on retrouve sa collection après fermeture et on peut la restaurer depuis un fichier ; le simulateur de collection donne des durées qui conviennent à Raphaël |
| **3. Duel** *(fait et publié le 21/09/2026 ; en attente du test de Raphaël)* | Construction de deck, duel complet contre l'IA à 3 niveaux, simulateur de duel, maîtrise des mots et cachet « Maîtrisé » | Une partie se joue de bout en bout sans bug, gagnable et perdable ; le simulateur donne 6 à 10 tours en moyenne |
| **4. Finitions** *(fait le 22/09/2026 : page Confidentialité et « Rejoindre les joutes », accessibilité, sons du duel, partage d'un timbre en image, carillon et rareté annoncée à l'ouverture des paquets, crédits ; la variante de question est laissée de côté, voir §5.4. Reste la validation : Raphaël juge le ressenti — sons compris —, puis cinq testeurs suivent `GUIDE-testeurs.md` et leurs retours sont notés dans `RETOURS-testeurs.md`)* | Sons, effets de rareté, accessibilité, écran crédits, équilibrage, partage d'une carte en image, variantes de question | Raphaël valide le ressenti ; 5 testeurs extérieurs ont joué plusieurs jours et leurs retours sont notés |
| **3 bis. Joutes classées** *(mode fait et publié le 21/09/2026 ; serveur prêt à brancher)* | Duel différé contre le double d'un autre joueur, classement, ligues | Raphaël a suivi `GUIDE-supabase.md` ; deux appareils différents se retrouvent dans le même classement |
| **5. (futur)** | Backend complet, comptes, accélération payante, duel en direct, **marché** (échanges et enchères), éditions suivantes | Nouveau brief dédié. **Le marché est cadré dans `BRIEF-marche.md`** (22/09/2026) : il commence par mettre les collections sur le serveur, et pose dix décisions à Raphaël |

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
| 19 | Définition sur la carte | **La définition du mot est imprimée sur la carte** (sauf dans la main du joueur pendant un duel) |
| 20 | Hébergement | **GitHub Pages**, avec mise en ligne automatique à chaque envoi de code (`.github/workflows/mise-en-ligne.yml`). Le dépôt sera public |
| 21 | Direction artistique | **Les timbres** : chaque mot est un timbre-poste émis par sa langue d'origine (dentelure, valeurs dans les coins, rosace gravée calculée à partir du mot, cachet d'origine daté). Des **effets brillants et holographiques** s'ajoutent selon la rareté |
| 22 | Finitions | **Une même carte peut exister avec ou sans effet** (normale, brillante, holographique) : la finition est une variante de tirage qui ajoute de la rareté. Règles détaillées à valider (§10.2) |
| 23 | Publication | Claude peut **publier le site à chaque étape terminée et testée**, sans redemander |
| 24 | Timbres-poste | **Confirmé et appliqué à tout le jeu** : la carte est un timbre-poste (`src/composants/carte/`). L'Atelier provisoire et les trois autres pistes sont retirés |
| 25 | Rang ultime « Hors-série » | **Validé** : des mots qui détiennent un record, trouvés dans les données (`pipeline/etapes/records.ts`), plus ceux de `data/hors-serie.txt`. 16 cartes dans l'Édition 1, comptées à part de la collection. Chance : **1 paquet sur 1 000** (et non 1 sur 300 : le simulateur a montré qu'à 1 sur 300 un joueur régulier en tirait une par semaine) |
| 26 | Règles des finitions | **Validé** : finition tirée à part pour chaque carte ordinaire (brillante 1 sur 12, holographique 1 sur 80) ; chaque finition possédée compte à part ; seul un vrai doublon (carte et finition déjà possédées) devient de l'Encre, multipliée par 3 (brillante) ou 10 (holographique) |
| 27 | Prix du paquet | **150 Encre** |
| 28 | Idées retenues pour la suite | Cachet « Maîtrisé » daté sur le timbre quand le mot est maîtrisé en duel (**fait en phase 3** : griffe violette datée, après 5 bonnes réponses) ; séries par famille de mots ; album présenté en planches par langue avec emplacements vides secrets |
| 30 | Duel « mot contre mot », avec parade | **Décidé le 21/09/2026** : à chaque manche, le joueur retrouve la définition de son mot (il attaque) **et celle du mot adverse** (il pare), puis les dégâts sont réglés. Raison : avec dix cartes, on connaît vite ses définitions ; les mots de l'adversaire, eux, changent à chaque duel. Et « plus un mot est rare, plus il fait de dégâts » |
| 31 | Duels contre d'autres joueurs | **Décidé le 21/09/2026** : garder le duel contre l'ordinateur comme entraînement ; ajouter les **joutes classées** en duel différé (on affronte le double d'un joueur absent), avec classement et adversaires de son niveau (§5.7) ; garder le duel en direct pour plus tard. Hébergeur Supabase validé ; pseudonymes libres avec filtre ; le jeu ne signale pas les joueurs maison. Scripts et guide prêts (`serveur/`, `GUIDE-supabase.md`) ; reste à Raphaël à créer le projet |
| 29 | Polices | **Playfair Display**, police libre livrée avec le jeu (choisie le 21/09/2026 parmi trois familles à l'essai) ; Barlow Condensed pour les petites mentions en capitales |
| 33 | Marché : un timbre vendu quitte l'album | **Décidé le 22/09/2026** : on peut vendre n'importe lequel de ses timbres, pas seulement ses doubles — « c'est bien qu'un timbre disparaisse à la vente, ça crée une économie ». Voir `BRIEF-marche.md` §7 bis |
| 34 | Version payante | **Décidé le 22/09/2026** : une version payante du jeu donnera des paquets plus rapides, de l'Encre, les statistiques des prix du marché et des achats/reventes illimités. Précise la décision n° 7 (accélération payante). Conséquences et préalables (juriste, joueurs maison, mineurs, compte récupérable) dans `BRIEF-marche.md` §7 bis |
| 35 | Doublons et marché | **Décidé le 22/09/2026** : un doublon (même carte, même finition) reste changé en Encre ; pas de classeur de doubles |
| 36 | Récupération du compte | **Décidé le 22/09/2026** : e-mail par lien magique + code de secours. Le code d'abord (rien à régler), l'e-mail ensuite (service d'envoi à brancher) |
| 37 | Première brique du marché | **Décidé le 22/09/2026** : les enchères d'abord (durée fixe, clôture par le serveur), avec un prix d'achat immédiat facultatif proposé par Claude |
| 38 | La cote | **Décidé le 22/09/2026** : la cote du jour pour tous les joueurs ; l'historique et les statistiques des prix pour la version payante |
| 39 | Enchères : durée | **Décidé le 22/09/2026** : le vendeur choisit 12, 24 ou 48 heures |
| 40 | Enchères : achat immédiat | **Décidé le 22/09/2026** : prix d'achat immédiat facultatif, fixé par le vendeur |
| 41 | Enchères : commission | **Décidé le 22/09/2026** : 10 % de l'Encre payée disparaît |
| 42 | Marché : limites des joueurs gratuits | **Décidé le 22/09/2026** : 3 ventes en cours et 3 achats par jour ; aucune limite pour la version payante. **Révisé le soir même, après le simulateur de marché** : **10 ventes en cours et 10 achats par jour**. Raphaël avait demandé « monte le plafond à dix » pour les ventes ; le simulateur a montré que monter les ventes sans monter les achats fait passer les invendus de 30 % à 72 %, parce que les vendeurs deviennent plus libres que les acheteurs. Les deux plafonds sont donc montés ensemble : 392 ventes par jour et 24 % d'invendus, contre 119 ventes et 30 % d'invendus à 3 et 3. Voir `data/simulation-marche.md` |
| 32 | Rareté des coups de cœur non mesurés | **Calcul automatique seul** (choisi le 21/09/2026 parmi trois options) : le mot est rangé parmi les mots mesurés, d'après sa seule fréquence (§4.3). Pas de rareté écrite à la main : tout vient des données |

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
| Duel : points de vie et poids de la défense | **25 points de vie**, et **la moitié** de la défense d'en face retirée des dégâts (au lieu de 20 et de 100 % dans la première version du brief) : parties de 5 à 9 manches, presque plus d'attaques à 1 dégât | §5.4, `data/simulation-duel.md` |
| Duel : un mot rare frappe plus fort | Bonus d'attaque par rareté +0 / +0 / +1 / +2 / +3 / +4, non plafonné (une Légendaire peut dépasser 10), affiché sur le timbre ; et l'ordinateur pare d'autant moins qu'un mot est rare | §5.4 |
| Duel : la parade | Retrouver la définition du mot adverse divise par deux les dégâts reçus. L'attaque du joueur part la première | §5.4 |
| Duel : niveaux de l'ordinateur | Mots de même rareté (Facile), un cran plus rares (Normal), deux crans (Difficile) ; il connaît son mot 65 / 85 / 90 % du temps. Difficile est vraiment difficile : un bon lecteur y gagne 43 % des parties, un joueur hésitant 9 % | §5.4 |
| Duel : récompenses | 20 / 30 / 45 Encre par victoire, pleines pour les 3 premières victoires du jour puis un quart ; 5 Encre par défaite | §5.4 |
| Variante de question « De quelle langue vient ce mot ? » | Laissée de côté : l'origine est imprimée sur le timbre que le joueur vient de voir. Deux pistes si Raphaël y tient | §5.4 |
| Définitions trop parlantes en duel | Le jeu préfère déjà, quand un mot a plusieurs définitions, celle qui ne nomme pas un proche parent du mot (« cabale » pour « cabalistique »). Pour 63 cartes, toutes les définitions le font : question trop facile. À traiter au prochain passage du pipeline, ou par une autre question (« De quelle langue vient ce mot ? ») | §5.4 |

### 10.3 Questions de fond
- **Nom définitif du jeu** (« Mots de Maîtres » ?)
- **Public visé** : grand public, amoureux des mots, scolaire ? La réponse influencera le ton, la difficulté, le réglage par défaut de l'option « masquer les mots familiers » et, plus tard, les règles applicables aux achats (mineurs).
