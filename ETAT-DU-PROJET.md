# Où en est Philamots

*Mis à jour le 22 septembre 2026. Ce document remplace la lecture de cinq briefs : il dit ce qui marche, ce qui
attend Raphaël, et ce qui m'attend. Les détails restent dans les documents cités.*

**Le jeu en ligne : https://raphaelferrandis-code.github.io/mots/**

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
5. **Trancher la question de l'Encre de la version payante** : rente quotidienne pour les abonnés, ou Encre achetée
   à l'unité ? Voir `BRIEF-version-payante.md`, §2.
6. **Décider s'il prend un nom de domaine.** `philamots.fr` et `philamots.com` étaient libres le 22 septembre.
   Sans domaine, pas de connexion par e-mail, et le nom peut être pris par quelqu'un d'autre.
7. **Consulter un juriste** avant le premier euro encaissé. Voir `BRIEF-version-payante.md`, §4.

---

## Ce qui m'attend

- **Rien de neuf tant que les testeurs n'ont pas joué.** C'est délibéré : ajouter des fonctions à un jeu que
  personne n'a essayé, c'est empiler des paris.
- **La connexion par e-mail**, dès qu'un nom de domaine existera. Resend l'exige ; Brevo accepterait une simple
  adresse, mais un lien de connexion parti d'une adresse Gmail finit souvent en courrier indésirable, et un joueur
  qui ne reçoit pas son lien reste dehors.
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
- Les 240 joueurs maison ne sont pas signalés comme tels. C'est un choix assumé tant que le jeu est gratuit, et un
  problème le jour où il ne l'est plus.

---

## Les documents, et à quoi ils servent

| Document | Ce qu'on y trouve |
|---|---|
| `BRIEF-v2.md` | Le document de référence du jeu, et toutes les décisions numérotées |
| `BRIEF-marche.md` | Le plan du marché, étape par étape |
| `BRIEF-version-payante.md` | Ce qui est construit, ce qui manque, ce qui bloque le premier euro |
| `GUIDE-supabase.md` | La mise en route du serveur, pas à pas, pour Raphaël |
| `GUIDE-testeurs.md` | Ce qu'on demande aux cinq testeurs |
| `data/simulation-marche.md` | L'économie du marché, mesurée |
| `README.md` | Le dépôt, les commandes, l'organisation des fichiers |
