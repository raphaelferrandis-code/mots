// La barre de vie d'un camp (docs/duel/BRIEF-duel.md § 3) : graduée d'un trait par point, elle se vide en deux temps
// (la vie tombe d'un coup, une traînée rouge la suit), et clignote quand il reste peu de points.

import type { CSSProperties, ReactNode } from 'react';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';

const MAXIMUM = EQUILIBRAGE.duel.pointsDeVie;
const CRITIQUE = 5; // à partir de combien de points restants la barre clignote

export function BarreDeVie({ nom, detail, pv, camp }: { nom: ReactNode; detail?: ReactNode; pv: number; camp: 'adversaire' | 'joueur' }) {
  const part = `${(Math.max(0, pv) / MAXIMUM) * 100}%`;
  const libelle = typeof nom === 'string' ? nom : camp === 'joueur' ? 'Toi' : 'Ton adversaire';
  return (
    <div className="vie" data-camp={camp} data-critique={pv > 0 && pv <= CRITIQUE} style={{ '--graduations': MAXIMUM } as CSSProperties}>
      <div className="vie__identite">
        <span className="vie__nom">{nom}</span>
        {detail && <span className="vie__detail">{detail}</span>}
      </div>
      <div className="vie__jauge" role="meter" aria-label={`Points de vie : ${libelle}`} aria-valuemin={0} aria-valuemax={MAXIMUM} aria-valuenow={pv} aria-valuetext={`${pv} sur ${MAXIMUM}`}>
        <span className="vie__trainee" style={{ width: part }} />
        <span className="vie__reste" style={{ width: part }} />
      </div>
      <span className="vie__pv" aria-hidden="true">{pv}</span>
    </div>
  );
}
