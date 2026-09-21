// Tests : classements, notes de 1 à 10 et rareté.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Rarete } from '../../src/partage/types.ts';
import { attribuerRaretes, notesDeRarete } from '../etapes/rarete.ts';
import type { MotARarete, ReglagesRarete } from '../etapes/rarete.ts';
import { creerHasard, echantillon, empreinte, notesSurDix, rangParmi, rangs, repartirEntiers } from '../etapes/stats.ts';

const REGLAGES: ReglagesRarete = {
  parts: [['Légendaire', 0.03], ['Épique', 0.07], ['Rare', 0.15], ['Peu commune', 0.25], ['Commune', 0.5]],
  poidsFrequence: 1,
  poidsPrevalence: 1,
  avisMinimum: 10,
};

describe('outils de classement', () => {
  it('donne le même rang aux ex æquo', () => {
    assert.deepEqual(rangs([10, 30, 20]), [0, 1, 0.5]);
    assert.deepEqual(rangs([5, 5, 5, 9]), [1 / 3, 1 / 3, 1 / 3, 1]);
  });
  it('situe une valeur extérieure parmi des valeurs triées, avec les mêmes règles', () => {
    const triees = [5, 5, 5, 9];
    assert.equal(rangParmi(5, triees), 1 / 3, 'ex æquo : le rang de son groupe');
    assert.equal(rangParmi(9, triees), 1);
    assert.equal(rangParmi(7, triees), 2.5 / 3, 'sans ex æquo : entre ses deux voisines');
    assert.equal(rangParmi(1, triees), 0, 'plus petite que toutes');
    assert.equal(rangParmi(100, triees), 1, 'plus grande que toutes');
    assert.equal(rangParmi(3, []), 0);
  });
  it('note de 1 à 10 en respectant l\'ordre', () => {
    const notes = notesSurDix(Array.from({ length: 100 }, (_, i) => i));
    assert.equal(notes[0], 1);
    assert.equal(notes[99], 10);
    assert.ok(notes.every((n, i) => i === 0 || n >= notes[i - 1]));
    assert.equal(new Set(notes).size, 10);
  });
  it('répartit des entiers sans rien perdre', () => {
    assert.deepEqual(repartirEntiers(10, [1, 1, 1]), [4, 3, 3]);
    assert.deepEqual(repartirEntiers(3000, [0.5, 0.25, 0.15, 0.07, 0.03]), [1500, 750, 450, 210, 90]);
    assert.deepEqual(repartirEntiers(5, [0, 0]), [0, 0]);
  });
  it('tire toujours les mêmes exemples', () => {
    const liste = Array.from({ length: 50 }, (_, i) => i);
    assert.deepEqual(echantillon(liste, 5, creerHasard(1)), echantillon(liste, 5, creerHasard(1)));
    assert.equal(new Set(echantillon(liste, 20, creerHasard(2))).size, 20);
  });
});

describe('rareté', () => {
  it('juge plus rare un mot peu utilisé ET peu connu', () => {
    const mots: MotARarete[] = [
      { id: 'peu-utilise-peu-connu', frequence: 0.003, prevalence: 10, avis: 20 },
      { id: 'peu-utilise-tres-connu', frequence: 0.003, prevalence: 100, avis: 20 },
      { id: 'courant-peu-connu', frequence: 50, prevalence: 10, avis: 20 },
      { id: 'courant-tres-connu', frequence: 50, prevalence: 100, avis: 20 },
    ];
    const notes = notesDeRarete(mots, REGLAGES);
    assert.ok(notes[0] < notes[1] && notes[0] < notes[2]);
    assert.ok(notes[3] > notes[1] && notes[3] > notes[2]);
  });
  it('s\'en remet à la fréquence seule quand la prévalence est absente ou mesurée sur trop peu de gens', () => {
    const mots: MotARarete[] = [
      { id: 'a', frequence: 1, prevalence: null, avis: 0 },
      { id: 'b', frequence: 2, prevalence: 5, avis: 3 },
      { id: 'c', frequence: 3, prevalence: 50, avis: 20 },
    ];
    const notes = notesDeRarete(mots, REGLAGES);
    assert.equal(notes[0], 0);
    assert.equal(notes[1], 0.5);
  });

  const hasard = creerHasard(42);
  const base: MotARarete[] = Array.from({ length: 2000 }, (_, i) => ({ id: `mot${i}`, frequence: Math.floor(hasard() * 5) * 0.003, prevalence: Math.floor(hasard() * 101), avis: 20 }));

  it('respecte les parts de chaque rareté', () => {
    const compte = new Map<Rarete, number>();
    for (const r of attribuerRaretes(base, REGLAGES).values()) compte.set(r, (compte.get(r) ?? 0) + 1);
    assert.deepEqual([...compte].sort(), [['Commune', 1000], ['Légendaire', 60], ['Peu commune', 500], ['Rare', 300], ['Épique', 140]].sort());
  });
  it('classe séparément les mots mesurés et les mots non mesurés', () => {
    const nonMesures: MotARarete[] = Array.from({ length: 1000 }, (_, i) => ({ id: `inconnu${i}`, frequence: 0.003, prevalence: null, avis: 0 }));
    const raretes = attribuerRaretes([...base, ...nonMesures], REGLAGES);
    const legendaires = (mots: MotARarete[]): number => mots.filter((m) => raretes.get(m.id) === 'Légendaire').length;
    assert.equal(legendaires(base), 60);
    assert.equal(legendaires(nonMesures), 30);
  });
  it('donne le même résultat quel que soit l\'ordre des mots en entrée', () => {
    const a = attribuerRaretes(base, REGLAGES);
    const b = attribuerRaretes([...base].reverse(), REGLAGES);
    assert.ok(base.every((m) => a.get(m.id) === b.get(m.id)));
  });
  it('ne départage pas les ex æquo par ordre alphabétique', () => {
    const exAequo: MotARarete[] = Array.from({ length: 1000 }, (_, i) => ({ id: `mot${String(i).padStart(4, '0')}`, frequence: 0.003, prevalence: null, avis: 0 }));
    const raretes = attribuerRaretes(exAequo, REGLAGES);
    const legendaires = exAequo.filter((m) => raretes.get(m.id) === 'Légendaire').map((m) => m.id);
    assert.equal(legendaires.length, 30);
    assert.ok(legendaires.some((id) => id > 'mot0500'), 'les Légendaires ne doivent pas toutes venir du début de l\'alphabet');
    assert.notEqual(empreinte('a'), empreinte('b'));
  });
});

