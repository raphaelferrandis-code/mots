# Où en est Philamots

> **Pour reprendre sur un autre poste et voir ce qu’il reste à faire : [A-FAIRE-RAPHAEL.md](A-FAIRE-RAPHAEL.md).**

> **26 septembre 2026 (soir) — finitions, étape 3 « Un seul langage visuel », lot A : une seule palette.** Nuit, crème
> et cuivre partout : `theme.css` porte les jetons de l'audit (`--nuit*`, `--texte-fort/texte/texte-doux/texte-discret`,
> `--filet`, `--cuivre*`, couleurs de sens `--succes/--erreur/--avertissement/--info/--danger`), les anciens noms
> (`--papier`, `--encre`, `--accent`…) en deviennent des alias ; les copies locales (`--p-*`, `--prep-*`, `--c-*`,
> `--bouton-*`, `--reussite`) sont supprimées. Texte en Jost partout ; trois polices (Barlow Condensed retirée,
> les mentions en Oswald, image de partage comprise). Le bouton « de métal » (`.bouton`) prend la forme du bouton
> secondaire de la refonte ; l'orange (Amis, menus, halos) devient le cuivre ; les erreurs prennent `--erreur`. Joutes
> en direct : le mode choisi se voit (souligné). Suite : lot B (champs, onglets, messages, fenêtres), lot C (écrans :
> vitrines du Profil…), lot D (typographie, sobriété).

> **26 septembre 2026 (soir) — les cachets « Maîtrisé » et « Premier jour » retirés (décision de Raphaël).** « On ne joue
> plus la définition de notre mot en duel » (on retrouve celle du mot adverse), et le « Premier jour » ne l'intéresse
> pas : le lot C de l'étape 2 (1d86ad1) est annulé, et l'ancien cachet « Maîtrisé » disparaît du timbre (album, fiche,
> carnet, duel, image de partage), avec tout ce qui l'annonçait (compteur « Maîtrise : 3 / 5 » de la fiche et du
> récapitulatif, règle du duel, bruit de tampon, note de fin de duel, « mots maîtrisés » de l'album). Le serveur garde
> ses données (apprentissages, `maitriseeLe`) : aucun script à coller. Les succès « Un mot pour toujours » et « Le
> savoir prend racine » restent (titres déjà gagnés), sans le mot « maîtriser » : « Retrouver 5 fois en duel la
> définition d'un même mot de sa collection ».

