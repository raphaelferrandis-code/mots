# Brief : refonte des écrans Duel (préparation du deck et partie)

## Contexte

Philamots est en ligne sur philamots.fr. Les écrans Duel existent déjà et fonctionnent : Jouer, Deck, Classement, la partie contre l'ordinateur, la parade par définition et l'écran de résultat.

Un prototype autonome a été réalisé : `docs/duel/prototype-duel.html`. C'est un seul fichier HTML sans dépendance. Il sert de **référence visuelle et comportementale** pour la refonte. Ouvre-le dans un navigateur, son activé, et joue au moins un duel complet en Facile, puis un en Normal, avant d'écrire la moindre ligne.

L'objectif est de rendre ces écrans plus clairs, mieux hiérarchisés et plus spectaculaires, **sans toucher aux règles du jeu**. C'est une refonte de présentation.

## Première étape obligatoire : lire le projet, puis me proposer un plan

Avant de coder :

1. Repère les composants, les routes et l'état des écrans Duel actuels : onglets Jouer / Deck / Classement, partie, parade et résultat.
2. Repère où vivent les règles : calcul des dégâts, bonus de type et d'origine, rareté, chance de parade de l'ordinateur, choix de l'ordinateur, pioche, récompenses et plafond quotidien.
3. Rends-moi un plan court. Il doit dire où chaque morceau du prototype va vivre, lister les écarts entre le prototype et les vraies règles, et indiquer ce que tu comptes réutiliser tel quel, à commencer par le composant timbre existant.

**N'implémente rien avant que j'aie validé ce plan.**

## Règles qui ne se discutent pas

