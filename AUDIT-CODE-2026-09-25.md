# Audit complet du code — 25 septembre 2026

Audit en lecture seule : aucun fichier du jeu n'a été modifié, aucun appel au vrai serveur, aucun secret lu ni affiché.
Cinq examens menés en parallèle (base de données, fonctions serveur et paiements, services du navigateur, règles du jeu et tests, interface), puis recoupés : les points principaux ont été revérifiés dans le code.

Les audits précédents (`ANALYSE-CODE-MECANIQUES-2026-09-23.md`, `AUDIT-UI-UX-2026-09-23.md`, `SUIVI-CORRECTIONS-2026-09-23.md`) ont été lus pour ne pas redire ce qui est déjà corrigé.

> **Corrigé le 25/09 (lot « joueur bloqué ») :** n° 2 (filet d'erreur et fond animé), n° 6 en partie (album et deck ont
> « Réessayer » ; une partie illisible est expliquée une seule fois dans `App.tsx` au lieu de « Chargement… » sur chaque
> écran), n° 7 (déconnexion) et n° 8 (paquet).
> **Corrigé le 25/09 (script 16, installé) :** n° 1 (parrain payé à la confirmation du filleul ; comptes de moins de
> 3 jours sans échange, enchère ni vente ; l'anti-robot est allumé) et le plafond mensuel du parrain, désormais
> verrouillé.
> **Corrigé le 25/09 (script 17 et fonction joutes-direct, installés) :** n° 3 (un verrou par domaine, ordre imposé,
> écran des joutes et clôture des enchères sans verrou inutile, lectures au bon moment au lieu de toutes les 2,5 s ; la
> page Formules n'interroge plus le serveur de paiement quand l'onglet est caché).
> **Corrigé le 25/09 (script 18, installé) :** n° 4 (filtres normalisés, 3 rencontres classées par jour, cote retrouvée en
> recréant son profil, nombres du jeu et cote minimale 100, gagnant d'un abandon récompensé, 5 parties pour être classé).
> **Corrigé le 25/09 (tests seulement, rien à installer) :** n° 5 — `serveur/tirage.test.ts` éprouve le tirage SQL du
> serveur sur toute l'édition (paquets de départ, garantie de Légendaire, Encre des doublons, finitions, raretés par
> emplacement sur 3 000 paquets, Hors-série, plafond quotidien d'Encre) ; sept erreurs glissées exprès dans le SQL ont
> toutes été attrapées.
> Le reste de ce document est toujours à faire.

## En bref

**Le jeu est sain. Aucune faille critique** : personne ne peut se déclarer vainqueur, fabriquer de l'Encre ou des timbres, ni payer sans passer par Stripe. Les achats sont bien fermés côté serveur.

| Contrôle | Résultat |
|---|---|
| Tests (`npm test`) | 393 réussis sur 393, 23 s, aucun test instable repéré |
| Compilation TypeScript | aucune erreur |
| Dépendances (`npm audit`) | 0 vulnérabilité connue |
| Base de données | protection ligne par ligne (RLS) sur les 30 tables, `search_path` figé sur toutes les fonctions privilégiées |
| Scripts SQL | identiques à ce que produisent leurs générateurs |

Les défauts trouvés touchent surtout **la triche au classement et aux cadeaux**, **la tenue à la charge quand il y aura du monde**, et **quelques cas où le joueur reste bloqué** (écran vide, « Chargement… » sans fin, déconnexion impossible).

---

## À corriger en priorité

### 1. Fabrique de comptes jetables et parrainage avec soi-même — important
- **Où** : `serveur/collections.ts:454-461` (`ouvrir_mon_compte`), `serveur/parrainage.ts:72-83` et `:119-138`, `serveur/amis.ts:153-182` (échanges), `serveur/marche.ts:280-341`.
- **Problème** : chaque compte anonyme reçoit 3 paquets de départ. Un « filleul » est n'importe quel compte récent sans combat, et le parrainage est validé dès le premier duel terminé, même perdu en Facile.
- **Scénario** : un joueur crée des comptes B, C, D… avec son propre code. Chacun reçoit 3 paquets, et lui 3 de plus par filleul (10 par mois). Les timbres remontent ensuite au compte principal par les échanges entre amis, sans plafond ni contrôle de valeur, et l'Encre par le marché (achat immédiat cher d'une Commune). Seule la limite d'inscriptions de Supabase freine, puisque l'anti-robot est encore éteint.
- **Correction** : allumer l'anti-robot (étape 3 de `A-FAIRE-RAPHAEL.md`). Valider le parrainage sur un signal plus coûteux (compte Google ou e-mail, plusieurs jours d'activité, plusieurs victoires). Plafonner échanges et achats pour les comptes de moins de quelques jours.

