import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ETAGES, FORMULE_GRATUITE, encreDoublee, histoireDesPrix, lireFormule, marcheSansLimite, nomDeLaFormule, paquetsPlusVite, peutPayer, prixEnClair } from './formule.ts';

describe('les formules payantes', () => {
  it('relit ce que le serveur envoie, et retombe sur la version gratuite si c’est illisible', () => {
    const f = lireFormule({ niveau: 2, achatUnique: true, abonnement: 'collectionneur', jusquAu: 1000, encreAchetee: 300, anneeDeNaissance: 1980 });
    assert.equal(f.niveau, 2);
    assert.equal(f.abonnement, 'collectionneur');
    assert.equal(f.encreAchetee, 300);
    assert.deepEqual(lireFormule('rien'), FORMULE_GRATUITE);
    assert.deepEqual(lireFormule({ niveau: 9, abonnement: 'or', encreAchetee: -5 }), { ...FORMULE_GRATUITE, niveau: 3 }, 'un niveau hors bornes est ramené, une Encre négative est refusée');
  });

  it('donne les avantages étage par étage, chacun contenant le précédent', () => {
    const niveaux = [0, 1, 2, 3].map((niveau) => ({ ...FORMULE_GRATUITE, niveau }));
    assert.deepEqual(niveaux.map(paquetsPlusVite), [false, true, true, true]);
    assert.deepEqual(niveaux.map(encreDoublee), [false, false, true, true]);
    assert.deepEqual(niveaux.map(marcheSansLimite), [false, false, true, true]);
    assert.deepEqual(niveaux.map(histoireDesPrix), [false, false, false, true]);
  });

  it('nomme la formule en cours', () => {
    assert.equal(nomDeLaFormule(FORMULE_GRATUITE), null);
    assert.equal(nomDeLaFormule({ ...FORMULE_GRATUITE, niveau: 1 }), 'Le nécessaire');
    assert.equal(nomDeLaFormule({ ...FORMULE_GRATUITE, niveau: 3 }), 'Expert');
  });

  it('décrit les trois étages, du moins cher au plus cher', () => {
    assert.equal(ETAGES.length, 3);
    assert.deepEqual(ETAGES.map((e) => e.niveau), [1, 2, 3]);
    assert.ok(ETAGES.every((e) => e.avantages.length > 0));
    assert.equal(prixEnClair(ETAGES[0]), '5,99 € une fois');
    assert.equal(prixEnClair(ETAGES[1]), '5 € par mois');
  });

  it('réserve le paiement aux majeurs', () => {
    const age = EQUILIBRAGE.payant.ageMinimumPourPayer;
    assert.equal(peutPayer(FORMULE_GRATUITE, 2026), false, 'sans année de naissance, on ne peut pas payer');
    assert.equal(peutPayer({ ...FORMULE_GRATUITE, anneeDeNaissance: 2026 - age + 1 }, 2026), false);
    assert.equal(peutPayer({ ...FORMULE_GRATUITE, anneeDeNaissance: 2026 - age }, 2026), true);
  });
});
