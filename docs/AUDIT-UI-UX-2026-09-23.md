# Philamots — audit UI/UX du 23 septembre 2026

## Diagnostic

Philamots possède une identité : timbres dentelés, papier, typographie éditoriale, cachets et vocabulaire de collectionneur. Ce socle mérite d'être conservé. L'impression de « vibe codé » vient surtout de l'assemblage : les fonctions existent, mais les transitions entre elles, leur hiérarchie et les états secondaires ne forment pas encore une expérience continue.

Le jeu alterne entre un objet de collection assez soigné, une grille de catalogue, un formulaire de gestion et un questionnaire. Le joueur doit souvent comprendre lui-même comment passer de l'un à l'autre. Des textes décrivent encore un ancien fonctionnement, ce qui accentue l'impression de prototype.

« Vibe codé » désigne ici des symptômes de finition ou de conception, pas une conclusion sur la façon dont le code a été produit. Les jugements esthétiques sont explicitement des appréciations de design.

## Périmètre et méthode

- Audit du code local, y compris les modifications déjà présentes au début de la session. Aucun fichier du jeu n'a été modifié.
- Navigation réelle dans l'aperçu Vite local : accueil neuf et rempli, ouverture de deux paquets, album, recherche sans résultat, fiche de timbre, deck vide puis complet, salon des duels, sélection de carte, attaque, parade, bilan de manche, réglages, confidentialité, marché indisponible, formules et galerie.
- Joutes inspectées en simulation locale : entrée, pseudo proposé, profil, adversaires et ouverture du classement. Aucun serveur réel activé pour cet audit.
- Rendu principal autour de 1280 × 720 ; contrôles ciblés à 390 × 844 sur accueil, album, deck et joutes ; contrôle de navigation à 768 × 900. Ce n'est pas une validation exhaustive sur tous les téléphones.
- Marché connecté, vente, compte serveur, historique de cote, résultats finaux et erreurs réseau : analyse du code, sans prétendre avoir exercé ces états à l'écran.
- Aucun achat, aucune vente et aucune suppression exécutés. La partie utilisée pour les essais est celle de l'aperçu local.

**Preuves :** V = constat à l'écran ; C = constat dans le code ; H = hypothèse d'effet utilisateur à valider par test. Un constat V peut également être confirmé par le code.

**Priorités :** P1 = corriger avant une refonte cosmétique, car le problème affecte compréhension, continuité ou confiance ; P2 = améliorer le parcours ou la lisibilité ; P3 = finition. Ces priorités ne sont pas des niveaux de conformité réglementaire.

## 1. Interface commune et direction visuelle

