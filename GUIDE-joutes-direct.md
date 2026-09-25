# Joutes en direct — 1v1 et 2v2

## Mise en production du 24 septembre 2026

La fonction `joutes-direct` et la migration 12 sont déployées sur Supabase. Les 243 profils présents avant la migration sont conservés. Vérifications distantes : refus sans session (401), authentification effective, trois classements accessibles (200), états privés interdits (403), abonnement PostgreSQL et réception d'une notification Realtime. Le jeton est initialisé avant la première souscription pour que les règles RLS reconnaissent le joueur.

Validation locale : 342 tests réussis, compilation de production réussie et parcours avec quatre navigateurs couvrant le placement 2v2, les propositions, l'arbitrage et les dégâts partagés. Les classements commencent à afficher un participant après sa première partie en direct. La vérification mobile complète et les essais de charge restent à faire.

## Le match à accepter et la tenue du serveur (25 septembre 2026, script 17)

Décisions de Raphaël :
- **Un match trouvé doit être accepté.** Chaque joueur voit « Adversaire trouvé ! » avec un bouton **« J'y vais ! »** et
  **20 secondes** pour le presser (`EQUILIBRAGE.direct.secondesPourAccepter`). La partie ne commence que quand tout le
  monde a accepté. Ni noms ni cotes avant d'accepter : on ne peut pas refuser les adversaires les plus forts.
- **Ne pas accepter ne coûte rien.** Délai écoulé : ceux qui avaient accepté reprennent leur place dans la file, **à leur
  rang d'origine** ; les absents en sortent. « Refuser » : tous les autres reprennent leur place. Ni défaite, ni cote,
  ni récompense.
- **Un onglet caché reste dans la file.** Le jeu continue de donner signe de vie ; le joueur sort de la file après
  **150 secondes** sans nouvelles (onglet fermé, téléphone en veille). Quand un adversaire est trouvé, le titre de
  l'onglet devient « ⚔ Adversaire trouvé ! » et une sonnette retentit, même onglet caché (si les sons du jeu sont
  allumés et que le joueur a touché la page avant). Le bouton « J'y vais ! » prend la main.

Ce qui change pour la charge (audit du 25/09) :
- **Chaque domaine a son verrou** (`serveur/verrous.ts`) : le direct et les équipes d'un côté, le marché, les échanges
  et les comptes de l'autre. Ordre imposé : marché, puis direct, puis les données d'un joueur — plus d'interblocage
  possible entre le retrait d'un profil et une enchère.
- **Regarder l'écran des joutes ne verrouille plus rien** : seule une recherche ou une proposition en cours passe par le
  verrou du direct. Et la clôture des enchères ne prend le verrou du marché que s'il y a vraiment une enchère échue (avant,
  à chaque chargement du compte).
- **Le jeu interroge le serveur au bon moment** (`prochaineLecture`, `src/jeu/direct.ts`) : quand le temps réel
  prévient d'un changement, juste après chaque échéance, et sinon toutes les 15 s en file ou en partie, toutes les
  60 s au repos (5 à 30 s sans temps réel). Avant : toutes les 2,5 s quoi qu'il arrive, soit 1 440 appels par heure pour
  qui regardait l'écran. L'offre gratuite de Supabase en compte 500 000 par mois.

Déploiement : **d'abord** la fonction `joutes-direct` (`serveur/deploiement-direct/joutes-direct.ts.txt`), **puis**
`serveur/17-tenue-du-serveur.sql`. Le jeu, déjà publié, sait lire l'ancien serveur. Dans l'autre ordre, rien ne casse :
l'ancienne fonction lancerait seulement les parties sans attendre que chacun accepte. Un joueur qui avait le jeu ouvert
avant la mise à jour doit recharger la page pour voir le bouton « J'y vais ! ». La fonction `combats` ne change pas.

### Installé le 25 septembre 2026

