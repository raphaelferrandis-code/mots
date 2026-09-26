# Niveaux et personnalisations

Décisions du 23 septembre 2026 : XP par les activités de jeu ; cosmétiques gratuits par niveau, sans achat en Encre ; tous les emballages disponibles dès le départ. L'habillage existant est conservé.

**Mise à jour du 26 septembre 2026 (décision de Raphaël) : la boutique de l'Encre.** Les cosmétiques gagnés par niveau restent gratuits, mais 15 pièces nouvelles ne s'obtiennent qu'à la boutique, avec l'Encre gagnée en jouant (champ `boutique` du catalogue) ; un Hors-série au choix s'y commande aussi (100 000 Encre). Voir l'en-tête d'ETAT-DU-PROJET.md.

## Fonctionnement

- L'écran `#/profil`, accessible depuis le bandeau et l'accueil, présente le niveau, l'XP, le pseudo personnel, l'avatar, le cadre et le titre.
- 20 XP par paquet ouvert, 15 par nouveau mot découvert dans un paquet, 5 par bonne définition (attaque ou parade), 30 par duel terminé et 20 supplémentaires par victoire. Aucun gain pour une simple visite ou un changement de personnalisation.
- Le niveau 2 demande 100 XP ; chaque palier suivant demande 50 XP de plus. L'XP commence à zéro à l'installation de cette version, sans conversion rétroactive des anciennes statistiques.
- 149 objets (26/09/2026) : 38 cadres, 30 avatars, 50 titres, 11 couleurs, 10 dos et 10 emballages de paquet, dont 15 pièces de la boutique de l’Encre. Le catalogue est centralisé dans `src/jeu/personnalisation.ts`.
- Les cosmétiques Premium sont débloqués définitivement par l’achat unique. L’abonnement seul ne les donne pas.
- Les titres se gagnent exclusivement via les [50 succès](SUCCES-ET-TITRES.md). Les autres cosmétiques gratuits se débloquent au niveau indiqué. L’Encre gagnée en jouant sert aux enchères et à la boutique (depuis le 26/09/2026) ; les anciens achats sont conservés.
- Bonus abonné : +25 % d’XP sur bonnes réponses et duels, fractions conservées. Aucun multiplicateur sur les ouvertures et découvertes. La Hors-série offerte ne donne pas les 20 XP d’un paquet ; sa découverte donne les 15 XP habituels.
- Huit paquets gratuits dès le départ : Édition originale, L'Herbier, Courrier céleste, Poste lointaine, Jardin de minuit, Éclats de givre, Lettres océanes et Légendes de jade. Aucun effet sur le tirage.
- Les choix s'appliquent à l'accueil, à l'écran d'ouverture et aux timbres face cachée. Les gains d'XP figurent dans les résultats du paquet et du duel.

## Sauvegarde et serveur

La sauvegarde passe en version 6, avec les succès et leurs records de progression. Les versions précédentes reçoivent un profil par défaut. L'XP, le pseudo personnel et les équipements sont locaux, inclus dans l'export de sauvegarde, comme la maîtrise des mots. Le pseudo public des joutes reste géré dans les joutes. Cette version ne diffuse pas les avatars aux adversaires et ne synchronise pas l'XP entre appareils.

Les anciens achats restent sur le compte Supabase. Le RPC historique d’achat cosmétique refuse désormais toute dépense. Les droits des offres et leurs récompenses sont gérés par le serveur.

Avant publication, appliquer serveur/6-offres.sql. Aucun script distant exécuté ici.

## Vérification

Tests des niveaux, droits premium, titres, sauvegardes et XP. Tests PostgreSQL embarqués : attribution unique, hebdomadaires, expiration, renouvellement, doublons et refus des accès directs. Compilation TypeScript/Vite et suite existante.

## Cabinet visuel

L’aperçu et l’équipement sont deux actions distinctes. Un clic sur une vignette essaie le cosmétique ; le bouton Équiper enregistre le choix. La collection se filtre par objets possédés ou premium. Le pseudo se modifie dans une fenêtre dédiée. Sur mobile, l’aperçu est compact et revient à l’écran lorsque l’on essaie un objet depuis le bas de la collection.

Les illustrations sont des SVG originaux : végétation, gravures postales, cristal, orbites et ailes. Le mouvement est propre au cadre et se limite à l’aperçu et à la sélection. Les préférences de réduction des animations du système et du jeu sont respectées. Le paiement reste non branché ; cette modification utilise les droits de formule que le serveur renvoie déjà.

Référence de conception : [Wild Rift — Upgrading Ranked Rewards](https://wildrift.leagueoflegends.com/en-us/news/dev/dev-upgrading-ranked-rewards/), pour la place des cadres et des collections dans la personnalisation. Aucun asset Riot utilisé.