### 2. Aucun « filet » en cas d'erreur d'affichage : page entièrement vide — important
- **Où** : `src/App.tsx` (aucune *error boundary* dans tout `src/`) et `src/composants/accueil/FondAnime.tsx:33-53`.
- **Problème** : la moindre erreur pendant l'affichage démonte toute l'application. Exemple confirmé à l'écran : si la fenêtre mesure 0 × 0 au chargement (onglet ouvert en arrière-plan, certaines webviews), le fond animé dessine une image de taille nulle, `drawImage` lève une erreur, et la page reste bleu nuit sans rien.
- **Correction** : ne pas dessiner une rosace de taille ≤ 12. Entourer l'écran d'un filet qui affiche « Un problème est survenu » avec un bouton Recharger.

### 3. Un seul verrou pour tous les joueurs du serveur — important quand le public arrivera
- **Où** : `pg_advisory_xact_lock(20260923)`, pris par `cloturer_les_encheres` (donc par `mon_compte` et tout le marché), par `direct_salon` (`serveur/direct.ts:62`, via `serveur/api-direct.ts:47-51`), par les amis et les équipes. L'écran des joutes en direct interroge le serveur toutes les 2,5 s (`src/composants/useJouteDirecte.ts:63`), même quand l'onglet est caché.
- **Scénario** : avec 200 joueurs sur l'écran des joutes, environ 80 opérations par seconde attendent le même verrou, l'une après l'autre. Un script qui interroge en boucle ralentit tout le monde. Il existe aussi un **interblocage** : `supprimer_mon_profil` prend le compte puis le verrou global (`serveur/fabriquer-le-script.ts:360-368` puis le déclencheur de `serveur/direct.ts:251-256`), alors que `encherir`, `repondre_echange` et `direct_salon` font l'inverse. Postgres annule alors l'une des deux opérations, sans abîmer les données.
- **Correction** : dans `cloturer_les_encheres`, vérifier qu'une enchère est échue avant de prendre le verrou (ou utiliser `pg_try_advisory_xact_lock`). Ne pas verrouiller pour une simple lecture du salon. Prendre le verrou global en premier dans `supprimer_mon_profil`. Côté navigateur, ne plus interroger quand l'onglet est caché, et espacer à 10-15 s quand le temps réel est connecté.

### 4. Classement manipulable — moyen
Plusieurs petites portes qui, ensemble, permettent de gonfler une cote :
- **Abandon arrangé** : la cote bouge même quand la partie finit par un abandon (`serveur/direct.ts:186-211`, `serveur/moteur-direct.ts:223` et `:233`). La file d'attente associe les joueurs dont les filtres sont *exactement* identiques, ordre et doublons compris (`serveur/direct.ts:99` et `:107`, `serveur/api-direct.ts:24-25`) : deux comptes qui choisissent un filtre inhabituel ne rencontrent que l'autre. Le faux compte abandonne, et le vrai prend environ +16 points par partie, jusqu'à 40 parties par heure.
- **Cote remise à zéro** : retirer son profil puis le republier fait repartir la cote à 1 000, en joute classique comme en direct.
- **Chiffres en dur** : le direct écrit `32` et `400` et descend jusqu'à 0 (`serveur/direct.ts:205`), alors que les joutes classiques lisent `EQUILIBRAGE.joute` et s'arrêtent à 100 (`serveur/combats.ts:128`). Les deux écrivent pourtant dans la même `profils.cote`.
- **Récompense du gagnant perdue** : quand l'adversaire abandonne ou disparaît, le gagnant ne reçoit ni Encre ni XP de fin de partie (`serveur/direct.ts:190`).
- **Corrections** : trier et dédoublonner les filtres côté serveur. Ne pas modifier la cote sur un abandon avant la 2e ou la 3e manche. Limiter les rencontres répétées entre les deux mêmes joueurs. Garder la dernière cote dans `comptes`. Reprendre les chiffres de `EQUILIBRAGE.joute`. Récompenser le gagnant d'un abandon.

