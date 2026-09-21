// Étape 1 — Lexique 4 : la liste des mots « de base » (lemmes), avec leur fréquence et leur prévalence.

import { readFileSync } from 'node:fs';
import type { Nature } from '../../src/partage/types.ts';

export type InfoLexique = {
  nature: Nature;
  frequence: number; // occurrences par million de mots, toutes formes du mot confondues
  prevalence: number | null; // part des gens qui connaissent le mot, en %
  avis: number; // nombre de personnes interrogées pour la prévalence
  base: string; // mot dont celui-ci dérive, d'après Lexique (« danseur » → « danser »)
};

export const NATURE_PAR_CGRAM: Record<string, Nature> = { NOM: 'Nom', VER: 'Verbe', ADJ: 'Adjectif', ADV: 'Adverbe' };

export type ResultatLexique = {
  lemmes: Map<string, InfoLexique>; // clé : « mot|Nature »
  lignes: number;
  ecartes: Map<string, number>; // raison → nombre de lignes écartées
};

export function cle(mot: string, nature: Nature): string {
  return `${mot}|${nature}`;
}

export function analyserLexique(contenu: string): ResultatLexique {
  const lignes = contenu.split(/\r?\n/);
  const entetes = lignes[0].split('\t').map((e) => e.replace(/^\d+_/, ''));
  const colonne = (nom: string): number => {
    const i = entetes.indexOf(nom);
    if (i < 0) throw new Error(`Colonne « ${nom} » absente de Lexique`);
    return i;
  };
  const [cMot, cCgram, cFrequence, cEstLemme, cBase, cPrevalence, cAvis] = ['Mot', 'Cgram', 'FreqLemme', 'IsLem', 'MorphoBase', 'Preval', 'PrevalNb'].map(colonne);

  const resultat: ResultatLexique = { lemmes: new Map(), lignes: 0, ecartes: new Map() };
  const ecarter = (raison: string): void => { resultat.ecartes.set(raison, (resultat.ecartes.get(raison) ?? 0) + 1); };

  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i]) continue;
    resultat.lignes++;
    const c = lignes[i].split('\t');
    if (c[cEstLemme] !== '1') { ecarter('forme fléchie (conjugaison, pluriel…)'); continue; }
    const nature = NATURE_PAR_CGRAM[c[cCgram]];
    if (!nature) { ecarter('nature non retenue (pronom, préposition, onomatopée…)'); continue; }
    const mot = c[cMot];
    if (/[ '’]/.test(mot)) { ecarter('contient une espace ou une apostrophe'); continue; }

    const info: InfoLexique = {
      nature,
      frequence: Number(c[cFrequence]) || 0,
      prevalence: c[cPrevalence] === '' || c[cPrevalence] === undefined ? null : Number(c[cPrevalence]),
      avis: Number(c[cAvis]) || 0,
      base: c[cBase] ?? '',
    };
    const existant = resultat.lemmes.get(cle(mot, nature));
    if (existant) {
      // Même mot et même nature sur deux lignes (un nom masculin et féminin) : on additionne.
      existant.frequence += info.frequence;
      if (existant.prevalence === null) { existant.prevalence = info.prevalence; existant.avis = info.avis; }
    } else {
      resultat.lemmes.set(cle(mot, nature), info);
    }
  }
  return resultat;
}

export function chargerLexique(chemin: string): ResultatLexique {
  return analyserLexique(readFileSync(chemin, 'utf8'));
}