Sources : `src/App.tsx`, `src/composants/Navigation.tsx`, `src/composants/navigation.css`, `src/theme/theme.css`, `src/theme/styles.css`, `src/theme/responsive.css`.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| G01 | P2 · V | Le fond bleu nuit presque uniforme et les mêmes filets structurent aussi bien une collection, un combat et des réglages. Les écrans changent de contenu plus que d'atmosphère. | Différencier les compositions par usage : album, table de jeu, lecture et gestion ; conserver la palette commune. |
| G02 | P2 · V | Beaucoup de petits textes secondaires, surtitres et mentions condensées ont un poids proche. Le joueur doit lire pour repérer ce qui compte. | Définir une hiérarchie stable : action, information utile, détail facultatif ; réserver les petites capitales aux mentions brèves. |
| G03 | P2 · V/C | L'orange désigne à la fois l'action principale, l'onglet actif, les gains, certaines erreurs, les dégâts manqués et les boutons de danger. | Séparer couleur de marque et couleurs de statut ; accompagner les statuts d'un texte ou pictogramme explicite. |
| G04 | P2 · V | Les champs, boutons secondaires et cadres arrondis donnent une impression d'outil de gestion autour des timbres. Ce n'est pas leur simplicité qui pose problème, mais leur faible lien visuel avec l'objet collectionné. | Créer quelques composants cohérents avec l'univers postal, sans ajouter des décorations partout. |
| G05 | P2 · V/C | « Collection », « Ton album », « carte », « timbre », « faction » et « origine » alternent pour des notions voisines. « Deck » demande une connaissance préalable du vocabulaire des jeux de cartes. | Fixer un lexique ; expliquer une fois « deck : tes 10 timbres de duel » ; employer « origine » si c'est bien le sens du filtre. |
| G06 | P1 · V/C | Le compteur d'Encre ouvre les paquets ; son intitulé accessible dit « voir les paquets ». Or l'Encre ne sert plus à acheter de paquets. | Faire mener ce compteur au marché ou à une explication de l'Encre avec accès au marché. |
| G07 | P2 · V/C | Sur mobile, six destinations occupent la barre inférieure, dont Réglages au même rang que le jeu. Les libellés sont très petits. | Étudier une navigation à quatre ou cinq entrées, avec réglages dans un espace secondaire ; tester la reconnaissance des icônes. |
| G08 | P2 · C | Les largeurs maximales varient : 1200, 1320 et 1440 px. Certaines pages de gestion sont très étalées ; la lecture et les actions changent d'axe. | Définir trois gabarits assumés : collection large, jeu, lecture étroite ; stabiliser les repères à l'intérieur de chaque parcours. |
| G09 | P1 · C | Plusieurs écrans rendent « Chargement… » pour tout état non prêt, y compris une erreur : album, deck, duel, réglages, paquets, confidentialité et galerie selon leurs dépendances. Un échec peut donc sembler être une attente sans fin. | Prévoir chargement, échec et reprise distincts ; un message explicite et une action Réessayer. |
| G10 | P2 · C | Les confirmations reposent sur `window.confirm` : abandon, import, effacement, récupération, achat et vente. Elles rompent l'habillage et offrent peu de contexte visuel. | Utiliser des dialogues accessibles avec titre, conséquence, objet concerné, annulation et action nommée ; conserver la protection existante. |
| G11 | P2 · V/C | Les états secondaires sont souvent une phrase dans une grande surface vide. Marché indisponible et recherche sans résultat donnent particulièrement l'impression d'un écran non terminé. | Donner à chaque état une explication courte et un prochain geste utile, sans inventer un écran illustré pour chaque cas. |

## 2. Accueil

Sources : `src/ecrans/Accueil.tsx`, `src/composants/accueil/`.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| A01 | P1 · V | Un nouveau joueur voit deux boutons orange de même importance : ouvrir un paquet et composer son deck. Le second mène à une étape impossible sans collection. | Faire du premier paquet l'action dominante, puis proposer le deck lorsqu'il devient réalisable. |
| A02 | P2 · V | L'accueil initial ne montre aucun timbre face visible et n'explique pas en une phrase le lien entre mots, collection et duel. L'objet désirable reste caché. | Montrer un exemple de timbre et une promesse concrète ; guider les premières minutes. |
| A03 | P2 · V/H | Le principal objectif visible est « 0 / 3 000 », puis 0,3 % après deux paquets. Cette échelle donne très peu de satisfaction au début. | Ajouter un prochain palier proche : premier deck, première origine complétée, premier mot maîtrisé. |
| A04 | P2 · V | Sur ordinateur neuf, le contenu occupe surtout le haut de la page, avec une grande zone vide sous la progression. Sur mobile rempli, les trouvailles arrivent après les deux blocs et les compteurs. | Adapter le contenu à la maturité du joueur ; remonter une découverte ou un objectif, sans remplir artificiellement le vide. |
| A05 | P1 · C | Le rappel d'export dit toujours « uniquement sur cet appareil », sans condition liée au mode serveur. | Relier les rappels au vrai mode de sauvegarde ; orienter vers le code de secours quand il protège effectivement la collection. |
| A06 | P3 · V/C | Le lien « Lancer un duel » ouvre le salon, qui demande encore de lancer le duel. | Employer « Jouer un duel » ou « Choisir un duel » pour l'entrée du parcours, et réserver « Lancer » au démarrage effectif. |

## 3. Ouverture des paquets

