# Guide des testeurs — Philamots

*Pour Raphaël, qui recrute cinq personnes, et pour ces cinq personnes. Écrit le 22 septembre 2026, pour la fin de la phase 4 du brief (`docs/BRIEF-v2.md`, §8) : la phase est validée quand cinq testeurs extérieurs ont joué plusieurs jours et que leurs retours sont notés dans `docs/RETOURS-testeurs.md`.*

## 1. Ce qu'on teste

Philamots est un jeu de cartes à collectionner où chaque carte est un vrai mot de la langue française, présenté comme un timbre-poste. On ouvre des paquets, on remplit son album, on compose un deck de dix timbres et on affronte l'ordinateur ou le « double » d'autres joueurs en retrouvant les définitions.

Le jeu est un prototype : il est gratuit, il n'y a rien à acheter, et il peut avoir des défauts. C'est précisément ce qu'on cherche à savoir.

- Adresse : https://raphaelferrandis-code.github.io/mots/
- Durée souhaitée : **au moins cinq jours, dix minutes par jour** (les paquets se rechargent avec le temps : jouer un peu chaque jour, c'est le vrai usage).
- Téléphone de préférence, ordinateur bienvenu en plus.

## 2. Installer le jeu sur son téléphone

1. Ouvrir l'adresse dans **Safari** (iPhone) ou **Chrome** (Android). Pas en navigation privée : la partie serait perdue à la fermeture.
2. L'ajouter à l'écran d'accueil, pour l'ouvrir comme une application :
   - iPhone : bouton Partager (le carré avec une flèche) → « Sur l'écran d'accueil ».
   - Android : menu ⋮ en haut à droite → « Ajouter à l'écran d'accueil ».
3. La partie reste **sur le téléphone**. Dans Réglages → « Exporter ma sauvegarde », on peut en garder une copie ; c'est conseillé au bout de quelques jours.

## 3. Le programme, jour par jour

Ce n'est pas un examen : on suit le programme si on veut, on s'en écarte si on préfère. Ce qui compte, c'est de dire ce qu'on a ressenti.

| Jour | À faire | À noter |
|---|---|---|
| 1 | Ouvrir les trois paquets de départ. Feuilleter l'album, ouvrir la fiche d'un timbre. | A-t-on compris ce qu'est un timbre, une rareté, une finition, sans explication ? Les timbres sont-ils lisibles sur le téléphone ? |
| 2 | Composer un deck (bouton « Composer pour moi » si on hésite). Jouer trois duels d'entraînement : Facile, Normal, puis le niveau qu'on préfère. | Les règles de la manche (attaque, parade) sont-elles claires ? Le temps de réponse (15 s) est-il juste ? Y a-t-il des définitions trop faciles, trop obscures, ou fausses ? **Noter les mots.** |
| 3 | Rejoindre les joutes classées : choisir un pseudonyme, jouer deux joutes, regarder le classement. | A-t-on compris qu'on affronte le « double » d'un autre joueur ? A-t-on envie de monter en ligue ? |
| 4 | Revenir plusieurs fois dans la journée pour les paquets. Acheter un paquet avec de l'Encre quand on en a 150. | Le rythme (un paquet toutes les dix minutes, dix en réserve) est-il frustrant, juste, trop généreux ? L'Encre a-t-elle du sens ? |
| 5 | Partager l'image d'un timbre (bouton sur sa fiche). Essayer les réglages : son, animations, mots masqués. Lire la page Confidentialité. | Les sons plaisent-ils ou agacent-ils ? La page Confidentialité rassure-t-elle ? |

## 4. Les questions auxquelles on cherche une réponse

1. **Compréhension** : qu'est-ce qui n'a pas été compris du premier coup ?
2. **Plaisir** : quel moment a fait plaisir ? Lequel a ennuyé ?
3. **Rythme** : combien de fois par jour a-t-on ouvert le jeu, et pourquoi ?
4. **Difficulté** : les duels sont-ils trop faciles, trop durs, au bon niveau ? À quel niveau ?
5. **Mots** : des définitions ou des mots qui posent problème (trop faciles, incompréhensibles, choquants). Toujours noter le mot.
6. **Défauts** : tout ce qui s'est mal passé (écran qui ne s'affiche pas, bouton qui ne répond pas, partie perdue…), avec le téléphone et le navigateur utilisés.
7. **Envie de revenir** : de 1 (« jamais ») à 5 (« demain sans faute »).

## 5. Comment envoyer ses retours

Un message par jour à Raphaël, court, sur ce modèle (copier-coller) :

```
Jour : 1 / 2 / 3 / 4 / 5
Téléphone et navigateur : (par exemple iPhone 13, Safari)
Temps joué aujourd'hui :
Ce qui m'a plu :
Ce qui m'a gêné ou que je n'ai pas compris :
Mots ou définitions à revoir :
Bugs :
Envie de revenir demain (1 à 5) :
```

Une capture d'écran vaut souvent mieux qu'une explication.

## 6. Ce que Raphaël en fait

Chaque retour est recopié dans `docs/RETOURS-testeurs.md` (un tableau par testeur, puis une synthèse). Les remarques qui reviennent chez plusieurs testeurs deviennent des décisions ; les chiffres d'équilibrage (rythme des paquets, difficulté, temps de réponse) se règlent dans `src/config/equilibrage.ts` et se vérifient avec les simulateurs (`npm run simulation:collection`, `npm run simulation:duel`).

## 7. À savoir sur les données

La partie reste sur le téléphone du testeur. Seules les joutes classées envoient au serveur du jeu un pseudonyme, une cote et le deck (voir la page Confidentialité dans les Réglages). À la fin du test, chacun peut supprimer son profil de joute depuis cette page, ou effacer sa partie depuis les Réglages.
