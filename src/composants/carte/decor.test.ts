import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { anneeDuCachet, hasardDe, rosaceDeGuillochis } from './decor.ts';

describe('décor des timbres', () => {
  it('dessine toujours la même rosace pour la même carte, et une rosace différente pour une autre', () => {
    assert.deepEqual(rosaceDeGuillochis('callipyge-adj', 6), rosaceDeGuillochis('callipyge-adj', 6));
    assert.notDeepEqual(rosaceDeGuillochis('callipyge-adj', 6), rosaceDeGuillochis('truchement-nom', 6));
    assert.equal(rosaceDeGuillochis('callipyge-adj', 9).length, 9);
    assert.equal(hasardDe('amour-nom')(), hasardDe('amour-nom')());
  });
  it('date le cachet d\'après la première apparition du mot', () => {
    assert.equal(anneeDuCachet('1786'), '1786');
    assert.equal(anneeDuCachet('c. 1100'), '1100');
    assert.equal(anneeDuCachet('Vers 1968'), '1968');
    assert.equal(anneeDuCachet('XIIᵉ siècle'), 'XIIᵉ s.');
    assert.equal(anneeDuCachet(undefined), '····');
    assert.equal(anneeDuCachet('date inconnue'), '····');
  });
});
