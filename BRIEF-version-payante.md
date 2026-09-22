# La version payante de Philamots

*Mis à jour le 22 septembre 2026 au soir, après les décisions de Raphaël (décision n° 44 du brief). Les trois
formules sont construites et vérifiées. **Rien ne permet encore de payer**, et ce document dit ce qui manque.*

---

## 1. L'offre

Trois étages qui se contiennent : chacun donne tout ce que donne le précédent.

| Formule | Prix | Ce qu'elle ajoute |
|---|---|---|
| **Le nécessaire** | 5,99 € une fois | Un paquet toutes les 5 minutes au lieu de 10 ; une réserve de 20 paquets au lieu de 10 |
| **Collectionneur** | 5 € par mois | Toute l'Encre gagnée en jouant multipliée par 2 ; aucune limite de ventes ni d'achats au marché |
| **Expert** | 10 € par mois | L'histoire des prix de chaque timbre ; 300 Encre versée chaque jour |

Et, à part, **de l'Encre à l'unité**, dont le prix reste à fixer.

**Aucune publicité, dans aucune formule.** Le jeu n'en affiche pas et n'en affichera pas. Une régie publicitaire
aurait suivi les joueurs, imposé une bannière de consentement, compliqué le cas des mineurs, et rapporté très peu à
cette échelle. La version payante vend donc du confort, pas l'absence de nuisance.

**L'escalier a été corrigé.** L'offre de départ donnait les paquets ×2 *et* l'Encre ×2 pour 5,99 € une fois :
l'abonnement à 5 € par mois aurait alors donné moins, pour plus cher, et personne ne s'y serait abonné.

## 2. Ce qui est construit, et vérifié

Le compte porte une **formule** : un achat unique acquis pour toujours, et un abonnement avec sa date de fin. Le
serveur en déduit un niveau de 0 à 3, qui commande tout. Un abonnement échu retombe tout seul au niveau de l'achat
unique, ou à la version gratuite. **Rien n'est perdu** : les timbres, l'Encre et le classement restent au joueur,
seuls les avantages cessent.

L'Encre reçue contre de l'argent — achetée, ou versée par la rente de la formule Expert — est comptée **à part**,
dans une seconde bourse. Elle ne sert qu'au marché : elle ne permet jamais d'acheter un paquet. Une mise puise
d'abord dans cette bourse ; quand une mise plus haute arrive, chaque Encre revient exactement d'où elle venait.

L'**année de naissance** est demandée seulement à qui regarde les formules, pas à tout le monde : un joueur qui ne
veut rien payer n'a pas à la donner. Le paiement sera réservé aux 18 ans et plus.

Tout cela est vérifié : par les tests automatiques, par un scénario dans un Postgres en mémoire (niveaux, abonnement
échu, rente versée une fois par jour, Encre doublée, Encre achetée qui ne paie pas un paquet, plafonds du marché),
et dans le navigateur.

**Pour essayer une formule**, il suffit d'une ligne dans l'éditeur SQL de Supabase : voir `GUIDE-supabase.md`,
étape 11.

## 3. Ce qui n'est pas construit

**Le paiement.** Aucun prestataire n'est branché, aucun bouton n'existe. Ce n'est pas un oubli : il reste des
points à régler (§4), et le tunnel de paiement se construit en dernier, pas en premier.

**Le cachet personnel** promis à la formule Expert, un tampon au pseudonyme du joueur sur ses timbres. C'est
décoratif, cela ne bloque rien, et cela demande un travail de dessin. À faire quand le reste sera réglé.

## 4. Ce qui doit être réglé avant le premier euro

| # | Point | Où ça en est |
|---|---|---|
| 1 | **Un juriste** | **À faire.** Voir ci-dessous : la question a beaucoup changé. |
| 2 | **Les 240 joueurs maison** | Raphaël les retirera « quand il y aura du monde ». **Attention : l'échéance qui compte est le premier euro encaissé, pas le nombre de joueurs.** Un jeu payant qui fait croire à de vrais adversaires est une pratique commerciale trompeuse. Ils sont marqués `maison` dans la base : les retirer est l'affaire d'une ligne. |
| 3 | **Les mineurs** | **Fait.** Année de naissance demandée avant l'achat, paiement réservé aux 18 ans et plus. |
| 4 | **Le compte récupérable** | **Un seul moyen existe** : le code de secours. La connexion par e-mail attend un nom de domaine, remis à plus tard. Je recommande, à défaut, de **rendre la création du code de secours obligatoire avant tout achat**. |
| 5 | **Les mentions de vente** | **Brouillon écrit** : `CGV-brouillon.md`. Il attend l'identité juridique de Raphaël et la relecture d'un juriste. |
| 6 | **Un contact réel** | Attend le nom de domaine, donc une adresse dédiée. En attendant, la page Confidentialité renvoie à la page publique du projet. |

### Sur le point 1 : ce que la décision sur l'Encre a changé

Raphaël demandait si retirer l'achat d'Encre suffisait à écarter le problème. La réponse honnête, et je ne suis pas
juriste : **cela change beaucoup, mais cela ne remplace pas un avis.**

Le sujet est le suivant. Payer pour recevoir un objet tiré au sort ressemble à une loterie dès que cet objet a une
valeur monétaire. Dans Philamots, l'Encre sert à deux choses : acheter un paquet, et miser aux enchères.

- **Avant**, si l'Encre s'achetait sans limite, la chaîne était directe : argent → Encre → paquet tiré au sort.
- **Maintenant**, l'Encre achetée ne peut pas payer de paquet. **De l'argent n'achète jamais un tirage au sort.**
  Il achète de la vitesse — des paquets gratuits qui arrivent plus vite — et du pouvoir d'achat au marché.

Ce qui reste à faire trancher par un juriste : payer pour recevoir *plus souvent* des paquets aléatoires reste un
lien entre l'argent et le hasard, même indirect. Et un timbre acheté au marché avec de l'Encre achetée a bien été
payé en argent, ce qui donne indirectement une valeur monétaire aux timbres.

**Ce que je peux affirmer**, parce que c'est dans le code : aucun euro ne se transforme en paquet tiré au sort, et
aucune Encre ni aucun timbre ne peut ressortir du jeu en argent.

## 5. La suite, dans l'ordre

1. Raphaël remplit les blancs de `CGV-brouillon.md` : forme juridique, adresse, immatriculation.
2. Un juriste relit ce texte et tranche la question du §4.
3. Raphaël fixe le prix de l'Encre à l'unité.
4. Je rends la création du code de secours obligatoire avant tout achat, ou l'on attend le nom de domaine et la
   connexion par e-mail.
5. Les 240 joueurs maison sont retirés ou signalés.
6. Un prestataire de paiement est choisi, et je construis le tunnel d'achat.

Tant que les cinq premiers points ne sont pas faits, la page « La version payante » dit au joueur ce qui l'attend,
et lui dit aussi que rien ne s'achète encore. C'est le contraire d'une promesse en l'air : c'est une porte prête,
qui ne s'ouvre pas.
