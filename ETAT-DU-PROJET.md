# Où en est Philamots

> **Pour reprendre sur un autre poste et voir ce qu’il reste à faire : [A-FAIRE-RAPHAEL.md](A-FAIRE-RAPHAEL.md).**

> **25 septembre 2026 — refontes des écrans Duel et des Amis/Équipe : en ligne.** Publiées avec le jeu du 25/09.
> Duel (`BRIEF-duel.md`) : préparation réunie avec le Deck (quatre modes en onglets, deck éditable sur place), partie
> (barres de vie graduées, main et pioche), parade plein écran avec minuteur, résolution animée, nouveaux sons, écran
> de fin avec les gains réels. Amis et Équipe (`GUIDE-portraits-et-presence.md`) : en-tête commun, fiche de chaque ami
> (portrait, niveau, présence, vitrine de ses quatre plus beaux timbres), blason et cote 2v2 de l'équipe.
> **`serveur/15-portraits-et-presence.sql` : installé**, constaté par l'assistant le 25/09 en lecture seule (fonctions
> à jour, droits corrects, premier signal de présence reçu à 18 h 06). La dernière migration est désormais la 15.

> **25 septembre 2026 — mot adverse caché jusqu'à la parade (anti-triche) : en ligne.** Le serveur des combats envoyait au
> navigateur le mot adverse et sa définition dès le début de la manche : corrigé. Avant la parade, on ne voit plus que
> la nature, l'attaque et la défense (timbre face cachée), partout, Facile compris ; le mot se retourne à l'ouverture
> de la parade, sa définition n'arrive qu'au bilan. En Normal, en Difficile et contre un double, la pose alterne (le
> joueur à la manche 1) ; l'ordinateur Difficile qui répond joue une carte qui bat le type du joueur, s'il en a une.
> En direct, les mots de l'autre camp restent face cachée pendant la pose. Victoires simulées (bon lecteur, collection
> moyenne) : Normal 82 → 78 %, Difficile 64 → 58 % (`data/simulation-duel.md`). Moteur des combats en version 3 (les
> combats en cours continuent). Jeu publié, fonctions `combats` et `joutes-direct` redéployées par Raphaël le 25/09 : **en ligne**.

> **25 septembre 2026 — nouveaux cadres et avatars de portrait : publiés.** Choisis par Raphaël sur une planche de tri en
> trois passes : 34 cadres et 26 avatars (gratuits gravés, débloqués en métal, premium animés), une récompense par niveau
> jusqu'au 50 avec la courbe d'XP inchangée (le niveau 12 était atteint en un ou deux jours). Trois pièces premium sont
> offertes aux fidèles (« prestige ») : Œil de l'oracle niv. 30, Nébuleuse niv. 40, Couronne du Grand Philatéliste
> niv. 50. Dessins dans `src/composants/cosmetiques/dessins/`, catalogue dans `src/jeu/personnalisation.ts`.
> Aucun changement côté Supabase.

> **25 septembre 2026 — refonte graphique (brief `BRIEF-ceremonie.md`, maquette de Claude) : publiée.**
> Nouveau timbre partout (aspect de la maquette, avec attaque, défense et origine), cérémonie d'ouverture de paquet
> (déchirure au geste, révélation une par une, « Tout révéler », rangement animé dans l'album), nouvel accueil (comptoir,
> album en aperçu, duels, fond animé, fil d'activité de tous les joueurs). Détails et décisions : `GUIDE-refonte-ceremonie.md`.
> **`serveur/14-fil-d-activite.sql` installé par Raphaël le 25/09**, vérifié (la fonction publique `fil_d_activite`
> répond). Le fil reste caché tant qu'il est vide : il apparaît au premier événement (nouveau pseudonyme, victoire en
> joute classée, Légendaire ou Hors-série trouvée, finition holographique). La dernière migration est désormais la 14.