Sources : `src/ecrans/OuverturePaquet.tsx`, `src/composants/paquet/`, styles `.paquet`.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| P01 | P2 · V | L'accueil propose déjà d'ouvrir un paquet ; le clic conduit à une seconde page où il faut à nouveau ouvrir. La mise en scène peut justifier cette étape, mais elle ressemble aussi à une répétition d'action. | Assumer un rituel d'ouverture unique, ou nommer la première action « Voir mes paquets ». |
| P02 | P3 · V | « Touche pour retourner. Fais glisser pour défiler. » s'affiche aussi sur ordinateur, alors que les cinq cartes peuvent tenir dans la largeur. | Adapter l'aide au contexte et au débordement réel ; utiliser une formulation neutre lorsque nécessaire. |
| P03 | P2 · V/C | Les résultats accumulent « Nouveau ! », finition, rareté, doublon et Encre dans de petites étiquettes. Les informations n'ont pas de hiérarchie stable. | Distinguer acquisition nouvelle, finition et récompense ; un badge principal par timbre puis un bilan global. |
| P04 | P2 · C | Les cartes révélées ouvrent directement une fiche, même si le reste du paquet est encore caché. Le composant d'ouverture perd son état à la navigation. Les acquisitions restent sauvegardées, mais la découverte en cours se perd. | Garder l'état de révélation ou ouvrir une fiche superposée permettant de revenir au même paquet. |
| P05 | P2 · V/C | Après le deuxième paquet, le deck devient possible, mais la suite proposée reste « Ouvrir le suivant » ou « Voir l'album ». | Détecter ce moment et proposer « Composer mon premier deck ». |
| P06 | P2 · C | À réserve vide, l'écran fournit un délai et une explication sur l'Encre ; il n'offre pas de passage direct au duel. | Présenter une activité disponible pendant l'attente. |
| P07 | P3 · C | Les cartes décoratives qui s'envolent pendant l'animation affichent encore un « M » codé en dur, alors que l'identité est passée à Philamots et P. | Utiliser la même initiale de marque partout. |

## 4. Timbres et album

Sources : `src/composants/carte/Carte.tsx`, `src/composants/carte/timbre.css`, `src/ecrans/Collection.tsx`.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| T01 | P2 · V/H | Les rosaces occupent la majorité des timbres ordinaires. Elles donnent une unité, mais les mots n'ont souvent aucun repère illustratif lié à leur sens. Une grille entière paraît plus procédurale qu'éditorialisée. | Garder la gravure comme signature et étudier des familles iconographiques ou quelques illustrations ciblées ; ne pas imposer 3 000 illustrations. |
| T02 | P1 · V/C | À moins de 170 px, le CSS masque définition, type, rareté, record et libellés attaque/défense. Dans l'album mobile, ces informations n'ont pas de légende extérieure, contrairement au deck. | Créer une version compacte avec mot, rareté et informations utiles lisibles à l'extérieur du décor. |
| T03 | P2 · V/C | Couleur d'origine, papier de rareté, finition brillante et cachet se superposent. Un débutant ne peut pas facilement distinguer ce que code chaque traitement. | Séparer les canaux : origine par couleur, rareté par signe et libellé, finition par effet de matière ; expliquer brièvement les trois. |
| T04 | P2 · V | Sur les hors-série, dégradé prismatique, lignes, cachet et petits textes rivalisent. Certaines mentions d'origine et du bas se lisent difficilement. | Protéger les zones de texte des reflets et simplifier les couches ; mesurer ensuite les contrastes réels. Aucun résultat de conformité n'est affirmé ici. |
| T05 | P2 · V/C | Les mots très longs réduisent fortement leur corps dans la grande version ; les petites versions changent de règle et peuvent couper les mots. | Définir des compositions à une ou deux lignes, avec un corps minimal et des césures adaptées. |
| C01 | P2 · V | L'album est surtout une grille de résultats avec recherche et listes déroulantes. La collection est peu organisée comme une collection à compléter. | Introduire des regroupements ou objectifs par origine, rareté ou série, en complément de la recherche efficace. |
| C02 | P2 · C | L'album ne montre que les timbres possédés. Il compte les manquants sans permettre de parcourir ce qu'il reste à trouver. | Proposer une vue facultative des manquants ou des séries, avec une règle claire sur les découvertes cachées. |
| C03 | P2 · C | Pas de filtre par finition, maîtrise ou présence dans le deck, malgré leur importance dans le jeu. | Ajouter les filtres utiles aux intentions réelles du joueur, plutôt que multiplier les critères abstraits. |
| C04 | P1 · C | Recherche, filtres, pages chargées et panneau de progression vivent dans le composant ; ouvrir une fiche puis revenir remonte et réinitialise le parcours. | Conserver les filtres et la position de l'album, y compris via Retour du navigateur. |
| C05 | P2 · V | Une recherche sans correspondance affiche « 0 résultat » et « Effacer les filtres », même si seule la recherche est utilisée. | Dire « Aucun timbre trouvé pour… » et proposer « Effacer la recherche » ou une remise à zéro nommée correctement. |
| C06 | P3 · C | L'album utilise une barre de recherche avec filtres repliés ; le deck affiche ses listes directement. Les tris disponibles changent également. | Partager un outil de recherche commun et adapter explicitement les options propres au deck. |

