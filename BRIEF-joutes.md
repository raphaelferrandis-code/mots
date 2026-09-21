# Les joutes classées — plan du serveur

*Version 2 du 21 septembre 2026. Ce document complète `BRIEF-v2.md`. Il décrit le passage des joutes sans serveur aux joutes entre vrais joueurs. **Décisions de Raphaël (21/09/2026) : hébergeur Supabase ; pseudonymes choisis librement par les joueurs, avec un filtre des mots offensants ; le jeu ne signale pas que certains adversaires sont des « joueurs maison ».** Les scripts du serveur et le guide de mise en route sont prêts : `serveur/` et `GUIDE-supabase.md`.*

> **Légende :** 🟡 = proposition à confirmer par Raphaël.

---

## 1. L'idée, en une phrase

On affronte le **double** d'un autre joueur : son deck, joué par l'ordinateur, qui connaît ses mots **ni mieux ni moins bien que lui** (s'il retrouve « callipyge » quatre fois sur cinq, son double aussi). L'autre joueur n'a pas besoin d'être connecté. Chaque joute fait bouger une **cote** ; le jeu propose des adversaires de sa cote, et range les joueurs en **ligues**.

C'est la voie B choisie le 21/09/2026 (la voie C, le direct entre deux joueurs connectés, viendra quand il y aura assez de joueurs ; le duel contre l'ordinateur reste l'entraînement).

## 2. Ce qui existe déjà (fait, testé, en ligne)

Tout le mode de jeu fonctionne, avec un « faux serveur » logé dans le navigateur :

| Élément | Où | État |
|---|---|---|
| Règles du double (ses chances de retrouver son mot et de parer viennent des vrais résultats du joueur) | `src/jeu/joute.ts` | fait, testé |
| Classement de type Elo (celui des échecs), six ligues : Apprenti, Lecteur, Lettré, Érudit, Académicien, Immortel | `src/jeu/joute.ts`, chiffres dans `src/config/equilibrage.ts` | fait, testé |
| Choix de trois adversaires : un plus faible, un égal, un plus fort ; on évite ceux qu'on vient d'affronter | `src/jeu/joute.ts` | fait, testé |
| Ce que le jeu retient pour fabriquer le double du joueur : questions posées et réussies pour chaque mot, parades par rareté | sauvegarde version 4 | fait, testé |
| Écran : onglet « Joutes classées » dans l'écran Duel, classement, cote qui bouge en fin de joute | `src/ecrans/PanneauDesJoutes.tsx`, `src/ecrans/Duel.tsx` | fait |
| **Joueurs maison** : 240 adversaires fabriqués à partir des cartes (`src/jeu/joueursMaison.ts`), pour que les joutes aient du monde dès le premier jour. Sans serveur, ce sont les seuls adversaires ; avec le serveur, ils sont installés dans la base aux côtés des vrais joueurs, marqués en interne pour pouvoir être retirés en une ligne | `src/services/joutes.ts`, `serveur/2-joueurs-maison.sql` | fait |
| Pseudonyme choisi par le joueur, avec filtre des mots offensants (dans le jeu **et** sur le serveur) | `src/jeu/pseudo.ts`, `src/config/pseudos-interdits.ts` | fait, testé |
| Le branchement à Supabase (compte anonyme, profil, adversaires, joute, classement), actif dès que `src/config/serveur.ts` est rempli | `src/services/supabase.ts`, `src/services/joutes.ts` | écrit et testé avec un faux serveur ; **jamais encore essayé contre un vrai projet** |
| Les scripts de la base et le guide pas à pas | `serveur/`, `GUIDE-supabase.md` | prêts |

Le passage au serveur ne touche ni aux règles ni aux écrans : il suffit de remplir `src/config/serveur.ts`.

> **À savoir — décision de Raphaël : le jeu ne dit pas que certains adversaires sont des joueurs maison.** C'est une pratique courante dans les jeux. Deux garde-fous : l'interface n'affirme nulle part que tous les adversaires sont de vraies personnes ; et ces joueurs sont marqués dans la base (`maison`), pour être retirés dès qu'il y a assez de vrais joueurs. **Le jour où le jeu encaisse de l'argent, ce point est à revoir** : présenter des joueurs inventés comme de vrais joueurs peut alors relever de la pratique commerciale trompeuse.

## 3. Ce que le serveur doit faire

1. **Identifier un joueur** sans lui demander d'adresse e-mail : 🟡 un compte anonyme, créé tout seul à la première joute, attaché à l'appareil. (Un compte par e-mail pourra venir plus tard, pour retrouver sa cote sur un autre téléphone.)
2. **Recevoir le profil de joute** du joueur à chaque changement : pseudonyme, deck (10 identifiants de cartes), résultats mot par mot, parades par rareté.
3. **Proposer des adversaires** proches de sa cote.
4. **Enregistrer le résultat d'une joute** et calculer la nouvelle cote — le calcul se fait sur le serveur, pas sur le téléphone.
5. **Donner le classement** : les premiers, et les voisins du joueur.

🟡 **Seul l'attaquant voit sa cote bouger.** Le joueur dont le double a été affronté ne gagne ni ne perd rien (sinon on pourrait faire chuter quelqu'un en s'acharnant sur son double). Plus tard, on pourra lui montrer un journal : « ton double a gagné 3 joutes cette nuit ».

## 4. Les données personnelles

- **Pseudonymes choisis librement** (décision de Raphaël), de 3 à 16 caractères, en lettres latines, chiffres, espaces, tirets et apostrophes. Un **filtre** refuse les mots grossiers, haineux ou sexuels, et ceux qui feraient passer le joueur pour un responsable du jeu ; il déjoue les ruses courantes (accents, majuscules, lettres répétées ou séparées, chiffres mis pour des lettres). Le jeu propose aussi un pseudonyme tiré de ses mots (« Frangipane 43 »). **Limites à connaître :** aucun filtre n'est parfait (un mot court collé à un autre en minuscules, « groscon », passe) ; un joueur peut écrire son vrai nom ; et un pseudonyme choquant qui passerait au travers se corrige à la main dans la base (voir le guide). La liste des mots est dans `src/config/pseudos-interdits.ts`.
- Ce que le serveur garde : un identifiant technique, le pseudonyme, la cote, le deck, des compteurs de bonnes réponses. **Ni nom, ni e-mail, ni localisation.**
- Il faudra tout de même une **page « Confidentialité »** dans le jeu (ce qui est gardé, pourquoi, comment tout effacer) et un bouton « Supprimer mon profil de joute ». À rédiger avec le serveur.
- La question des **mineurs** reste celle du §10.3 de `BRIEF-v2.md` (public visé). Le jeu ne demande pas d'e-mail, mais le pseudonyme est désormais un texte libre : un enfant peut y écrire son vrai nom. À trancher avec le public visé.

## 5. La triche : ce qu'on peut promettre, et ce qu'on ne peut pas

Il faut être clair là-dessus avant d'ouvrir un classement.

- **Toutes les définitions sont dans les fichiers publics du jeu.** Un tricheur décidé peut programmer un robot qui répond juste à tout. On ne peut pas l'empêcher ; on peut le repérer (réponses trop rapides, trop régulières) et l'écarter du classement.
- **Étape 1 — classement « de confiance »** 🟡 : le téléphone annonce le résultat, le serveur calcule la cote et applique des garde-fous (pas plus de 40 joutes par heure, pas de joute de moins de 45 secondes, un seul résultat par joute commencée). Suffisant entre amis et pour les premiers testeurs. Un tricheur peut gonfler sa cote.
- **Étape 2 — le serveur arbitre** : il tire lui-même les questions et vérifie les réponses. Les règles du jeu sont écrites à part des écrans et sans rien du navigateur : le serveur peut faire tourner exactement les mêmes. Plus de travail ; à faire avant tout classement « sérieux » ou toute récompense de valeur.
- **Les collections actuelles** vivent sur le téléphone et sont modifiables. Tant que les paquets ne sont pas tirés par le serveur, un deck peut être fabriqué de toutes pièces. 🟡 Proposition : l'accepter à l'étape 1 (le jeu est équilibré pour que la connaissance compte plus que les cartes), et le régler à l'étape 2 avec le tirage des paquets côté serveur, comme `BRIEF-v2.md` l'annonçait.

## 6. Quel hébergeur ? 🟡

Le site reste sur GitHub Pages ; il lui faut, à côté, un service qui garde les profils. Proposition : **Supabase**.

| | Supabase (proposé) | Firebase | Cloudflare |
|---|---|---|---|
| Tableau de bord dans le navigateur, sans ligne de commande | oui | oui | en partie |
| Comptes anonymes | oui | oui | à écrire |
| Calcul de la cote côté serveur sans carte bancaire | oui (une fonction dans la base) | non : demande l'offre payante à l'usage | oui |
| Offre gratuite pour démarrer | oui | oui | oui |

Vérifié sur leurs sites le 21 septembre 2026 (ces offres changent : à revérifier le jour venu) :
- **Supabase, offre gratuite** : 500 Mo de base par projet, 50 000 joueurs actifs par mois, 2 projets. Largement assez pour démarrer. **Un projet gratuit est mis en sommeil après une semaine sans activité** : tant que le jeu a peu de joueurs, il faudra parfois le réveiller à la main dans le tableau de bord (ou passer à l'offre payante). Le jeu doit donc savoir se passer du serveur : c'est le rôle du mode de secours du §7.
- **Supabase, comptes anonymes** : ils existent (une ligne de code côté jeu, une case à cocher côté tableau de bord). Supabase recommande d'y ajouter un contrôle anti-robot invisible, pour qu'on ne puisse pas créer des milliers de faux comptes ; par défaut, 30 créations par heure et par adresse. Un compte anonyme est perdu si le joueur efface les données de son navigateur — d'où l'intérêt, plus tard, d'un compte par e-mail.
- **Firebase** : publier du code côté serveur (« Cloud Functions ») exige l'offre payante à l'usage, donc une carte bancaire.

## 7. Qui fait quoi

**Raphaël** (je n'ai le droit ni de créer des comptes, ni de manipuler des mots de passe ou des clés secrètes) :
1. créer un compte chez l'hébergeur retenu, puis un projet ;
2. coller dans son tableau de bord le script que je fournirai (il crée les tables, les règles d'accès et le calcul de la cote) ;
3. recopier dans un fichier du jeu les deux valeurs **publiques** du projet (son adresse et sa clé publique — elles sont faites pour être visibles, contrairement à la clé secrète, qui ne doit jamais quitter le tableau de bord).

**Claude** : les scripts de la base (`serveur/`), le branchement du jeu (`src/services/joutes.ts`, `src/services/supabase.ts`), les tests, le guide pas à pas (`GUIDE-supabase.md`) — faits. Restent, après la mise en route : la page Confidentialité et le bouton « Supprimer mon profil » (la fonction existe déjà côté serveur). Quand le serveur ne répond pas, les joutes affichent un message et l'entraînement reste disponible.

## 8. Décisions à prendre

| # | Question | Proposition |
|---|---|---|
| 1 | Hébergeur | **Supabase — validé le 21/09/2026** |
| 2 | Comptes | Anonymes, attachés à l'appareil ; e-mail plus tard |
| 3 | Pseudonymes | **Choisis librement, avec filtre des mots offensants — décidé le 21/09/2026** |
| 4 | Qui voit sa cote bouger | L'attaquant seulement |
| 5 | Niveau d'anti-triche au lancement | Étape 1 (« de confiance »), étape 2 avant tout classement sérieux |
| 6 | Collections actuelles | Acceptées à l'étape 1 |
| 7 | Noms des ligues | Apprenti, Lecteur, Lettré, Érudit, Académicien, Immortel |
