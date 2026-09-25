# Philamots — analyse du code et des mécaniques

Analyse du 23 septembre 2026, portant sur les fichiers locaux, y compris les modifications déjà présentes au début de l’intervention. Les règles effectives du code priment sur les briefs et commentaires. Aucun correctif au jeu, aucun déploiement et aucune action sur Supabase réel n’ont été effectués.

## 1. Diagnostic

Philamots possède un concept cohérent : les mots sont des objets de collection et les connaissances du joueur servent à les employer en combat. La présentation en timbres, les origines linguistiques, les finitions et les cachets de maîtrise forment un ensemble identifiable. La séparation entre règles, services et interface donne une bonne base de développement.

Le principal problème n’est pas le moteur de combat. C’est la cohérence du système complet : collections authentifiées, récompenses, classement, transactions et récupération. Les tests existants passent, mais plusieurs scénarios qui traversent ces frontières provoquent des pertes ou permettent de fabriquer des ressources. Le marché et les joutes ne sont pas encore suffisamment fiables pour une compétition ou une économie payante.

Sur le plan du jeu, trois tensions structurent l’équilibrage :

- Les statistiques peuvent dominer le savoir lorsque les decks sont très inégaux.
- L’apprentissage de son deck réduit progressivement la contrepartie des mots rares.
- Les paquets produisent à la fois des cartes échangeables et de l’Encre, tandis que la commission du marché est le principal mécanisme de destruction monétaire.

## 2. Ce qui a été vérifié

Lecture des règles de collection, paquets, combat, quiz, joutes, progression, succès, offres, marché et synchronisation ; inspection de leurs services, écrans principaux, générateurs SQL et tests ; examen du pipeline de cartes, des simulateurs et du déploiement.

Vérifications exécutées :

| Vérification | Résultat |
|---|---|
| `npm run build` | Compilation TypeScript et construction Vite réussies, vérifiées à nouveau en fin d’analyse |
| `npm test` avec le Node du terminal | Échec de lancement : Node 22.14.0 ne charge pas directement ces fichiers TypeScript |
| `node --experimental-strip-types --test "pipeline/tests/*.test.ts" "src/**/*.test.ts" "serveur/*.test.ts"` | **244 tests réussis**, aucun échec |
| Exécution du SQL généré dans PGlite local | Reproductions décrites ci-dessous, sous le rôle `authenticated` pour les appels du joueur |
| Lecture de toute l’édition et des 16 lots | **3 016 cartes**, contrôle des définitions et statistiques |
| Génération d’un quiz par carte visible, avec les deux filtres de registre activés | Quatre propositions obtenues pour toutes les cartes examinées ; 28 cartes présentent cependant un repli vers un sens masqué |

La version Node minimale annoncée est 22.18 ; la CI utilise Node 24. L’échec initial est donc un écart de l’environnement local, pas 28 défauts dans le jeu.

Limites : pas de test du serveur déployé, pas de vérification des migrations réellement installées, pas d’essai visuel sur téléphone, pas de mesure de fréquentation ou de joueurs réels. Les données brutes du pipeline n’ont pas été téléchargées ni régénérées. Les résultats des rapports de simulation existants sont distingués des mesures recalculées ici. Cette analyse ne certifie pas l’absence d’autres défauts.

## 3. Fonctionnement réel du jeu

### 3.1 Cartes et données

L’édition contient 3 000 cartes ordinaires et 16 Hors-série.

| Rareté | Nombre | Attaque moyenne en jeu | Défense moyenne en jeu |
|---|---:|---:|---:|
| Commune | 1 500 | 5,23 | 6,63 |
| Peu commune | 750 | 6,03 | 4,53 |
| Rare | 450 | 6,40 | 5,34 |
| Épique | 210 | 7,61 | 5,40 |
| Légendaire | 90 | 8,60 | 5,70 |
| Hors-série | 16 | 13,63 | 9,25 |

Ces moyennes ont été recalculées sur les JSON avec les fonctions `attaqueEnJeu` et `defenseEnJeu`, bonus compris.

L’attaque brute dépend de la valeur des lettres du mot, transformée en note par rang. La défense brute représente sa richesse : sens + 0,5 × synonymes + 0,25 × dérivés. Les notes sont recalculées dans l’édition. La rareté combine rang de fréquence et rang de prévalence ; les mots non mesurés sont traités séparément. Les coups de cœur et corrections manuelles complètent ce traitement.