## 5. Fiche de timbre, cote et mise en vente

Sources : `src/ecrans/FicheCarte.tsx`, `src/composants/CoteDuTimbre.tsx`, `src/composants/MiseEnVente.tsx`.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| F01 | P1 · V/C | Aucun retour contextuel vers l'album, le paquet ou le marché. La navigation globale oblige à retrouver sa place. | Ajouter un retour à la provenance et conserver cet état. |
| F02 | P1 · C | En mode serveur, « Dans ton album », la cote et tout le formulaire de vente précèdent les définitions. L'économie prend le dessus sur la découverte du mot. | Placer définition et histoire au premier plan ; ouvrir la vente à la demande. |
| F03 | P2 · V/C | « Finitions : normale ✓ · brillante — · holographique — » est une ligne d'inventaire. On ne peut pas choisir une finition à examiner ; seule la meilleure est présentée. | Donner des vignettes ou un sélecteur de finitions avec état possédé/non possédé. |
| F04 | P2 · V/C | La maîtrise est réduite à « 0 / 5 bonnes réponses ». Aucun geste ne permet de poursuivre cet objectif depuis la fiche. | Ajouter une progression claire et un accès adapté au deck ou à l'entraînement. |
| F05 | P2 · V/C | « Partager » est l'action visible sous le timbre, mais il n'existe pas d'action Ajouter/Retirer du deck sur la fiche. | Rendre l'action de jeu accessible ici, avec état et place disponible. |
| F06 | P2 · C | Le formulaire de vente explique la commission mais ne montre pas le produit net calculé, et la confirmation ne récapitule pas toute la configuration, notamment la finition et l'achat immédiat. | Présenter un résumé avant mise en vente : exemplaire, durée, prix, commission et montant reçu. |
| F07 | P2 · C | L'historique de cote trace une courbe sans axes visibles ni lecture précise de chaque point pour le joueur voyant. Le texte accessible contient davantage de données que la représentation visuelle. | Ajouter graduations utiles et valeurs consultables ; bien distinguer absence de transactions et prix nul. |

## 6. Deck

Source : `src/ecrans/Deck.tsx`, styles `.deck`, `.atelier-deck`, `.carte-legendee`.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| D01 | P1 · V/C | Une fois les dix timbres choisis, toute la collection disponible disparaît. Pour chercher un remplaçant, il faut d'abord retirer une carte. | Garder la réserve visible et permettre un remplacement explicite. |
| D02 | P1 · V | Sur téléphone, dix timbres prennent quatre rangées ; les actions arrivent ensuite. « Lancer un duel » n'est pas visible au premier écran du deck complet. | Garder le compteur et l'action principale accessibles ; proposer une représentation compacte du deck. |
| D03 | P2 · V/C | Un clic sur une carte retire immédiatement celle-ci ; ailleurs, le même timbre ouvre une fiche ou sélectionne une attaque. L'action n'est pas indiquée visuellement sur chaque carte. | Ajouter des contrôles explicites +/− ou Remplacer, et une inspection distincte. |
| D04 | P2 · V | Dix rectangles vides en pointillés occupent beaucoup de place, puis « Encore 10 cartes » imite un bouton sans être une action. | Transformer le compteur en statut et rendre le démarrage automatique clairement prioritaire pour un novice. |
| D05 | P2 · C | « Composer pour moi » remplace le deck et « Vider le deck » l'efface immédiatement, sans aperçu ni annulation. | Proposer Annuler après changement ; expliquer ce que privilégie la composition automatique. |
| D06 | P2 · V/C | Les synergies sont une phrase : « 2 Francique (+1), 4 Latin (+1) ». Le cycle des types est décrit dans une liste repliée. | Afficher un résumé tactique simple avec les enchaînements possibles et un petit schéma du cycle. |
| D07 | P2 · C | La sélection se fait sans consulter facilement les définitions ni comparer la maîtrise, alors que connaître le mot détermine la réussite. | Mettre savoir personnel et force côte à côte ; offrir une inspection sans ajouter/retirer la carte. |

