import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { coteDe, decrireLesCotes, lireCotes, lireHistoire, tracerLaCourbe } from './cote.ts';

describe('la cote vue du jeu', () => {
  it('relit les cotes du serveur et ignore ce qui est illisible', () => {
    const cotes = lireCotes({ jour: '2026-09-22', cotes: [{ finition: 'Normale', cote: 120, ventes: 3 }, { finition: 'Dorée', cote: 5, ventes: 1 }, 'rien', { finition: 'Brillante', cote: 0, ventes: 0 }] });
    assert.equal(cotes.jour, '2026-09-22');
    assert.deepEqual(cotes.cotes, [{ finition: 'Normale', cote: 120, ventes: 3 }]);
    assert.deepEqual(lireCotes('rien'), { jour: null, cotes: [] });
    assert.equal(coteDe(cotes, 'Normale')?.cote, 120);
    assert.equal(coteDe(cotes, 'Brillante'), null);
  });

  it('décrit les cotes en clair', () => {
    assert.equal(decrireLesCotes(lireCotes({ cotes: [] })), null);
    assert.equal(decrireLesCotes(lireCotes({ cotes: [{ finition: 'Brillante', cote: 300, ventes: 1 }, { finition: 'Normale', cote: 120, ventes: 3 }] })), '120 Encre · brillante 300 Encre', 'la finition normale vient en premier, quel que soit l’ordre du serveur');
  });

  it('relit l’histoire : série, ventes, statistiques', () => {
    const h = lireHistoire({
      serie: [{ jour: '2026-09-21', finition: 'Normale', cote: 100, ventes: 1 }, { jour: '2026-09-22', finition: 'Normale', cote: 120, ventes: 2 }, { jour: 5, finition: 'Normale', cote: 1, ventes: 1 }],
      ventes: [{ quand: 1000, finition: 'Normale', prix: 120 }, { quand: 'x', finition: 'Normale', prix: 1 }],
      stats: [{ finition: 'Normale', mini: 100, maxi: 140, nombre: 3 }, { finition: 'Dorée', mini: 1, maxi: 1, nombre: 1 }],
    });
    assert.equal(h.serie.length, 2);
    assert.deepEqual(h.ventes, [{ quand: 1000, finition: 'Normale', prix: 120 }]);
    assert.deepEqual(h.stats, [{ finition: 'Normale', mini: 100, maxi: 140, nombre: 3 }]);
    assert.deepEqual(lireHistoire(null), { serie: [], ventes: [], stats: [] });
  });

  it('trace une courbe dans un cadre, sur l’axe du temps commun aux finitions', () => {
    const { serie } = lireHistoire({ serie: [
      { jour: '2026-09-22', finition: 'Normale', cote: 200, ventes: 1 },
      { jour: '2026-09-20', finition: 'Normale', cote: 100, ventes: 1 },
      { jour: '2026-09-21', finition: 'Brillante', cote: 300, ventes: 1 },
    ] });
    const courbe = tracerLaCourbe(serie, 'Normale', 300, 80);
    assert.ok(courbe);
    assert.deepEqual(courbe.points.map((p) => [p.x, p.y, p.cote]), [[0, 80, 100], [300, 0, 200]]);
    assert.equal(courbe.mini, 100);
    assert.equal(courbe.maxi, 200);
    const seule = tracerLaCourbe(serie, 'Brillante', 300, 80);
    assert.deepEqual(seule?.points.map((p) => [p.x, p.y]), [[150, 40]], 'une cote seule et constante : au milieu');
    assert.equal(tracerLaCourbe(serie, 'Holographique', 300, 80), null);
  });
});
