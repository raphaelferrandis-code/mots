import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nouvelleSauvegarde } from './sauvegarde.ts';
import { aImporter, aQuelqueChoseAImporter, fusionner, lireEtat, lireRecuperation } from './synchronisation.ts';
import type { EtatDuCompte } from './synchronisation.ts';

const T0 = 1_700_000_000_000;

function partieLocale() {
  const s = nouvelleSauvegarde(T0, 3);
  s.encre = 42;
  s.paquets = { stock: 1, reference: T0 + 5_000, ouverts: 4, sansLegendaire: 2 };
  s.cartes = {
    'zeugma-nom': { obtenueLe: T0, doublons: 1, finitions: { Normale: 2 }, posees: 6, reussites: 5, maitriseeLe: T0 + 100 },
    'velum-nom': { obtenueLe: T0 + 1, doublons: 0, finitions: { Brillante: 1 }, posees: 1, reussites: 0, maitriseeLe: null },
  };
  s.deck = ['zeugma-nom', 'velum-nom'];
  s.reglages.sonsPaquets = false;
  s.joutes.pseudo = 'Zeugma 12';
  return s;
}

const etatDuServeur: EtatDuCompte = {
  encre: 300,
  paquets: { stock: 7, reference: T0 + 9_000, ouverts: 10, sansLegendaire: 0 },
  deck: ['zeugma-nom', 'cabale-nom', 'inconnue-nom'],
  maintenant: T0 + 10_000,
  cartes: {
    'zeugma-nom': { obtenueLe: T0, doublons: 3, finitions: { Normale: 3, Holographique: 1 } },
    'cabale-nom': { obtenueLe: T0 + 2, doublons: 0, finitions: { Normale: 1 } },
  },
  codeDeSecoursLe: null,
};

describe('la collection tenue par le serveur', () => {
  it('fusionne : le serveur donne l’Encre, les paquets, le deck et les timbres ; l’appareil garde ses réglages et sa maîtrise', () => {
    const locale = partieLocale();
    const avant = structuredClone(locale);
    const fusion = fusionner(locale, etatDuServeur);
    assert.deepEqual(locale, avant, 'la sauvegarde locale n’est pas modifiée en place');
    assert.equal(fusion.encre, 300);
    assert.deepEqual(fusion.paquets, etatDuServeur.paquets);
    assert.deepEqual(Object.keys(fusion.cartes).sort(), ['cabale-nom', 'zeugma-nom'], 'velum, absent du serveur, disparaît');
    assert.deepEqual(fusion.cartes['zeugma-nom'], { obtenueLe: T0, doublons: 3, finitions: { Normale: 3, Holographique: 1 }, posees: 6, reussites: 5, maitriseeLe: T0 + 100 });
    assert.deepEqual(fusion.cartes['cabale-nom'], { obtenueLe: T0 + 2, doublons: 0, finitions: { Normale: 1 }, posees: 0, reussites: 0, maitriseeLe: null });
    assert.deepEqual(fusion.deck, ['zeugma-nom', 'cabale-nom'], 'le deck ne garde que des cartes possédées');
    assert.equal(fusion.reglages.sonsPaquets, false);
    assert.equal(fusion.joutes.pseudo, 'Zeugma 12');
  });

  it('relit un état du serveur sans rien supposer de sa forme', () => {
    const lu = lireEtat({ encre: 5, paquets: { stock: 'x', ouverts: 2 }, deck: ['a', 3], maintenant: 1, cartes: { 'a-nom': { obtenueLe: 1, finitions: { Normale: 0, Fausse: 2 } }, 'b-nom': 'abîmée' } });
    assert.deepEqual(lu, { encre: 5, paquets: { stock: 0, reference: 0, ouverts: 2, sansLegendaire: 0 }, deck: ['a'], maintenant: 1, cartes: { 'a-nom': { obtenueLe: 1, doublons: 0, finitions: { Normale: 1 } } }, codeDeSecoursLe: null });
    assert.throws(() => lireEtat(null), /illisible/);
    assert.equal(lireEtat({ ...etatDuServeur, codeDeSecoursLe: 42 }).codeDeSecoursLe, 42);
    const recuperation = lireRecuperation({ ...etatDuServeur, profil: { pseudo: 'Zeugma 12', cote: 1016, jouees: 3, gagnees: 2 } });
    assert.deepEqual(recuperation.profil, { pseudo: 'Zeugma 12', cote: 1016, jouees: 3, gagnees: 2 });
    assert.equal(lireRecuperation({ ...etatDuServeur, profil: null }).profil, null);
  });

  it('sait quand une partie mérite d’être importée, et n’envoie que ce qui a de la valeur', () => {
    assert.equal(aQuelqueChoseAImporter(nouvelleSauvegarde(T0, 3)), false, 'un nouveau joueur n’a rien à importer');
    assert.equal(aQuelqueChoseAImporter(partieLocale()), true);
    const envoi = aImporter(partieLocale());
    assert.deepEqual(Object.keys(envoi).sort(), ['cartes', 'creeLe', 'deck', 'encre', 'paquets']);
    assert.deepEqual(envoi.cartes['zeugma-nom'], { obtenueLe: T0, doublons: 1, finitions: { Normale: 2 } }, 'ni la maîtrise ni les résultats en duel');
    assert.equal(envoi.paquets.ouverts, 4);
  });
});
