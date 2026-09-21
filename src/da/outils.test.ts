import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enChiffresRomains, enLignes, hasardDe, ligneMachine } from './outils.ts';

describe('outils de la direction artistique', () => {
  it('coupe les mots longs entre deux syllabes, en lignes de longueur voisine', () => {
    assert.deepEqual(enLignes('ERSATZ', 7), ['ERSATZ']);
    assert.deepEqual(enLignes('CALLIPYGE', 7), ['CALLI-', 'PYGE']);
    assert.deepEqual(enLignes('TRUCHEMENT', 7), ['TRUCHE-', 'MENT']);
    assert.deepEqual(enLignes('CASQUETTE', 7), ['CAS-', 'QUETTE']);
    assert.deepEqual(enLignes('BILLEVESÉE', 7), ['BILLE-', 'VESÉE']);
    assert.deepEqual(enLignes('CARAVANSÉRAIL', 7), ['CARAVAN-', 'SÉRAIL']);
  });
  it('ne perd aucune lettre, même pour un mot très long ou composé', () => {
    for (const mot of ['PROCRASTINATION', 'ANTICONSTITUTIONNELLEMENT', 'ARC-EN-CIEL', 'RHYTHM']) {
      const lignes = enLignes(mot, 6);
      assert.equal(lignes.map((l, i) => (i < lignes.length - 1 && !mot.includes(l) ? l.slice(0, -1) : l)).join(''), mot, mot);
      assert.ok(lignes.every((l) => l.length >= 2), mot);
    }
  });
  it('dessine toujours le même décor pour la même carte', () => {
    assert.equal(hasardDe('callipyge-adj')(), hasardDe('callipyge-adj')());
    assert.notEqual(hasardDe('callipyge-adj')(), hasardDe('truchement-nom')());
  });
  it('écrit la ligne « machine » sans accents, complétée par des chevrons', () => {
    assert.equal(ligneMachine(['M', 'FRA', 'sérendipité', 'Nom'], 32), 'M<<FRA<<SERENDIPITE<<NOM<<<<<<<<');
    assert.equal(ligneMachine(['arc-en-ciel'], 14), 'ARC<EN<CIEL<<<');
  });
  it('écrit les stats en chiffres romains', () => {
    assert.deepEqual([1, 4, 9, 10].map(enChiffresRomains), ['I', 'IV', 'IX', 'X']);
  });
});
