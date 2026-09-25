import { useEffect } from 'react';

// Une fenêtre au premier plan, posée hors de la page (parade, fin de duel, cérémonie) : le reste du jeu devient inerte.
// Ni Tab ni clic n'atteignent alors les onglets cachés derrière le voile (Entrée sur l'un d'eux quittait le duel).
// Deux fenêtres peuvent se chevaucher un instant : la page ne revit qu'une fois la dernière fermée.
let fenetresOuvertes = 0;

export function useRacineInerte(actif = true): void {
  useEffect(() => {
    if (!actif) return;
    const page = document.getElementById('racine');
    fenetresOuvertes++;
    if (page) page.inert = true;
    return () => {
      fenetresOuvertes--;
      if (page && fenetresOuvertes === 0) page.inert = false;
    };
  }, [actif]);
}
