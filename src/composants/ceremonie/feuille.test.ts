import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CASE, caseDuTimbre, disposition, melanger, trous } from './feuille.ts';
import { dentelure } from '../timbre/dessins.ts';

describe('la feuille de timbres', () => {
  it('range six timbres en 3 × 2 sur ordinateur et en 2 × 3 sur téléphone, avec les marges de la maquette', () => {
    assert.deepEqual(disposition(6, false), { colonnes: 3, rangees: 2, timbres: 6, gauche: 64, haut: 124, largeur: 1028, hauteur: 968 });
    assert.deepEqual(disposition(6, true), { colonnes: 2, rangees: 3, timbres: 6, gauche: 64, haut: 146, largeur: 728, hauteur: 1370 });
    assert.deepEqual([disposition(1, false).colonnes, disposition(1, false).rangees], [1, 1], 'un paquet d’un seul timbre');
  });
  it('voit la feuille de dos au verso : les colonnes s’inversent, les rangées restent', () => {
    for (const etroite of [false, true]) {
      const d = disposition(6, etroite);
      for (let i = 0; i < 6; i++) {
        const recto = caseDuTimbre(i, d, false), verso = caseDuTimbre(i, d, true);
        assert.equal(verso.y, recto.y);
        assert.equal(verso.x, d.largeur - recto.x - CASE.largeur, `timbre ${i + 1}`);
      }
    }
  });
  it('perce la feuille là où le timbre détaché a ses dents', () => {
    // Les creux de la dentelure du timbre (dessins.ts) : les centres des arcs sur ses quatre bords.
    const creux = new Set<string>();
    for (const m of dentelure(CASE.largeur, CASE.hauteur, CASE.rayon, CASE.pas).matchAll(/L(-?[\d.]+) (-?[\d.]+)A7 7 0 0 0 (-?[\d.]+) (-?[\d.]+)/g)) {
      creux.add(`${(Number(m[1]) + Number(m[3])) / 2},${(Number(m[2]) + Number(m[4])) / 2}`);
    }
    const d = disposition(6, false);
    for (let i = 0; i < 6; i++) {
      const r = caseDuTimbre(i, d, false);
      const autour = trous(d, false).filter((t) => t.x >= r.x && t.x <= r.x + r.l && t.y >= r.y && t.y <= r.y + r.h && (t.x === r.x || t.x === r.x + r.l || t.y === r.y || t.y === r.y + r.h));
      assert.deepEqual(new Set(autour.map((t) => `${t.x - r.x},${t.y - r.y}`)), creux, `timbre ${i + 1}`);
    }
  });
  it('ne perce chaque bord qu’une fois', () => {
    const d = disposition(6, false);
    // 4 bords verticaux × 2 rangées × 19 trous, 3 bords horizontaux × 3 colonnes × 15 trous.
    assert.equal(trous(d, false).length, 4 * 2 * 19 + 3 * 3 * 15);
    assert.equal(new Set(trous(d, false).map((t) => `${t.x},${t.y}`)).size, trous(d, false).length);
  });
  it('mélange la place des timbres selon le paquet seulement', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    assert.deepEqual(melanger(ids, 'paquet-1'), melanger(ids, 'paquet-1'));
    assert.deepEqual([...melanger(ids, 'paquet-1')].sort(), ids);
    const places = new Set(Array.from({ length: 40 }, (_, k) => melanger(ids, `paquet-${k}`).indexOf('f')));
    assert.ok(places.size >= 5, 'le dernier timbre du serveur ne tombe pas toujours dans la même case');
  });
});
