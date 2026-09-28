import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { commissionSur, lireDesEncheres, lireEnchere, mesEncheresEnOrdre, miseMinimale, prixActuel, statutDeMonEnchere, tempsRestant, vendeurRecoit, verifierLaMiseEnVente } from './marche.ts';

const R = EQUILIBRAGE.marche;
const brut = { id: 7, carte: 'zeugma-nom', finition: 'Brillante', vendeur: 'Zeugma 12', mienne: false, miseDeDepart: 30, achatImmediat: 300, meilleureMise: null, enTete: false, fermeLe: 2_000_000, etat: 'ouverte', prixFinal: null, acheteur: null, cloturee_le: null };

describe('le marché vu du jeu', () => {
  it('relit une enchère du serveur, et ignore ce qui est illisible', () => {
    const e = lireEnchere(brut);
    assert.ok(e);
    assert.equal(e.finition, 'Brillante');
    assert.equal(e.achatImmediat, 300);
    assert.equal(e.meilleureMise, null);
    assert.equal(lireEnchere({ ...brut, finition: 'Dorée', etat: 'bizarre' })?.finition, 'Normale');
    assert.equal(lireEnchere({ ...brut, finition: 'Dorée', etat: 'bizarre' })?.etat, 'ouverte');
    assert.equal(e.remportee, false);
    assert.equal(lireEnchere({ ...brut, remportee: true })?.remportee, true);
    assert.equal(lireEnchere('rien'), null);
    assert.equal(lireDesEncheres([brut, 'rien', { id: 'x' }]).length, 1);
  });

  it('calcule la mise minimale, le prix courant et ce que reçoit le vendeur', () => {
    const e = lireEnchere(brut)!;
    assert.equal(prixActuel(e), 30);
    assert.equal(miseMinimale(e, R), 30, 'sans mise : la mise de départ');
    const avecMise = { ...e, meilleureMise: 30 };
    assert.equal(prixActuel(avecMise), 30);
    assert.equal(miseMinimale(avecMise, R), 30 + Math.max(1, Math.ceil(30 * R.surencherMinimale)));
    assert.equal(miseMinimale({ ...e, meilleureMise: 5 }, R), 6, 'au moins 1 Encre de plus');
    assert.equal(miseMinimale({ ...e, meilleureMise: 99, achatImmediat: 100 }, R), 100, 'le prix immédiat prime sur le pas de surenchère');
    assert.equal(commissionSur(300, R), Math.ceil(300 * R.commission));
    assert.equal(vendeurRecoit(300, R) + commissionSur(300, R), 300);
  });

  it('dit le temps qui reste en clair', () => {
    assert.equal(tempsRestant(1000, 2000), 'terminée');
    assert.equal(tempsRestant(2000 + 30_000, 2000), "moins d'une minute");
    assert.equal(tempsRestant(2000 + 3 * 60_000, 2000), '3 min');
    assert.equal(tempsRestant(2000 + (5 * 60 + 7) * 60_000, 2000), '5 h 07 min');
    assert.equal(tempsRestant(2000 + 24 * 3_600_000 + 60_000, 2000), '1 j', 'pas de « 0 h »');
    assert.equal(tempsRestant(2000 + 27 * 3_600_000, 2000), '1 j 3 h');
    assert.equal(tempsRestant(2000 + 51 * 3_600_000, 2000), '2 j 3 h');
  });

  it('contrôle une mise en vente avant d’appeler le serveur', () => {
    assert.equal(verifierLaMiseEnVente({ rarete: 'Rare', mise: 30, achatImmediat: null, heures: 24 }, R), null);
    assert.match(verifierLaMiseEnVente({ rarete: 'Rare', mise: 29, achatImmediat: null, heures: 24 }, R) ?? '', /au moins 30/);
    assert.match(verifierLaMiseEnVente({ rarete: 'Commune', mise: 10, achatImmediat: 9, heures: 24 }, R) ?? '', /plus bas/);
    assert.match(verifierLaMiseEnVente({ rarete: 'Commune', mise: 10, achatImmediat: null, heures: 36 }, R) ?? '', /durée/);
    assert.match(verifierLaMiseEnVente({ rarete: 'Commune', mise: 2_000_000, achatImmediat: null, heures: 12 }, R) ?? '', /déraisonnable/);
    assert.match(verifierLaMiseEnVente({ rarete: 'Commune', mise: 10.5, achatImmediat: null, heures: 12 }, R) ?? '', /au moins/);
  });

  it('dit où en sont mes enchères, et les range par ce qui demande de l’attention', () => {
    const e = lireEnchere(brut)!;
    const statut = (champs: Partial<typeof e>) => statutDeMonEnchere({ ...e, ...champs }).libelle;
    assert.equal(statut({ mienne: true }), 'En vente');
    assert.equal(statut({ mienne: true, etat: 'vendue', prixFinal: 50 }), 'Vendue');
    assert.equal(statut({ mienne: true, etat: 'invendue' }), 'Invendue');
    assert.equal(statut({ enTete: true }), 'En tête');
    assert.equal(statut({}), 'Dépassée');
    assert.equal(statut({ etat: 'vendue', remportee: true }), 'Remportée');
    assert.equal(statut({ etat: 'vendue' }), 'Perdue');
    const une = (id: number, champs: Partial<typeof e>) => ({ ...e, id, ...champs });
    const ventes = [une(1, { mienne: true, etat: 'vendue', clotureeLe: 100 }), une(2, { mienne: true, fermeLe: 900 })];
    const mises = [une(3, { etat: 'vendue', remportee: true, clotureeLe: 300 }), une(4, {}), une(5, { enTete: true, fermeLe: 500 }), une(2, { mienne: true, fermeLe: 900 })];
    assert.deepEqual(mesEncheresEnOrdre(ventes, mises).map((x) => x.id), [4, 5, 2, 3, 1]);
  });
});
