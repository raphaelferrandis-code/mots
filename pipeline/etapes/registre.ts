// Registre d'un mot (familier, injurieux, littéraire, vieilli), d'après les étiquettes du Wiktionnaire.
// Aucun mot n'est retiré pour son registre : il est seulement étiqueté, pour que le joueur
// puisse masquer ces mots s'il le souhaite.

import type { Registre } from '../../src/partage/types.ts';

const REGISTRE_PAR_ETIQUETTE: Record<string, Registre> = {
  familiar: 'Familier',
  slang: 'Familier',
  colloquial: 'Familier',
  vulgar: 'Familier',
  childish: 'Familier',
  offensive: 'Injurieux',
  literary: 'Littéraire',
  poetic: 'Littéraire',
  dated: 'Vieilli',
  obsolete: 'Vieilli',
  archaic: 'Vieilli',
};

const ORDRE: Registre[] = ['Familier', 'Injurieux', 'Littéraire', 'Vieilli'];

export function registresDuSens(etiquettes: string[]): Registre[] {
  const trouves = new Set<Registre>();
  for (const etiquette of etiquettes) {
    const registre = REGISTRE_PAR_ETIQUETTE[etiquette];
    if (registre) trouves.add(registre);
  }
  return ORDRE.filter((r) => trouves.has(r));
}

// Badges de la carte, d'après son sens principal (le premier) :
// - Familier : le sens principal est familier ;
// - Injurieux : le sens principal est injurieux, ou au moins la moitié des sens le sont
//   (on préfère étiqueter un mot de trop qu'un mot de moins, puisque le badge sert à masquer) ;
// - Littéraire, Vieilli : le sens principal ET au moins la moitié des sens. Sans cette condition,
//   « détester » serait « Vieilli » parce que le Wiktionnaire liste en premier un sens ancien du mot.
export function registresDeLaCarte(registresParSens: Registre[][]): Registre[] {
  if (registresParSens.length === 0) return [];
  return ORDRE.filter((registre) => {
    const principal = registresParSens[0].includes(registre);
    const majoritaire = registresParSens.filter((r) => r.includes(registre)).length * 2 >= registresParSens.length;
    if (registre === 'Familier') return principal;
    if (registre === 'Injurieux') return principal || majoritaire;
    return principal && majoritaire;
  });
}

// Met les sens actuels avant les sens vieillis, sans changer l'ordre du reste.
export function sensActuelsDAbord<T>(sens: T[], registreDe: (s: T) => Registre[]): T[] {
  const actuels = sens.filter((s) => !registreDe(s).includes('Vieilli'));
  if (actuels.length === 0) return sens;
  return [...actuels, ...sens.filter((s) => registreDe(s).includes('Vieilli'))];
}
