# Droits et licences

Philamots (https://philamots.fr/) est édité par Raphaël Ferrandis. Contact : contact@philamots.fr.

## Le code, le dessin et la marque : tous droits réservés

Le code du jeu, le dessin des timbres, des paquets et des écrans, le logo et le nom Philamots sont protégés. Ce dépôt
est public pour pouvoir être lu : il n'accorde aucune licence sur ces éléments, qui ne peuvent pas être repris sans
accord.

## Les données des mots : CC BY-SA 4.0

Les fichiers tirés des dictionnaires sont réutilisables sous la licence Creative Commons Attribution – Partage dans les
mêmes conditions 4.0 (https://creativecommons.org/licenses/by-sa/4.0/deed.fr), comme leurs sources :

- `public/data/edition-1.index.json` et `public/data/details/` : les timbres de l'édition, leurs définitions,
  étymologies, fréquences et prévalences ;
- `public/data/devinettes.json` : les devinettes du jour ;
- `data/pages-des-mots.json` : les textes des pages des mots ;
- `supabase/functions/_shared/catalogue-combat.json` : les définitions dont le serveur se sert en duel.

Sources :

- les définitions et les étymologies sont adaptées (raccourcies, nettoyées) du Wiktionnaire en français
  (https://fr.wiktionary.org), sous licence CC BY-SA 4.0 ; leurs auteurs figurent dans l'historique de chaque page du
  Wiktionnaire. Extraction grâce au projet wiktextract (https://kaikki.org) ;
- les fréquences et la part des gens qui connaissent chaque mot viennent de Lexique 4 (http://www.lexique.org), sous
  licence CC BY-SA 4.0 : New, B., Pallier, C., Schalchli, G., Bourgin, J., & Gimenes, M. (2026). Lexique 4: A major
  upgrade of the "Lexique" French lexical database. *Behavior Research Methods*, 58(5), 140.

Le détail des sources et de leur traitement : [docs/SOURCES.md](docs/SOURCES.md).

## Les polices

Playfair Display, Jost et Oswald, sous licence SIL Open Font License 1.1 (paquets `@fontsource`).
