# L'adversaire de secours et le parrainage

*Écrit le 25 septembre 2026. Décisions de Raphaël du 24 septembre.*

## Ce qui est construit

### L'adversaire de secours des joutes en direct

- Quand un joueur cherche une joute en direct (**Solo** ou **2v2 solo**) et que personne n'est libre depuis
  **30 secondes**, le jeu propose : « Jouer contre un joueur simulé ». La recherche continue tant que le joueur
  n'accepte pas. En **2v2 équipe**, rien n'est proposé : on y attend son partenaire.
- Le duel se joue sur l'écran Duel, contre un joueur maison proche de sa cote, signalé « Joueur simulé ».
  Il est marqué **« Sans classement »** : aucune cote ne bouge. Il rapporte l'Encre et l'expérience d'un duel
  normal, dans la même limite quotidienne.
- Si un vrai joueur arrive au moment où l'on accepte, la joute en direct passe avant.

### Le parrainage

- Page **Amis** : chaque joueur a son lien d'invitation (`https://philamots.fr/?parrain=XXXXXXXX`), avec les
  boutons « Copier le lien » et « Partager… », et le compte de ses invités.
- Le nouveau venu qui arrive par ce lien voit sur l'accueil : « Bienvenue ! … t'a invité. Termine ton premier
  duel : tu recevras 3 paquets. »
- Quand il **termine son premier duel sans l'abandonner** (entraînement, défi, adversaire de secours ou joute en
  direct), il reçoit **3 paquets** aussitôt.
- **Depuis le script 16 (décision du 25 septembre 2026)**, le parrain ne reçoit les siens que lorsque le filleul est
  **confirmé** : il a **relié un compte Google ou e-mail**, et il a **terminé un duel un autre jour** que le premier
  (heure de Paris), dans les **14 jours** après son arrivée. Le parrain les reçoit à sa visite suivante, avec un
  message « Merci pour l'invitation ! … a confirmé son inscription ». Tant que ce n'est pas fait, le filleul voit sur
  l'accueil « Remercie … » avec ce qu'il lui reste à faire, et le parrain voit combien de ses invités doivent encore
  le faire. Les parrainages validés avant le script 16 restent acquis.
- **Comptes neufs** (script 16) : pendant ses **3 premiers jours**, un compte ne peut ni proposer ni accepter un
  échange, ni enchérir, ni vendre. Le serveur répond « Les échanges et le marché s'ouvrent 3 jours après ton arrivée :
  le JJ/MM à HH:MM. » Sinon, des comptes jetables feraient remonter leurs paquets vers un compte principal.
