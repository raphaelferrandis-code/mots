# Brancher le serveur des joutes (Supabase) — guide pas à pas

*Pour Raphaël. Compter une demi-heure. Aucune ligne de commande : tout se fait dans le navigateur.*

Tant que ce guide n'est pas suivi, le jeu fonctionne comme aujourd'hui (les joutes se jouent sans serveur). Une fois le serveur branché, les joutes opposent de vrais joueurs, la cote est tenue par le serveur, et deux joueurs ne peuvent plus porter le même pseudonyme.

> **Fait le 21 septembre 2026.** Le serveur est branché, et la première mise en route a été vérifiée de bout en bout contre le vrai projet : compte anonyme, profil, adversaires, classement, pseudonymes (déjà pris, mots refusés), une joute complète avec la cote qui bouge, les garde-fous, et l'effacement d'un profil. Ce guide reste utile pour refaire l'installation, ou recoller un script après une modification.

> **Les menus de Supabase changent de temps en temps.** Si un nom de menu ne correspond plus, cherchez le mot le plus proche, ou envoyez-moi une capture d'écran.

---

## Ce qu'il ne faut jamais faire

- **Ne me donnez jamais** le mot de passe de votre compte Supabase, ni le mot de passe de la base, ni une clé qui commence par `sb_secret_` (ou qui s'appelle `service_role`). Je n'en ai pas besoin, et je n'ai pas le droit de les manipuler.
- **Ne mettez jamais** une de ces clés secrètes dans un fichier du jeu : le dépôt GitHub est public.
- Les deux seules valeurs à recopier dans le jeu sont **publiques par nature** (étape 5). Elles peuvent être vues de tous sans danger : ce sont les règles installées à l'étape 4 qui protègent les données.

---

## Étape 1 — Créer le compte et le projet

1. Aller sur **https://supabase.com** → **Start your project**.
2. Créer un compte (le plus simple : **Continue with GitHub**, avec votre compte GitHub existant).
3. Créer une organisation si on vous le demande (nom libre, formule **Free**).
4. **New project** :
   - **Name** : `mots`
   - **Database password** : cliquer sur **Generate a password**, puis le ranger dans votre gestionnaire de mots de passe. Vous n'en aurez pas besoin pour ce guide, mais il ne pourra pas être relu plus tard.
   - **Region** : une région d'Europe (par exemple Paris ou Francfort) — les données des joueurs restent ainsi dans l'Union européenne.
   - Formule **Free**.
5. **Create new project**, puis patienter une à deux minutes.

## Étape 2 — Autoriser les comptes anonymes

Le jeu ne demande ni adresse e-mail ni mot de passe aux joueurs : chacun reçoit un compte anonyme, attaché à son appareil.

1. Menu de gauche : **Authentication**.
2. Chercher **Sign In / Providers** (ou **Providers**).
3. Activer **Allow anonymous sign-ins**, puis **Save changes** — sans ce dernier clic, le réglage n'est pas gardé. (Laisser **Allow new users to sign up** activé.)

*Si cette étape est oubliée, le jeu affiche, dans les joutes : « Le serveur des joutes n'accepte pas de nouveau joueur pour l'instant. »*

*À savoir : Supabase conseille d'ajouter plus tard un contrôle anti-robot invisible (« CAPTCHA »), pour qu'on ne puisse pas créer des milliers de faux comptes. Par défaut, il limite déjà les créations à 30 par heure et par adresse. On verra cela quand le jeu aura du public.*

## Étape 3 — Ouvrir l'éditeur SQL

Menu de gauche : **SQL Editor** → **New query** (ou le bouton **+**).

> ⚠️ **Le piège « Logs ».** En haut à droite de l'éditeur, juste à gauche du bouton **Save**, un petit menu indique où la requête est envoyée. Il doit afficher **Database** (la base de données). S'il affiche **Logs**, la requête part vers le *journal* du projet, qui ne comprend pas nos scripts : un bandeau parle de « ClickHouse », et **Run** répond `Failed to get project's logs`. Rien n'est cassé et rien n'a été installé : ouvrir ce menu, choisir **Database**, puis relancer **Run**. Ne pas cliquer sur **Rewrite with Assistant** (il réécrirait le script dans un autre langage) ; **Dismiss** ferme le bandeau.

## Étape 4 — Coller les deux scripts

Les scripts sont dans le dossier `serveur/` du projet. Sur GitHub : ouvrir le fichier, cliquer sur **Raw**, tout sélectionner (`Ctrl + A`), copier (`Ctrl + C`).

1. **`serveur/1-structure.sql`** → coller dans l'éditeur → **Run** (ou `Ctrl + Entrée`).
   Résultat attendu, en bas : **Success. No rows returned**.
   *(Supabase peut afficher un avertissement du type « cette requête contient des opérations destructrices » : c'est normal, le script vide et remplit la liste des mots interdits. Confirmer.)*
2. **New query**, puis **`serveur/2-joueurs-maison.sql`** → coller → **Run**.
   Ce fichier est gros (220 Ko) : le collage peut prendre quelques secondes. Même résultat attendu.

**Vérification** : menu **Table Editor** → la table **profils** doit contenir 240 lignes, la table **mots_interdits** une centaine, la table **joutes** aucune.
Un petit cadenas ou la mention **RLS enabled** doit apparaître sur les trois tables : c'est ce qui empêche quiconque de lire ou d'écrire directement dedans.

Ces deux scripts peuvent être relancés autant de fois qu'on veut : ils ne touchent jamais aux profils des vrais joueurs.

## Étape 5 — Relever les deux valeurs publiques

1. Menu **Project Settings** (la roue dentée) → **API Keys**. Le bouton **Connect**, en haut de page, les affiche aussi.
2. Relever :
   - l'adresse du projet, **Project URL**, de la forme `https://abcdefghijklmnop.supabase.co` ;
   - la clé **publishable** — elle commence par `sb_publishable_`.
3. ⚠️ **Ne pas prendre** la clé **secret** (`sb_secret_…`), ni l'ancienne clé `service_role`.

## Étape 6 — Les recopier dans le jeu

Le fichier à modifier est **`src/config/serveur.ts`**. Le plus simple est de le faire sur GitHub :

1. Ouvrir https://github.com/raphaelferrandis-code/mots/blob/main/src/config/serveur.ts
2. Cliquer sur le **crayon** (Edit this file).
3. **Tout en bas du fichier**, remplacer les deux guillemets vides par vos valeurs, **entre les guillemets**. (Les lignes du haut, qui commencent par `//`, sont des explications : le jeu ne les lit pas, il ne faut rien y écrire.)

   ```ts
   export const SERVEUR = {
     adresse: 'https://abcdefghijklmnop.supabase.co',
     clePublique: 'sb_publishable_xxxxxxxxxxxxxxxxxxxx',
   };
   ```
4. **Commit changes…** → **Commit changes**.

GitHub republie alors le site tout seul (deux à sept minutes ; suivi dans l'onglet **Actions**).

**Prévenez-moi à ce moment-là** : je vérifierai avec vous que tout fonctionne (voir l'étape 7), et je corrigerai ce qui doit l'être.

## Étape 7 — Vérifier

Sur le site, écran **Duel** → onglet **Joutes classées** :

| Ce qu'on fait | Ce qu'on doit voir |
|---|---|
| Ouvrir l'onglet | Votre pseudonyme, votre cote, trois adversaires proposés |
| Dans Supabase : **Authentication → Users** | Un utilisateur **anonyme** de plus |
| Dans Supabase : **Table Editor → profils** | Une 241ᵉ ligne : la vôtre, avec `maison` à `false` |
| Changer de pseudonyme pour un mot grossier | Refus, avec un message |
| Prendre le pseudonyme d'un autre joueur du classement | « Ce pseudonyme est déjà pris. » |
| Jouer une joute jusqu'au bout | La cote bouge ; une ligne apparaît dans la table **joutes** |
| Ouvrir le site sur un second appareil, y jouer une joute | Les deux joueurs apparaissent dans le classement l'un de l'autre |

---

## La vie du serveur

**Le projet s'est endormi.** Avec la formule gratuite, Supabase met un projet en sommeil après une semaine sans aucune activité. Les joutes affichent alors « Le serveur des joutes ne répond pas » (l'entraînement contre l'ordinateur, lui, fonctionne toujours). Pour le réveiller : ouvrir le tableau de bord Supabase → le projet → **Restore project**. Tant que le jeu a peu de joueurs, cela peut arriver.

**Ajouter un mot interdit dans les pseudonymes.** Modifier `src/config/pseudos-interdits.ts`, me demander de lancer `npm run serveur:script`, puis recoller `serveur/1-structure.sql` dans l'éditeur SQL (étape 4). Un test automatique signale si les scripts ne sont plus à jour.

**Changer un pseudonyme choquant qui serait passé au travers** (éditeur SQL) :

```sql
update public.profils set pseudo = 'Joueur 4821', pseudo_cle = 'joueur4821' where pseudo = 'LePseudoEnQuestion';
```

**Retirer les joueurs maison**, le jour où il y a assez de vrais joueurs :

```sql
delete from public.profils where maison;
```

**Débrancher le serveur** : remettre deux guillemets vides dans `src/config/serveur.ts`. Le jeu revient aussitôt au fonctionnement sans serveur ; la dernière cote connue reste sur l'appareil de chaque joueur.

**Tout effacer et repartir de zéro** (éditeur SQL), puis refaire l'étape 4 :

```sql
drop table if exists public.joutes, public.profils, public.mots_interdits cascade;
```

## Ce que le serveur garde sur un joueur

Un identifiant technique, son pseudonyme, sa cote, les dix cartes de son deck, et des compteurs de bonnes réponses. **Ni nom, ni adresse e-mail, ni localisation.** Le jeu a une page « Confidentialité » (dans les Réglages) qui l'explique au joueur, avec un bouton « Supprimer mon profil de joute » : il efface le profil, les joutes et le compte anonyme (fonction `supprimer_mon_profil`).

## Ce que ce classement vaut

C'est un classement **« de confiance »** (voir `BRIEF-joutes.md`, §5) : le téléphone du joueur annonce le résultat de la joute, et le serveur calcule la cote. Le serveur refuse les abus les plus grossiers (plus de 40 joutes par heure, une joute de moins de 45 secondes, un résultat annoncé deux fois), mais un tricheur décidé peut gonfler sa cote. C'est suffisant entre amis et pour des testeurs ; ce ne l'est pas pour un classement avec des récompenses de valeur.
