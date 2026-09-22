# La version payante de Philamots

*Document de travail, écrit le 22 septembre 2026. Il prépare la décision n° 34 du brief : « une version payante du
jeu — paquets plus rapides, Encre, statistiques des prix du marché, achats et reventes illimités ». Rien n'est
vendable en l'état, et c'est voulu : ce document dit ce qui est déjà construit, ce qui manque, et surtout ce qui
doit être réglé avant le premier euro.*

---

## 1. Ce qui est déjà construit

Le serveur donne à chaque compte un drapeau `payant`. **Personne ne l'a**, et il n'existe aucun moyen de l'obtenir :
il se met à la main dans la base. Quand il est allumé, quatre choses changent, toutes déjà en service.

| Avantage | Ce que ça donne | Où c'est écrit |
|---|---|---|
| Paquets plus rapides | Un paquet gratuit toutes les 5 minutes au lieu de 10 | `recharger`, dans `serveur/collections.ts` |
| Réserve plus grande | 20 paquets en attente au lieu de 10 | idem |
| Marché sans limite | Ni les 10 ventes en cours ni les 10 achats par jour ne s'appliquent | `mettre_en_vente` et `encherir`, dans `serveur/marche.ts` |
| Histoire des prix | La courbe d'une cote jour par jour, les statistiques sur 90 jours, les 30 dernières ventes | `historique_de_la_cote`, dans `serveur/marche.ts` |

Le jeu affiche le compte à rebours des paquets avec les mêmes chiffres que le serveur, et la rubrique « Ton compte »
des réglages dit au joueur payant ce dont il bénéficie. Tout est vérifié : par le scénario dans un Postgres en
mémoire, et par les tests automatiques.

**Pour l'essayer**, il suffit d'allumer le drapeau sur un compte, dans l'éditeur SQL de Supabase :

```sql
update public.comptes set payant = true where utilisateur = '<identifiant du compte>';
```

---

## 2. Ce qui n'est pas construit, et pourquoi

**Le paiement lui-même.** Aucun prestataire n'est branché, aucun prix n'est fixé, aucun bouton n'existe. Ce n'est pas
un oubli : encaisser de l'argent change la nature juridique du jeu, et plusieurs décisions doivent venir avant (voir
le §4). Construire un tunnel de paiement maintenant reviendrait à faire le travail dans le désordre.

**L'Encre.** La décision n° 34 dit « de l'Encre », sans préciser laquelle des deux choses :

- **(a) de l'Encre achetée à l'unité**, comme on achète des jetons. C'est ce qui pèse le plus sur l'économie : de
  l'Encre entre dans le jeu sans qu'aucun joueur l'ait gagnée, et les prix du marché montent pour tout le monde.
- **(b) une rente quotidienne pour les abonnés**, par exemple 300 Encre par jour. Plus facile à équilibrer, plus
  proche d'un abonnement, et déjà modélisée par le simulateur de marché.

**C'est une question pour Raphaël, pas pour moi.** Tant qu'elle n'est pas tranchée, je n'écris rien sur ce point.

**Le prix et la forme.** Abonnement au mois, achat unique à vie, ou les deux ? Aucun chiffre n'est proposé ici :
ce serait inventer une décision.

---

## 3. Ce que le simulateur en dit déjà

`npm run simulation:marche` modélise une part de joueurs payants qui reçoivent 300 Encre par jour (hypothèse (b)).
Résultat, avec un joueur sur dix payant : l'Encre créée par joueur et par jour passe de 1 119 à 1 160, soit 4 % de
plus, et les prix du marché ne s'envolent pas. La sortie principale d'Encre reste l'achat de paquets, pas la
commission du marché. Le rapport complet est dans `data/simulation-marche.md`.

Ce chiffre vaut pour une rente modeste. Une Encre achetée sans limite (hypothèse (a)) n'a pas été modélisée, et il
faudra le faire avant de la mettre en vente.

---

## 4. Ce qui doit être réglé avant le premier euro

Ces points ne sont pas des détails de mise au point. Chacun peut empêcher la vente, ou l'exposer à une sanction.

1. **Un juriste, obligatoirement.** Dès que l'Encre s'achète avec de l'argent, les paquets tirés au sort avec cette
   Encre ressemblent à une loterie au sens de plusieurs réglementations. Le §7 de `BRIEF-v2.md` détaille le sujet.
   C'est le point le plus lourd, et il ne se règle pas en lisant des articles de blog.
2. **Les 240 joueurs maison.** Le jeu propose aujourd'hui des adversaires fabriqués sans le dire, à la demande de
   Raphaël. Tant que le jeu est gratuit, c'est un choix de game design. **Dès qu'il encaisse de l'argent, faire
   croire à de vrais adversaires devient une pratique commerciale trompeuse.** Ils devront être signalés comme tels,
   ou retirés. Ils sont marqués `maison` dans la base : les retirer est l'affaire d'une ligne.
3. **Les mineurs.** Un jeu de collection avec des paquets aléatoires et de l'argent réel attire des joueurs jeunes.
   Il faudra au minimum un âge déclaré, et se demander si un mineur peut payer. Question ouverte au §10.3 du brief.
4. **Le compte récupérable.** On ne perd pas ce qu'on a payé. Le code de secours existe ; la connexion par e-mail,
   non, faute de nom de domaine. **Avant de vendre quoi que ce soit, un joueur doit pouvoir retrouver son compte
   par deux moyens, pas un seul.**
5. **Les mentions de vente.** Conditions générales de vente, droit de rétractation, TVA, facturation, identité du
   vendeur. La page Confidentialité existe ; il n'y a rien pour la vente.
6. **Un contact réel.** La page Confidentialité renvoie aujourd'hui à la page publique du projet. Un client qui paie
   doit pouvoir écrire à quelqu'un.

---

## 5. Ce que je propose comme suite

1. **Raphaël tranche la question de l'Encre** (rente quotidienne ou achat à l'unité) et la forme de l'offre.
2. **Si c'est l'achat à l'unité**, je l'ajoute au simulateur avant tout, pour voir l'effet sur les prix.
3. **Raphaël consulte un juriste** avant que j'écrive la moindre ligne de paiement.
4. **Je construis la connexion par e-mail** quand un nom de domaine existera : c'est un préalable, pas un confort.
5. Alors seulement, le tunnel de paiement.

Tant que rien de tout cela n'est fait, le drapeau `payant` reste ce qu'il est : une porte prête, qui ne s'ouvre que
de l'intérieur.
