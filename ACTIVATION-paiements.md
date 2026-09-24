# Reprise : « active les paiements »

Demande de Raphi du 24 septembre 2026 : tout préparer maintenant, **ouvrir uniquement
sur une nouvelle demande explicite**. L'installation et la publication de la
préparation ne constituent pas cette demande. Ne pas créer de paiement réel pour tester.

## État constaté le 24 septembre 2026

- Les 298 tests de la version isolée publiée passaient ; les 23 tests ciblés passent
  après ajout des clés restreintes et du contrôle des instantanés récents : cadeau unique au rachat, refus, remboursements,
  isolation test/production et fermeture après une activation non confirmée.
- Migration `serveur/9-paiements-production.sql` appliquée à Supabase, succès confirmé.
  Contrôle distant : RLS activée, aucun accès direct anon/authenticated,
  cinq fonctions réservées au service et zéro paiement réel enregistré.
- Les fonctions `paiement-production` et `stripe-webhook-production` sont redéployées
  avec prise en charge des clés restreintes `rk_live_`. JWT hérité désactivé uniquement
  pour ces deux fonctions, avec autorisation explicite de Raphi.
- `SITE_URL_PRODUCTION=https://philamots.fr` et `PAIEMENTS_PRODUCTION_OUVERTS=false`
  sont enregistrés dans Supabase. Les deux secrets Stripe sont installés et leurs
  empreintes SHA-256 comparées aux valeurs d'origine, sans copie dans le dépôt.
- Clé dédiée « Philamots — Supabase » créée avec autorisation explicite de Raphi :
  écriture Customers, Checkout Sessions, Customer Portal ; lecture Accounts,
  Charges and Refunds, Invoices, Prices, Subscriptions, Webhook Endpoints.
  Aucun accès en écriture aux virements, remboursements ou comptes Connect.
- Destination webhook active `we_1UJ8rPK2IFab5EhccSmnuiXZ`, nom
  « Philamots — paiements production », les 12 événements prévus, URL exacte du projet.
  Instantanés `2026-08-26.dahlia`. Le serveur ne lit que `customer`/`charge` dans
  l'instantané et recalcule les droits depuis l'API épinglée `2025-02-24.acacia`.
- Contrôles distants : sonde signée `philamots.verification` -> 200 `ignore:true` ;
  webhook sans signature -> 400 ; paiement sans session -> 401 ;
  GET public `paiement-production?action=etat` -> 200,
  `version=philamots-paiements-v1`, `mode=production`, `achatsOuverts=false`.
  La sonde n'a créé aucun client, paiement, abonnement ou avantage.
- Code publié : commit `ca7192a`, GitHub Actions exécution `35976186374` réussie.
  La page publique affiche « Les achats ne sont pas encore ouverts » avec confirmation
  désactivée. Le fichier public de version renvoie `philamots-paiements-v1`, mode
  `production`. Pas de nouvelle publication nécessaire pour changer l'état d'ouverture.
- Les deux tarifs fournis sont enregistrés dans le code et vérifiés sur leurs fiches
  Stripe de production : album actif à 5,99 EUR, Collectionneur actif à 4,99 EUR/mois.
- Supabase, GitHub et Stripe sont connectés dans le navigateur de cette tâche.
  Compte Stripe de production : `acct_1UIqjNK2IFab5Ehc` (Philamots).
  Les sessions navigateur peuvent expirer : une reconnexion peut être nécessaire
  à la prochaine demande. Aucun jeton d'administration n'est disponible dans le
  terminal. Les secrets n'ont été enregistrés que dans Supabase, selon l'autorisation
  précise ; ne pas les recréer, les afficher ou les copier vers un fichier local.
- Les travaux locaux d'autres tâches (connexion, interface, joutes, etc.) doivent
  être préservés. Ne pas publier en bloc tous les fichiers modifiés.

## Préparation technique terminée ; contrôles avant ouverture

1. L'installation, la publication fermée et la sonde du webhook sont effectuées.
2. À la demande d'activation, recontrôler le compte Stripe (paiements/virements
   autorisés), les prix et le verrou. Aucun débit réel n'a été testé.
3. Utiliser les Dashboards connectés pour l'ouverture : seuls les secrets Supabase
   sont disponibles. Le script CLI nécessite des accès API distincts ; ne pas
   prétendre qu'il est déjà authentifié.
4. Informations de vendeur et CGV : Raphi n'a pas encore créé son entreprise.
   Il a prévu de la créer après la sortie gratuite. Ne pas déclarer cette étape faite,
   ne pas inventer de SIREN, d'adresse de vendeur ou de régime fiscal.
   `CGV-brouillon.md` est un ancien brouillon, pas des conditions publiables validées.

## Le jour de l'ouverture

Lire ce fichier et le guide, contrôler les prérequis restants avec les informations
réelles disponibles, puis exécuter `npm run paiements:activer` si les accès API sont
disponibles. Sinon faire les mêmes contrôles dans Stripe/Supabase et régler
`PAIEMENTS_PRODUCTION_OUVERTS=true`. Vérifier la réponse publique `action=etat`,
la page Formules et l'accès au portail des clients existants. Ne jamais annoncer
une ouverture réussie sans l'avoir constatée.

Pour revenir en arrière : `npm run paiements:fermer`. Cette action bloque uniquement
les nouvelles sessions Checkout ; elle ne résilie pas les abonnements ni les sessions
déjà créées. Ne pas changer les secrets ou tarifs de test.
