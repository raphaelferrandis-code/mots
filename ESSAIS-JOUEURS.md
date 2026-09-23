# Essais joueurs — dossier prêt, observations à recueillir

Aucune observation humaine n’a été recueillie pendant cette intervention. Les simulations et les essais automatisés valident le fonctionnement, pas le plaisir de jouer ni la difficulté ressentie. Les paramètres d’équilibrage n’ont donc pas été changés sur la base de faux retours.

## Organisation

Inviter 12 à 20 volontaires, répartis entre lecture occasionnelle, régulière et intensive. Utiliser un projet de validation et des comptes d’essai, sur téléphone et ordinateur. Expliquer ce qui sera observé, demander leur accord et attribuer un code `P01`, `P02`, etc. Ne mettre ni noms ni codes de secours dans le relevé.

Préparer deux decks identiques entre participants : un débutant accessible, un développé aux raretés variées. Les attribuer administrativement uniquement sur ce projet de validation. Noter leur composition et la version du jeu dans le carnet de session. Alterner l’ordre des niveaux et des decks entre volontaires, sans leur imposer de temps limité s’ils ont besoin du mode double ou illimité.

| Session | Parcours | Ce que l’on cherche |
|---|---|---|
| J1, 20–30 minutes | Ouvrir des paquets, composer le deck, essayer les trois niveaux, changer de deck | Compréhension des doublons, choix de carte, ambiguïtés des questions, durée et fatigue |
| J2, 15 minutes | Reprendre une partie, répéter le deck débutant, essayer une joute, tester une coupure | Apprentissage retenu, reprise compréhensible, difficulté du double |
| J7, 15 minutes | Rejouer les mêmes conditions, examiner collection et maîtrise, acheter/vendre dans le marché d’essai | Progression ressentie, envie de revenir, utilité de l’Encre et des cartes |

Le test économique se fait sans argent réel. Les droits payants éventuels sont accordés administrativement sur la base de validation ; ils sont notés séparément. Les changements de temps, de deck ou de paramètres sont consignés pour éviter de comparer des conditions différentes.

## Fiche après chaque duel

Noter : code volontaire, identifiant unique du combat, session, fréquence de lecture déclarée, type de deck, difficulté, réglage de temps, issue, abandon, durée observée, manches jouées, attaques tentées/réussies et parades tentées/réussies. Le bilan serveur fait foi pour l’issue et les compteurs. La durée s’arrête à la dernière manche, même si la personne laisse le résultat affiché.

Dans un carnet distinct, sans identité réelle : mots contestés et propositions affichées, problème de lisibilité, action incomprise, raison d’un abandon, usage du temps supplémentaire, paquets ouverts, Encre gagnée/dépensée et sentiment de progression. Demander « Qu’est-ce qui a décidé du résultat : vocabulaire, carte, temps ou interface ? » et « Quel changement te donnerait envie de rejouer ? ».

Stocker les relevés uniquement pour cet essai, annoncer leur durée de conservation aux volontaires et supprimer la correspondance compte/code quand elle n’est plus nécessaire. Le jeu n’ajoute aucun outil de mesure d’audience pour ce protocole.

## Exploitation du relevé

Créer un fichier JSON contenant une liste d’objets avec les champs suivants. Les valeurs ci-dessous décrivent le format, pas des observations à copier dans un résultat :

| Champ | Valeurs |
|---|---|
| `participant` / `combat` | Code `P01` et identifiant unique du duel |
| `session` | `J1`, `J2`, `J7` |
| `lecture` | `occasionnelle`, `reguliere`, `intensive` |
| `deck` | `debutant`, `developpe` |
| `niveau` | `Facile`, `Normal`, `Difficile` |
| `temps` | `normal`, `double`, `illimite` |
| `resultat` / `abandon` | `victoire`, `defaite`, `nul` / booléen |
| `dureeSecondes` / `manches` | Durée observée positive ou nulle / nombre entier |
| `attaques`, `attaquesReussies`, `parades`, `paradesReussies` | Compteurs du bilan |

Lancer `node simulateurs/essais-joueurs.ts observations.json rapport-essais.md` (avec `--experimental-strip-types` sur Node 22.14). Le rapport sépare les conditions, compte les volontaires et moyenne leurs taux individuels. Il signale les groupes trop petits ; la plage des taux individuels n’est pas un intervalle de confiance. Un fichier vide produit explicitement « Aucune observation humaine fournie ».

Traiter d’abord les définitions ambiguës et les problèmes d’usage. Décider ensuite d’un seul changement à la fois dans `src/config/equilibrage.ts`, annoncer l’effet attendu, rejouer la simulation et reproduire les mêmes essais avec les mêmes volontaires. Vérifier que l’amélioration ne masque pas davantage d’abandons ni un effet du temps supplémentaire. Ne pas extrapoler de petites cohortes à toute la population des joueurs.
