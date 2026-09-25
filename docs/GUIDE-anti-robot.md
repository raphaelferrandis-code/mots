# Le contrôle anti-robot (Cloudflare Turnstile)

*Écrit le 25 septembre 2026.*

## Pourquoi

Chaque nouveau visiteur reçoit automatiquement un compte invité. Sans contrôle, un programme peut fabriquer des
milliers de comptes à la chaîne : pour fausser le marché aux enchères, profiter du parrainage ou encombrer le serveur.
Supabase sait refuser ces comptes si chaque ouverture de compte présente un **jeton anti-robot**.

Le jeton est fourni par **Cloudflare Turnstile** :
- **gratuit**, sans limite du nombre de contrôles ;
- **presque toujours invisible** : le joueur ne voit rien. En cas de doute, une case « Vérifiez que vous êtes
  humain » apparaît en bas de l'écran, avec la consigne « Vérification anti-robot : coche la case pour continuer. » ;
- sans publicité ni pistage, et **chargé seulement au moment d'ouvrir un compte** ou de demander un code de connexion
  par e-mail. Un joueur qui a déjà son compte ne le charge jamais ;
- le site n'a pas besoin de passer par Cloudflare : il reste chez GitHub Pages et OVHcloud.

## Ce qui est déjà fait dans le jeu

- `src/services/antiRobot.ts` demande le jeton à Cloudflare ; `src/services/supabase.ts` le joint à l'ouverture du
  compte invité, `src/services/authentification.ts` à l'envoi d'un code de connexion par e-mail.
- Tant que la clé du site est vide dans `src/config/serveur.ts` (`cleAntiRobot: ''`), rien ne change : aucun contrôle.
- La page Confidentialité mentionne Cloudflare dès que la clé est réglée.
- Vérifié dans le navigateur avec les clés d'essai officielles de Cloudflare : jeton obtenu en moins de deux secondes
  sans rien afficher ; case à cocher affichée quand Cloudflare la demande.

## Ce que Raphaël doit faire

**L'ordre compte.** Si le contrôle est activé dans Supabase avant que le jeu envoie les jetons, plus personne ne
peut créer de compte.

### Étape 1 — Créer le contrôle chez Cloudflare (5 minutes)

1. Créer un compte gratuit sur **https://dash.cloudflare.com/sign-up** (ou se connecter si vous en avez un).
2. Dans le menu de gauche, ouvrir **Turnstile**, puis cliquer sur **Add widget**.
3. Remplir :
   - **Widget name** : `Philamots`
   - **Hostname management** : ajouter `philamots.fr`, puis `www.philamots.fr`
   - **Widget mode** : **Managed** (« géré » : invisible, sauf en cas de doute)
   - les autres réglages : laisser ce qui est proposé
4. Cliquer sur **Create**. Cloudflare affiche deux clés :
   - la **Site Key** (clé du site) : **publique**. Me l'envoyer dans la conversation ;
   - la **Secret Key** (clé secrète) : **ne jamais me l'envoyer**. Elle sert à l'étape 3, et à rien d'autre.

### Étape 2 — Je publie le jeu avec la clé du site

J'écris la Site Key dans `src/config/serveur.ts`, je publie, et je vérifie sur philamots.fr que les jetons partent
bien. À ce stade, Supabase les reçoit mais ne les exige pas encore : rien ne peut casser.

### Étape 3 — Activer le contrôle dans Supabase (2 minutes, quand je vous le dis)

1. Ouvrir le projet Supabase du jeu, puis **Authentication** dans le menu de gauche.
2. Trouver la rubrique **Attack Protection** (selon la version de Supabase, elle peut aussi s'appeler
   **Bot and Abuse Protection**).
3. Activer **Enable Captcha protection**.
4. **Choose Captcha Provider** : **Turnstile by Cloudflare**.
5. **Captcha secret** : coller la **Secret Key** de l'étape 1.
6. Cliquer sur **Save**.

### Étape 4 — Essayer

Ouvrir `https://philamots.fr/` dans une **fenêtre de navigation privée**. Le jeu doit s'ouvrir normalement, avec
3 paquets en réserve. C'est la preuve que le compte invité a été créé avec le contrôle. En cas de souci, me le dire :
on peut désactiver le contrôle dans Supabase en un clic (étape 3, décocher), le temps de comprendre.

## Si un joueur est bloqué

Le message « La vérification anti-robot n'a pas abouti. Recharge la page pour réessayer. » apparaît quand le
contrôle échoue : bloqueur de publicité très strict, réseau d'entreprise qui interdit Cloudflare, etc. Recharger la
page suffit le plus souvent.
