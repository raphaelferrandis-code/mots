import { it } from 'node:test';
import assert from 'node:assert/strict';
import { premiersJours, premiersJoursDuPaquet } from './premierJour.ts';
import type { Rarete } from '../partage/types.ts';

const RARETES: Record<string, Rarete> = {
  anse: 'Commune', bief: 'Rare', chorba: 'Épique', dune: 'Épique', ebene: 'Légendaire', faste: 'Hors-série', gnome: 'Épique',
};
const rareteDe = (id: string): Rarete | undefined => RARETES[id];

it('marque le plus ancien timbre de chaque grande rareté, et rien en dessous d’Épique', () => {
  const album = { anse: { obtenueLe: 1 }, bief: { obtenueLe: 2 }, dune: { obtenueLe: 30 }, chorba: { obtenueLe: 20 }, ebene: { obtenueLe: 40 }, faste: { obtenueLe: 50 } };
  assert.deepEqual([...premiersJours(album, rareteDe)].sort(), ['chorba', 'ebene', 'faste']);
});

it('départage deux timbres obtenus au même instant par leur identifiant, et ignore un mot inconnu de l’édition', () => {
  const album = { gnome: { obtenueLe: 7 }, dune: { obtenueLe: 7 }, inconnu: { obtenueLe: 1 } };
  assert.deepEqual([...premiersJours(album, rareteDe)], ['dune']);
});

it('dans un paquet, ne marque que la rareté qui manquait à l’album', () => {
  const avant = { chorba: { obtenueLe: 5 }, anse: { obtenueLe: 1 } };
  const apres = { ...avant, dune: { obtenueLe: 9 }, ebene: { obtenueLe: 9 } };
  // La nouvelle Épique n'est pas la première (chorba l'était) ; la Légendaire, si.
  assert.deepEqual([...premiersJoursDuPaquet(avant, apres, rareteDe)], ['ebene']);
  assert.equal(premiersJoursDuPaquet(apres, apres, rareteDe).size, 0);
});
