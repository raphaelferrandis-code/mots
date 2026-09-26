// Tests : valeur des lettres, nettoyage des définitions, définitions pas encore rédigées, registres, textes des pages.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { valeurDesLettres } from '../../src/partage/lettres.ts';
import { lotDeLaCarte } from '../../src/partage/lots.ts';
import type { CarteDetails } from '../../src/partage/types.ts';
import { construireDefinitions, contientLeMot, couper, estRenvoi, estUneDefinitionVide, nettoyerTexte, sansReferences } from '../etapes/nettoyage.ts';
import { registresDeLaCarte, registresDuSens, sensActuelsDAbord } from '../etapes/registre.ts';

describe('valeur des lettres', () => {
  it('additionne la valeur de chaque lettre', () => {
    assert.equal(valeurDesLettres('callipyge'), 23); // c3 a1 l1 l1 i1 p3 y10 g2 e1
    assert.equal(valeurDesLettres('kiwi'), 22);
  });
  it('ignore les accents, la cédille et la casse', () => {
    assert.equal(valeurDesLettres('Été'), 3);
    assert.equal(valeurDesLettres('çà'), 4);
  });
  it('développe les ligatures et ignore les traits d\'union', () => {
    assert.equal(valeurDesLettres('œuf'), 7); // o1 e1 u1 f4
    assert.equal(valeurDesLettres('arc-en-ciel'), 13);
  });
});

describe('lots de détails', () => {
  it('range toujours une carte dans le même lot, entre 0 et le nombre de lots', () => {
    for (const id of ['callipyge-adj', 'être-verbe', 'arc-en-ciel-nom']) {
      const lot = lotDeLaCarte(id, 16);
      assert.equal(lot, lotDeLaCarte(id, 16));
      assert.ok(lot >= 0 && lot < 16);
    }
  });
});

describe('nettoyage des textes', () => {
  it('retire les appels de note et les exposants', () => {
    assert.equal(nettoyerTexte('Ancien air de danse ^([1]) ^([2]).'), 'Ancien air de danse.');
    assert.equal(nettoyerTexte('Musique apparue au XVII^(ème) siècle.'), 'Musique apparue au XVIIème siècle.');
  });
  it('retire le « ou » parasite en tête', () => {
    assert.equal(nettoyerTexte('ou Donner corps à, engendrer.'), 'Donner corps à, engendrer.');
    assert.equal(nettoyerTexte('ou (En parlant des personnes.) Déjà un peu grand.'), '(En parlant des personnes.) Déjà un peu grand.');
    assert.equal(nettoyerTexte('outil de jardinage'), 'outil de jardinage');
  });
});

describe('renvois', () => {
  it('reconnaît une définition qui ne fait que renvoyer à un autre mot', () => {
    for (const d of ['Pluriel de cheval.', 'Féminin de danseur', 'Participe passé masculin singulier de voir.', 'Variante orthographique de clé.', 'Autre orthographe, plus ancienne, de lansquiner.']) {
      assert.ok(estRenvoi(d), d);
    }
  });
  it('garde les vraies définitions qui commencent de la même façon', () => {
    for (const d of ['Variante de la belote qui se joue à trois.', 'Variante du jeu de dames.', 'Forme de gouvernement où le peuple est souverain.', 'Pluriel de majesté employé par les rois.', 'Féminin, délicat, gracieux.']) {
      assert.ok(!estRenvoi(d), d);
    }
  });
});

describe('définitions pas encore rédigées', () => {
  it('reconnaît le texte d\'attente du Wiktionnaire, seul ou accompagné', () => {
    for (const d of [
      'Définition manquante ou à compléter. (Ajouter)',
      'Définition manquante ou à compléter. (Ajouter)…',
      'En ski, Définition manquante ou à compléter. (Ajouter)',
      'Définition manquante ou à compléter. (Ajouter) Insulte.',
      'Exemple d’utilisation manquant. (Ajouter)',
      '? (définition à compléter)',
      '(autre sens à compléter)',
    ]) assert.ok(estUneDefinitionVide(d), d);
  });
  it('garde les vraies définitions qui parlent de manque ou de compléter', () => {
    for (const d of ['Qui sert à compléter.', 'Pièce, chose manquante dans un inventaire.', 'Ajouter quelque chose pour compléter, remédier à un manque.', 'Qui a une ou plusieurs dents manquantes.']) {
      assert.ok(!estUneDefinitionVide(d), d);
    }
  });
  it('n\'en laisse aucune dans l\'édition publiée', () => {
    const dossier = path.join(import.meta.dirname, '..', '..', 'public', 'data', 'details');
    const vides = readdirSync(dossier).filter((nom) => nom.endsWith('.json')).flatMap((nom) => {
      const lot: Record<string, CarteDetails> = JSON.parse(readFileSync(path.join(dossier, nom), 'utf8'));
      return Object.entries(lot).flatMap(([id, carte]) => carte.definitions.filter((d) => estUneDefinitionVide(d.texte)).map((d) => `${id} : ${d.texte}`));
    });
    assert.deepEqual(vides, []);
  });
});

