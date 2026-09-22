import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { couperEnLignes, nomDuFichierImage, tailleDuMot, texteDePartage } from './miseEnLignes.ts';

// Une règle simple : chaque caractère fait une unité.
const mesurer = (texte: string): number => texte.length;

describe('mise en lignes du texte du timbre', () => {
  it('coupe entre les mots, sans jamais dépasser la largeur', () => {
    const lignes = couperEnLignes('Grande pièce d’étoffe servant de rideau contre la lumière.', 20, mesurer);
    assert.deepEqual(lignes, ['Grande pièce', 'd’étoffe servant de', 'rideau contre la', 'lumière.']);
    assert.ok(lignes.every((l) => mesurer(l) <= 20));
  });
  it('garde un mot trop long seul sur sa ligne plutôt que de le perdre', () => {
    assert.deepEqual(couperEnLignes('anticonstitutionnellement oui', 10, mesurer), ['anticonstitutionnellement', 'oui']);
  });
  it('abrège avec des points de suspension quand il y a trop de lignes', () => {
    const lignes = couperEnLignes('un deux trois quatre cinq six sept huit neuf dix', 9, mesurer, 2);
    assert.equal(lignes.length, 2);
    assert.ok(lignes[1].endsWith('…'));
    assert.ok(mesurer(lignes[1]) <= 9);
  });
  it('rend une liste vide pour un texte vide', () => {
    assert.deepEqual(couperEnLignes('   ', 10, mesurer), []);
  });
  it('donne au mot la taille du timbre à l’écran, et un nom de fichier stable', () => {
    assert.equal(tailleDuMot('chic'), 10.5);
    assert.equal(tailleDuMot('anticonstitutionnellement'), 96 / 25);
    assert.equal(nomDuFichierImage('velum-nom'), 'mots-timbre-velum-nom.png');
    assert.match(texteDePartage('velum', 'Épique', 'Latin', 'https://x.test/'), /« velum ».*épique.*Latin.*https:\/\/x\.test\//);
  });
});