La rareté n’est donc pas une estimation individuelle de difficulté : un mot rare statistiquement peut être connu du joueur, et inversement. La puissance ne croît pas uniformément sur les deux axes : les Communes ont notamment une meilleure défense moyenne que les Légendaires. Cela préserve des cartes courantes utiles, mais demande une explication claire au joueur.

Répartition réelle des natures : 1 722 noms, 659 adjectifs, 598 verbes et 37 adverbes. Le résultat diffère de la cible 50/22/22/6 % du pipeline : les disponibilités et critères de qualité contraignent la sélection. Les adverbes représentent seulement 1,23 % des cartes et n’ont pas d’avantage dans le triangle.

Treize factions sont présentes. Le Latin compte 963 cartes, soit 31,9 % de l’édition. Les petites factions bénéficiant de +2 ont entre 85 et 157 cartes dans les données actuelles ; le seuil configuré est 160. Les autres reçoivent +1.

Points solides du pipeline : génération déterministe, critères de qualité, regroupement des origines, corrections explicites, séparation index/détails, filtrage des définitions et tests de données. Limites : l’étymologie est interprétée par des heuristiques, et la validité linguistique d’une définition ne se déduit pas d’un test automatique.

Sources : `pipeline/config.ts`, `pipeline/etapes/{cartes,rarete,edition,factions,nettoyage}.ts`, `src/config/equilibrage.ts`.

### 3.2 Paquets, finitions et collection

- Trois paquets initiaux, cinq cartes chacun. Les premiers tirages excluent les mots déjà possédés : quinze mots distincts permettent de construire immédiatement un deck de dix.
- Recharge gratuite : un paquet toutes les dix minutes, réserve de dix. Une réserve vide se remplit en 100 minutes ; au plafond, la production s’arrête.
- Trois premiers emplacements : 70 % Commune, 25 % Peu commune, 5 % Rare.
- Quatrième : 75 % Peu commune, 20 % Rare, 5 % Épique.
- Cinquième : 74 % Rare, 22 % Épique, 4 % Légendaire, avant les règles de substitution.
- Au quarantième paquet consécutif sans Légendaire, le dernier emplacement est garanti Légendaire.
- Hors-série : tirage à 1/1 000 sur le dernier emplacement, sauf lorsqu’une Légendaire est garantie. Cette garantie est prioritaire.
- Finitions ordinaires : 90,4167 % Normale, 8,3333 % Brillante, 1,25 % Holographique. Les Hors-série sont toujours normales.
- Une finition n’ajoute aucune statistique de combat.

Avec la garantie, la fréquence moyenne à long terme des Légendaires ordinaires est proche de **4,97 % par paquet**, soit une tous les **20,13 paquets**, sous réserve d’une réserve de cartes disponible. Le « 4 % » est la probabilité de base du dernier emplacement, pas la fréquence effective avec garantie.

La fréquence effective des Hors-série est légèrement inférieure à 1/1 000, car la garantie prend parfois leur place. À environ 30 paquets quotidiens, la médiane théorique du premier tirage est proche de 23 jours. Le rapport de collection existant, fondé sur 20 joueurs par ligne, indique 16 jours pour son échantillon : ce n’est pas une garantie de délai.

Collectionner les 16 Hors-série distinctes est un objectif bien plus long que tirer 16 Hors-série : les répétitions comptent. Sans échanges ni offre payante, une approximation de type collection de coupons donne environ 54 645 paquets en moyenne pour les réunir toutes, soit près de cinq ans à 30 paquets par jour. Ce calcul suppose des Hors-série équiprobables et les réglages constants.

**Écart majeur de règle : un doublon ne disparaît pas actuellement.** Le jeu augmente son nombre d’exemplaires et verse aussi l’Encre. Même comportement dans le SQL. Il s’agit donc d’une prime de doublon avec conservation de l’exemplaire, malgré les textes parlant de conversion. Voir le diagnostic économique plus bas.

Sources : `src/jeu/{paquets,partie,recharge}.ts`, `serveur/collections.ts`.

### 3.3 Combat

Un deck contient dix cartes distinctes ; le mélange donne trois cartes en main et sept en pioche. Chaque camp commence à vingt PV. Une carte jouée est consommée pour ce combat, même si sa définition est ratée.

Déroulement d’une manche :

1. L’adversaire expose sa carte.
2. Le joueur choisit sa réponse parmi les cartes en main.
3. Le joueur reconnaît la définition de son propre mot pour attaquer.
4. Il reconnaît celle du mot adverse pour parer.
5. L’attaque du joueur part en premier. Un adversaire éliminé ne riposte pas.
6. Chaque camp pioche une carte ; arrêt sur KO, dix manches ou main épuisée. Sinon, les PV départagent les camps à la limite.

