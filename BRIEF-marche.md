# Brief — Le Marché : échanges et enchères entre joueurs

*Version 3 du 22 septembre 2026 — intègre les six décisions de Raphaël du même jour (§7 bis) ; les collections sont sur le serveur depuis ce jour (M1). Version 1 du 22 septembre 2026. Ce document complète `BRIEF-v2.md`. Il répond à la demande de Raphaël du 21 septembre 2026 : « un nouvel onglet Marché, où les joueurs pourront échanger et vendre leurs cartes aux enchères ». Il décrit ce que le marché peut contenir, ce qu'il faut construire avant, et les décisions à prendre. Rien n'est commencé : c'est un plan à valider.*

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
| **M1. Collection sur le serveur** *(en service depuis le 22/09/2026)* | Tables, fonctions, migration, page Confidentialité mise à jour ; **le moyen de récupération reste à faire** (question 6) | Avancer l'heure du téléphone ne donne plus de paquet ; la collection importée est bornée au plausible ; les paquets, l'Encre, le deck et les récompenses passent par le serveur. (Deux appareils sur la même collection : quand le compte sera récupérable) |
| ~~**M2. Classeur de doubles**~~ | Abandonné le 22/09/2026 : les doublons restent de l'Encre (décision 3 du §7 bis) | — |
| **M2 bis. Récupération du compte** *(le code de secours est fait le 22/09/2026 : Réglages → « Ton compte » ; l'e-mail attend un service d'envoi, voir GUIDE-supabase.md, étape 9)* | Un code de secours (à noter) qui transfère la collection sur un nouvel appareil ; puis l'e-mail par lien magique | Un joueur retrouve sa collection sur un autre téléphone avec son code ; puis avec son e-mail |
| **M3. Les enchères** (B, + G) *(choix de Raphaël du 22/09/2026 ; réglages 7 à 10 du §7 bis ; **code prêt le 22/09/2026 au soir, en service dès que Raphaël a recollé `serveur/1-structure.sql` — GUIDE-supabase.md, étape 10** ; le cachet de provenance dessiné sur le timbre reste à faire)* | Mise en vente, mises, durée fixe, clôture par le serveur, prix d'achat immédiat facultatif, commission, plafonds pour les joueurs gratuits, cachet de provenance | Une enchère se clôt correctement même si personne n'est connecté ; le gagnant reçoit le timbre, les perdants leur Encre ; l'Encre totale du jeu a baissé de la commission |
| **M4. La cote** (E) *(code prêt le 22/09/2026 au soir, en même temps que M3 : même script à coller)* | Calcul sur le serveur ; la cote du jour pour tous, l'historique et les statistiques pour les payants | La cote d'un timbre suit ses ventes réelles |
| **M5. Avis de recherche et salle des ventes du jeu** (D, F) | « Je cherche X » ; vente hebdomadaire du jeu | Un timbre rare trouve preneur ; la vente du jeu retire de l'Encre |
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

## 7 bis. Les décisions prises par Raphaël (22 septembre 2026)

1. **Un timbre vendu quitte l'album.** On peut vendre n'importe lequel de ses timbres, pas seulement ses doubles : « c'est bien qu'un timbre disparaisse à la vente, ça crée une économie ». (Réponse à la question 3 : option b. Ma recommandation n'est pas retenue, et c'est cohérent : la rareté vient de ce qu'on renonce à quelque chose.) Conséquence : l'écran de vente doit prévenir clairement quand on vend son dernier exemplaire, et le classeur de doubles (M2) n'est plus indispensable — la règle actuelle des doublons (ils deviennent de l'Encre) peut rester.
2. **Une version payante du jeu** viendra, avec : des paquets plus rapides, de l'Encre, les statistiques des prix du marché (la cote), des achats et reventes illimités. (Réponses aux questions 5 et 9 : les joueurs gratuits ont donc un plafond d'opérations par jour, les payants non ; et l'Encre s'achètera un jour en argent réel.)

