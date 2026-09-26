// Écrit public/data/devinettes.json à partir du calendrier (data/mot-du-jour.txt) : la devinette de chaque jour,
// lue par l'accueil du jeu, les cartes des réseaux sociaux et le programme de publication. Appelé par
// « npm run motdujour:dater » et « npm run motdujour:devinettes » ; un test vérifie que le fichier suit le calendrier.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { composerLesDevinettes } from '../../src/jeu/devinette.ts';
import type { Devinettes } from '../../src/jeu/devinette.ts';
import { nomDuLot } from '../../src/partage/lots.ts';
import type { CarteDetails, Definition, IndexEdition } from '../../src/partage/types.ts';
import { lireCalendrier } from './motDuJour.ts';

const RACINE = path.join(import.meta.dirname, '..', '..');
export const FICHIER_DES_DEVINETTES = path.join(RACINE, 'public', 'data', 'devinettes.json');

export function fabriquerLesDevinettes(): Devinettes {
  const lire = (...morceaux: string[]): string => readFileSync(path.join(RACINE, ...morceaux), 'utf8');
  const edition = JSON.parse(lire('public', 'data', 'edition-1.index.json')) as IndexEdition;
  const definitions = new Map<string, Definition[]>();
  const origines = new Map<string, string>();
  for (let lot = 0; lot < edition.meta.lots; lot++) {
    const details = JSON.parse(lire('public', 'data', 'details', nomDuLot(lot))) as Record<string, CarteDetails>;
    for (const [id, d] of Object.entries(details)) { definitions.set(id, d.definitions); origines.set(id, d.langueOrigine); }
  }
  const { debut, ids } = lireCalendrier(lire('data', 'mot-du-jour.txt'));
  return { debut, jours: composerLesDevinettes(ids, edition.cartes, definitions, origines) };
}

export function ecrireLesDevinettes(): Devinettes {
  const devinettes = fabriquerLesDevinettes();
  writeFileSync(FICHIER_DES_DEVINETTES, `${JSON.stringify(devinettes)}\n`);
  return devinettes;
}
