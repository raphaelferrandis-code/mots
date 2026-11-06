// Tests : les joueurs simulés du fil d'activité, et leur mélange avec les vrais événements.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fabriquerLesJoueursMaison } from '../jeu/joueursMaison.ts';
import type { IndexEdition } from '../partage/types.ts';
import type { EvenementDuFil } from './activite.ts';
import { melangerLeFil } from './activite.ts';
import { RYTHME_PAR_HEURE, evenementsSimules } from './filSimule.ts';

const edition = JSON.parse(readFileSync(path.join(import.meta.dirname, '..', '..', 'public', 'data', 'edition-1.index.json'), 'utf8')) as IndexEdition;
const cartes = edition.cartes;
const HEURE = 3_600_000;
// Le 6 novembre 2026 à 21 h, heure de Paris (20 h UTC, en hiver).
const SOIR = Date.UTC(2026, 10, 6, 20, 0);

describe('les joueurs simulés du fil', () => {
  it('le même fil pour tout le monde, et rien dans le futur', () => {
    const a = evenementsSimules(SOIR, cartes);
    assert.deepEqual(evenementsSimules(SOIR, cartes), a);
    assert.ok(a.length > 0);
    assert.ok(a.every((e) => e.le <= SOIR && e.le > SOIR - 12 * HEURE));
    // Deux minutes plus tard, les mêmes événements, plus peut-être un nouveau.
    const ensuite = evenementsSimules(SOIR + 120_000, cartes);
    assert.ok(a.filter((e) => e.le > SOIR - 11 * HEURE).every((e) => ensuite.some((f) => f.le === e.le && f.pseudo === e.pseudo)));
  });
  it('des trouvailles et des victoires de joueurs maison, jamais d’arrivée ni de cote', () => {
    const pseudos = new Set(fabriquerLesJoueursMaison(cartes).map((j) => j.pseudo));
    const semaine = Array.from({ length: 14 }, (_, i) => evenementsSimules(SOIR - i * 12 * HEURE, cartes)).flat();
    assert.ok(semaine.every((e) => pseudos.has(e.pseudo)), 'les pseudonymes des joueurs maison du serveur');
    assert.ok(semaine.every((e) => e.genre !== 'arrivee' && e.cote === null));
    const trouvailles = semaine.filter((e) => e.genre === 'trouvaille');
    assert.ok(trouvailles.length > 0 && semaine.some((e) => e.genre === 'victoire'));
    assert.ok(trouvailles.every((e) => e.rarete === 'Légendaire' ? e.finition === 'Normale' : e.finition === 'Holographique'));
    const parMot = new Map(cartes.map((c) => [c.mot, c]));
    assert.ok(trouvailles.every((e) => parMot.get(e.mot!)?.registre.length === 0), 'ni mot familier ni injurieux');
  });
  it('le rythme d’un vrai jeu : bien plus le soir que la nuit', () => {
    const jours = 30;
    const compter = (heureUtc: number): number => Array.from({ length: jours }, (_, j) => evenementsSimules(Date.UTC(2026, 10, 1 + j, heureUtc, 0), cartes, 1).length).reduce((a, b) => a + b, 0);
    const soir = compter(20) / jours; // 20 h → 21 h à Paris
    const nuit = compter(3) / jours; // 3 h → 4 h à Paris
    assert.ok(soir > 3 && soir < 7, `${soir.toFixed(1)} par heure le soir`);
    assert.ok(nuit < 1, `${nuit.toFixed(1)} par heure la nuit`);
    assert.equal(RYTHME_PAR_HEURE.length, 24);
  });
});

describe('le mélange du fil', () => {
  const evenement = (pseudo: string, le: number): EvenementDuFil => ({ genre: 'victoire', pseudo, mot: null, rarete: null, finition: null, cote: null, le });
  it('les vrais événements récents restent, même quand les joueurs simulés sont nombreux', () => {
    const reels = [evenement('samuel', SOIR - 30 * HEURE), evenement('leopold', SOIR - 5 * HEURE)];
    const simules = Array.from({ length: 40 }, (_, i) => evenement(`Simulé ${i}`, SOIR - i * 600_000));
    const fil = melangerLeFil(reels, simules, SOIR);
    assert.equal(fil.length, 24);
    assert.ok(fil.some((e) => e.pseudo === 'samuel') && fil.some((e) => e.pseudo === 'leopold'));
    assert.deepEqual(fil.map((e) => e.le), [...fil.map((e) => e.le)].sort((a, b) => b - a), 'du plus récent au plus ancien');
  });
  it('les vrais événements anciens comblent seulement la place qui reste', () => {
    const ancien = evenement('Faekia', SOIR - 30 * 24 * HEURE);
    assert.ok(melangerLeFil([ancien], [evenement('Simulé', SOIR)], SOIR).includes(ancien));
    const beaucoup = Array.from({ length: 30 }, (_, i) => evenement(`Simulé ${i}`, SOIR - i * 60_000));
    assert.ok(!melangerLeFil([ancien], beaucoup, SOIR).includes(ancien));
  });
});