**Ce que la version payante change au plan :**
- **L'Encre achetable en argent réel** est la décision la plus lourde de conséquences : l'Encre devient de l'argent, les timbres qui s'achètent avec en deviennent aussi, et les paquets tirés au sort avec de l'Encre achetée sont des « loteries » au sens de plusieurs réglementations (§7 de `BRIEF-v2.md`). **Avant le premier euro : un juriste, obligatoirement.** Deux points sont déjà connus : les 240 joueurs maison non signalés devront l'être ou disparaître (un jeu payant ne peut pas faire croire à de vrais adversaires), et les mineurs (question de fond du §10.3 du brief) devront être traités.
- **L'économie** doit être réglée avec cette entrée d'Encre illimitée en tête : les puits (commission, salle des ventes) deviennent obligatoires, sinon les prix s'envolent pour les joueurs gratuits. Le simulateur de marché devra modéliser une part de joueurs payants.
- **Le compte devient indispensable** (on ne perd pas ce qu'on a payé) : le moyen de récupération (question 6) passe de « souhaitable » à « nécessaire avant tout paiement ».
- **La cote réservée aux payants** : à vérifier à l'usage — un marché où seuls les payants connaissent les prix peut décourager les gratuits de vendre. Une variante : la cote du jour pour tous, l'historique et les statistiques pour les payants.

**Réponses du 22 septembre 2026 (soir)** aux questions restées ouvertes :
3. **Les doublons deviennent de l'Encre, comme aujourd'hui** (question 2) : pas de classeur de doubles ; M2 est abandonné.
4. **Récupération du compte : e-mail par lien magique + un code de secours** (question 6). **Le code de secours est fait** (Réglages → « Ton compte » : vingt signes en quatre groupes, montrés une seule fois, dont le serveur ne garde que l'empreinte ; sur un autre appareil, le code transfère la collection et le profil de joute, et ferme l'ancien compte anonyme ; dix essais par heure au plus). L'e-mail attend un service d'envoi : celui fourni par Supabase est limité à 2 e-mails par heure pour tout le projet (vérifié dans sa documentation), prévu pour les essais.
5. **Les enchères d'abord** (question 7 ; ma recommandation — les ventes à prix fixe — n'est pas retenue). Conséquences : une enchère a une durée fixe et le serveur la clôt lui-même, même si personne n'est connecté ; le gagnant reçoit le timbre et les perdants leur Encre à leur visite suivante ; sans notifications sur un site web, le joueur absent découvre le résultat en revenant. Je proposerai d'ajouter aux enchères un **prix d'achat immédiat** facultatif, pour que les ventes à prix fixe existent quand même.
6. **La cote du jour pour tous, l'historique et les statistiques pour les payants** (question 4 de l'échange). Un joueur gratuit sait à quel prix vendre ; le payant voit les tendances.

**Réglages des enchères, décidés le 22 septembre 2026 (soir, second échange)** :
7. **Durée au choix du vendeur : 12, 24 ou 48 heures.**
8. **Prix d'achat immédiat facultatif**, fixé par le vendeur : la vente à prix fixe existe ainsi sans écran de plus.
9. **Commission de 10 %** : le vendeur reçoit 90 % de l'Encre payée, le reste disparaît (chiffre dans `src/config/equilibrage.ts`, à confirmer au simulateur).
10. **Joueurs gratuits : 3 ventes en cours et 3 achats par jour au plus** ; les payants n'auront pas de limite (décision n° 34).

