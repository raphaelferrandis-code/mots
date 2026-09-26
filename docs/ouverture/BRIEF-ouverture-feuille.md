# Brief : ouverture de paquet en feuille de timbres

## Contexte

Philamots est en ligne sur philamots.fr, avec une authentification Supabase par Google. Le composant timbre existe déjà sur le site. Une cérémonie d'ouverture de paquet a peut-être déjà été intégrée à partir d'un brief précédent, où les timbres sortaient du paquet en pile, un par un.

Cette nouvelle version **remplace la pile par une feuille de timbres**. Le paquet déchiré laisse sortir une feuille pliée, côté gomme. Elle se déplie, et le joueur choisit :

- **soit** de détacher les timbres un par un depuis le dos, chacun se retournant en l'air ;
- **soit** de retourner toute la feuille pour découvrir tous les timbres d'un coup, dans une cascade de coups de tampon.

Les deux façons se combinent librement.

La référence est `prototype-ouverture-feuille.html`, un fichier HTML autonome sans dépendance. Ouvre-le dans un navigateur, son activé, et joue au moins trois paquets :

- un en détachant tout depuis le dos ;
- un en retournant la feuille tout de suite ;
- un en mélangeant les deux (détache un ou deux timbres au dos, puis retourne).

Teste aussi sur une largeur de téléphone.

## Première étape obligatoire : lire le projet, puis me proposer un plan

Avant de coder :

1. Regarde ce qui existe déjà : la cérémonie d'ouverture actuelle si elle est en place, le composant timbre, la manière dont un paquet est ouvert et dont les timbres sont attribués côté Supabase, et la collection.
2. Rends-moi un plan court. Il doit dire ce que tu réutilises, ce que tu remplaces (la pile de timbres), et où vit chaque morceau de la feuille. Liste aussi les écarts entre le prototype et les vraies règles du jeu.

**N'implémente rien avant que j'aie validé ce plan.**

## Règles qui ne se discutent pas

- **Le tirage se fait côté serveur.** Le contenu du paquet et la position de chaque timbre sur la feuille sont décidés et enregistrés avant l'ouverture. La feuille ne fait qu'afficher ce résultat. Dans le prototype, le tirage a lieu dans le navigateur et le premier paquet est truqué pour contenir toutes les raretés. Rien de cela ne part en production, sauf si je le demande.
- **Détacher un timbre est purement visuel.** Les timbres sont déjà acquis à l'ouverture. Si le joueur quitte la page au milieu de la feuille, il ne perd rien. À son retour, la feuille peut reprendre là où il s'était arrêté, ou ses timbres sont simplement dans sa collection : propose-moi l'option la plus simple.
- **Réutilise le composant timbre existant.** `buildStamp()` dans le prototype n'est qu'une doublure. Il te faut trois variantes du même composant :
  - dans la feuille, sans découpe dentelée ;
  - détaché, avec la découpe dentelée ;
  - face cachée, qui montre le verso.
  Étends le composant si besoin plutôt que d'en créer un second.
- **Vraies données.** Les mots, raretés, valeurs, numéros et définitions viennent du jeu. Si le prototype affiche une donnée qui n'existe pas, signale-le au lieu de l'inventer.
- **On ne touche pas à l'auth.**

## La feuille

### Géométrie (fonctions `LY()`, `cellRect()`, `perfSVG()`)

