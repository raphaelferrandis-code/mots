# Refonte des amis et de l’équipe — portraits, présence, vitrines

Refonte du 25 septembre 2026, d’après la maquette validée par Raphaël (planche « Philamots — Amis & Équipe »). **Publiée le 25 septembre 2026 ; script 15 installé** (voir « Installé » en bas de page).

## Ce qui change pour le joueur

- Amis et Mon équipe partagent un en-tête : carte d’expéditeur (portrait, pseudonyme à copier) et onglets Amis · Échanges · Mon équipe. `#/amis/echanges` descend jusqu’aux échanges.
- Chaque ami a sa fiche : portrait gravé (avatar et cadre qu’il a choisis), niveau, présence (« En ligne » ou « Passage il y a… »), vitrine de ses quatre plus beaux timbres et son nombre de timbres. « Retirer » passe dans le menu « ⋯ ».
- Parrainage habillé « par avion ». Carnet vierge : deux voies (lien, pseudonyme) et ce qu’on fera ensemble.
- Échanges : les deux timbres face à face, cachet d’échéance ; les échanges terminés sont repliés.
- Mon équipe : blason (emblème sur timbre, nom, duo, cote 2v2), joute en duo, nom et emblème pour le capitaine. « Jouer en 2 contre 2 » ouvre les joutes avec le mode 2v2 équipe déjà choisi (`#/joutes/duo_equipe`). Création avec aperçu en direct.

## Serveur : `serveur/15-portraits-et-presence.sql`

À coller dans Supabase **avant** de publier le client (après `14-fil-d-activite.sql`). Transactionnel et réexécutable.

- `profils` gagne `avatar`, `cadre` et `vu_le`. Le client les publie par `signaler_presence(avatar, cadre)` à l’ouverture, au changement de portrait, au retour sur l’onglet et toutes les 3 minutes (onglet visible). Seul le format est contrôlé : un portrait inconnu s’affiche avec l’avatar par défaut.
- `mes_amis` rend aussi `xp` (progression vérifiée, sinon `null`), `avatar`, `cadre` pour toutes les relations ; `vu_le`, `timbres` et `vitrine` pour les seuls amis.
- `mon_equipe` rend le portrait, le niveau et la présence des membres, et la `cote` 2v2 de l’équipe (lue dans `direct_cotes` si les joutes en direct sont installées).
- Aucune fonction Edge à redéployer. Sans ce script, le client publié reste utilisable : les nouveaux champs manquent simplement (initiales et niveaux absents, pas de vitrine) et le signal de présence échoue en silence.

## Vérification

`node --test serveur/portraits.test.ts` : format du portrait, confidentialité (présence et vitrine réservées aux amis), ordre de la vitrine, niveau sans progression vérifiée, cote d’équipe avec ou sans joutes en direct, migration appliquée deux fois.

Banc local, sans Supabase : `node serveur/apercu-correspondance.mjs` (ou « banc-correspondance » dans `.claude/launch.json`).
- http://127.0.0.1:5192/#/amis — carnet rempli (amis, demandes, échanges, duo complet), puis `#/equipe`
- http://127.0.0.1:5193/#/equipe — sans équipe, avec une invitation
- http://127.0.0.1:5194/#/amis — carnet vierge

## Installé le 25 septembre 2026

Le script 15 était déjà en place quand l'assistant l'a contrôlé dans Supabase, en lecture seule, le 25 septembre :
- `mes_amis` et `mon_equipe` sont les nouvelles versions ; `xp_du_profil`, `vitrine_du_profil` et `signaler_presence`
  existent ; `profils` a les colonnes `avatar`, `cadre` et `vu_le` ;
- `signaler_presence` est réservée aux joueurs connectés, `vitrine_du_profil` n'est appelable par personne
  directement, la table `profils` reste fermée au public ;
- premier signal de présence reçu à 18 h 06 (heure de Paris) : le jeu publié l'utilise.

Comptes à ce moment : 66 comptes, 243 profils dont 240 joueurs maison, 733 possessions. Aucune modification faite.