### 5. Les règles du tirage des paquets ne sont testées que dans le navigateur — important (tests)
- **Où** : `serveur/collections.ts:322-431` (`tirer_les_cartes`) et `:300-320` (`recompenser`).
- **Problème** : garantie d'une Légendaire au 40e paquet, paquets de départ sans doublon, Hors-série à 1 sur 1 000, Encre des doublons, plafond de 3 victoires pleines par jour… tout cela n'est testé que dans la copie TypeScript (`src/jeu/*.test.ts`), jamais dans la version SQL, qui est pourtant la seule que vivent les joueurs.
- **Risque** : une modification de l'équilibrage mal recopiée dans le SQL laisse les tests au vert pendant que les joueurs perdent leur garantie.
- **Correction** : un test PGlite avec `setseed` qui ouvre 40 paquets pour la garantie, quelques milliers pour les fréquences, et 4 victoires dans la même journée pour le plafond.

---

## Le joueur peut rester bloqué

| # | Gravité | Où | Ce qui se passe | Correction |
|---|---|---|---|---|
| 6 | important | `Collection.tsx:93`, `Marche.tsx:37`, `Reglages.tsx:29`, `Confidentialite.tsx:19`, `ceremonie/Comptoir.tsx:129`, `duel/PanneauDuDeck.tsx:122` | Si un chargement échoue, « Chargement… » s'affiche pour toujours, y compris dans Réglages et Confidentialité, les écrans qui servent justement à réparer. (Point G09 de l'audit du 23/09, toujours ouvert.) | Traiter l'état « erreur » partout, avec un bouton Réessayer. |
| 7 | moyen | `src/services/connexion.ts:35-37`, `authentification.ts:278-281` | Sans réseau, ou avec une session expirée, « Se déconnecter » échoue à chaque clic. | Appeler `/logout` dans un `try`, puis toujours effacer la session locale. |
| 8 | moyen | `src/services/partie.ts:284` | Si le fichier de l'édition ne se charge pas pendant l'ouverture, le paquet est consommé sur le serveur mais aucune carte n'est montrée. | Charger l'édition *avant* d'appeler le serveur. |
| 9 | moyen | `src/services/partie.ts:138-143`, `:191`, `:476` | Une vieille réponse `mon_compte` peut arriver après un achat et l'effacer à l'écran (Encre remontée, timbre disparu) jusqu'à la synchronisation suivante. | Faire passer `mon_compte` dans la file `chacunSonTour`, ou ignorer une réponse plus ancienne que l'état affiché. |
| 10 | moyen | `supabase.ts:80`, `collections.ts:202-211`, `marche.ts:184-186`, `amis.ts` | Mise en vente, ouverture de paquet et demande d'ami n'ont pas d'identifiant anti-doublon. Si la réponse tarde plus de 20 s et que le joueur réessaie, une deuxième vente peut être créée. | Ajouter un `p_requete uuid`, comme pour les combats et les échanges. |
| 11 | moyen | `stockage.ts:335`, `partie.ts:95-101` | Avec deux onglets ouverts, le dernier qui écrit gagne : un avatar ou des réglages changés dans l'un sont écrasés par l'autre. | Écouter les changements de `mots.sauvegarde` entre onglets (`storage` ou `BroadcastChannel`). |
| 12 | moyen | `serveur/moteur-combat.ts:92-93` | La parade n'a aucune marge pour le réseau : un clic à 14,8 s avec 400 ms d'envoi compte comme une absence de réponse, et le joueur prend les dégâts pleins. | Accorder 1 à 2 s de tolérance côté serveur. |
| 13 | mineur | `serveur/moteur-direct.ts:142` | En direct, l'attaque annoncée d'un mot face cachée oublie le bonus d'enchaînement : elle est inférieure de 1 à 2 à ce qui est réellement infligé. | Passer `bonusDEnchainement(...)` comme dans `moteur-combat.ts:116`. |
| 14 | mineur | `src/services/supabase.ts:70` | Une nouvelle tentative après un refus (401) peut réutiliser le même jeton refusé, et l'appareil passe « hors ligne ». | Relancer une ouverture de session forcée après celle en cours. |
| 15 | mineur | `src/services/supabase.ts:45` et `:93` | Si un intermédiaire renvoie une page HTML, le joueur voit « Unexpected token < ». | Convertir en message de panne. |

## Interface, accessibilité, vitesse

