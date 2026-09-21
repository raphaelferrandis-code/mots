// Le cachet rond posé sur le timbre : langue d'origine sur le tour, nom court et date au centre.
// L'encre est volontairement irrégulière, comme un vrai coup de tampon.

import { useId } from 'react';
import { NOM_COURT, entier, entre, hasardDe } from './decor.ts';

// Le second cachet, posé quand le joueur a maîtrisé le mot en duel : une griffe rectangulaire, datée du jour.
export function CachetDeMaitrise({ idCarte, le }: { idCarte: string; le: number }) {
  const id = useId();
  const hasard = hasardDe(`${idCarte}-maitrise`);
  const rotation = entre(hasard, -16, -7);
  const date = new Date(le);
  const jour = `${String(date.getDate()).padStart(2, '0')}·${String(date.getMonth() + 1).padStart(2, '0')}·${date.getFullYear()}`;

  return (
    <svg className="tim__maitrise" viewBox="0 0 100 46" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
      <defs>
        <filter id={`${id}f`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={entier(hasard, 1, 90)} />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.45" />
          <feComposite in="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}f)`}>
        <rect x="2" y="2" width="96" height="42" rx="3" className="tampon__trait tampon__trait--fort" />
        <rect x="5.5" y="5.5" width="89" height="35" rx="1.5" className="tampon__trait tampon__trait--fin" />
        <text x="50" y="23" textAnchor="middle" className="tampon__maitrise">MAÎTRISÉ</text>
        <text x="50" y="35.5" textAnchor="middle" className="tampon__date">{jour}</text>
      </g>
    </svg>
  );
}

export function Tampon({ idCarte, faction, date }: { idCarte: string; faction: string; date: string }) {
  const id = useId();
  const hasard = hasardDe(`${idCarte}-tampon`);
  const rotation = entre(hasard, -19, 14);

  return (
    <svg className="tim__tampon" viewBox="0 0 100 100" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
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
