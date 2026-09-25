import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { CarteIndex, Nature } from '../partage/types.ts';
import { aidesPermises, analyserLeDeck, bat, battuPar, enchainement, indiceSurLeMot, prevoirLaManche, rapportDeType, resultatDeLaManche } from './aidesDuDuel.ts';
import { commencerLeDuel, prevoirLAttaque } from './duel.ts';

const REGLES = EQUILIBRAGE.duel;
let n = 0;
const carte = (type: Nature, faction = 'Latin'): CarteIndex => ({ id: `c${n++}`, mot: `mot${n}`, definition: '', type, rarete: 'Commune', faction, attaque: 5, defense: 5, registre: [] });

describe('Analyse du deck', () => {
  it('suit le triangle des types des règles : Nom > Adjectif > Verbe > Nom, adverbe neutre', () => {
    assert.equal(bat('Nom'), 'Adjectif');
    assert.equal(bat('Adjectif'), 'Verbe');
    assert.equal(bat('Verbe'), 'Nom');
    assert.equal(bat('Adverbe'), null);
    assert.equal(battuPar('Nom'), 'Verbe');
    assert.equal(battuPar('Adverbe'), null);
  });

  it('donne le point fort et le point faible d’un type majoritaire', () => {
    const deck = [...Array.from({ length: 6 }, () => carte('Nom')), carte('Verbe'), carte('Adjectif'), carte('Adverbe'), carte('Adverbe')];
    const analyse = analyserLeDeck(deck, new Map(), REGLES);
    assert.deepEqual(analyse.dominante, { nature: 'Nom', nombre: 6, forte: 'Adjectif', faible: 'Verbe' });
    assert.equal(analyse.parNature.Nom, 6);
    assert.equal(analyse.adverbes, 2);
  });

  it('ne désigne aucune dominante pour un deck équilibré, ni pour des adverbes majoritaires', () => {
    const equilibre = [carte('Nom'), carte('Nom'), carte('Nom'), carte('Verbe'), carte('Verbe'), carte('Verbe'), carte('Adjectif'), carte('Adjectif'), carte('Adjectif'), carte('Adverbe')];
    assert.equal(analyserLeDeck(equilibre, new Map(), REGLES).dominante, null);
    const adverbes = Array.from({ length: 7 }, () => carte('Adverbe')).concat([carte('Nom'), carte('Verbe'), carte('Adjectif')]);
    assert.equal(analyserLeDeck(adverbes, new Map(), REGLES).dominante, null);
    assert.equal(analyserLeDeck([], new Map(), REGLES).dominante, null);
  });

  it('compte les origines et leur bonus d’enchaînement, plus fort pour une petite langue', () => {
    const tailles = new Map([['Latin', 5000], ['Arabe', REGLES.petiteFactionJusquA]]);
    const deck = [carte('Nom', 'Latin'), carte('Nom', 'Latin'), carte('Verbe', 'Latin'), carte('Nom', 'Arabe'), carte('Nom', 'Arabe'), carte('Nom', 'Grec')];
    const { origines } = analyserLeDeck(deck, tailles, REGLES);
    assert.deepEqual(origines.map((o) => [o.nom, o.nombre, o.bonus, o.enchainable]), [
      ['Latin', 3, REGLES.bonusDeFaction, true],
      ['Arabe', 2, REGLES.bonusDePetiteFaction, true],
      // Une origine absente de l'édition n'est pas une petite langue (même règle que prevoirLAttaque).
      ['Grec', 1, REGLES.bonusDeFaction, false],
    ]);
  });
});

describe('Aides pendant la partie', () => {
  const tailles = new Map([['Latin', 5000], ['Arabe', 10]]);
  const deck = (faction: string) => Array.from({ length: REGLES.tailleDuDeck }, () => carte('Nom', faction));
  const hasardFixe = () => 0;

  it('ne sont permises qu’en Facile contre l’ordinateur', () => {
    assert.equal(aidesPermises({ type: 'entrainement', niveau: 'Facile' }), true);
    assert.equal(aidesPermises({ type: 'entrainement', niveau: 'Normal' }), false);
    assert.equal(aidesPermises({ type: 'entrainement', niveau: 'Difficile' }), false);
    assert.equal(aidesPermises({ type: 'joute' }), false);
  });

  it('disent qui a l’avantage de type, et comment contrer le mot adverse', () => {
    assert.equal(rapportDeType('Nom', 'Adjectif'), 'pour');
    assert.equal(rapportDeType('Verbe', 'Adjectif'), 'contre');
    assert.equal(rapportDeType('Adverbe', 'Nom'), 'neutre');
    assert.deepEqual(indiceSurLeMot('Adjectif'), { bat: 'Verbe', contre: 'Nom' });
    assert.equal(indiceSurLeMot('Adverbe'), null);
  });

  it('prévoient la manche avec les calculs des règles, riposte comprise', () => {
    const duel = commencerLeDuel(deck('Latin'), deck('Latin'), hasardFixe, REGLES);
    const moi = { ...carte('Nom'), attaque: 9 };
    const lui = { ...carte('Adjectif'), defense: 4 };
    const p = prevoirLaManche(duel, moi, lui, tailles, REGLES);
    assert.deepEqual(p.moi, prevoirLAttaque(duel, 'joueur', moi, lui, tailles, REGLES));
    assert.deepEqual(p.lui, prevoirLAttaque(duel, 'adversaire', lui, moi, tailles, REGLES));
    assert.equal(p.moi.bonusDeType, REGLES.bonusDeType);
    assert.equal(p.acheve, 'non');
    const achevable = { ...duel, camps: { ...duel.camps, adversaire: { ...duel.camps.adversaire, pv: p.moi.degats } } };
    assert.equal(prevoirLaManche(achevable, moi, lui, tailles, REGLES).acheve, 'sans-parade');
    const aBout = { ...duel, camps: { ...duel.camps, adversaire: { ...duel.camps.adversaire, pv: 1 } } };
    assert.equal(prevoirLaManche(aBout, moi, lui, tailles, REGLES).acheve, 'toujours');
  });

  it('comptent l’enchaînement d’origine comme les règles', () => {
    const duel = commencerLeDuel(deck('Arabe'), deck('Latin'), hasardFixe, REGLES);
    const precedente = carte('Nom', 'Arabe');
    const apres = { ...duel, camps: { ...duel.camps, joueur: { ...duel.camps.joueur, derniere: precedente } } };
    assert.equal(enchainement(duel, 'joueur', carte('Verbe', 'Arabe'), tailles, REGLES), 0);
    assert.equal(enchainement(apres, 'joueur', carte('Verbe', 'Arabe'), tailles, REGLES), REGLES.bonusDePetiteFaction);
    assert.equal(enchainement(apres, 'joueur', carte('Verbe', 'Latin'), tailles, REGLES), 0);
  });

  it('classent une manche jouée en gagnée, perdue ou nulle', () => {
    const attaque = (infliges: number) => ({ carte: carte('Nom'), reussie: true, paree: false, infliges, degats: infliges, degatsSiParee: 0, bonusDeRarete: 0, bonusDeType: 0, bonusDeFaction: 0, bloques: 0 });
    assert.equal(resultatDeLaManche({ numero: 1, joueur: attaque(5), adversaire: attaque(3) }), 'gagnee');
    assert.equal(resultatDeLaManche({ numero: 1, joueur: attaque(2), adversaire: attaque(3) }), 'perdue');
    assert.equal(resultatDeLaManche({ numero: 1, joueur: attaque(3), adversaire: attaque(3) }), 'nulle');
  });
});