- **Grille.** 3 colonnes × 2 rangées sur ordinateur, 2 colonnes × 3 rangées sur téléphone (sous 700 px). Cela fait 6 emplacements : 5 timbres et une vignette d'édition.
- **Unités.** Chaque emplacement mesure 300 × 380 unités, au même ratio que le timbre. Les marges font 64 unités sur les côtés, 124 en haut (146 sur téléphone) et 84 en bas.
- **Perforations.** Ce sont des cercles de rayon 7, espacés de 20 unités, posés sur les limites entre emplacements. Ils sont calés exactement sur la découpe dentelée du timbre détaché, pour que ses dents correspondent aux trous laissés dans la feuille. Garde ce calage.
- **Miroir.** Au dos, la colonne `c` devient `nb_colonnes − 1 − c`. Un timbre détaché depuis le dos laisse donc un trou au bon endroit quand on retourne la feuille, comme sur une vraie feuille.
- **Vignette d'édition.** C'est toujours le dernier emplacement (en bas à droite au recto). Elle porte le numéro du paquet et « Édition originale ». Elle ne se détache pas.

### Les deux faces

- **Recto.** On y trouve le titre PHILAMOTS sur une bande guillochée, la mention « Paquet n° … · Édition originale · 5 timbres », les repères de couleur, le coin daté, la mention d'imprimerie et les timbres. Au survol, un timbre se soulève légèrement.
- **Verso.** Papier gommé avec un reflet qui suit la souris, filigrane « P », numéro de chaque emplacement, « Verso gommé · Humecter pour coller » et numéro de feuille.
- **Halo des raretés au verso** (classes `g-dore`, `g-holo`, `g-faute`) : doré pulsant, irisé tournant, rouge qui vacille. Les timbres courants n'ont pas de halo. C'est un choix de game design, voir mes questions à la fin.
- **Une seule source de vérité.** `renderSheet()` reconstruit les deux faces à partir de l'état : détaché ou non, révélé ou non. Un timbre détaché devient un trou sur les deux faces.

## Le déroulé

C'est une machine à états : `tear` → `emerging` → dépliage → `sheet` → `end`.

1. **Déchirure du paquet.** Elle ne change pas : on glisse le long des pointillés, ou on utilise le bouton « Déchirer d'un coup ».
2. **Sortie de la feuille** (`completeTear()`). La feuille pliée apparaît derrière le paquet : seule sa moitié haute est visible, grâce à `clip-path: inset(0 0 50% 0)`. Elle monte hors du paquet, le paquet tombe, puis la feuille se place au centre.
3. **Dépliage** (`unfold()`). Un volet, copie de la moitié basse du verso, pivote de −178° à 0° autour de la ligne de pli (`rotateX`, `backface-visibility: hidden`). Il dépasse un peu avant de se stabiliser, puis on retire le volet et le `clip-path`.
4. **Choix.** Le texte invite à détacher un timbre ou à retourner la feuille. Le bouton principal est « Retourner la feuille ».
5. **Détacher un timbre** (`detach()`, `revealFocused()`, `stow()`).
   - Des fibres de papier partent le long des perforations, avec le bruit de déchirure. Le timbre s'envole au premier plan, sur un fond assombri. Les consignes et le plateau sont masqués pendant ce temps.
   - Détaché au dos, il arrive face cachée. S'il est rare, il tremble avant de se retourner en deux temps. Suivent le coup de tampon et l'effet de sa rareté : reflet doré, étincelles holographiques, ou flash, confettis et marque « FAUTÉ ».
   - Détaché au recto, il est déjà révélé et s'affiche directement.
   - La fiche du mot apparaît (rareté, nouveau ou doublon, définition), puis « Ranger ce timbre » l'envoie dans le plateau. Toucher le timbre ou appuyer sur Échap fait la même chose.
6. **Retourner la feuille** (`flipSheet()`, `cascade()`).
   - La feuille pivote en deux temps (`perspective() rotateY`, 0 → 90°, changement de face, −90 → 0).
   - Au premier passage au recto, les coups de tampon tombent en cascade sur les timbres pas encore révélés, du courant vers le fauté. Le fauté arrive en dernier, après un temps de suspense et un flash.
   - On peut retourner la feuille autant de fois qu'on veut.
