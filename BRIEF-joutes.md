# Les joutes classées — plan du serveur

*Version 1 du 21 septembre 2026. Ce document complète `BRIEF-v2.md`. Il décrit le passage du mode d'essai (adversaires fictifs) au vrai mode : des duels classés contre les decks d'autres joueurs. **Rien de ce qui suit n'est construit tant que Raphaël ne l'a pas validé** — sauf la partie « Ce qui existe déjà ».*

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
| **Adversaires fictifs** (240 joueurs fabriqués à partir des cartes, annoncés comme tels à l'écran) | `src/services/joutes.ts` | provisoire |

Le jour où le serveur existe, **seul `src/services/joutes.ts` change** : on y remplace les joueurs fictifs par des appels au serveur. Les règles et les écrans ne bougent pas.

## 3. Ce que le serveur doit faire

1. **Identifier un joueur** sans lui demander d'adresse e-mail : 🟡 un compte anonyme, créé tout seul à la première joute, attaché à l'appareil. (Un compte par e-mail pourra venir plus tard, pour retrouver sa cote sur un autre téléphone.)
2. **Recevoir le profil de joute** du joueur à chaque changement : pseudonyme, deck (10 identifiants de cartes), résultats mot par mot, parades par rareté.
3. **Proposer des adversaires** proches de sa cote.
4. **Enregistrer le résultat d'une joute** et calculer la nouvelle cote — le calcul se fait sur le serveur, pas sur le téléphone.
5. **Donner le classement** : les premiers, et les voisins du joueur.

🟡 **Seul l'attaquant voit sa cote bouger.** Le joueur dont le double a été affronté ne gagne ni ne perd rien (sinon on pourrait faire chuter quelqu'un en s'acharnant sur son double). Plus tard, on pourra lui montrer un journal : « ton double a gagné 3 joutes cette nuit ».

## 4. Les données personnelles

- 🟡 **Pseudonymes tirés au sort parmi les mots du jeu** (« Frangipane 43 »), jamais de texte libre : rien à modérer, aucun risque d'injure ou de vrai nom. C'est déjà le cas dans la version d'essai.
- Ce que le serveur garde : un identifiant technique, le pseudonyme, la cote, le deck, des compteurs de bonnes réponses. **Ni nom, ni e-mail, ni localisation.**
- Il faudra tout de même une **page « Confidentialité »** dans le jeu (ce qui est gardé, pourquoi, comment tout effacer) et un bouton « Supprimer mon profil de joute ». À rédiger avec le serveur.
- La question des **mineurs** reste celle du §10.3 de `BRIEF-v2.md` (public visé) : sans e-mail ni texte libre, le risque est faible, mais la décision vous appartient.

## 5. La triche : ce qu'on peut promettre, et ce qu'on ne peut pas

Il faut être clair là-dessus avant d'ouvrir un classement.

- **Toutes les définitions sont dans les fichiers publics du jeu.** Un tricheur décidé peut programmer un robot qui répond juste à tout. On ne peut pas l'empêcher ; on peut le repérer (réponses trop rapides, trop régulières) et l'écarter du classement.
- **Étape 1 — classement « de confiance »** 🟡 : le téléphone annonce le résultat, le serveur calcule la cote et applique des garde-fous (nombre de joutes par heure, pas deux fois de suite le même adversaire, écart de cote plafonné). Suffisant entre amis et pour les premiers testeurs. Un tricheur peut gonfler sa cote.
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

**Claude** : le script de la base, le nouveau `src/services/joutes.ts`, la page Confidentialité, le bouton de suppression, les tests, un guide pas à pas avec captures pour les trois étapes ci-dessus, et un mode de secours (adversaires fictifs) quand le serveur ne répond pas.

## 8. Décisions à prendre

| # | Question | Proposition |
|---|---|---|
| 1 | Hébergeur | Supabase |
| 2 | Comptes | Anonymes, attachés à l'appareil ; e-mail plus tard |
| 3 | Pseudonymes | Tirés au sort parmi les mots du jeu, jamais de texte libre |
| 4 | Qui voit sa cote bouger | L'attaquant seulement |
| 5 | Niveau d'anti-triche au lancement | Étape 1 (« de confiance »), étape 2 avant tout classement sérieux |
| 6 | Collections actuelles | Acceptées à l'étape 1 |
| 7 | Noms des ligues | Apprenti, Lecteur, Lettré, Érudit, Académicien, Immortel |
