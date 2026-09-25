# Préparation des paiements de production

24 septembre 2026 — **Code publié, fonctions et migration installées, achats réels fermés.**
Les secrets Stripe de production, la destination webhook et le réglage JWT des deux
fonctions sont installés. Sonde signée sans effet : HTTP 200 ; état public : achats
fermés. Voir `docs/ACTIVATION-paiements.md` pour les preuves et les conditions de reprise.
Les essais effectués avec Raphi concernent le sandbox. Les tests automatiques du
mode production simulent Stripe : aucun débit réel n'a été effectué.

## Tarifs fournis depuis le Dashboard

| Offre | Montant | ID de production |
|---|---|---|
| Mon album | 5,99 EUR, achat unique | `price_1UJ6tHK2IFab5EhcM6zOoVai` |
| Collectionneur | 4,99 EUR par mois | `price_1UJ6tHK2IFab5EhcHMwpkEsQ` |

Le serveur vérifie le mode, montant, devise, état actif et périodicité avant un nouveau
Checkout. Les deux fiches de tarifs ont été vérifiées dans le Dashboard de production.

## Isolation

| Élément | Test (conservé) | Production |
|---|---|---|
| Paiement | `paiement` | `paiement-production` |
| Webhook | `stripe-webhook` | `stripe-webhook-production` |
| Table | `paiements_test` | `paiements_production` |
| Clé secrète | `STRIPE_SECRET_KEY` | `STRIPE_LIVE_SECRET_KEY` |
| Signature | `STRIPE_WEBHOOK_SECRET` | `STRIPE_LIVE_WEBHOOK_SECRET` |
| Site | `SITE_URL` | `SITE_URL_PRODUCTION` |
| Interface | `VITE_PAIEMENTS_TEST=true` | `VITE_PAIEMENTS_PRODUCTION=true` |

Sans indicateur d'interface, ou si les deux sont activés, les paiements restent fermés.
Ne placer aucun secret dans les variables `VITE_…`. Chaque fonction choisit son mode
dans son point d'entrée, jamais depuis les données du navigateur. Clés et objets de
l'autre environnement sont refusés, y compris les événements signés du mauvais mode.

Une collection ne peut pas être liée aux deux tables : les comptes ayant servi aux
tests restent réservés aux tests. La récupération par code conserve cette séparation.
Ne pas effacer une liaison de test pour convertir ses cadeaux et droits en droits réels.

## Installation effectuée, procédure reproductible achats fermés

État détaillé et reprise de la tâche : `docs/ACTIVATION-paiements.md`.

1. Conserver les secrets et fonctions de test. Appliquer
   `serveur/9-paiements-production.sql` après `serveur/8-paiements-test.sql`.
   Migration réexécutable, sans modification des droits ou cadeaux actuels.
2. Déployer les deux nouveaux points d'entrée de `supabase/functions/`, ou coller
   les fichiers `serveur/deploiement-paiements/paiement-production.ts.txt` et
   `stripe-webhook-production.ts.txt` dans l'éditeur Supabase. Désactiver le JWT hérité
   pour ces fonctions : elles vérifient elles-mêmes l'utilisateur ou la signature.
3. Dans Stripe production, créer le webhook :
   `https://cgubfyxyivgufslpwlld.supabase.co/functions/v1/stripe-webhook-production`
   Sélectionner les 12 événements décrits dans `docs/GUIDE-paiements-test.md`.
