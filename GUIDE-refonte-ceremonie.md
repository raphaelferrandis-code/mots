# La refonte graphique : le timbre, la cérémonie, l'accueil

*25 septembre 2026. D'après le brief `BRIEF-ceremonie.md` et la maquette `prototype-ceremonie.html` (réalisés avec
Claude, fournis dans `files.zip`).*

## Les décisions de Raphaël

- **Le timbre de la maquette partout**, en version mixte : l'aspect de la maquette, avec l'attaque, la défense et
  l'origine du jeu. La définition n'est plus imprimée sur le timbre ; elle reste sur la fiche, sous les timbres du
  deck et du duel, et dans la cérémonie.
- **Les raretés** : Normale = courant, Brillante = doré à chaud, Holographique = holo. Les Légendaires et Hors-série
  ont la grande révélation (secousse, éclair, confettis), sans tampon « FAUTÉ ». Le « fauté » n'existe pas dans le jeu.
- **Le fil d'activité** : l'activité de tous les joueurs, depuis le serveur.
- **Pas de premier paquet truqué** : le tirage reste celui du serveur.
- Un bouton **« Tout révéler »** dans la cérémonie.
- Les Hors-série ont un **fond animé** (rosaces qui tournent, poussière dorée).
- **Le paquet : « l'Encre vivante »** (choisi parmi dix maquettes, page de développement `#/maquettes`) : papier marbré
  dont l'encre ondule, étiquette crème, soudures en cuivre. Tissé dans les couleurs de chacun des 8 modèles de paquet ;
  chaque paquet a son propre marbré. L'encre ne bouge que sur le paquet regardé (comptoir, cérémonie), jamais en
  mouvement réduit. Au-dessus du paquet : le titre en toutes lettres, puis le prochain paquet et la Légendaire garantie
  (au plus tard tous les 40 paquets).

## Où vit quoi

| Morceau de la maquette | Dans le jeu |
|---|---|
| Le timbre (`buildStamp`, `vignetteSVG`, `postmarkSVG`, `perfPath`) | `src/composants/timbre/` : `Timbre.tsx`, `dessins.ts`, `timbre.css`. `Carte` l'affiche partout. |
| Le paquet (`buildPack`, `packBodySVG`, `stripSVG`) | `src/composants/ceremonie/PaquetDeCeremonie.tsx` (suit le modèle de paquet choisi) |
| La cérémonie (machine à états, déchirure, révélation, plateau, éventail, aperçu) | `src/composants/ceremonie/Ceremonie.tsx`, `ceremonie.css` |
| Sons (`Sfx`) et particules (`FX`) | `src/composants/ceremonie/effets.ts`. Le bouton muet suit le réglage « Sons du jeu ». |
| Le haut de l'accueil, l'album en aperçu, l'envol vers l'album | `Comptoir.tsx`, `ApercuDeLAlbum.tsx`, `comptoir.css` |
| Les compteurs figés puis animés (Encre, XP, collection) | `src/composants/ceremonie/compteurs.ts` ; l'anneau d'XP dans `Navigation.tsx` |
| Le fond animé (`BG`) | `src/composants/accueil/FondAnime.tsx` |
| Le bloc Duels et le fil d'activité | `DuelsDuBureau.tsx`, `FilDActivite.tsx`, `refonte.css` ; serveur : `serveur/activite.ts` |

Le tirage se fait au clic, sur le serveur, pendant que le paquet vient se placer. La cérémonie n'affiche que ce
qui est déjà enregistré : la fermer (croix, Échap) ne perd rien.

Pages de contrôle, en développement seulement : `#/timbres` (le timbre à trois tailles, les raretés, les natures,
les dos, une cérémonie d'essai avec les cinq effets, le fil avec des exemples) et `#/galerie`.

## À faire par Raphaël : installer le fil d'activité (script 14)

Sans ce script, tout fonctionne ; le fil d'activité reste simplement caché sur l'accueil.

1. Ouvrir `serveur/14-fil-d-activite.sql` sur GitHub (une fois publié), puis **Copy raw file**.
2. Supabase → **SQL Editor** → **New query**. Vérifier que le menu à gauche de **Save** indique **Database**.
3. Coller, **Run**. Réponse attendue : **Success. No rows returned**.

Le script ne modifie aucune fonction existante : il ajoute une table, trois déclencheurs et une fonction de lecture.
Il peut être relancé sans danger, et le jeu peut être publié avant ou après. Les événements (arrivées, victoires en
joute classée, trouvailles Légendaires, Hors-série ou holographiques) ne concernent que les joueurs qui ont un
pseudonyme, sont gardés sept jours, et disparaissent quand un joueur retire son profil. La page Confidentialité le dit.
Le fil se remplit à partir de l'installation : il sera vide au début.

## Vérifié

- 367 tests (dont 6 du fil sur une vraie base PostgreSQL : ce qui entre, l'effacement, les droits, un déclencheur en
  panne qui ne bloque jamais un tirage, le script rejoué deux fois), compilation et construction du site.
- Dans le navigateur, sur ordinateur et téléphone : cérémonie complète, « Tout révéler », « Ouvrir le suivant »,
  rangement dans l'album, compteurs, accueil, album, deck, duel, fiche, profil, sans erreur ni défilement horizontal.
- Mouvement réduit : la cérémonie va au bout, sans animation. Téléphone avec processeur ralenti ×4 : 60 images par
  seconde à l'accueil et pendant la déchirure ; quelques images perdues au retournement avec particules.

## Restes connus

- Le marché, les joutes en direct et les amis passent par le serveur : ils affichent le nouveau timbre, mais n'ont pas
  pu être essayés en local.
- La galerie de contrôle garde l'ancienne carte pour les spécimens « Nacrée » et « Encre latente ».
