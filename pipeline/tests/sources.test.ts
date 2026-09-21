// Tests : lecture de Lexique 4 et du Wiktionnaire.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyserLexique, cle } from '../etapes/lexique.ts';
import { analyserLigne, fusionner } from '../etapes/wiktionnaire.ts';
import type { Compteurs, MotBrut } from '../etapes/wiktionnaire.ts';

const ENTETES = ['1_Mot', '4_Lemme', '5_Cgram', '12_FreqLemme', '14_IsLem', '30_MorphoBase', '33_Preval', '34_PrevalNb'].join('\t');
const LEXIQUE = [
  ENTETES,
  ['danseur', 'danseur', 'NOM', '16.769', '1', 'danser', '100', '27'],
  ['danseurs', 'danseur', 'NOM', '16.769', '0', 'danser', '100', '27'],
  ['sourire', 'sourire', 'VER', '43.554', '1', 'rire', '', ''],
  ['sourire', 'sourire', 'NOM', '33.658', '1', 'rire', '100', '14'],
  ['lui', 'lui', 'PRO:per', '5000', '1', 'lui', '100', '20'],
  ["aujourd'hui", "aujourd'hui", 'ADV', '300', '1', '', '100', '20'],
  ['livre', 'livre', 'NOM', '10', '1', 'livre', '', ''],
  ['livre', 'livre', 'NOM', '5', '1', 'livre', '98', '12'],
].map((l) => (Array.isArray(l) ? l.join('\t') : l)).join('\n');

describe('Lexique 4', () => {
  const resultat = analyserLexique(LEXIQUE);

  it('ne garde que les formes de base des quatre natures', () => {
    assert.deepEqual([...resultat.lemmes.keys()].sort(), ['danseur|Nom', 'livre|Nom', 'sourire|Nom', 'sourire|Verbe']);
    assert.equal(resultat.lignes, 8);
    assert.equal(resultat.ecartes.get('forme fléchie (conjugaison, pluriel…)'), 1);
    assert.equal(resultat.ecartes.get('contient une espace ou une apostrophe'), 1);
  });
  it('lit la fréquence du mot entier, la prévalence et le mot d\'origine', () => {
    assert.deepEqual(resultat.lemmes.get(cle('danseur', 'Nom')), { nature: 'Nom', frequence: 16.769, prevalence: 100, avis: 27, base: 'danser' });
  });
  it('distingue une prévalence absente d\'une prévalence nulle', () => {
    assert.equal(resultat.lemmes.get(cle('sourire', 'Verbe'))!.prevalence, null);
  });
  it('additionne un même mot présent sur deux lignes', () => {
    const livre = resultat.lemmes.get(cle('livre', 'Nom'))!;
    assert.equal(livre.frequence, 15);
    assert.equal(livre.prevalence, 98);
  });
  it('refuse un fichier auquel il manque une colonne', () => {
    assert.throws(() => analyserLexique('1_Mot\t5_Cgram\nmot\tNOM'), /absente de Lexique/);
  });
});

const entree = (champs: Record<string, unknown>): string => {
  const { word, lang_code = 'fr', pos, ...reste } = champs;
  // Même ordre de champs que le vrai fichier : le pipeline s'appuie dessus pour aller vite.
  return `{"word": ${JSON.stringify(word)}, "lang_code": ${JSON.stringify(lang_code)}, "lang": "Français", "pos": ${JSON.stringify(pos)}, ${JSON.stringify(reste).slice(1)}`;
};

describe('Wiktionnaire', () => {
  const { lemmes } = analyserLexique(LEXIQUE);
  const compteurs = (): Compteurs => ({ lignes: 0, francais: 0, retenues: 0, flexions: 0, renvois: 0 });

  it('ignore les autres langues, les autres natures et les mots absents de Lexique', () => {
    const c = compteurs();
    assert.equal(analyserLigne(entree({ word: 'danseur', lang_code: 'it', pos: 'noun', senses: [] }), lemmes, c), null);
    assert.equal(analyserLigne(entree({ word: 'danseur', pos: 'name', senses: [] }), lemmes, c), null);
    assert.equal(analyserLigne(entree({ word: 'zigoto', pos: 'noun', senses: [] }), lemmes, c), null);
    assert.deepEqual(c, { lignes: 3, francais: 2, retenues: 0, flexions: 0, renvois: 0 });
  });
  it('écarte les simples formes fléchies', () => {
    const c = compteurs();
    assert.equal(analyserLigne(entree({ word: 'sourire', pos: 'verb', tags: ['form-of'], senses: [{ glosses: ['Forme de sourire.'] }] }), lemmes, c), null);
    assert.equal(c.flexions, 1);
  });
  it('retient un mot avec ses définitions nettoyées, sans les renvois', () => {
    const c = compteurs();
    const mot = analyserLigne(entree({
      word: 'danseur', pos: 'noun',
      etymology_texts: ['Dérivé de danser, avec le suffixe -eur.'],
      senses: [
        { glosses: ['Celui qui danse ^([1]).'], tags: ['familiar'], topics: ['dance'] },
        { glosses: ['Artiste', 'Celui qui fait profession de danser.'], raw_tags: ['Métier'] },
        { glosses: ['Pluriel de danseuse.'] },
        { glosses: ['Variante.'], alt_of: [{ word: 'dansseur' }] },
      ],
      synonyms: [{ word: 'ballerin' }], derived: [{ word: 'danseur étoile' }, { word: 'danseur de corde' }],
      attestations: [{ date: 'XIIᵉ siècle' }],
    }), lemmes, c)!;
    assert.equal(mot.mot, 'danseur');
    assert.equal(mot.nature, 'Nom');
    assert.deepEqual(mot.sens, [
      { definition: 'Celui qui danse.', etiquettes: ['familiar'], domaines: ['dance'] },
      { definition: 'Celui qui fait profession de danser.', etiquettes: ['Métier'], domaines: [] },
    ]);
    assert.deepEqual([mot.synonymes, mot.derives, mot.attestation, c.renvois], [1, 2, 'XIIᵉ siècle', 2]);
    assert.deepEqual(mot.etymologies, ['Dérivé de danser, avec le suffixe -eur.']);
  });
  it('lit aussi un mot qui contient des caractères échappés', () => {
    const mot = analyserLigne(entree({ word: 'livre', pos: 'noun', senses: [{ glosses: ['Assemblage de feuilles "reliées".'] }] }), lemmes, compteurs());
    assert.equal(mot!.sens[0].definition, 'Assemblage de feuilles "reliées".');
  });
  it('regroupe les homographes en un seul mot', () => {
    const mots = new Map<string, MotBrut>();
    const lire = (champs: Record<string, unknown>): void => fusionner(mots, analyserLigne(entree(champs), lemmes, compteurs())!);
    lire({ word: 'livre', pos: 'noun', etymology_texts: ['Du latin liber.'], senses: [{ glosses: ['Assemblage de feuilles imprimées.'] }] });
    lire({ word: 'livre', pos: 'noun', etymology_texts: ['Du latin libra.'], senses: [{ glosses: ['Unité de masse valant un demi-kilogramme.'] }], attestations: [{ date: '980' }] });
    const livre = mots.get(cle('livre', 'Nom'))!;
    assert.equal(mots.size, 1);
    assert.equal(livre.entrees, 2);
    assert.equal(livre.sens.length, 2);
    assert.deepEqual(livre.etymologies, ['Du latin liber.', 'Du latin libra.']);
    assert.equal(livre.attestation, '980');
  });
});
