# Relier philamots.fr et créer contact@philamots.fr

État au 23 septembre 2026 : domaine actif chez OVHcloud, confirmé par Raphaël. Aucune modification distante
effectuée lors de la préparation de ce guide. Le jeu est publié par GitHub Actions depuis le dépôt `mots`.
Raphaël indique avoir déjà créé une boîte OVH, avec une activation annoncée sous 5 à 10 minutes. La création
ci-dessous reste une référence ; la prochaine étape e-mail est de confirmer l’adresse puis de tester le webmail.

## Avant la bascule : conserver l’accès à sa collection

Sur l’adresse actuelle du jeu, ouvrir Réglages → Ton compte et noter son code de secours. Faire de même pour
les testeurs. La session est conservée dans le navigateur pour l’origine `raphaelferrandis-code.github.io` :
elle ne sera pas disponible automatiquement sur `philamots.fr`. Sur le nouveau domaine, utiliser le code pour
récupérer son compte. Ne pas publier ni envoyer ce code dans le dépôt ou dans la conversation.

## 1. Raccorder le site

1. Ouvrir les [réglages Pages du dépôt](https://github.com/raphaelferrandis-code/mots/settings/pages).
   Garder la source **GitHub Actions**. Dans **Custom domain**, saisir `philamots.fr` et enregistrer.
2. Dans OVHcloud, ouvrir la **Zone DNS** de `philamots.fr`. Exporter la zone avant modification.
   Remplacer les destinations web par les valeurs ci-dessous. Dans le champ sous-domaine OVH, laisser vide
   pour la racine, et saisir `www` pour la variante. Conserver le TTL par défaut.

| Nom | Type | Destination |
|---|---|---|
| racine | A | 185.199.108.153 |
| racine | A | 185.199.109.153 |
| racine | A | 185.199.110.153 |
| racine | A | 185.199.111.153 |
| racine | AAAA | 2606:50c0:8000::153 |
| racine | AAAA | 2606:50c0:8001::153 |
| racine | AAAA | 2606:50c0:8002::153 |
| racine | AAAA | 2606:50c0:8003::153 |
| www | CNAME | raphaelferrandis-code.github.io. |

Au contrôle DNS initial, la racine et `www` ont une adresse A `51.91.236.255`, et la racine une adresse AAAA
`2001:41d0:301::29`. Remplacer ces anciennes destinations web. Le CNAME de `www` ne doit pas coexister avec
des A, AAAA ou TXT au même nom : examiner les lignes `www` avant de le créer. Ne pas toucher aux MX ni aux
enregistrements d’authentification des e-mails ; ne pas réinitialiser toute la zone et ne pas changer les serveurs DNS.

3. Attendre la validation DNS dans GitHub Pages puis activer **Enforce HTTPS**. Contrôler la racine, `www`,
   les images et une ouverture de paquet. Vérifier aussi la récupération du compte.

Référence des valeurs et de l’ordre des étapes : [documentation GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
La propagation et la disponibilité de HTTPS peuvent prendre jusqu’à 24 heures. Le workflow personnalisé du
dépôt ne nécessite pas de fichier CNAME. Vite utilise déjà des chemins relatifs compatibles avec la racine.

## 2. Créer la boîte de contact

Les DNS observés contiennent déjà les MX OVH `mx1.mail.ovh.net`, `mx2.mail.ovh.net`, `mx3.mail.ovh.net` et
le SPF `v=spf1 include:mx.ovh.com -all`. Cela indique le routage e-mail, pas l’existence d’une boîte.

Dans l’espace OVHcloud, identifier l’offre e-mail associée au domaine. Si un service MX Plan est actif : ouvrir
**Web Cloud → MX Plan → le service → Comptes e-mail → Ajouter un compte** (sur l’ancienne interface :
**Emails → Créer une adresse E-mail**). Créer `contact`, avec le nom d’affichage « Philamots », et choisir
le mot de passe directement dans OVHcloud. Si seul un hébergement gratuit inclus est proposé, son activation
préalable peut être nécessaire. Vérifier l’offre incluse avant de commander un service supplémentaire.

Procédure selon la technologie : [création de compte MX Plan, documentation OVHcloud](https://docs.ovhcloud.com/fr/guides/web-cloud/email-and-collaborative-solutions/mx-plan/email-creation).
Si l’espace affiche une offre Zimbra indépendante, suivre son parcours propre après identification du service.

Après création, ouvrir le webmail proposé par OVH et tester avec une autre boîte personnelle : réception vers
`contact@philamots.fr`, puis réponse depuis cette adresse. Vérifier aussi les indésirables. Les paramètres MX,
SPF et DKIM doivent correspondre à l’offre réellement activée ; ne pas inventer de clé DKIM ni créer deux SPF.
Si l’activation d’un hébergement OVH propose de modifier le pointage web, conserver le pointage GitHub Pages.

## 3. Terminer côté projet après vérification

- Passer les adresses de partage de `src/config/site.ts` à `https://philamots.fr/` une fois le site accessible.
- Afficher le contact dans la page Confidentialité et les documents de vente après validation de la boîte.
- Mettre à jour les adresses documentées et contrôler les liens de connexion Supabase lors de leur mise en place.
- Appliquer la mise à jour serveur décrite dans `GUIDE-supabase.md` avant de publier les changements locaux.

La boîte de contact sert aux échanges avec les joueurs. L’envoi automatique de liens de connexion reste un
chantier distinct : choix du service d’envoi, authentification du domaine et configuration Supabase.

## Suivi

- [x] Domaine actif chez OVHcloud.
- [x] Relevé initial des DNS publics.
- [ ] Codes de secours notés avant changement d’adresse.
- [x] Domaine enregistré dans GitHub Pages (confirmé par Raphaël).
- [x] Zone DNS raccordée au jeu : quatre A GitHub vérifiés auprès d’OVH et Google, CNAME `www` vérifié, ancienne AAAA retirée. Option IPv4 seule retenue, sans ajout des AAAA proposées plus haut. DNS validé par GitHub.
- [x] Certificat disponible et « Enforce HTTPS » coché, capture de Raphaël à l’appui.
- [x] Accès sécurisé au jeu confirmé par Raphaël en navigation privée puis normale ; HTTPS et redirection HTTP vers HTTPS contrôlés depuis le terminal.
- [ ] Récupération de l’ancienne collection confirmée sur le nouveau domaine.
- [x] Boîte `contact@philamots.fr` fonctionnelle, confirmé par Raphaël après les instructions de test du webmail.
- [ ] Nouvelle adresse et contact intégrés au site.