- **Moyen, fenêtres de duel** (`duel/Parade.tsx:69`, `duel/FinDuDuel.tsx:66`, `duel/Partie.tsx:136` et `:210`) : au clavier, Tab sort de la parade vers les onglets cachés derrière le voile, et Entrée sur un onglet quitte le duel (U03, toujours ouvert). → Rendre `#racine` inerte comme le fait la cérémonie (`Ceremonie.tsx:84`).
- **Moyen, un seul fichier JavaScript de 780 Ko** (236 Ko compressés), sans écran chargé à la demande (`App.tsx:1-24`) : Marché, Formules, Amis, Équipe, Joutes et le temps réel sont téléchargés dès l'accueil. → `React.lazy` pour les écrans secondaires.
- **Moyen, fichier de l'édition** (696 Ko) chargé à chaque démarrage par `chargerLesSucces` (`partie.ts:105`), et son nom ne change pas d'une version à l'autre (le cache peut servir une ancienne édition après une mise à jour). → Nom versionné (`edition-1.<empreinte>.json`).
- **Moyen, « Réduire les animations » pas respecté partout** : le paquet s'incline sous le pointeur (`Ceremonie.tsx:107-128`), `Comptoir.tsx:58` ignore le réglage du jeu, et le même test est copié dans 6 fichiers. → Utiliser partout `mouvementReduit()`.
- **Moyen, recherche du marché** : une requête par touche frappée, avec clignotement (`Marche.tsx:33`, M04 toujours ouvert). → Attendre 300 ms après la dernière frappe.
- **Moyen, album** : filtre et position perdus en revenant d'une fiche (C04 toujours ouvert). À vérifier : la fluidité sur un téléphone modeste au-delà de 300 timbres (filtre SVG sur chaque cachet).
- **Mineur** : onglet mobile affiché « Album » mais nommé « Collection » pour les lecteurs d'écran (`Navigation.tsx:98`). Bouton « + » de l'Encre de 28 px sur téléphone (`navigation.css:205`). Huit `window.confirm` restent en place (G10). `etroit` calculé une seule fois pendant la cérémonie (`Ceremonie.tsx:432`). Page vide 1 à 3 s avant le JavaScript (`index.html`).

## Paiements (fermés aujourd'hui, à régler AVANT l'ouverture)

- **Moyen, droit à l'effacement** : un simple clic sur « acheter » crée une ligne de paiement (`supabase/functions/_shared/paiements.ts:72`). Les déclencheurs (`serveur/9-paiements-production.sql:23`, `8-paiements-test.sql:23`) empêchent ensuite de supprimer le compte, même si Stripe n'a jamais rien enregistré. → Ne bloquer que si `client_stripe` est rempli.
- **Moyen, achat bloqué pour de bon** : si Stripe ne répond pas au premier essai et que le joueur revient plus de 23 h après, il reçoit « Contacte contact@philamots.fr » à jamais (`paiements.ts:75` et `:105`). → Retrouver le client Stripe par ses métadonnées avant d'abandonner.
- **Mineur** : « Synchroniser » peut être répété en boucle, et chaque appel coûte une dizaine d'appels Stripe (`paiements.ts:80`). → Refuser un nouvel appel dans les 10 à 30 s.
- **Mineur** : le contrôle d'âge ne compare que les années, et l'année peut être redéclarée à tout moment (`paiements.ts:65`, `serveur/1-structure.sql:971-981`). → Figer l'année après la première déclaration, et demander 19 ans avec l'année seule.
- **Mineur** : les messages d'erreur internes sont renvoyés tels quels, en 503 au lieu de 400 (`paiements.ts:121`).

## Petits points de sécurité et de données

- `historique_de_la_cote` (formule Expert) est lisible par un compte qui n'a pas encore de ligne dans `comptes` : la condition vaut NULL (`serveur/marche.ts:406`, confirmé en PGlite). → `coalesce(..., 0) < 3`.
- Filtres des paquets non contrôlés : n'importe quel tableau est accepté, de n'importe quelle taille (`collections.ts:522`, `offres.ts:56`). → Ne garder que les 4 registres connus.
- Plafond mensuel du parrain dépassable par des validations simultanées (`parrainage.ts:78-80`). → Verrouiller le parrain avant de compter.
- Fil d'activité public inondable : deux comptes qui s'échangent une Légendaire en boucle le remplissent (`activite.ts:41-61`).
- Restes après suppression : `tentatives_de_recuperation` n'est jamais purgée, des `direct_cotes` restent orphelines, et supprimer un vendeur efface ses ventes conclues (ce qui modifie la cote).
- Code de secours : pas d'index unique sur `code_hache`, et le serveur accepte n'importe quel code de 20 caractères (`recuperation.ts:35-80`). Aucun risque de le deviner (environ 99 bits).
- Défi amical : on peut désigner le joueur maison le plus faible comme adversaire (`serveur/combats.ts:72-81`). Le gain reste borné par le plafond quotidien.
- `current_date` dans le calcul des cotes dépend du fuseau de la base (`marche.ts:137-149`). Sans conséquence tant que Supabase reste en UTC.
- Pas de politique de sécurité du contenu (CSP) dans `index.html`, alors que les jetons de session sont dans `localStorage`. Aucune faille XSS n'a été trouvée, mais c'est une ceinture de sécurité peu coûteuse.
- Robots de parade : toutes les définitions sont publiques, donc un script peut répondre juste à 100 %. Limite déjà acceptée dans `SUIVI-CORRECTIONS`. Piste : repérer côté serveur les réponses trop rapides et trop parfaites.

