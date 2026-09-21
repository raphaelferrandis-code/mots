// La carte du jeu : un timbre-poste émis par la langue d'origine du mot.
// Dentelure, attaque et défense dans les coins comme des valeurs faciales, rosace gravée unique au centre,
// cachet d'origine daté de la première apparition du mot. La rareté se lit à la qualité de l'impression ;
// la finition (brillante, holographique) est une variante de tirage, indépendante de la rareté.

import { useRef } from 'react';
import type { CSSProperties, PointerEvent, ReactNode, Ref } from 'react';
import './timbre.css';
import { defenseEnJeu } from '../../config/equilibrage.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex, Finition } from '../../partage/types.ts';
import { Tampon } from './Tampon.tsx';
import { NIVEAU, anneeDuCachet, encresDe, rosaceDeGuillochis } from './decor.ts';

type Props = {
  carte: CarteIndex;
  finition?: Finition;
  cliquable?: boolean; // ouvre la fiche de la carte
  sansDefinition?: boolean; // en duel, la carte en main ne montre pas sa définition
};

export function Carte({ carte, finition = 'Normale', cliquable = true, sansDefinition = false }: Props) {
  const timbre = useRef<HTMLElement>(null);
  const niveau = NIVEAU[carte.rarete];
  const horsSerie = carte.rarete === 'Hors-série';
  const [encre, contraste] = encresDe(carte.faction);
  const date = anneeDuCachet(carte.attestation);

  // Le reflet suit le doigt ou la souris ; au repos, il balaie lentement la carte tout seul.
  const incliner = (e: PointerEvent<HTMLElement>): void => {
    const cadre = e.currentTarget.getBoundingClientRect();
    timbre.current?.style.setProperty('--rx', `${((e.clientX - cadre.left) / cadre.width) * 100}%`);
    timbre.current?.style.setProperty('--ry', `${((e.clientY - cadre.top) / cadre.height) * 100}%`);
    timbre.current?.setAttribute('data-touchee', '');
  };
  const relacher = (): void => timbre.current?.removeAttribute('data-touchee');
  const aUnReflet = horsSerie || finition !== 'Normale';

  const contenu: ReactNode = (
    <div className="tim__papier">
      <div className="tim__impression">
        <div className="tim__haut">
          <span className="tim__valeur"><small>Att.</small>{carte.attaque}</span>
          <span className="tim__emetteur"><small>Origine</small>{carte.faction}</span>
          <span className="tim__valeur"><small>Déf.</small>{defenseEnJeu(carte.defense, carte.rarete)}</span>
        </div>

        <div className="tim__vignette" aria-hidden="true">
          <svg viewBox="0 0 60 60">
            {rosaceDeGuillochis(carte.id, niveau >= 4 ? 9 : niveau >= 2 ? 6 : 4).map((d, i) => <path key={i} d={d} />)}
          </svg>
        </div>

        <div className="tim__mot" lang="fr" style={{ fontSize: `${Math.min(10.5, 96 / carte.mot.length)}cqi` }}>{carte.mot}</div>

        {!sansDefinition && <p className="tim__definition" lang="fr">{carte.definition}</p>}

        {carte.registre.length > 0 && <div className="tim__registre">{carte.registre.join(' · ')}</div>}
        <div className="tim__bas">
          <span>{carte.type}</span>
          <span className="tim__rarete">{carte.rarete}</span>
          <span>{date}</span>
        </div>
        {carte.record && <div className="tim__record">{carte.record}</div>}

        {aUnReflet && <div className="tim__reflet" aria-hidden="true" />}
      </div>
      <Tampon idCarte={carte.id} faction={carte.faction} date={date} />
    </div>
  );

  const description = `${carte.mot}, ${carte.type}, ${carte.rarete}${finition === 'Normale' ? '' : `, finition ${finition.toLowerCase()}`}, ${carte.faction}`;
  const commun = {
    className: 'tim',
    'data-niveau': niveau,
    'data-finition': horsSerie ? 'Prismatique' : finition,
    style: { '--encre': encre, '--contraste': contraste } as CSSProperties,
    onPointerMove: aUnReflet ? incliner : undefined,
    onPointerLeave: aUnReflet ? relacher : undefined,
  };

  return cliquable
    ? <a {...commun} ref={timbre as Ref<HTMLAnchorElement>} href={lien({ ecran: 'carte', id: carte.id })} aria-label={`${description} — voir la fiche`}>{contenu}</a>
    : <article {...commun} ref={timbre} aria-label={description}>{contenu}</article>;
}

// Le dos d'un timbre, pour les cartes encore face cachée : la gomme, et le filigrane du jeu.
export function DosDeCarte({ onRetourner, etiquette }: { onRetourner: () => void; etiquette: string }) {
  return (
    <button type="button" className="tim tim--dos" onClick={onRetourner} aria-label={etiquette}>
      <span className="tim__papier"><span className="tim__filigrane" aria-hidden="true">M</span></span>
    </button>
  );
}
