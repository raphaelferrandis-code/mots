// Tests : assemblage des cartes et composition d'une édition.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RARETES_ORDINAIRES as RARETES } from '../../src/partage/types.ts';
import type { Nature, Rarete } from '../../src/partage/types.ts';
import { CONFIG } from '../config.ts';
import { assemblerCartes } from '../etapes/cartes.ts';
import type { CarteComplete } from '../etapes/cartes.ts';
import { allouer, composerEdition, estEligible, garderLEditionPubliee, noteDeQualite, partsDesFactions, renoterDansLEdition } from '../etapes/edition.ts';
import { creerHasard } from '../etapes/stats.ts';
import type { MotBrut } from '../etapes/wiktionnaire.ts';

const somme = (valeurs: Iterable<number>): number => [...valeurs].reduce((a, b) => a + b, 0);

function carte(champs: { mot: string; faction?: string; rarete?: Rarete; type?: Nature; prevalence?: number | null; reconnue?: boolean; duel?: number; definition?: string; richesse?: number; lettres?: number }): CarteComplete {
  const type = champs.type ?? 'Nom';
  const prevalence = champs.prevalence === undefined ? 50 : champs.prevalence;
  return {
    index: { id: `${champs.mot}-${type}`, mot: champs.mot, type, rarete: champs.rarete ?? 'Commune', attaque: 5, defense: 5, faction: champs.faction ?? 'Latin', registre: [], definition: '' },
    details: { definitions: [{ texte: champs.definition ?? 'Une définition de longueur tout à fait convenable pour le duel.', quiz: (champs.duel ?? 1) > 0 }], etymologie: '', langueOrigine: champs.faction ?? 'Latin', frequence: 1, prevalence },
    factionReconnue: champs.reconnue ?? true,
    herite: null, homographes: 1, nombreDeSens: 1, synonymes: 0, derives: 0,
    valeurLettres: champs.lettres ?? 10, richesse: champs.richesse ?? 1,
    etiquettesDuPremierSens: [], domainesDuPremierSens: [],
    prevalenceMesuree: prevalence !== null,
    definitionsDeDuel: champs.duel ?? 1,
  };
}

describe('partage des places entre factions', () => {
  it('gonfle les petites factions et plafonne les grosses', () => {
    const parts = partsDesFactions(new Map([['Latin', 16000], ['Anglais', 1200], ['Arabe', 180]]), 0.5, 0.35);
    assert.ok(Math.abs(somme(parts.values()) - 1) < 1e-9);
    assert.ok(parts.get('Latin')! <= 0.35 + 1e-9);
    assert.ok(parts.get('Arabe')! > 180 / 17380, 'la petite faction doit peser plus que sa part réelle');
    assert.ok(parts.get('Anglais')! > parts.get('Arabe')!);
  });
  it('respecte les proportions réelles quand l\'exposant vaut 1 et qu\'il n\'y a pas de plafond', () => {
    const parts = partsDesFactions(new Map([['A', 300], ['B', 100]]), 1, 1);
    assert.deepEqual([parts.get('A'), parts.get('B')], [0.75, 0.25]);
  });
  it('ne donne jamais plus de places qu\'il n\'y a de cartes, et reporte le reste sur les autres', () => {
    const places = allouer(100, new Map([['A', 0.5], ['B', 0.3], ['C', 0.2]]), new Map([['A', 1000], ['B', 10], ['C', 1000]]));
    assert.equal(places.get('B'), 10);
    assert.equal(somme(places.values()), 100);
    assert.ok(places.get('A')! > places.get('C')!);
  });
  it('donne tout ce qui existe quand il n\'y a pas assez de cartes', () => {
    const places = allouer(100, new Map([['A', 0.5], ['B', 0.5]]), new Map([['A', 20], ['B', 30]]));
    assert.deepEqual([places.get('A'), places.get('B')], [20, 30]);
  });
});

