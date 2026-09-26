// Tests : la devinette du jour (alternance des formats, jour à Paris, réponses, série) et le fichier qui la porte.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fabriquerLesDevinettes, FICHIER_DES_DEVINETTES } from '../../pipeline/etapes/devinettes.ts';
import { SERIE_VIERGE, bonMot, bonneDefinition, jourAParis, lettresDuMot, rangDuJour, repondre, serieEnCours } from './devinette.ts';
import type { Devinettes } from './devinette.ts';

describe('devinettes du calendrier', () => {
  const devinettes = fabriquerLesDevinettes();
  it('public/data/devinettes.json suit le calendrier (sinon : npm run motdujour:devinettes)', () => {
    assert.deepEqual(JSON.parse(readFileSync(FICHIER_DES_DEVINETTES, 'utf8')) as Devinettes, devinettes);
  });
  it('alterne : la définition à retrouver, puis le mot', () => {
    assert.ok(devinettes.jours.length > 300);
    devinettes.jours.forEach((d, i) => assert.equal(d.format, i % 2 === 0 ? 'definition' : 'mot', d.id));
  });
  it('quatre définitions dont une seule bonne, et des indices justes', () => {
    for (const d of devinettes.jours) {
      if (d.format === 'definition') {
        assert.equal(d.propositions.length, 4, d.id);
        assert.equal(new Set(d.propositions).size, 4, d.id);
        assert.ok(d.bonne >= 0 && d.bonne < 4);
      } else {
        assert.equal(d.lettres, lettresDuMot(d.mot));
        assert.ok(d.definition.length > 0 && d.origine.length > 0, d.id);
      }
      assert.ok(bonneDefinition(d).length > 10, d.id);
    }
  });
  it('ne change pas d’une fabrication à l’autre', () => {
    assert.deepEqual(fabriquerLesDevinettes(), devinettes);
  });
});

describe('le jour de la devinette', () => {
  it('change à minuit, heure de Paris', () => {
    assert.equal(jourAParis(Date.parse('2026-10-31T22:59:00Z')), '2026-10-31'); // 23 h 59 à Paris (heure d'hiver)
    assert.equal(jourAParis(Date.parse('2026-10-31T23:00:00Z')), '2026-11-01');
    assert.equal(jourAParis(Date.parse('2026-07-14T21:59:00Z')), '2026-07-14'); // 23 h 59 à Paris (heure d'été)
  });
  it('se range dans le calendrier, et rien avant ni après', () => {
    assert.equal(rangDuJour('2026-11-02', '2026-11-02', 365), 0);
    assert.equal(rangDuJour('2026-11-02', '2027-03-29', 365), 147); // passage à l'heure d'été compris
    assert.equal(rangDuJour('2026-11-02', '2026-11-01', 365), null);
    assert.equal(rangDuJour('2026-11-02', '2027-11-02', 365), null);
    assert.equal(rangDuJour(null, '2026-11-02', 365), null);
  });
});

describe('réponses et série', () => {
  it('reconnaît le mot sans accents ni majuscules', () => {
    assert.ok(bonMot('  Caravanserail ', 'caravansérail'));
    assert.ok(bonMot('ÉPIPHANE', 'épiphane'));
    assert.ok(!bonMot('caravane', 'caravansérail'));
  });
  it('compte les bonnes réponses d’affilée, une seule réponse par jour', () => {
    let s = repondre(SERIE_VIERGE, '2026-11-02', true);
    s = repondre(s, '2026-11-02', false); // la première réponse compte
    assert.equal(s.serie, 1);
    s = repondre(s, '2026-11-03', true);
    assert.deepEqual([s.serie, s.meilleure], [2, 2]);
    s = repondre(s, '2026-11-05', true); // un jour sauté : la série repart
    assert.deepEqual([s.serie, s.meilleure], [1, 2]);
    s = repondre(s, '2026-11-06', false);
    assert.deepEqual([s.serie, s.meilleure], [0, 2]);
  });
  it('affiche zéro si le joueur a laissé passer un jour', () => {
    const s = repondre(SERIE_VIERGE, '2026-11-02', true);
    assert.equal(serieEnCours(s, '2026-11-02'), 1);
    assert.equal(serieEnCours(s, '2026-11-03'), 1);
    assert.equal(serieEnCours(s, '2026-11-04'), 0);
  });
});
