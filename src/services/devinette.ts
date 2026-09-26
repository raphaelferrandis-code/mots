// La série de la devinette du jour, rangée sur l'appareil. Une commodité : si le navigateur refuse d'enregistrer,
// la devinette se joue quand même, sans série.

import { SERIE_VIERGE } from '../jeu/devinette.ts';
import type { Serie } from '../jeu/devinette.ts';

const CLE = 'mots.devinette';

export function lireLaSerie(): Serie {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? { ...SERIE_VIERGE, ...(JSON.parse(brut) as Partial<Serie>) } : SERIE_VIERGE;
  } catch {
    return SERIE_VIERGE;
  }
}

export function ecrireLaSerie(serie: Serie): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(serie));
  } catch {
    // navigation privée, stockage plein : la série ne sera pas gardée
  }
}
