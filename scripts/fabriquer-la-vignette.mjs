// Photographie la vignette de partage (scripts/vignette/) et l'enregistre dans public/identite/vignette-partage.jpg.
// C'est l'image qui accompagne un lien vers le jeu sur WhatsApp, Facebook, Discord, X…
//
// Mode d'emploi : lancer le site en développement (npm run dev), puis, dans un autre terminal :
//   node scripts/fabriquer-la-vignette.mjs
// Utilise Edge ou Chrome sans fenêtre, déjà présents sur l'ordinateur. Aucune dépendance à installer.
// Format JPEG : WhatsApp ignore parfois les images de plus de 300 Ko.

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const NAVIGATEURS = [
  process.env.NAVIGATEUR,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const navigateur = NAVIGATEURS.find((chemin) => existsSync(chemin));
if (!navigateur) throw new Error('Ni Edge ni Chrome trouvés : indiquer le chemin dans la variable NAVIGATEUR.');

const adresse = process.env.ADRESSE ?? 'http://localhost:5173/scripts/vignette/index.html';
const sortie = resolve('public/identite/vignette-partage.jpg');

execFileSync(navigateur, [
  '--headless=new',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  // Laisse le temps de charger les timbres et les polices.
  '--virtual-time-budget=10000',
  `--screenshot=${sortie}`,
  adresse,
], { stdio: 'inherit' });

console.log(`Vignette enregistrée : ${sortie} (${Math.round(statSync(sortie).size / 1024)} Ko)`);
