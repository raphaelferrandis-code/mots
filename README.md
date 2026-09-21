# MOTS

Jeu de cartes à collectionner où chaque carte est un vrai mot de la langue française.

- Le projet est décrit dans [BRIEF-v2.md](BRIEF-v2.md) — c'est le document de référence.
- L'origine et la licence des données sont dans [SOURCES.md](SOURCES.md).
- Ce que contiennent vraiment les données : [COMPTE-RENDU-donnees.md](COMPTE-RENDU-donnees.md).
- **Le résultat de la fabrication des cartes : [data/rapport.md](data/rapport.md).**

**État d'avancement : phase 1 (squelette du site) faite.** Le site s'ouvre, on navigue entre les écrans et on peut consulter de vraies cartes ; les paquets, la collection et le duel arrivent aux phases 2 et 3. Le site n'est pas encore en ligne.

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
| `npm test` | Lance tous les tests automatiques, pipeline et jeu (ils vérifient que les règles sont bien appliquées). | 1 seconde |
| `npm run exploration` | Programme de la phase 0a : chiffres bruts sur les données, dans `data/exploration/chiffres.md`. | environ 30 secondes |

## Ce que Raphaël peut modifier

Après chaque modification : `npm run pipeline`, puis relire `data/rapport.md`.

| Fichier | À quoi il sert |
|---|---|
| `pipeline/config.ts` | Tous les réglages de fabrication : parts de chaque rareté, poids de la fréquence et de la prévalence, taille de l'édition, équilibre entre factions et entre types de mots, critères de qualité, regroupement des langues en factions. |
| `data/coups-de-coeur.txt` | Mots qui entrent d'office dans l'édition. |
| `data/exclusions.txt` | Mots qui n'y entrent jamais. |
| `data/corrections-factions.txt` | Corrections d'origine, quand l'ordinateur s'est trompé (`mot = Faction`). |
| `src/config/equilibrage.ts` | Les chiffres du jeu lui-même (pour l'instant : le bonus de défense par rareté). |

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
| `src/partage/` | Ce que le pipeline et le jeu ont en commun (format des cartes, valeur des lettres) |
| `src/config/` | Les chiffres d'équilibrage du jeu |
| `src/theme/` | **Le thème** : `theme.css` contient toutes les couleurs, polices et mesures ; `styles.css` la mise en page |
| `src/ecrans/` | Un fichier par écran (Accueil, Fiche carte, Réglages… et les écrans à venir) |
| `src/composants/` | Les éléments réutilisés : la carte, la barre de navigation, les en-têtes |
| `src/navigation/` | Les adresses des écrans (`#/collection`, `#/carte/callipyge-adj`…) |
| `src/services/` | Le seul endroit du jeu qui sait d'où viennent les données (aujourd'hui des fichiers, demain un serveur) |
| `public/data/` | Les fichiers de cartes que le jeu chargera |
| `data/` | Listes tenues par Raphaël, rapports, et données brutes (hors Git) |