Règles techniques qui en découlent (choix de Claude, à contester si besoin) : l'Encre d'une mise est bloquée aussitôt et rendue dès qu'une mise plus haute arrive ; une mise dans les cinq dernières minutes prolonge l'enchère de cinq minutes (contre les coups de dernière seconde) ; un vendeur ne peut ni miser sur sa propre enchère, ni la retirer quand une mise existe ; le timbre mis en vente quitte l'album (et le deck) dès la mise en vente, et y revient s'il n'est pas vendu ; les enchères se clôturent au passage du premier joueur venu après l'heure (le serveur n'a pas besoin de tâche planifiée) ; des prix planchers par rareté empêchent de brader un timbre rare (chiffres à confirmer au simulateur).

## 8. Ce que je propose de faire ensuite

1. ~~Raphaël répond au §7~~ — fait en partie le 22/09/2026 (§7 bis) ; trois questions restent ouvertes, avec une réponse par défaut.
2. **M1, le compte et la collection sur le serveur — en service depuis le 22/09/2026** (Raphaël a collé les scripts ; vérifié contre le vrai serveur avec un joueur d'essai, effacé ensuite) : les scripts (`serveur/1-structure.sql` mis à jour, `serveur/3-cartes.sql`), le jeu qui parle au serveur (`src/services/collections.ts`, `src/jeu/synchronisation.ts`), et l'étape 8 de `GUIDE-supabase.md` pour la partie qui revient à Raphaël (coller deux scripts). Sans moyen de récupération du compte pour l'instant (question 6). Vérifié dans un Postgres en mémoire et contre un faux Supabase ; reste la vérification contre le vrai serveur, après le collage des scripts.
3. **Le moyen de récupération du compte** (décision 4 du §7 bis) : le code de secours, puis l'e-mail.
4. **M3, les enchères — code prêt le 22/09/2026 au soir** : l'onglet « Marché » (`src/ecrans/Marche.tsx`), « Vendre ce timbre » sur la fiche d'un timbre (`src/composants/MiseEnVente.tsx`), les règles pures (`src/jeu/marche.ts`), le service (`src/services/marche.ts`) et le serveur (`serveur/marche.ts` : tables `encheres` et `mises`, clôture « paresseuse » faite au passage de n'importe quel joueur, commission, plafonds des joueurs gratuits, planchers par rareté, prolongation de cinq minutes quand une mise arrive dans les cinq dernières minutes). Vérifié dans un Postgres en mémoire, puis de bout en bout contre un faux Supabase avec deux joueurs (vente, retrait, mise, achat immédiat, invendue, recherche, téléphone). Il reste à Raphaël à recoller `serveur/1-structure.sql` (étape 10 du guide). Ensuite : le simulateur de marché (avec une part de joueurs payants) pour confirmer la commission et les planchers, le cachet de provenance dessiné sur le timbre (la provenance est déjà enregistrée), puis la cote du jour pour tous (M4).

5. **M4, la cote — code prêt le 22/09/2026 au soir**, dans le même script que M3 (une seule chose à coller). Une fois par jour, au premier passage d'un joueur, le serveur relève pour chaque timbre et chaque finition la **médiane** des prix de ses ventes des **30 derniers jours** ; cette cote du jour est gardée, jour après jour. Tout le monde la voit : sur la fiche du timbre (« Cote du jour : 120 Encre · brillante 300 Encre »), dans le formulaire de vente (elle aide à fixer la mise) et sur chaque ligne du marché. La **version payante** (décision n° 38) y ajoute l'histoire : une courbe jour par jour et par finition, les statistiques (nombre de ventes, prix le plus bas, le plus haut) sur 90 jours, et les 30 dernières ventes conclues. Personne n'est encore payant : la colonne est prête, le serveur refuse l'histoire aux autres.
   Deux choix à connaître : (a) la **médiane** plutôt que la moyenne, pour qu'une vente aberrante ne fausse pas la cote ; (b) une seule mise à jour par jour, comme un catalogue de philatéliste — une vente d'aujourd'hui entre dans la cote de demain, ce qui rend la cote stable et impossible à bouger d'un coup.
6. Ensuite : le **simulateur de marché** (avec une part de joueurs payants) pour confirmer la commission et les planchers. Le **cachet de provenance** dessiné sur le timbre est laissé de côté (choix de Raphaël, 22/09/2026) ; la provenance reste enregistrée par le serveur.

Tant que M1 n'est pas fait, le jeu continue de fonctionner comme aujourd'hui : rien de ce plan ne bloque les joueurs actuels.