## 7. Duel : salon, combat, questions et résultat

Source : `src/ecrans/Duel.tsx`, `src/App.tsx` et styles `.duel`, `.epreuve`, `.niveau`.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| U01 | P2 · V | Les trois difficultés ressemblent à des cartes d'offre : texte de probabilité, gain en Encre, bouton de lancement dessous. Peu de signes évoquent un adversaire ou une épreuve. | Présenter l'expérience attendue et le niveau conseillé ; garder les probabilités comme détail consultable. |
| U02 | P2 · V/C | Normal est choisi par défaut et les règles sont fermées, y compris lors du premier duel. Le joueur entre dans plusieurs mécaniques simultanément. | Proposer un premier duel guidé et une difficulté d'initiation clairement identifiée. |
| U03 | P1 · V/C | Quitter par un onglet puis revenir fait perdre le duel en cours sans avertissement ; le salon réapparaît. Le bouton Abandonner demande pourtant une confirmation. | Persister le duel ou protéger toutes les sorties qui le détruisent. |
| U04 | P1 · C | Sélectionner une carte appelle aussi `changerDEtape`, qui exécute `window.scrollTo({top:0})`. Sur une mise en page mobile longue, le choix risque de renvoyer le joueur au-dessus de sa main. | Réserver le retour en haut aux vraies transitions ; conserver la position lors d'une sélection. |
| U05 | P2 · V | Les deux jauges utilisent la même couleur et le plateau comme la main ont un traitement très proche. L'appartenance repose surtout sur « Son mot », « Ton mot », « Toi ». | Renforcer les positions et signes d'appartenance sans reposer uniquement sur des couleurs opposées. |
| U06 | P1 · V/C | La prévision dit « Tu infliges 3, tu reçois 6 » alors qu'elle dépend des réponses et des parades. Le texte sonne comme un résultat certain. | Dire « Dégâts possibles » et montrer les conditions principales ; placer le calcul détaillé en second niveau. |
| U07 | P2 · V/C | L'attaque réussie passe immédiatement à la question de parade ; une erreur laisse une correction avec une action suivante. Le rythme et le sens du clic changent selon le résultat. | Rendre la transition perceptible et stable ; conserver la protection contre le double toucher déjà présente. |
| U08 | P2 · V | Les définitions à choisir sont toutes en italique dans des rectangles identiques. Avec 15 secondes, les formulations longues demandent beaucoup de lecture. | Utiliser un texte droit très lisible, des espacements constants et une distinction nette entre consigne et réponse. |
| U09 | P2 · C | Le temps peut être modifié uniquement dans Réglages. Le découvrir ou le changer pendant un duel implique aujourd'hui de quitter celui-ci. | Exposer ce choix dans le salon avant lancement ; rappeler le réglage actif. |
| U10 | P2 · V | Le bilan de manche fait surtout lire des phrases à côté de deux grandes cartes. Il faut rapprocher dégâts, jauges et réussite pour comprendre le tour. | Montrer les variations de vie et un résumé causal court, puis les définitions à retenir. |
| U11 | P2 · C | Le résultat final est un encadré avec cote, Encre et statistiques ; les mots appris ou à revoir ne disposent pas d'un parcours de révision. | Donner un vrai bilan d'apprentissage et une suite adaptée : rejouer, revoir les mots, améliorer le deck. |
| U12 | P2 · C | Un résultat de joute non enregistré est annoncé sans action de nouvelle tentative dans cet écran. | Prévoir une reprise de synchronisation compréhensible, avec statut durable du résultat. |

