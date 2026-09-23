# Brancher Stripe en mode test — Philamots

Mise à jour le 23 septembre 2026 après les essais accompagnés de Raphaël.
La migration `8-paiements-test.sql` a été exécutée dans Supabase (capture de succès),
les fonctions `paiement` et `stripe-webhook` déployées manuellement, la vérification
JWT legacy désactivée et les quatre secrets enregistrés par Raphaël.
La valeur de `SITE_URL` pour ces essais est `http://127.0.0.1:4175`.
Les clés secrètes ne sont pas consignées ici. Les boutons restent cachés dans une
compilation normale du site ; les essais ont utilisé un aperçu local avec le mode test.

## Résultats des essais accompagnés

Observations issues des captures et confirmations explicites de Raphaël :

- Le webhook reçoit un événement signé Stripe avec une réponse 200. L'événement
  générique du Shell est ignoré, car il n'est pas rattaché à un joueur du jeu.
- Le compte dédié **Raph TEST STRIP** a été récupéré sur l'aperçu local et son nouvel
  identifiant autorisé dans `STRIPE_TEST_USER_IDS`.
- Achat unique à 5,99 € : Checkout réussi, cosmétiques premium accessibles,
  cadeau Hors-série reçu une seule fois.
- Abonnement à 4,99 €/mois : activation reconnue, premier paquet spécial reçu,
  cinq cartes dont au moins une Épique, pas de deuxième retrait immédiat.
- Résiliation via le portail : fin programmée au **23 octobre 2026**, période
  payée conservée. La fin effective à cette échéance n'a pas encore été observée.
- Remboursement total de Mon album : cosmétiques verrouillés, carte reçue conservée,
  abonnement indépendant toujours actif.
- Remboursement total de la facture d'abonnement : avantages Collectionneur retirés,
  acquis conservés. La résiliation déjà programmée dans Stripe reste distincte.
- Paiement refusé avec la carte fictive prévue par Stripe : message de refus visible,
  retour au jeu, aucun avantage accordé après vérification.

Restent à vérifier dans Stripe/Supabase : nouvelle période payée (renouvellement),
échec d'un renouvellement et fin effective d'abonnement. La récupération par code
après un achat actif et le rachat sans nouveau cadeau ne sont couverts pour l'instant
que par les tests locaux, pas par ce parcours accompagné. Aucun paiement réel autorisé.

Les tarifs fournis par Raphaël sont intégrés côté serveur :

| Offre | Tarif | Identifiant de prix de test |
|---|---|---|
| Mon album | 5,99 € une fois | `price_1UIqsGKBKL3aSktUL2DDagCC` |
| Collectionneur | 4,99 €/mois | `price_1UIquSKBKL3aSktUxN8o68C5` |

## 1. Installer les tables de paiement

Dans le projet Supabase **cgubfyxyivgufslpwlld** :

1. SQL Editor → New query.
2. Copier tout `serveur/8-paiements-test.sql` et le coller.
3. Vérifier que l'éditeur cible **Database**.
4. Run. Résultat attendu : **Success. No rows returned**.

Ce script suppose les offres déjà installées (`6-offres.sql`). Il ne modifie aucun
droit payant existant. Il ajoute une table protégée et des fonctions réservées au
serveur. Il peut être rejoué. Ne pas recoller l'ensemble des anciennes migrations.

## 2. Choisir un joueur réservé aux essais

Utiliser une collection de test séparée de sa collection habituelle : les paiements
fictifs lui attribueront de vrais avantages dans le jeu, puis les retireront lors des
remboursements. La synchronisation Stripe devient la référence pour ses deux offres.

1. Ouvrir Philamots dans un autre profil de navigateur et créer une partie.
2. Choisir un pseudonyme distinct, par exemple `Raph TEST STRIP`, puis ouvrir
   **Duel → Joutes classées → Rejoindre les joutes** pour enregistrer le profil public.
   Sur le client corrigé, le pseudo du profil est automatiquement proposé ; les
   renommages sont ensuite communs au profil et aux joutes.
3. Dans Réglages, créer et conserver le code de secours.
4. Dans Formules, renseigner son année de naissance réelle.
5. Supabase → Table Editor → `profils` : retrouver ce pseudonyme et copier sa colonne
   **utilisateur** (UUID, pas le champ `id` du profil).

