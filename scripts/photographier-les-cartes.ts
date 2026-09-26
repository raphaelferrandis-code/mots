// Prend en photo les images de la devinette du jour (dist/partage/question/<adresse>/ et dist/partage/reponse/<adresse>/,
// fabriquées par fabriquer-les-pages.ts) : des JPEG de 1080 × 1350, prêts pour Instagram, Facebook et Bluesky.
// Chaque mot donne <adresse>-question.jpg et <adresse>-reponse.jpg.
//
//   node scripts/photographier-les-cartes.ts --site https://philamots.fr/ --sortie images zakouski callipyge
//   node scripts/photographier-les-cartes.ts --premiers 12      (les 12 premiers mots du calendrier, sur le site local)
//
// Le navigateur est le Chrome installé sur la machine (scripts/publication/photographe.ts) : rien à télécharger.

import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { lireCalendrier } from '../pipeline/etapes/motDuJour.ts';
import { adressesDesPages } from '../src/partage/pagesDesMots.ts';
import type { IndexEdition } from '../src/partage/types.ts';
import { photographier } from './publication/photographe.ts';

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
const photos = await photographier(site, voulues.flatMap((adresse) => (['question', 'reponse'] as const).map((genre) => ({ adresse, genre }))),
  (adresse, genre) => path.join(sortie, `${adresse}-${genre}.jpg`));
for (const p of photos) console.log(`    ${path.basename(p.chemin)}`);
