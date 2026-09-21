import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { anneeDuCachet, hasardDe, motifDuTimbre } from './decor.ts';

describe('décor des timbres', () => {
  it('dessine toujours la même rosace pour la même carte, et une rosace différente pour une autre', () => {
    assert.deepEqual(motifDuTimbre('callipyge-adj', 6), motifDuTimbre('callipyge-adj', 6));
    assert.notDeepEqual(motifDuTimbre('callipyge-adj', 6), motifDuTimbre('truchement-nom', 6));
    assert.ok(motifDuTimbre('callipyge-adj', 4).length >= 4);
    // Tous les motifs tiennent dans la vignette (un carré de 60 de côté).
    for (const id of ['callipyge-adj', 'amour-nom', 'casquette-nom', 'ersatz-nom', 'truchement-nom', 'être-verbe', 'zeugma-nom', 'fondu-nom']) {
      for (const chemin of motifDuTimbre(id, 4)) for (const n of chemin.match(/-?\d+(\.\d+)?/g)!.map(Number)) assert.ok(n >= 0 && n <= 60, `${id} : ${n}`);
    }
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
