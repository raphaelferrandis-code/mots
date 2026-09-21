// Tests : origine des mots et factions.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyserEtymologie, resoudreOrigines } from '../etapes/factions.ts';
import type { MotAOrigine } from '../etapes/factions.ts';
import { estUneOrigineConnue, factionDeLaLangue } from '../config.ts';

describe('lecture d\'une étymologie', () => {
  it('reconnaît la langue citée en ouverture', () => {
    assert.deepEqual(analyserEtymologie('Du latin advocatus (« défenseur, avoué »).'), { type: 'langue', langue: 'Latin' });
    assert.deepEqual(analyserEtymologie('Emprunté au grec ancien καλλίπυγος, kallípugos.'), { type: 'langue', langue: 'Grec' });
    assert.deepEqual(analyserEtymologie('De l’arabe هجرة, hijra (« exil »).'), { type: 'langue', langue: 'Arabe' });
  });
  it('ignore les parenthèses et la ponctuation parasites en tête', () => {
    assert.deepEqual(analyserEtymologie('(Adjectif) De l’anglais avocado, lui-même de l’espagnol aguacate.'), { type: 'langue', langue: 'Anglais' });
    assert.deepEqual(analyserEtymologie(', (Adjectif)Dérivé de banque, avec le suffixe -ier.'), { type: 'derive', candidats: ['banque'], repli: null });
  });
  it('traverse l\'ancien français quand une origine plus lointaine est donnée', () => {
    assert.deepEqual(analyserEtymologie('De l’ancien français dancier, du vieux-francique *dansōn.'), { type: 'langue', langue: 'Francique et germanique ancien' });
    assert.deepEqual(analyserEtymologie('De l’ancien français fenestre, du latin fenestra.'), { type: 'langue', langue: 'Latin' });
    assert.deepEqual(analyserEtymologie('De l’ancien français boistous.'), { type: 'langue', langue: 'Ancien français' });
  });
  it('ne confond pas une langue avec un mot qui lui ressemble', () => {
    assert.deepEqual(analyserEtymologie('De l’ancien français greche ou grebbe, emprunt au vieux-francique *krippia.'), { type: 'langue', langue: 'Francique et germanique ancien' });
    assert.deepEqual(analyserEtymologie('Mot propre au Nord de la France (lauze en Occitanie) ; d’origine obscure.'), { type: 'inconnue' });
  });
  it('ne prend pas pour origine une langue citée pour comparaison', () => {
    assert.deepEqual(analyserEtymologie('De l’ancien français bauc (« poutre »). Comparez avec l’anglais balk.'), { type: 'langue', langue: 'Ancien français' });
    assert.deepEqual(analyserEtymologie('De l’ancien français brique. Pihan le dérive toutefois de l’arabe bàriq.'), { type: 'langue', langue: 'Ancien français' });
    assert.deepEqual(
      analyserEtymologie('En ancien français mespriser (« moins priser »),dérivé de priser, avec le préfixe més-, apparenté à menospreciar en espagnol.'),
      { type: 'derive', candidats: ['priser'], repli: 'Ancien français' },
    );
  });
  it('trouve le mot français dont un mot est tiré', () => {
    assert.deepEqual(analyserEtymologie('Dérivé de danser, avec le suffixe -eur.'), { type: 'derive', candidats: ['danser'], repli: null });
    assert.deepEqual(analyserEtymologie('Motdérivé de mobile, avec le suffixe -ier, calque du latin médiéval mobiliaria.'), { type: 'derive', candidats: ['mobile'], repli: 'Latin' });
    assert.deepEqual(analyserEtymologie('De re- et nommer'), { type: 'derive', candidats: ['nommer'], repli: null });
    assert.deepEqual(analyserEtymologie('Du verbe éblouir.'), { type: 'derive', candidats: ['éblouir'], repli: null });
    assert.deepEqual(analyserEtymologie('→ voir retrousser'), { type: 'derive', candidats: ['retrousser'], repli: null });
  });
  it('s\'arrête au premier mot : la suite de la phrase n\'est pas une origine', () => {
    assert.deepEqual(analyserEtymologie('De goule, aujourd\'hui gueule, avec le suffixe -u.'), { type: 'derive', candidats: ['goule'], repli: null });
    assert.deepEqual(
      analyserEtymologie('Du minnan 搖搖 (« petit canot à godille »), formé par redoublement du mot correspondant au chinois mandarin yáo.'),
      { type: 'derive', candidats: ['minnan'], repli: 'Chinois' },
    );
  });
  it('ne devine rien pour une marque, un nom propre ou un texte vide', () => {
    assert.deepEqual(analyserEtymologie('Nom d\'un marque déposée.'), { type: 'inconnue' });
    assert.deepEqual(analyserEtymologie('Du nom de famille du cinéaste Alfred Hitchcock.'), { type: 'inconnue' });
    assert.deepEqual(analyserEtymologie(''), { type: 'inconnue' });
    assert.deepEqual(analyserEtymologie('Étymologie manquante ou incomplète. Si vous la connaissez, vous pouvez l’ajouter.'), { type: 'inconnue' });
  });
});

