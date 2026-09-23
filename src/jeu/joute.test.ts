// Tests des joutes : le double d'un joueur absent, le classement, le choix des adversaires, la sauvegarde.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { CarteIndex, Rarete } from '../partage/types.ts';
import { hasardReproductible } from './hasard.ts';
import { chancesDuDouble, coteApres, ligueDe, proposerDesAdversaires, rangDansLeClassement, victoireAttendue } from './joute.ts';
import type { ProfilDeJoute } from './joute.ts';
import { noterUneParade, noterUneReponse, terminerUneJoute } from './progression.ts';
import { VERSION_DE_SAUVEGARDE, nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import type { Sauvegarde } from './sauvegarde.ts';

const REGLES = EQUILIBRAGE.joute;
const DUEL = EQUILIBRAGE.duel;
const T0 = new Date(2026, 8, 21, 12, 0, 0).getTime();

const carte = (mot: string, rarete: Rarete = 'Commune'): CarteIndex => ({ id: mot, mot, type: 'Nom', rarete, attaque: 5, defense: 5, faction: 'Latin', registre: [], definition: '' });
const profil = (id: string, cote: number, champs: Partial<ProfilDeJoute> = {}): ProfilDeJoute => ({ id, pseudo: id, cote, deck: [], savoirs: {}, parades: {}, ...champs });

describe('le double d\'un joueur absent', () => {
  it('sans résultats connus, connaît ses mots selon leur rareté ; avec des résultats, comme son joueur', () => {
    const inconnu = chancesDuDouble(profil('a', 1000), carte('callipyge', 'Légendaire'), carte('maison'), REGLES);
    assert.equal(inconnu.reussir, REGLES.savoirParDefaut['Légendaire']);
    assert.equal(inconnu.parer, REGLES.paradeParDefaut['Commune']);

    // Quarante réponses, toutes justes : le double retrouve presque toujours ce mot, quelle que soit sa rareté.
    const savant = profil('b', 1000, { savoirs: { callipyge: { posees: 40, reussies: 40 } }, parades: { 'Commune': { posees: 40, reussies: 4 } } });
    const chances = chancesDuDouble(savant, carte('callipyge', 'Légendaire'), carte('maison'), REGLES);
    assert.ok(chances.reussir > 0.95 && chances.reussir <= 1);
    assert.ok(chances.parer < 0.2, 'il pare mal, puisque son joueur pare mal');

    // Peu de réponses : l'estimation par défaut pèse encore.
    const debutant = profil('c', 1000, { savoirs: { callipyge: { posees: 1, reussies: 1 } } });
    const prudent = chancesDuDouble(debutant, carte('callipyge', 'Légendaire'), carte('maison'), REGLES).reussir;
    assert.ok(prudent > REGLES.savoirParDefaut['Légendaire'] && prudent < 0.7);
  });

  it('par défaut, pare d\'autant moins bien que le mot est rare', () => {
    const raretes: Rarete[] = ['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'];
    const parades = raretes.map((r) => chancesDuDouble(profil('a', 1000), carte('x'), carte('y', r), REGLES).parer);
    for (let i = 1; i < parades.length; i++) assert.ok(parades[i] < parades[i - 1]);
    for (const chance of [...Object.values(REGLES.savoirParDefaut), ...Object.values(REGLES.paradeParDefaut)]) assert.ok(chance > 0 && chance <= 1);
  });
});

describe('la connaissance prime sur la rareté en joute', () => {
  it('estime les Hors-série familières, puis respecte les résultats réels du joueur', () => {
    const hs = carte('amour', 'Hors-série');
    const sansHistorique = chancesDuDouble(profil('a', 1000), hs, hs, REGLES);
    assert.equal(sansHistorique.reussir, REGLES.savoirParDefaut.Commune);
    assert.equal(sansHistorique.parer, REGLES.paradeParDefaut.Commune);
    const savant = profil('b', 1000, { parades: { 'Légendaire': { posees: 100, reussies: 100 } } });
    assert.ok(chancesDuDouble(savant, hs, carte('rare', 'Légendaire'), REGLES).parer > .95, 'un mot rare reconnu doit être paré');
    const hesite = profil('c', 1000, { parades: { 'Hors-série': { posees: 100, reussies: 0 } } });
    assert.ok(chancesDuDouble(hesite, hs, hs, REGLES).parer < .05, 'une Hors-série ne force pas une parade si le joueur ne la connaît pas');
  });
});

describe('le classement', () => {
  it('à cotes égales, une victoire rapporte la moitié du facteur K, et une défaite la coûte', () => {
    assert.equal(victoireAttendue(1200, 1200, REGLES), 0.5);
    assert.equal(coteApres(1200, 1200, 'victoire', REGLES), 1200 + REGLES.facteurK / 2);
    assert.equal(coteApres(1200, 1200, 'defaite', REGLES), 1200 - REGLES.facteurK / 2);
    assert.equal(coteApres(1200, 1200, 'nul', REGLES), 1200);
  });

  it('battre plus fort que soi rapporte davantage, et perdre contre plus fort coûte moins', () => {
    const gain = (adverse: number): number => coteApres(1200, adverse, 'victoire', REGLES) - 1200;
    const perte = (adverse: number): number => 1200 - coteApres(1200, adverse, 'defaite', REGLES);
    assert.ok(gain(1400) > gain(1200) && gain(1200) > gain(1000));
    assert.ok(perte(1400) < perte(1200) && perte(1200) < perte(1000));
    assert.ok(gain(1400) <= REGLES.facteurK && gain(1000) >= 1);
    assert.ok(Math.abs(victoireAttendue(1200, 1350, REGLES) + victoireAttendue(1350, 1200, REGLES) - 1) < 1e-9);
    assert.ok(Math.abs(victoireAttendue(1200 + REGLES.echelle, 1200, REGLES) - 10 / 11) < 1e-9, 'un écart d\'une échelle = 10 contre 1');
  });

  it('ne descend jamais sous la cote minimale', () => {
    assert.equal(coteApres(REGLES.coteMinimale, 2000, 'defaite', REGLES), REGLES.coteMinimale);
    assert.equal(coteApres(REGLES.coteMinimale + 3, REGLES.coteMinimale, 'defaite', REGLES), REGLES.coteMinimale);
  });

  it('range les joueurs en ligues, de la plus modeste à la plus haute', () => {
    assert.deepEqual(REGLES.ligues.map((l) => l.aPartirDe), [...REGLES.ligues.map((l) => l.aPartirDe)].sort((a, b) => a - b));
    assert.equal(REGLES.ligues[0].aPartirDe, 0);
    const depart = ligueDe(REGLES.coteDeDepart, REGLES);
    assert.equal(depart.rang, 0);
    assert.equal(depart.suivante?.nom, REGLES.ligues[1].nom);
    const sommet = ligueDe(9999, REGLES);
    assert.equal(sommet.nom, REGLES.ligues.at(-1)!.nom);
    assert.equal(sommet.suivante, null);
    assert.equal(ligueDe(REGLES.ligues[2].aPartirDe, REGLES).nom, REGLES.ligues[2].nom);
    assert.equal(ligueDe(REGLES.ligues[2].aPartirDe - 1, REGLES).nom, REGLES.ligues[1].nom);
    assert.equal(rangDansLeClassement([1500, 1300, 1300, 900], 1300), 2);
    assert.equal(rangDansLeClassement([1500, 1300], 2000), 1);
  });
});

describe('le choix des adversaires', () => {
  const JOUEURS = Array.from({ length: 200 }, (_, i) => profil(`j${String(i).padStart(3, '0')}`, 700 + i * 6));

  it('propose un adversaire par écart de cote visé, tous différents, du plus faible au plus fort', () => {
    for (let graine = 0; graine < 30; graine++) {
      const proposes = proposerDesAdversaires(JOUEURS, 1200, [], hasardReproductible(graine), REGLES);
      assert.equal(proposes.length, REGLES.ecartsDeCoteProposes.length);
      assert.equal(new Set(proposes.map((p) => p.id)).size, proposes.length);
      assert.deepEqual(proposes.map((p) => p.cote), [...proposes.map((p) => p.cote)].sort((a, b) => a - b));
      const visees = [...REGLES.ecartsDeCoteProposes].sort((a, b) => a - b);
      proposes.forEach((p, i) => assert.ok(Math.abs(p.cote - 1200 - visees[i]) <= 60, `${p.cote} pour un écart visé de ${visees[i]}`));
    }
    const vus = new Set(Array.from({ length: 30 }, (_, g) => proposerDesAdversaires(JOUEURS, 1200, [], hasardReproductible(g), REGLES)[1].id));
    assert.ok(vus.size > 3, 'les propositions changent d\'une fois sur l\'autre');
  });

  it('évite ceux que l\'on vient d\'affronter, sauf s\'il ne reste personne d\'autre', () => {
    const recents = JOUEURS.filter((p) => Math.abs(p.cote - 1200) <= 20).map((p) => p.id);
    for (let graine = 0; graine < 20; graine++) {
      for (const p of proposerDesAdversaires(JOUEURS, 1200, recents, hasardReproductible(graine), REGLES)) assert.ok(!recents.includes(p.id));
    }
    const deux = JOUEURS.slice(0, 2);
    const proposes = proposerDesAdversaires(deux, 1200, deux.map((p) => p.id), hasardReproductible(1), REGLES);
    assert.equal(proposes.length, 2);
    assert.deepEqual(proposerDesAdversaires([], 1200, [], hasardReproductible(1), REGLES), []);
  });
});

describe('les joutes dans la sauvegarde', () => {
  it('fait bouger la cote, tient le compte des joutes et retient les derniers adversaires', () => {
    let sauvegarde = nouvelleSauvegarde(T0, 0);
    assert.equal(sauvegarde.joutes.cote, null, 'pas encore classé');
    const premiere = terminerUneJoute(sauvegarde, profil('fort', REGLES.coteDeDepart + 200), 'victoire', T0, DUEL, REGLES);
    assert.equal(premiere.coteAvant, REGLES.coteDeDepart);
    assert.ok(premiere.coteApres > REGLES.coteDeDepart + REGLES.facteurK / 2);
    assert.equal(premiere.encre, REGLES.encreParVictoire);
    sauvegarde = premiere.sauvegarde;
    assert.deepEqual([sauvegarde.joutes.cote, sauvegarde.joutes.jouees, sauvegarde.joutes.gagnees, sauvegarde.joutes.recents], [premiere.coteApres, 1, 1, ['fort']]);

    const perdue = terminerUneJoute(sauvegarde, profil('autre', premiere.coteApres), 'defaite', T0 + 1000, DUEL, REGLES);
    assert.equal(perdue.coteApres, premiere.coteApres - REGLES.facteurK / 2);
    assert.equal(perdue.encre, DUEL.encreParDefaite);
    assert.deepEqual([perdue.sauvegarde.joutes.jouees, perdue.sauvegarde.joutes.gagnees], [2, 1]);

    for (let i = 0; i < 12; i++) sauvegarde = terminerUneJoute(sauvegarde, profil(`j${i}`, 1000), 'nul', T0 + i, DUEL, REGLES).sauvegarde;
    assert.equal(sauvegarde.joutes.recents.length, REGLES.adversairesRecentsEvites);
    assert.equal(sauvegarde.joutes.recents.at(-1), 'j11');
  });

  it('partage le plafond quotidien d\'Encre avec les duels d\'entraînement', () => {
    let sauvegarde = nouvelleSauvegarde(T0, 0);
    const gains: number[] = [];
    for (let i = 0; i < DUEL.victoiresPleinesParJour + 1; i++) {
      const fin = terminerUneJoute(sauvegarde, profil(`j${i}`, 1000), 'victoire', T0 + i, DUEL, REGLES);
      gains.push(fin.encre);
      sauvegarde = fin.sauvegarde;
    }
    assert.ok(gains.slice(0, -1).every((g) => g === REGLES.encreParVictoire));
    assert.ok(gains.at(-1)! < REGLES.encreParVictoire);
    assert.equal(sauvegarde.duels.victoiresDuJour, DUEL.victoiresPleinesParJour + 1);
  });

  it('compte les questions posées et les parades tentées, pour que le double ressemble à son joueur', () => {
    let sauvegarde: Sauvegarde = { ...nouvelleSauvegarde(T0, 0), cartes: { mot1: { obtenueLe: T0, doublons: 0, finitions: { Normale: 1 }, posees: 0, reussites: 0, maitriseeLe: null } } };
    sauvegarde = noterUneReponse(sauvegarde, 'mot1', false, T0, DUEL).sauvegarde;
    sauvegarde = noterUneReponse(sauvegarde, 'mot1', true, T0, DUEL).sauvegarde;
    assert.deepEqual([sauvegarde.cartes.mot1.posees, sauvegarde.cartes.mot1.reussites], [2, 1]);
    sauvegarde = noterUneParade(noterUneParade(noterUneParade(sauvegarde, 'Rare', true), 'Rare', false), 'Commune', true);
    assert.deepEqual(sauvegarde.parades, { 'Rare': { posees: 2, reussies: 1 }, 'Commune': { posees: 1, reussies: 1 } });
  });

  it('convertit une sauvegarde de la version 3, et répare des joutes abîmées', () => {
    const v3 = { version: 3, creeLe: T0, encre: 5, paquets: { stock: 1, reference: T0, ouverts: 4, sansLegendaire: 4 }, cartes: { mot1: { obtenueLe: T0, doublons: 0, finitions: { Normale: 1 }, reussites: 3, maitriseeLe: null } }, deck: ['mot1'], duels: { joues: 2, gagnes: 1, jour: '2026-09-21', victoiresDuJour: 1 }, reglages: {}, dernierExport: null };
    const convertie = relireSauvegarde(v3, T0);
    assert.equal(convertie.version, VERSION_DE_SAUVEGARDE);
    assert.equal(convertie.cartes.mot1.posees, 3, 'avant la version 4, seules les bonnes réponses étaient comptées');
    assert.deepEqual(convertie.joutes, { pseudo: '', cote: null, jouees: 0, gagnees: 0, recents: [] });
    assert.deepEqual(convertie.parades, {});
    assert.equal(convertie.duels.gagnes, 1);

    const abimee = relireSauvegarde({ ...v3, version: 4, joutes: { pseudo: 42, cote: 'haute', jouees: -3, recents: ['a', 7, 'b'] }, parades: { 'Rare': { posees: 2, reussies: 9 }, 'Inventée': { posees: 1, reussies: 1 }, 'Commune': 'rien' } }, T0);
    assert.deepEqual(abimee.joutes, { pseudo: '', cote: null, jouees: 0, gagnees: 0, recents: ['a', 'b'] });
    assert.deepEqual(abimee.parades, { 'Rare': { posees: 2, reussies: 2 } });
  });
});
