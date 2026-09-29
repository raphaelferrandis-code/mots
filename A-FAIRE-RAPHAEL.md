# Ce qu'il reste à faire — pour Raphaël

*Mis à jour le 28 septembre 2026.* Une seule page pour reprendre le travail, sur n'importe quel ordinateur.
L'état complet du projet est dans [ETAT-DU-PROJET.md](ETAT-DU-PROJET.md).

---

## 1. Reprendre sur un autre poste de travail

### La première fois sur un nouvel ordinateur

1. Installer **Git** (https://git-scm.com/downloads) et **Node.js 22.18 ou plus récent**, version « LTS »
   (https://nodejs.org).
2. Dans un terminal, dans le dossier où ranger le projet :

   ```bash
   git clone https://github.com/raphaelferrandis-code/mots.git motsdemaitres
   ```

   ```bash
   cd motsdemaitres
   ```

   ```bash
   npm install
   ```

3. Pour voir le jeu en local : `npm run dev`, puis ouvrir http://localhost:5173.
   En local, le jeu **ne touche pas au vrai serveur** : on peut tout essayer sans risque.

### À chaque reprise (sur n'importe quel poste)

```bash
git pull
```

```bash
npm install
```

### Dire à l'assistant, en début de conversation

> Lis `A-FAIRE-RAPHAEL.md` et `ETAT-DU-PROJET.md` avant de commencer.

La mémoire de l'assistant reste sur l'ordinateur où il a travaillé : sur un autre poste, il repart de ces deux
fichiers. Ses consignes de travail sont en bas de cette page.

---

## 2. Ce qui a été fait le 25 septembre 2026

| Chantier | État |
|---|---|
| Vignette de partage (image quand on partage le lien) | En ligne |
| Site prêt pour Google (titre, description, plan du site) | En ligne ; inscrit chez Google et Bing (étape 4 faite) |
| Contrôle anti-robot Cloudflare | **En ligne** (étape 3 faite) |
| Adversaire de secours des joutes en direct | **En ligne** (étape 2 faite) |
| Parrainage (3 paquets chacun) | **En ligne** (étape 2 faite) |
| Nouveaux cadres et avatars de portrait (une récompense par niveau jusqu'au 50) | En ligne |
| Nouveau timbre, cérémonie d'ouverture des paquets, nouvel accueil | En ligne |
| Fil d'activité de l'accueil (script 14 installé par Raphaël) | En ligne ; il apparaît au premier événement |
| Lien « Amis » retiré de la barre du haut | En ligne ; les Amis restent dans Profil → **Mes amis** |
| Mot adverse caché jusqu'à la parade, pose alternée (anti-triche) | **En ligne** (étape 6 faite) |
| Refonte des écrans Duel (préparation, partie, parade, combat animé, fin) | En ligne |
| Refonte des Amis et de l'Équipe (portraits, présence, vitrines, blason) | **En ligne** (étape 7 faite) |
| Audit complet du code ([docs/AUDIT-CODE-2026-09-25.md](docs/AUDIT-CODE-2026-09-25.md)) et corrections « joueur bloqué » | En ligne |
| Parrainage durci (parrain payé à la confirmation du filleul) et comptes neufs sans échanges | **En ligne** (étape 8 faite) |
| Tenue du serveur et match à accepter (« J'y vais ! », 20 s, sans défaite) | **En ligne** (étape 9 faite) |
| Classement contre la triche (3 rencontres classées par jour, 5 parties pour être classé, cote retrouvée, gagnant récompensé d'un abandon) | **En ligne** (étape 10 faite) |
| Paiements : suppression par le joueur, mois et année de naissance, reprises après une panne de Stripe | **En ligne** (étape 11 faite), achats toujours fermés |
| Plus de « Définition manquante ou à compléter » parmi les réponses de la parade (8 cartes corrigées) | **En ligne** (étape 12 faite) |
| Points secondaires de l'audit : pas de doublon après une coupure de réseau, onglets reliés, confirmations aux couleurs du jeu, compteur d'Encre vers le marché, chargement 2,5 fois plus léger, marge de 1,5 s pour le réseau, sécurité (CSP), rangement | **En ligne** (étape 12 faite) |
| Défi contre un joueur simulé : plus moyen de viser le plus faible (le serveur n'accepte que ceux qu'il propose) | **En ligne** (étape 13 faite) |
| Finitions, chantier 1 « Dire vrai partout » (26 septembre) : « Protège ta collection » au lieu du faux rappel d'export, « Supprimer mon compte » dit enfin ce qu'il fait, Mon compte réunit connexion, code de secours et suppression, erreurs en français, plus de fausse annonce de succès, Confidentialité exacte, « Album » et « carnet » partout, définitions sans codes de couleur | **En ligne** (étape 18 faite) |
| Finitions, fin de l'étape 1 (26 septembre) : les premiers pas (phrase d'accueil, carnet composé tout seul, premier duel en Facile, bouton visible sur téléphone), logo tout de suite au démarrage, fil d'activité en pause, formule « Écrin » | **En ligne** |

---

## 3. Les étapes, dans l'ordre

### Étape 2 — Installer le script 13 (parrainage et adversaire de secours) — FAIT le 25 septembre

Détails : [docs/GUIDE-secours-et-parrainage.md](docs/GUIDE-secours-et-parrainage.md).

- [x] Script `serveur/13-secours-et-parrainage.sql` collé dans Supabase par l'assistant, avec l'autorisation de
      Raphaël.
- [x] Vérifié avec un joueur d'essai, créé puis supprimé.
- [x] `secoursEtParrainage: true` dans `src/config/serveur.ts`, jeu publié.

### Étape 3 — Allumer le contrôle anti-robot — FAIT le 25 septembre

Détails : [docs/GUIDE-anti-robot.md](docs/GUIDE-anti-robot.md).

- [x] Créer un compte gratuit chez Cloudflare (https://dash.cloudflare.com/sign-up), puis **Turnstile** →
      **Add widget** : nom `Philamots`, domaines `philamots.fr` et `www.philamots.fr`, mode **Managed**.
- [x] Après **Create**, Cloudflare affiche deux clés. Envoyer à l'assistant la **Site Key** (publique, commence
      souvent par `0x4AAAA…`). **Ne jamais lui envoyer la Secret Key.** Pour la retrouver plus tard : Cloudflare →
      **Turnstile** → widget `Philamots` → **Settings**.
- [x] L'assistant l'écrit dans `src/config/serveur.ts` (`cleAntiRobot`) et publie. Fait le 25 septembre.
- [x] **Seulement ensuite** : Supabase → Authentication → Attack Protection → **Enable Captcha protection**,
      fournisseur **Turnstile by Cloudflare**, coller la **Secret Key**, **Save**.
- [x] Ouvrir philamots.fr en navigation privée : le jeu doit s'ouvrir avec 3 paquets. Vérifié par Raphaël.

### Étape 4 — Se faire connaître de Google et de Bing — FAIT le 25 septembre

Détails : [docs/GUIDE-google.md](docs/GUIDE-google.md).

- [x] https://search.google.com/search-console → **Ajouter une propriété** → **Préfixe de l'URL** →
      `https://philamots.fr/` → méthode **Balise HTML** : envoyer la ligne `<meta name="google-site-verification" …>`
      à l'assistant (elle n'est pas secrète). Balise publiée dans `index.html` le 25 septembre.
- [x] Une fois publiée par l'assistant : **Valider**, puis **Sitemaps** → `sitemap.xml` → **Envoyer**, puis
      **Inspecter l'URL** `https://philamots.fr/` → **Demander une indexation**.
- [x] https://www.bing.com/webmasters → **Se connecter** (en haut à droite, avec le compte Google de la Search
      Console) → sur l'écran « Ajouter votre site », bloc de gauche **Importer depuis GSC** → **Importer** →
      autoriser l'accès → cocher `philamots.fr` → **Importer**.

### Étape 5 — Essayer soi-même ce que personne n'a encore essayé

- [ ] Créer son compte avec **Google** (page Mon compte), puis avec **un code reçu par e-mail** sur un autre
      navigateur. Ces deux parcours n'ont jamais été faits avec un vrai compte.
- [ ] Partager `philamots.fr` dans WhatsApp (à soi-même) : l'image doit apparaître. WhatsApp peut garder l'ancien
      aperçu quelques heures.
- [ ] Envoyer son lien d'invitation (Profil → **Mes amis**) à un proche, et vérifier qu'il reçoit 3 paquets après
      son premier duel. Après l'étape 8, le parrain ne reçoit les siens que lorsque le proche a relié un compte Google
      ou e-mail **et** rejoué un autre jour.
- [ ] Créer son **code de secours** (Profil → Ton compte), si ce n'est pas déjà fait.
- [x] **Mode avion** : le jeu s'ouvre et dit « Tu es hors connexion » — essayé par Raphaël le 28 septembre, « nickel ».
- [ ] **Installer Philamots sur son téléphone** : menu du joueur (ton avatar) → « Installer Philamots ». Dans Chrome,
      la fenêtre d'installation s'ouvre ; dans **Samsung Internet**, le jeu propose de passer par Chrome (Samsung
      Internet fabrique une application que Google bloque : « Appli non sécurisée bloquée », vu par Raphaël le
      28 septembre — ne pas choisir « Installer quand même ») ; sur iPhone, il explique le geste. L'icône doit être le
      « p » du logo sur fond bleu nuit. Dans Chrome, retrouver sa collection par son compte ou son code de secours.
- [ ] **Une joute en direct avec un proche**, chacun sur son appareil (Duel → Joutes classées → Chercher un
      adversaire) : depuis le 28 septembre, la partie ressemble au duel (face-à-face, parade, carte de fin avec la
      cote). En pleine partie, essayer le bouton Retour : le jeu demande s'il faut vraiment quitter.

### Étape 6 — Redéployer les deux fonctions du serveur (mot adverse caché) — FAIT le 25 septembre

Pourquoi : jusqu'ici, le serveur envoyait au navigateur le mot adverse **et sa définition** dès le début de la
manche ; un joueur pouvait les lire. Désormais, avant la parade, on ne voit que la nature, l'attaque et la défense.
Détails : [docs/GUIDE-combats-serveur.md](docs/GUIDE-combats-serveur.md) et [docs/GUIDE-joutes-direct.md](docs/GUIDE-joutes-direct.md).
**Aucun script SQL à coller.**

- [x] **D'abord le jeu** : publié le 25 septembre (mise en ligne en vert). Dans cet ordre, rien ne casse : le
      nouveau jeu sait lire l'ancien serveur, l'inverse non.
- [x] Supabase → **Edge Functions** → `combats` → remplacer tout le code par le contenu de
      `serveur/deploiement-combats/combats.ts.txt` → **Deploy**.
      (Ou, avec la CLI : `supabase functions deploy combats --no-verify-jwt`.)
- [x] Supabase → **Edge Functions** → `joutes-direct` → remplacer tout le code par le contenu de
      `serveur/deploiement-direct/joutes-direct.ts.txt` → **Deploy**.
      (Ou : `supabase functions deploy joutes-direct --no-verify-jwt`.)
- [ ] Vérifier sur philamots.fr, avec son compte : duel d'entraînement en **Normal** → à la manche 1, « À toi de poser
      le premier » ; à la manche 2, le timbre de l'ordinateur arrive face cachée et ne se retourne qu'à la parade.
      Les duels déjà commencés se terminent normalement. Un joueur qui avait le jeu ouvert pendant le
      redéploiement doit recharger la page.

### Étape 7 — Installer le script 15 (portraits et présence des amis) — FAIT le 25 septembre

Détails : [docs/GUIDE-portraits-et-presence.md](docs/GUIDE-portraits-et-presence.md).

- [x] Script `serveur/15-portraits-et-presence.sql` en place dans Supabase, contrôlé par l'assistant en lecture seule
      (fonctions à jour, droits corrects, premier signal de présence reçu).
- [ ] Vérifier sur philamots.fr : Profil → **Mes amis** → la fiche d'un ami montre son portrait, son niveau, « En
      ligne » ou « Passage il y a… » et ses plus beaux timbres.

### Étape 8 — Installer le script 16 (parrainage confirmé et comptes neufs) — FAIT le 25 septembre

Pourquoi : l'audit du 25 septembre a montré qu'on pouvait créer des comptes jetables, se parrainer soi-même, puis
faire remonter leurs paquets vers son vrai compte par les échanges et le marché. Tes décisions du 25 septembre :
- le filleul reçoit toujours ses **3 paquets dès son premier duel** ;
- le parrain reçoit les siens quand le filleul a **relié un compte Google ou e-mail** et **terminé un duel un autre
  jour**, dans les 14 jours après son arrivée ; toujours **10 filleuls récompensés par mois** au plus ;
- pendant ses **3 premiers jours**, un compte ne peut **ni échanger, ni enchérir, ni vendre** ;
- les parrainages déjà validés restent acquis.

Détails : [docs/GUIDE-secours-et-parrainage.md](docs/GUIDE-secours-et-parrainage.md). **Aucune fonction serveur à redéployer.**
Le jeu est déjà publié et s'adapte tout seul : tant que le script n'est pas collé, rien ne change pour les joueurs.

- [x] Script `serveur/16-parrainage-confirme.sql` collé dans Supabase par Raphaël.
- [x] Vérifié par l'assistant en lecture seule dans l'éditeur SQL (voir le guide) : tout est en place. Pas de joueur
      d'essai : l'anti-robot empêche désormais d'en créer par programme, et c'est voulu.
- À savoir : presque tous les comptes actuels ont moins de 3 jours (le site est tout neuf). Leurs échanges et leur
  marché s'ouvrent d'eux-mêmes entre le 26 septembre et le **28 septembre à 14 h 45** au plus tard. Personne n'avait
  encore utilisé ni le marché ni les échanges : cela ne gêne personne.

### Étape 9 — Redéployer la fonction joutes-direct, puis coller le script 17 (tenue du serveur et match à accepter) — FAIT le 25 septembre

Pourquoi : l'écran des joutes interrogeait le serveur toutes les 2,5 secondes, et tous les joueurs attendaient les uns
après les autres le même verrou. Tes décisions du 25 septembre : un match trouvé s'accepte avec **« J'y vais ! » en
20 secondes**, ne pas accepter **ne coûte rien**, et un onglet caché **reste dans la file** avec une alerte. Détails :
[docs/GUIDE-joutes-direct.md](docs/GUIDE-joutes-direct.md). Le jeu est déjà publié et s'adapte tout seul.

- [x] **D'abord la fonction** : Supabase → **Edge Functions** → `joutes-direct` → remplacer tout le code par le contenu de
      `serveur/deploiement-direct/joutes-direct.ts.txt` (sur GitHub : ouvrir le fichier → **Copy raw file**) → **Deploy**.
      La fonction `combats` ne change pas.
- [x] **Puis le script** : https://github.com/raphaelferrandis-code/mots/blob/main/serveur/17-tenue-du-serveur.sql →
      **Copy raw file** → Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller →
      **Run**. Réponse attendue : **Success. No rows returned** (confirmer l'avertissement « Potential issue detected »).
- [x] Vérifié par l'assistant en lecture seule : fonction déployée identique au fichier du dépôt (même empreinte), script 17
      en place (26 fonctions, verrous, droits, colonnes, déclencheurs). Voir [docs/GUIDE-joutes-direct.md](docs/GUIDE-joutes-direct.md).
- [ ] Essayer avec quelqu'un : chacun lance « Chercher une partie » en Solo ; « Adversaire trouvé ! » apparaît ; la partie
      ne commence que quand les deux ont pressé « J'y vais ! ».

### Étape 10 — Coller le script 18 (le classement contre la triche) — FAIT le 25 septembre

Tes décisions du 25 septembre : contre le même adversaire, **3 parties classées par jour** ; le gagnant d'un abandon
**reçoit sa récompense** ; un profil recréé **retrouve sa cote** ; on entre au classement après **5 parties**.
Détails : [docs/GUIDE-joutes-direct.md](docs/GUIDE-joutes-direct.md). **Aucune fonction serveur à redéployer** ; le jeu est déjà
publié et s'adapte tout seul.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/18-classement.sql → **Copy raw file** → Supabase →
      **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse attendue :
      **Success. No rows returned** (confirmer l'avertissement « Potential issue detected »).
- [x] Vérifié par l'assistant en lecture seule : règles, déclencheurs, droits et registre des rencontres en place.

### Étape 11 — Coller le script 19, PUIS redéployer les quatre fonctions de paiement — FAIT le 25 septembre

Tes décisions du 25 septembre : un joueur qui a payé **supprime lui-même son compte** (après avoir résilié un
abonnement qui se renouvelle) ; l'âge se déclare par **le mois et l'année de naissance**, une fois pour toutes. Les
achats restent **fermés** : rien ne change pour les joueurs tant que tu ne demandes pas leur ouverture.
Détails : [docs/GUIDE-paiements-production.md](docs/GUIDE-paiements-production.md). **L'ordre compte** : le script d'abord.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/19-paiements.sql → **Copy raw file** → Supabase →
      **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run** (confirmer
      l'avertissement « Potential issue detected » s'il apparaît).
- [x] **Ensuite**, Supabase → **Edge Functions**, pour chacune des quatre fonctions ci-dessous : l'ouvrir → onglet
      **Code** → remplacer tout le code par le contenu du fichier (sur GitHub : ouvrir le fichier → **Copy raw file**)
      → **Deploy** :
      - `paiement` ← `serveur/deploiement-paiements/paiement.ts.txt`
      - `paiement-production` ← `serveur/deploiement-paiements/paiement-production.ts.txt`
      - `stripe-webhook` ← `serveur/deploiement-paiements/stripe-webhook.ts.txt`
      - `stripe-webhook-production` ← `serveur/deploiement-paiements/stripe-webhook-production.ts.txt`
- [x] Vérifié par l'assistant en lecture seule : script en place ; les quatre fonctions déployées sont identiques aux
      fichiers du dépôt (même empreinte, au saut de ligne final près) ; « Verify JWT » désactivé sur les quatre ; la
      production répond « achats fermés ».
- [ ] Un compte (sans doute un compte d'essai) avait déclaré son année de naissance seule : il devra la compléter par
      le mois, avec la même année, s'il veut payer.
- [ ] Six requêtes « Untitled query » de vérification (lecture seule) sont dans l'éditeur SQL, rubrique PRIVATE : elles
      peuvent être supprimées.

### Étape 12 — Coller le script 20, puis redéployer les deux fonctions du combat (points secondaires, définitions vides) — FAIT le 26 septembre

Pourquoi, le script 20 (les points secondaires de l'audit) : un paquet, un cadeau ou une mise en vente redemandés
après une coupure de réseau ne sont plus servis deux fois ; le fil d'activité ne montre plus que les trouvailles des
paquets ; un code de secours est unique et n'utilise que les signes que le jeu tire ; une vente conclue reste visible
de l'acheteur même si le vendeur efface son compte ; la cote 2v2 d'une équipe dissoute s'efface. Le jeu en ligne
s'en passe en attendant (il refait l'appel sans l'identifiant de demande) : rien ne casse avant le collage. Vérifié
en lecture seule par l'assistant : la base de production est prête (aucun code de secours en double).

Pourquoi, les deux fonctions : en duel, la parade proposait parfois « Définition manquante ou à compléter. (Ajouter) »
comme réponse. Les 8 cartes concernées sont corrigées dans le jeu, mais les duels et les joutes sont joués sur le
serveur, qui garde sa propre copie des définitions : tant que les deux fonctions ne sont pas redéployées, ce texte peut
encore sortir. Aucune carte ne change (ni rareté, ni attaque, ni défense). Ce redéploiement emporte aussi la marge du
réseau (une réponse partie à temps compte encore si elle arrive jusqu'à 1,5 s en retard) et, en direct, l'attaque
annoncée d'un mot face cachée avec son bonus d'enchaînement.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/20-points-secondaires.sql → **Copy raw file** →
      Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse
      attendue : **Success. No rows returned** (confirmer l'avertissement « Potential issue detected » s'il apparaît).
- [x] Supabase → **Edge Functions** → `combats` → onglet **Code** → remplacer tout le code par le contenu de
      `serveur/deploiement-combats/combats.ts.txt` (sur GitHub : ouvrir le fichier → **Copy raw file**) → **Deploy**.
- [x] Supabase → **Edge Functions** → `joutes-direct` → remplacer tout le code par le contenu de
      `serveur/deploiement-direct/joutes-direct.ts.txt` → **Deploy**.
- [x] Vérifié par l'assistant en lecture seule le 26 septembre : les 106 fonctions de la base sont exactement celles du
      dépôt (l'éditeur de Supabase ajoute des fins de ligne Windows au collage, sans effet) ; table des demandes
      protégée, fonctions ouvertes aux joueurs et aides internes fermées, index unique du code de secours, vente gardée
      sans son vendeur, déclencheurs en place ; le serveur reconnaît les nouvelles fonctions ; `combats` et
      `joutes-direct` déployées identiques aux fichiers, octet pour octet ; « Verify JWT » désactivé sur les deux.
- [ ] Trois requêtes « Untitled query » de vérification (lecture seule) sont dans l'éditeur SQL, rubrique PRIVATE :
      elles peuvent être supprimées.

### Étape 13 — Coller le script 21 (le défi contre un joueur simulé) — FAIT le 26 septembre

Ta décision du 26 septembre : **le serveur vérifie**. Un jeu trafiqué pouvait choisir, comme adversaire de secours, le
joueur simulé le plus faible, pour des victoires faciles. Désormais le serveur n'accepte que l'un de ceux que le jeu
propose au joueur (les plus proches de sa cote, compte tenu de ses filtres). **Rien ne change à l'écran**, pas
d'attente imposée, les défis entre amis restent tels quels. **Aucune fonction à redéployer**, le jeu ne change pas.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/21-adversaire-de-secours.sql → **Copy raw file** →
      Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse
      attendue : **Success. No rows returned** (confirmer l'avertissement « Potential issue detected » s'il apparaît).
- [x] Vérifié par l'assistant en lecture seule le 26 septembre : les 109 fonctions de la base identiques au dépôt ;
      aides internes fermées aux joueurs et aux visiteurs ; sur les vrais joueurs simulés (240, cotes de 750 à 1 652),
      un joueur à 1 000 ne peut défier que ceux de 848 à 1 160 — le plus faible (750) et le plus fort (1 652) sont
      refusés.
- [ ] Deux requêtes « Untitled query » de vérification (lecture seule) sont dans l'éditeur SQL, rubrique PRIVATE :
      elles peuvent être supprimées.

### Étape 14 — Coller le script 22 (ton apparence suit ton compte) — FAIT le 26 septembre

Ta décision du 26 septembre : l'avatar, le cadre, le titre, le dos, la couleur et le paquet choisis suivent le compte
d'un appareil à l'autre. **Aucune fonction à redéployer.** Le jeu est déjà publié et attend ce script.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/22-apparence.sql → **Copy raw file** →
      Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse
      attendue : **Success. No rows returned**.
- [x] Ensuite, ouvrir le jeu **d'abord sur l'appareil qui a l'apparence à garder** : ses choix partent au serveur, puis
      les autres appareils les reprennent. Un choix fait ensuite, n'importe où, vaut partout.
- [x] Vérifié par l'assistant le 26 septembre, de l'extérieur (sans ouvrir le tableau de bord) : la fonction
      `changer_d_apparence` existe avec son réglage `p_apparence` et refuse les visiteurs sans compte ; le script
      s'installe d'un bloc, donc la colonne `apparence` et la nouvelle lecture du compte sont en place aussi.
- [x] Essayé par Raphaël le 26 septembre : l'apparence choisie sur un appareil apparaît sur un autre.

### Étape 15 — Coller le script 23 (six timbres par paquet)

Ta décision du 26 septembre : six timbres par paquet (le sixième a les chances du cinquième), et une Légendaire
garantie au plus tard au 20e paquet sans Légendaire. La Hors-série, la garantie et le paquet hebdomadaire ne touchent
que le sixième timbre. **Aucune fonction à redéployer** ; le jeu affiche les timbres que le serveur rend, cinq ou six.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/23-six-timbres.sql → **Copy raw file** →
      Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse
      attendue : **Success. No rows returned**.
- [x] Ouvrir un paquet : il contient six timbres.
- [x] Vérifié en lecture seule le 26 septembre : `tirer_les_cartes` et `importer_ma_collection` identiques au dépôt
      (empreintes égales, aux fins de ligne Windows près, laissées par le collage).
- [ ] Deux requêtes « Untitled query » de vérification (lecture seule) sont dans l'éditeur SQL : elles peuvent être
      supprimées.

### Étape 16 — Coller le script 24 (les paquets d'exception) — FAIT le 26 septembre

Ta décision du 26 septembre : 1 paquet ordinaire sur 10 000 ne contient que des Légendaires holographiques, 1 sur
30 000 que des Hors-série. Jamais parmi les paquets de départ ni dans le paquet hebdomadaire. **Aucune fonction à
redéployer** ; le jeu reconnaît ces paquets à leur contenu et peut être publié avant ou après le script.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/24-paquets-d-exception.sql → **Copy raw file** →
      Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse
      attendue : **Success. No rows returned**.
- [x] Vérifié en lecture seule le 26 septembre : `tirer_les_cartes` identique au dépôt (empreinte égale, aux fins de
      ligne Windows près) et paquets d'exception présents.

### Étape 17 — Coller le script 25 (la boutique de l'Encre) — FAIT le 26 septembre

Ta décision du 26 septembre : l'Encre gagnée en jouant achète des cosmétiques qu'on ne trouve qu'à la boutique
(15 pièces, de 2 000 à 12 000 Encre) et un Hors-série au choix parmi ceux qui manquent à l'album (100 000 Encre).
L'Encre achetée reste réservée au marché. **Aucune fonction à redéployer.** Le jeu est publié : tant que le script
n'est pas collé, un achat répond « La boutique ouvre très bientôt ».

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/25-boutique.sql → **Copy raw file** →
      Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse
      attendue : **Success. No rows returned**.
- [x] Vérifié par l'assistant le 26 septembre, de l'extérieur et sans compte : les deux fonctions `acheter_a_la_boutique`
      et `commander_un_hors_serie` existent et refusent un visiteur sans compte ; la table `achats_boutique` est fermée ;
      les paiements restent fermés.

### Étape 18 — Redéployer les deux fonctions du combat (définitions sans codes de couleur) — FAIT le 26 septembre

Pourquoi : douze définitions montraient un code de couleur (« … tirant sur le roux. #A76726 ») ou un renvoi du
Wiktionnaire (« Voir la note sur les accords… »), en duel, sur les pages des mots et dans deux devinettes. Le jeu, les
pages et les devinettes sont corrigés et publiés. Mais les duels et les joutes sont joués sur le serveur, qui garde sa
propre copie des définitions : tant que les deux fonctions ne sont pas redéployées, une parade peut encore proposer
une définition avec son code. **Aucune carte ne change** (ni rareté, ni attaque, ni défense). Le redéploiement emporte
aussi trois messages rares, qui disent désormais « carnet » et « timbre ».

- [x] Supabase → **Edge Functions** → `combats` → onglet **Code** → remplacer tout le code par le contenu de
      `serveur/deploiement-combats/combats.ts.txt` (sur GitHub : ouvrir le fichier → **Copy raw file**) → **Deploy**.
- [x] Supabase → **Edge Functions** → `joutes-direct` → remplacer tout le code par le contenu de
      `serveur/deploiement-direct/joutes-direct.ts.txt` → **Deploy**.
- [x] Fait par Raphaël le 26 septembre. Pas revérifié octet par octet : le navigateur intégré de l'assistant n'était plus
      connecté à Supabase. À savoir : les paquets ont été refaits le soir même pour le nom « Écrin » (commit 489e5f9) ;
      un déploiement copié avant cette heure-là ne diffère du dépôt que par ce nom, qui ne sert pas aux duels.

### Étape 19 — Coller le script 26 (le marché animé) — FAIT le 28 septembre

Ta décision du 28 septembre (dosage « équilibré ») : tant que le marché a moins de 30 ventes de vrais joueurs, les
joueurs simulés y tiennent une douzaine de ventes (des timbres neufs, Communes à Épiques, 1,5 fois le prix minimum), et
rachètent une fois par jour et par vendeur une vente restée sans mise (jusqu'à 2 fois le prix minimum). Ils ne
surenchérissent jamais sur un vrai joueur, et leurs ventes ne comptent pas dans la cote. La mention « Joueur simulé »
est sur leur fiche (en touchant leur nom), et « Comment ça marche ? » le dit. Le même script donne aussi au jeu le jour
où le marché s'ouvre pour un compte neuf. **Aucune fonction à redéployer.** Le jeu est déjà publié : tant que le script
n'est pas collé, le marché reste comme avant.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/26-marche-anime.sql → **Copy raw file** →
      Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse
      attendue : **Success. No rows returned**. Collé par Raphaël le 28 septembre.
- [x] Vérifié par l'assistant le 28 septembre, de l'extérieur et sans compte : `animer_le_marche` et `pseudonyme_maison`
      existent et refusent un visiteur sans compte ; les colonnes `simulee`, `vendeur_maison` et `acheteur_maison` des
      enchères existent. Au premier passage d'un joueur au marché, une douzaine de ventes des joueurs simulés apparaissent.
- Pour couper l'animation un jour : le demander à l'assistant (un interrupteur, puis ce même script à recoller).

### Étape 20 — Réserver l'adresse ludophile.fr (le nom de ton futur studio)

Ta décision du 28 septembre : Philamots sera vendu sous le nom **« Studio Ludophile »** (« Philamots, un jeu édité par
Studio Ludophile »), et tes prochains jeux aussi. Puis, le même jour : **d'abord lancer le jeu gratuit et voir s'il
trouve son public** ; le payant viendra seulement si ça marche. D'ici là, rien à déclarer, et les achats restent fermés.

- [x] **`ludophile.fr` réservé chez OVHcloud** le 28 septembre (vérifié au registre : enregistré jusqu'au
      28 septembre 2027). Vérifier dans OVHcloud que le **renouvellement automatique** est activé. `ludophile.com` est
      pris depuis 2005.
- **En pause jusqu'à ce que le jeu trouve son public.** Le chemin est prêt, il suffira de le redemander à
  l'assistant : un e-mail au comptable (l'assistant le rédige), puis la déclaration en ligne, écran par écran, avec
  « Studio Ludophile » comme nom commercial et une activité décrite largement (par exemple « conception et édition de
  jeux en ligne »), pour que tes prochains jeux soient couverts eux aussi.
- À savoir : le 28 septembre, aucune marque « Ludophile » n'était déposée à l'INPI et aucune entreprise ne portait ce
  nom (seulement une association et des clubs de joueurs). Comme c'est un mot courant chez les joueurs, il sera
  peut-être difficile à protéger comme marque : la marque à protéger en premier est **Philamots**.

### Étape 21 — Les pages légales : les faire relire, et deux accords à vérifier

Tes décisions du 28 septembre : l'éditeur est « Raphaël Ferrandis » avec `contact@philamots.fr` ; un compte invité
est supprimé après 12 mois sans visite, un compte relié à Google ou à une adresse e-mail après 3 ans ; on signale un
joueur ou une équipe avec un lien « Signaler » dans le jeu. Les trois pages sont en ligne, lisibles sans ouvrir le
jeu : https://philamots.fr/mentions-legales/, https://philamots.fr/confidentialite/ et https://philamots.fr/conditions/.

- [ ] Les faire relire par un juriste, en même temps que le brouillon des CGV ([docs/CGV-brouillon.md](docs/CGV-brouillon.md)).
      Lui poser en particulier ces questions : faut-il un numéro de téléphone pour chaque hébergeur (GitHub et
      Supabase n'en publient pas sur leurs pages officielles) ? les bases légales choisies (le service que tu utilises,
      l'intérêt légitime) sont-elles les bonnes ? la phrase « Moins de 15 ans : demande d'abord à un parent » suffit-elle ?
- [ ] Supabase : vérifier dans le tableau de bord (réglages de l'organisation, documents juridiques) que l'accord de
      traitement des données (« DPA ») est bien accepté, et le signer s'il faut le demander.
- [ ] Cloudflare (le contrôle anti-robot) : vérifier que son accord de traitement des données s'applique à ton compte
      gratuit (il fait en principe partie de ses conditions d'utilisation).
- La suppression automatique des comptes inactifs vient avec le script 27 (étape 22).
- Avant d'ouvrir les achats : ajouter l'adresse et le numéro d'entreprise du vendeur aux mentions légales (l'assistant
  le fera quand la forme juridique sera choisie, étape 20).

### Étape 22 — Coller le script 27 (la suppression des comptes inactifs) — FAIT le 28 septembre

Ce que tes pages légales promettent : un compte invité sans visite depuis 12 mois est supprimé, un compte relié à Google
ou à une adresse e-mail après 3 ans. Le serveur note désormais le dernier passage de chaque compte (à chaque ouverture
du jeu), et chaque nuit à 3 h 23 (heure universelle) il supprime les comptes trop anciens, comme le ferait « Supprimer
mon compte » : au marché, les mises des autres joueurs leur sont rendues. Un compte qui a payé n'est jamais supprimé
d'office. Personne ne peut être supprimé avant septembre 2027 : pour les comptes existants, le décompte part du jour du
collage. **Aucune fonction à redéployer**, et le jeu n'a pas besoin d'être republié.

- [x] https://github.com/raphaelferrandis-code/mots/blob/main/serveur/27-comptes-inactifs.sql → **Copy raw file** →
      Supabase → **SQL Editor** → **New query** → menu à gauche de Save sur **Database** → coller → **Run**. Réponse
      attendue : **Success. No rows returned**. Collé par Raphaël le 28 septembre.
- [x] Vérifié par l'assistant le 28 septembre, de l'extérieur et sans compte : `purger_les_comptes_inactifs` existe et
      refuse un visiteur sans compte ; la colonne `dernier_passage` des comptes existe. Le script s'installe d'un seul
      bloc : s'il n'avait pas pu planifier la tâche de la nuit, rien de tout cela n'existerait.
- [ ] Pour voir la tâche de la nuit de tes yeux : dans une nouvelle requête, coller
      `select jobname, schedule from cron.job;` → **Run**. Réponse attendue : une ligne
      **philamots-comptes-inactifs**, **23 3 \* \* \***.

### Étape 23 — Faire reconnaître Philamots par Google, et protéger le nom

**A. Le nom affiché par Google à la connexion.** L'écran de Google disait « … pour continuer vers
`cgubfyxyivgufslpwlld.supabase.co` » : Google n'affiche le nom d'une application qu'après la « vérification de la
marque », qui exige de posséder **chaque** domaine utilisé par la connexion, et le retour passait par celui de
Supabase. Ta décision du 28 septembre : **le bouton de Google dans le jeu**. C'est fait et publié : la connexion Google
se fait désormais sur philamots.fr même (rien de Google n'est chargé avant que le joueur touche « Continuer avec
Google »). Il te reste, dans l'ordre :

- [x] **L'essai (5 minutes).** Sur ton téléphone, ouvrir philamots.fr dans une **fenêtre de navigation privée** (pour
      être invité) → **Mon compte** → **Se connecter** → **Continuer avec Google** → toucher le bouton de Google qui
      apparaît. La fenêtre de Google doit maintenant parler de **philamots.fr**. Choisir ton compte : tu es connecté.
      **Fait par Raphaël le 28 septembre : la fenêtre de Google dit bien philamots.fr.**
- [x] **Ensuite seulement**, Google Cloud (projet **philamots**) → **Google Auth Platform** (**fait par Raphaël le
      28 septembre, vérification de la marque demandée** ; vérifié de l'extérieur : Google refuse désormais l'ancienne
      adresse de retour par Supabase, `redirect_uri_mismatch`) :
      - **Clients** → « Philamots Web » → **URI de redirection autorisés** : retirer
        `https://cgubfyxyivgufslpwlld.supabase.co/auth/v1/callback` → **Enregistrer** (les origines JavaScript gardent
        `https://philamots.fr`) ;
      - **Branding** → **Domaines autorisés** : retirer `supabase.co`, garder `philamots.fr` ; page de confidentialité
        **https://philamots.fr/confidentialite/** (l'ancienne adresse, avec `#/`, ouvre le jeu) ; conditions
        **https://philamots.fr/conditions/** ; logo : `public/identite/icone-site-512.png` → **Enregistrer** ;
      - **Centre de validation** (Verification Center) → demander la **vérification de la marque**. Google vérifie
        que tu possèdes philamots.fr avec la Search Console, où le site est déjà vérifié (même compte Google). Quelques
        minutes, parfois deux ou trois jours ouvrés. Après : l'écran de Google dit « Philamots », avec le logo.
      - À savoir : une fois l'adresse de retour de Supabase retirée, l'ancienne connexion Google (le secours du code,
        `SERVEUR.clientGoogle` vide) ne marche plus ; en cas de panne du bouton de Google, reste la connexion par e-mail.
        Si Google répond que philamots.fr n'est pas vérifié, le dire à l'assistant (vérification par le DNS chez OVH).
- [x] **Refaire l'essai en navigation privée** (comme plus haut), pour s'assurer que la connexion Google marche
      toujours après ces réglages. **Fait par Raphaël le 28 septembre : la connexion Google marche toujours.**
- [x] **Google a validé la marque le 29 septembre** (e-mail « We've approved your OAuth App Verification request for
      project 268999826503 (Project ID: philamots) for brand verification »).
- [ ] **Refaire l'essai une dernière fois** en navigation privée : la fenêtre de Google doit dire « Philamots », avec
      le logo.
- À savoir : toute modification de l'écran **Branding** (nom, logo, liens, domaines autorisés) demandera à Google une
  nouvelle vérification ; ne rien y changer sans raison.
- Au choix : l'adresse d'assistance montrée par Google est ton adresse Google personnelle. Pour montrer
  `contact@philamots.fr` à la place, il faut un compte Google créé avec cette adresse et ajouté comme propriétaire du
  projet (l'assistant peut te guider).
- [x] Search Console (https://search.google.com/search-console, propriété `https://philamots.fr/`) → coller
      `https://philamots.fr/` dans la barre du haut (« Inspecter n'importe quelle URL ») → Entrée → **Tester l'URL en
      ligne** (en haut à droite) → attendre une minute → **Afficher la page testée** → onglet **Capture d'écran** :
      vérifier que Google voit bien l'accueil du jeu (et pas « Chargement du jeu… » ni un message d'erreur du contrôle
      anti-robot). **Fait par Raphaël le 29 septembre : « Google a accès à cette URL », « La page peut être indexée » ;
      la capture montre l'accueil (« Trois paquets t'attendent », le bouton « Ouvrir un paquet »).**

**B. Déposer le nom Philamots à l'INPI (à faire toi-même, environ 30 minutes, 230 € pour deux classes).**

- [ ] **Vérifier que le nom est libre.** Sur https://data.inpi.fr, chercher « Philamots » puis des noms proches
      (« Philamot », « Filamots », « Philamo ») parmi les marques ; faire de même sur https://www.tmdn.org/tmview, qui
      couvre les marques européennes. Une marque proche déjà déposée pour des jeux ou des logiciels serait un obstacle :
      dans ce cas, en parler avant de déposer.
- [ ] **Choisir les classes** (chaque produit ou service relève d'une classe) : **41** (services de jeux proposés en
      ligne, divertissement) et **9** (logiciels de jeux, applications téléchargeables). Ajouter la **28** (jeux, cartes
      à jouer) seulement si des objets Philamots sont prévus un jour. Prix : 190 € pour une classe, 40 € par classe en
      plus (230 € pour deux, 270 € pour trois).
- [ ] **Déposer en ligne** sur https://procedures.inpi.fr : créer ton compte, choisir « Marques », puis « Déposer une
      marque » ; marque **verbale** « PHILAMOTS » ; les produits et services choisis dans la liste proposée par l'INPI
      (moins de risques de refus qu'un texte libre) ; payer en ligne.
- À savoir : depuis le 2 juillet 2026, l'INPI ne publie plus l'adresse d'un déposant particulier, seulement ses nom,
  prénoms, commune et pays. La demande paraît au Bulletin officiel (le BOPI) environ six semaines après le dépôt ;
  les tiers ont ensuite deux mois pour s'y opposer ; sans incident, la marque est enregistrée en quelques mois, pour
  dix ans renouvelables. Elle protège en France ; une marque de l'Union européenne se dépose à part, auprès de l'EUIPO.
- Au nom de qui : tu peux déposer à ton nom dès maintenant, puis la transférer à ta future structure (une inscription
  au registre de l'INPI) ; à voir avec ton comptable.
- [ ] Vérifier aussi à qui appartient `philamots.com`.

### Chaque semaine — Surveiller la consommation de Supabase (offre gratuite)

Ta décision du 25 septembre : rester sur l'offre gratuite, et passer à **Pro (25 $/mois)** avant une grosse campagne de
promotion ou dès qu'une limite atteint **70 %**.

- [ ] Ouvrir https://supabase.com/dashboard/org/cdvuvrtqkwkvdciffweo/usage et regarder surtout **Edge Function
      Invocations** (limite 500 000 par mois), **Realtime Concurrent Peak Connections** (200), **Database Size** (0,5 Go)
      et **Egress** (5 Go). Le 25 septembre : 204 appels, 3 connexions, 29 Mo.
- Un projet gratuit est mis en pause après **7 jours sans aucune visite** : s'il l'est, le rouvrir depuis le tableau de
  bord de Supabase (bouton « Restore »).

---

## 4. Faire connaître le jeu

Du plus efficace au moins efficace pour démarrer :

1. **Les proches d'abord : cinq testeurs pendant plusieurs jours** ([docs/GUIDE-testeurs.md](docs/GUIDE-testeurs.md),
   retours dans [docs/RETOURS-testeurs.md](docs/RETOURS-testeurs.md)). Avec le parrainage allumé, chaque invitation leur
   rapporte des paquets.
2. **Les groupes de passionnés de mots** : groupes Facebook de Scrabble, de langue française, de philatélie ;
   professeurs de français et de FLE ; Reddit (r/france, r/French) ; Mastodon et Bluesky. Se présenter comme le
   créateur et demander des avis, plutôt que faire de la publicité.
3. **Un « mot rare du jour »** sur Instagram, TikTok ou X, avec l'image d'un timbre (bouton « Partager ce timbre »
   sur la fiche d'un timbre). Une courte vidéo d'ouverture de paquet marche bien aussi.
4. **Les vidéastes et blogueurs** qui parlent de langue française : un message court avec le lien.

L'étape 3 (anti-robot) est faite : on peut lancer une vraie campagne auprès d'inconnus.

---

## 5. Toujours en attente (rappel d'ETAT-DU-PROJET.md)

- Juger les sons du jeu à l'oreille (duels, carillon des paquets).
- Essayer le marché sur deux appareils.
- Avant tout paiement réel : remplir les blancs de [docs/CGV-brouillon.md](docs/CGV-brouillon.md) et consulter un juriste.
  Le vendeur sera « Studio Ludophile » ; sa forme juridique reste à choisir (étape 20).
  **Les achats restent fermés** ; ils ne s'ouvrent que sur une demande explicite de Raphaël.

---

## 6. Consignes pour l'assistant (Claude, Codex…)

- Commencer par `git pull` puis `npm install` : Raphaël travaille sur plusieurs postes et avec plusieurs assistants.
- Lire l'en-tête d'`ETAT-DU-PROJET.md`, puis cette page. Écrire à Raphaël en **français simple**, sans jargon ;
  lui proposer des options plutôt que trancher les choix de jeu ; lui poser les questions directement.
- Raphaël autorise la **publication** (push sur `main`, mise en ligne automatique) à chaque étape terminée et testée :
  `npm test` et `npm run build` doivent réussir avant.
- En local, le jeu ne touche pas au vrai serveur, sauf avec `localStorage.setItem('mots.vrai-serveur', 'oui')` ;
  tout joueur d'essai créé sur le vrai serveur doit être supprimé ensuite.
- Ne jamais ouvrir les paiements sans demande explicite, ne jamais lire, copier ni afficher une clé secrète
  (Supabase, Stripe, Cloudflare).
- Changement du serveur : modifier `serveur/*.ts`, lancer `npm run serveur:script`, ajouter une **nouvelle**
  migration numérotée (la dernière est la 19) ; ne jamais recoller une ancienne migration.
- Bancs locaux sans compte distant : `node serveur/apercu-direct.mjs` (joutes en direct à quatre) et
  `node serveur/apercu-secours-parrainage.mjs` (parrainage et adversaire de secours).
- Ne committer que ses propres fichiers, par leur nom ; tenir à jour l'en-tête d'`ETAT-DU-PROJET.md` et cette page.
