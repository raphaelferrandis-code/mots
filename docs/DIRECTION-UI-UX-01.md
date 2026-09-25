# Direction 01 — Le mot fait le jeu

Proposition du 23 septembre 2026. Hypothèse de design, pas direction validée.

## L'intention

**Découvrir un mot, s'attacher à son timbre, puis gagner parce qu'on le connaît.**

Philamots doit ressembler à un album de collection que l'on met en jeu. Le timbre reste l'objet précieux ; l'interface autour rend ses usages évidents. L'esthétique recherchée est éditoriale, calme et tactile, avec une tension plus nette au moment de jouer.

Le parti pris n'est pas de tout transformer en bureau ancien. On garde la nuit, le papier, les rosaces et les cachets. On évite les accessoires décoratifs — bois, plumes, cire — qui ajouteraient une scénographie sans aider le jeu.

## Le périmètre de preuve

Un seul parcours : **album → fiche → remplacement dans un deck complet → première manche**.

La maquette associée est une simulation indépendante. Les mots et définitions reprennent des exemples du jeu ; les possessions, progrès de maîtrise et résultats sont des données de démonstration. Les timbres y sont réinterprétés sommairement, pas repris pixel pour pixel. Elle ne touche ni à la partie réelle ni au serveur. La navigation est limitée aux espaces étudiés : ce n'est pas une décision de supprimer les autres destinations du jeu.

## Quatre décisions qui engagent la direction

### 1. Dans l'album : le timbre à regarder, le mot à retrouver

Conserver le format dentelé et le motif abstrait. Ajouter hors du timbre un nom lisible et sa rareté, dans une légende courte et stable. Les textes indispensables ne doivent pas dépendre des minuscules mentions gravées. Une carte compacte ne sera plus une grande carte simplement réduite.

La rosace reste un élément d'identité, mais elle ne doit pas monopoliser la lecture. La proposition permet de comparer deux proportions de gravure. Aucune illustration littérale supplémentaire n'est requise pour cette étape.

**Renoncement :** pas de nouveaux objectifs, de séries, de filtres supplémentaires ou de badges de récompense pour rendre l'album artificiellement plus riche.

### 2. Sur la fiche : découvrir, puis agir

Le mot et sa définition occupent le premier niveau. Le timbre reste visible, avec sa rareté, son origine et sa progression en duel. Les actions liées au deck sont proches du contenu. Un retour explicite ramène à l'album avec son contexte conservé.

**Renoncement :** pas de formulaire de vente ouvert par défaut, pas de cote qui précède le sens du mot. Les fonctionnalités économiques pourront rester accessibles comme actions secondaires lors d'une extension ultérieure.

### 3. Dans le deck : remplacer sans déconstruire

Un deck complet reste éditable. Le joueur choisit explicitement le timbre à remplacer et voit le candidat entrant. La validation indique les deux mots ; Annuler permet de revenir sur le dernier remplacement. L'inspection d'un timbre ne le retire jamais.

Sur mobile, le compteur et l'action de jeu précèdent la longue liste. Les données tactiques ont des libellés : attaque, défense, bonnes réponses. On montre les réussites enregistrées, sans prétendre mesurer la connaissance réelle du joueur.

**Renoncement :** pas de note globale de puissance inventée, pas de recommandation automatique présentée comme objectivement optimale.

### 4. En duel : un choix, une question, une conséquence

La main utilise un format tactique, plus compact que la fiche d'admiration. Le choix reste modifiable avant « Jouer ». Les dégâts annoncés sont conditionnels. Attaque et parade ont une transition explicite dans cette proposition ; le joueur déclenche le passage à la seconde question.

Le bilan relie réponse, dégâts et vie restante. La définition correcte reste lisible. Le temps de réponse et les règles du jeu ne sont pas changés par cette direction ; la maquette laisse le temps de lire, pour évaluer la présentation indépendamment de la pression temporelle.

**Renoncement :** pas d'effets spectaculaires ajoutés pour masquer une résolution difficile à comprendre. Le coût de la transition manuelle — un geste supplémentaire par manche — doit être testé.

## Grammaire visuelle

- Le papier est réservé au timbre ; le fond et la lecture restent sobres.
- La serif porte le mot et les titres ; une sans-serif lisible porte les commandes et les règles.
- L'orange signale la prochaine action importante. La réussite et l'erreur ont leurs propres signes et libellés.
- Les filets séparent de vrais ensembles. On évite un encadré indépendant autour de chaque information.
- Un même objet peut avoir trois présentations : collection, lecture, tactique. Ses caractéristiques et son identité restent reconnaissables.
- La couleur d'origine n'est pas utilisée pour coder simultanément rareté, sélection et résultat.

## Ce qui ferait rejeter la direction

Avant généralisation, comparer ce parcours à l'existant avec cinq personnes découvrant le jeu. Alterner l'ordre de présentation pour réduire l'effet d'apprentissage. Ce petit échantillon donne des signaux qualitatifs, pas une validation statistique.

| Épreuve | Critère provisoire | Signal de rejet ou de révision |
|---|---|---|
| Retrouver un mot, lire sa fiche, revenir | Le contexte de recherche et la position sont conservés ; au moins 4 personnes sur 5 terminent sans aide. | Retour ambigu ou recherche recommencée. |
| Remplacer une carte d'un deck complet | Au moins 4 sur 5 comprennent l'action sans retirer préalablement une carte et peuvent nommer ce qui entre et sort. | Confusion persistante entre consulter, choisir et remplacer. |
| Lire les cartes sur un téléphone | Le mot et la rareté sont identifiés sans zoom ; l'action de jeu est repérée sans parcourir tout le deck. | Le décor continue de gêner les informations utiles. |
| Expliquer une prévision | Au moins 4 sur 5 comprennent que les dégâts dépendent des réponses. | Les nombres sont encore pris pour des dégâts acquis. |
| Passer de l'attaque à la parade | Les joueurs savent quel mot ils doivent définir ; observer aussi le rythme sur plusieurs manches. | Le geste supplémentaire devient une gêne répétée ou casse le plaisir. |
| Reconnaître Philamots | Recueillir d'abord les mots spontanés, puis comparer le plaisir de collectionner avec l'existant. | La proposition est perçue comme un inventaire utilitaire et les timbres perdent leur attrait. |

La préférence esthétique de l'auteur reste une décision artistique explicite, distincte des résultats de ces tâches. Une interface plus rapide ne suffit pas si elle rend les mots moins désirables.

## Décision après l'essai

Garder les changements qui améliorent les tâches sans affaiblir l'identité. Réviser ou retirer les autres. Ne pas étendre ce langage à l'accueil, aux paquets, au marché et au compte tant que ce parcours ne tient pas. Les corrections factuelles de l'audit — erreurs de destination, textes obsolètes, perte silencieuse d'un duel — restent utiles indépendamment de l'adoption de cette direction.
