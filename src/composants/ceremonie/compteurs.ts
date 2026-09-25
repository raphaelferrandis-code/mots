// Les compteurs de la page (Encre, XP) pendant une cérémonie. Le serveur les met à jour dès le tirage, mais la
// page ne doit pas vendre la mèche : ils restent figés tant que la cérémonie est ouverte, puis montent jusqu'à leur
// vraie valeur au moment où les timbres sont rangés, comme sur la maquette.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { mouvementReduit } from '../mouvement.ts';

export type Compteur = 'encre' | 'xp';

let fige: Partial<Record<Compteur, number>> | null = null;
const abonnes = new Set<() => void>();
const prevenir = (): void => abonnes.forEach((f) => f());
const sAbonner = (f: () => void): (() => void) => { abonnes.add(f); return () => abonnes.delete(f); };

export function retenirLesCompteurs(valeurs: Record<Compteur, number>): void {
  if (fige) return;
  fige = { ...valeurs };
  prevenir();
}
export function libererLesCompteurs(): void {
  if (!fige) return;
  fige = null;
  prevenir();
}


// Un nombre qui monte (ou descend) jusqu'à sa cible, en ralentissant à la fin.
export function useNombreAnime(cible: number | null, duree = 900): number | null {
  const [affiche, setAffiche] = useState(cible);
  const actuel = useRef(cible);
  useEffect(() => {
    const depart = actuel.current;
    if (cible === null || depart === null || depart === cible || mouvementReduit()) { actuel.current = cible; setAffiche(cible); return; }
    const t0 = performance.now();
    let cadre = 0;
    const pas = (t: number): void => {
      const k = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(depart + (cible - depart) * e);
      actuel.current = v; setAffiche(v);
      if (k < 1) cadre = requestAnimationFrame(pas);
    };
    cadre = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(cadre);
  }, [cible, duree]);
  return affiche;
}

// La valeur à afficher : figée pendant la cérémonie, puis animée jusqu'à la vraie valeur.
export function useCompteur(cle: Compteur, reelle: number | null): number | null {
  const retenue = useSyncExternalStore(sAbonner, () => fige?.[cle]);
  return useNombreAnime(retenue ?? reelle);
}
