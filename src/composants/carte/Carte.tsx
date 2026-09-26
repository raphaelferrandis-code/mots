import { Motif } from '../cosmetiques/Gravures.tsx';
import { profilVisible } from '../../jeu/personnalisation.ts';
import { usePartie } from '../usePartie.ts';
// La carte du jeu : un timbre-poste dont l'encre indique la nature du mot.
// Dentelure, attaque et défense dans les coins comme des valeurs faciales, rosace gravée unique au centre,
// cachet d'origine daté de la première apparition du mot. La rareté se lit à la qualité de l'impression ;
// la finition (brillante, holographique) est une variante de tirage, indépendante de la rareté.

import { useId, useMemo, useRef } from 'react';
import type { CSSProperties, PointerEvent, ReactNode, Ref } from 'react';
import './timbre.css';
import { attaqueEnJeu, defenseEnJeu } from '../../config/equilibrage.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex, Finition } from '../../partage/types.ts';
import { Tampon } from './Tampon.tsx';
import { NIVEAU, anneeDuCachet, encresDe, motifDuTimbre } from './decor.ts';
import { VIGNETTES } from './vignettes.tsx';
import { Timbre, VersoDuTimbre } from '../timbre/Timbre.tsx';

type Props = {
  carte: CarteIndex;
  finition?: Finition;
  specimen?: 'Nacrée' | 'Encre latente'; // Essais visuels uniquement, sans entrée dans les tirages ni la sauvegarde.
  cliquable?: boolean; // ouvre la fiche de la carte
  sansDefinition?: boolean; // en duel, la carte en main ne montre pas sa définition
  onChoisir?: () => void; // la carte devient un bouton (choisir une carte du deck, jouer une carte de sa main)
  action?: string; // ce que fait ce bouton, pour les lecteurs d'écran : « ajouter au deck », « jouer »…
  obtenuLe?: number | null; // date d'obtention : c'est elle que porte le cachet (sinon, l'année d'attestation du mot)
};

// Depuis la refonte (maquette de la cérémonie), la carte du jeu est le nouveau timbre, partout.
// Les spécimens de matière (galerie de contrôle) gardent l'ancienne gravure.
export function Carte({ specimen, obtenuLe = null, ...props }: Props) {
  if (specimen) return <CarteClassique specimen={specimen} {...props} />;
  const { carte, finition = 'Normale', cliquable = true, onChoisir, action } = props;
  return <Timbre carte={carte} finition={finition} oblitere obtenuLe={obtenuLe} cliquable={cliquable} onChoisir={onChoisir} action={action} />;
}

