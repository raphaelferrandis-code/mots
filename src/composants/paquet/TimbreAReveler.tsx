import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { CarteIndex, Finition } from '../../partage/types.ts';
import { Carte, DosDeCarte } from '../carte/Carte.tsx';
import './revelation.css';
import { RYTHME_PAQUET } from './rythme.ts';

// Deux vraies faces restent montées : le dos ne disparaît pas avant le passage sur la tranche.
export function TimbreAReveler({ carte, finition, retournee, onRetourner, etiquette, modele }: {
  carte: CarteIndex; finition: Finition; retournee: boolean; onRetourner: () => void; etiquette: string; modele?: string;
}) {
  const recto = useRef<HTMLDivElement>(null);
  const rendreLeFocus = useRef(false);
  useEffect(() => {
    if (retournee && rendreLeFocus.current) {
      recto.current?.querySelector('a')?.focus({ preventScroll: true });
      rendreLeFocus.current = false;
    }
  }, [retournee]);
  return <div className="revelation" style={{ '--retournement': `${RYTHME_PAQUET.retournement}ms` } as CSSProperties} data-retournee={retournee} data-finition={finition} data-rarete={carte.rarete}>
    <div className="revelation__rotation">
      <div className="revelation__face revelation__dos" aria-hidden="true"><DosDeCarte etiquette="Dos du timbre" modele={modele} /></div>
      <div ref={recto} className="revelation__face revelation__recto" aria-hidden={!retournee} inert={!retournee}>
        <Carte carte={carte} finition={finition} />
        <span className="revelation__lumiere" aria-hidden="true" />
      </div>
    </div>
    {!retournee && <button className="revelation__ouvrir" type="button" aria-label={etiquette} onClick={(e) => { rendreLeFocus.current = e.detail === 0; onRetourner(); }} />}
    <span className="revelation__halo" aria-hidden="true" />
  </div>;
}