describe('définitions d\'une carte', () => {
  it('coupe proprement les textes trop longs', () => {
    const long = 'Figure en amande, délimitée par la partie commune de deux cercles de même diamètre se chevauchant';
    const coupe = couper(long, 50);
    assert.ok(coupe.length <= 50);
    assert.ok(coupe.endsWith('…'));
    assert.ok(!coupe.includes('  '));
    assert.equal(couper('Court.', 50), 'Court.');
  });
  it('repère une définition qui contient le mot ou sa famille', () => {
    assert.ok(contientLeMot('Que l\'on peut dater.', 'datable'));
    assert.ok(contientLeMot('Action de découler.', 'découlement'));
    assert.ok(contientLeMot('Relatif à l’asphyxie.', 'asphyxique'));
    assert.ok(!contientLeMot('Qui a de belles fesses.', 'callipyge'));
  });
  it('ne confond pas un mot court avec un morceau d\'un autre mot', () => {
    assert.ok(!contientLeMot('Encore plus précieux que l\'argent.', 'or'));
    assert.ok(contientLeMot('Métal jaune ; l\'or est précieux.', 'or'));
  });
  it('garde au plus trois définitions et marque celles utilisables en duel', () => {
    const definitions = construireDefinitions('datable', [
      { definition: 'Que l\'on peut dater.', registre: [] },
      { definition: 'Dont on peut établir l\'époque avec une précision suffisante.', registre: ['Littéraire'] },
      { definition: 'Court.', registre: [] },
      { definition: 'Quatrième sens qui ne doit pas apparaître sur la carte.', registre: [] },
    ], { maximumParCarte: 3, longueurMaximale: 200, longueurMinimalePourLeDuel: 25 });
    assert.equal(definitions.length, 3);
    assert.deepEqual(definitions.map((d) => d.quiz), [false, true, false]);
    assert.deepEqual(definitions[1].registre, ['Littéraire']);
    assert.equal(definitions[0].registre, undefined);
  });
});

describe('registres', () => {
  it('traduit les étiquettes du Wiktionnaire', () => {
    assert.deepEqual(registresDuSens(['vulgar', 'figuratively']), ['Familier']);
    assert.deepEqual(registresDuSens(['offensive', 'slang']), ['Familier', 'Injurieux']);
    assert.deepEqual(registresDuSens(['poetic', 'dated']), ['Littéraire', 'Vieilli']);
    assert.deepEqual(registresDuSens(['medicine']), []);
  });
  it('donne le badge Familier quand le sens principal est familier', () => {
    assert.deepEqual(registresDeLaCarte([['Familier'], [], []]), ['Familier']);
    assert.deepEqual(registresDeLaCarte([[], ['Familier']]), []);
  });
  it('ne dit pas « Vieilli » un mot courant dont un seul sens est ancien', () => {
    assert.deepEqual(registresDeLaCarte([['Vieilli'], [], []]), []);
    assert.deepEqual(registresDeLaCarte([['Vieilli'], ['Vieilli'], []]), ['Vieilli']);
    assert.deepEqual(registresDeLaCarte([['Vieilli']]), ['Vieilli']);
  });
  it('étiquette largement les mots injurieux, puisque le badge sert à les masquer', () => {
    assert.deepEqual(registresDeLaCarte([['Injurieux'], [], []]), ['Injurieux']);
    assert.deepEqual(registresDeLaCarte([[], ['Injurieux']]), ['Injurieux']);
    assert.deepEqual(registresDeLaCarte([[], [], ['Injurieux']]), []);
  });
  it('place les sens actuels avant les sens vieillis', () => {
    const sens = [{ t: 'ancien', r: ['Vieilli'] }, { t: 'actuel', r: [] }, { t: 'ancien 2', r: ['Vieilli'] }] as { t: string; r: ('Vieilli')[] }[];
    assert.deepEqual(sensActuelsDAbord(sens, (s) => s.r).map((s) => s.t), ['actuel', 'ancien', 'ancien 2']);
    const tousAnciens = [sens[0], sens[2]];
    assert.deepEqual(sensActuelsDAbord(tousAnciens, (s) => s.r), tousAnciens);
  });
});

describe('textes des pages par mot', () => {
  it('retire une référence de livre collée au texte', () => {
    const texte = 'par la racine *ǵeus (« goûter, apprécier »)Michiel de Vaan, Dictionary of Latin, Brill, série « Leiden », 2008, 825 pages, ISBN 978-90-04-16797-1, qui donne aussi l’anglais choose.';
    assert.equal(sansReferences(texte), 'par la racine *ǵeus (« goûter, apprécier ») qui donne aussi l’anglais choose.');
    assert.equal(sansReferences('Du latin (« fantôme »). Rien à retirer.'), 'Du latin (« fantôme »). Rien à retirer.');
  });
});
