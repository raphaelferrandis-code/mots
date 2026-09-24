# Reprise : « active les paiements »

Demande de Raphi du 24 septembre 2026 : tout préparer maintenant, **ouvrir uniquement
sur une nouvelle demande explicite**. L'installation et la publication de la
préparation ne constituent pas cette demande. Ne pas créer de paiement réel pour tester.

## État constaté le 24 septembre 2026

- Les 298 tests de la version isolée à publier passent (dont 21 ciblés), notamment cadeau unique au rachat, refus, remboursements,
  isolation test/production et fermeture après une activation non confirmée.
- Migration `serveur/9-paiements-production.sql` appliquée à Supabase, succès confirmé.
  Contrôle distant : RLS activée, aucun accès direct anon/authenticated,
  cinq fonctions réservées au service et zéro paiement réel enregistré.
- Les fonctions `paiement-production` et `stripe-webhook-production` sont déployées ;
  réglage JWT hérité encore en attente de l'autorisation précise demandée à Raphi.
- `SITE_URL_PRODUCTION=https://philamots.fr` et `PAIEMENTS_PRODUCTION_OUVERTS=false`
  sont enregistrés dans Supabase. Les deux secrets Stripe restent à installer.
- Destination webhook Stripe : à créer après connexion de Raphi.
- Code publié : commit `ca7192a`, GitHub Actions exécution `35976186374` réussie.
  La page publique affiche « Les achats ne sont pas encore ouverts » avec confirmation
  désactivée. Le fichier public de version renvoie `philamots-paiements-v1`, mode
  `production`. Pas de nouvelle publication nécessaire pour changer l'état d'ouverture.
- Les deux tarifs fournis sont enregistrés dans le code ; contrôle live à terminer.
- Supabase et GitHub sont connectés dans le navigateur de cette tâche. Stripe exige
  encore une connexion. Aucun jeton d'administration n'est disponible dans le terminal.
- Les travaux locaux d'autres tâches (connexion, interface, joutes, etc.) doivent
  être préservés. Ne pas publier en bloc tous les fichiers modifiés.

## À faire avant de déclarer « prêt en un message »

1. Terminer les étapes d'installation du `GUIDE-paiements-production.md`.
2. Publication et vérification de l'interface fermée effectuées ; terminer la réponse
   publique du serveur après configuration des secrets et de son authentification.
3. Valider les contrôles live sans créer de paiement.
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
