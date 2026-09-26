// En duel, la souris posée une seconde sur un timbre le montre en grand, avec sa définition ; l'aperçu reste tant
// que la souris ne quitte pas le timbre. Seulement à la souris : au doigt, toucher un timbre le choisit.
// Le mot adverse garde sa définition secrète tant qu'elle peut servir à la parade.

import { useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Carte } from '../../composants/carte/Carte.tsx';
import type { CarteIndex, Finition } from '../../partage/types.ts';

const DELAI = 1000;
const MARGE = 14;

export type Habillage = { carte: CarteIndex; finition: Finition };
type Apercu = Habillage & { secret: boolean; cadre: DOMRect };

export function useApercuAuSurvol() {
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const minuterie = useRef<number | null>(null);

  const fermer = (): void => {
    if (minuterie.current !== null) window.clearTimeout(minuterie.current);
    minuterie.current = null;
    setApercu(null);
  };

  // À poser sur l'élément qui porte le timbre : { ...survoler(habillage, secret) }.
  const survoler = (habillage: Habillage, secret = false) => ({
    onPointerEnter: (e: PointerEvent<HTMLElement>): void => {
      if (e.pointerType !== 'mouse') return;
      const element = e.currentTarget;
      if (minuterie.current !== null) window.clearTimeout(minuterie.current);
      minuterie.current = window.setTimeout(() => {
        minuterie.current = null;
        if (element.isConnected) setApercu({ ...habillage, secret, cadre: element.getBoundingClientRect() });
      }, DELAI);
    },
    onPointerLeave: fermer,
  });

  // Un défilement ou un changement d'étape déplace les timbres : l'aperçu se ferme.
  useLayoutEffect(() => {
    if (!apercu) return;
    window.addEventListener('scroll', fermer, { passive: true, once: true });
    return () => window.removeEventListener('scroll', fermer);
  }, [apercu]); // eslint-disable-line react-hooks/exhaustive-deps

  return { survoler, fermer, apercu: apercu && <ApercuDuTimbre apercu={apercu} /> };
}

// Le timbre en grand, au-dessus de celui qu'on survole s'il y a la place, sinon à côté (à droite, sinon à gauche).
function ApercuDuTimbre({ apercu }: { apercu: Apercu }) {
  const boite = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = boite.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const { cadre } = apercu;
    const limite = (valeur: number, max: number): number => Math.min(Math.max(MARGE, valeur), max - MARGE);
    // Au-dessus du timbre s'il y a la place (la main, en bas de l'écran), sinon à côté (le ring).
    if (cadre.top - MARGE - height >= MARGE) {
      setPosition({ left: limite(cadre.left + cadre.width / 2 - width / 2, window.innerWidth - width), top: cadre.top - MARGE - height });
      return;
    }
    const aDroite = cadre.right + MARGE + width <= window.innerWidth - MARGE;
    const left = aDroite ? cadre.right + MARGE : Math.max(MARGE, cadre.left - MARGE - width);
    setPosition({ left, top: limite(cadre.top + cadre.height / 2 - height / 2, window.innerHeight - height) });
  }, [apercu]);
  const { carte } = apercu;
  return createPortal(
    <div className="apercu-timbre" ref={boite} aria-hidden="true" style={position ?? { left: -9999, top: 0 }}>
      <div className="apercu-timbre__timbre"><Carte carte={carte} finition={apercu.finition} cliquable={false} /></div>
      <div className="apercu-timbre__texte">
        <p className="apercu-timbre__mot" lang="fr">{carte.mot}</p>
        <ul className="c-pastilles">
          <li className="c-pastille c-vignette" data-nature={carte.type}>{carte.type}</li>
          <li className="c-pastille c-vignette" data-rarete={carte.rarete}>{carte.rarete}</li>
          <li className="c-pastille c-vignette">{carte.faction}</li>
        </ul>
        {apercu.secret
          ? <p className="apercu-timbre__secret">Sa définition se dévoile après la parade.</p>
          : <p className="apercu-timbre__definition" lang="fr">{carte.definition}</p>}
      </div>
    </div>,
    document.body,
  );
}