La formule exacte est :

```text
dégâts = max(1, attaque_en_jeu + bonus_type + bonus_faction
                - arrondi(défense_adverse_en_jeu × 0,5))
dégâts parés = plancher(dégâts × 0,5)
attaque ratée = 0
```

Le minimum de un s’applique avant la parade : une attaque à un dégât peut donc être annulée entièrement. Une défense impaire profite de l’arrondi vers le haut. Avec une défense de sept, quatre points sont bloqués ; avec six, trois.

Triangle : Nom bat Adjectif, Adjectif bat Verbe, Verbe bat Nom, pour +2 à l’attaque. Aucun malus direct en sens inverse. Un adverbe est neutre. Enchaîner une faction identique à celle de sa propre carte précédente donne +1, ou +2 pour une petite faction. Une attaque ratée prépare quand même cet enchaînement.

Exemple : attaque en jeu 8, avantage de type +2, faction +1, défense adverse 7 : 8 + 2 + 1 − 4 = 7 dégâts, ramenés à 3 si l’adversaire pare.

Le joueur cumule deux avantages structurels : choisir après avoir vu la carte adverse et frapper en premier. Ils facilitent l’apprentissage, mais rendent les duels asymétriques ; les taux de victoire contre un double ne doivent pas être interprétés comme ceux d’un duel humain équitable à positions identiques.

La limite de réponse est de 15 secondes, 30 avec le réglage doublé, ou sans limite. Ce réglage s’applique aussi aux joutes. Il faut définir si le classement compare le savoir indépendamment de la vitesse : c’est un choix de design et d’accessibilité, pas nécessairement un défaut.

### 3.4 Intelligence adverse et deck

À l’entraînement, le deck adverse est adapté carte par carte à celui du joueur : même rareté en Facile, +1 cran en Normal, +2 en Difficile, plafonné à Légendaire. Une Hors-série appelle une Hors-série. Le moteur vise une force comparable, modulée par la rareté, et choisit parmi six cartes proches.

Réussite des attaques : 65 %, 85 %, 90 % selon le niveau. Parade en Normal/Difficile : 70 % sur une Commune, 60 % Peu commune, 45 % Rare, 30 % Épique, 15 % Légendaire ; 70 % sur les Hors-série. Le mode Facile multiplie ces probabilités de parade par 0,7.

En Facile, le choix adverse est aléatoire ; sinon il maximise attaque + bonus de faction + moitié de la défense. Il ne planifie pas plusieurs manches et n’évalue pas finement les probabilités de connaissance de son double.

« Composer pour moi » trie les cartes selon attaque + défense. Il ignore le savoir du joueur, les types, les factions et les dégâts probables. C’est une aide simple, pas un constructeur optimal. Le simulateur principal construit pourtant ses decks en tenant compte d’une probabilité de savoir : ses résultats ne représentent donc pas exactement l’expérience de ce bouton.

La difficulté adaptative a un effet important : améliorer sa collection renforce aussi l’ordinateur. La progression devient plus nette lorsque le joueur apprend ses mots et choisit mieux, et moins nette lorsqu’il augmente seulement ses statistiques. Un mode à adversaires fixes rendrait l’amélioration de collection plus perceptible.

Sources : `src/jeu/duel.ts`, `src/services/duel.ts`, `src/ecrans/Deck.tsx`, `simulateurs/duel.ts`.

### 3.5 Quiz et apprentissage

Les leurres sont de même nature et de rareté voisine, puis la recherche s’élargit. Le code cherche à éviter les mots de la même famille, les renvois trop évidents, les propositions similaires et la définition de l’autre mot de la manche. Ce travail est utile et supérieur à un simple tirage aléatoire de quatre textes.

Mais le réservoir de questions est limité :

| Définitions marquées utilisables pour le quiz | Cartes |
|---|---:|
| 0 | 4 |
| 1 | 684 |
| 2 | 1 386 |
| 3 | 942 |

Les exclusions supplémentaires du moteur peuvent encore réduire la diversité réellement utilisée. Les quatre cartes sans définition marquée `quiz` sont jazzy, lexie, psychophysiologique et rodomontade. Un repli affiche une définition avec le mot masqué ; cela ne supprime pas nécessairement les indices de sa famille. « Relatif à la psychophysiologie » rend par exemple la réponse très reconnaissable.

La maîtrise s’obtient après cinq bonnes réponses cumulées, sans pénalité aux erreurs, sans seuil de précision et sans espacement temporel. Ce cachet récompense la familiarité, pas une vérification solide de mémorisation à long terme. Après apprentissage des dix cartes, la variété vient surtout des parades.