Cet UUID sera la seule valeur autorisée dans `STRIPE_TEST_USER_IDS`. Ce n'est pas un secret.
Après une récupération par code sur un autre compte, autoriser son nouvel UUID pour
utiliser Checkout ou le portail. Les notifications Stripe suivent automatiquement
la collection grâce à la clé étrangère mise à jour en cascade.

## 3. Déployer les deux fonctions depuis le navigateur

Deux fichiers autonomes sont prêts dans `serveur/deploiement-paiements/`.
Ils ne contiennent aucune clé et aucun import à ajouter.

Dans Supabase → **Edge Functions** :

1. **Deploy a new function → Via Editor**.
2. Remplacer le contenu d'`index.ts` par **tout** le fichier `paiement.ts.txt`.
3. Donner à la fonction le nom exact **paiement**, puis **Deploy function**.
4. Dans ses paramètres, désactiver **Verify JWT** (ou **Enforce JWT verification**).
   Le code vérifie lui-même le jeton du joueur auprès de Supabase Auth.
5. Recommencer avec `stripe-webhook.ts.txt`, nom exact **stripe-webhook**.
6. Désactiver également **Verify JWT** pour cette fonction : elle vérifie la
   signature cryptographique envoyée par Stripe, qui n'utilise pas de JWT Supabase.

Alternative CLI, si déjà configurée :

```powershell
supabase functions deploy paiement --project-ref cgubfyxyivgufslpwlld
supabase functions deploy stripe-webhook --project-ref cgubfyxyivgufslpwlld
```

La configuration `supabase/config.toml` contient les réglages JWT pour la CLI.
Les fonctions ne fonctionneront qu'après l'ajout des secrets suivants.

## 4. Créer la destination Stripe

Dans l'environnement **de test** Stripe, ouvrir **Workbench → Webhooks** (ou
chercher « Webhooks »), puis ajouter une destination pour les événements de ce compte.

URL exacte :

```text
https://cgubfyxyivgufslpwlld.supabase.co/functions/v1/stripe-webhook
```

Sélectionner les événements suivants :

- `checkout.session.completed`, `checkout.session.expired`
- `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
- `invoice.paid`, `invoice.payment_failed`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`

Les appels sortants relisent les objets avec l'API Stripe `2025-02-24.acacia`.
Le webhook n'utilise que le client Stripe de l'événement pour déclencher une relecture
de l'état actuel. Il ne fait pas confiance à son ancien instantané pour les droits.

Copier le **secret de signature** `whsec_…` directement dans Supabase à l'étape suivante.
Ne pas le coller dans la conversation ni dans un fichier du dépôt.

## 5. Ajouter les secrets dans Supabase

Dans **Edge Functions → Secrets**, ajouter :

| Nom | Valeur |
|---|---|
| `STRIPE_SECRET_KEY` | Clé **secrète de test** Stripe `sk_test_…`, depuis les clés API de cet environnement |
| `STRIPE_WEBHOOK_SECRET` | Secret `whsec_…` de la destination créée à l'étape 4 |
| `STRIPE_TEST_USER_IDS` | UUID du joueur de test, copié à l'étape 2 |
| `SITE_URL` | Origine exacte du site utilisé pour les tests, par exemple `https://philamots.fr` |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement aux Edge
Functions par Supabase. Ne pas les recopier dans le client du jeu.

Pour une prévisualisation locale, utiliser son adresse exacte pour `SITE_URL`, par
exemple `http://localhost:5173`. Un seul site de retour/origine est autorisé à la fois.
Une clé Stripe réelle (`sk_live_…`) est refusée par le code.

## 6. Activer une prévisualisation de test

La version normale reste fermée. Pour compiler une version de test, Codex utilisera
`VITE_PAIEMENTS_TEST=true`, ou cette commande dans PowerShell avec Node ≥ 22.18 :

```powershell
$env:VITE_PAIEMENTS_TEST = 'true'
npm run dev
```

En développement local, le serveur réel est désactivé par défaut. Dans la console
du navigateur de test uniquement :

```js
localStorage.setItem('mots.vrai-serveur', 'oui')
location.reload()
```