Fonction `joutes-direct` redéployée et script 17 collé par Raphaël. Vérifié par l'assistant le soir même, en lecture
seule : le code déployé est identique à `serveur/deploiement-direct/joutes-direct.ts.txt` (même empreinte SHA-256) et
« Verify JWT with legacy secret » reste désactivé ; dans la base, les 26 fonctions concernées sont en place avec le bon
verrou (direct pour le salon, les propositions et les équipes ; marché pour les enchères ; les deux, dans l'ordre, pour
l'effacement d'un compte et la récupération par code), les droits sont corrects (fonctions internes fermées aux
joueurs), les trois colonnes et les six déclencheurs sont là, `direct_signaux` est toujours publié en temps réel.
Aucune partie ni proposition en cours à ce moment-là. Reste à l'essayer à deux (étape 9 d'`A-FAIRE-RAPHAEL.md`).

## Règles

- **Solo** : deux humains présents. La cote solo existante sert de point de départ ; les anciennes données ne sont pas effacées.
- **2v2 solo** : inscription individuelle uniquement, quatre joueurs mélangés par le serveur. Cote personnelle distincte, départ à 1 000.
- **2v2 équipe** : deux duos enregistrés. Chaque membre se déclare prêt ; aucune réservation sans son partenaire. Une cote par équipe, départ à 1 000. Aucun effet sur les deux cotes personnelles.
- Dix cartes par joueur, main de trois cartes, vingt PV en solo et quarante PV communs par équipe en 2v2. Les mains sont visibles uniquement dans son propre camp ; la pioche est privée.
- Manche impaire : A1, B1, B2, A2. B1 choisit l'opposition ; B2 prend la voie restante. Manche paire : B2, A2, A1, B1. Le dernier poseur de chaque camp arbitre.
- Pendant la pose, une carte de l'autre camp ne se voit que face cachée : nature, attaque, défense (règle du 25/09/2026, `vueDirect`). Tous les mots se retournent à l'ouverture des réponses ; aucune définition n'est transmise avant le bilan.
- Huit secondes par pose, trente secondes pour les définitions, cinq secondes en cas de désaccord, quatre secondes pour le bilan. Les deux équipes répondent simultanément. Unanimité complète : résolution anticipée.
- Une proposition seule est retenue. Deux propositions différentes : l'arbitre choisit entre elles ; sans choix, sa proposition est retenue. Aucune réponse : pas de parade.
- Les attaques sont automatiques et simultanées, calculées contre la carte de la même voie. Les bonus de faction suivent la carte précédente de chaque joueur. Une parade réduit les dégâts selon les règles existantes.
- Une pose manquée joue la première carte disponible sur la première voie libre. Deux poses manquées consécutives font perdre le camp. Un abandon fait également perdre le camp.
- **Le classement contre la triche (décisions de Raphaël du 25/09/2026, script 18)** :
  - contre les mêmes adversaires (les mêmes camps face à face), seules les **3 premières parties du jour** (heure de
    Paris) font bouger la cote ; au-delà, la partie se joue normalement (XP, Encre avec les plafonds habituels) et la fin
    de partie dit « cette partie ne change pas la cote » (registre `direct_rencontres`, que le retrait d'un profil
    n'efface pas) ;
  - on n'apparaît au classement qu'après **5 parties classées** ; avant, l'écran du classement montre sa cote et le
    nombre de parties qui manquent ;
  - un profil supprimé puis recréé **retrouve son identité et sa cote** (`comptes.profil_precedent`,
    `serveur/classement.ts`) : on n'efface pas ses défaites en recommençant ; tout s'efface avec le compte ;
  - les filtres de contenu sont triés et dédoublonnés par le serveur : une combinaison inhabituelle ne crée plus une
    file à part où deux comptes d'un même tricheur ne rencontreraient qu'eux-mêmes ;
  - les nombres du classement sont ceux du jeu (`EQUILIBRAGE.joute` : K 32, échelle 400, cote minimale 100).
- Résultat et Elo (K=32) sont enregistrés une seule fois. En 2v2 solo, l'espérance dépend des moyennes des deux camps. Les classements affichent les participants ayant terminé au moins une partie en direct, le top 100 et le voisinage du joueur.
- Les réponses personnelles vérifiées font progresser XP et maîtrise. Les parties terminées normalement conservent les récompenses d'Encre/XP et les limites quotidiennes existantes. Un abandon ou forfait ne donne aucune prime de fin au camp qui abandonne ou disparaît ; **le gagnant reçoit sa récompense de victoire** (décision du 25/09/2026). L'XP déjà gagnée reste acquise.

## Architecture et limites

`joutes-direct` authentifie chaque requête via Supabase Auth. Le moteur TypeScript conserve l'état privé en base et transmet une vue propre au joueur. Révisions SQL, identifiants de commande et verrouillage assurent les réponses concurrentes et l'absence de double résultat.

Supabase Realtime diffuse uniquement une notification personnelle depuis `direct_signaux`, protégée par RLS. Le navigateur recharge ensuite sa vue authentifiée. Une lecture juste après chaque échéance fait progresser les délais ; une lecture de sécurité régulière assure la reprise, plus fréquente si le WebSocket tombe (voir plus haut). L'horloge PostgreSQL fait foi. Après fermeture de tous les clients, le prochain appel rattrape les échéances ; ce mécanisme n'est pas un ordonnanceur permanent.

Les recherches expirent après 150 secondes sans présence (45 avant le 25/09/2026). Le serveur groupe les joueurs ayant les mêmes filtres de contenu et prend les plus anciennes inscriptions ; il ne filtre pas encore les adversaires par écart de cote. Les decks sont vérifiés puis figés au lancement. Le mode équipe exige les deux membres actuels du duo ; quitter, dissoudre, supprimer ou transférer le profil est refusé pendant une partie active.

Les définitions restent des données publiques du jeu : cette vérification interdit l'injection d'un résultat, sans prétendre empêcher la consultation d'un dictionnaire externe. Les accès directs aux états privés et aux fonctions administratives sont refusés aux joueurs.

## Installation

1. Appliquer les migrations existantes jusqu'à `11-equipes.sql`.
2. Générer les artefacts avec `node serveur/preparer-direct.mjs` (Node 22.18+ ; ajouter `--experimental-strip-types` avec Node 22.14).
3. Déployer `supabase/functions/joutes-direct/index.ts` avec la CLI, ou copier `serveur/deploiement-direct/joutes-direct.ts.txt` dans l'éditeur Supabase. La fonction utilise les variables serveur réservées `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. La passerelle JWT est désactivée pour cette fonction seulement ; le code vérifie toujours le jeton via `/auth/v1/user`.
4. Appliquer `serveur/12-joutes-direct.sql`, en transaction. Il ajoute les nouvelles tables, les fonctions, les règles RLS et la publication Realtime si elle existe. Il empêche les anciens clients de démarrer de nouvelles joutes classées contre un double ; entraînements et défis amicaux restent disponibles. Ne pas republier une ancienne migration après la 12.
5. Vérifier la fonction, les droits et la réception des notifications. Publier ensuite le client, jamais avant le serveur.

## Vérifications

`node --test serveur/direct.test.ts` couvre placements, alternance, arbitrage, réponses isolées, confidentialité, délais, reprise, migration répétable, séparation des files/cotes, droits SQL, résultat unique et réponses concurrentes. `npm test` et `npm run build` vérifient l'ensemble du projet.

`node serveur/apercu-direct.mjs` ouvre quatre origines locales (ports 5190 à 5193), quatre comptes fictifs et PostgreSQL embarqué. L'horloge de combat y est figée pour l'inspection manuelle ; POST `/__test/advance` avance de 31 secondes. Ce banc n'appelle pas Supabase distant et ne doit pas être déployé.

La validation de charge à grande échelle reste distincte des tests fonctionnels.
