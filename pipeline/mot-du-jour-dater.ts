// Fixe le premier jour du mot du jour, le jour du lancement : npm run motdujour:dater -- 2026-11-02
// La liste ne change pas ; seuls les mots à date fixe (Halloween, Noël…) sont reposés à leur date.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { dater, ecrireCalendrier, lireCalendrier } from './etapes/motDuJour.ts';

const fichier = path.join(import.meta.dirname, '..', 'data', 'mot-du-jour.txt');
const debut = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(debut ?? '') || Number.isNaN(Date.parse(debut))) {
  console.error('Donner le premier jour : npm run motdujour:dater -- AAAA-MM-JJ');
  process.exit(1);
}
const { ids } = lireCalendrier(readFileSync(fichier, 'utf8'));
writeFileSync(fichier, ecrireCalendrier({ debut, ids: dater(ids, debut) }));
console.log(`Mot du jour : ${ids.length} jours à partir du ${debut}.`);