Le compte de test doit être celui autorisé dans Supabase : au besoin récupérer sa
collection avec son code puis mettre à jour `STRIPE_TEST_USER_IDS` avec le nouvel UUID.
Ne jamais copier des jetons de session entre navigateurs.

Sur la page Formules, quatre boutons apparaissent : achat unique, abonnement,
gestion de l'abonnement et vérification des avantages. Le retour de Stripe ne
débloque rien par lui-même : cliquer sur **Vérifier mes avantages** relit Stripe,
puis recharge l'état du compte. Les webhooks actualisent aussi les droits.

## 7. Essais à réaliser ensemble

Utiliser exclusivement les cartes de test documentées par Stripe, par exemple
`4242 4242 4242 4242`, une expiration future et un CVC à trois chiffres pour un succès.

| Scénario | Résultat attendu |
|---|---|
| Mon album payé | Cosmétiques accessibles, un seul cadeau Hors-série |
| Clic répété / retour au panier | Même Checkout ouvert, pas de seconde session concurrente |
| Paiement refusé / abandonné | Aucun nouveau droit |
| Abonnement payé | Avantages jusqu'à la fin de la période réellement payée |
| Nouvelle facture payée | Date de fin prolongée ; calendrier des paquets conservé |
| Facture de renouvellement refusée | Aucune prolongation de la période payée |
| Résiliation depuis le portail | Fin à l'échéance de la période payée |
| Remboursement total de l'album dans Stripe | Cosmétiques retirés ; pas de deuxième cadeau si rachat |
| Remboursement total d'une facture d'abonnement | Période remboursée retirée du calcul des droits |
| Remboursement partiel | Avantages conservés pour ce test |
| Notification renvoyée / reçue en retard | Relecture de l'état actuel, pas de double attribution |
| Autre compte non autorisé | Refus côté serveur même en appelant directement la fonction |
| Récupération par code | La collection conserve le lien client Stripe et les renouvellements |

Le remboursement d'un abonnement ne résilie pas automatiquement ses renouvellements :
résilier également dans le portail ou Stripe si c'est l'intention. Cartes, XP et
récompenses déjà acquis ne sont pas repris. Un litige bloque les droits correspondant
au paiement ; sa résolution nécessite une vérification administrative dans ce prototype.

## Limites avant production

- Cette intégration est volontairement **limitée aux tests** : clés réelles refusées,
  liste de joueurs autorisés obligatoire, aucun bouton public par défaut.
- La récupération par e-mail n'est pas ajoutée : le code de secours existant reste
  obligatoire avant achat. La connexion par e-mail et son service d'envoi restent à préparer.
- La suppression ou l'écrasement d'une collection liée à Stripe est bloqué pour
  éviter de perdre une facturation active. Pour ce test, contacter l'administrateur
  qui doit d'abord terminer les sessions et abonnements Stripe, puis détacher le lien.
  Un parcours automatisé de suppression est nécessaire avant ouverture publique.
- La synchronisation relit l'historique complet avec pagination et verrou de 90 s.
  Ce choix convient à quelques comptes de test. Une comptabilité par paiement et une
  file de traitement durable seront nécessaires pour un historique important.
- Les informations commerciales, la fiscalité, la protection/synchronisation de l'XP
  et les essais réels de bout en bout restent à finaliser avant commercialisation.
- Une tentative de création interrompue depuis plus de 23 heures sans identifiant
  Stripe enregistré est bloquée pour réconciliation administrative ; cela évite de
  réutiliser une clé d'idempotence Stripe après sa durée de conservation.

## Vérifications locales

Les tests dédiés couvrent la signature, les tarifs, les clés de production refusées,
les droits selon les factures/remboursements, les contrôles HTTP, les doubles appels,
les privilèges PostgreSQL, les verrous et le transfert du compte par code.
Les appels Stripe y sont simulés, la base PostgreSQL est embarquée (PGlite).

Pour régénérer les deux fichiers à coller après une modification du serveur :

```powershell
node serveur/preparer-paiements.mjs
```

Sources : [déploiement dans l'éditeur Supabase](https://supabase.com/docs/guides/functions/quickstart-dashboard),
[secrets Supabase](https://supabase.com/docs/guides/functions/secrets),
[signatures Stripe](https://docs.stripe.com/webhooks/signature),
[tests Stripe](https://docs.stripe.com/testing).
