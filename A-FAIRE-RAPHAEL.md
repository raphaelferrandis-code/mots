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
| Site prêt pour Google (titre, description, plan du site) | En ligne ; **inscription à faire** (étape 4) |
| Contrôle anti-robot Cloudflare | Construit, **éteint** (étape 3) |
| Adversaire de secours des joutes en direct | Construit, **éteint** (étape 2) |
| Parrainage (3 paquets chacun) | Construit, **éteint** (étape 2) |

---

## 3. Les étapes, dans l'ordre

### Étape 2 — Installer le script 13 (parrainage et adversaire de secours)

Détails : [GUIDE-secours-et-parrainage.md](GUIDE-secours-et-parrainage.md).

- [ ] Coller `serveur/13-secours-et-parrainage.sql` dans Supabase (SQL Editor, menu **Database**, **Run**).
      Raphaël a autorisé l'assistant à le faire le 25 septembre, dans un navigateur connecté à Supabase.
- [ ] L'assistant vérifie avec un joueur d'essai (créé puis supprimé).
- [ ] L'assistant passe `secoursEtParrainage: true` dans `src/config/serveur.ts` et publie.

**À faire avant l'étape 3.**

### Étape 3 — Allumer le contrôle anti-robot (10 minutes)

Détails : [GUIDE-anti-robot.md](GUIDE-anti-robot.md).

- [ ] Créer un compte gratuit chez Cloudflare (https://dash.cloudflare.com/sign-up), puis **Turnstile** →
      **Add widget** : nom `Philamots`, domaines `philamots.fr` et `www.philamots.fr`, mode **Managed**.
- [ ] Envoyer à l'assistant la **Site Key** (publique). **Ne jamais lui envoyer la Secret Key.**
- [ ] L'assistant l'écrit dans `src/config/serveur.ts` (`cleAntiRobot`) et publie.
- [ ] **Seulement ensuite** : Supabase → Authentication → Attack Protection → **Enable Captcha protection**,
      fournisseur **Turnstile by Cloudflare**, coller la **Secret Key**, **Save**.
- [ ] Ouvrir philamots.fr en navigation privée : le jeu doit s'ouvrir avec 3 paquets.

### Étape 4 — Se faire connaître de Google et de Bing (15 minutes)

Détails : [GUIDE-google.md](GUIDE-google.md).

- [ ] https://search.google.com/search-console → **Ajouter une propriété** → **Préfixe de l'URL** →
      `https://philamots.fr/` → méthode **Balise HTML** : envoyer la ligne `<meta name="google-site-verification" …>`
      à l'assistant (elle n'est pas secrète).
- [ ] Une fois publiée par l'assistant : **Valider**, puis **Sitemaps** → `sitemap.xml` → **Envoyer**, puis
      **Inspecter l'URL** `https://philamots.fr/` → **Demander une indexation**.
- [ ] https://www.bing.com/webmasters → **Importer depuis Google Search Console**.

### Étape 5 — Essayer soi-même ce que personne n'a encore essayé

- [ ] Créer son compte avec **Google** (page Mon compte), puis avec **un code reçu par e-mail** sur un autre
      navigateur. Ces deux parcours n'ont jamais été faits avec un vrai compte.
- [ ] Partager `philamots.fr` dans WhatsApp (à soi-même) : l'image doit apparaître. WhatsApp peut garder l'ancien
      aperçu quelques heures.
- [ ] Une fois l'étape 2 faite : envoyer son lien d'invitation (page **Amis**) à un proche, et vérifier que chacun
      reçoit 3 paquets après son premier duel.
- [ ] Créer son **code de secours** (Profil → Ton compte), si ce n'est pas déjà fait.

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

Avant une vraie campagne auprès d'inconnus : l'étape 3 (anti-robot) doit être faite.

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
  migration numérotée (la dernière est la 13) ; ne jamais recoller une ancienne migration.
- Bancs locaux sans compte distant : `node serveur/apercu-direct.mjs` (joutes en direct à quatre) et
  `node serveur/apercu-secours-parrainage.mjs` (parrainage et adversaire de secours).
- Ne committer que ses propres fichiers, par leur nom ; tenir à jour l'en-tête d'`ETAT-DU-PROJET.md` et cette page.
