# Brief — Le Marché : échanges et enchères entre joueurs

*Version 1 du 22 septembre 2026. Ce document complète `BRIEF-v2.md`. Il répond à la demande de Raphaël du 21 septembre 2026 : « un nouvel onglet Marché, où les joueurs pourront échanger et vendre leurs cartes aux enchères ». Il décrit ce que le marché peut contenir, ce qu'il faut construire avant, et les décisions à prendre. Rien n'est commencé : c'est un plan à valider.*

---

## 1. Ce que Raphaël veut

Un onglet **Marché** dans le jeu, où les joueurs :
- vendent leurs timbres aux enchères ;
- échangent leurs timbres entre eux.

Idées ajoutées le même jour, à trier : ventes à prix fixe, avis de recherche, **cote des timbres** (un catalogue des prix, comme chez les philatélistes), salle des ventes tenue par le jeu, cachet de provenance sur un timbre échangé ; et, sans les autres joueurs : boutique du jour, pochettes thématiques par langue, atelier (fabriquer un timbre précis contre beaucoup d'Encre), accélérations du §5.6 du brief.

## 2. Pourquoi ce n'est pas « juste un onglet »

Aujourd'hui, **la collection vit sur le téléphone du joueur**. C'est un choix de la V1 (§5.6 du brief) : simple, sans compte, sans serveur. Mais un fichier qui vit sur le téléphone se modifie librement — on peut l'exporter, l'éditer, le réimporter, avancer l'heure du téléphone pour recevoir des paquets. Tant que chacun joue seul, ce n'est pas grave : tricher ne lèse personne. **Dès que les timbres circulent entre joueurs, une carte fabriquée dans un fichier devient une carte vendue à quelqu'un d'autre.** Un marché sur des collections locales serait faux dès le premier jour.

Trois préalables, donc :

1. **Le serveur devient propriétaire des collections et de l'Encre.** Les paquets sont tirés par le serveur avec son horloge, l'Encre est comptée par lui, chaque timbre a un propriétaire connu de lui. Le téléphone n'affiche plus que ce que le serveur lui dit. C'est le « backend complet » que le brief renvoyait à la phase 5 ; c'est aussi ce qui permettra un jour l'accélération payante (§5.6). **C'est le plus gros chantier depuis le début du projet.**
2. **Il faut avoir quelque chose à vendre.** Décision n° 26 : un vrai doublon devient automatiquement de l'Encre. Avec cette règle, personne n'a jamais deux exemplaires d'un timbre. Il faut garder les doubles (un « classeur de doubles »), au moins en partie.
3. **L'Encre ne doit jamais valoir de l'argent.** Tant que l'Encre ne s'achète ni ne se revend contre de l'argent réel, le marché reste un jeu. Le jour où de l'argent réel entre (accélération payante), un marché où des timbres s'échangent contre de l'Encre achetable ressemble à un marché de biens virtuels, avec ses règles (protection des mineurs, fiscalité, loteries) : **avis de juriste obligatoire avant**.

## 3. Ce que le marché pourrait contenir

Chaque brique est indépendante : on peut en livrer une, puis une autre. Classées de la plus simple à la plus ambitieuse.

| Brique | Ce que voit le joueur | Avantages | Difficultés | Pour |
|---|---|---|---|---|
| **A. Vente à prix fixe** | « Je vends *callipyge* pour 400 Encre. » Le premier qui paie l'emporte. | La plus simple ; immédiate ; pas d'attente. | Fixer un prix demande une idée de la valeur → la cote (E) aide. | Premier marché |
| **B. Enchères** | Une mise de départ, une durée (24 h), des surenchères ; le meilleur enchérisseur gagne à la fin. | Le plaisir de la salle des ventes ; les prix se découvrent tout seuls. | Enchères qui finissent quand le joueur dort ; surenchère de dernière seconde ; il faut prévenir le joueur (pas de notifications sur un site web classique). | Deuxième temps |
| **C. Échange timbre contre timbre** | « Je te donne *zeugma* contre ton *rodomontade*. » L'autre accepte ou refuse. | Très « cour de récré », sans Encre. | Il faut retrouver l'autre joueur (par pseudonyme), et une proposition peut attendre des jours. | Deuxième temps |
| **D. Avis de recherche** | « Je cherche *sérendipité*, j'offre 800 Encre. » Un possesseur vend directement. | Fait circuler les timbres rares vers ceux qui les veulent. | Presque la même mécanique que A, inversée. | Avec A |
| **E. La cote** | Sur chaque fiche : « Cote : 350 Encre (12 ventes ce mois-ci) ». | Très philatélique ; donne un sens à la collection ; guide les prix. | Demande des ventes pour exister ; à calculer sur le serveur (moyenne des dernières ventes, par timbre et par finition). | Dès que A a quelques semaines |
| **F. Salle des ventes du jeu** | Chaque semaine, le jeu met un timbre rare aux enchères. | Un rendez-vous ; et un **puits à Encre** : l'Encre payée disparaît, ce qui évite l'inflation. | Il faut décider d'où viennent ces timbres (créés par le jeu : ils diluent la rareté) . | Avec B |
| **G. Cachet de provenance** | Un timbre échangé porte un petit cachet « ex-collection Frangipane 43 ». | Raconte une histoire ; gratuit à faire une fois le marché en place. | Aucune. | Avec A ou C |
| **H. Sans les autres joueurs** | Boutique du jour (trois timbres à prix fixe, changés chaque jour), pochettes par langue, atelier, accélérations. | Faisable **avant** le serveur des collections, puisque le jeu vend et que rien ne circule entre joueurs. | Ce n'est pas un marché : c'est une boutique. | Dès maintenant, si Raphaël le souhaite |

**Ma recommandation** : commencer par **A + D + G** (ventes, avis de recherche, provenance) sur un serveur propriétaire des collections, puis **E** (la cote) dès qu'il y a des ventes, puis **B + F** (enchères et salle des ventes) quand il y a assez de joueurs pour que des enchères aient plusieurs participants. **C** (le troc) peut venir n'importe quand après A. **H** peut être fait tout de suite, à part, si Raphaël veut « quelque chose à vendre » vite.

## 4. L'économie : où l'Encre entre et où elle sort

Aujourd'hui l'Encre **entre** par les doublons et les duels, et **sort** par les paquets à 150 Encre. Un marché ajoute des transferts d'Encre entre joueurs — sans en créer — mais si les joueurs achètent des timbres au lieu de paquets, moins d'Encre sort, et elle s'accumule. Les prix montent (inflation), les nouveaux joueurs ne peuvent plus rien acheter.

Garde-fous classiques :
- une **commission** sur chaque vente (par exemple 10 % de l'Encre payée disparaît) ;
- la **salle des ventes du jeu** (F), dont les recettes disparaissent ;
- un **plafond** au nombre de ventes par jour et par joueur (évite aussi les manipulations de cote) ;
- des **prix planchers** par rareté (un timbre Légendaire ne se vend pas 1 Encre).

Comme pour les paquets et les duels, il faudra un **simulateur de marché** (`npm run simulation:marche`) avant de fixer ces chiffres, tous dans `src/config/equilibrage.ts`.

## 5. Ce qu'il faut construire

### 5a. Le compte et la collection sur le serveur (préalable)

- **Tables** : collections (joueur, timbre, finition, nombre, obtenu le), Encre et réserve de paquets, paquets ouverts (tirés par le serveur), historique des gains.
- **Fonctions du serveur** : ouvrir un paquet (tirage et horloge côté serveur : plus de triche à l'heure), acheter un paquet, noter un duel, changer de deck. Le jeu ne calcule plus rien de ce qui a de la valeur.
- **Migration** : à la première visite après la mise en ligne, la collection locale est **importée une fois** dans le compte du joueur (et vérifiée : pas plus de timbres que de paquets ouverts, sinon elle est ramenée à ce qui est plausible). Ensuite le serveur fait foi ; l'export local reste possible, en lecture.
- **Compte** : aujourd'hui, le compte anonyme des joutes est lié au navigateur. Avec une collection sur le serveur, perdre son téléphone, c'est perdre sa collection → il faut un **moyen de récupération** : une adresse e-mail (lien magique, sans mot de passe) ou un code de récupération à noter. Décision à prendre (§7). Une adresse e-mail est une donnée personnelle : page Confidentialité et procédures à revoir.
- **Hors ligne** : le jeu affiche la dernière collection connue, mais n'ouvre pas de paquet sans réseau.
- **Hébergement** : Supabase, comme les joutes. Son palier gratuit devrait suffire jusqu'à quelques milliers de joueurs ; à revérifier sur le web au moment de lancer (les offres changent).

### 5b. Le marché lui-même

- **Tables** : annonces (vendeur, timbre, finition, prix, état), enchères (mises, fin), transactions (l'historique : c'est lui qui fait la cote), avis de recherche.
- **Fonctions du serveur, transactionnelles** : mettre en vente, acheter, enchérir, clore une enchère, accepter un échange. Chaque fonction vérifie que le vendeur possède bien le timbre et l'acheteur bien l'Encre, et fait les deux mouvements d'un coup (jamais un timbre parti sans l'Encre arrivée).
- **Écran Marché** : onglet dans la navigation ; recherche par mot, filtres (rareté, faction, finition) ; mes ventes, mes achats, mes avis de recherche ; sur chaque fiche de timbre, sa cote et un bouton « Vendre » ou « Chercher ».
- **Pas de texte libre** dans les annonces (seulement des timbres et des prix) : rien à modérer, hormis les pseudonymes, déjà filtrés.
- **Les joueurs maison** (les 240 profils fabriqués pour les joutes) **ne vendent ni n'achètent rien** : un marché animé par de faux vendeurs serait une tromperie.

### 5c. Ordre des étapes et critères de validation

| Étape | Contenu | Validée quand… |
|---|---|---|
| **M0. Décisions** | Les choix du §7, un simulateur de marché, ce brief mis à jour | Raphaël a tranché les questions du §7 |
| **M1. Collection sur le serveur** | Tables, fonctions, migration, moyen de récupération, page Confidentialité mise à jour | Deux appareils voient la même collection ; avancer l'heure du téléphone ne donne plus de paquet ; un joueur retrouve sa collection après avoir effacé son navigateur |
| **M2. Classeur de doubles** | Les doublons sont gardés selon la règle choisie (§7) ; l'écran Album les montre | Un joueur possède deux exemplaires d'un timbre et voit ce qu'il peut en faire |
| **M3. Ventes, avis de recherche, provenance** (A, D, G) | Annonces, achats, commission, plafonds, cachet de provenance | Deux joueurs s'échangent un timbre contre de l'Encre ; l'Encre totale du jeu a baissé de la commission ; le timbre porte son cachet |
| **M4. La cote** (E) | Calcul sur le serveur, affichage sur les fiches et dans l'album | La cote d'un timbre suit ses ventes réelles |
| **M5. Enchères et salle des ventes** (B, F) | Mises, durée, clôture automatique, vente hebdomadaire du jeu | Une enchère se clôt correctement même si personne n'est connecté ; le gagnant reçoit le timbre, les perdants leur Encre |
| **M6. Troc** (C) | Propositions d'échange entre pseudonymes | Deux joueurs échangent deux timbres sans Encre |

Ordre de grandeur : M1 est comparable à tout le travail fait pour les joutes (serveur + jeu + guide) ; M3 à la phase 2 (paquets et collection). Le reste est plus petit.

## 6. Ce qui change pour les joueurs déjà là

- Leur collection est importée une fois dans leur compte. Ceux qui ont trafiqué leur fichier verront leur collection ramenée à quelque chose de plausible (à annoncer clairement).
- Le compte anonyme des joutes devient **le** compte du joueur. Il faut leur proposer d'y attacher un moyen de récupération.
- Rien ne les oblige à aller au marché : un joueur peut continuer à collectionner et à jouer sans jamais vendre.

## 7. Les décisions à prendre (Raphaël)

| # | Question | Options | Ma recommandation |
|---|---|---|---|
| 1 | **Faut-il vraiment mettre les collections sur le serveur maintenant ?** | (a) Oui, c'est le prix du marché ; (b) d'abord la boutique H sans marché ; (c) attendre d'avoir plus de joueurs | (a) si le marché est la priorité ; sinon (b), qui donne « quelque chose à acheter » vite sans bouleverser le jeu |
| 2 | **Que devient un doublon ?** | (a) Gardé, toujours (l'Encre ne vient plus que des duels) ; (b) gardé jusqu'à un nombre (par exemple 3 exemplaires), l'excédent devient de l'Encre ; (c) le joueur choisit à l'ouverture du paquet | (b) : simple, on a des doubles à vendre, l'Encre continue d'entrer |
| 3 | **Que peut-on vendre ?** | (a) Seulement ses doubles ; (b) n'importe quel timbre, même le dernier exemplaire | (a) au début : la collection reste une collection, et un timbre vendu par erreur ne vide pas l'album |
| 4 | **La monnaie du marché** | (a) L'Encre ; (b) une seconde monnaie réservée au marché | (a). Une seconde monnaie complique tout, et l'Encre a déjà un sens |
| 5 | **Commission et plafonds** | À régler au simulateur | 10 % de commission, 10 ventes par jour, planchers par rareté (à mesurer) |
| 6 | **Moyen de récupération du compte** | (a) E-mail avec lien magique ; (b) code de récupération à noter ; (c) les deux | (c) : l'e-mail pour la plupart, le code pour ceux qui ne veulent rien donner. L'e-mail entraîne une mise à jour de la page Confidentialité |
| 7 | **Première brique livrée** | A + D + G, ou B (enchères) d'abord | A + D + G : les enchères n'ont de sens qu'avec beaucoup de joueurs en même temps |
| 8 | **Les joueurs maison sur le marché** | (a) Absents ; (b) vendeurs fictifs pour amorcer | (a), sans hésiter : des faux vendeurs, c'est une tromperie, et la cote serait fausse |
| 9 | **Argent réel** | Jamais / un jour, pour l'accélération seulement / un jour, aussi pour acheter de l'Encre | Jamais pour l'Encre. L'accélération payante reste possible plus tard, avec un juriste |
| 10 | **Nom de l'onglet** | « Marché », « Bourse », « Salle des ventes », « La Poste » | « Marché » : c'est le mot que Raphaël emploie |

## 8. Ce que je propose de faire ensuite

1. Raphaël répond au §7 (une ligne par question suffit).
2. J'écris le simulateur de marché et je propose les chiffres du §4.
3. Je mets ce brief à jour (version 2), puis j'attaque M1 : le compte et la collection sur le serveur, avec un guide pas à pas comme `GUIDE-supabase.md` pour la partie qui lui revient (le script à coller, les réglages du compte).

Tant que M1 n'est pas fait, le jeu continue de fonctionner comme aujourd'hui : rien de ce plan ne bloque les joueurs actuels.