describe('éligibilité et qualité', () => {
  it('exige une faction reconnue, une prévalence mesurée et une définition de duel', () => {
    assert.ok(estEligible(carte({ mot: 'bon' }), new Set()));
    assert.ok(!estEligible(carte({ mot: 'sansfaction', reconnue: false }), new Set()));
    assert.ok(!estEligible(carte({ mot: 'nonmesure', prevalence: null }), new Set()));
    assert.ok(!estEligible(carte({ mot: 'sansduel', duel: 0 }), new Set()));
    assert.ok(!estEligible(carte({ mot: 'exclu' }), new Set(['exclu'])));
  });
  it('préfère, pour une carte rare, un mot déjà entendu à un mot totalement inconnu', () => {
    const entendu = noteDeQualite(carte({ mot: 'a', rarete: 'Légendaire', prevalence: 33 }), CONFIG.edition);
    const inconnu = noteDeQualite(carte({ mot: 'b', rarete: 'Légendaire', prevalence: 0 }), CONFIG.edition);
    assert.ok(entendu > inconnu);
  });
  it('préfère, pour une carte commune, un mot connu de tous', () => {
    assert.ok(noteDeQualite(carte({ mot: 'a', prevalence: 100 }), CONFIG.edition) > noteDeQualite(carte({ mot: 'b', prevalence: 40 }), CONFIG.edition));
  });
  it('pénalise les définitions trop courtes', () => {
    assert.ok(noteDeQualite(carte({ mot: 'a' }), CONFIG.edition) > noteDeQualite(carte({ mot: 'b', definition: 'Merrain.' }), CONFIG.edition));
  });
});