Améliorations possibles : séparer découverte et révision, élargir les définitions, varier les contextes, mesurer la précision récente, proposer des objectifs qui encouragent à faire tourner le deck. Conserver le cachet comme récompense positive est compatible avec une mesure de savoir plus exigeante pour le double.

### 3.6 Joutes, progression et offres

Les joutes sont asynchrones : le joueur affronte une simulation du profil adverse. Les probabilités mélangent résultats observés et estimation initiale pesant quatre réponses. Une cote de type Elo commence à 1 000, avec K = 32, échelle = 400 et minimum = 100. Six ligues vont d’Apprenti à Immortel, à partir de 1 700.

Trois adversaires sont proposés autour de −120, 0 et +120 points. Seule la cote de l’attaquant change. Les doubles et joueurs maison ont ainsi une cote qui ne réagit pas à leurs défaites défensives. Combiné à l’avantage du joueur actif, cela appelle une calibration spécifique ; ce n’est pas un Elo de parties symétriques.

Récompenses : victoire Facile 20 Encre, Normal 30, Difficile 45, joute 35. Trois premières victoires quotidiennes à plein montant, puis 25 % arrondis : 5, 8, 11 et 9. Défaite ou nul : 5. Le compteur des victoires est partagé entre entraînement et joutes ; il s’agit d’une réduction de rendement, pas d’un plafond absolu d’Encre.

XP : paquet 20, nouveau mot 15, bonne réponse 5, combat terminé 30, victoire +20. Le niveau exige 100 XP pour son premier palier, puis 50 de plus par palier. Cinquante succès débloquent autant de titres ; les cosmétiques gratuits suivent les niveaux. Les succès déjà gagnés restent acquis après une vente.

Les deux offres préparées sont distinctes : achat unique « Mon album » à 5,99 € envisagés, avec cosmétiques premium et une Hors-série ; abonnement « Collectionneur » à 5 €/mois envisagés, recharge 8 minutes/réserve 15, +25 % XP de combat et paquet spécial hebdomadaire. Le paiement est fermé dans l’interface.

L’abonnement accélère le débit continu de paquets de 25 %, et augmente la capacité récoltable après une longue absence de 50 %. Le cadeau Hors-série apporte une puissance tangible : attaque 12 à 16, défense 8 à 10. Ces offres ont donc un avantage de progression et potentiellement de combat. L’interface actuelle le reconnaît. Le bonus d’XP doit être persisté côté compte avant d’être vendu comme bénéfice durable sur plusieurs appareils.

## 4. Défauts prioritaires et preuves

Priorité immédiate = risque de blocage partagé ou perte de ressources ; élevée = intégrité économique, compte ou classement ; normale = cohérence et fiabilité d’expérience. Les faits reproduits le sont uniquement dans la base locale isolée.

### A. Suppression d’un compte : pertes et blocage du marché — immédiate

**Reproduit.** Les enchères référencent le vendeur avec `on delete cascade` et l’enchérisseur avec `on delete set null` (`serveur/marche.ts:33`, `:42`). La clôture vérifie l’existence d’une mise, pas celle de son propriétaire (`:152`, `:158`).

- Vendeur supprimé après une mise de 100 : l’enchère disparaît, l’acheteur reste débité de 100, aucun remboursement.
- Enchérisseur gagnant supprimé : son identifiant devient nul mais la meilleure mise reste renseignée. À l’échéance, la clôture tente d’attribuer le timbre à un utilisateur nul et échoue sur la contrainte de `possessions`.

La clôture étant appelée par les opérations du marché et `mon_compte`, une enchère de ce type peut faire échouer les appels d’autres joueurs dès qu’elle entre dans le lot des cinquante clôtures. Ce défaut dépasse le seul compte supprimé.

**Correction visée :** solder ou annuler explicitement les engagements avant suppression, rembourser les sommes bloquées, prévoir les enchères dont une partie a disparu, et garantir la conservation des ressources dans une transaction. La récupération par code supprime aussi le compte de destination avant transfert : elle doit traiter ses engagements existants.

### B. « Supprimer mon profil de joute » supprime aussi le compte — élevée

**Confirmé par le parcours de code et la suppression SQL exécutée localement.** `src/ecrans/Confidentialite.tsx` assure que la collection n’est pas touchée. Pourtant `supprimerMonProfilDeJoute` appelle une RPC qui supprime `auth.users` (`serveur/fabriquer-le-script.ts:294`), entraînant la suppression du compte et des possessions.

