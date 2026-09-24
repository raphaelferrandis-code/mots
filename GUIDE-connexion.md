# Comptes Google et e-mail

L’écran **Mon compte** (`#/compte`), accessible dans la navigation et les Réglages, propose la création de compte, la connexion et la déconnexion.

- **Créer un compte** rattache l’identité au compte invité existant : le même identifiant Supabase conserve les timbres, les achats et la progression.
- **Se connecter** charge la collection du compte choisi, sans fusion ni import de celle de l’invité. L’interface invite à protéger préalablement la collection invitée.
- **E-mail** : code à usage unique, sans mot de passe. La création utilise `update user` puis `verify` avec `email_change`. La connexion utilise `otp` avec `create_user: false` puis `verify` avec `email`.
- **Google** : OAuth avec PKCE SHA-256 ; création via le rattachement d’identité, connexion via l’autorisation Google. Le retour est traité avant de démarrer le jeu. Le vérificateur est gardé uniquement dans le navigateur qui a commencé la connexion.
- **Déconnexion** : révocation de cette session, puis retour en invité. Les autres appareils restent connectés. Une nouvelle identité locale empêche d’importer la collection précédente ; les onglets ouverts se rechargent.

## Configuration avant publication

Configuration distante commencée le 24 septembre 2026, avec l’autorisation de Raphaël : **rattachement manuel activé**, **Site URL réglée sur `https://philamots.fr/`**, et cette même URL ajoutée à la liste des redirections autorisées. **Google, e-mail et invités sont activés dans Supabase**, avec confirmation e-mail exigée.

Suivi des réglages distants :

- **Projet Google Cloud Philamots créé**, identifiant `philamots`, après l’autorisation explicite de Raphaël ; création confirmée par la notification Google Cloud. L’écran Google Auth est enregistré avec le nom Philamots, l’assistance `raphaelferrandis@gmail.com`, une audience externe et le contact `contact@philamots.fr`. Le règlement Google a été accepté après confirmation explicite. Page d’accueil `https://philamots.fr/` et confidentialité `https://philamots.fr/#/confidentialite` enregistrées ; aucun logo ajouté.
- **Client OAuth Philamots Web créé**, origine `https://philamots.fr`, retour `https://cgubfyxyivgufslpwlld.supabase.co/auth/v1/callback`. Identifiant et secret enregistrés dans Supabase après autorisation explicite ; état **Google Enabled** vérifié. Aucun secret copié dans le dépôt.
- **Google en production**, après autorisation explicite de Raphaël d’ouvrir la connexion à tous les joueurs disposant d’un compte Google. État **En production** vérifié dans Audience ; aucun utilisateur test nécessaire.
- **SMTP OVH actif et enregistré par Raphaël**, vérifié dans Supabase : boîte `contact@philamots.fr`, nom d’expéditeur `Philamots`, serveur `smtp.mail.ovh.net`, port `465`, intervalle `60` secondes. Le mot de passe est enregistré et masqué par Supabase ; il n’a pas été lu ni copié dans le dépôt.
- **Modèles Magic link or OTP et Change email address enregistrés** : objets et messages en français, code à usage unique via `{{ .Token }}`, aucun lien de redirection dans le message. Le bouton « Reset template » et l’absence de modification en attente ont confirmé les deux enregistrements.

Les paramètres SMTP proposés proviennent de la [documentation officielle OVHcloud MX Plan](https://docs.ovhcloud.com/en/guides/web-cloud/email-and-collaborative-solutions/mx-plan/landing-page-mx-plan). Le parcours réel Google et la livraison des e-mails restent à valider après configuration.

**Publication du 24 septembre 2026 :** les comptes et l’ensemble des changements locaux du jeu ont été publiés avec le commit `0f2f478`. Le [workflow GitHub Pages](https://github.com/raphaelferrandis-code/mots/actions/runs/35982632077) a terminé avec succès ; les fichiers JavaScript et CSS servis par `philamots.fr` correspondent à la compilation vérifiée. L’écran public `#/compte` affiche la création de compte, la connexion, Google et l’envoi de code e-mail. Validation locale : 317 tests réussis, compilation de production réussie et parcours navigateur simulés réussis, dont mobile 320/390 px. Aucune connexion personnelle Google ni réception réelle d’e-mail n’a été effectuée pendant ces vérifications.

### Supabase

Dans le projet `cgubfyxyivgufslpwlld`, Authentication :

1. Conserver les connexions anonymes et les nouvelles inscriptions autorisées.
2. Autoriser le rattachement manuel d’identités (**Allow manual linking**) pour convertir les comptes invités.
3. Conserver le fournisseur Email activé et la confirmation des adresses activée.
4. **URL Configuration** : Site URL `https://philamots.fr/` ; ajouter cette même adresse dans Redirect URLs. Pour tester localement, ajouter explicitement `http://localhost:5173/` ou l’adresse locale utilisée. Si le site est servi dans un sous-dossier, autoriser son URL exacte avec le slash final, sans fragment `#`.
5. Configurer un **SMTP de production**. Le service d’envoi par défaut de Supabase est limité et ne suffit pas à accueillir tous les joueurs.
6. **Email Templates** : modifier **Magic Link** et **Change Email Address** pour afficher le code, sans bouton de redirection. Utiliser par exemple :

   ```html
   <h2>Ton code Philamots</h2>
   <p>Recopie ce code dans la page Mon compte :</p>
   <p><strong>{{ .Token }}</strong></p>
   <p>Si tu n’as pas demandé ce code, ignore cet e-mail.</p>
   ```

   Dans Change Email Address, conserver également `{{ .Token }}` : c’est le code vérifié par `email_change`. L’interface accepte entre 6 et 10 chiffres. Conserver une durée de validité courte et les limites d’envoi. Les liens implicites contenant des jetons dans le fragment ne sont pas utilisés par cette interface.

### Google

1. Dans Google Cloud, configurer l’écran de consentement et un client OAuth de type **Web application** pour Philamots. En mode test, ajouter les adresses des testeurs ; publier le consentement pour ouvrir l’accès à tous.
2. Déclarer l’origine `https://philamots.fr` et l’URI de redirection autorisée :
   `https://cgubfyxyivgufslpwlld.supabase.co/auth/v1/callback`.
3. Dans Supabase → Authentication → Providers → Google, renseigner le Client ID et le Client Secret, puis activer Google. Le secret reste exclusivement dans Supabase, jamais dans le dépôt ou le navigateur.

## Vérifications

Les tests automatisés utilisent des réponses Supabase simulées : aucune création de compte ni aucun e-mail sur le serveur réel.

- Tests unitaires : `npm test` avec Node >= 22.18.
- Construction : `npm run build`.
- Navigateur : `node serveur/verifier-connexion-navigateur.mjs` avec Playwright installé, ou `PLAYWRIGHT_MODULE` pointant sur son répertoire. Chrome par défaut ; `BROWSER_CHANNEL` permet un autre navigateur installé.

Après configuration, vérifier avec un compte de test : rattachement d’un invité possédant des timbres, confirmation e-mail, déconnexion/reconnexion depuis un autre navigateur, création Google, connexion Google existante, annulation Google, code expiré et refus d’une identité déjà rattachée. Vérifier que l’identifiant utilisateur et les possessions ne changent pas lors du rattachement.

Documentation officielle : [comptes invités](https://supabase.com/docs/guides/auth/auth-anonymous), [connexion par code e-mail](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