// L'ancienne carte, avant la refonte.
export function CarteClassique({ carte, finition = 'Normale', specimen, cliquable = true, sansDefinition = false, onChoisir, action }: Props) {
  const timbre = useRef<HTMLElement>(null);
  const niveau = NIVEAU[carte.rarete];
  const horsSerie = carte.rarete === 'Hors-série';
  const [encre, contraste, encreClaire] = encresDe(carte.type);
  const date = anneeDuCachet(carte.attestation);
  const idDuDessin = useId();
  // Le motif est propre au mot. Les timbres Hors-série ont, en plus, une illustration dessinée pour eux.
  const illustration = VIGNETTES[carte.id];
  const motif = useMemo(() => (illustration ? [] : motifDuTimbre(carte.id, niveau >= 4 ? 4 : niveau >= 2 ? 3 : 2)), [carte.id, niveau, illustration]);

  // Le pointeur déplace le centre de la lumière ; son orbite CSS continue sans redémarrer.
  const incliner = (e: PointerEvent<HTMLElement>): void => {
    const cadre = e.currentTarget.getBoundingClientRect();
    timbre.current?.style.setProperty('--rx', `${Math.max(0, Math.min(100, ((e.clientX - cadre.left) / cadre.width) * 100))}%`);
    timbre.current?.style.setProperty('--ry', `${Math.max(0, Math.min(100, ((e.clientY - cadre.top) / cadre.height) * 100))}%`);
    timbre.current?.setAttribute('data-touchee', '');
  };
  const relacher = (): void => timbre.current?.removeAttribute('data-touchee');
  const aUnReflet = horsSerie || finition !== 'Normale' || !!specimen;
  const reagitALaLumiere = aUnReflet || niveau >= 4;

  const contenu: ReactNode = (
    <div className="tim__papier">
      <div className="tim__impression">
        <div className="tim__haut">
          <span className="tim__valeur"><small>Att.</small>{attaqueEnJeu(carte.attaque, carte.rarete)}</span>
          <span className="tim__emetteur"><small>Origine</small>{carte.faction}</span>
          <span className="tim__valeur"><small>Déf.</small>{defenseEnJeu(carte.defense, carte.rarete)}</span>
        </div>

        <div className="tim__vignette" aria-hidden="true">
          <svg viewBox="0 0 60 60">
            {illustration ? illustration(idDuDessin) : motif.map((d, i) => <path key={i} d={d} />)}
          </svg>
          {aUnReflet && !illustration && <svg className="tim__vernis" viewBox="0 0 60 60">
            <defs><linearGradient id={`${idDuDessin}-vernis`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff8d5" /><stop offset=".3" stopColor="#82dedf" />
              <stop offset=".5" stopColor="#fffef5" /><stop offset=".7" stopColor="#ca9fde" /><stop offset="1" stopColor="#efbf80" />
            </linearGradient></defs>
            {motif.map((d, i) => <path key={i} d={d} style={{ stroke: `url(#${idDuDessin}-vernis)` }} />)}
          </svg>}
          {specimen === 'Encre latente' && <svg className="tim__latent" viewBox="0 0 100 100"><Motif nom="plume" /></svg>}
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

  const description = `${carte.mot}, ${carte.type}, ${carte.rarete}${specimen ? `, spécimen ${specimen.toLowerCase()}` : finition === 'Normale' ? '' : `, finition ${finition.toLowerCase()}`}, ${carte.faction}, attaque ${attaqueEnJeu(carte.attaque, carte.rarete)}, défense ${defenseEnJeu(carte.defense, carte.rarete)}`;
  const commun = {
    className: 'tim',
    'data-nature': carte.type,
    'data-niveau': niveau,
    'data-finition': specimen ?? (horsSerie ? 'Prismatique' : finition),
    style: { '--encre': horsSerie ? encreClaire : encre, '--contraste': contraste } as CSSProperties,
    onPointerMove: reagitALaLumiere ? incliner : undefined,
    onPointerDown: reagitALaLumiere ? incliner : undefined,
    onPointerLeave: reagitALaLumiere ? relacher : undefined,
    onPointerCancel: reagitALaLumiere ? relacher : undefined,
  };

  if (onChoisir) return <button type="button" {...commun} ref={timbre as Ref<HTMLButtonElement>} onClick={onChoisir} aria-label={`${description} — ${action ?? 'choisir'}`}>{contenu}</button>;
  return cliquable
    ? <a {...commun} ref={timbre as Ref<HTMLAnchorElement>} href={lien({ ecran: 'carte', id: carte.id })} aria-label={`${description} — voir la fiche`}>{contenu}</a>
    : <article {...commun} ref={timbre} tabIndex={specimen ? 0 : undefined} aria-label={description}>{contenu}</article>;
}

// Le dos d'un timbre, pour les cartes encore face cachée : la gomme, et le filigrane du jeu.
export function DosDeCarte({ onRetourner, etiquette, modele }: { onRetourner?: () => void; etiquette: string; modele?: string; anime?: boolean }) {
  const partie = usePartie();
  const choix = modele ?? (partie.etat === 'prete' ? profilVisible(partie.sauvegarde.profil, partie.compte?.formule ?? null).dos : 'gomme');
  return <VersoDuTimbre dos={choix} etiquette={etiquette} onRetourner={onRetourner} />;
}