> **25 septembre 2026 — faire connaître le jeu.** Raphaël a demandé comment promouvoir le site (déjà public sur
> philamots.fr) et a choisi quatre chantiers :
> 1. **Vignette de partage et Google — publiés.** Image 1200 × 630 avec trois timbres quand on partage le lien,
>    titre d'accueil descriptif, fiche du jeu pour les moteurs, `robots.txt`, `sitemap.xml`. **À faire par Raphaël :
>    Google Search Console et Bing** (`GUIDE-google.md`) ; balise de vérification de Google publiée le 25/09 dans
>    `index.html`, site validé et sitemap envoyé par Raphaël le 25/09, puis importé dans Bing : FAIT.
> 2. **Contrôle anti-robot Cloudflare Turnstile — EN LIGNE depuis le 25/09.** Le jeu envoie un jeton à l'ouverture
>    d'un compte et à l'envoi d'un code e-mail (`cleAntiRobot` réglée) ; Raphaël a activé le contrôle dans Supabase
>    avec la clé secrète et vérifié en navigation privée (`GUIDE-anti-robot.md`). En cas de souci : le décocher dans
>    Supabase, Authentication → Attack Protection.
> 3. **Adversaire de secours** (décisions de Raphaël : sans classement, proposé après 30 s) et 4. **parrainage**
>    (3 paquets chacun au premier duel terminé du filleul, 10 filleuls récompensés par mois) — **code publié,
>    script 13 installé sur Supabase le 25/09 (par
>    l'assistant, avec l'autorisation de Raphaël), vérifié, interrupteur `secoursEtParrainage` ouvert : EN LIGNE.**
>    La dernière migration est désormais la 13 (`GUIDE-secours-et-parrainage.md`).

> **Décision de Raphaël du 24 septembre 2026 — un seul pseudonyme, public dès qu’il est choisi.** La même case « Choisis ton pseudonyme » (`src/composants/ChoixDuPseudonyme.tsx`) sert sur le Profil, les Amis, les Joutes en direct et l’Équipe ; une fois choisi, il n’est plus jamais redemandé, et le Profil permet de le changer. Le choisir publie le profil de joute (ancien « Rejoindre les joutes ») ; la page Confidentialité le dit. Même jour : sur téléphone, la barre du bas passe de 7 à 5 onglets (Accueil, Album, Duel, Marché, Profil) ; le Deck et les Classements se rangent dans Duel, qui reste allumé sur leurs pages, et le salon des duels gagne un raccourci « Classements ». L’ordinateur garde ses 7 entrées.

> **Amis et duels — déployés le 24 septembre 2026 :** demandes par pseudo, échanges d’un timbre contre un timbre et défis contre le double d’un ami sans effet sur le classement. Les attaques sont automatiques ; une seule question de définition sert à parer. Migration `serveur/10-amis.sql`, fonction `combats` et client `12f50a4` publiés avec succès. Données conservées, 326 tests réussis, parcours complet vérifié avec deux comptes locaux et pages publiques contrôlées : voir [GUIDE-amis.md](GUIDE-amis.md).

> **Migration appliquée le 23 septembre 2026 :** serveur/6-offres.sql exécuté avec succès sur le projet Supabase cgubfyxyivgufslpwlld. Contrôle avant/après : 38 comptes, 254 possessions, 77 Encre, inchangés. RPC de récompense disponible aux joueurs connectés ; tirage interne inaccessible. Aucun droit payant attribué et aucun déploiement du client dans cette intervention. Cette note remplace les indications antérieures disant que la migration reste à appliquer.


## Décisions du 23 septembre 2026 — prioritaires sur le bilan ci-dessous

