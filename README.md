# MOTS

Jeu de cartes à collectionner où chaque carte est un vrai mot de la langue française.

- Le projet est décrit dans [BRIEF-v2.md](BRIEF-v2.md) — c'est le document de référence.
- L'origine et la licence des données sont dans [SOURCES.md](SOURCES.md).
- Ce que contiennent vraiment les données : [COMPTE-RENDU-donnees.md](COMPTE-RENDU-donnees.md).

**État d'avancement : phase 0a (exploration des données) terminée.** Il n'y a pas encore de jeu.

## Ce qu'il faut avoir installé

- [Node.js](https://nodejs.org) version 22.18 ou plus récente (le projet est développé avec la version 24).
- Git.

Pour l'instant le projet n'a besoin d'aucune autre installation.

## Commandes

Toutes les commandes se lancent depuis le dossier du projet.

| Commande | Ce qu'elle fait | Durée |
|---|---|---|
| `npm run sources` | Télécharge les deux bases de données (735 Mo au total) dans `data/brut/`. Ne retélécharge pas un fichier déjà présent. | quelques minutes, selon la connexion |
| `npm run exploration` | Lit les deux bases, les croise, et écrit des chiffres et des exemples dans `data/exploration/chiffres.md`. | environ 30 secondes |

## Organisation des dossiers

| Dossier | Contenu |
|---|---|
| `pipeline/` | Les programmes qui transforment les données en cartes |
| `pipeline/exploration/` | Le programme d'exploration de la phase 0a |
| `data/brut/` | Les fichiers téléchargés (pas dans Git : trop gros, et retéléchargeables) |
| `data/intermediaire/` | Fichiers de travail (pas dans Git : regénérables) |
| `data/exploration/` | Les chiffres produits par l'exploration |
