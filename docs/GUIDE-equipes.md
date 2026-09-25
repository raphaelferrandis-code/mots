# Équipes de deux joueurs

Déployé le 24 septembre 2026 après autorisation de Raphaël : migration `11-equipes.sql` sur Supabase, puis client `f8639ab` sur https://philamots.fr/#/equipe. Compilation, 332 tests et parcours navigateur validés ; déploiement GitHub Pages réussi.

Contrôle avant/après migration : 60 comptes, 243 profils, 409 possessions, 114 Encre et 0 Encre achetée, inchangés. RLS active sur les trois tables ; lecture directe interdite ; `mon_equipe` accessible aux joueurs connectés et refusée aux anonymes.

- Page `#/equipe`, accessible depuis les amis, le profil et le salon des duels.
- Nom unique de 3 à 16 caractères, soumis au même filtre que les pseudonymes ; six emblèmes au choix.
- Une seule équipe par joueur, deux membres au maximum. Le créateur est capitaine et invite un ami ; celui-ci accepte ou refuse. Une invitation en attente par équipe, valable sept jours. Les invitations reçues apparaissent sur le lien « Mon équipe » dans les amis.
- Le capitaine peut changer le nom et l’emblème, annuler une invitation ou dissoudre l’équipe. Chaque joueur peut partir. Si le capitaine part ou supprime son profil, le partenaire prend sa place. Une équipe vide est supprimée.
- Les collections et soldes restent individuels. Récupérer un compte conserve son équipe. Retirer un ami invalide l’acceptation d’une invitation, mais ne dissout pas un duo déjà formé.
- Cette version crée le duo ; elle ne comporte pas de combat à deux contre deux, de classement d’équipes ou de récompenses communes.

## Installation

1. La migration `10-amis.sql` doit être installée.
2. Appliquer `serveur/11-equipes.sql` : trois tables privées, leurs fonctions contrôlées et le transfert du rôle de capitaine après un départ. Aucune modification du moteur Edge n’est nécessaire.
3. Publier le client après la migration. Pour une installation neuve, les équipes sont incluses dans `1-structure.sql`.

La migration est transactionnelle et réexécutable. Les noms, membres et invitations ne sont consultables que par les joueurs concernés ; aucun accès direct aux tables n’est accordé. Les contraintes SQL garantissent deux places par équipe et une équipe par profil ; les mutations sont sérialisées avec les opérations d’amitié.

## Vérification

`node --test serveur/equipes.test.ts` vérifie consentement, droits, confidentialité, modération, unicité, capacité, invitations expirées ou annulées, changement de capitaine, dissolution, récupération de compte et migration répétée.

`node serveur/verifier-equipes-navigateur.mjs` utilise deux navigateurs contre PostgreSQL embarqué, sans accès au serveur de production. Il vérifie création, invitation via les amis, acceptation, renommage, emblème, rechargement, départ et dissolution, ainsi que les largeurs 320, 390, 768 et 1 366 pixels. Captures dans `output/verification-equipes/`.
