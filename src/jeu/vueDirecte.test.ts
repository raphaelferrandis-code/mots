import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BilanDirect, JoueurDirect, PoseDirect, VueDirect } from './direct.ts';
import type { CarteIndex } from '../partage/types.ts';
import { bilanDuCamp, contexteDeFin, coupSurLaVoie, dePseudo, facesAFace, partenaire, poseurActuel, reponseRetenue, resultatPourMoi, voiesPourMoi } from './vueDirecte.ts';

const carte = (mot: string): CarteIndex => ({ id: mot, mot, type: 'Nom' } as unknown as CarteIndex);
const joueur = (pseudo: string, equipe: number): JoueurDirect => ({ pseudo, equipe, main: [], restantes: 7, derniere: null });
// Une vue de départ : solo (Aurore contre Lysandre) ou 2 contre 2 (Aurore et Armand contre Lysandre et Octave).
function vue(equipe = false, retouches: Partial<VueDirect> = {}): VueDirect {
  const joueurs = equipe ? [joueur('Aurore', 0), joueur('Lysandre', 1), joueur('Octave', 1), joueur('Armand', 0)] : [joueur('Aurore', 0), joueur('Lysandre', 1)];
  return {
    mode: equipe ? 'duo_solo' : 'solo', manche: 1, phase: 'pose', echeance: 10_000, moi: 0, joueurs,
    noms: equipe ? ['Aurore & Armand', 'Lysandre & Octave'] : ['Aurore', 'Lysandre'], pv: equipe ? [60, 60] : [30, 30],
    ordre: equipe ? [0, 1, 2, 3] : [0, 1], arbitres: equipe ? [3, 2] : [0, 1], poses: [], questions: [], bilan: [], vainqueur: null, raison: null,
    ...retouches,
  };
}
const pose = (joueur: number, voie: number, mot: string): PoseDirect => ({ joueur, voie, carte: carte(mot) });
const coup = (joueur: number, voie: number, degats: number, paree: boolean): BilanDirect => ({ joueur, mot: `mot${joueur}`, voie, degats, paree, bonne: 'b', choisie: paree ? 'b' : 'x' });

describe('la vue d’une joute en direct', () => {
  it('range les timbres posés par face-à-face, le mien en bas et le sien en haut', () => {
    const solo = vue(false, { poses: [pose(1, 0, 'lune'), pose(0, 0, 'soleil')] });
    assert.deepEqual(facesAFace(solo).map((f) => [f.eux?.carte.mot, f.nous?.carte.mot]), [['lune', 'soleil']]);
    const duo = vue(true, { poses: [pose(0, 0, 'a'), pose(1, 1, 'b'), pose(2, 0, 'c')] });
    assert.deepEqual(facesAFace(duo).map((f) => [f.eux?.carte.mot ?? null, f.nous?.carte.mot ?? null]), [['c', 'a'], ['b', null]]);
    assert.equal(partenaire(duo), 3);
    assert.equal(partenaire(solo), null);
  });

  it('dit qui pose, et où je peux poser : la première voie pour ouvrir, puis celles que mon camp n’occupe pas', () => {
    const duo = vue(true);
    assert.equal(poseurActuel(duo), 0);
    assert.deepEqual(voiesPourMoi(duo), [0]);
    const apresA1 = vue(true, { moi: 1, poses: [pose(0, 0, 'a')] });
    assert.equal(poseurActuel(apresA1), 1);
    assert.deepEqual(voiesPourMoi(apresA1), [0, 1], 'le premier poseur adverse choisit son opposition');
    const apresB1 = vue(true, { moi: 2, poses: [pose(0, 0, 'a'), pose(1, 1, 'b')] });
    assert.deepEqual(voiesPourMoi(apresB1), [0], 'le second prend la place restante');
    assert.equal(poseurActuel(vue(false, { phase: 'reponses' })), null);
  });

  it('fait le bilan d’une manche du point de vue de mon camp', () => {
    const v = vue(true, { phase: 'bilan', bilan: [coup(0, 0, 6, false), coup(1, 1, 4, true), coup(2, 0, 3, false), coup(3, 1, 5, true)] });
    const b = bilanDuCamp(v);
    assert.deepEqual([b.infliges, b.subis, b.parades, b.attaques], [11, 7, 1, 2]);
    assert.equal(coupSurLaVoie(v, 0, true)?.joueur, 0, 'mon coup sur la voie 1');
    assert.equal(coupSurLaVoie(v, 1, false)?.joueur, 1, 'leur coup sur la voie 2');
  });

  it('retient, comme le serveur, la décision de l’arbitre, sinon sa proposition, sinon la première', () => {
    const v = vue(true, { moi: 0 });
    const q = { cible: 1, mot: 'lune', propositions: ['a', 'b', 'c', 'd'], reponses: { 0: 1, 3: 2 }, decision: null, desaccord: true };
    assert.equal(reponseRetenue(v, q), 2, 'Armand (3) est l’arbitre de mon camp');
    assert.equal(reponseRetenue(v, { ...q, decision: 1 }), 1);
    assert.equal(reponseRetenue(v, { ...q, reponses: { 0: 3 } }), 3);
    assert.equal(reponseRetenue(v, { ...q, reponses: {} }), null);
  });

  it('élide « de » devant une voyelle', () => {
    assert.deepEqual(['Aurore', 'Octave', 'Émile', 'Lysandre', 'Mirabelle'].map(dePseudo), ['d’Aurore', 'd’Octave', 'd’Émile', 'de Lysandre', 'de Mirabelle']);
  });

  it('dit le résultat et raconte la fin', () => {
    assert.equal(resultatPourMoi(vue()), null);
    assert.equal(resultatPourMoi(vue(false, { vainqueur: 0 })), 'victoire');
    assert.equal(resultatPourMoi(vue(false, { vainqueur: 1 })), 'defaite');
    assert.equal(resultatPourMoi(vue(false, { vainqueur: 'nul' })), 'nul');
    assert.equal(contexteDeFin(vue(false, { phase: 'fin', vainqueur: 0, raison: 'Lysandre a abandonné.' })), 'Lysandre a abandonné.');
    assert.equal(contexteDeFin(vue(false, { phase: 'fin', manche: 4, pv: [12, 0], vainqueur: 0 })), 'Lysandre tombe à la manche 4.');
    assert.equal(contexteDeFin(vue(true, { phase: 'fin', manche: 5, pv: [20, 0], vainqueur: 0 })), 'Lysandre & Octave tombent à la manche 5.');
    assert.equal(contexteDeFin(vue(false, { phase: 'fin', manche: 3, pv: [0, 9], vainqueur: 1 })), 'Tu tombes à la manche 3. Revanche ?');
    assert.equal(contexteDeFin(vue(false, { phase: 'fin', manche: 10, pv: [8, 8], vainqueur: 'nul' })), '10 manches, et personne ne cède.');
    assert.equal(contexteDeFin(vue(false, { phase: 'fin', manche: 10, pv: [14, 9], vainqueur: 0 })), 'Aux points, 14 à 9.');
  });
});
