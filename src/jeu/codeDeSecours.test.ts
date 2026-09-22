import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET_DU_CODE, afficherUnCode, estUnCodeValable, fabriquerUnCode, normaliserUnCode } from './codeDeSecours.ts';
import { hasardReproductible } from './hasard.ts';

describe('le code de secours', () => {
  it('fabrique vingt signes lisibles, différents d’un tirage à l’autre', () => {
    const a = fabriquerUnCode(hasardReproductible(1));
    const b = fabriquerUnCode(hasardReproductible(2));
    assert.equal(a.length, 20);
    assert.ok([...a].every((c) => ALPHABET_DU_CODE.includes(c)));
    assert.notEqual(a, b);
    assert.ok(!/[ILO01]/.test(ALPHABET_DU_CODE), 'aucun signe qui se confonde');
    assert.ok(estUnCodeValable(a));
  });

  it('s’affiche avec un préfixe et des tirets, et se relit tel qu’on l’a tapé', () => {
    const code = fabriquerUnCode(hasardReproductible(7));
    const affiche = afficherUnCode(code);
    assert.match(affiche, /^MOTS(-[A-Z2-9]{5}){4}$/);
    assert.equal(normaliserUnCode(affiche), code);
    assert.equal(normaliserUnCode(affiche.toLowerCase()), code);
    assert.equal(normaliserUnCode(` ${code.slice(0, 10)} ${code.slice(10)} `), code, 'espaces et tirets ne comptent pas');
    assert.equal(normaliserUnCode('mots abcde'), 'MOTSABCDE', 'un préfixe sans code complet derrière est gardé tel quel');
    assert.equal(estUnCodeValable('MOTSABCDE'), false);
    assert.equal(estUnCodeValable(code.slice(0, 19) + 'O'), false, 'un signe hors alphabet est refusé');
  });
});