describe('composition d\'une édition', () => {
  const hasard = creerHasard(7);
  const FACTIONS: [string, number][] = [['Latin', 0.7], ['Anglais', 0.2], ['Arabe', 0.1]];
  const TYPES: Nature[] = ['Nom', 'Nom', 'Nom', 'Adjectif', 'Verbe', 'Adverbe'];
  const base: CarteComplete[] = [];
  for (let i = 0; i < 6000; i++) {
    const tirage = hasard();
    const faction = tirage < FACTIONS[0][1] ? 'Latin' : tirage < FACTIONS[0][1] + FACTIONS[1][1] ? 'Anglais' : 'Arabe';
    base.push(carte({ mot: `mot${i}`, faction, rarete: RARETES[Math.floor(hasard() * 5)], type: TYPES[Math.floor(hasard() * TYPES.length)], prevalence: Math.floor(hasard() * 101), richesse: hasard() * 10, lettres: Math.floor(hasard() * 30) }));
  }
  base.push(carte({ mot: 'sansfaction', reconnue: false }), carte({ mot: 'interdit' }), carte({ mot: 'chouchou', prevalence: null, rarete: 'Rare', faction: 'Arabe' }), carte({ mot: 'orphelin', reconnue: false }));

  const reglages = { ...CONFIG.edition, taille: 1000 };
  const listes = { exclusions: new Set(['interdit']), coupsDeCoeur: new Set(['chouchou', 'orphelin', 'fantome']) };
  const { edition, journal } = composerEdition(base, listes, reglages, CONFIG.rarete.parts);
  const compter = (critere: (c: CarteComplete) => string): Map<string, number> => {
    const table = new Map<string, number>();
    for (const c of edition) table.set(critere(c), (table.get(critere(c)) ?? 0) + 1);
    return table;
  };

  it('atteint la taille demandée, sans doublon', () => {
    assert.equal(edition.length, 1000);
    assert.equal(new Set(edition.map((c) => c.index.id)).size, 1000);
  });
  it('respecte les parts de chaque rareté', () => {
    const parRarete = compter((c) => c.index.rarete);
    assert.deepEqual(RARETES.map((r) => parRarete.get(r)), [500, 250, 150, 70, 30]);
  });
  it('plafonne la grosse faction et gonfle la petite', () => {
    const parFaction = compter((c) => c.index.faction);
    assert.ok(parFaction.get('Latin')! <= 0.35 * 1000 + 5);
    assert.ok(parFaction.get('Arabe')! > 0.1 * 1000);
  });
  it('mélange les types de mots', () => {
    const parType = compter((c) => c.index.type);
    assert.ok(parType.get('Verbe')! > 150 && parType.get('Adjectif')! > 150 && parType.get('Adverbe')! > 20);
  });
  it('n\'accepte ni les cartes inéligibles ni les mots exclus', () => {
    const mots = new Set(edition.map((c) => c.index.mot));
    assert.ok(!mots.has('sansfaction') && !mots.has('interdit'));
  });
  it('fait entrer les coups de cœur, et signale ceux qui sont impossibles', () => {
    assert.ok(edition.some((c) => c.index.mot === 'chouchou'));
    assert.deepEqual(journal.coupsDeCoeurAjoutes, ['chouchou-Nom']);
    assert.equal(journal.coupsDeCoeurImpossibles.length, 2);
    assert.ok(journal.coupsDeCoeurImpossibles.some((m) => m.startsWith('fantome')) && journal.coupsDeCoeurImpossibles.some((m) => m.startsWith('orphelin')));
  });
  it('donne exactement la même édition à chaque génération', () => {
    const encore = composerEdition([...base].reverse(), listes, reglages, CONFIG.rarete.parts).edition;
    assert.deepEqual(encore.map((c) => c.index.id).sort(), edition.map((c) => c.index.id).sort());
  });
  it('signale les cartes manquantes quand la base est trop petite', () => {
    const petite = composerEdition(base.slice(0, 200), { exclusions: new Set(), coupsDeCoeur: new Set() }, reglages, CONFIG.rarete.parts);
    assert.ok(petite.edition.length < 1000);
    assert.ok(petite.journal.manques.length > 0);
  });
  it('recalcule les notes entre les cartes de l\'édition, sans toucher aux cartes d\'origine', () => {
    const renotees = renoterDansLEdition(edition);
    const notes = new Set(renotees.map((c) => c.index.defense));
    assert.deepEqual([...notes].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.ok(edition.every((c) => c.index.defense === 5));
  });
});

describe('édition en jeu', () => {
  const base = [carte({ mot: 'garde' }), carte({ mot: 'remplacee' }), carte({ mot: 'rare', rarete: 'Rare' }), carte({ mot: 'nouvelle' })];
  const [garde, remplacee, rare, nouvelle] = base;

  it('garde les cartes publiées, même celles que la composition remplacerait, et le signale', () => {
    const gardee = garderLEditionPubliee(base, [garde.index, remplacee.index], [garde, nouvelle]);
    assert.deepEqual(gardee.edition, [garde, remplacee]);
    assert.deepEqual([gardee.sortiraient, gardee.entreraient], [[remplacee.index.id], [nouvelle.index.id]]);
    assert.deepEqual([gardee.disparues, gardee.changements], [[], []]);
  });
  it('signale une carte en jeu qui changerait de rareté ou de badges, et une carte disparue de la base', () => {
    const publiees = [{ ...rare.index, rarete: 'Épique' as Rarete, registre: ['Familier' as const] }, { ...garde.index, id: 'disparue-Nom' }];
    const gardee = garderLEditionPubliee(base, publiees, []);
    assert.deepEqual(gardee.changements, ['rare-Nom : Épique → Rare', 'rare-Nom : badges Familier → aucun']);
    assert.deepEqual(gardee.disparues, ['disparue-Nom']);
  });
});

describe('assemblage des cartes', () => {
  const lexique = (nature: Nature, frequence: number, prevalence: number | null, base = '') => ({ nature, frequence, prevalence, avis: prevalence === null ? 0 : 20, base });
  const mots = new Map<string, MotBrut>([
    ['détester|Verbe', { mot: 'détester', nature: 'Verbe', entrees: 1, etymologies: ['Du latin detestari.'], sensARediger: 0, synonymes:2, derives: 1, attestation: 'Siècle à préciser', lexique: lexique('Verbe', 40, 100),
      sens: [{ definition: 'Réprouver, maudire solennellement.', etiquettes: ['dated'], domaines: [] }, { definition: 'Avoir en aversion, ne pas pouvoir souffrir.', etiquettes: [], domaines: [] }, { definition: 'Avoir beaucoup de mal à supporter quelque chose.', etiquettes: [], domaines: [] }] }],
    ['callipyge|Adjectif', { mot: 'callipyge', nature: 'Adjectif', entrees: 1, etymologies: ['Emprunté au grec ancien καλλίπυγος.'], sensARediger: 0, synonymes:0, derives: 0, attestation: '1786', lexique: lexique('Adjectif', 0.003, 33),
      sens: [{ definition: 'Qui a de belles fesses, aux formes harmonieuses.', etiquettes: [], domaines: [] }] }],
    ['vide|Nom', { mot: 'vide', nature: 'Nom', entrees: 1, etymologies: ['Du latin vocitus.'], sensARediger: 0, synonymes:0, derives: 0, attestation: null, lexique: lexique('Nom', 20, 100), sens: [] }],
  ]);
  const cartes = assemblerCartes(mots, CONFIG);
  const parId = new Map(cartes.map((c) => [c.index.id, c]));

  it('ne fait pas de carte d\'un mot sans définition', () => {
    assert.deepEqual([...parId.keys()].sort(), ['callipyge-adj', 'détester-verbe']);
  });
  it('donne un identifiant stable, une faction et une rareté', () => {
    const callipyge = parId.get('callipyge-adj')!;
    assert.equal(callipyge.index.faction, 'Grec');
    assert.ok(RARETES.indexOf(callipyge.index.rarete) > RARETES.indexOf(parId.get('détester-verbe')!.index.rarete), 'callipyge doit être plus rare que détester');
    assert.equal(callipyge.details.attestation, '1786');
    assert.equal(callipyge.details.prevalence, 33);
  });
  it('montre d\'abord le sens actuel, et n\'étiquette pas « Vieilli » un mot courant', () => {
    const detester = parId.get('détester-verbe')!;
    assert.equal(detester.details.definitions[0].texte, 'Avoir en aversion, ne pas pouvoir souffrir.');
    assert.equal(detester.index.definition, 'Avoir en aversion, ne pas pouvoir souffrir.', 'la carte porte le sens principal actuel');
    assert.deepEqual(detester.index.registre, []);
    assert.deepEqual(detester.details.definitions[2].registre, ['Vieilli']);
  });
  it('n\'affiche pas une date de première apparition inconnue', () => {
    assert.equal(parId.get('détester-verbe')!.details.attestation, undefined);
  });
  it('compte dans la richesse du mot un sens pas encore rédigé, sans rien en montrer', () => {
    const callipyge = parId.get('callipyge-adj')!;
    const avecUnSensARediger = assemblerCartes(new Map(mots).set('callipyge|Adjectif', { ...mots.get('callipyge|Adjectif')!, sensARediger: 1 }), CONFIG)
      .find((c) => c.index.id === 'callipyge-adj')!;
    assert.equal(avecUnSensARediger.richesse, callipyge.richesse + CONFIG.richesse.poidsSens);
    assert.equal(avecUnSensARediger.nombreDeSens, 2);
    assert.deepEqual(avecUnSensARediger.details.definitions, callipyge.details.definitions);
  });
  it('range un coup de cœur non mesuré parmi les mots mesurés', () => {
    const avecZeugma = new Map(mots).set('zeugma|Nom', { mot: 'zeugma', nature: 'Nom', entrees: 1, etymologies: ['Du latin zeugma.'], sensARediger: 0, synonymes:0, derives: 0, attestation: null, lexique: lexique('Nom', 0.001, null),
      sens: [{ definition: 'Figure de style qui rattache à un même mot deux termes disparates.', etiquettes: [], domaines: [] }] });
    const raretes = new Map(assemblerCartes(avecZeugma, CONFIG, new Map(), new Set(['zeugma'])).map((c) => [c.index.id, c.index.rarete]));
    assert.equal(raretes.get('zeugma-nom'), raretes.get('callipyge-adj'), 'moins fréquent que tous les mots mesurés : aussi rare que le plus rare d\'entre eux');
    assert.equal(raretes.get('callipyge-adj'), parId.get('callipyge-adj')!.index.rarete, 'les mots mesurés ne bougent pas');
    assert.equal(raretes.get('détester-verbe'), parId.get('détester-verbe')!.index.rarete);
  });
});
