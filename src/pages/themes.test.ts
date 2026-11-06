// Tests : les listes par thème, sur les vraies données de l'édition.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { lotDeLaCarte, nomDuLot } from '../partage/lots.ts';
import type { CarteDetails, IndexEdition } from '../partage/types.ts';
import { SEUIL_DES_MOTS_RARES, listesParMot, originesSures, themesDeLEdition, timbresDuTheme } from './themes.ts';

const donnees = path.join(import.meta.dirname, '..', '..', 'public', 'data');
const edition = JSON.parse(readFileSync(path.join(donnees, 'edition-1.index.json'), 'utf8')) as IndexEdition;
const lots = Array.from({ length: edition.meta.lots }, (_, lot) => JSON.parse(readFileSync(path.join(donnees, 'details', nomDuLot(lot)), 'utf8')) as Record<string, CarteDetails>);
const detailsDe = (id: string): CarteDetails => lots[lotDeLaCarte(id, edition.meta.lots)][id];
const themes = themesDeLEdition(edition.cartes, detailsDe);
const theme = (adresse: string) => themes.find((t) => t.adresse === adresse)!;
const motsDe = (adresse: string) => theme(adresse).paliers.flatMap((p) => p.mots);

describe('listes par thème', () => {
  it('une liste par origine, et chaque timbre dans une au plus : celle de sa faction', () => {
    const origines = themes.filter((t) => t.genre === 'origine');
    assert.equal(origines.length, new Set(edition.cartes.map((c) => c.faction)).size, 'toutes les factions ont leur liste');
    const ids = origines.flatMap((t) => t.paliers.flatMap((p) => p.mots.map((m) => m.carte.id)));
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length > edition.cartes.length / 2, `${ids.length} mots dans les listes d’origine`);
    for (const t of origines) {
      assert.equal(t.paliers.reduce((n, p) => n + p.mots.length, 0), t.nombre, t.adresse);
      assert.equal(new Set(t.paliers.flatMap((p) => p.mots.map((m) => m.carte.faction))).size, 1, t.adresse);
    }
  });
  it('une origine n’entre dans sa liste que si l’étymologie la donne d’emblée, ou par un mot de la même origine', () => {
    const arabes = motsDe('origine-arabe').map((m) => m.carte.mot);
    assert.ok(arabes.includes('alcool'), '« De l’arabe… » dès la première phrase');
    assert.ok(arabes.includes('goudronneux'), 'dérivé de goudron, lui-même venu de l’arabe');
    for (const mot of ['accabler', 'accablant', 'bagage']) assert.ok(!arabes.includes(mot), `${mot} : l’arabe n’est qu’une hypothèse citée plus loin`);
    const sures = originesSures(edition.cartes, detailsDe);
    assert.ok(!sures.has('accabler-verbe'));
  });
  it('des adresses uniques et propres, des textes que Google n’a pas à couper', () => {
    assert.equal(new Set(themes.map((t) => t.adresse)).size, themes.length);
    for (const t of themes) {
      assert.match(t.adresse, /^[a-z]+(?:-[a-z]+)*$/, t.adresse);
      assert.ok(t.description.length <= 160, `${t.adresse} : ${t.description.length} caractères`);
      assert.ok(t.titreGoogle.endsWith(' — Philamots'), t.titreGoogle);
      assert.ok(t.chapeau.length > 0 && !t.chapeau.includes('undefined'), t.chapeau);
    }
  });
  it('les paliers vont du plus connu au moins connu, chacun dans l’ordre alphabétique', () => {
    const arabe = theme('origine-arabe');
    assert.deepEqual(arabe.paliers.map((p) => p.titre).slice(0, 1), ['Connus de presque tous']);
    for (const p of arabe.paliers) {
      const mots = p.mots.map((m) => m.carte.mot);
      assert.deepEqual(mots, [...mots].sort((a, b) => a.localeCompare(b, 'fr')), p.titre);
    }
    assert.ok(arabe.paliers.find((p) => p.titre === 'Connus de presque tous')!.mots.every((m) => m.prevalence! >= 80));
    assert.ok(arabe.paliers.find((p) => p.titre === 'Connus de peu de gens')!.mots.every((m) => m.prevalence! < 40));
  });
  it('les mots sans mesure ont leur palier, à la fin', () => {
    const latin = theme('origine-latine');
    const dernier = latin.paliers[latin.paliers.length - 1];
    assert.equal(dernier.titre, 'Non mesurés');
    assert.ok(dernier.mots.every((m) => m.prevalence === null));
    assert.ok(dernier.mots.some((m) => m.carte.mot === 'mot'));
  });
  it('les mots rares : connus de moins d’une personne sur cinq, du moins connu au plus connu', () => {
    const rares = motsDe('mots-rares');
    assert.ok(rares.length > 50);
    assert.ok(rares.every((m) => m.prevalence !== null && m.prevalence < SEUIL_DES_MOTS_RARES));
    assert.equal(rares[0].carte.mot, 'lexie');
    for (let i = 1; i < rares.length; i++) assert.ok(rares[i - 1].prevalence! <= rares[i].prevalence!);
  });
  it('les records : les timbres Hors-série, chacun avec son record', () => {
    const records = motsDe('records');
    assert.equal(records.length, edition.cartes.filter((c) => c.rarete === 'Hors-série').length);
    assert.ok(records.every((m) => m.carte.record));
    assert.equal(themes[0].adresse, 'records', 'en tête du sommaire');
  });
  it('les listes qui mêlent plusieurs langues les nomment', () => {
    assert.equal(theme('venus-d-ailleurs').montrerLangue, true);
    assert.equal(theme('origine-arabe').montrerLangue, false);
  });
  it('l’éventail montre les trois timbres les plus rares de la liste', () => {
    const timbres = timbresDuTheme(theme('origine-gauloise'));
    assert.equal(timbres.length, 3);
    assert.ok(timbres.every((c) => c.faction === 'Gaulois'));
  });
});

describe('les listes d’un mot', () => {
  const listes = listesParMot(themes);
  it('son origine d’abord, puis les mots rares et les records quand il en est', () => {
    const lexie = edition.cartes.find((c) => c.mot === 'lexie')!;
    const adresses = (listes.get(lexie.id) ?? []).map((l) => l.adresse);
    assert.deepEqual(adresses.slice(-2), ['mots-rares', 'records']);
    assert.deepEqual(listes.get('brasser-verbe'), [{ adresse: 'origine-gauloise', titre: 'Les mots venus du gaulois' }]);
    assert.equal(listes.get('accabler-verbe'), undefined, 'hors des listes, pas de lien');
  });
  it('chaque lien mène à une liste qui contient le mot', () => {
    for (const [id, lesListes] of listes) for (const l of lesListes) assert.ok(motsDe(l.adresse).some((m) => m.carte.id === id), `${id} → ${l.adresse}`);
  });
});
