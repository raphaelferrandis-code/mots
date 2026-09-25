import { it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPARAISONS, correspond, trierLesCartes } from './rangement.ts';
import type { CarteIndex } from '../partage/types.ts';

const carte = (mot: string, rarete: CarteIndex['rarete'], type: CarteIndex['type'], faction: string, attaque = 5, defense = 5): CarteIndex =>
  ({ id: `${mot}-nom`, mot, definition: '', type, rarete, faction, registre: [], attaque, defense });
const CARTES = [
  carte('Été', 'Commune', 'Nom', 'Latin', 3, 7),
  carte('abeille', 'Rare', 'Nom', 'Latin', 6, 2),
  carte('zélé', 'Rare', 'Adjectif', 'Grec', 6, 9),
  carte('éblouir', 'Épique', 'Verbe', 'Grec', 9, 1),
];

it('filtre par recherche (sans accents ni majuscules), rareté, nature et origine ; un critère vide ne filtre rien', () => {
  const mots = (filtre: Parameters<typeof correspond>[0]) => CARTES.filter(correspond(filtre)).map((c) => c.mot);
  assert.deepEqual(mots({}), ['Été', 'abeille', 'zélé', 'éblouir']);
  assert.deepEqual(mots({ recherche: ' ETE ' }), ['Été']);
  assert.deepEqual(mots({ rarete: 'Rare', nature: 'Nom' }), ['abeille']);
  assert.deepEqual(mots({ origine: 'Grec', rarete: '' }), ['zélé', 'éblouir']);
});

it('trie, et départage par ordre alphabétique', () => {
  const mots = (comparer: Parameters<typeof trierLesCartes>[1]) => trierLesCartes([...CARTES], comparer).map((c) => c.mot);
  assert.deepEqual(mots(COMPARAISONS.alphabet), ['abeille', 'éblouir', 'Été', 'zélé']);
  assert.deepEqual(mots(COMPARAISONS.rarete), ['éblouir', 'abeille', 'zélé', 'Été']);
  assert.equal(mots(COMPARAISONS.defense)[0], 'zélé');
});