7. **Tout détacher** (`collectAll()`, recto seulement). Les timbres restants partent un à un vers le plateau, avec la déchirure à chaque fois.
8. **Fin** (`endPack()`). La feuille vide s'en va, le plateau s'agrandit et un résumé s'affiche (« 2 courants, 1 doré… »). Deux actions : « Ranger dans l'album » et « Ouvrir un autre paquet ».

## Pièges rencontrés pendant le prototype

- **Collision de noms de classes.** La feuille et le timbre avaient tous deux une classe `.face`, et la découpe dentelée du timbre s'appliquait à la feuille entière. Les faces de la feuille s'appellent donc `.sface`, `.sfront` et `.sback`. Isole bien les styles des deux composants.
- **Découpe du timbre dans la feuille.** Les timbres posés dans la feuille ne doivent pas avoir de découpe dentelée : ce sont les trous de perforation qui dessinent les bords. La classe `.insheet` la désactive.
- **Largeur des timbres.** Dans les cellules, le plateau, la vue rapprochée et le timbre en vol, force la largeur à 100 %. Sinon, la largeur par défaut du timbre prend le dessus.
- **Clones et identifiants.** Le volet du dépliage clone le verso. Retire les `id` du clone et rends ses boutons non focalisables.
- **Perspective.** Le parent qui gère l'inclinaison à la souris aplatit la 3D. La perspective du retournement est donc écrite directement dans les images clés : `perspective(1800px) rotateY(…)`.
- **Taille de la feuille.** `sizeSheet()` la calcule à partir de la hauteur réellement visible (`visualViewport`) et du ratio de la grille, puis expose l'unité `--u` pour les petits textes du verso.

## Exigences de qualité

- **Accessibilité.**
  - Chaque emplacement est un vrai `<button>`. Au verso, son libellé est « Timbre 3, face cachée. Détacher pour le découvrir » ; au recto, c'est le mot et sa rareté.
  - La page est utilisable entièrement au clavier : Entrée pour détacher, Échap pour ranger.
  - La zone de texte utilise `aria-live`.
  - `prefers-reduced-motion` est respecté.
- **Mobile d'abord.** La grille passe en 2 × 3. Le glisser pour déchirer fonctionne au doigt (`touch-action: none` sur la scène pendant la déchirure). Aucun défilement horizontal.
- **Performance.** Au moins 60 fps sur téléphone. Au plus deux faces dans le DOM, et une seule visible. Les particules s'arrêtent quand elles ont fini.
- **Sons.** Ils restent synthétisés, sans fichier, et le réglage muet est partagé avec le reste du site.

## Ordre de travail proposé

Chaque lot se termine par une démo que je valide avant de passer au suivant.

1. **La feuille statique**, recto et verso, branchée sur un vrai paquet ouvert, dans ses deux dispositions (ordinateur et téléphone).
2. **La sortie du paquet et le dépliage.**
3. **Détacher un timbre** depuis le dos et depuis le recto : déchirure, envol, révélation, rangement.
4. **Le retournement de la feuille et la cascade de tampons.**
5. **« Tout détacher », l'écran de fin et le lien avec la collection.**
6. **Les finitions** : sons, mouvement réduit, passe de performance sur téléphone.

## Points que je dois trancher (pose-moi la question, ne décide pas seul)

- **Le halo au verso** révèle la rareté avant qu'on retourne le timbre. On le garde pour l'effet d'attente, ou on le retire pour préserver la surprise ?
- **Le nombre de timbres par paquet** est-il toujours 5 ? Sinon, comment la grille doit-elle s'adapter (3 timbres, 10 timbres…) ?
- **Le contenu de la vignette d'édition** : numéro de paquet, série, date ? Doit-elle devenir un objet de collection à part entière ?
- **À la fin**, les timbres passent-ils par le plateau puis « Ranger dans l'album », ou vont-ils directement dans la collection ?
- **Un joueur qui revient** au milieu d'une feuille : reprendre la feuille, ou considérer le paquet comme déjà ouvert ?
