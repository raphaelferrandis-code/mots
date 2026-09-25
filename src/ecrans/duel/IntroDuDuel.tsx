// L'intro du duel (BRIEF-duel.md § 3) : les deux adversaires glissent depuis les bords, et « Duel » tombe au centre
// comme un coup de tampon. Plein écran, par-dessus toute la page ; elle se referme d'elle-même.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SceauDuel } from '../../composants/SceauDuel.tsx';
import type { SonsDuDuel } from '../../services/sonsDuDuel.ts';
import type { Jaillissement } from '../../composants/ceremonie/effets.ts';

const FRAPPE = 640; // le moment où « Duel » touche le papier
const DUREE = 1500; // puis l'intro s'efface

type Props = {
  adversaire: { nom: string; detail: string };
  joueur: string; // son pseudonyme, s'il en a un
  sons: SonsDuDuel;
  jaillir: (element: Element | null, reglages: Jaillissement) => void;
  onFin: () => void;
};

export function IntroDuDuel({ adversaire, joueur, sons, jaillir, onFin }: Props) {
  const tampon = useRef<HTMLDivElement>(null);
  const fin = useRef(onFin);
  fin.current = onFin;
  useEffect(() => {
    sons.souffle();
    const frappe = window.setTimeout(() => {
      sons.frappe();
      jaillir(tampon.current, { n: 40, couleurs: ['#f0c48f', '#fff4d6'], vitesse: [80, 360], duree: [.6, 1.2] });
    }, FRAPPE);
    const terme = window.setTimeout(() => fin.current(), DUREE + 300);
    return () => { window.clearTimeout(frappe); window.clearTimeout(terme); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="intro-duel" role="status" aria-label={`Duel : ${adversaire.nom} contre ${joueur || 'toi'}`}>
      <div className="intro-duel__camp" data-camp="adversaire" aria-hidden="true"><strong>{adversaire.nom}</strong><small>{adversaire.detail}</small></div>
      <div className="intro-duel__tampon" ref={tampon} aria-hidden="true"><SceauDuel empreinte /><span>Duel</span></div>
      <div className="intro-duel__camp" data-camp="joueur" aria-hidden="true"><strong>{joueur || 'Toi'}</strong>{joueur && <small>Toi</small>}</div>
    </div>,
    document.body,
  );
}
