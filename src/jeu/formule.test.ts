import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { ETAGES, FORMULE_GRATUITE, encreDoublee, cosmetiquesPremium, calculerGainXp, lireFormule, marcheSansLimite, nomDeLaFormule, paquetsPlusVite, peutPayer, prixEnClair } from './formule.ts';

describe('les formules payantes', () => {
  it('relit ce que le serveur envoie, et retombe sur la version gratuite si c’est illisible', () => {
    const f = lireFormule({ niveau: 2, achatUnique: true, abonnement: 'collectionneur', jusquAu: 1000, encreAchetee: 300, anneeDeNaissance: 1980 });
    assert.equal(f.niveau, 2);
    assert.equal(f.abonnement, 'collectionneur');
    assert.equal(f.encreAchetee, 300);
    assert.deepEqual(lireFormule('rien'), FORMULE_GRATUITE);
    assert.deepEqual(lireFormule({ niveau: 9, abonnement: 'or', encreAchetee: -5 }), { ...FORMULE_GRATUITE, niveau: 3 }, 'un niveau hors bornes est ramené, une Encre négative est refusée');
  });

  it('sépare les cosmétiques permanents du rythme abonné et respecte l’expiration', () => {
    const achat = { ...FORMULE_GRATUITE, niveau: 1, achatUnique: true };
    const abonnement = { ...FORMULE_GRATUITE, niveau: 2, abonnement: 'collectionneur' as const, jusquAu: 2000 };
    assert.equal(cosmetiquesPremium(achat), true);
    assert.equal(cosmetiquesPremium(abonnement), false);
    assert.equal(paquetsPlusVite(achat, 1000), false);
    assert.equal(paquetsPlusVite(abonnement, 1999), true);
    assert.equal(paquetsPlusVite(abonnement, 2000), false);
    assert.equal(encreDoublee(abonnement), false);
    assert.equal(marcheSansLimite(abonnement), false);
  });
  it('conserve les fractions du bonus XP et arrête le bonus exactement à expiration', () => {
    const f = { ...FORMULE_GRATUITE, abonnement: 'collectionneur' as const, jusquAu: 2000 };
    let reste = 0, total = 0;
    for (let i = 0; i < 4; i++) { const r = calculerGainXp(5, reste, f, 1000); total += r.gain; reste = r.reste; }
    assert.equal(total, 25); assert.equal(reste, 0);
    assert.deepEqual(calculerGainXp(5, 25, f, 2000), { gain: 5, reste: 25 });
  });

  it('nomme la formule en cours', () => {
    assert.equal(nomDeLaFormule(FORMULE_GRATUITE), null);
    assert.equal(nomDeLaFormule({ ...FORMULE_GRATUITE, achatUnique: true }), 'Mon album');
    assert.equal(nomDeLaFormule({ ...FORMULE_GRATUITE, achatUnique: true, abonnement: 'collectionneur', jusquAu: Date.now() + 60000 }), 'Mon album + Collectionneur');
  });

  it('décrit les deux offres indépendantes', () => {
    assert.equal(ETAGES.length, 2);
    assert.deepEqual(ETAGES.map((e) => e.niveau), [1, 2]);
    assert.ok(ETAGES.every((e) => e.avantages.length > 0));
    assert.equal(prixEnClair(ETAGES[0]), '5,99 € une fois');
    assert.equal(prixEnClair(ETAGES[1]), '4,99 € par mois');
  });

  it('réserve le paiement aux majeurs', () => {
    const age = EQUILIBRAGE.payant.ageMinimumPourPayer;
    assert.equal(peutPayer(FORMULE_GRATUITE, 2026), false, 'sans année de naissance, on ne peut pas payer');
    assert.equal(peutPayer({ ...FORMULE_GRATUITE, anneeDeNaissance: 2026 - age + 1 }, 2026), false);
    assert.equal(peutPayer({ ...FORMULE_GRATUITE, anneeDeNaissance: 2026 - age }, 2026), true);
  });
});