- **Deux offres implémentées localement, paiement fermé.** Achat unique : cosmétiques premium permanents et une Hors-série parmi toutes, doublon possible. Abonnement : paquet toutes les 8 minutes, réserve 15, +25 % XP sur duels et bonnes réponses, paquet hebdomadaire dont la dernière carte est Épique à 89 %, Légendaire à 10 %, Hors-série à 1 %. Titres par succès uniquement. Prix indicatifs : 5,99 € et 4,99 €/mois. Voir BRIEF-version-payante.md. Appliquer serveur/6-offres.sql avant publication. XP encore locale, à synchroniser avant commercialisation du bonus.
- **L’Encre sert uniquement aux enchères, quelle que soit son origine.** Achat de paquets supprimé dans le code local, les services et le script SQL. Compilation et tests à vérifier après chaque changement. Le site public et Supabase ne sont pas encore mis à jour : suivre la note du 23 septembre dans GUIDE-supabase.md.
- **Domaine :** `philamots.fr` est actif chez OVHcloud et enregistré dans GitHub Pages. Les quatre adresses A GitHub et le CNAME de `www` sont vérifiés ; l’ancienne IPv6 est retirée. La dernière capture GitHub confirme « DNS check successful » et « Enforce HTTPS » coché. **Contact :** Raphaël confirme que `contact@philamots.fr` fonctionne après les instructions de test du webmail. Voir `GUIDE-domaine-et-contact.md`. Aucun achat du `.com` n’est confirmé.
- **Joueurs simulés :** conserver temporairement les joueurs maison en les signalant discrètement mais lisiblement, puis les retirer lorsque la communauté sera suffisante. Mention « Joueur simulé » ajoutée au code local (choix d’adversaire, classement, duel), avec transmission du marqueur `maison` par le serveur. Déploiement SQL puis client restant à faire. Aucun retrait effectué, seuil de retrait à définir après les tests.
- **Vente :** aucun prestataire de paiement ni structure juridique en place ; pas de validation juridique obtenue. La vente d’Encre n’a pas de tarif fixé.
- Les rapports de simulation sont recalculés sans achats de paquets : les anciennes conclusions sur l’équilibre de l’Encre sont obsolètes. Ne pas fixer de bonus ou tarif d’Encre sur cette ancienne base.

Le bilan du 22 septembre ci-dessous décrit la version précédemment publiée.

**Suivi du raccordement :** terminé pour le domaine et la messagerie. HTTPS répond et HTTP redirige vers HTTPS,
vérifiés depuis le terminal avec accès réseau. Raphaël confirme l’accès sécurisé au jeu en navigation privée
puis normale après rechargement. La récupération de son ancienne collection reste à confirmer séparément.

*Mis à jour le 22 septembre 2026. Ce document remplace la lecture de cinq briefs : il dit ce qui marche, ce qui
attend Raphaël, et ce qui m'attend. Les détails restent dans les documents cités.*

**Le jeu en ligne : https://philamots.fr/**

---

## Ce qui marche aujourd'hui

Tout ce qui suit est en ligne, vérifié contre le vrai serveur, et jouable.

- **Les paquets et la collection.** Un paquet gratuit toutes les 10 minutes, 10 en réserve, 5 timbres par paquet,
  3 016 cartes dans l'édition dont 16 hors-série. Finitions normale, brillante, holographique. Les doublons
  deviennent de l'Encre. L'album se filtre et se cherche.
- **Les duels.** Mot contre mot, avec parade. Un deck de dix cartes, trois niveaux, cinq bonnes réponses pour
  maîtriser un mot et gagner un cachet daté sur son timbre.
- **Les joutes classées.** Contre le « double » d'un autre joueur, avec cote, ligues et classement.
- **Le serveur est propriétaire des collections.** Timbres, Encre, paquets, deck et récompenses passent par lui.
  Avancer l'heure de son téléphone ne donne plus rien.
- **Le code de secours.** Vingt signes à noter, qui rendent la collection sur un autre appareil.
- **Le marché aux enchères.** Mise de départ, prix d'achat immédiat facultatif, 12, 24 ou 48 heures, commission de
  10 %, 10 ventes en cours et 10 achats par jour pour un joueur gratuit.
- **La cote des timbres.** Sur chaque fiche, la médiane des prix des ventes des 30 derniers jours, par finition,
  relevée une fois par jour.
- **Le nom.** Le jeu s'appelle Philamots depuis le 22 septembre 2026.
- **Les trois formules payantes.** Construites et vérifiées, mais **personne ne peut payer** : aucun prestataire
  n'est branché, et plusieurs points doivent être réglés avant. Une page du jeu les présente honnêtement.

---

## Ce qui attend Raphaël

Par ordre d'importance. Rien de tout cela ne demande de savoir programmer.

