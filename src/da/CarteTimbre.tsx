// Piste retenue — « Timbre » : chaque mot est un timbre-poste émis par sa langue d'origine.
// Dentelure, valeurs dans les coins (attaque et défense), rosace gravée unique au centre, cachet
// d'origine daté de la première apparition du mot. La rareté se lit à la qualité de l'impression ;
// la finition (brillante, holographique…) est une variante de tirage, indépendante de la rareté.

import { useRef } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { defenseEnJeu } from '../config/equilibrage.ts';
import type { CarteIndex } from '../partage/types.ts';
import { Tampon } from './Tampon.tsx';
import { NIVEAU, anneeDuCachet, couleursDe, rosaceDeGuillochis } from './outils.ts';

export type Finition = 'normale' | 'brillante' | 'holographique' | 'prismatique';

type Props = {
  carte: CarteIndex;
  attestation?: string;
  finition?: Finition;
  horsSerie?: string; // rang ultime : le record que détient ce mot (« Le plus long mot de la langue »)
};

export function CarteTimbre({ carte, attestation, finition = 'normale', horsSerie }: Props) {
  const timbre = useRef<HTMLElement>(null);
  const niveau = horsSerie ? 6 : NIVEAU[carte.rarete];
  const [encre, contraste] = couleursDe(carte.faction);

  // Le reflet suit le doigt ou la souris ; au repos, il balaie lentement la carte tout seul.
  const incliner = (e: PointerEvent<HTMLElement>): void => {
    const cadre = e.currentTarget.getBoundingClientRect();
    timbre.current?.style.setProperty('--rx', `${((e.clientX - cadre.left) / cadre.width) * 100}%`);
    timbre.current?.style.setProperty('--ry', `${((e.clientY - cadre.top) / cadre.height) * 100}%`);
    timbre.current?.setAttribute('data-touchee', '');
  };
  const relacher = (): void => timbre.current?.removeAttribute('data-touchee');

  return (
    <article
      ref={timbre}
      className="tim"
      data-niveau={niveau}
      data-finition={finition}
      style={{ '--encre': encre, '--contraste': contraste } as CSSProperties}
      aria-label={`${carte.mot}, ${horsSerie ?? carte.rarete}${finition === 'normale' ? '' : `, finition ${finition}`}`}
      onPointerMove={incliner}
      onPointerLeave={relacher}
    >
      <div className="tim__papier">
        <div className="tim__impression">
          <header className="tim__haut">
            <span className="tim__valeur"><small>Att.</small>{carte.attaque}</span>
            <span className="tim__emetteur"><small>Origine</small>{carte.faction}</span>
            <span className="tim__valeur"><small>Déf.</small>{defenseEnJeu(carte.defense, carte.rarete)}</span>
          </header>

          <div className="tim__vignette" aria-hidden="true">
            <svg viewBox="0 0 60 60">
              {rosaceDeGuillochis(carte.id, niveau >= 4 ? 9 : niveau >= 2 ? 6 : 4).map((d, i) => <path key={i} d={d} />)}
            </svg>
          </div>

          <div className="tim__mot" style={{ fontSize: `${Math.min(10.5, 96 / carte.mot.length)}cqi` }}>{carte.mot}</div>

          <p className="tim__definition" lang="fr">{carte.definition}</p>

          <footer className="tim__bas">
            <span>{carte.type}</span>
            <span className="tim__rarete">{horsSerie ? 'Hors-série' : carte.rarete}</span>
            <span>{anneeDuCachet(attestation)}</span>
          </footer>
          {horsSerie && <div className="tim__record">{horsSerie}</div>}

          <div className="tim__reflet" aria-hidden="true" />
        </div>
        <Tampon idCarte={carte.id} faction={carte.faction} date={anneeDuCachet(attestation)} className="tim__tampon" />
      </div>
    </article>
  );
}