const mot = (nom: string, etymologie: string, base = ''): MotAOrigine => ({ cle: `${nom}|Nom`, mot: nom, etymologies: etymologie ? [etymologie] : [], base });

describe('héritage des origines', () => {
  const mots = [
    mot('danser', 'De l’ancien français dancier, du vieux-francique *dansōn.'),
    mot('danseur', 'Dérivé de danser, avec le suffixe -eur.'),
    mot('dansotter', 'Dérivé de danseur.'),
    mot('dansottement', 'Dérivé de dansotter.'),
    mot('fruitier', 'Apparaît avec le sens de « personne qui prend soin des fruits ».', 'fruit'),
    mot('fruit', 'Du latin fructus.'),
    mot('praline', 'De prasline, dérivé du nom du maréchal du Plessis-Praslin.'),
    mot('machin', ''),
  ];
  const origines = resoudreOrigines(mots);
  const de = (nom: string) => origines.get(`${nom}|Nom`)!;

  it('fait hériter un dérivé de l\'origine de son mot d\'origine', () => {
    assert.deepEqual(de('danseur'), { langue: 'Francique et germanique ancien', faction: 'Francique', reconnue: true, via: 'danser' });
  });
  it('remonte de deux niveaux, pas plus', () => {
    assert.equal(de('dansotter').faction, 'Francique');
    assert.deepEqual(de('dansottement'), { langue: 'Formation française', faction: 'Formation française', reconnue: false, via: null });
  });
  it('utilise en dernier recours le mot d\'origine indiqué par Lexique', () => {
    assert.deepEqual(de('fruitier'), { langue: 'Latin', faction: 'Latin', reconnue: true, via: 'fruit' });
  });
  it('laisse sans faction les mots dont l\'origine reste introuvable', () => {
    assert.equal(de('praline').reconnue, false);
    assert.deepEqual(de('machin'), { langue: 'Origine inconnue', faction: 'Origine inconnue', reconnue: false, via: null });
  });
  it('prend la première étymologie exploitable d\'un homographe', () => {
    const avocat: MotAOrigine = { cle: 'avocat|Nom', mot: 'avocat', etymologies: ['', 'Du latin advocatus.', 'De l’anglais avocado.'], base: '' };
    assert.equal(resoudreOrigines([avocat]).get('avocat|Nom')!.faction, 'Latin');
  });
  it('applique les corrections faites à la main, et les transmet aux dérivés', () => {
    const corriges = resoudreOrigines([mot('goule', 'De l’arabe ghoul.'), mot('goulu', 'De goule, aujourd\'hui gueule.'), mot('goulument', 'Dérivé de goulu.')], new Map([['goulu', 'Latin']]));
    assert.equal(corriges.get('goule|Nom')!.faction, 'Arabe');
    assert.equal(corriges.get('goulu|Nom')!.faction, 'Latin');
    assert.equal(corriges.get('goulument|Nom')!.faction, 'Latin');
  });
});

describe('des langues aux factions', () => {
  it('regroupe les langues selon le découpage du jeu', () => {
    assert.equal(factionDeLaLangue('Néerlandais'), 'Allemand et néerlandais');
    assert.equal(factionDeLaLangue('Portugais'), 'Espagnol et portugais');
    assert.equal(factionDeLaLangue('Ancien français'), 'Vieux français');
    assert.equal(factionDeLaLangue('Japonais'), "Langues d'ailleurs");
  });
  it('accepte un nom de faction écrit directement dans le fichier de corrections', () => {
    assert.equal(factionDeLaLangue('Espagnol et portugais'), 'Espagnol et portugais');
    assert.ok(estUneOrigineConnue('Vieux français'));
    assert.ok(estUneOrigineConnue('Japonais'));
    assert.ok(!estUneOrigineConnue('Klingon'));
  });
});
