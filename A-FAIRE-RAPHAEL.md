# Ce qu'il reste à faire — pour Raphaël

*Mis à jour le 25 septembre 2026.* Une seule page pour reprendre le travail, sur n'importe quel ordinateur.
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
| Audit complet du code ([AUDIT-CODE-2026-09-25.md](AUDIT-CODE-2026-09-25.md)) et corrections « joueur bloqué » | En ligne |
| Parrainage durci (parrain payé à la confirmation du filleul) et comptes neufs sans échanges | Jeu en ligne ; **script 16 à coller (étape 8)** |

---

## 3. Les étapes, dans l'ordre

### Étape 2 — Installer le script 13 (parrainage et adversaire de secours) — FAIT le 25 septembre

Détails : [GUIDE-secours-et-parrainage.md](GUIDE-secours-et-parrainage.md).

- [x] Script `serveur/13-secours-et-parrainage.sql` collé dans Supabase par l'assistant, avec l'autorisation de
      Raphaël.
- [x] Vérifié avec un joueur d'essai, créé puis supprimé.
- [x] `secoursEtParrainage: true` dans `src/config/serveur.ts`, jeu publié.

### Étape 3 — Allumer le contrôle anti-robot — FAIT le 25 septembre

Détails : [GUIDE-anti-robot.md](GUIDE-anti-robot.md).

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

Détails : [GUIDE-google.md](GUIDE-google.md).

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

### Étape 6 — Redéployer les deux fonctions du serveur (mot adverse caché) — FAIT le 25 septembre

Pourquoi : jusqu'ici, le serveur envoyait au navigateur le mot adverse **et sa définition** dès le début de la
manche ; un joueur pouvait les lire. Désormais, avant la parade, on ne voit que la nature, l'attaque et la défense.
Détails : [GUIDE-combats-serveur.md](GUIDE-combats-serveur.md) et [GUIDE-joutes-direct.md](GUIDE-joutes-direct.md).
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

Détails : [GUIDE-portraits-et-presence.md](GUIDE-portraits-et-presence.md).

- [x] Script `serveur/15-portraits-et-presence.sql` en place dans Supabase, contrôlé par l'assistant en lecture seule
      (fonctions à jour, droits corrects, premier signal de présence reçu).
- [ ] Vérifier sur philamots.fr : Profil → **Mes amis** → la fiche d'un ami montre son portrait, son niveau, « En
      ligne » ou « Passage il y a… » et ses plus beaux timbres.

### Étape 8 — Installer le script 16 (parrainage confirmé et comptes neufs)

Pourquoi : l'audit du 25 septembre a montré qu'on pouvait créer des comptes jetables, se parrainer soi-même, puis
faire remonter leurs paquets vers son vrai compte par les échanges et le marché. Tes décisions du 25 septembre :
- le filleul reçoit toujours ses **3 paquets dès son premier duel** ;
- le parrain reçoit les siens quand le filleul a **relié un compte Google ou e-mail** et **terminé un duel un autre
  jour**, dans les 14 jours après son arrivée ; toujours **10 filleuls récompensés par mois** au plus ;
- pendant ses **3 premiers jours**, un compte ne peut **ni échanger, ni enchérir, ni vendre** ;
- les parrainages déjà validés restent acquis.

Détails : [GUIDE-secours-et-parrainage.md](GUIDE-secours-et-parrainage.md). **Aucune fonction serveur à redéployer.**
Le jeu est déjà publié et s'adapte tout seul : tant que le script n'est pas collé, rien ne change pour les joueurs.

- [ ] Ouvrir https://github.com/raphaelferrandis-code/mots/blob/main/serveur/16-parrainage-confirme.sql → icône
      **Copy raw file** (deux carrés superposés, en haut à droite).
- [ ] Supabase → **SQL Editor** → **New query** ; vérifier que le petit menu à gauche de **Save** indique
      **Database** ; coller ; **Run**. Réponse attendue : **Success. No rows returned** (un avertissement « Potential
      issue detected » peut apparaître : le confirmer).
- [ ] Le dire à l'assistant : il vérifie avec un joueur d'essai jetable, puis le supprime.

---

## 4. Faire connaître le jeu

Du plus efficace au moins efficace pour démarrer :

1. **Les proches d'abord : cinq testeurs pendant plusieurs jours** ([GUIDE-testeurs.md](GUIDE-testeurs.md),
   retours dans [RETOURS-testeurs.md](RETOURS-testeurs.md)). Avec le parrainage allumé, chaque invitation leur
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
- Avant tout paiement réel : remplir les blancs de [CGV-brouillon.md](CGV-brouillon.md) et consulter un juriste.
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
  migration numérotée (la dernière est la 16) ; ne jamais recoller une ancienne migration.
- Bancs locaux sans compte distant : `node serveur/apercu-direct.mjs` (joutes en direct à quatre) et
  `node serveur/apercu-secours-parrainage.mjs` (parrainage et adversaire de secours).
- Ne committer que ses propres fichiers, par leur nom ; tenir à jour l'en-tête d'`ETAT-DU-PROJET.md` et cette page.
