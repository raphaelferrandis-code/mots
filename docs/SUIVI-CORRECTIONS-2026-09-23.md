# Corrections après l’audit du jeu — 23 septembre 2026

## État de cette intervention

Les corrections techniques prévues sont implémentées et testées localement, y compris le moteur de combat serveur et la synchronisation de la progression. Les modifications préexistantes et les travaux menés dans les autres tâches sont conservés. Aucune migration de ce lot n’a été exécutée sur le serveur distant, aucun déploiement du client effectué ici.

**Le nouveau classement est calculé à partir du combat vérifié par le serveur.** Le navigateur ne peut plus déclarer une victoire. L’XP et les apprentissages sont synchronisés avec le compte. La mise en service distante et les observations de vrais joueurs restent à effectuer ; aucun test humain n’est simulé dans ce rapport.

## Comportements corrigés

| Problème | Comportement livré |
|---|---|
| Suppression du vendeur | Les enchérisseurs sont remboursés avant les cascades, dans leurs bourses d’origine. |
| Suppression du meilleur enchérisseur | Le timbre revient au vendeur, l’enchère est close sans vente. |
| Remplacement d’un compte par code de secours | Les engagements du compte remplacé sont soldés avant le transfert. |
| Retrait du profil classé | Collection, compte anonyme et droits payants restent conservés. L’effacement complet utilise une fonction distincte. |
| Achat immédiat | La mise déjà bloquée et l’Encre achetée comptent dans les fonds disponibles. Le prix immédiat prime sur le pas minimal de surenchère. |
| Retard de clôture des enchères | L’achat immédiat clôt précisément l’enchère achetée, même si la file générale dépasse deux lots de traitement. |
| Import d’archive fabriquée | Une copie préalablement validée dans une table administrative est requise ; les valeurs envoyées par le navigateur ne font plus foi. |
| Profil publié incohérent | Cartes inconnues ou non possédées, répétitions et statistiques impossibles sont refusées. Le double suit les modifications du deck, notamment les ventes. |
| Réponse serveur perdue en fin de combat | Un même ticket peut être relu sans double récompense ni double variation de cote. Un résultat contradictoire est refusé. Le solde retourné est celui du compte au moment de la relecture. |
| Joute abandonnée | Défaite sans récompense de fin. Revenir au jeu reprend le combat ouvert ; après 24 heures, le prochain appel le clôt en défaite. |
| Quota après retrait du profil | Les heures de début des joutes restent dans le compte : recréer son profil ne remet pas le quota horaire à zéro. |
| Combat légitime de moins de 45 secondes | Le seuil arbitraire est retiré. Les limites de fréquence et de validité des tickets restent présentes. |
| Récompense affichée malgré un échec réseau | Le bilan reste ouvert et permet de réessayer. La récompense finale et l’XP de fin attendent la confirmation serveur. |
| Doublon de même carte et même finition | Conversion en Encre uniquement. Une nouvelle finition est conservée. Les exemplaires acquis avant la correction restent en possession des joueurs. Les transferts du marché conservent leurs exemplaires. |
| Double XP sur une parade d’un mot possédé | Une seule attribution d’XP pour cette réponse ; la maîtrise reste comptée. |
| Maîtrise perdue après vente | Un historique serveur indépendant des possessions suit le compte. Sauvegarde version 8 avec archive des anciens apprentissages locaux. |
| Ancienne copie IndexedDB après panne | Les copies sont datées ; la plus récente est choisie. Un effacement daté empêche une ancienne copie de réapparaître. |
| Session sans stockage persistant | La session reste utilisable en mémoire, sans recréer un compte à chaque appel. Les requêtes expirent après 20 secondes. |
| Réponses tardives de sauvegarde du deck | Une ancienne réponse serveur ne remplace plus un choix plus récent du joueur. |
| Plafond quotidien incohérent | Jour UTC commun ; plafond et classement personnel sont relus depuis le compte serveur. |
| Définitions masquées réintroduites en quiz | Les sens masqués ne servent plus de repli ; la vérification couvre l’édition entière. |

## Migration et mise en service

La procédure actuelle est décrite dans [GUIDE-combats-serveur.md](GUIDE-combats-serveur.md) : **migration 9 et fonction serveur combats avant publication du client**. La migration 9 inclut les corrections de la migration 8. Les étapes ci-dessous documentent le premier lot et sont remplacées par ce guide pour le client actuel.

1. Sauvegarder la base et noter les nombres de comptes, possessions, enchères ouvertes et les sommes des deux bourses.
2. Exécuter la migration 8 sur une base de validation avant de la publier. Elle utilise une transaction et peut être réappliquée. Les tests locaux vérifient cette réexécution.
3. Vérifier le parcours suppression/restitution et l’enregistrement d’un résultat avec une réponse réseau perdue, puis appliquer la migration au serveur ciblé avant le client.
4. Publier le client correspondant. Un ancien serveur ne fournit pas l’état complet attendu en fin de joute ; le nouveau client garde alors le bilan en attente au lieu d’inventer un gain.

