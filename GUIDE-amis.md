# Amis, échanges et défis amicaux

Déployé le 24 septembre 2026 sur https://philamots.fr/ : migration `10-amis.sql`, fonction Edge `combats`, puis client du commit `12f50a4`. Le déploiement GitHub Pages a réussi.

Contrôle avant/après migration : 60 comptes, 362 possessions, 243 profils, 84 Encre, 0 Encre achetée et un combat en cours, inchangés. RLS active sur les deux nouvelles tables, lecture directe interdite, RPC `mes_amis` accessible aux joueurs connectés et refusée aux anonymes. Le carnet et le salon des duels ont été contrôlés sur le site public ; les échanges complets et les défis ont été vérifiés avec deux comptes locaux.

## Ce que permet la première version

- Espace `#/amis`, accessible depuis le bandeau, le profil, le marché et le salon des duels.
- Invitation par pseudonyme public exact (normalisation habituelle du jeu), acceptation, refus, annulation et retrait. Les joueurs simulés ne peuvent pas être ajoutés.
- Consultation des mots et finitions d’un ami accepté, sans données de compte ou d’apprentissage.
- Proposition d’un timbre contre un timbre, avec choix des finitions, aperçu et confirmation par le destinataire. Aucune Encre ni commission. Un exemplaire est transféré de chaque côté.
- Les propositions durent sept jours. Les cartes restent dans les albums jusqu’à l’acceptation : si une carte a été vendue entre-temps, toute la transaction est refusée. Les deux comptes sont verrouillés et le transfert est atomique. Accepter deux fois ne transfère jamais deux fois.
- Les decks sont nettoyés si le dernier exemplaire d’un mot quitte la collection ; les apprentissages restent au propriétaire d’origine. La récupération de compte conserve les relations. La suppression du profil supprime aussi ses relations et propositions.
- Défi contre le double automatisé d’un ami, avec le moteur serveur et les gains ordinaires des joutes. Les cotes et statistiques classées restent inchangées, même après abandon. Le quota de combats et les plafonds de gains existants continuent à s’appliquer. Aucun jeu simultané ni invitation de défi à accepter dans cette version.
- Actualisation du carnet au retour sur l’onglet et toutes les trente secondes lorsqu’il est visible. Plafonds : 200 relations, 30 demandes en attente et 20 propositions actives (garde-fous à l’envoi et à la réception).

## Déploiement

1. Précondition : la migration des combats `serveur/9-combats.sql` est déjà installée.
2. Appliquer `serveur/10-amis.sql` dans Supabase. La migration est transactionnelle et peut être relancée. Elle ajoute les tables privées et RPC des amis, puis met à jour les fonctions du combat.
3. Redéployer la fonction Edge `combats` depuis `supabase/functions/combats/index.ts` ou `serveur/deploiement-combats/combats.ts.txt`, généré par `node serveur/preparer-combats.mjs`.
4. Publier le client après ces deux étapes. Sans la migration ou la nouvelle fonction Edge, les amis ou défis restent indisponibles.

Pour une installation neuve, `serveur/1-structure.sql` contient déjà les amis. Les scripts SQL se régénèrent avec `npm run serveur:script`.

## Vérification

`npm run build` et `npm test` vérifient la compilation, les migrations et les règles, dont les permissions, le transfert atomique, l’idempotence, l’expiration, la récupération du compte et les cotes des défis amicaux.

`node serveur/verifier-amis-navigateur.mjs` vérifie deux joueurs dans le navigateur contre PostgreSQL embarqué, sans contacter le vrai serveur. Comme le vérificateur des combats, il utilise Playwright et accepte `PLAYWRIGHT_MODULE` et `BROWSER_CHANNEL`. Les captures sont dans `output/verification-amis/`.

Validation locale du 24 septembre : compilation réussie, 326 tests réussis, parcours navigateur réussi (demande, acceptation, échange, défi et reprise après rechargement). Absence de débordement vérifiée à 320, 390, 768 et 1 366 pixels. Aucun appel au serveur de production pendant ces essais.
