// Les particules du duel (éclats d'encre du choc, poussière du coup de tampon, confettis de la victoire) :
// un canevas par-dessus la page et le moteur de particules de la cérémonie.

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Particules } from '../../composants/ceremonie/effets.ts';
import type { Jaillissement } from '../../composants/ceremonie/effets.ts';

export function useParticules(reduit: boolean): { toile: ReactNode; jaillir: (element: Element | null, reglages: Jaillissement) => void } {
  const canevas = useRef<HTMLCanvasElement>(null);
  const moteur = useRef<Particules | null>(null);
  useEffect(() => {
    if (!canevas.current) return;
    const m = new Particules(canevas.current, () => reduit);
    moteur.current = m;
    const ajuster = (): void => m.ajuster();
    window.addEventListener('resize', ajuster);
    return () => { window.removeEventListener('resize', ajuster); m.vider(); moteur.current = null; };
  }, [reduit]);

  // Les particules jaillissent du centre de l'élément donné.
  const jaillir = (element: Element | null, reglages: Jaillissement): void => {
    const cadre = element?.getBoundingClientRect();
    if (!cadre || !moteur.current) return;
    moteur.current.jaillir(cadre.left + cadre.width / 2, cadre.top + cadre.height / 2, reglages);
  };

  return { toile: createPortal(<canvas className="partie__eclats" ref={canevas} aria-hidden="true" />, document.body), jaillir };
}