La copie locale peut subsister et être ultérieurement réimportée, mais cela ne préserve pas les droits payants, le code de secours ni les engagements du marché. Le texte de confirmation ne décrit pas l’action réelle.

**Correction visée :** séparer réellement le retrait des joutes de l’effacement complet du compte. Tester aussi le prochain appel réseau après retrait.

### C. Import de collection falsifiable — élevée

**Reproduit sous `authenticated`.** `importer_ma_collection` calcule la limite à partir d’une date et d’un nombre de paquets fournis par le client (`serveur/collections.ts:419`, `:435`). L’appel local avec une ancienneté déclarée d’un an et 10 000 paquets a créé **302 000 Encre et les 3 016 cartes**, dont les 16 Hors-série, avec les finitions soumises.

La limite « une importation par compte » empêche la répétition sur le même compte ; elle ne prouve ni l’existence de l’ancienne sauvegarde ni la légitimité de ses ressources.

**Correction visée :** réserver la migration à une liste ou preuve d’éligibilité contrôlée côté serveur ; fermer la voie générique pour les nouveaux comptes. Si des sauvegardes locales non signées restent admises, leur statut économique doit être explicite et limité.

### D. Résultats de duel et de joute déclaratifs — élevée

**Reproduit.** Le serveur vérifie le propriétaire du ticket, son âge et l’unicité de consommation, mais reçoit directement `p_resultat`. Il ne vérifie aucune réponse, manche ou carte.

Dans la base locale, après vieillissement contrôlé du ticket pour simuler l’attente : un entraînement non joué a rapporté **45 Encre** ; une joute non jouée a fait passer la cote de **1 000 à 1 016** et rapporté **35 Encre**. Le compte n’avait pas besoin d’un deck jouable pour ce parcours RPC.

**Correction visée :** faire autorité côté serveur sur la session, les cartes, les réponses et le résultat. Rejouer un journal est utile, mais un journal de simples booléens fournis par le client resterait falsifiable. Puisque les définitions sont publiques, ce contrôle empêchera la fabrication triviale d’un résultat sans empêcher toute automatisation du quiz.

### E. Abandon sans défaite classée — élevée

**Confirmé par lecture.** `abandonner` efface seulement l’état React (`src/ecrans/Duel.tsx:194`). Naviguer ailleurs ou recharger détruit aussi le combat, sans clôturer son ticket comme défaite. Le serveur n’applique pas de sanction aux tickets expirés.

Un joueur peut garder ses victoires et abandonner les parties mal engagées, faussant sa cote sans modifier le programme. Les 40 tickets par heure limitent le rythme, pas le principe.

**Correction visée :** définir le sort d’une joute interrompue, permettre sa reprise et ne garder qu’une session classée active ; régler l’expiration côté serveur avec une politique claire pour les coupures.

### F. Profils adverses non validés — élevée

**Reproduit.** La publication accepte dix fois le même identifiant inexistant et des statistiques impossibles, par exemple une réponse posée pour cent réussies. Le SQL contrôle la forme générale et la taille JSON, pas l’existence, la propriété, l’unicité des cartes ni les bornes des savoirs (`serveur/fabriquer-le-script.ts:167`).

Conséquences : adversaires impossibles à charger, probabilités de double hors de [0,1], decks fantômes. `comptes.deck` et `profils.deck` sont deux copies séparées ; la vente modifie la première sans actualiser automatiquement la seconde.

**Correction visée :** construire le profil public depuis les données validées du compte, conserver un historique vérifié des réponses et synchroniser le deck public après une vente.

### G. Combat rapide refusé et récompense provisoire trompeuse — normale à élevée

**Refus reproduit ; conséquence d’affichage confirmée par lecture.** Toute fin avant 45 secondes est rejetée, même si le moteur autorise une victoire rapide. Le ticket a une validité de deux heures, alors que le temps de réponse peut être illimité.

En entraînement, `finirLeDuel` crédite d’abord la récompense locale, puis absorbe l’erreur du serveur (`src/services/partie.ts:309`). Le joueur peut voir de l’Encre gagnée qui disparaît à la synchronisation suivante. En joute, un état « non enregistrée » existe, mais sans mécanisme de reprise durable du résultat.

**Correction visée :** valider un combat réel plutôt qu’une durée arbitraire ; distinguer explicitement récompense acquise, en attente et refusée ; rendre la clôture idempotente et récupérable après une réponse réseau perdue.

### H. Achat immédiat par l’enchérisseur en tête — normale

**Reproduit.** Avec 200 Encre au départ, une mise de 100 laisse 100 disponibles. Acheter ensuite immédiatement pour 200 est refusé : le serveur exige de nouveau les 200 disponibles avant de restituer la mise précédente (`serveur/marche.ts:273`). Pourtant il ne reste que 100 à payer.