> **26 septembre 2026 (soir) — finitions, étape 2, lot B : les récompenses en vraies cartes.** Le niveau atteint et
> les succès gagnés avec un paquet ou un duel s'affichent dans son écran de fin (résumé du paquet, carte de fin du duel),
> et non plus dans un bandeau de 5 s par-dessus : une carte « Niveau atteint » (ce qu'il débloque, lien « Voir ») et une
> carte par succès, au métal de sa famille, avec son titre et « Porter ce titre » (`MomentsDeProgres` dans
> `src/composants/Recompenses.tsx`). Le bandeau ne sert plus qu'aux récompenses gagnées ailleurs : le guichet les
> « capture » pendant l'écran de fin et les oublie quand il se ferme (oubli fait dans le guichet, pas dans le nettoyage
> de l'écran : en développement, React démonte et remonte chaque écran une fois). Dans la barre, un niveau gagné repart
> d'un anneau neuf (il ne se vide plus à reculons) et le chiffre reçoit un coup de tampon. `#/profil/succes` ouvre
> l'onglet des succès.

> **26 septembre 2026 (soir) — finitions, étape 2, lot A : les premiers pas guidés.** Sous le bouton de l'accueil, « Tes
> premiers pas » : trois étapes qui se cochent seules (paquets de départ, carnet, première victoire), puis « Bravo, tu
> connais le jeu ! » avec deux suites (joutes classées : `#/duel/joutes` ouvre l'onglet ; inviter un ami), à fermer
> (`src/composants/accueil/PremiersPas.tsx` ; rien pour qui a joué plus de 5 duels). Au tout premier duel contre
> l'ordinateur, trois conseils au bon moment, chacun écarté par « Compris » (mot face cachée, attaque et défense, rareté ;
> `Partie.tsx`). Protection de l'invité : le rappel « Protège ta collection » arrive dès la première Épique (ou mieux)
> après les paquets de départ, au plus tard au 20e paquet ; dans le menu du joueur, « Invité · protège ta collection ».

> **26 septembre 2026 (soir) — finitions, fin de l'étape 1 : les premiers pas.** Décisions de Raphaël : la formule
> « Mon album » s'appelle **« Écrin »** (l'onglet est « Album » ; le paiement ne dépend que des identifiants Stripe :
> renommer aussi le produit Stripe avant d'ouvrir les achats, voir docs/GUIDE-paiements-production.md) ; documents
> internes hors du dépôt public : plus tard. Fait : sur l'accueil, tant que le joueur n'a joué aucun duel, **une phrase
> dit ce qu'est le jeu**, et que **tous les mots y sont, même grossiers, masquables** dans les Réglages ; sur téléphone,
> paquet et titre plus petits : **« Ouvrir un paquet » se voit sans défiler** (de 320 à 430 px ; sur un écran bas, la
> présentation passe sous le bouton) ; **le premier carnet se compose tout seul** (`PanneauDuDeck`, une fois, avant le
> premier duel, « Annuler » possible) ; **Facile présélectionné** jusqu'à la première victoire, avec « Conseillé pour
> débuter » ; **30 s par définition** pour toute nouvelle sauvegarde ; règles ouvertes aux trois premiers duels, avec le
> triangle des types et la rareté ; « Il a posé un nom. Quel timbre lui opposes-tu ? » (plus de « son nom » ambigu) ; le
> bandeau de parrainage envoie d'abord aux paquets un nouveau venu sans timbres. Démarrage : les feuilles de style passent
> après l'écran d'attente (greffon « attente-d-abord » de vite.config.ts) : **logo dès 0,4 s** au lieu de 1,7 s d'écran
> blanc, et le jeu attend toujours ses styles ; **public/demarrage.js** propose « Recharger la page » au bout de 12 s si
> le jeu ne démarre pas ; délai de 30 s et « Réessayer » pour le catalogue de l'accueil. Petits défauts : icône « Défier »
> en épées croisées, onglets du Profil de deux couleurs, notification des récompenses au-dessus de la barre du bas
> jusqu'à 767 px, **fil d'activité avec « Pause »** (et arrêt au survol), onglets du Duel en 2 × 2 sur téléphone.

> **26 septembre 2026 (soir) — finitions, chantier 1 « Dire vrai partout ».** Suite de l'audit de finition du 26/09
> (synthèse privée remise à Raphaël : 8 chantiers). Décisions de Raphaël : **« Album » partout** (onglet, adresse
> `#/album`) ; **« carnet » au lieu de « deck »** à l'écran (adresse `#/carnet` ; `#/collection` et `#/deck` marchent
> toujours ; le code garde `deck`) ; premier duel en Facile, feuille d'or au lieu des confettis, mots grossiers visibles
> par défaut (ces trois-là viendront avec les chantiers 2 et 5). Fait : le faux rappel « enregistrée uniquement sur cet
> appareil » devient, pour un invité sans code ni compte relié, **« Protège ta collection »** (après 20 paquets, « Plus
> tard » le repousse de 100) ; la page **Mon compte** réunit la connexion, le **code de secours** (sorti du volet du
> profil : `src/composants/CodeDeSecours.tsx`) et **« Supprimer mon compte »** (`SuppressionDuCompte.tsx`, ex-« Effacer
> ma partie », qui supprimait déjà tout le compte en parlant de « cet appareil ») ; la classe `.compte` des pastilles
> de la page Amis habillait toute la page Mon compte (fond, police de 12 px, texte centré) : renommée `.compteur` ;
> Réglages titrés, sans nom de fichier interne, copie des données en téléchargement ; un **traducteur unique des
> erreurs** (`src/partage/messages.ts` : plus de « Failed to fetch », détail rangé dans « Détails pour le support ») ;
> les **codes couleur des définitions** retirés au nettoyage du pipeline (`sansCodesDeCouleur` : 13 cartes, pages des
> mots, 2 devinettes ; aucune carte ne change) ; « Chargement des duels… » au lieu de « Reprise de ta partie… », et la
> préparation reste utilisable si le serveur des duels ne répond pas ; plus de fausse annonce « N succès accomplis »
> sur un nouvel appareil (`repereDesRecompenses`) ; Confidentialité exacte (pseudonyme public, contact@philamots.fr) ;
> « Mes achats » seulement pour qui a payé ; textes périmés (5 joutes pour être classé, parrainage confirmé, succès des
> définitions, l'Encre sert aussi à la boutique). **Étape 18 faite par Raphaël le 26/09** : redéployer `combats` et
> `joutes-direct` (copie des définitions du serveur). Restent pour un futur script SQL : quelques messages rares du
> serveur qui disent encore « deck » ou « carte ».

> **26 septembre 2026 — la boutique de l'Encre (script 25).** Décision de Raphaël : le compteur d'Encre de l'en-tête
> devient discret (flacon et nombre, sans « + » : il promettait un achat) et ouvre une fiche qui mène à la **boutique**
> (`#/boutique`, écran `src/ecrans/Boutique.tsx`). **Revient sur la décision du 23/09** (« l'Encre ne sert qu'aux
> enchères ») : l'Encre gagnée en jouant achète 15 pièces qu'on ne trouve que là (4 cadres à 12 000, 4 avatars à 8 000,
> 2 dos et 2 emballages à 5 000, 3 couleurs à 2 000 ; champ `boutique` du catalogue, `src/jeu/personnalisation.ts`)
> et un **Hors-série au choix** parmi ceux qui manquent à l'album, **100 000 Encre** (`EQUILIBRAGE.boutique`). Estimé
> avec les règles du 26/09 : ~1 500 Encre/jour pour un joueur régulier (2 à 3 mois pour un Hors-série), ~400 pour un
> occasionnel, ~6 000 pour un acharné ; tout l'atelier ≈ un Hors-série. L'Encre achetée reste réservée au marché. Le
> serveur débite et range (`serveur/boutique.ts` : `acheter_a_la_boutique`, idempotente ; `commander_un_hors_serie`,
> avec identifiant de demande ; journal `achats_boutique`) ; les pièces achetées rejoignent `comptes.personnalisations`.
> Aussi dans le vestiaire du profil (filtre « Boutique », achat depuis l'essayage) et la réserve en haut du marché.
> **Script 25 collé par Raphaël le 26/09 et vérifié de l'extérieur** (étape 17 : les deux fonctions refusent un visiteur
> sans compte, la table des achats est fermée). La dernière migration est la 25.

> **26 septembre 2026 — les paquets d'exception (« god packs », script 24).** Décision de Raphaël : 1 paquet ordinaire
> sur 10 000 ne contient que des Légendaires holographiques, 1 sur 30 000 que des Hors-série, six cartes différentes.
> Un seul jet par paquet (d'abord la Hors-série) ; jamais parmi les paquets de départ ni dans le paquet hebdomadaire ;
> la garantie et la chance de Hors-série ne s'y ajoutent pas ; le paquet Légendaire remet la garantie à zéro, pas le
> paquet Hors-série. Joueur régulier : un paquet Légendaire par an environ, un paquet Hors-série tous les deux ans et
> demi ; en moyenne +50 % de Légendaires holographiques, +20 % de Hors-série, l'Encre ne bouge pas. Un signe visible
> dès l'arrivée du paquet, avant de le déchirer : une aura, de la lumière et des étincelles par la fente de la
> languette ; puis la feuille sort avec une tranche dorée (Légendaires) ou irisée (Hors-série). Le jeu reconnaît ces
> paquets à leur contenu (`paquetDException`, `lueurDuPaquet`) : rien à redéployer. Probabilités affichées dans les
> Réglages. Essai en développement : `#/timbres`, « Paquet d'exception ». **Script 24 collé par Raphaël et vérifié le
> 26/09** (`tirer_les_cartes` identique au dépôt). La dernière migration est désormais la 24.

> **26 septembre 2026 — l'ouverture en feuille de timbres.** Brief du 26/09 (prototype-ouverture-feuille.html),
> travail purement esthétique : la pile de timbres de la cérémonie devient une feuille de six timbres, côté gomme, qui
> sort pliée du paquet déchiré et se déplie. On détache les timbres en suivant leurs pointillés (gros plan, fiche,
> « Ranger ce timbre ») ou d'un clic (le timbre se retourne sur place et file dans le plateau : un clic, une action),
> ou l'on retourne la feuille : coups de tampon en cascade, du courant à la grande révélation. « Tout détacher »,
> puis la fin : la feuille vide s'en va, le plateau s'agrandit, le résumé. Halo discret des raretés sur le dos des
> timbres, place des timbres mélangée à l'affichage seulement, « Paquet n° » = paquets déjà ouverts. Code :
> `src/composants/ceremonie/` (`feuille.ts` pour la géométrie et le geste, testés ; `Feuille.tsx`, `Ceremonie.tsx`).

> **26 septembre 2026 — la devinette du jour (réseaux sociaux et accueil), prête mais pas lancée.** Décisions de
> Raphaël : un calendrier de 365 mots (`data/mot-du-jour.txt`, validé tel quel), qui ne démarre qu'une fois tout prêt
> (`npm run motdujour:dater -- AAAA-MM-JJ` fixe le premier jour et repose Halloween, Noël… à leur date) ; chaque jour,
> une devinette qui alterne « quelle définition ? » (quatre au choix, comme la parade) et « quel mot ? » (définition,
> nombre de lettres, initiale, origine) ; réponse le lendemain sur les réseaux, tout de suite sur l'accueil du jeu,
> avec une série de bonnes réponses. `public/data/devinettes.json` (`npm run motdujour:devinettes`, un test vérifie
> qu'il suit le calendrier) ; `src/jeu/devinette.ts` ; `src/composants/accueil/DevinetteDuJour.tsx` (invisible tant
> qu'il n'y a pas de premier jour ; en développement, `?devinette=N` dans l'adresse montre le jour N). Les images des
> posts (1080 × 1350) : `partage/question/<mot>/` et `partage/reponse/<mot>/`, photographiées par
> `scripts/photographier-les-cartes.ts` (Chrome installé, playwright-core). Photo de profil :
> `public/identite/photo-profil.png`. **Publication sur Bluesky prête, interrupteur éteint** :
> `scripts/publier-la-devinette.ts` (textes : `src/partage/postsDeLaDevinette.ts`) et la tâche GitHub
> `.github/workflows/devinette.yml`, chaque matin vers 8 h 30 ; elle ne publie que si la variable du dépôt
> `PUBLICATION_ACTIVE` vaut « oui » (et le calendrier a un premier jour). Compte `@philamots.fr`, mot de passe
> d'application dans le secret `MDPAPPLICATION`. Facebook et Instagram : pas encore de comptes.

> **26 septembre 2026 — une page par mot, pour Google (philamots.fr/mot/zakouski/).** Chaque timbre a désormais sa
> page, lisible sans jouer : le timbre, toutes les définitions (jusqu'à 12, sans coupure), l'origine entière, la
> prévalence et l'usage en jauges, un appel à ouvrir un paquet et six timbres de la même faction. Plus une liste de
> tous les mots (`/mots/`) et un plan du site qui les déclare tous. Les pages sont fabriquées au moment de la mise en
> ligne (`scripts/fabriquer-les-pages.ts`, à la suite de `vite build`) à partir des vrais composants du jeu ; elles
> n'ont aucun code. Textes complets : `npm run pages:textes` (après `npm run sources`) écrit
> `data/pages-des-mots.json`, sans toucher aux fichiers du jeu. Les guillochis ne restent que sur le grand timbre
> (une page pèse environ 60 Ko). Tous les timbres ont leur page, injurieux compris (décision de Raphaël : ils font partie de la langue).
> Dans le jeu, la fiche d'un timbre mène à sa page (« Toutes les définitions ») et le partage d'un timbre donne
> son lien. Rien à installer côté Supabase.

> **26 septembre 2026 — six timbres par paquet (script 23).** Décision de Raphaël : le sixième timbre a les chances du
> cinquième ; la Hors-série, la garantie et le paquet hebdomadaire ne touchent que le sixième ; la Légendaire est
> garantie au plus tard au 20e paquet sans Légendaire (au lieu du 40e). **Script 23 collé par Raphaël et vérifié le
> 26/09** (les deux fonctions identiques au dépôt, un paquet ouvert en production contient six timbres). La dernière
> migration est désormais la 23. Simulation (joueur régulier) : collection complète en 6,1 mois au lieu de 9,4,
> 20,9 Légendaires par semaine au lieu de 10,6. C'est le lot 0 de l'ouverture en feuille de timbres
> (brief du 26/09, travail purement esthétique pour la suite).

> **26 septembre 2026 — le défi contre un joueur simulé est vérifié (script 21).** Décision de Raphaël : le serveur
> vérifie. `combat_creer` n'accepte plus qu'un joueur maison que le jeu peut proposer au joueur : une seule fonction
> (`joueurs_simules_admissibles`) dit qui est admissible avec ses filtres, pour la liste comme pour la vérification,
> et la limite (écart du 5e plus proche + l'aléa de 150) couvre exactement ce que la liste peut contenir. Pas d'attente
> de 30 s imposée, défis entre amis inchangés. La base de test imite désormais Supabase, qui ouvre d'office toute
> nouvelle fonction aux joueurs. **Script 21 collé par Raphaël et vérifié le 26/09** (109 fonctions identiques au dépôt ;
> un joueur à 1 000 ne peut défier que les joueurs simulés de 848 à 1 160, ni le plus faible à 750 ni le plus fort à
> 1 652). La dernière migration est désormais la 21.

> **25 septembre 2026 — les points secondaires de l'audit.** Décisions de Raphaël : le compteur d'Encre mène **au
> marché** (le « + » explique comment en gagner et mène aux paquets et au marché, sans les formules) ; le fil d'activité
> ne montre plus que **les paquets** ; les confirmations sont **aux couleurs du jeu** ; les documents sont **rangés dans
> `docs/`**. D'office : paquet, cadeau et mise en vente portent un identifiant de demande (`src/services/demandes.ts`,
> table `demandes_traitees`) — redemandés après une coupure, ils ne sont servis qu'une fois ; l'état du compte ne
> recule plus à l'écran ; deux onglets restent d'accord (BroadcastChannel) ; un jeton refusé est vraiment renouvelé ;
> une page HTML d'un intermédiaire devient une panne lisible ; 1,5 s de marge pour le réseau en parade et en direct ;
> code de secours unique et à l'alphabet du jeu ; vieux essais de récupération purgés ; vente conclue gardée sans son
> vendeur ; histoire des prix fermée aux comptes inconnus ; cote 2v2 d'une équipe dissoute effacée ; les écrans se
> chargent à la demande (premier fichier de 794 à 296 Ko), mais leurs feuilles de style restent chargées d'emblée
> dans l'ordre d'avant (`src/theme/stylesDesEcrans.ts`, vérifié par un test) ; fenêtre de confirmation commune
> (`Confirmation.tsx`) ; page inerte derrière la parade et la fin du duel ; « réduire les animations » partout
> (`mouvement.ts`) ; recherche du marché après 300 ms ; album qui se souvient ; écran d'attente dans `index.html` ;
> fichiers de l'édition versionnés (`?v=`) ; CSP dans le site construit ; actions GitHub figées par empreinte ; code
> mort retiré (dont les anciens appels du duel local au serveur) ; tris et messages d'erreur partagés. **Script 20 et
> fonctions `combats` et `joutes-direct` installés par Raphaël le 26/09 et vérifiés en lecture seule** (étape 12 :
> les 106 fonctions de la base identiques au dépôt, droits, index, contrainte, code des deux fonctions identique octet
> pour octet). La dernière migration est désormais la 20.

> **25 septembre 2026 — plus de définition vide dans la parade.** En duel, la parade proposait parfois « Définition
> manquante ou à compléter. (Ajouter) » : un sens que le Wiktionnaire n'a pas encore rédigé, resté dans 8 cartes
> (speeder, galop, fantasmagorie, recourber, ronronnement, zakouski, incorporation, morne). Le pipeline écarte
> désormais ces textes d'attente (`estUneDefinitionVide`, `pipeline/etapes/nettoyage.ts`) ; le sens compte toujours dans
> la richesse du mot, si bien qu'aucune note ne bouge. **L'édition est désormais figée** (`figee: true` dans
> `pipeline/config.ts`) : le pipeline garde exactement les 3 016 cartes publiées, avec leur rareté et leurs badges,
> et ne recalcule que leurs textes et leurs notes ; recomposée, l'édition aurait échangé 4 cartes (le rapport le dit au
> §4). Résultat : seules les définitions des 8 cartes changent ; aucun script SQL à recoller. **`combats` et
> `joutes-direct`, qui composent les questions avec leur propre copie des définitions, sont redéployées (étape 12,
> vérifiée le 26/09)** — un test vérifie maintenant que cette copie suit celle du jeu.

> **25 septembre 2026 — la rareté se voit au cadre du timbre : une teinte de papier et un filet.** Raphaël ne voyait
> pas de différence entre les raretés (Commune, Peu commune et Rare étaient presque identiques, et une Commune
> brillante passait pour le meilleur timbre). Essais publiés dans la soirée : une aura autour du timbre, puis une
> marge tout en métal (jugée « un peu grossière »). **Retenu : le papier à peine teinté et un filet fin dans la marge,
> comme sur les timbres anciens** — Commune crème sans filet ; Peu commune filet à l'encre du timbre ; Rare papier
> pêche et filet de cuivre ; Épique papier lavande et filet violet (l'argent se confondait avec le crème) ;
> Légendaire papier blond et filet d'or ; Hors-série papier nacré et filet irisé. La finition (brillante,
> holographique) reste dans l'impression, le cadre ne dit que la rareté ; les valeurs Att./Déf. restent à l'encre
> claire. Tout est dans `src/composants/timbre/timbre.css`. Au passage, les accents des mots dorés (finition
> brillante) ne sont plus coupés (PÉPÈRE s'affichait PEPERE). Rien à installer. Page de contrôle : `#/timbres`
> (les six raretés dans chaque finition, en grand et en petit).

> **25 septembre 2026 — les paiements (achats toujours FERMÉS) : EN LIGNE.** `serveur/19-paiements.sql` collé et les
> quatre fonctions de paiement redéployées par Raphaël, vérifiés par l'assistant en lecture seule (empreintes du code
> déployé, « Verify JWT » désactivé, production « achats fermés »). Décisions de Raphaël : un joueur qui a payé supprime
> lui-même son compte (un abonnement qui se renouvelle se résilie d'abord) ; mois et année de naissance déclarés une fois
> pour toutes, paiement à partir du mois qui suit les 18 ans. D'office : un clic sur « acheter » ne bloque plus la
> suppression, une collection avec des achats n'est pas écrasée par une récupération par code, client ou session Stripe
> perdus retrouvés au lieu d'un blocage définitif, « Vérifier mes avantages » limité à une fois toutes les 20 s, messages
> d'erreur sans détail technique. La dernière migration est désormais la 19.

> **25 septembre 2026 — le tirage du serveur est testé** (`serveur/tirage.test.ts`, point 5 de l'audit) : les mêmes
> réglages que le navigateur, sur une vraie base PostgreSQL avec toute l'édition. Rien à installer. Les cinq priorités
> de l'audit sont traitées ; restent ses points secondaires, dont les paiements à régler avant d'ouvrir les achats.

> **25 septembre 2026 — le classement contre la triche : EN LIGNE.** `serveur/18-classement.sql` collé par Raphaël,
> vérifié par l'assistant en lecture seule.
> Décisions de Raphaël : contre les mêmes adversaires, 3 parties classées par jour (heure de Paris) ; le gagnant d'un
> abandon ou d'un forfait reçoit sa récompense de victoire ; un profil supprimé puis recréé retrouve son identité et sa
> cote (`comptes.profil_precedent`) ; on entre au classement après 5 parties classées. Et d'office : filtres de contenu
> normalisés par le serveur (plus de file à part), nombres du classement repris de `EQUILIBRAGE.joute` (cote minimale
> 100). Aucune fonction à redéployer (le paquet `joutes-direct` du dépôt reste celui qui est en ligne). La dernière
> migration est désormais la 18.

> **25 septembre 2026 — tenue du serveur et match à accepter : EN LIGNE.** Fonction `joutes-direct` redéployée et
> `serveur/17-tenue-du-serveur.sql` collé par Raphaël, vérifiés par l'assistant en lecture seule (code déployé identique au
> dépôt, 26 fonctions, verrous, droits). Décisions de Raphaël : « J'y vais ! » pour tous, 20 s pour
> accepter, sans défaite si le match n'est pas accepté (ceux qui avaient accepté gardent leur rang dans la file) ; un
> onglet caché reste dans la file (150 s sans nouvelles), avec titre d'onglet et sonnette ; **Supabase reste gratuit**
> (passer à Pro avant une grosse campagne ou à 70 % d'une limite ; surveillance hebdomadaire dans A-FAIRE-RAPHAEL.md).
> Côté technique : un verrou par domaine (`serveur/verrous.ts`, ordre marché → direct → joueur), écran des joutes sans
> verrou, clôture des enchères sans verrou quand rien n'est échu, lectures au bon moment (`prochaineLecture`) au lieu
> de toutes les 2,5 s. La dernière migration est désormais la 17.

> **25 septembre 2026 — parrainage confirmé et comptes neufs : EN LIGNE.** `serveur/16-parrainage-confirme.sql` collé
> par Raphaël, vérifié par l'assistant en lecture seule (fonctions, droits, blocage, colonnes, déclencheurs). Décisions de Raphaël : le filleul reçoit ses 3 paquets dès son premier duel ;
> le parrain reçoit les siens quand le filleul a relié un compte Google ou e-mail ET terminé un duel un autre jour
> (heure de Paris) dans les 14 jours après son arrivée ; 10 filleuls récompensés par mois ; un compte de moins de
> 3 jours ne peut ni échanger, ni enchérir, ni vendre ; les parrainages déjà validés restent acquis (il n'y en avait
> aucun). 65 des 66 comptes avaient moins de 3 jours à l'installation : leurs échanges et leur marché s'ouvrent seuls,
> au plus tard le 28/09 à 14 h 45 (personne ne s'en était encore servi). La dernière migration est désormais la 16.

> **25 septembre 2026 — audit complet du code : [docs/AUDIT-CODE-2026-09-25.md](docs/AUDIT-CODE-2026-09-25.md).** Aucune faille
> critique. Priorités restantes : parrainage et comptes jetables, verrou unique du serveur, classement manipulable, tests
> du tirage côté serveur. **Corrigé le jour même (« joueur bloqué ») :** filet d'erreur (plus de page vide), fond animé
> d'une fenêtre de taille nulle, « Réessayer » sur l'album et le deck, partie illisible expliquée au lieu de
> « Chargement… » sans fin, déconnexion possible sans réseau, édition chargée avant l'ouverture d'un paquet sur le serveur.
> Aucun changement côté Supabase.

> **25 septembre 2026 — refontes des écrans Duel et des Amis/Équipe : en ligne.** Publiées avec le jeu du 25/09.
> Duel (`docs/duel/BRIEF-duel.md`) : préparation réunie avec le Deck (quatre modes en onglets, deck éditable sur place), partie
> (barres de vie graduées, main et pioche), parade plein écran avec minuteur, résolution animée, nouveaux sons, écran
> de fin avec les gains réels. Amis et Équipe (`docs/GUIDE-portraits-et-presence.md`) : en-tête commun, fiche de chaque ami
> (portrait, niveau, présence, vitrine de ses quatre plus beaux timbres), blason et cote 2v2 de l'équipe.
> **`serveur/15-portraits-et-presence.sql` : installé**, constaté par l'assistant le 25/09 en lecture seule (fonctions
> à jour, droits corrects, premier signal de présence reçu à 18 h 06). La dernière migration est désormais la 15.

> **25 septembre 2026 — mot adverse caché jusqu'à la parade (anti-triche) : en ligne.** Le serveur des combats envoyait au
> navigateur le mot adverse et sa définition dès le début de la manche : corrigé. Avant la parade, on ne voit plus que
> la nature, l'attaque et la défense (timbre face cachée), partout, Facile compris ; le mot se retourne à l'ouverture
> de la parade, sa définition n'arrive qu'au bilan. En Normal, en Difficile et contre un double, la pose alterne (le
> joueur à la manche 1) ; l'ordinateur Difficile qui répond joue une carte qui bat le type du joueur, s'il en a une.
> En direct, les mots de l'autre camp restent face cachée pendant la pose. Victoires simulées (bon lecteur, collection
> moyenne) : Normal 82 → 78 %, Difficile 64 → 58 % (`data/simulation-duel.md`). Moteur des combats en version 3 (les
> combats en cours continuent). Jeu publié, fonctions `combats` et `joutes-direct` redéployées par Raphaël le 25/09 : **en ligne**.

> **25 septembre 2026 — nouveaux cadres et avatars de portrait : publiés.** Choisis par Raphaël sur une planche de tri en
> trois passes : 34 cadres et 26 avatars (gratuits gravés, débloqués en métal, premium animés), une récompense par niveau
> jusqu'au 50 avec la courbe d'XP inchangée (le niveau 12 était atteint en un ou deux jours). Trois pièces premium sont
> offertes aux fidèles (« prestige ») : Œil de l'oracle niv. 30, Nébuleuse niv. 40, Couronne du Grand Philatéliste
> niv. 50. Dessins dans `src/composants/cosmetiques/dessins/`, catalogue dans `src/jeu/personnalisation.ts`.
> Aucun changement côté Supabase.

> **25 septembre 2026 — refonte graphique (brief `BRIEF-ceremonie.md`, maquette de Claude) : publiée.**
> Nouveau timbre partout (aspect de la maquette, avec attaque, défense et origine), cérémonie d'ouverture de paquet
> (déchirure au geste, révélation une par une, « Tout révéler », rangement animé dans l'album), nouvel accueil (comptoir,
> album en aperçu, duels, fond animé, fil d'activité de tous les joueurs). Détails et décisions : `docs/GUIDE-refonte-ceremonie.md`.
> **`serveur/14-fil-d-activite.sql` installé par Raphaël le 25/09**, vérifié (la fonction publique `fil_d_activite`
> répond). Le fil reste caché tant qu'il est vide : il apparaît au premier événement (nouveau pseudonyme, victoire en
> joute classée, Légendaire ou Hors-série trouvée, finition holographique). La dernière migration est désormais la 14.

> **25 septembre 2026 — faire connaître le jeu.** Raphaël a demandé comment promouvoir le site (déjà public sur
> philamots.fr) et a choisi quatre chantiers :
> 1. **Vignette de partage et Google — publiés.** Image 1200 × 630 avec trois timbres quand on partage le lien,
>    titre d'accueil descriptif, fiche du jeu pour les moteurs, `robots.txt`, `sitemap.xml`. **À faire par Raphaël :
>    Google Search Console et Bing** (`docs/GUIDE-google.md`) ; balise de vérification de Google publiée le 25/09 dans
>    `index.html`, site validé et sitemap envoyé par Raphaël le 25/09, puis importé dans Bing : FAIT.
> 2. **Contrôle anti-robot Cloudflare Turnstile — EN LIGNE depuis le 25/09.** Le jeu envoie un jeton à l'ouverture
>    d'un compte et à l'envoi d'un code e-mail (`cleAntiRobot` réglée) ; Raphaël a activé le contrôle dans Supabase
>    avec la clé secrète et vérifié en navigation privée (`docs/GUIDE-anti-robot.md`). En cas de souci : le décocher dans
>    Supabase, Authentication → Attack Protection.
> 3. **Adversaire de secours** (décisions de Raphaël : sans classement, proposé après 30 s) et 4. **parrainage**
>    (3 paquets chacun au premier duel terminé du filleul, 10 filleuls récompensés par mois) — **code publié,
>    script 13 installé sur Supabase le 25/09 (par
>    l'assistant, avec l'autorisation de Raphaël), vérifié, interrupteur `secoursEtParrainage` ouvert : EN LIGNE.**
>    La dernière migration est désormais la 13 (`docs/GUIDE-secours-et-parrainage.md`).

> **Décision de Raphaël du 24 septembre 2026 — un seul pseudonyme, public dès qu’il est choisi.** La même case « Choisis ton pseudonyme » (`src/composants/ChoixDuPseudonyme.tsx`) sert sur le Profil, les Amis, les Joutes en direct et l’Équipe ; une fois choisi, il n’est plus jamais redemandé, et le Profil permet de le changer. Le choisir publie le profil de joute (ancien « Rejoindre les joutes ») ; la page Confidentialité le dit. Même jour : sur téléphone, la barre du bas passe de 7 à 5 onglets (Accueil, Album, Duel, Marché, Profil) ; le Deck et les Classements se rangent dans Duel, qui reste allumé sur leurs pages, et le salon des duels gagne un raccourci « Classements ». L’ordinateur garde ses 7 entrées.

> **Amis et duels — déployés le 24 septembre 2026 :** demandes par pseudo, échanges d’un timbre contre un timbre et défis contre le double d’un ami sans effet sur le classement. Les attaques sont automatiques ; une seule question de définition sert à parer. Migration `serveur/10-amis.sql`, fonction `combats` et client `12f50a4` publiés avec succès. Données conservées, 326 tests réussis, parcours complet vérifié avec deux comptes locaux et pages publiques contrôlées : voir [docs/GUIDE-amis.md](docs/GUIDE-amis.md).

> **Migration appliquée le 23 septembre 2026 :** serveur/6-offres.sql exécuté avec succès sur le projet Supabase cgubfyxyivgufslpwlld. Contrôle avant/après : 38 comptes, 254 possessions, 77 Encre, inchangés. RPC de récompense disponible aux joueurs connectés ; tirage interne inaccessible. Aucun droit payant attribué et aucun déploiement du client dans cette intervention. Cette note remplace les indications antérieures disant que la migration reste à appliquer.


## Décisions du 23 septembre 2026 — prioritaires sur le bilan ci-dessous

- **Deux offres implémentées localement, paiement fermé.** Achat unique : cosmétiques premium permanents et une Hors-série parmi toutes, doublon possible. Abonnement : paquet toutes les 8 minutes, réserve 15, +25 % XP sur duels et bonnes réponses, paquet hebdomadaire dont la dernière carte est Épique à 89 %, Légendaire à 10 %, Hors-série à 1 %. Titres par succès uniquement. Prix indicatifs : 5,99 € et 4,99 €/mois. Voir docs/BRIEF-version-payante.md. Appliquer serveur/6-offres.sql avant publication. XP encore locale, à synchroniser avant commercialisation du bonus.
- **L’Encre sert uniquement aux enchères, quelle que soit son origine.** Achat de paquets supprimé dans le code local, les services et le script SQL. Compilation et tests à vérifier après chaque changement. Le site public et Supabase ne sont pas encore mis à jour : suivre la note du 23 septembre dans docs/GUIDE-supabase.md.
- **Domaine :** `philamots.fr` est actif chez OVHcloud et enregistré dans GitHub Pages. Les quatre adresses A GitHub et le CNAME de `www` sont vérifiés ; l’ancienne IPv6 est retirée. La dernière capture GitHub confirme « DNS check successful » et « Enforce HTTPS » coché. **Contact :** Raphaël confirme que `contact@philamots.fr` fonctionne après les instructions de test du webmail. Voir `docs/GUIDE-domaine-et-contact.md`. Aucun achat du `.com` n’est confirmé.
- **Joueurs simulés :** conserver temporairement les joueurs maison en les signalant discrètement mais lisiblement, puis les retirer lorsque la communauté sera suffisante. Mention « Joueur simulé » ajoutée au code local (choix d’adversaire, classement, duel), avec transmission du marqueur `maison` par le serveur. Déploiement SQL puis client restant à faire. Aucun retrait effectué, seuil de retrait à définir après les tests.
- **Vente :** aucun prestataire de paiement ni structure juridique en place ; pas de validation juridique obtenue. La vente d’Encre n’a pas de tarif fixé.
- Les rapports de simulation sont recalculés sans achats de paquets : les anciennes conclusions sur l’équilibre de l’Encre sont obsolètes. Ne pas fixer de bonus ou tarif d’Encre sur cette ancienne base.

Le bilan du 22 septembre ci-dessous décrit la version précédemment publiée.

**Suivi du raccordement :** terminé pour le domaine et la messagerie. HTTPS répond et HTTP redirige vers HTTPS,
vérifiés depuis le terminal avec accès réseau. Raphaël confirme l’accès sécurisé au jeu en navigation privée
puis normale après rechargement. La récupération de son ancienne collection reste à confirmer séparément.

*Mis à jour le 22 septembre 2026. Ce document remplace la lecture de cinq briefs : il dit ce qui marche, ce qui
attend Raphaël, et ce qui m'attend. Les détails restent dans les documents cités.*

**Le jeu en ligne : https://philamots.fr/**

---

## Ce qui marche aujourd'hui

Tout ce qui suit est en ligne, vérifié contre le vrai serveur, et jouable.

- **Les paquets et la collection.** Un paquet gratuit toutes les 10 minutes, 10 en réserve, 6 timbres par paquet,
  3 016 cartes dans l'édition dont 16 hors-série. Finitions normale, brillante, holographique. Les doublons
  deviennent de l'Encre. L'album se filtre et se cherche.
- **Les duels.** Mot contre mot, avec parade. Un deck de dix cartes, trois niveaux, cinq bonnes réponses pour
  maîtriser un mot et gagner un cachet daté sur son timbre.
- **Les joutes classées.** Contre le « double » d'un autre joueur, avec cote, ligues et classement.
- **Le serveur est propriétaire des collections.** Timbres, Encre, paquets, deck et récompenses passent par lui.
  Avancer l'heure de son téléphone ne donne plus rien.
- **Le code de secours.** Vingt signes à noter, qui rendent la collection sur un autre appareil.
- **Le marché aux enchères.** Mise de départ, prix d'achat immédiat facultatif, 12, 24 ou 48 heures, commission de
  10 %, 10 ventes en cours et 10 achats par jour pour un joueur gratuit.
- **La cote des timbres.** Sur chaque fiche, la médiane des prix des ventes des 30 derniers jours, par finition,
  relevée une fois par jour.
- **Le nom.** Le jeu s'appelle Philamots depuis le 22 septembre 2026.
- **Les trois formules payantes.** Construites et vérifiées, mais **personne ne peut payer** : aucun prestataire
  n'est branché, et plusieurs points doivent être réglés avant. Une page du jeu les présente honnêtement.

---

## Ce qui attend Raphaël

Par ordre d'importance. Rien de tout cela ne demande de savoir programmer.

1. **Recruter cinq testeurs**, et les faire jouer plusieurs jours. Le guide est prêt dans `docs/GUIDE-testeurs.md`, leurs
   retours vont dans `docs/RETOURS-testeurs.md`. **C'est ce qui manque le plus au projet.** Le jeu est complet ; ce qu'il
   n'a pas, ce sont de vrais joueurs.
2. **Créer son propre code de secours** (Réglages → Ton compte). Sans lui, perdre son navigateur, c'est perdre sa
   collection. Raphaël ne l'a pas encore fait.
3. **Juger les sons à l'oreille** : ceux du duel, et le carillon des paquets. Je ne les entends pas.
4. **Essayer le marché sur deux appareils** : vendre d'un côté, acheter de l'autre.
5. **Remplir les blancs des conditions de vente** (`docs/CGV-brouillon.md`) : forme juridique, adresse, numéro
   d'immatriculation. Sans cela, rien ne peut être vendu.
6. **Relier le domaine actif et créer le contact.** Suivre `docs/GUIDE-domaine-et-contact.md` pour GitHub Pages et
   `contact@philamots.fr`. Noter le code de secours sur l’ancienne adresse avant la bascule.
7. **Consulter un juriste** avant le premier euro encaissé. Voir `docs/BRIEF-version-payante.md`, §4.

---

## Ce qui m'attend

- **Finaliser en parallèle des tests joueurs :** raccorder le domaine, établir le contact, signaler les joueurs
  simulés et préparer la publication des deux offres implémentées.
- **La connexion par e-mail :** le domaine existe désormais. Le service d’envoi et son raccordement à Supabase
  restent à préparer ; créer une boîte de contact n’active pas les liens de connexion du jeu.
- **Un contrôle anti-robot** avant d'ouvrir le jeu au grand public. Aujourd'hui, n'importe qui peut créer des
  comptes en série.
- **Les avis de recherche** (étape M5 du marché) et **le troc** (M6), quand il y aura assez de joueurs pour que ces
  fonctions aient un sens.
- **La variante de question « De quelle langue vient ce mot ? »**, laissée de côté parce que l'origine est imprimée
  sur le timbre que le joueur vient de voir. Deux pistes sont notées au §5.4 de `docs/BRIEF-v2.md`.

---

## Points connus, non corrigés

Ce ne sont pas des pannes, mais des choses que je sais imparfaites.

- Soixante-trois cartes ont une définition qui nomme un proche parent du mot, ce qui rend l'épreuve trop facile.
- Quand l'attaque du joueur terrasse l'adversaire, la parade est quand même demandée.
- Un duel interrompu n'est pas repris.
- En niveau Difficile, les meilleurs joueurs gagnent encore trois fois sur quatre.
- La population de joueurs fictifs a des cotes fixes : la cote d'un vrai joueur gonfle à leur contact.
- Les 240 joueurs maison ne sont pas encore signalés dans la version publiée. La mention est préparée localement ;
  elle nécessite la mise à jour du serveur et du client.

---

## Les documents, et à quoi ils servent

| Document | Ce qu'on y trouve |
|---|---|
| `docs/BRIEF-v2.md` | Le document de référence du jeu, et toutes les décisions numérotées |
| `docs/BRIEF-marche.md` | Le plan du marché, étape par étape |
| `docs/BRIEF-version-payante.md` | Ce qui est construit, ce qui manque, ce qui bloque le premier euro |
| `docs/CGV-brouillon.md` | Le brouillon des conditions de vente, avec les blancs à remplir |
| `docs/GUIDE-supabase.md` | La mise en route du serveur, pas à pas, pour Raphaël |
| `docs/GUIDE-domaine-et-contact.md` | Le raccordement du domaine actif et la création du contact chez OVHcloud |
| `docs/GUIDE-testeurs.md` | Ce qu'on demande aux cinq testeurs |
| `docs/GUIDE-google.md` | Faire connaître le site à Google et à Bing ; la vignette de partage |
| `docs/GUIDE-anti-robot.md` | Le contrôle anti-robot Cloudflare Turnstile, étape par étape |
| `docs/GUIDE-secours-et-parrainage.md` | L'adversaire de secours des joutes en direct et le parrainage |
| `data/simulation-marche.md` | L'économie du marché, mesurée |
| `README.md` | Le dépôt, les commandes, l'organisation des fichiers |