1. **Recruter cinq testeurs**, et les faire jouer plusieurs jours. Le guide est prêt dans `GUIDE-testeurs.md`, leurs
   retours vont dans `RETOURS-testeurs.md`. **C'est ce qui manque le plus au projet.** Le jeu est complet ; ce qu'il
   n'a pas, ce sont de vrais joueurs.
2. **Créer son propre code de secours** (Réglages → Ton compte). Sans lui, perdre son navigateur, c'est perdre sa
   collection. Raphaël ne l'a pas encore fait.
3. **Juger les sons à l'oreille** : ceux du duel, et le carillon des paquets. Je ne les entends pas.
4. **Essayer le marché sur deux appareils** : vendre d'un côté, acheter de l'autre.
5. **Remplir les blancs des conditions de vente** (`CGV-brouillon.md`) : forme juridique, adresse, numéro
   d'immatriculation. Sans cela, rien ne peut être vendu.
6. **Relier le domaine actif et créer le contact.** Suivre `GUIDE-domaine-et-contact.md` pour GitHub Pages et
   `contact@philamots.fr`. Noter le code de secours sur l’ancienne adresse avant la bascule.
7. **Consulter un juriste** avant le premier euro encaissé. Voir `BRIEF-version-payante.md`, §4.

---

## Ce qui m'attend

- **Finaliser en parallèle des tests joueurs :** raccorder le domaine, établir le contact, signaler les joueurs
  simulés et préparer la publication des deux offres implémentées.
- **La connexion par e-mail :** le domaine existe désormais. Le service d’envoi et son raccordement à Supabase
  restent à préparer ; créer une boîte de contact n’active pas les liens de connexion du jeu.
- **Un contrôle anti-robot** avant d'ouvrir le jeu au grand public. Aujourd'hui, n'importe qui peut créer des
  comptes en série.
- **Les avis de recherche** (étape M5 du marché) et **le troc** (M6), quand il y aura assez de joueurs pour que ces
  fonctions aient un sens.
- **La variante de question « De quelle langue vient ce mot ? »**, laissée de côté parce que l'origine est imprimée
  sur le timbre que le joueur vient de voir. Deux pistes sont notées au §5.4 de `BRIEF-v2.md`.

---

## Points connus, non corrigés

Ce ne sont pas des pannes, mais des choses que je sais imparfaites.

- Soixante-trois cartes ont une définition qui nomme un proche parent du mot, ce qui rend l'épreuve trop facile.
- Quand l'attaque du joueur terrasse l'adversaire, la parade est quand même demandée.
- Un duel interrompu n'est pas repris.
- En niveau Difficile, les meilleurs joueurs gagnent encore trois fois sur quatre.
- La population de joueurs fictifs a des cotes fixes : la cote d'un vrai joueur gonfle à leur contact.
- Les 240 joueurs maison ne sont pas encore signalés dans la version publiée. La mention est préparée localement ;
  elle nécessite la mise à jour du serveur et du client.

---

## Les documents, et à quoi ils servent

| Document | Ce qu'on y trouve |
|---|---|
| `BRIEF-v2.md` | Le document de référence du jeu, et toutes les décisions numérotées |
| `BRIEF-marche.md` | Le plan du marché, étape par étape |
| `BRIEF-version-payante.md` | Ce qui est construit, ce qui manque, ce qui bloque le premier euro |
| `CGV-brouillon.md` | Le brouillon des conditions de vente, avec les blancs à remplir |
| `GUIDE-supabase.md` | La mise en route du serveur, pas à pas, pour Raphaël |
| `GUIDE-domaine-et-contact.md` | Le raccordement du domaine actif et la création du contact chez OVHcloud |
| `GUIDE-testeurs.md` | Ce qu'on demande aux cinq testeurs |
| `GUIDE-google.md` | Faire connaître le site à Google et à Bing ; la vignette de partage |
| `GUIDE-anti-robot.md` | Le contrôle anti-robot Cloudflare Turnstile, étape par étape |
| `GUIDE-secours-et-parrainage.md` | L'adversaire de secours des joutes en direct et le parrainage |
| `data/simulation-marche.md` | L'économie du marché, mesurée |
| `README.md` | Le dépôt, les commandes, l'organisation des fichiers |
