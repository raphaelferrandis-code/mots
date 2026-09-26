// Refait public/data/devinettes.json après une retouche à la main de data/mot-du-jour.txt : npm run motdujour:devinettes

import { ecrireLesDevinettes } from './etapes/devinettes.ts';

const { jours } = ecrireLesDevinettes();
console.log(`${jours.length} devinettes écrites dans public/data/devinettes.json.`);
