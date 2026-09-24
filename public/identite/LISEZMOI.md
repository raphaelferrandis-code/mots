# philamots — L’italique

Version vectorielle de la direction 01, retenue le 24 septembre 2026.

Le dessin reprend l’esprit de la maquette à partir de Playfair Display Italic 400,
la même famille que les titres du site, convertie en contours avec le moteur Windows. Il s’agit d’une adaptation
typographique de la maquette, pas d’un décalquage exact de l’image générée.
Les SVG ne contiennent ni texte dépendant d’une police, ni image incorporée,
ni ressource distante. Aucun fichier de police n’est distribué.

## Fichiers

- `philamots-clair.svg` : logo du site, #E0EDFA sur fond transparent, prévu pour le bleu nuit #0B1729.
- `philamots-brun.svg` : déclinaison pour support clair, encre #352219, fond transparent.
- `philamots-creme.svg` : version claire #F5F1E8 pour fond sombre, fond transparent.
- `philamots-noir.svg` : version noire pour impression monochrome.
- `philamots-clair.png`, `philamots-brun.png` et `philamots-creme.png` : exports transparents de 2 400 px de large.
- `monogramme-brun.svg` : lettre « p » seule sur fond transparent.
- `favicon.svg` : « p » sur carré crème arrondi ; les traits sont légèrement renforcés.
- `favicon.ico` : icône contenant les tailles 16, 32 et 48 px.
- `icone-16.png`, `icone-32.png`, `icone-48.png` : exports aux tailles natives.
- `icone-180.png` : icône pour écran d’accueil mobile.
- `favicon-site.svg` et `icone-site-16.png`, `icone-site-32.png`, `icone-site-48.png`, `icone-site-180.png` : monogramme clair sur bleu nuit, utilisé par le site.

## Utilisation

Garder les proportions. Le site utilise la version claire sur bleu nuit ; les
supports papier peuvent utiliser le brun sur crème. Le logo complet a été contrôlé à 120 et 180 px de large ; pour
les très petites surfaces, utiliser le monogramme. Laisser autour du logo
un espace libre d’au moins la hauteur du « i ».

Exemple HTML :

```html
<img src="./identite/philamots-clair.svg" alt="philamots" width="164" />
<link rel="icon" type="image/png" sizes="32x32" href="./identite/icone-site-32.png" />
<link rel="icon" type="image/svg+xml" href="./identite/favicon-site.svg" />
<link rel="apple-touch-icon" href="./identite/icone-site-180.png" />
```

Le logo est intégré dans la navigation : largeur 164 px sur ordinateur, 148 px
sur tablette et 132 px sur mobile. Le lien conserve son nom accessible « Philamots — accueil ».
Les icônes sont déclarées dans `index.html` avec des chemins compatibles avec un sous-dossier.

## Reproduction

Sur Windows, après installation des dépendances du projet (aucune police système requise) :

```powershell
./scripts/creer-identite-philamots.ps1
node scripts/apercu-identite-philamots.cjs <chemin-du-module-sharp>
```

Le second script produit les PNG et la planche `output/identite/philamots-identite.png`.
