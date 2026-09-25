import { it } from 'node:test';
import assert from 'node:assert/strict';
import { presence } from './presence.ts';

it('la présence d’un ami se dit en clair, du plus récent au plus ancien', () => {
  const maintenant = Date.UTC(2026, 8, 25, 12);
  const il = (minutes: number) => presence(maintenant - minutes * 60_000, maintenant)?.texte;
  assert.equal(presence(null, maintenant), null);
  assert.equal(presence(undefined, maintenant), null);
  assert.deepEqual(presence(maintenant - 60_000, maintenant), { enLigne: true, texte: 'En ligne' });
  assert.equal(presence(maintenant + 60_000, maintenant)?.texte, 'En ligne', 'une horloge en avance ne fait pas remonter le temps');
  assert.equal(il(12), 'Passage il y a 12 min');
  assert.equal(il(125), 'Passage il y a 2 h');
  assert.equal(il(30 * 60), 'Passage hier');
  assert.equal(il(3 * 24 * 60), 'Passage il y a 3 jours');
  assert.equal(il(10 * 24 * 60), 'Passage le 15 septembre');
});