## 8. Joutes classées et classement

Source : `src/ecrans/PanneauDesJoutes.tsx`.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| J01 | P2 · V | L'entrée dans les joutes est principalement un formulaire de pseudo précédé de textes. Ni ligue ni progression à venir ne sont montrées. | Donner un aperçu simple du parcours de ligues avant la saisie. |
| J02 | P2 · V/C | Les adversaires ressemblent aux boutons de difficulté. Cliquer leur bloc lance directement la joute, alors que cliquer un niveau ne fait que le sélectionner. | Rendre le déclenchement explicite : « Défier… », ou sélection suivie d'une action de lancement. |
| J03 | P2 · V | Raretes du deck, cote, ligue, gain de cote, perte de cote et Encre sont condensés dans quelques lignes. Les unités des variations sont implicites. | Séparer force estimée, variation de cote et récompense ; écrire l'unité de chaque nombre. |
| J04 | P2 · V/C | Le classement est replié en bas de page ; la progression de ligue est une barre sobre. Le cœur de la motivation compétitive reste discret. | Donner un espace clair au rang personnel et au prochain palier, avec accès direct au classement. |
| J05 | P2 · C | Le mode choisi ne survit pas à la sortie de l'écran. Revenir aux duels revient par défaut à l'entraînement. | Garder le dernier mode ou lui donner une adresse propre. |
| J06 | P3 · V/C | En simulation locale, l'interface parle d'envoi au serveur et montre un classement de joueurs maison sans mention de simulation. | Marquer le mode local dans l'environnement de test ; vérifier les messages selon le mode réel. Ce n'est pas une anomalie de disponibilité du serveur de production. |

## 9. Marché et enchères

Sources : `src/ecrans/Marche.tsx`, `src/composants/MiseEnVente.tsx`. Seul l'état indisponible a été observé ; les autres lignes proviennent du code.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| M01 | P1 · V/C | L'état indisponible donne une phrase technique sur le serveur, sans action de reprise ni retour proposé dans le contenu. En développement, le serveur est volontairement désactivé mais le message suggère une panne. | Distinguer indisponibilité réelle et mode local ; proposer Réessayer quand pertinent et Retour à l'album. |
| M02 | P1 · C | Pour vendre, le marché demande de quitter l'écran et retrouver une fiche dans l'album. Il n'offre pas de point d'entrée « Vendre un timbre ». | Ajouter une action ouvrant un choix parmi les timbres éligibles. |
| M03 | P2 · C | Recherche textuelle uniquement ; pas de tri par fin prochaine, prix, rareté ou finition. | Introduire les outils qui correspondent aux décisions d'achat et à l'exploration. |
| M04 | P2 · C | Chaque frappe change la clé du chargement et relance la recherche ; il n'y a pas de temporisation de saisie. | Temporiser ou valider la recherche ; garder les résultats visibles pendant leur actualisation. |
| M05 | P2 · C | Le prix, la cote, l'achat immédiat, le vendeur et la durée sont concaténés en lignes de texte. Les timbres de 96 px perdent leurs détails. | Concevoir une ligne d'enchère avec prix dominant, temps clair, finition et action distincts. |
| M06 | P1 · C | Les messages d'action et d'erreur d'enchère sont remontés dans une zone globale au-dessus de la liste. Sur mobile, agir en bas peut donner un retour hors champ. | Afficher le retour sur l'enchère concernée ; conserver un récapitulatif global si utile. |
| M07 | P2 · C | « Mes ventes et mes mises » vient après les annonces publiques et disparaît quand il n'y en a aucune. La structure dépend du contenu. | Offrir des espaces stables Acheter, Mes mises et Mes ventes avec états vides utiles. |
| M08 | P2 · C | Les erreurs et le chargement de la liste personnelle ne sont pas rendus ; la section peut simplement ne pas apparaître. | Afficher explicitement l'état de suivi personnel, avec reprise possible. |

## 10. Réglages et compte