Autre cas déduit de l’ordre des contrôles : avec une mise courante de 99 et un achat immédiat à 100, la surenchère minimale devient 104 ; une demande d’achat à 100 est refusée avant application du plafond d’achat immédiat.

**Correction visée :** traiter le prix d’achat immédiat avant le minimum de surenchère et intégrer les fonds déjà bloqués du même acheteur.

### I. Filtres de contenu contournés par le repli des quiz — normale

**Vérifié sur les données.** `definitionsDeDuel` reprend toutes les définitions utilisables lorsqu’aucune n’est visible (`src/jeu/epreuve.ts:33`). Vingt-huit cartes restent sélectionnables malgré l’absence de définition de quiz autorisée avec Familier/Injurieux masqués : notamment barda, bidonner et chic. Cela concerne aussi les leurres.

**Correction visée :** ne jamais réintroduire un sens exclu ; filtrer l’éligibilité au niveau des définitions et fournir un repli autorisé ou écarter la carte du duel.

### J. Progression et persistance à harmoniser — normale

- **Double XP de parade sur un mot possédé.** Le parcours appelle `noterLaParade`, puis `noterLaReponse` ; les deux attribuent cinq XP lorsque la réponse est juste et le mot possédé (`src/ecrans/Duel.tsx:140`). Une seule réponse vaut alors dix XP, contre cinq si le mot n’est pas possédé. Aucun bonus explicite correspondant n’est annoncé.
- **Maîtrise perdue à la sortie de l’album.** `fusionner` ne conserve que les cartes renvoyées par le serveur. Vendre le dernier exemplaire retire son savoir local ; le récupérer après une annulation ou un rachat recrée ses compteurs à zéro. Les totaux de succès restent, pas nécessairement le cachet ni le savoir individuel.
- **Récupération partielle.** XP, succès, maîtrise et parades restent locaux. Le code de secours récupère collection, droits et profil de joute, mais pas l’ensemble de la progression. La publication ultérieure depuis un nouvel appareil peut remplacer les savoirs publics par ses compteurs locaux vierges.
- **Sauvegarde de secours plus récente ignorée.** Si IndexedDB contient une ancienne partie puis échoue en écriture, le secours localStorage reçoit la suite. Au retour d’IndexedDB, la lecture privilégie son ancien contenu sans comparer les versions (`src/services/stockage.ts`). La progression locale peut reculer.
- **Session sans stockage.** Le service ignore l’échec d’écriture localStorage, mais le client ne conserve pas une session durable en mémoire entre deux appels séquentiels. Sans stockage, un nouvel appel peut créer un nouvel utilisateur. Le commentaire promettant une session pour la visite n’est pas réalisé par ce code.
- **Jour local contre UTC.** Les compteurs quotidiens locaux utilisent l’heure locale, le SQL UTC. Les indications de récompenses restantes peuvent diverger autour de minuit, et ne sont pas réconciliées par `EtatDuCompte`.

Ces constats viennent du code ; ils ne correspondent pas à des mesures de fréquence d’incidents sur les appareils des joueurs.

### K. Erreurs réseau affichées comme chargement perpétuel — normale

Le hook `useChargement` distingue correctement erreur et chargement, mais Collection, Deck et l’entrée du Duel ramènent tout état non prêt à « Chargement… » (`Collection.tsx:93`, `Deck.tsx:111`, `Duel.tsx:200`). Une panne de fichier peut donc laisser l’écran sans explication ni bouton de réessai. La fiche carte traite mieux ce cas.

Le client réseau ne fixe pas non plus de délai explicite. Une requête suspendue peut immobiliser la file d’actions jusqu’à sa résolution par le navigateur.

## 5. Économie et équilibrage

### 5.1 Le simulateur de marché ne décrit pas l’inventaire actuel

Le jeu et le serveur conservent les quantités de finitions : un doublon incrémente un exemplaire et donne de l’Encre (`src/jeu/partie.ts`, `serveur/collections.ts:373`). La vente décrémente bien ces exemplaires : ils ont donc une valeur commerciale réelle.

Le simulateur utilise un `Set` de finitions et transforme un doublon en Encre sans conserver l’exemplaire (`simulateurs/marche.ts`, fonctions `ajouter` et `retirer`). Il ne propose une vente que lorsque deux finitions différentes existent. C’est pourquoi son rapport affirme qu’aucune Hors-série n’est vendable comme doublon, alors que le code du jeu peut en conserver plusieurs normales.

