import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CASE, PARTS_DU_TOUR, SEUIL_DU_DETACHEMENT, avancement, caseDuTimbre, disposition, melanger, parcourir, pointDuTour, surLeTour, traceDesParts, trous } from './feuille.ts';
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

  it('situe le doigt sur le tour du timbre, dedans comme dehors', () => {
    const c = { left: 100, top: 100, width: 100, height: 200 }; // tour de 600
    assert.deepEqual(surLeTour(150, 102, c), { t: 50 / 600, distance: 2 }, 'bord du haut');
    assert.deepEqual(surLeTour(203, 200, c), { t: 200 / 600, distance: 3 }, 'bord de droite, dehors');
    assert.deepEqual(surLeTour(150, 290, c), { t: 350 / 600, distance: 10 }, 'bord du bas');
    assert.deepEqual(surLeTour(90, 250, c), { t: 450 / 600, distance: 10 }, 'bord de gauche, dehors');
    assert.equal(surLeTour(150, 200, c).distance, 50, 'au milieu, loin des pointillés');
  });
  it('compte les pointillés parcourus dans n’importe quel ordre, par le plus court chemin', () => {
    const parts = Array<boolean>(PARTS_DU_TOUR).fill(false);
    assert.equal(parcourir(parts, null, 0), 1);
    assert.equal(parcourir(parts, 0.99, 0.02), 1, 'le passage par le coin de départ ne fait pas le tour complet');
    assert.ok(avancement(parts) < 0.1);
    let t = 0.02;
    for (let k = 0; k < 60; k++) { const suivant = (t + 0.015) % 1; parcourir(parts, t, suivant); t = suivant; }
    assert.ok(avancement(parts) >= SEUIL_DU_DETACHEMENT, 'un tour complet détache le timbre');
    assert.equal(parcourir(parts, 0.2, 0.3), 0, 'repasser au même endroit ne compte pas deux fois');
  });

  it('trace les pointillés arrachés le long du tour, coins compris', () => {
    const r = { x: 0, y: 0, l: 300, h: 380 };
    const arrondi = (t: number) => pointDuTour(r, t).map((v) => Math.round(v));
    assert.deepEqual(arrondi(0), [0, 0]);
    assert.deepEqual(arrondi(300 / 1360), [300, 0]);
    assert.deepEqual(arrondi(1000 / 1360), [0, 360]);
    const parts = Array<boolean>(8).fill(false);
    parts[1] = parts[2] = true; // de 1/8 à 3/8 du tour : passe le coin haut droit
    assert.equal(traceDesParts(r, parts), 'M170.0 0.0L300.0 0.0L300.0 210.0');
    assert.equal(traceDesParts(r, Array<boolean>(8).fill(false)), '');
    // Presque tout le tour, en partant du bas : les coins dans l'ordre, jamais de diagonale (retour de Raphaël, 26/09).
    const hasard = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let essai = 0; essai < 300; essai++) {
      const tirees = Array.from({ length: 48 }, () => hasard() < .8);
      for (const trace of traceDesParts(r, tirees).split('M').filter(Boolean)) {
        const points = trace.split('L').map((p) => p.split(' ').map(Number));
        for (let k = 1; k < points.length; k++) {
          const [[x0, y0], [x1, y1]] = [points[k - 1], points[k]];
          assert.ok(Math.abs(x0 - x1) < .2 || Math.abs(y0 - y1) < .2, `segment en diagonale : ${trace}`);
        }
      }
    }
    assert.match(traceDesParts(r, Array<boolean>(8).fill(true)), /Z$/);
  });
});
