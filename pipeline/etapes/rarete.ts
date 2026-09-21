// Étape 4 — Rareté : un mot est d'autant plus rare qu'il est peu utilisé ET peu connu.

import type { Rarete } from '../../src/partage/types.ts';
import { empreinte, rangParmi, rangs } from './stats.ts';

export type MotARarete = {
  id: string;
  frequence: number; // occurrences par million
  prevalence: number | null; // % de gens qui connaissent le mot
  avis: number; // nombre de personnes interrogées
};

export type ReglagesRarete = {
  parts: [Rarete, number][]; // de la plus rare à la plus courante
  poidsFrequence: number;
  poidsPrevalence: number;
  avisMinimum: number;
};

export function prevalenceMesuree(mot: MotARarete, avisMinimum: number): boolean {
  return mot.prevalence !== null && mot.avis >= avisMinimum;
}

// Note de rareté entre 0 (le plus rare) et 1 (le plus courant).
export function notesDeRarete(mots: MotARarete[], reglages: ReglagesRarete): number[] {
  const rangFrequence = rangs(mots.map((m) => m.frequence));

  // Le rang de prévalence se calcule entre les seuls mots mesurés.
  const mesures = mots.map((m, i) => (prevalenceMesuree(m, reglages.avisMinimum) ? i : -1)).filter((i) => i >= 0);
  const rangPrevalence = new Map<number, number>();
  rangs(mesures.map((i) => mots[i].prevalence as number)).forEach((r, k) => rangPrevalence.set(mesures[k], r));

  const total = reglages.poidsFrequence + reglages.poidsPrevalence;
  return mots.map((_, i) => {
    const p = rangPrevalence.get(i);
    // Sans prévalence mesurée, la fréquence décide seule.
    if (p === undefined) return rangFrequence[i];
    return (reglages.poidsFrequence * rangFrequence[i] + reglages.poidsPrevalence * p) / total;
  });
}

// Les mots mesurés et les mots non mesurés sont classés séparément, chacun entre eux : sinon les
// milliers de mots non mesurés ex æquo à la fréquence la plus basse rempliraient à eux seuls les
// raretés les plus hautes, et « callipyge » ne serait plus Légendaire.
//
// Exception : les « coups de cœur » de Raphaël dont la prévalence n'est pas mesurée. Ce sont les
// seuls mots non mesurés d'une édition : ils y côtoient des mots mesurés, et sont donc rangés parmi
// eux, d'après leur seule fréquence. Entre non mesurés, presque tous rarissimes, « zeugma »
// (0,03 occurrence par million) passait pour un mot courant et sortait en Commune.
// Aucun autre mot ne change de rareté : le coup de cœur ne prend la place de personne.
export function attribuerRaretes(mots: MotARarete[], reglages: ReglagesRarete, coupsDeCoeur: Set<string> = new Set()): Map<string, Rarete> {
  const mesures = mots.filter((m) => prevalenceMesuree(m, reglages.avisMinimum));
  const nonMesures = mots.filter((m) => !prevalenceMesuree(m, reglages.avisMinimum));
  const classementDesMesures = classer(mesures, reglages);
  const raretes = new Map([...classementDesMesures, ...classer(nonMesures, reglages)].map((c) => [c.id, c.rarete]));

  const aRanger = nonMesures.filter((m) => coupsDeCoeur.has(m.id));
  if (aRanger.length === 0 || classementDesMesures.length === 0) return raretes;
  const frequencesMesurees = mesures.map((m) => m.frequence).sort((a, b) => a - b);
  for (const mot of aRanger) {
    // Sa note est son rang de fréquence parmi les mots mesurés ; il reçoit la rareté du mot mesuré
    // à côté duquel cette note le place.
    const note = rangParmi(mot.frequence, frequencesMesurees);
    const voisin = classementDesMesures.find((c) => c.note >= note) ?? classementDesMesures[classementDesMesures.length - 1];
    raretes.set(mot.id, voisin.rarete);
  }
  return raretes;
}

// Classement du plus rare au plus courant, avec la rareté qui en découle.
function classer(mots: MotARarete[], reglages: ReglagesRarete): { id: string; note: number; rarete: Rarete }[] {
  const notes = notesDeRarete(mots, reglages);
  const ordre = mots
    .map((m, i) => ({ id: m.id, note: notes[i], departage: empreinte(m.id) }))
    .sort((a, b) => a.note - b.note || (a.departage < b.departage ? -1 : 1));

  const classement: { id: string; note: number; rarete: Rarete }[] = [];
  let seuil = 0;
  let position = 0;
  for (const [rarete, part] of reglages.parts) {
    seuil += part;
    const fin = rarete === reglages.parts[reglages.parts.length - 1][0] ? ordre.length : Math.round(seuil * ordre.length);
    for (; position < fin; position++) classement.push({ id: ordre[position].id, note: ordre[position].note, rarete });
  }
  return classement;
}
