import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nouvelleSauvegarde } from '../../jeu/sauvegarde.ts';
import type { CartePossedee } from '../../jeu/sauvegarde.ts';
import type { CarteIndex } from '../../partage/types.ts';
import { preparerAccueil } from './modeleAccueil.ts';

const carte = (id: string, changements: Partial<CarteIndex> = {}): CarteIndex => ({
  id, mot: id, type: 'Nom', rarete: 'Commune', faction: 'Latin', attaque: 5, defense: 5, registre: [], definition: '', ...changements,
});
const possedee = (): CartePossedee => ({ obtenueLe: 1, doublons: 0, finitions: { Normale: 1 }, posees: 0, reussites: 0, maitriseeLe: null });

describe('données de l’accueil', () => {
  it('ne présente pas comme jouables les cartes masquées, disparues ou non possédées du deck', () => {
    const sauvegarde = nouvelleSauvegarde(0, 3);
    sauvegarde.reglages.masquerInjurieux = true;
    sauvegarde.cartes = { visible: possedee(), masquee: possedee(), disparue: possedee() };
    sauvegarde.deck = ['masquee', 'visible', 'disparue', 'non-possedee'];
    const avant = structuredClone(sauvegarde);
    const vue = preparerAccueil(sauvegarde, [carte('non-possedee'), carte('masquee', { registre: ['Injurieux'] }), carte('visible')]);
    assert.deepEqual(vue.deck.map((c) => c.id), ['visible']);
    assert.deepEqual(vue.recentes.map((c) => c.id), ['visible']);
    assert.deepEqual(sauvegarde, avant, 'préparer un affichage ne modifie pas la partie');
  });

  it('compte les timbres ordinaires une fois, sépare les hors-série et respecte les réglages', () => {
    const sauvegarde = nouvelleSauvegarde(0, 3);
    sauvegarde.reglages.masquerFamiliers = true;
    sauvegarde.cartes = {
      ordinaire: { ...possedee(), finitions: { Normale: 3, Brillante: 1 }, maitriseeLe: 123 },
      record: possedee(), cachee: { ...possedee(), maitriseeLe: 123 }, ancienne: possedee(),
    };
    const { collection } = preparerAccueil(sauvegarde, [carte('ordinaire'), carte('manquante'), carte('record', { rarete: 'Hors-série' }), carte('cachee', { registre: ['Familier'] })]);
    assert.deepEqual(collection, { possedees: 1, total: 2, horsSeriePossedees: 1, horsSerieTotal: 1, maitrisees: 1 });
  });

  it('garde un état vide cohérent pour un nouveau joueur ou une édition vide', () => {
    const vue = preparerAccueil(nouvelleSauvegarde(0, 3), []);
    assert.deepEqual(vue.deck, []);
    assert.deepEqual(vue.recentes, []);
    assert.deepEqual(vue.collection, { possedees: 0, total: 0, horsSeriePossedees: 0, horsSerieTotal: 0, maitrisees: 0 });
  });

  it('montre les six dernières acquisitions sans confondre finition et nouveau timbre', () => {
    const sauvegarde = nouvelleSauvegarde(0, 3);
    const cartes = Array.from({ length: 8 }, (_, i) => carte(`mot-${i}`));
    for (const [i, c] of cartes.entries()) sauvegarde.cartes[c.id] = { ...possedee(), obtenueLe: i + 1 };
    sauvegarde.cartes['mot-0'].finitions.Brillante = 1;
    assert.deepEqual(preparerAccueil(sauvegarde, cartes).recentes.map((c) => c.id), ['mot-7', 'mot-6', 'mot-5', 'mot-4', 'mot-3', 'mot-2']);
  });
});
