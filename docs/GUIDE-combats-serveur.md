# Combats vérifiés et progression synchronisée

Mise à jour du 24 septembre 2026 : moteur version 2 et client `12f50a4` déployés avec les amis. Les attaques sont automatiques, suivies d’une seule question de définition pour la parade. Les anciennes parties restent reprises par le moteur. La migration `10-amis.sql` ajoute les défis amicaux sans variation de cote ni statistiques classées ; voir [GUIDE-amis.md](GUIDE-amis.md) pour le contrôle de cette publication.

La migration 9 et la fonction `combats` ont été installées le 23 septembre 2026 sur le projet Supabase du jeu. Le client de cette révision exige ce moteur serveur. Pour toute nouvelle installation, respecter l’ordre ci-dessous.

Contrôle de mise en service : 40 comptes, 274 possessions, 242 profils et 3 016 cartes conservés ; soldes cumulés inchangés (80 Encre et 0 Encre achetée). Les 40 comptes disposent de la progression serveur. Les accès directs aux RPC privées et aux anciens résultats déclaratifs sont refusés. Un export local en lecture seule des comptes, profils, mots interdits, fonctions et contraintes a précédé la migration ; il reste hors du dépôt public. Ce relevé ciblé ne constitue pas une sauvegarde intégrale du projet Supabase.

Les contrôles distants ont validé l’authentification, les paquets, le deck, une réponse, la reprise, la répétition sans double effet, le conflit de révision, l’abandon et l’archivage, ainsi qu’une joute contre un joueur maison avec cote serveur. Les comptes techniques créés pour ces contrôles ont été supprimés par leur propre session. Les fonctions de paiement existantes n’ont pas été remplacées.

## Mise en service