Les hypothèses sur les payants sont aussi anciennes : achats d’Encre quotidiens et exemptions de plafonds, alors que les plafonds du SQL actuel sont identiques pour tous.

**Conséquence : les volumes de vente, disponibilités, prix et flux de ressources de ce simulateur ne valident pas l’économie actuelle.** Il faut d’abord décider si le doublon est conservé, converti, ou soumis à un choix, puis partager une même logique d’inventaire entre simulation et production.

### 5.2 Accumulation de monnaie

Les paquets et récompenses injectent de l’Encre ; acheter à un autre joueur en transfère l’essentiel, et seule la commission disparaît. Il n’y a plus d’achat de paquets ou de cosmétiques en Encre dans les règles actuelles.

Même avec son ancien modèle, le rapport stocké montre 881 Encre créées contre 30 détruites par joueur et par jour pour « désir ×5 », soit environ 3,4 % d’absorption. Ce résultat constitue un signal, pas une prévision fidèle du jeu actuel. Passer simplement la commission de 10 à 20 % ne suffit pas à démontrer un équilibre ; la participation au marché et les quantités disponibles changent aussi.

Il faut suivre la masse d’Encre, les soldes médians par ancienneté, le taux d’invendus, les ventes par rareté, la concentration des richesses et les quantités de cartes accumulées. Choisir ensuite des dépenses récurrentes cohérentes avec le jeu, si l’objectif est de stabiliser la monnaie. Aucun prix d’Encre payante ne peut être solidement déduit du simulateur actuel.

### 5.3 Forces et faiblesses du combat

**Forces :** décisions lisibles parmi trois cartes, exposition du mot adverse, bonus modestes et compréhensibles, récompense du savoir, durée bornée en manches, cartes courantes défensives utiles, finitions sans avantage mécanique.

**Limites :** la force brute pèse beaucoup ; absence de coût de deck ; pas de restriction sur le nombre de Hors-série ; choix automatique fondé uniquement sur les statistiques ; peu de renouvellement des questions de son propre deck ; asymétrie favorable au joueur actif.

Les Hors-série forment une classe nettement au-dessus des cartes ordinaires en statistiques. Leur familiarité permet de les parer souvent, mais leur plancher de douze d’attaque leur laisse des dégâts même après parade. Cette puissance paraît voulue dans la configuration ; le risque porte sur leur cumul et l’accès anticipé via une offre.

Les rapports de combat déjà présents explorent utilement ces questions, mais leurs taux de réussite sont des hypothèses de joueurs simulés. `data/simulation-duel.md` annonce 100 combats par ligne alors que le script courant en configure 3 000 : ce fichier n’est pas la sortie exacte d’une exécution complète de la version courante. À 100 combats, l’incertitude d’échantillonnage près de 50 % est d’environ ±10 points à 95 %, avant même les erreurs du modèle.

Pour juger les bonus, comparer à collections et graines identiques : deck de force, deck de types, deck de faction, deck connu ; puis mesurer plusieurs niveaux de savoir. Tester séparément l’entraînement adaptatif et les joutes à decks fixes. Un taux global de victoire ne suffit pas à détecter les cartes inutiles ou dominantes.

### 5.4 Rythme de collection

La réserve gratuite se remplit en 1 h 40. Une visite quotidienne récolte typiquement dix paquets ; trois visites bien espacées en récoltent trente ; une présence quasi continue peut approcher 144 paquets par jour. Le rythme favorise nettement la fréquence de retour.

Le rapport de collection existant situe la fin des 3 000 cartes ordinaires autour de 9,4 mois pour son joueur régulier, contre 2,4 ans pour l’occasionnel ; cela exclut les échanges et la complétion de toutes les finitions/Hors-série. Les derniers mots seront plus lents à obtenir à cause des doublons : le marché peut donner une vraie fonction à l’Encre, à condition que ses stocks et prix restent cohérents.

## 6. Architecture et qualité du code

Le découpage principal est bon :

```text
Pipeline lexical → JSON index + détails
                          ↓
Écrans React → services → règles pures
                   ↓
      IndexedDB/localStorage ou RPC Supabase
                                    ↓
                      SQL généré depuis TypeScript
```

Points positifs : TypeScript strict ; hasard et temps injectés dans les règles ; fonctions de combat testables sans React ; client réseau testable avec doublures ; tables protégées et accès par RPC ; fonctions internes retirées aux rôles clients ; usage de transactions et verrous ; script SQL généré contrôlé par tests ; publication conditionnée aux tests et à la compilation.