Source : `src/ecrans/Reglages.tsx`. Préférences et sauvegarde locale vues ; compte serveur analysé dans le code.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| R01 | P1 · C | Le paragraphe Confidentialité affirme toujours que seules les joutes envoient des données au serveur, alors que la section sauvegarde peut indiquer que la collection y est gardée. | Utiliser une source commune pour les messages dépendant du mode de stockage. |
| R02 | P2 · V/C | Préférences, export/import, effacement, compte, probabilités et crédits partagent une page à deux colonnes, avec une colonne de gestion beaucoup plus longue. | Grouper Confort, Compte et données, À propos ; garder les paramètres fréquents en premier. |
| R03 | P2 · V | « Effacer ma partie » se trouve dans la rubrique de sauvegarde, immédiatement après les actions ordinaires, avec la même couleur d'accent. | Créer une zone destructive distincte et expliquer précisément ce qui est supprimé. |
| R04 | P1 · C | En mode serveur, le fichier exporté ne peut plus être importé ; pourtant l'action « Exporter ma sauvegarde » est dominante, avant la protection par code de secours. | Mettre en avant « Protéger / retrouver ma collection » ; nommer l'export comme copie de données si c'est son rôle réel. |
| R05 | P2 · C | Le code de secours est présenté dans un long discours sur le navigateur et le compte anonyme. L'état « collection protégée » n'est pas le repère principal. | Afficher un statut clair de récupération et l'action manquante ; garder l'explication technique en aide. |
| R06 | P2 · C | La phrase sur les mots masqués explique album et paquets, mais pas leur impact sur la jouabilité du deck, qui filtre également ces mots. | Prévenir avant qu'un réglage rende le deck incomplet, puis proposer sa réparation. |

## 11. Confidentialité

Source : `src/ecrans/Confidentialite.tsx`. Il s'agit ici d'un audit de cohérence de l'interface, pas d'une analyse juridique.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| Q01 | P1 · C | Le texte indique qu'un autre navigateur implique un nouveau profil, sans intégrer le code de récupération décrit dans Réglages. | Décrire un seul parcours de récupération cohérent. |
| Q02 | P1 · C | « Tout effacer », « Ta collection n'est pas touchée » et « Le serveur ne garde plus rien de toi » coexistent dans un produit qui peut garder la collection sur serveur. La portée des actions n'est pas intelligible. | Vérifier la portée réelle de chaque suppression puis nommer séparément profil de joute, collection et compte. |
| Q03 | P2 · V | Page longue, structurée mais sans raccourcis vers les questions concrètes ; les actions sont loin du résumé. | Ajouter un sommaire bref : données gardées, récupération, suppression, contact. |
| Q04 | P2 · V | « Écris à l'auteur » mène à la page générale du dépôt GitHub. L'utilisateur doit deviner comment contacter quelqu'un. | Offrir un canal de contact identifié et accessible au public du jeu. |

## 12. Version payante

Sources : `src/ecrans/Formules.tsx`, `src/jeu/formule.ts`, décision inscrite dans `README.md` le 23 septembre.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| O01 | P1 · V/C | La page présente trois formules, dont deux abonnements, alors que la décision documentée prévoit un achat unique et un seul abonnement, avec avantages encore à préciser. | Retirer la présentation obsolète ou l'aligner après décision sur les avantages ; ne pas polir des offres abandonnées. |
| O02 | P2 · V | Le long encart « Rien ne s'achète encore » expose les vérifications internes et l'avis d'un juriste. Il prend presque autant de place que l'offre. | Indiquer simplement l'état de disponibilité et ce que le joueur peut faire aujourd'hui. |
| O03 | P2 · V/H | « Le nécessaire » suggère qu'une formule serait requise, alors que l'écran annonce un jeu intégralement jouable gratuitement. | Choisir des noms qui décrivent le bénéfice sans ambiguïté sur le gratuit. |
| O04 | P2 · V | Les cartes d'offres empilent des avantages hérités, sans colonne gratuite ni comparaison alignée. Les effets réels demandent de lire les trois cartes. | Lorsque l'offre sera fixée, montrer une comparaison compacte Gratuit / Achat / Abonnement. |
| O05 | P2 · V/C | L'argument « payer n'aide pas à retrouver une définition » répond partiellement à la question d'équité, alors que la page promet une collection accélérée et que la rareté influence le duel. | Expliquer clairement les bénéfices économiques et leur relation au jeu ; éviter une promesse susceptible d'être comprise plus largement que sa formulation. |