1. Sauvegarder la base existante. Sur une base de validation, appliquer `serveur/9-combats.sql`. Cette migration transactionnelle contient aussi les corrections d’intégrité de la migration 8. Ne pas appliquer les anciennes migrations après la 9.
2. Vérifier que `serveur/3-cartes.sql` correspond à l’édition embarquée. Pour une installation neuve : `1-structure.sql`, `3-cartes.sql`, puis éventuellement `2-joueurs-maison.sql`.
3. Installer la fonction Supabase `combats`. La source CLI est `supabase/functions/combats/index.ts` ; le fichier autonome à copier dans l’éditeur est `serveur/deploiement-combats/combats.ts.txt`. Il contient le moteur et le catalogue, sans import local restant. Avec la CLI : `supabase functions deploy combats --no-verify-jwt` sur le projet de validation choisi.
4. La passerelle JWT est désactivée pour cette fonction (`supabase/config.toml`), **mais chaque appel est authentifié par `/auth/v1/user`**. La fonction prend l’identité retournée par Auth. Elle utilise les variables serveur `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. Aucune clé privilégiée dans le client ni dans un fichier publié.
5. Tester deux comptes, un duel, une joute, une reprise, un abandon et une récupération par code. Vérifier les soldes et la cote. Les essais locaux couvrent ces mécanismes, mais ne remplacent pas ce contrôle sur l’infrastructure cible ni une mesure de charge PostgreSQL.
6. Après validation, appliquer la migration et installer la fonction sur le projet du jeu, puis publier le client correspondant. Prévoir une courte maintenance : les anciens clients déclarant un résultat ne peuvent plus finir leurs duels après la migration.

Les anciens tickets ne sont pas convertis en combats vérifiés et ne produisent pas de nouvelle récompense. Les résultats et soldes déjà enregistrés restent conservés. Les cotes historiques ne sont pas remises à zéro. La migration peut être réappliquée : elle ne réinitialise ni XP, ni apprentissages, ni combats.

Les travaux de paiements de test utilisent séparément `8-paiements-test.sql`. La migration 9 n’accorde aucun droit payant et conserve les tables de paiement existantes. Ne pas remplacer le fichier de configuration Supabase par une version ne contenant que `combats`.

## Fonctionnement

- Un seul combat non archivé par compte. Ouvrir un autre onglet ou revenir au duel reprend cet état.
- Le serveur choisit mains, questions et décisions adverses. Le navigateur envoie une carte ou une proposition, jamais une victoire, un montant d’XP ou une cote.
- Chaque commande possède un UUID et une révision. La répétition reconnue renvoie l’état courant ; une commande concurrente portant une ancienne révision est refusée. L’interface propose « Réessayer » pour l’accusé manquant et « Reprendre la partie enregistrée » pour une autre version.
- Une transaction enregistre réponse, apprentissage, XP, éventuelle récompense et cote. Le résultat final est acquis dès la dernière manche, avant « Voir le résultat ».
- L’abandon compte comme une défaite sans récompense de fin. L’XP des réponses précédemment validées reste acquise. Après 24 heures, le prochain appel clôt un combat inachevé de la même façon. Le réglage de temps illimité concerne les questions, pas cette durée totale.
- Les réglages, les possessions utilisées pour la maîtrise, le deck et le double adverse sont figés au départ. Une vente ou une nouvelle publication n’altère pas les cartes d’un combat déjà commencé. La cote adverse retenue pour le résultat est celle du départ.
- Un quota commun de 40 débuts par heure reste attaché au compte. Retirer puis recréer le profil ne l’efface pas. Le retrait du profil est refusé pendant un combat ; l’effacement du compte conserve les restitutions du marché et les éventuelles protections de paiement.
- L’XP des paquets, des découvertes, des réponses et des fins de duel est attribuée côté serveur. Le bonus payant conserve sa fraction entre les gains. Les apprentissages restent indépendants des possessions et suivent le compte lors d’une récupération.
- Les statistiques d’un double humain proviennent uniquement des réponses vérifiées. Les paramètres de statistiques envoyés par un ancien navigateur ne font plus foi. Les joueurs maison gardent leurs statistiques simulées.
- Les combats archivés vieux de plus de 30 jours sont purgés lors d’un nouveau départ du même compte. Il ne s’agit pas d’une suppression quotidienne automatique. La progression agrégée reste conservée.

- Avant la parade, le mot adverse ne quitte le serveur que face cachée : nature, attaque et défense (bonus de rareté et d’enchaînement compris), sans mot, origine ni définition. Pendant la parade, le mot est transmis sans sa définition ; celle-ci n’arrive qu’au bilan. En Facile, l’ordinateur pose le premier ; en Normal, en Difficile et contre un double, la pose alterne (le joueur à la manche 1), et l’adversaire qui répond ne voit que la nature du mot du joueur. Moteur version 3, du 25/09/2026 : les combats commencés en version 1 ou 2 continuent.

Le moteur partage les règles pures du jeu. `VERSION_MOTEUR` doit évoluer lors d’un changement incompatible ; prévoir alors la fin ou la migration des parties existantes avant publication. Le catalogue embarqué doit être régénéré à chaque nouvelle édition.

Cette vérification empêche l’envoi direct de résultats inventés. Elle ne prouve pas qu’une personne répond sans aide : le vocabulaire et les définitions sont publics, et un robot peut les consulter. Aucun résultat de simulation n’est présenté comme une mesure de résistance aux robots.

## Ancienne progression

À la première synchronisation vérifiée, le client conserve les anciennes XP et maîtrises dans `ancienneProgression` (sauvegarde version 8), puis affiche la progression du compte. Cette archive reste visible dans Réglages et incluse dans l’export. Elle n’est pas automatiquement transformée en statistiques classées.

Pour reprendre une progression ancienne légitime : examiner l’archive, identifier le compte destinataire, puis, avec un accès administratif, renseigner `public.progressions_validees` (`utilisateur`, `sauvegarde`). La sauvegarde attendue contient `{ "xp": 120, "apprentissages": { "identifiant-du-mot": { "posees": 5, "reussites": 5, "maitriseeLe": 1700000000000 } } }`. Le champ `ancienneProgression` exporté fournit ces données ; `le` peut rester présent.

Exécuter ensuite `select public.importer_progression_validee('UUID_DU_COMPTE');` avec cet accès administratif, de préférence entre deux combats. L’approbation est consommée une fois. Cet héritage s’ajoute à l’XP personnelle et aux maîtrises ; il n’influence jamais les statistiques du double. Aucun import n’a été approuvé ici. La collection elle-même utilise le mécanisme distinct `importations_validees`.

## Reproduire les vérifications

Node 22.18 ou plus récent est prévu par le projet. Avec Node 22.14, ajouter `--experimental-strip-types` aux commandes exécutant TypeScript.

```text
npm run serveur:script
node serveur/preparer-combats.mjs
npm run verifier
npm test
npm run build
```

Le test navigateur `node serveur/verifier-combats-navigateur.mjs` nécessite Playwright et Chrome, ou `BROWSER_CHANNEL` adapté. `PLAYWRIGHT_MODULE` peut pointer vers une installation existante de Playwright. Il lance un aperçu local sur le port 5187 et une base PostgreSQL embarquée. Tous les appels Supabase sont interceptés, aucune base distante n’est modifiée. Il teste une victoire, la perte d’un accusé après validation, la reprise, un conflit entre onglets, l’archive locale et l’affichage mobile. La capture `test-combat-mobile.png` est un artefact de contrôle.

Les tests unitaires/intégration couvrent aussi les refus d’identité et de résultats injectés, les permissions SQL, la cote à l’abandon, le temps serveur, le temps illimité, l’expiration, le bonus fractionnaire, les paquets, la récupération et la réinstallation. Les essais humains sont préparés dans `ESSAIS-JOUEURS.md`.