Les problèmes identifiés ne justifient pas une réécriture générale. Ils appellent des contrats plus solides entre les couches :

- Un compte doit avoir une politique unique pour sa suppression et ses engagements.
- Un inventaire doit représenter les mêmes quantités dans le client, le serveur et les simulations.
- Un combat doit avoir un cycle de vie persistant, de son ouverture à sa clôture.
- Une récompense doit être attribuée une seule fois, pouvoir être relue et être distincte de sa simple animation.
- Un savoir appartient au joueur et au mot, même si le timbre quitte l’album.

Le module `src/services/partie.ts` concentre démarrage, sauvegarde, synchronisation, paquets, XP, duels, marché et récupération. Le découper par responsabilités serait utile après sécurisation des contrats ; un découpage purement cosmétique ne résoudrait pas les incohérences.

Les tests couvrent de nombreuses règles et quelques comportements PostgreSQL réels, particulièrement les offres. En revanche, de nombreux tests serveur comparent des chaînes SQL ou vérifient que les scripts sont à jour. C’est utile pour la génération, mais insuffisant pour les scénarios transactionnels intercomptes. « 244 tests passent » ne signifie pas « toutes les interactions sont couvertes » ; aucune mesure de couverture exhaustive n’a été faite ici.

Performances mesurées au dernier build : JavaScript 477,31 Ko, soit 146,48 Ko gzip ; CSS 112,67 Ko, soit 25,21 Ko gzip. Des fichiers d’interface ont évolué dans l’espace partagé pendant l’analyse ; le build et les 244 tests ont été relancés avec succès en fin d’intervention. L’index réel fait 710 834 octets et les détails 1 446 935 octets, non compressés. Le premier duel charge les seize lots de détails ; les commentaires annonçant environ 450 Ko ne correspondent plus au poids brut actuel. Ces volumes restent maîtrisables, mais doivent être testés sur réseau mobile ; la compression réellement servie n’a pas été mesurée.

L’album et le deck limitent l’affichage initial à 60 et 40 cartes. Les indices d’accessibilité sont positifs : rôles de boutons/onglets, navigation clavier, gestion du focus, temps adaptable et réduction des animations. Ils demandent néanmoins un essai au clavier et lecteur d’écran ; cette lecture de code ne remplace pas un audit visuel.

La documentation a vieilli par endroits : anciennes offres, disparition annoncée des doublons, plafonds payants, statut de migration, durée/échantillon de simulation. Les commentaires trompeurs sont un risque concret lorsqu’ils servent à prendre des décisions de produit.

## 7. Ordre de travail recommandé

1. **Sécuriser l’effacement et le marché.** Couvrir suppression du vendeur, de l’enchérisseur et récupération d’un compte ayant des engagements ; réconcilier remboursements, cartes et historiques. Séparer suppression de profil et suppression de compte.
2. **Fermer les voies de fabrication de ressources.** Contrôler l’import ; valider decks et savoirs ; définir un résultat de combat calculé côté serveur et un traitement persistant des abandons.
3. **Fiabiliser l’attribution.** Résultats idempotents, reprise après panne, affichage honnête des récompenses, achat immédiat tenant compte des fonds bloqués.
4. **Fixer la règle des doublons.** Décider entre exemplaire conservé, conversion et choix explicite. Aligner textes, inventaires et simulateur avant de changer les prix ou commissions.
5. **Unifier la progression.** Sauvegarder XP et savoir par mot sur le compte ; préserver maîtrise après vente ; corriger le double XP et la lecture du secours local.
6. **Recalibrer le combat avec des données comparables.** Même construction de deck que l’interface, scénarios de cumul Hors-série, distinction entraînement/joutes, diversité des types et factions.
7. **Tester le plaisir de jeu.** Observer des débutants et lecteurs expérimentés : compréhension du premier duel, durée réelle, répétition des questions, usage du marché, motivation de changer de deck et rythme de retour acceptable.

Critères de validation concrets : aucune suppression ne détruit une mise tierce ; aucune enchère orpheline ne bloque les autres ; aucun résultat déclaré seul ne crée une victoire ; aucune joute abandonnée n’échappe à la politique prévue ; une récompense survit à une réponse réseau perdue sans être doublée ; le simulateur et le serveur produisent les mêmes quantités sur des séquences contrôlées.

Le socle ludique mérite d’être conservé. La prochaine étape utile est de sécuriser les transactions et la progression, puis de tester l’équilibre avec des joueurs. Ajouter de nouvelles cartes ou de nouvelles offres avant ces corrections augmenterait surtout le nombre de systèmes exposés aux incohérences actuelles.
