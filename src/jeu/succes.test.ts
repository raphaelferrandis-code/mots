import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUCCES, titreDuSucces } from './catalogueSucces.ts';
import { actualiserLesSucces, mesurerLesSucces } from './succes.ts';
import { nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import type { CartePossedee } from './sauvegarde.ts';
import type { CarteIndex, IndexEdition } from '../partage/types.ts';
import { acheterOrnement, estDisponible, nouveauProfil, ornement, relireProfil } from './personnalisation.ts';
import { noterUneReponse } from './progression.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { structure } from '../../serveur/fabriquer-le-script.ts';

const edition = JSON.parse(readFileSync(new URL('../../public/data/edition-1.index.json', import.meta.url), 'utf8')) as IndexEdition;
const index = new Map(edition.cartes.map(c => [c.id, c]));
const possession = (fin: CartePossedee['finitions'] = { Normale: 1 }): CartePossedee => ({ obtenueLe: 1, doublons: 0, finitions: fin, posees: 0, reussites: 0, maitriseeLe: null });

it('contient 50 succès et 50 titres distincts, tous atteignables avec l’édition', () => {
  assert.equal(SUCCES.length, 50);
  for (const champ of ['id', 'nom', 'titre'] as const) assert.equal(new Set(SUCCES.map(s => s[champ])).size, 50);
  const s = nouvelleSauvegarde(0, 0);
  s.cartes = Object.fromEntries(edition.cartes.map(c => [c.id, { ...possession({ Normale: 1, Brillante: 1, Holographique: 1 }), reussites: 10, maitriseeLe: 1 }]));
  s.paquets.ouverts = 250; s.duels.joues = 100; s.duels.gagnes = 100;
  s.joutes.jouees = 25; s.joutes.gagnees = 25; s.parades.Rare = { posees: 100, reussies: 100 };
  const fini = actualiserLesSucces(s, index);
  assert.equal(fini.profil.succes.length, 50);
});

it('attribue les titres exactement au seuil et conserve les acquis après une vente', () => {
  const s = nouvelleSauvegarde(0, 0);
  s.cartes = Object.fromEntries(edition.cartes.slice(0, 9).map(c => [c.id, possession()]));
  const avant = actualiserLesSucces(s, index);
  assert.ok(!avant.profil.succes.includes('dix-mots'));
  avant.cartes[edition.cartes[9].id] = possession();
  const apres = actualiserLesSucces(avant, index);
  assert.ok(apres.profil.succes.includes('dix-mots'));
  assert.deepEqual(actualiserLesSucces(apres, index), apres);
  const vendu = actualiserLesSucces({ ...apres, cartes: {} }, index);
  assert.deepEqual(vendu.profil.succes, apres.profil.succes);
  assert.equal(vendu.profil.progressionSucces.collection, 10);
  assert.equal(vendu.encre, s.encre);
  assert.equal(vendu.profil.xp, s.profil.xp);
});

it('ne compte pas les doublons comme des mots distincts et attend l’édition pour les raretés', () => {
  const s = nouvelleSauvegarde(0, 0);
  const rare = edition.cartes.find(c => c.rarete === 'Rare')!;
  s.cartes[rare.id] = { ...possession({ Normale: 99, Brillante: 25, Holographique: 7 }), doublons: 128 };
  const sans = actualiserLesSucces(s);
  assert.ok(!sans.profil.succes.includes('premier-rare'));
  const avec = actualiserLesSucces(sans, index);
  assert.ok(avec.profil.succes.includes('premier-rare'));
  assert.equal(avec.profil.progressionSucces.rares, 1);
  assert.equal(avec.profil.progressionSucces.brillantes, 1);
  assert.equal(avec.profil.progressionSucces.holographiques, 1);
  assert.equal(avec.profil.progressionSucces.triptyques, 1);
  assert.equal(avec.profil.progressionSucces.collection, 1);
});

it('compte les lettres sans les tirets, les origines et les natures distinctes', () => {
  const s = nouvelleSauvegarde(0, 0);
  const modele = edition.cartes[0];
  const cartes: CarteIndex[] = [{ ...modele, id: 'a', mot: 'arc-à', type: 'Nom', faction: 'Latin' }, { ...modele, id: 'b', mot: 'abcdefghijkl', type: 'Verbe', faction: 'Grec' }];
  s.cartes = { a: possession(), b: possession() };
  const mesures = mesurerLesSucces(s, new Map(cartes.map(c => [c.id, c])));
  assert.equal(mesures.courts, 1); assert.equal(mesures.longs, 1);
  assert.equal(mesures.origines, 2); assert.equal(mesures.natures, 2);
});

it('reprend les statistiques anciennes, puis sauvegarde les titres gagnés et équipés', () => {
  const ancienne = relireSauvegarde({ version: 5, cartes: {}, paquets: { ouverts: 25 }, profil: { titre: 'curieux', xp: 1000, achats: ['arpenteur'] } }, 0);
  const s = actualiserLesSucces(ancienne, index);
  assert.ok(s.profil.succes.includes('vingt-cinq-paquets'));
  s.profil.titre = titreDuSucces('vingt-cinq-paquets');
  assert.deepEqual(relireSauvegarde(JSON.parse(JSON.stringify(s)), 0), s);
  assert.deepEqual(s.profil.achats, []);
  const propre = relireProfil({ succes: ['inconnu', 'premier-mot', 'premier-mot'], progressionSucces: { paquets: -1, definitions: Infinity, collection: 5, inconnue: 50 }, titre: titreDuSucces('dix-mots') });
  assert.deepEqual(propre.succes, ['premier-mot']);
  assert.deepEqual(propre.progressionSucces, { collection: 5 });
  assert.equal(propre.titre, '');
});

it('interdit d’obtenir un titre par XP, Encre, ancien achat ou abonnement', () => {
  const sql = structure();
  for (const succes of SUCCES) {
    const o = ornement(titreDuSucces(succes.id))!;
    const profil = { ...nouveauProfil(), xp: 1_000_000, achats: [o.id] };
    assert.equal(estDisponible(profil, o, true), false);
    assert.throws(() => acheterOrnement(profil, 1_000_000, o.id), /succès/);
    assert.equal(estDisponible({ ...profil, succes: [succes.id] }, o), true);
    assert.ok(!sql.includes(`when '${o.id}' then`));
  }
  for (const ancien of ['arpenteur', 'gardien', 'botaniste', 'cartographe', 'veilleur']) assert.ok(!sql.includes(`when '${ancien}' then`));
});

it('conserve les bonnes réponses après une vente sans compter les erreurs ou les mots absents', () => {
  let s = nouvelleSauvegarde(0, 0);
  s.cartes.a = { ...possession(), reussites: 24, posees: 24 };
  s = actualiserLesSucces(s);
  s.cartes = { b: possession() };
  const faux = noterUneReponse(s, 'b', false, 1, EQUILIBRAGE.duel).sauvegarde;
  assert.equal(faux.profil.progressionSucces.definitions, 24);
  assert.equal(noterUneReponse(s, 'absent', true, 1, EQUILIBRAGE.duel).sauvegarde, s);
  const juste = actualiserLesSucces(noterUneReponse(faux, 'b', true, 1, EQUILIBRAGE.duel).sauvegarde);
  assert.equal(juste.profil.progressionSucces.definitions, 25);
  assert.ok(juste.profil.succes.includes('vingt-cinq-definitions'));
  assert.equal(s.profil.progressionSucces.definitions, 24);
});
