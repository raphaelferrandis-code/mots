# MOTS

Jeu de cartes à collectionner où chaque carte est un vrai mot de la langue française.

- Le projet est décrit dans [BRIEF-v2.md](BRIEF-v2.md) — c'est le document de référence.
- L'origine et la licence des données sont dans [SOURCES.md](SOURCES.md).
- Ce que contiennent vraiment les données : [COMPTE-RENDU-donnees.md](COMPTE-RENDU-donnees.md).
- **Le résultat de la fabrication des cartes : [data/rapport.md](data/rapport.md).**

**Le site en ligne : https://raphaelferrandis-code.github.io/mots/**

**État d'avancement : phase 3 faite.** Chaque carte est un timbre-poste émis par la langue d'origine du mot. On ouvre des paquets (un toutes les 10 minutes, 10 en stock), chaque timbre peut sortir en finition normale, brillante ou holographique, les doublons deviennent de l'Encre, et la collection se filtre et se sauvegarde sur l'appareil. **Le duel est jouable** : on compose un deck de dix cartes, on affronte l'ordinateur à trois niveaux, et pour attaquer il faut retrouver la définition de son mot parmi quatre. Cinq bonnes réponses sur un mot : il est « maîtrisé », et son timbre reçoit un cachet daté. Prochaine étape : la phase 4 (sons, finitions, accessibilité, testeurs).

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
| `npm run simulation:duel` | Fait jouer des milliers de duels à des joueurs fictifs (hésitant, bon lecteur, expert) contre l'ordinateur : durée des parties, victoires, variantes de réglages. Résultat dans `data/simulation-duel.md`. | 1 minute |
| `npm run simulation:collection` | Simule des mois d'ouverture de paquets pour trois profils de joueurs, et quelques variantes de réglages. Résultat dans `data/simulation-collection.md`. | 2 secondes |
| `npm test` | Lance tous les tests automatiques, pipeline et jeu (ils vérifient que les règles sont bien appliquées). | 1 seconde |
| `npm run exploration` | Programme de la phase 0a : chiffres bruts sur les données, dans `data/exploration/chiffres.md`. | environ 30 secondes |

## Ce que Raphaël peut modifier

Après chaque modification : `npm run pipeline`, puis relire `data/rapport.md`.

| Fichier | À quoi il sert |
|---|---|
| `pipeline/config.ts` | Tous les réglages de fabrication : parts de chaque rareté, poids de la fréquence et de la prévalence, taille de l'édition, équilibre entre factions et entre types de mots, critères de qualité, regroupement des langues en factions. |
| `data/coups-de-coeur.txt` | Mots qui entrent d'office dans l'édition. |
| `data/exclusions.txt` | Mots qui n'y entrent jamais. |
| `data/hors-serie.txt` | Cartes Hors-série ajoutées à la main (`mot = Titre de la carte`), en plus des records trouvés automatiquement. |
| `data/corrections-factions.txt` | Corrections d'origine, quand l'ordinateur s'est trompé (`mot = Faction`). |
| `src/config/equilibrage.ts` | **Les chiffres du jeu** : chances de chaque rareté dans un paquet, délai et stock de paquets, garantie de Légendaire, Encre par doublon, prix d'un paquet, bonus de défense, **et tout le duel** (points de vie, poids de la défense, bonus, force et réussite de l'ordinateur, récompenses, seuil de maîtrise). Après une modification : `npm test` puis `npm run simulation:collection`. |

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

| Dossier | Contenu |
|---|---|
| `pipeline/` | Les programmes qui transforment les données en cartes |
| `pipeline/etapes/` | Une étape par fichier : Lexique, Wiktionnaire, nettoyage, registres, origines, rareté, assemblage, édition, écriture, rapport |
| `pipeline/tests/` | Les tests automatiques |
| `src/partage/` | Ce que le pipeline et le jeu ont en commun (format des cartes, valeur des lettres, reconnaissance d'un mot et de sa famille dans une définition) |
| `src/config/` | Les chiffres d'équilibrage du jeu |
| `src/theme/` | **Le thème** du site : `theme.css` contient les couleurs, polices et mesures ; `styles.css` la mise en page |
| `src/ecrans/` | Un fichier par écran (Accueil, Ouverture de paquet, Collection, Fiche carte, Deck, Duel, Réglages ; et `Galerie`, une page de contrôle des timbres visible seulement avec `npm run dev`, à l'adresse `#/galerie`) |
| `src/composants/` | Les éléments réutilisés : la barre de navigation, les en-têtes |
| `src/composants/carte/` | **Le timbre** : son dessin (`Carte.tsx`, `timbre.css`), ses cachets d'origine et de maîtrise (`Tampon.tsx`), son motif calculé à partir du mot (`decor.ts`) et les illustrations des timbres Hors-série (`vignettes.tsx`) |
| `src/navigation/` | Les adresses des écrans (`#/collection`, `#/carte/callipyge-adj`…) |
| `src/jeu/` | **Les règles du jeu**, sans écran ni stockage : tirage des paquets, recharge, Encre, sauvegarde, duel (`duel.ts`), épreuve de maîtrise (`epreuve.ts`), deck, maîtrise et récompenses (`progression.ts`). Entièrement couvertes par des tests |
| `simulateurs/` | Les outils d'équilibrage : simulateur de collection et simulateur de duel |
| `src/services/` | Le seul endroit du jeu qui sait d'où viennent les données (aujourd'hui des fichiers, demain un serveur) |
| `public/data/` | Les fichiers de cartes que le jeu chargera |
| `data/` | Listes tenues par Raphaël, rapports, et données brutes (hors Git) |
