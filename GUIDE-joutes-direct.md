# Joutes en direct — 1v1 et 2v2

## Mise en production du 24 septembre 2026

La fonction `joutes-direct` et la migration 12 sont déployées sur Supabase. Les 243 profils présents avant la migration sont conservés. Vérifications distantes : refus sans session (401), authentification effective, trois classements accessibles (200), états privés interdits (403), abonnement PostgreSQL et réception d'une notification Realtime. Le jeton est initialisé avant la première souscription pour que les règles RLS reconnaissent le joueur.

Validation locale : 342 tests réussis, compilation de production réussie et parcours avec quatre navigateurs couvrant le placement 2v2, les propositions, l'arbitrage et les dégâts partagés. Les classements commencent à afficher un participant après sa première partie en direct. La vérification mobile complète et les essais de charge restent à faire.

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
- Résultat et Elo (K=32) sont enregistrés une seule fois. En 2v2 solo, l'espérance dépend des moyennes des deux camps. Les classements affichent les participants ayant terminé au moins une partie en direct, le top 100 et le voisinage du joueur.
- Les réponses personnelles vérifiées font progresser XP et maîtrise. Les parties terminées normalement conservent les récompenses d'Encre/XP et les limites quotidiennes existantes. Un abandon ou forfait ne donne aucune prime de fin ; l'XP déjà gagnée reste acquise.

## Architecture et limites

`joutes-direct` authentifie chaque requête via Supabase Auth. Le moteur TypeScript conserve l'état privé en base et transmet une vue propre au joueur. Révisions SQL, identifiants de commande et verrouillage assurent les réponses concurrentes et l'absence de double résultat.

Supabase Realtime diffuse uniquement une notification personnelle depuis `direct_signaux`, protégée par RLS. Le navigateur recharge ensuite sa vue authentifiée. Un contrôle toutes les 2,5 secondes assure la reprise et la progression des délais si le WebSocket tombe. L'horloge PostgreSQL fait foi. Après fermeture de tous les clients, le prochain appel rattrape les échéances ; ce mécanisme n'est pas un ordonnanceur permanent.

Les recherches expirent après 45 secondes sans présence. Le serveur groupe les joueurs ayant les mêmes filtres de contenu et prend les plus anciennes inscriptions ; il ne filtre pas encore les adversaires par écart de cote. Les decks sont vérifiés puis figés au lancement. Le mode équipe exige les deux membres actuels du duo ; quitter, dissoudre, supprimer ou transférer le profil est refusé pendant une partie active.

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