describe('rareté des coups de cœur dont la prévalence n\'est pas mesurée', () => {
  // Comme dans la vraie base : des mots mesurés de toutes fréquences (de 0,01 à 10 par million, les
  // plus fréquents étant les plus connus), et des mots non mesurés presque tous rarissimes.
  const mesures: MotARarete[] = Array.from({ length: 1000 }, (_, i) => ({ id: `mesure${i}`, frequence: (i + 1) / 100, prevalence: Math.round(i / 10), avis: 20 }));
  const rarissimes: MotARarete[] = Array.from({ length: 1000 }, (_, i) => ({ id: `inconnu${i}`, frequence: 0.003, prevalence: null, avis: 0 }));
  const nonMesure = (id: string, frequence: number): MotARarete => ({ id, frequence, prevalence: null, avis: 0 });
  // 2 par million : le plus fréquent des non mesurés, mais moins fréquent que 80 % des mots mesurés.
  const zeugma = nonMesure('zeugma-nom', 2);
  const base = [...mesures, ...rarissimes, zeugma, nonMesure('rarissime-nom', 0.003), nonMesure('courant-nom', 50)];

  const sansListe = attribuerRaretes(base, REGLAGES);
  const avecListe = attribuerRaretes(base, REGLAGES, new Set(['zeugma-nom', 'rarissime-nom', 'courant-nom', 'mesure500']));

  it('sans la liste, un mot rare passe pour courant au milieu des non mesurés', () => {
    assert.equal(sansListe.get('zeugma-nom'), 'Commune');
  });
  it('le range parmi les mots mesurés, d\'après sa seule fréquence', () => {
    assert.equal(avecListe.get('zeugma-nom'), 'Rare');
    assert.equal(avecListe.get('zeugma-nom'), avecListe.get('mesure199'), 'même rareté que le mot mesuré de même fréquence, aussi connu qu\'il est utilisé');
    assert.equal(avecListe.get('rarissime-nom'), 'Légendaire', 'moins fréquent que tous les mots mesurés');
    assert.equal(avecListe.get('courant-nom'), 'Commune', 'plus fréquent que tous les mots mesurés');
  });
  it('ne change la rareté d\'aucun autre mot, pas même d\'un coup de cœur mesuré', () => {
    const autres = base.filter((m) => !['zeugma-nom', 'rarissime-nom', 'courant-nom'].includes(m.id));
    assert.deepEqual(autres.filter((m) => sansListe.get(m.id) !== avecListe.get(m.id)), []);
  });
  it('donne le même résultat quel que soit l\'ordre des mots en entrée', () => {
    const aLEnvers = attribuerRaretes([...base].reverse(), REGLAGES, new Set(['zeugma-nom', 'rarissime-nom', 'courant-nom', 'mesure500']));
    assert.ok(base.every((m) => aLEnvers.get(m.id) === avecListe.get(m.id)));
  });
  it('garde le classement entre non mesurés quand aucun mot n\'est mesuré', () => {
    const seuls = [...rarissimes, zeugma];
    assert.deepEqual(attribuerRaretes(seuls, REGLAGES, new Set(['zeugma-nom'])), attribuerRaretes(seuls, REGLAGES));
  });
});
