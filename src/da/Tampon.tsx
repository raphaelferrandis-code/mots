// Le cachet rond : langue d'origine sur le tour, nom court et date au centre.
// L'encre est volontairement irrégulière, comme un vrai coup de tampon.

import { useId } from 'react';
import { NOM_COURT, entier, entre, hasardDe } from './outils.ts';

export function Tampon({ idCarte, faction, date, className }: { idCarte: string; faction: string; date: string; className: string }) {
  const id = useId();
  const hasard = hasardDe(`${idCarte}-tampon`);
  const rotation = entre(hasard, -19, 14);

  return (
    <svg className={className} viewBox="0 0 100 100" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
      <defs>
        <path id={`${id}c`} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
        <filter id={`${id}f`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={entier(hasard, 1, 90)} />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.4" />
          <feComposite in="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}f)`}>
        <circle cx="50" cy="50" r="46" className="tampon__trait" />
        <circle cx="50" cy="50" r="42.5" className="tampon__trait tampon__trait--fin" />
        <circle cx="50" cy="50" r="27" className="tampon__trait tampon__trait--fin" />
        <text className="tampon__tour"><textPath href={`#${id}c`} startOffset="0" textLength="220" lengthAdjust="spacing">{`★ ORIGINE CONTRÔLÉE ★ ${faction.toUpperCase()}`}</textPath></text>
        <text x="50" y="47" textAnchor="middle" className="tampon__centre">{NOM_COURT[faction] ?? faction.toUpperCase()}</text>
        <text x="50" y="59" textAnchor="middle" className="tampon__date">{date}</text>
      </g>
    </svg>
  );
}
