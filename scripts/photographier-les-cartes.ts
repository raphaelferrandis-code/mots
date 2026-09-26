// Prend en photo les images de la devinette du jour (dist/partage/question/<adresse>/ et dist/partage/reponse/<adresse>/,
// fabriquées par fabriquer-les-pages.ts) : des JPEG de 1080 × 1350, prêts pour Instagram, Facebook et Bluesky.
// Chaque mot donne <adresse>-question.jpg et <adresse>-reponse.jpg.
//
//   node scripts/photographier-les-cartes.ts --site https://philamots.fr/ --sortie images zakouski callipyge
//   node scripts/photographier-les-cartes.ts --premiers 12      (les 12 premiers mots du calendrier, sur le site local)
//
// Le navigateur est le Chrome installé sur la machine (celui du poste de Raphaël, ou celui des serveurs de GitHub) :
// rien à télécharger.

import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { lireCalendrier } from '../pipeline/etapes/motDuJour.ts';
import { adressesDesPages } from '../src/partage/pagesDesMots.ts';
import type { IndexEdition } from '../src/partage/types.ts';

const RACINE = path.join(import.meta.dirname, '..');
const args = process.argv.slice(2);
const option = (nom: string): string | undefined => { const i = args.indexOf(nom); return i === -1 ? undefined : args.splice(i, 2)[1]; };
const site = (option('--site') ?? 'http://localhost:4176/').replace(/\/?$/, '/');
const sortie = path.resolve(RACINE, option('--sortie') ?? 'data/cartes');
const premiers = Number(option('--premiers') ?? 0);

const edition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8')) as IndexEdition;
const adresses = adressesDesPages(edition.cartes);
const calendrier = lireCalendrier(readFileSync(path.join(RACINE, 'data', 'mot-du-jour.txt'), 'utf8')).ids;
const voulues = premiers > 0 ? calendrier.slice(0, premiers).map((id) => adresses.get(id)!) : args;
if (voulues.length === 0) {
  console.error('Donner des adresses de mots (zakouski callipyge…) ou --premiers N.');
  process.exit(1);
}

mkdirSync(sortie, { recursive: true });
const navigateur = await chromium.launch({ channel: 'chrome' });
try {
  const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const adresse of voulues) {
    for (const genre of ['question', 'reponse']) {
      const reponse = await page.goto(`${site}partage/${genre}/${adresse}/`, { waitUntil: 'networkidle' });
      if (!reponse?.ok()) { console.warn(`    ⚠️ ${adresse} (${genre}) : pas d'image (${reponse?.status() ?? 'sans réponse'})`); continue; }
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.carte-partage').screenshot({ path: path.join(sortie, `${adresse}-${genre}.jpg`), type: 'jpeg', quality: 90 });
      console.log(`    ${adresse}-${genre}.jpg`);
    }
  }
} finally {
  await navigateur.close();
}