4. Saisir dans Supabase uniquement `STRIPE_LIVE_SECRET_KEY` (`rk_live_…` ou `sk_live_…`),
   `STRIPE_LIVE_WEBHOOK_SECRET` (`whsec_…`) et `SITE_URL_PRODUCTION=https://philamots.fr`.
   Les secrets doivent provenir du même compte réel que les tarifs. Supabase fournit
  déjà `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
   La clé dédiée actuelle est restreinte : écriture Customers, Checkout Sessions et
   Customer Portal ; lecture Accounts, Charges and Refunds, Invoices, Prices,
   Subscriptions et Webhook Endpoints. Les clés publiables et celles de l'autre
   environnement sont refusées.
5. Garder `PAIEMENTS_PRODUCTION_OUVERTS=false` (absent = fermé également).
   La publication GitHub Pages prépare maintenant l'interface de production.
   L'interface consulte l'état du serveur au chargement, au retour dans l'onglet et
   toutes les 60 secondes tant que l'onglet est visible. Serveur fermé, indisponible ou incompatible = achat désactivé.

## Règles du 25 septembre 2026 (script 19 et fonctions redéployées)

Décisions de Raphaël :
- **Un joueur qui a payé supprime lui-même son compte** (« Effacer ma partie », Réglages). Si son abonnement
  « Collectionneur » se renouvelle encore, le serveur lui demande de le résilier d'abord (« Gérer mon abonnement ») ;
  une résiliation à l'échéance suffit. Il est prévenu qu'il perd ce qu'il a acheté. La ligne de paiement reste, sans
  le joueur (`utilisateur` vide, `client_stripe` gardé) : la trace comptable est chez Stripe, et un remboursement ou
  un litige annoncé plus tard est appliqué sans erreur.
- **L'âge se déclare par le mois et l'année de naissance**, une fois pour toutes (`declarer_ma_naissance`). On peut
  payer à partir du premier jour du mois qui suit ses 18 ans. Une correction passe par contact@philamots.fr. Une
  ancienne déclaration de l'année seule peut être complétée une fois, par la même année.

Et d'office (audit du 25/09) :
- un clic sur « acheter » sans paiement ne bloque plus rien ;
- une collection qui a des achats ne peut pas être remplacée par une autre lors d'une récupération par code ;
- si Stripe ne répond pas à la création du client ou de la session de paiement, le jeu ne bloque plus l'achat pour
  toujours : au-delà de dix minutes, il cherche chez Stripe ce qui a pu être créé (client par ses métadonnées,
  session encore ouverte) et le reprend ; sinon il recommence avec une nouvelle clé d'idempotence ;
- « Vérifier mes avantages » n'interroge Stripe qu'une fois toutes les 20 secondes au plus (`synchronise_le`) ;
- une demande mal formée reçoit un 400, et une panne un message général (le détail reste dans les journaux de
  Supabase).

**Installé le 25/09/2026**, vérifié par l'assistant en lecture seule : colonnes et fonctions du script 19 en place, droits
corrects ; les quatre fonctions déployées identiques aux fichiers de `serveur/deploiement-paiements/` (même empreinte
SHA-256, au saut de ligne final près — la copie depuis GitHub l'enlève) ; « Verify JWT with legacy secret » désactivé sur
les quatre ; `paiement-production?action=etat` répond `achatsOuverts: false`.

Installation : **d'abord** `serveur/19-paiements.sql` (SQL Editor), **puis** redéployer les quatre fonctions
`paiement`, `paiement-production`, `stripe-webhook` et `stripe-webhook-production` avec les fichiers de
`serveur/deploiement-paiements/`. Dans l'autre ordre, les paiements échoueraient jusqu'au collage du script (les
nouvelles fonctions lisent les nouvelles colonnes). Aucune permission Stripe à ajouter : la recherche de clients et la
liste des sessions sont couvertes par l'écriture Customers et Checkout Sessions.

## Ouverture et fermeture

Après déclaration de l'activité et finalisation des prérequis ci-dessous, utiliser
les commandes depuis la racine du dépôt (Node 24 recommandé) :

```powershell
npm run paiements:verifier
# Uniquement après la demande explicite « active les paiements » :
npm run paiements:activer
# Pour fermer les nouvelles sessions :
npm run paiements:fermer
```

La commande peut utiliser `SUPABASE_ACCESS_TOKEN`, `STRIPE_LIVE_SECRET_KEY` et
`STRIPE_LIVE_WEBHOOK_SECRET` depuis l'environnement ou `.env.paiements.local`
(ignoré par Git). Ne jamais les mettre dans le chat, dans un argument de commande,
dans un journal ou dans `VITE_…`. Un accès navigateur connecté ne fournit pas
automatiquement ces accès API. L'autorisation actuelle porte sur un stockage
uniquement dans Supabase : aucun fichier local de secrets n'a été créé. En l'absence d'accès API, effectuer les contrôles
dans les Dashboards puis changer le même secret d'ouverture dans Supabase.

La vérification contrôle l'activation du compte Stripe, les deux prix, les empreintes
des secrets serveur, les fonctions, les privilèges SQL, les événements du webhook,
une requête signée sans effet et `https://philamots.fr/paiements-version.json`.
Elle ne crée ni client ni paiement. L'activation écrit uniquement
`PAIEMENTS_PRODUCTION_OUVERTS=true` après ces contrôles, puis vérifie l'état renvoyé.
Si cette confirmation échoue, elle remet `false` et vérifie la fermeture ; une
fermeture non confirmée est signalée explicitement. Aucun redéploiement du site
n'est nécessaire une fois la préparation publiée.