- **Les règles du jeu ne changent pas.** Dans le prototype, la formule de dégâts (`dmg()`), les chances de parade, l'IA (`pickFoe()`), les récompenses, les mots, les définitions et le deck de l'ordinateur sont **inventés**. Garde les vraies règles et les vraies données, et ne reprends que la présentation. Si l'interface du prototype a besoin d'une donnée qui n'existe pas, signale-le au lieu de l'inventer.
- **Les aides de calcul ne s'affichent qu'en Facile contre l'ordinateur.** Voir la section dédiée plus bas. C'est une règle de game design, pas un détail d'affichage.
- **Le composant timbre existe déjà sur le site : réutilise-le.** `buildStamp()` dans le prototype n'est qu'une doublure. Si le composant existant ne permet pas un usage prévu ici (verso pour la révélation de l'adversaire, aperçu transparent, petite taille dans la main), étends-le au lieu d'en créer un second.
- **On ne touche ni à l'auth, ni aux récompenses côté serveur.** L'écran de fin affiche ce que le serveur a réellement accordé.

## 1. La hiérarchie des boutons (à appliquer partout dans Duel)

Un seul bouton principal par écran. Il indique toujours l'action suivante.

- **Principal** (`.btn-primary`) : fond cuivré avec les bords dentelés d'un timbre. Exemples : Lancer le duel, Jouer « mot », Manche suivante, Voir le résultat, Rejouer.
- **Secondaire** (`.btn-secondary`) : contour cuivré, fond transparent. Exemples : Modifier / Terminer (deck), Composer pour moi, Changer d'adversaire.
- **Tertiaire** (`.btn-tertiary`) : simple lien souligné. Exemples : Voir le classement, Modifier mon deck (depuis la fin de partie).
- **Actions destructives** : « Abandonner » et « Vider le deck » sont des liens tertiaires rouges, discrets. Le premier clic les arme (« Confirmer l'abandon »), le second les exécute, et ils se désarment seuls après 3 secondes (`resetQuit()`, `#clear-btn`).

Le bouton principal n'est jamais désactivé sans explication. Si le deck est incomplet, la légende à côté du bouton le dit : « Il manque 2 timbres à ton deck. »

## 2. L'écran de préparation (Jouer et Deck réunis)

Les onglets Jouer et Deck ne forment plus qu'un seul écran. La préparation est à gauche, le deck à droite. Sur mobile, tout s'empile et le bouton principal reste collé en bas de l'écran. Classement devient un lien tertiaire.

- **Modes** (`renderModes()`) : Entraînement, Joutes classées, Défier un ami et Mon équipe deviennent quatre onglets de même niveau, au lieu du mélange actuel d'onglets et de boutons. Le titre, le sous-titre et le libellé du bouton principal s'adaptent au mode choisi (`renderOpps()`, `renderCTA()`).
- **Adversaire** : trois cartes Facile / Normal / Difficile (radio). Chacune a une phrase qui dit concrètement ce que le niveau change, la récompense en gros et une coche sur la carte choisie. Les phrases du prototype sont des exemples, à caler sur le vrai comportement de l'ordinateur.
- **Temps par définition** : le menu déroulant devient trois pastilles (radio).
- **Récompense du jour** : les victoires restantes à pleine récompense s'affichent en gouttes d'encre, avec la règle de la défaite en note.
- **Légende du bouton principal** : un résumé du choix, par exemple « Normal · 15 s par définition · jusqu'à +30 encre ».

### Le panneau deck

- **Grille des 10 timbres**, avec les emplacements vides dentelés.
- **Édition sur place** : « Modifier » passe le panneau en mode édition. Chaque timbre du deck reçoit une pastille pour le retirer, et la collection apparaît en dessous avec une pastille pour ajouter. Ajouter à un deck plein fait trembler le timbre et affiche un message. « Composer pour moi » et « Vider le deck » n'apparaissent qu'en mode édition.
- **Analyse du deck** : le triangle des types (`triSVG()`) montre la répartition du deck sur chaque type, avec les flèches qui indiquent qui bat qui. Une phrase générée donne la force et le point faible (`insightsHTML()`). Les pastilles d'origine mettent en valeur celles qui peuvent s'enchaîner. **Tout doit venir des vraies règles** : types, bonus et origines qui comptent comme « petite langue ».

## 3. La partie

### Disposition

- **En-tête** : l'ordinateur à gauche, toi à droite. Les barres de vie sont graduées (un trait par point) et se vident en deux temps, avec une traînée rouge qui suit. Elles clignotent quand il reste 5 points ou moins.
- **Historique** : dix losanges en haut (`renderPips()`) marquent chaque manche gagnée, perdue ou nulle, avec la manche en cours en surbrillance. Ils remplacent le texte « Manche 1 / 10 ».
- **Le ring** : « Son mot » et « Ton mot » se font face, avec le médaillon au centre. Sous chaque timbre, des pastilles donnent le type et l'origine, puis le résultat de la manche.
- **Barre d'action**, toujours au même endroit sous le ring : une phrase d'état et le bouton principal de l'étape en cours.
- **La main** en bas, avec la pioche à droite (une pastille « 7 en pioche » sur mobile).
- **« Abandonner »** passe en lien tertiaire en haut à gauche, avec confirmation.

### Déroulé d'une manche (machine à états)

`deal` → révélation du mot adverse → `choose` → `play` → `parade` → `resolve` → `recap`.

- **Révélation adverse** : le timbre arrive face cachée, puis se retourne.
- **Choix** : toucher un timbre le sélectionne. Il se soulève et apparaît en transparence dans ta case. Toucher à nouveau, double-cliquer ou appuyer sur le bouton principal le joue. Au clavier, les touches 1 à 3 sélectionnent.
- **Parade** (`parade()`) : panneau plein écran avec le mot en grand, son type, un minuteur circulaire qui vire au rouge à 5 secondes (avec un tic sonore) et quatre définitions (touches 1 à 4). Le retour est immédiat : bonne réponse en vert, mauvaise en rouge, bonne réponse toujours révélée.
- **Résolution** (`resolve()`) : un bouclier apparaît si l'ordinateur pare, une fissure sinon. Puis les deux timbres s'élancent l'un vers l'autre, avec des éclats d'encre au centre et un tremblement proportionnel aux dégâts. Les dégâts s'envolent au-dessus de chaque timbre (« −3, paré, au lieu de 6 ») et les barres de vie se vident.
- **Récapitulatif** : une phrase qui résume les dégâts infligés et subis, puis « Manche suivante » ou « Voir le résultat », qui reçoit le focus.

### Aides de calcul : uniquement en Facile contre l'ordinateur

Dans le prototype, tout passe par `aids()`, qui vaut `true` seulement quand le niveau est Facile.

**En Facile uniquement**, le joueur voit :

- sous le médaillon, un indice sur le mot adverse (« Son adjectif est fort contre les verbes. Contre-le avec un nom ») ;
- à la sélection d'un timbre, le rapport de force de type (« Ton nom bat son adjectif, +2 pour toi ») ;
- les dégâts prévus dans les deux sens (« Tu infligerais 7 dégâts. Il t'en infligerait 4, ou 2 si tu pares. ») ;
- le détail du calcul en pastilles (base, type, enchaînement, rareté) ;
- la pastille « Enchaînement » sous les timbres.

**Dans tous les autres cas** (Normal, Difficile, joutes classées, duels entre amis, équipe), aucune de ces aides n'apparaît. La sélection affiche seulement « Prêt à opposer « mot » à « mot adverse » ? » et le bouton pour jouer. Le résultat chiffré de la manche reste affiché après coup, dans tous les modes, puisque c'est un constat et non une aide.

Branche cette condition sur le vrai niveau et le vrai mode de la partie, pas sur une variable d'interface qu'on pourrait contourner facilement.

### Intro et fin

- **Intro** (`intro()`) : les deux adversaires glissent depuis les bords, et « Duel » tombe au centre comme un coup de tampon.
- **Fin** (`finishDuel()`) : un sceau, le titre Victoire, Défaite ou Égalité, et une phrase de contexte (« L'ordinateur tombe à la manche 6 »). Les gains d'encre et d'XP défilent, le compteur d'encre du menu se met à jour, et trois statistiques s'affichent : parades réussies, dégâts infligés et meilleur coup. Les boutons suivent la hiérarchie : Rejouer (principal), Changer d'adversaire (secondaire), Modifier mon deck (tertiaire, qui ouvre directement le deck en mode édition).

## Effets à reprendre

- **Sons synthétisés** (`Sfx`) : sélection, carte, choc, bouclier, bonne et mauvaise réponse, tic du minuteur, victoire, défaite. Aucun fichier son. Le réglage muet est partagé avec le reste du site.
- **Particules** (`FX`) : encre, étincelles, confettis.
- **Fond animé** (`BG`), déjà présent côté accueil : réutilise-le.
- Le panneau de parade, l'intro et l'écran de fin sont en `position: fixed` : ils couvrent tout l'écran, pas seulement la zone de jeu.

## Exigences de qualité

- **Accessibilité.** De vrais boutons, avec `role="radio"` et `aria-checked` pour les choix de niveau et de temps. Focus visible, focus déplacé sur l'action principale à chaque étape, `aria-live` sur la barre d'action, et `prefers-reduced-motion` respecté.
- **Mobile d'abord.** Le prototype est calé pour tenir sur un écran de 390 × 844 sans défilement pendant la partie. Les tailles du ring et de la main dépendent de la hauteur d'écran (`--rw`, `--hw`, en `dvh`). Aucun défilement horizontal.
- **Performance.** Le filtre de grain des cachets et le chemin du texte circulaire sont définis une seule fois dans un SVG global (`#inkgrain`, `#pmc`) plutôt que dans chaque timbre. Les rosaces sont mises en cache par mot. Garde ces optimisations.

## Ordre de travail proposé

Chaque lot se termine par une démo que je valide avant de passer au suivant.

1. **La hiérarchie des boutons**, appliquée aux écrans Duel existants. C'est un gain rapide et visible.
2. **L'écran de préparation réuni**, avec les modes, l'adversaire, le temps, la récompense du jour et le bouton principal avec sa légende.
3. **Le panneau deck** : édition sur place, triangle et analyse.
4. **La disposition de la partie** : en-tête, historique, ring, barre d'action, main, sélection, et les aides réservées au niveau Facile.
5. **La nouvelle parade.**
6. **La résolution animée et les sons.**
7. **L'intro et l'écran de fin.**

## Points que je dois trancher (pose-moi la question, ne décide pas seul)

- Où placer l'accès au Classement une fois les onglets Jouer et Deck réunis : simple lien, onglet à part ou entrée dans le menu principal ?
- Les phrases descriptives des niveaux et les indices affichés en Facile te conviennent-ils, une fois calés sur les vraies règles ?
- Faut-il garder l'ordre actuel, où le mot adverse est révélé avant que le joueur choisisse le sien ? Le prototype le suppose.
- Les modes Joutes classées, Défier un ami et Mon équipe sont seulement esquissés dans le prototype. Veux-tu les traiter dans la même passe ou plus tard ?