- Garde-fous contre les faux comptes :
  - seul un **nouveau joueur** peut se déclarer invité (compte de moins de 7 jours, aucun duel terminé), une
    seule fois ;
  - on ne peut pas s'inviter soi-même, ni s'inviter l'un l'autre ;
  - le parrain est récompensé pour **10 filleuls confirmés par mois** au plus (le filleul, lui, l'est toujours) ;
  - un compte invité (sans Google ni e-mail) n'est jamais confirmé ;
  - le premier duel est vérifié par le serveur des combats : le navigateur ne peut pas le déclarer.
- Les paquets offerts ne font jamais dépasser **15 paquets en réserve**. Sans place, ils attendent, et le joueur
  voit : « Des paquets t'attendent ».
- La page Confidentialité explique ce que le serveur retient.

Tous ces réglages sont dans `src/config/equilibrage.ts` (rubriques `parrainage`, `comptesNeufs` et `secours`).

## Vérifications faites

- 10 tests sur une vraie base PostgreSQL (`serveur/parrainage.test.ts`, `serveur/combats.test.ts`) et 3 tests des
  messages (`src/jeu/parrainage.test.ts`) : codes,
  refus, récompenses, réserve pleine, plafond mensuel, récupération et suppression de compte, droits, choix des
  joueurs simulés, script rejouable deux fois.
- Parcours complet dans le navigateur sur un banc local (`node serveur/apercu-secours-parrainage.mjs`) :
  lien d'invitation, arrivée d'un nouveau venu, premier duel, 3 paquets de chaque côté, messages ; recherche en
  direct, proposition après 30 s, duel « Sans classement » contre un joueur simulé ; affichage sur téléphone.

## Installé le 25 septembre 2026

Le script 13 a été collé dans Supabase par l'assistant, avec l'autorisation de Raphaël, dans le navigateur où
Raphaël était connecté : « Success. No rows returned ». Contrôles faits ensuite :
- dans la base, en lecture seule : les 7 fonctions, les 2 déclencheurs, la table `parrainages` et la nouvelle
  `combat_creer` sont en place ; 240 joueurs maison et 61 comptes, inchangés ;
- depuis l'extérieur, avec un joueur d'essai créé puis supprimé : code d'invitation stable, refus du code inconnu et
  de son propre lien, adversaires de secours installés, fonction interne et table fermées aux joueurs (403) ;
  après suppression, 61 comptes, aucun parrainage ni code restant.

L'interrupteur `secoursEtParrainage` est passé à `true` et le jeu publié le même jour.

## Script 16 installé le 25 septembre 2026

Collé par Raphaël. Vérifié par l'assistant le soir même, en lecture seule dans l'éditeur SQL de Supabase :
- les 11 fonctions sont en place, toutes `security definer` avec un `search_path` vide ;
- les joueurs connectés peuvent appeler `mon_parrainage`, `declarer_mon_parrain`, `proposer_echange`,
  `repondre_echange`, `mettre_en_vente` et `encherir` ; les aides internes (`vrai_compte`,
  `confirmer_le_parrainage`, `valider_le_parrainage`, `verser_les_paquets_de_parrainage`,
  `exiger_un_compte_etabli`) sont fermées à tous ;
- les quatre fonctions d'échange et du marché contiennent bien le blocage des comptes neufs ;
- `mon_parrainage` et `valider_le_parrainage` sont les nouvelles versions ; la table `parrainages` a ses deux
  nouvelles colonnes ; les deux déclencheurs sont en place ; `auth.users.is_anonymous` existe ;
- aucun parrainage n'existait encore : rien à reprendre.

Pas de joueur d'essai : l'anti-robot (étape 3) empêche désormais de créer un compte par programme, et c'est voulu.
Le comportement lui-même est vérifié par les tests sur une vraie base PostgreSQL (`serveur/parrainage.test.ts`,
`serveur/amis.test.ts`).

À savoir : 65 des 66 comptes avaient moins de 3 jours à l'installation (le site est tout neuf). Leurs échanges et leur
marché s'ouvrent d'eux-mêmes, au plus tard le 28 septembre à 14 h 45. Aucune enchère, aucun échange ni aucune amitié
n'existaient encore.

## Pour mémoire : comment le script 13 a été installé

Tant que ce n'est pas fait, les joueurs ne voient rien de nouveau : un interrupteur (`secoursEtParrainage` dans
`src/config/serveur.ts`) garde ces écrans fermés.

1. Ouvrir le fichier du script sur GitHub :
   https://github.com/raphaelferrandis-code/mots/blob/main/serveur/13-secours-et-parrainage.sql
   puis cliquer sur l'icône **Copy raw file** (deux carrés superposés, en haut à droite du fichier).
2. Ouvrir le projet Supabase du jeu, puis **SQL Editor** dans le menu de gauche, et **New query**.
3. Vérifier que le petit menu à gauche du bouton **Save** indique **Database** (et non « Logs »).
4. Coller le script, puis cliquer sur **Run**. Supabase doit répondre **Success. No rows returned**.
5. Me le dire. Je vérifie avec un joueur d'essai créé puis supprimé, j'ouvre l'interrupteur et je publie.

Aucune fonction serveur (Edge) n'est à redéployer. Le script peut être relancé sans danger.

**Le faire avant d'activer le contrôle anti-robot** (`GUIDE-anti-robot.md`) : ma vérification crée un joueur
d'essai, ce que le contrôle anti-robot empêchera ensuite depuis un programme.