Ces vérifications techniques ne certifient pas la situation juridique, la conformité
des CGV, la délivrabilité des e-mails ni la réussite d'un débit réel.

Remettre le secret serveur à `false` bloque les nouvelles sessions d'achat, même si
le navigateur affiche encore un bouton. Le portail, la synchronisation et les webhooks
restent accessibles aux clients existants. Cela ne résilie pas les abonnements ni
n'expire les Checkouts déjà créés : traiter également ceux-ci dans Stripe en cas d'arrêt.

## Confirmation des paiements

Signature vérifiée sur le corps brut, tolérance de cinq minutes. Les droits proviennent
des paiements actuels et sont appliqués sous verrou, pas du contenu ancien d'un événement.
Les doublons ne réattribuent pas le cadeau. Échec de synchronisation = HTTP 503 pour
permettre à Stripe de réessayer. Remboursement puis rachat conserve le cadeau déjà reçu.

La destination utilise des événements instantanés `2026-08-26.dahlia`. Le récepteur
utilise seulement l'identifiant `customer` (ou `charge` pour un litige) avant de relire
l'état courant avec `Stripe-Version: 2025-02-24.acacia`. Il ne dépend pas des champs
de facture modifiés dans les versions récentes. Ce comportement est couvert par un test.
Référence : https://docs.stripe.com/webhooks et les objets Event, Invoice, Session,
Subscription et Dispute de la documentation Stripe.

## Limites avant ouverture publique

- Finaliser informations commerciales, fiscalité, conditions de vente, consentements,
  remboursement et support avec la situation réelle de l'activité.
- Le code de secours reste requis avant achat. Le travail parallèle sur la connexion
  e-mail et Google est décrit dans `docs/GUIDE-connexion.md` ; l'e-mail de facturation
  Stripe n'est pas l'identité du joueur.
- Suppression par le joueur depuis le 25/09/2026 (voir plus haut) : un abonnement qui se renouvelle doit être résilié
  d'abord, donc pas d'abonnement orphelin. La politique de remboursement reste à décider (conditions de vente).
- Lecture de l'historique complet : limite de 20 pages par liste, verrou de 90 secondes.
  Un dépassement échoue sans appliquer de droits issus d'une lecture incomplète.
  Registre durable par paiement et file de reprise à prévoir avant montée en charge.
- Vérifier la configuration réelle, les notifications et la supervision après
  déploiement. Les tests simulés ne prouvent pas la configuration live.

## Vérifications locales

```powershell
node --test serveur/administrer-paiements.test.ts serveur/paiements.test.ts serveur/paiements-production.test.ts src/services/paiements-session.test.ts
node node_modules/typescript/bin/tsc --noEmit
node serveur/preparer-paiements.mjs
```

Les tests couvrent les deux modes, les prix, signatures, répétitions, renouvellements,
refus, remboursements, portail pendant fermeture, isolation SQL, récupération et cadeau
conservé au rachat. Régénérer les quatre fichiers autonomes après changement serveur.