La migration ne retire pas les anciens exemplaires multiples et ne recrédite pas arbitrairement des pertes historiques. Les enchères historiquement orphelines encore ouvertes sont traitées comme invendues lors de leur clôture. Une réparation de fonds déjà perdus exige l’examen de l’historique réel.

### Anciennes archives locales

Les comptes déjà existants continuent à se synchroniser normalement. Une ancienne collection locale sans compte serveur conserve ses données sur l’appareil, mais son transfert automatique est refusé jusqu’à validation.

L’administrateur vérifie l’origine et le contenu de l’archive, identifie son compte destinataire, puis enregistre la copie autorisée dans `public.importations_validees` (`utilisateur`, `sauvegarde`). La forme attendue est celle de `aImporter` : `creeLe`, `encre`, `paquets`, `cartes`, `deck`. Les clients n’ont aucun droit sur cette table. L’approbation est consommée dans la transaction d’import.

Ce mécanisme ne prouve pas l’authenticité d’une archive : il remplace une confiance automatique dans un fichier modifiable par une décision administrative. Aucun import ancien n’a été approuvé dans cette intervention.

## Validation

- Suite complète : **284 tests réussis, aucun échec** au dernier passage complet.
- Vérification TypeScript et build de production réussis.
- Test navigateur contre PostgreSQL local : victoire complète, accusé perdu et réémission du même UUID, reprise après rechargement, conflit entre onglets, correction d’une réponse fausse, abandon, archive de l’ancienne XP et affichage mobile à 390 px. Aucun appel au serveur distant.
- Tests PostgreSQL embarqué (PGlite) : suppressions réelles par `auth.users`, soldes des deux bourses, récupération, achat immédiat avec retard de clôtures, permissions des imports, validation des profils, répétition des résultats, abandon et réinstallation du schéma.
- Tests des règles : doublons, XP existante, apprentissages après vente/export/rachat, filtres sur l’édition entière, stockage défaillant et session sans persistance.
- Simulation de marché régénérée ; ancien scénario payant retiré. Les retours d’enchères ne créent plus d’Encre. Un invariant contrôle que les soldes finaux valent les entrées moins les sorties.

Les tests locaux ne valident pas la charge concurrente d’un vrai PostgreSQL. Le contrôle distant effectué au déploiement valide les parcours décrits ci-dessous, sans constituer un test de charge. Le verrou commun au marché privilégie ici la cohérence ; son coût sous charge devra être mesuré.

## Complément livré

- `serveur/moteur-combat.ts` réutilise les règles pures du jeu pour les tirages, questions, manches et décisions du double.
- `serveur/api-combat.ts` et la fonction Supabase `combats` authentifient chaque demande et n’acceptent que des commandes. Les RPC privées sont réservées au rôle serveur.
- `serveur/combats.ts` enregistre état, révision, reçu de commande, réponses, XP, récompense et cote de façon atomique. Les anciens appels déclaratifs sont fermés aux clients.
- `serveur/progression-serveur.ts` conserve XP, fractions du bonus, bilans, parades et apprentissages ; les paquets alimentent aussi cette progression. La récupération emporte combat et apprentissages.
- L’écran de duel utilise les états confirmés, propose de réessayer une commande ou de relire la partie et conserve le mode local de développement. Un serveur non installé ne déclenche pas de repli vers des gains calculés sur l’appareil.
- Le client archive l’ancienne XP et les maîtrises avant leur remplacement. Une reprise administrative peut les ajouter au profil personnel sans en faire des statistiques classées.
- Un renouvellement de session refusé ne recrée plus silencieusement de compte. La récupération explicitement demandée reste possible.

## Mise en service et équilibrage

Le 23 septembre 2026, la migration 9 et la fonction `combats` ont été installées sur Supabase. Les comptes, possessions et soldes ont été contrôlés avant et après : 40 comptes, 274 possessions, 242 profils, 80 Encre et 0 Encre achetée. Un export ciblé en lecture seule a été conservé localement hors Git. Les tests distants ont validé les paquets, le deck, une réponse en entraînement, la reprise, la réémission idempotente, le conflit de révision, l’abandon, l’archivage et une joute contre un joueur maison avec cote serveur. Les comptes temporaires de contrôle ont ensuite été supprimés. Les anciennes fonctions de résultat sont interdites aux clients ; les RPC de combat sont réservées au serveur.

[GUIDE-combats-serveur.md](GUIDE-combats-serveur.md) détaille l’ordre d’installation et les contrôles. La fonction autonome générée se trouve dans `serveur/deploiement-combats/combats.ts.txt`.

[ESSAIS-JOUEURS.md](ESSAIS-JOUEURS.md) fournit le protocole J1/J2/J7, les observations à recueillir et le format du relevé. `simulateurs/essais-joueurs.ts` produit un rapport descriptif depuis les observations volontaires, sans modifier les paramètres. Les groupes trop petits sont signalés. Aucun résultat humain ni changement de gains n’a été inventé.

La vérification serveur empêche les résultats arbitraires envoyés par le navigateur ; elle ne garantit pas qu’un joueur ne consulte pas les définitions publiques. Les profils historiques et leurs anciennes cotes restent conservés. Les contrôles locaux ne constituent pas une mesure de charge concurrente du serveur distant.
