# Philamots

Jeu de cartes à collectionner où chaque carte est un vrai mot de la langue française, imprimé comme un timbre-poste.

*Le jeu s'est appelé « MOTS » jusqu'au 22 septembre 2026. Raphaël a choisi **Philamots** (philatélie et mots). `philamots.fr` est désormais actif chez OVHcloud ; le raccordement au site et la création de `contact@philamots.fr` restent à terminer : voir [le guide](GUIDE-domaine-et-contact.md). Aucun achat du `.com` n’est confirmé. Le dépôt garde son nom `mots`.*

**Décision du 23 septembre :** l’Encre sert uniquement aux enchères. L’achat de paquets a été retiré du code local et du script serveur ; mise à jour de Supabase et publication restent à effectuer (voir GUIDE-supabase.md). L’offre de lancement comprendra un achat unique et un seul abonnement, dont les avantages validés sont implémentés localement (BRIEF-version-payante.md). Appliquer serveur/6-offres.sql avant publication. Les descriptions à trois formules ci-dessous concernent la version précédente.

- **Où en est le projet, et ce qui reste à faire : [ETAT-DU-PROJET.md](ETAT-DU-PROJET.md).** Commencer par là.
- Le projet est décrit dans [BRIEF-v2.md](BRIEF-v2.md) — c'est le document de référence.
- Le plan du serveur des joutes classées (duels contre d'autres joueurs) : [BRIEF-joutes.md](BRIEF-joutes.md) ; sa mise en route pas à pas : [GUIDE-supabase.md](GUIDE-supabase.md).
- Le programme des testeurs : [GUIDE-testeurs.md](GUIDE-testeurs.md), et leurs retours : [RETOURS-testeurs.md](RETOURS-testeurs.md).
- Le plan du marché (échanges et enchères entre joueurs) : [BRIEF-marche.md](BRIEF-marche.md).
- Ce qui bloque la version payante : [BRIEF-version-payante.md](BRIEF-version-payante.md), et le brouillon des conditions de vente : [CGV-brouillon.md](CGV-brouillon.md).
- L'origine et la licence des données sont dans [SOURCES.md](SOURCES.md).
- Ce que contiennent vraiment les données : [COMPTE-RENDU-donnees.md](COMPTE-RENDU-donnees.md).
- **Le résultat de la fabrication des cartes : [data/rapport.md](data/rapport.md).**

**Le site en ligne : https://raphaelferrandis-code.github.io/mots/**

**État d'avancement : phase 4 faite, marché commencé (collections sur le serveur, enchères), en attente des testeurs.** Chaque carte est un timbre-poste émis par la langue d'origine du mot. On ouvre des paquets (un toutes les 10 minutes, 10 en stock), chaque timbre peut sortir en finition normale, brillante ou holographique, les doublons deviennent de l'Encre, et la collection se filtre et se sauvegarde sur l'appareil. **Le duel est jouable**, mot contre mot : on compose un deck de dix cartes et l'on affronte l'ordinateur à trois niveaux. À chaque manche il pose un mot, on lui répond par une carte ; pour attaquer il faut retrouver la définition de son mot parmi quatre, et pour parer, celle du mot adverse — qui change à chaque duel. Un mot rare frappe plus fort. Cinq bonnes réponses sur un mot : il est « maîtrisé », et son timbre reçoit un cachet daté. **Les joutes classées** (onglet de l'écran Duel) opposent le joueur au « double » d'autres joueurs, avec cote, ligues, classement et pseudonyme au choix. Le serveur des joutes (Supabase) est branché depuis le 21 septembre 2026 : voir GUIDE-supabase.md. En développement (`npm run dev`), le jeu ne le touche pas — chaque essai y créerait un vrai joueur : pour l'essayer quand même, `localStorage.setItem('mots.vrai-serveur', 'oui')` dans la console du navigateur, puis recharger. La phase 4 a ajouté la page Confidentialité (avec la suppression du profil de joute), un contrôle d'accessibilité (clavier, lecteur d'écran, contrastes), les sons du duel, le partage de l'image d'un timbre depuis sa fiche (`src/composants/carte/imageDuTimbre.ts` redessine le timbre sur un canevas, `src/services/partage.ts` l'envoie à la feuille de partage du téléphone ou le télécharge) et un carillon selon la rareté à l'ouverture des paquets. **Le marché (BRIEF-marche.md) a commencé** : depuis le 22 septembre 2026, le serveur est propriétaire des collections (paquets, Encre, deck et récompenses passent par lui ; un code de secours, dans Réglages → « Ton compte », rend la collection sur un autre appareil), et l'onglet « Marché » permet de mettre ses timbres aux enchères (mise de départ, achat immédiat facultatif, 12 à 48 heures, commission de 10 %). Chaque timbre a désormais une **cote** sur sa fiche : la médiane des prix de ses ventes des 30 derniers jours, par finition, relevée une fois par jour par le serveur (la version payante y verra l'histoire, la courbe et les statistiques). Marché et cote sont actifs dès que le script du serveur est installé (GUIDE-supabase.md, étape 10). Le **simulateur de marché** (`npm run simulation:marche`) a servi à régler la commission et les plafonds : voir `data/simulation-marche.md`. Prochaine étape : les retours des testeurs (GUIDE-testeurs.md), puis la connexion par e-mail.

## Mise en ligne

Le code est sur GitHub : https://github.com/raphaelferrandis-code/mots (dépôt public).
À chaque envoi de code sur la branche `main`, GitHub lance les tests, fabrique le site et le publie tout seul
(fichier `.github/workflows/mise-en-ligne.yml`). Compter deux minutes entre l'envoi et la mise à jour du site.
Le suivi se fait dans l'onglet « Actions » du dépôt : une coche verte = site à jour, une croix rouge = rien n'a été publié
(l'ancienne version du site reste en place).

## Ce qu'il faut avoir installé

- [Node.js](https://nodejs.org) version 22.18 ou plus récente (le projet est développé avec la version 24).
- Git.

Puis, une seule fois, dans le dossier du projet : `npm install` (télécharge React, Vite et TypeScript dans `node_modules/`).
La fabrication des cartes (`npm run pipeline`) et les tests, eux, n'ont besoin d'aucune installation.

## Voir le site sur son ordinateur

```bash
npm run dev
```

Puis ouvrir http://localhost:5173 dans le navigateur. Le site se met à jour tout seul à chaque modification du code. Pour l'arrêter : `Ctrl + C` dans le terminal.

## Commandes

Toutes les commandes se lancent depuis le dossier du projet.

| Commande | Ce qu'elle fait | Durée |
|---|---|---|
| `npm run dev` | Lance le site sur l'ordinateur, à l'adresse http://localhost:5173. | immédiat |
| `npm run build` | Vérifie le code puis fabrique la version à mettre en ligne, dans le dossier `dist/` (2 Mo). | quelques secondes |
| `npm run apercu` | Ouvre la version fabriquée par `npm run build`, pour la contrôler avant une mise en ligne. | immédiat |
| `npm run verifier` | Vérifie la cohérence de tout le code (site et pipeline) sans rien fabriquer. | quelques secondes |
| `npm run sources` | Télécharge les deux bases de données (735 Mo au total) dans `data/brut/`. Ne retélécharge pas un fichier déjà présent. | quelques minutes, selon la connexion |
| `npm run pipeline` | **Fabrique les cartes** : la base complète, l'Édition 1, et le rapport à relire. | environ 30 secondes |
| `npm run simulation:duel` | Fait jouer des milliers de duels à des joueurs fictifs (hésitant, bon lecteur, expert) contre l'ordinateur : durée des parties, victoires, variantes de réglages. Résultat dans `data/simulation-duel.md`. | 2 à 3 minutes |
| `npm run serveur:script` (trois scripts : structure, joueurs maison, cartes de l'édition) | Refabrique les deux scripts à coller dans Supabase (`serveur/1-structure.sql`, `serveur/2-joueurs-maison.sql`) à partir des chiffres et des listes du jeu. À relancer après avoir changé les chiffres des joutes ou la liste des pseudonymes interdits ; un test signale l'oubli. | immédiat |
| `npm run simulation:collection` | Simule des mois d'ouverture de paquets pour trois profils de joueurs, et quelques variantes de réglages. Résultat dans `data/simulation-collection.md`. | 2 secondes |
| `npm run simulation:marche` | Fait vivre 60 joueurs fictifs pendant 120 jours, paquets, duels et enchères compris : entrées et sorties d'Encre, prix obtenus, invendus par rareté, effet des planchers et des plafonds. Résultat dans `data/simulation-marche.md`. | 1 minute |
| `npm test` | Lance tous les tests automatiques, pipeline et jeu (ils vérifient que les règles sont bien appliquées). | 1 seconde |
| `npm run exploration` | Programme de la phase 0a : chiffres bruts sur les données, dans `data/exploration/chiffres.md`. | environ 30 secondes |

## Ce que Raphaël peut modifier

Après chaque modification : `npm run pipeline`, puis relire `data/rapport.md`.

| Fichier | À quoi il sert |
|---|---|
| `pipeline/config.ts` | Tous les réglages de fabrication : parts de chaque rareté, poids de la fréquence et de la prévalence, taille de l'édition, équilibre entre factions et entre types de mots, critères de qualité, regroupement des langues en factions. |
| `data/coups-de-coeur.txt` | Mots qui entrent d'office dans l'édition. Leur rareté se calcule toute seule (pour un mot que les chercheurs n'ont pas mesuré : d'après sa seule fréquence, comparée à celle des mots mesurés). |
| `data/exclusions.txt` | Mots qui n'y entrent jamais. |
| `data/hors-serie.txt` | Cartes Hors-série ajoutées à la main (`mot = Titre de la carte`), en plus des records trouvés automatiquement. |
| `data/corrections-factions.txt` | Corrections d'origine, quand l'ordinateur s'est trompé (`mot = Faction`). |
| `src/config/pseudos-interdits.ts` | Les mots refusés dans les pseudonymes des joutes. Après une modification : `npm run serveur:script`, puis recoller le premier script dans Supabase. |
| `src/config/serveur.ts` | L'adresse et la clé **publique** du projet Supabase. Vides = le jeu se passe de serveur. **Jamais de clé secrète ici.** |
| `src/config/equilibrage.ts` | **Les chiffres du jeu** : chances de chaque rareté dans un paquet, délai et stock de paquets, garantie de Légendaire, Encre par doublon, prix d'un paquet, bonus d'attaque et de défense des cartes rares, **tout le duel** (points de vie, poids de la défense, parade, bonus, rareté et réussite des mots de l'ordinateur, récompenses, seuil de maîtrise) **et les joutes classées** (cote de départ, ampleur des gains, ligues, adversaires proposés). **et le marché** (commission, durées, planchers par rareté, plafonds des joueurs gratuits, fenêtre de la cote). Après une modification : `npm test` puis `npm run simulation:collection` ou `npm run simulation:marche`. |

## Ce que le pipeline produit

| Fichier | Contenu | Dans Git ? |
|---|---|---|
| `public/data/edition-1.index.json` | Toutes les cartes de l'édition en version courte (400 Ko) : ce que le jeu charge au démarrage. | oui |
| `public/data/details/lot-XX.json` | Définitions, étymologie, prévalence, date d'apparition : chargés à la demande par le jeu. | oui |
| `data/rapport.md` | Le rapport de génération : répartitions, exemples, contrôle des origines. | oui |
| `data/mots-sensibles.md` | Pour information : mots injurieux, vulgaires ou péjoratifs présents dans l'édition. | oui |
| `data/intermediaire/base-complete.jsonl` | Les 52 000 cartes possibles (réserve pour les éditions suivantes et les leurres du duel). | non (regénérable) |

Deux générations faites à partir des mêmes données et des mêmes réglages donnent exactement le même résultat.

## Organisation des dossiers

### Modifier l’interface

L’accueil bleu nuit est composé de trois blocs indépendants dans `src/composants/accueil/` :
`PaquetsAccueil.tsx`, `DuelsAccueil.tsx` et `ResumeCollection.tsx`. `src/ecrans/Accueil.tsx`
les assemble et conserve les messages de sauvegarde. Ajouter ou déplacer un bloc se fait ici.

- `src/theme/theme.css` : palette commune, typographies et largeurs. Les timbres conservent leur propre papier.
- `src/composants/accueil/accueil.css` : composition de l’accueil, aperçu du deck et adaptation mobile.
- `src/composants/accueil/Enveloppe.tsx` : illustration SVG de l’enveloppe, recolorable avec les variables `--enveloppe-*`.
- `src/composants/accueil/modeleAccueil.ts` : données d’affichage issues de la sauvegarde, sans mutation. Le deck et les compteurs respectent les registres masqués.
- `src/composants/Navigation.tsx` et `navigation.css` : onglets, marque et solde d’Encre ; la liste `ONGLETS` définit les destinations.

Le compte à rebours est isolé dans le bloc des paquets pour éviter de recalculer les dessins du deck chaque seconde.
Les règles, prix et quantités continuent à venir de `src/config/equilibrage.ts` ; aucune valeur de la maquette n’est utilisée comme donnée de jeu.
Après une modification, lancer `npm run build` et `npm test`, puis vérifier l’accueil sur ordinateur et téléphone.

| Dossier | Contenu |
|---|---|
| `pipeline/` | Les programmes qui transforment les données en cartes |
| `pipeline/etapes/` | Une étape par fichier : Lexique, Wiktionnaire, nettoyage, registres, origines, rareté, assemblage, édition, écriture, rapport |
| `pipeline/tests/` | Les tests automatiques |
| `src/partage/` | Ce que le pipeline et le jeu ont en commun (format des cartes, valeur des lettres, reconnaissance d'un mot et de sa famille dans une définition) |
| `src/config/` | Les chiffres d'équilibrage du jeu |
| `src/theme/` | **Le thème** du site : `theme.css` contient les couleurs, polices et mesures ; `styles.css` la mise en page |
| `src/ecrans/` | Un fichier par écran (Accueil, Ouverture de paquet, Collection, Fiche carte, Deck, Duel, Réglages, Confidentialité ; et `Galerie`, une page de contrôle des timbres visible seulement avec `npm run dev`, à l'adresse `#/galerie`) |
| `src/composants/` | Les éléments réutilisés : la barre de navigation, les en-têtes |
| `src/composants/carte/` | **Le timbre** : son dessin (`Carte.tsx`, `timbre.css`), ses cachets d'origine et de maîtrise (`Tampon.tsx`), son motif calculé à partir du mot (`decor.ts`) et les illustrations des timbres Hors-série (`vignettes.tsx`) |
| `src/navigation/` | Les adresses des écrans (`#/collection`, `#/carte/callipyge-adj`…) |
| `src/jeu/` | **Les règles du jeu**, sans écran ni stockage : tirage des paquets, recharge, Encre, sauvegarde, duel (`duel.ts`), épreuve de maîtrise (`epreuve.ts`), joutes classées (`joute.ts`), deck, maîtrise et récompenses (`progression.ts`), enchères du marché (`marche.ts`), cote des timbres (`cote.ts`). Entièrement couvertes par des tests |
| `serveur/` | Les scripts de la base Supabase (fabriqués, ne pas les modifier à la main) et le programme qui les fabrique |
| `simulateurs/` | Les outils d'équilibrage : simulateur de collection et simulateur de duel |
| `src/services/` | Le seul endroit du jeu qui sait d'où viennent les données. `joutes.ts` choisit entre le jeu sans serveur et Supabase (`supabase.ts`, `compte.ts`), selon `src/config/serveur.ts` ; `collections.ts` fait de même pour la collection elle-même quand le serveur en est propriétaire (`collectionsSurLeServeur`), et `partie.ts` synchronise alors l'appareil avec lui (en service depuis le 22 septembre 2026) ; `src/jeu/codeDeSecours.ts` et `serveur/recuperation.ts` : le code de secours qui rend sa collection au joueur sur un autre appareil |
| `public/data/` | Les fichiers de cartes que le jeu chargera |
| `data/` | Listes tenues par Raphaël, rapports, et données brutes (hors Git) |
