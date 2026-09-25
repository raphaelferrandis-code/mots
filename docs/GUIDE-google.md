# Faire connaître Philamots à Google (et à Bing)

*Écrit le 25 septembre 2026.* Le site est déjà en ligne et public. Ce guide sert à dire aux moteurs de recherche
qu'il existe, pour qu'il apparaisse quand quelqu'un cherche « Philamots » ou « jeu de cartes de mots ».

## Ce qui est déjà fait dans le site

- **La vignette de partage** : quand on colle `philamots.fr` dans WhatsApp, Facebook, Discord ou X, une image
  apparaît avec le logo et trois timbres (`public/identite/vignette-partage.jpg`). Pour la refaire :
  `npm run dev`, puis `node scripts/fabriquer-la-vignette.mjs`.
- **Le titre et la description** que Google affiche : « Philamots — collectionne les mots de la langue française ».
- **Le plan du site** (`public/sitemap.xml`) et les règles pour les robots des moteurs (`public/robots.txt`).
- **La fiche du jeu** lisible par les moteurs (nom, gratuit, en français), dans `index.html`.

Les écrans du jeu vivent après le « # » de l'adresse (`philamots.fr/#/collection`). Les moteurs ne les
distinguent pas : seule la page d'accueil apparaîtra dans les résultats. C'est normal pour un jeu.

## Ce que Raphaël doit faire : Google Search Console (10 minutes)

C'est un outil gratuit de Google. Il faut s'y inscrire soi-même avec son compte Google.

1. Aller sur **https://search.google.com/search-console** et se connecter avec son compte Google.
2. Cliquer sur **Ajouter une propriété**. Choisir la case de droite, **Préfixe de l'URL**, et saisir
   `https://philamots.fr/`. Cliquer sur **Continuer**.
3. Google propose plusieurs façons de prouver que le site est à vous. Ouvrir **Balise HTML** : une ligne apparaît,
   qui ressemble à `<meta name="google-site-verification" content="…" />`.
4. **Copier cette ligne et me l'envoyer** dans la conversation. Elle n'est pas secrète : tout le monde peut la lire
   dans le site. Je l'ajoute au site et je le publie (quelques minutes).
5. Quand je vous dis que c'est publié, revenir sur la page de Google et cliquer sur **Valider**.
6. Dans le menu de gauche, ouvrir **Sitemaps**, écrire `sitemap.xml` dans la case, puis cliquer sur **Envoyer**.
7. En haut, dans la barre **Inspecter n'importe quelle URL**, coller `https://philamots.fr/`, puis cliquer sur
   **Demander une indexation**.

Il faut ensuite compter quelques jours, parfois deux semaines, avant que le site apparaisse dans Google.
Search Console montrera alors combien de personnes ont vu le site dans les résultats et cliqué dessus.

## Ensuite : Bing, en un clic (2 minutes)

Bing alimente aussi DuckDuckGo, Ecosia et Qwant (en partie).

1. Aller sur **https://www.bing.com/webmasters** et se connecter avec le même compte Google.
2. Choisir **Importer depuis Google Search Console** et accepter. Le site et son plan sont repris
   automatiquement.

## À savoir

Au début, les moteurs de recherche amènent peu de monde à un jeu nouveau. Les premiers joueurs viennent surtout
du bouche-à-oreille : proches, testeurs, groupes de passionnés de mots, réseaux sociaux. D'où la vignette de
partage, qui rend chaque lien envoyé plus engageant.