## Rangement du dépôt

- **Anciens scripts SQL** : rejouer `5-mise-a-jour`, `6-offres` ou `8-integrite` après le 9 remettrait d'anciennes fonctions. Ce n'est pas exploitable aujourd'hui, mais ce serait un piège pour une mauvaise manipulation. → Les marquer « historique — ne pas rejouer » ou les ranger dans un dossier à part.
- **Fonctions Supabase** : déployées par copier-coller des `.ts.txt`, rien ne dit si la version en ligne est celle du dépôt. → Faire renvoyer une empreinte du code par `?action=etat` et la faire vérifier par `npm run paiements:verifier`. Figer aussi les actions GitHub par empreinte (SHA) plutôt que `@v4`.
- **Code mort vérifié** : `accueil/Enveloppe.tsx` ; `DosClassique` ; `recevoirLaCoteDuServeur`, `publierMonIdentite` (`partie.ts`) ; `tirerUnPseudonyme`, `serveurDeJoutes.adversaires` et `.classement` (`joutes.ts`) ; les chemins serveur de `commencerUnDuel`, `finirLeDuel` et `abandonnerLeDuel` (`partie.ts:374-433`), qui appellent des fonctions fermées sur le serveur. Les feuilles `carte/timbre.css`, `essaiPaquets.css` et `essaiTimbre.css` partent encore en production. `sauvegarde.ts:169-175` recopie `relireApprentissages`.
- **Code en double** : filtrage et tri entre `Collection.tsx` et `PanneauDuDeck.tsx` ; `messageDe` et `enToutesLettres` recopiés dans plusieurs écrans.
- **`filesduel.zip`** (brief et prototype du duel) est suivi par Git à la racine : à décompresser dans le dépôt ou à retirer.
- **35 documents `.md` à la racine** : les guides terminés et les anciens briefs pourraient aller dans un dossier `docs/`, pour ne garder à la racine que `README`, `ETAT-DU-PROJET` et `A-FAIRE-RAPHAEL`.

## Ce qui est solide

- **Combats vérifiés par le serveur** : le navigateur n'envoie que des commandes. Le serveur calcule le hasard (`crypto.getRandomValues`), le chronomètre, le résultat, l'Encre, l'XP et la cote. Une commande rejouée ne compte qu'une fois, et le tirage est enregistré avant d'être révélé. Le mot adverse reste caché jusqu'à la parade.
- **Base de données** : RLS sur toutes les tables, fonctions internes fermées au public, marché sous verrou. Chaque remboursement revient dans sa bourse d'origine, et aucun chemin de duplication d'Encre ou de timbre n'a été trouvé. Les échanges sont atomiques. Le filtre des pseudonymes résiste aux lettres cyrilliques, aux caractères invisibles et aux chiffres déguisés.
- **Paiements** : signature Stripe vérifiée en temps constant, événements reçus deux fois sans effet, test et production bien séparés, CORS limité à philamots.fr, secrets uniquement dans l'environnement serveur, achats refusés par le serveur tant que l'interrupteur est éteint.
- **Connexion** : Google avec PKCE, codes e-mail sans jeton dans l'adresse, verrou entre onglets pour renouveler la session, aucune clé secrète dans le dépôt.
- **Interface** : minuteries et abonnements nettoyés, clés de liste correctes, aucun débordement horizontal à 375 px sur 14 écrans, polices servies par le site sans service tiers, bonne base d'accessibilité (lien d'évitement, focus sur le titre, champs étiquetés).
- **Tests** : hasard à graine fixe, dates fixes, 393 tests stables.

## Remarque sur les constats écartés

Un examen signalait qu'on pouvait choisir n'importe quel adversaire en *joute classée*. C'est déjà impossible : un déclencheur refuse toute joute classée qui n'est pas en direct (`serveur/direct.ts:264-269`). Seule la variante « défi amical contre un joueur maison » reste, et elle est notée plus haut.
