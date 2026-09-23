import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { CarteObtenue } from '../../jeu/partie.ts';
import { NIVEAU } from '../carte/decor.ts';
import { TimbreAReveler } from './TimbreAReveler.tsx';

export function CartesDuPaquet({ cartes, retournees, arriveeAnimee, reduireAnimations, retourner }: {
  cartes: CarteObtenue[]; retournees: boolean[]; arriveeAnimee: boolean;
  reduireAnimations: boolean; retourner: (position: number) => void;
}) {
  const liste = useRef<HTMLUListElement>(null);
  const id = useId();
  const [active, setActive] = useState(0);
  const [defilable, setDefilable] = useState(false);
  const compter = useCallback(() => {
    const ul = liste.current;
    if (!ul) return;
    // Les halos dépassent aussi la grille de bureau, sans constituer un carrousel.
    setDefilable(getComputedStyle(ul).overflowX === 'auto' && ul.scrollWidth > ul.clientWidth + 2);
    const centre = ul.getBoundingClientRect().left + ul.clientWidth / 2;
    const distances = Array.from(ul.children, enfant => {
      const rect = enfant.getBoundingClientRect();
      return Math.abs(rect.left + rect.width / 2 - centre);
    });
    setActive(distances.indexOf(Math.min(...distances)));
  }, []);

  useEffect(() => {
    const ul = liste.current;
    if (!ul) return;
    ul.focus({ preventScroll: true });
    ul.scrollIntoView({ block: 'nearest' });
    const observation = new ResizeObserver(compter);
    observation.observe(ul);
    compter();
    return () => observation.disconnect();
  }, [compter]);

  const aller = (position: number): void => {
    const ul = liste.current;
    const enfant = ul?.children[Math.max(0, Math.min(cartes.length - 1, position))];
    if (!ul || !enfant) return;
    const rect = enfant.getBoundingClientRect();
    ul.scrollTo({
      left: ul.scrollLeft + rect.left - ul.getBoundingClientRect().left - (ul.clientWidth - rect.width) / 2,
      behavior: reduireAnimations || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  const clavier = (e: KeyboardEvent<HTMLUListElement>): void => {
    if (!defilable || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    liste.current?.focus({ preventScroll: true });
    aller(e.key === 'Home' ? 0 : e.key === 'End' ? cartes.length - 1 : active + (e.key === 'ArrowRight' ? 1 : -1));
  };

  return <section className="decouverte" aria-label="Les timbres à découvrir">
    <div className="decouverte__entete">
      <p role="status">{retournees.filter(Boolean).length} / {cartes.length} révélés</p>
      <span>{retournees.every(Boolean) ? 'Touche un timbre pour lire sa fiche' : 'Touche un timbre pour le retourner'}</span>
    </div>
    <ul id={id} ref={liste} className="paquet paquet--decouverte" data-arrivee={arriveeAnimee}
      data-unique={cartes.length === 1} aria-label="Timbres du paquet" tabIndex={0} onScroll={compter} onKeyDown={clavier}>
      {cartes.map((obtenue, position) => <li key={`${position}-${obtenue.carte.id}`} className="paquet__place"
        style={{ '--i': position } as CSSProperties} data-retournee={retournees[position]} data-rarete={obtenue.carte.rarete}>
        <span className="paquet__numero" aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
        <TimbreAReveler carte={obtenue.carte} finition={obtenue.finition} retournee={retournees[position]}
          onRetourner={() => retourner(position)} etiquette={`Retourner le timbre ${position + 1}`} />
        <span className={obtenue.nouvelleFinition && retournees[position] ? 'paquet__etiquette paquet__etiquette--nouvelle' : 'paquet__etiquette'}>
          {retournees[position] ? <>
            {obtenue.nouvelle ? 'Nouveau !' : obtenue.nouvelleFinition ? `Nouvelle finition : ${obtenue.finition.toLowerCase()}` : `Doublon · +${obtenue.encre} Encre`}
            {obtenue.nouvelle && obtenue.finition !== 'Normale' && ` · ${obtenue.finition}`}
            {NIVEAU[obtenue.carte.rarete] >= 3 && ` · ${obtenue.carte.rarete}`}
          </> : 'À découvrir'}
        </span>
      </li>)}
    </ul>
    {defilable && <div className="decouverte__navigation" aria-label="Parcourir les timbres">
      <button type="button" onClick={() => aller(active - 1)} disabled={active === 0} aria-label="Timbre précédent" aria-controls={id}>←</button>
      <div className="decouverte__reperes">{cartes.map((_, i) => <button key={i} type="button" onClick={() => aller(i)}
        aria-label={`Voir le timbre ${i + 1}${retournees[i] ? ', révélé' : ''}`} aria-current={active === i ? 'true' : undefined}
        aria-controls={id} data-revele={retournees[i]}><span /></button>)}</div>
      <button type="button" onClick={() => aller(active + 1)} disabled={active === cartes.length - 1} aria-label="Timbre suivant" aria-controls={id}>→</button>
      <p role="status">Timbre {active + 1} sur {cartes.length} <span>· Glisse pour explorer</span></p>
    </div>}
  </section>;
}
