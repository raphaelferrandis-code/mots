import { FINITIONS } from '../../partage/types.ts';
import type { Finition } from '../../partage/types.ts';
import './choixFinition.css';

export function ChoixFinition({ finitions, choisie, onChoisir, indisponible = false }: {
  finitions: Partial<Record<Finition, number>>; choisie: Finition; onChoisir: (finition: Finition) => void; indisponible?: boolean;
}) {
  return <div className="choix-finition" role="group" aria-label="Finition du timbre affiché">
    {FINITIONS.map((finition) => {
      const nombre = finitions[finition] ?? 0;
      return <button key={finition} type="button" className="choix-finition__option" data-finition={finition}
        aria-pressed={choisie === finition} disabled={nombre === 0 || indisponible}
        aria-label={`${finition} — ${nombre > 0 ? `${nombre} exemplaire${nombre > 1 ? 's' : ''}` : 'non possédée'}`}
        onClick={() => onChoisir(finition)}>
        <span className="choix-finition__matiere" aria-hidden="true" />
        <span>{finition}</span><small>{nombre > 0 ? `×${nombre}` : 'Non possédée'}</small>
      </button>;
    })}
  </div>;
}