## 13. Galerie de contrôle

Source : `src/ecrans/Galerie.tsx`. Écran de développement uniquement, pas un écran public à traiter comme tel.

| ID | Priorité / preuve | Constat et effet | Direction proposée |
|---|---|---|---|
| X01 | P3 · V/C | La galerie juxtapose des cartes de mots différents avec quelques finitions et cachets ; elle ne permet pas de comparer un même mot dans toutes ses variantes. | Ajouter une matrice même carte × taille × finition × maîtrise pour contrôler les détails. |
| X02 | P3 · C | L'échantillon n'organise pas explicitement les cas difficiles : mot très long, origine longue, définition longue, petit format, erreur et chargement. | Utiliser cette galerie comme banc de contrôle visuel déterministe de la future interface. |

## Ce qui mérite d'être conservé

- Le timbre comme objet de collection : dentelure, papier, cachet de maîtrise et lien entre langue et origine.
- La palette nuit / papier / orange, en clarifiant les usages de l'orange.
- Les polices embarquées et les jetons de thème déjà centralisés.
- Les descriptions accessibles des cartes, le lien d'évitement, les commandes clavier des onglets et niveaux, et la réduction des animations. Leur présence ne remplace pas un audit d'accessibilité complet, mais ce sont de bonnes bases.
- L'ouverture carte par carte, « Tout retourner » et la possibilité de passer l'animation.
- Les explications des définitions manquées et la séparation attaque / parade.
- Les aides repliables : utiles si l'information indispensable reste visible.

## Ordre de travail recommandé

1. **Rétablir la cohérence et la continuité.** Encre vers marché ; textes de sauvegarde et récupération ; offre obsolète ; erreurs distinctes du chargement ; sortie de duel protégée ; retour fiche–album préservé ; remplacement d'une carte dans un deck complet.
2. **Dessiner les premières minutes.** Un premier paquet, une collection qui prend forme, un deck prêt, un duel guidé. Chaque étape devrait proposer naturellement la suivante.
3. **Revoir la lisibilité des timbres par contexte.** Grande fiche d'admiration, carte d'album compacte, carte tactique. Partager l'identité visuelle, sans forcer la même densité d'information partout.
4. **Travailler le duel mobile.** Main accessible, sélection sans saut de page, action persistante, prévision conditionnelle, transition attaque–parade et bilan immédiatement compréhensibles.
5. **Structurer le marché et le compte.** Séparer exploration, suivi et vente ; afficher les retours au bon endroit ; rendre la protection de la collection compréhensible.
6. **Finir l'habillage.** Typographie, rythmes d'espacement, états des boutons, dialogues et détails d'animation après stabilisation des parcours.

## Critères pour vérifier la refonte

- Un nouveau joueur sait quelle action faire en premier sans lire les règles.
- Il peut ouvrir une fiche puis revenir exactement à sa collection filtrée et à sa position.
- Il peut remplacer une carte d'un deck complet sans le vider ni chercher un contrôle caché.
- À 390 px de large, il distingue mot, rareté et action utile ; la commande principale du deck reste facilement accessible.
- Une sélection de carte en duel ne déplace pas brutalement la page.
- Quitter un duel ne détruit jamais silencieusement sa progression.
- Les dégâts annoncés ne sont pas présentés comme garantis avant les réponses.
- Un problème réseau est identifiable et offre une reprise.
- Chaque message concernant la sauvegarde et la récupération correspond au mode réellement actif.
- Une action de marché affiche son résultat au voisinage de l'objet concerné.

## Vérifications restant à faire après conception

Tester les parcours connectés avec un environnement de test et des données prévues pour cela : récupération, ventes, surenchères, fin d'enchère, perte de réseau et résultat de joute en attente. Vérifier les bilans finaux et la montée de ligue à l'écran, ainsi que téléphone réel, clavier logiciel, zoom, lecteur d'écran et contrastes des finitions. Les points tirés uniquement du code dans cet audit doivent être repris dans ces essais ; ils ne sont pas présentés comme des captures d'états vécus.
