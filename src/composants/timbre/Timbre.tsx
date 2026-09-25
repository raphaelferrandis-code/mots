// Le timbre de la refonte graphique : l'aspect de la maquette de la cérémonie, avec les vraies données du jeu.
// Dentelure en masque, rosace guillochée propre au mot, cachet d'oblitération, et les reflets de la finition.
// Toutes les cotes intérieures sont en em d'une échelle qui vaut 1/30 de la largeur : le timbre s'affiche à
// n'importe quelle taille sans rien recalculer.
//
// Ce qui vient du jeu : l'attaque et la défense (les deux valeurs du haut), l'origine, la nature (couleur de
// l'encre), la rareté (cadre et mention imprimée), la finition (reflets), la date d'obtention (cachet) et le
// cachet « Maîtrisé ». La définition n'est plus imprimée sur le timbre : elle se lit à côté (fiche, cérémonie).

import { useId, useRef } from 'react';
import type { CSSProperties, PointerEvent, ReactNode, Ref } from 'react';
import { attaqueEnJeu, defenseEnJeu } from '../../config/equilibrage.ts';
import { ornement } from '../../jeu/personnalisation.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex, Finition, Nature } from '../../partage/types.ts';
import { CachetDeMaitrise } from '../carte/Tampon.tsx';
import { NIVEAU, NOM_COURT, anneeDuCachet } from '../carte/decor.ts';
import { VIGNETTES } from '../carte/vignettes.tsx';
import { Motif } from '../cosmetiques/Gravures.tsx';
import { empreinte, hasardReproductible, jourDuCachet, poserLesTextures, tailleDuMot, tracesDeLaVignette } from './dessins.ts';
import './timbre.css';

poserLesTextures();

// L'encre de l'impression dit la nature du mot, dans la palette de la maquette.
export const ENCRES_DU_TIMBRE: Record<Nature, string> = {
  Nom: '#3557a8',
  Verbe: '#b0404b',
  Adjectif: '#3c7a66',
  Adverbe: '#75519a',
};

type Props = {
  carte: CarteIndex;
  finition?: Finition;
  oblitere?: boolean; // le cachet est posé (timbre révélé, rangé dans l'album)
  obtenuLe?: number | null; // date portée par le cachet ; aujourd'hui si elle est inconnue
  verso?: boolean; // ajoute le verso gommé, pour les timbres qui se retournent
  montrerVerso?: boolean; // avec « verso » : quelle face est visible
  dosRenseigne?: boolean; // avec « verso » : le verso porte la nature, l'attaque et la défense (timbre adverse face cachée en duel)
  dos?: string; // modèle de dos choisi par le joueur (personnalisation)
  maitriseeLe?: number | null; // le mot est maîtrisé en duel : second cachet
  reagir?: boolean; // les reflets suivent le pointeur (par défaut : dès qu'il y a un reflet à faire jouer)
  cliquable?: boolean; // ouvre la fiche de la carte
  sansDefinition?: boolean; // compatibilité avec la carte précédente : la définition n'est plus sur le timbre
  onChoisir?: () => void; // le timbre devient un bouton
  action?: string; // ce que fait ce bouton, pour les lecteurs d'écran
  className?: string;
  style?: CSSProperties;
};

export function Timbre({ carte, finition = 'Normale', oblitere = false, obtenuLe = null, verso = false, montrerVerso = false, dosRenseigne = false, dos = 'gomme', maitriseeLe = null, reagir, cliquable = true, onChoisir, action, className, style }: Props) {
  const racine = useRef<HTMLElement>(null);
  const niveau = NIVEAU[carte.rarete];
  const horsSerie = carte.rarete === 'Hors-série';
  const effet = horsSerie ? 'Prismatique' : finition;
  const attaque = attaqueEnJeu(carte.attaque, carte.rarete);
  const defense = defenseEnJeu(carte.defense, carte.rarete);
  const suitLePointeur = reagir ?? (effet !== 'Normale' || niveau >= 4);

  // Les reflets se déplacent avec le pointeur : --mx/--my pour le vernis, --gx/--gy pour la lueur.
  const eclairer = (e: PointerEvent<HTMLElement>): void => {
    const cadre = e.currentTarget.getBoundingClientRect();
    if (!cadre.width) return;
    const x = Math.max(0, Math.min(1, (e.clientX - cadre.left) / cadre.width));
    const y = Math.max(0, Math.min(1, (e.clientY - cadre.top) / cadre.height));
    const s = racine.current?.style;
    s?.setProperty('--mx', x.toFixed(3)); s?.setProperty('--my', y.toFixed(3));
    s?.setProperty('--gx', `${(x * 100).toFixed(1)}%`); s?.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  };

  // La couche « cadre » porte le conteneur des mesures : un <button> ne peut pas le porter lui-même (Chrome).
  const contenu: ReactNode = (
    <span className="tb__cadre"><span className="tb__echelle">
      {verso && <DosDuTimbre dos={dos} renseignements={dosRenseigne ? { nature: carte.type, attaque, defense } : undefined} />}
      <span className="tb__face tb__recto">
        <span className="tb__papier" />
        <span className="tb__impression">
          {horsSerie && <FondDesHorsSerie idCarte={carte.id} />}
          <VignetteDuTimbre carte={carte} />
          <span className="tb__haut">
            <span className="tb__valeur">{attaque}<small>Att.</small></span>
            <span className="tb__origine">Origine<br />{NOM_COURT[carte.faction] ?? carte.faction}<span className="tb__rang" aria-hidden="true">{horsSerie ? '✦' : '◆'.repeat(niveau)}</span></span>
            <span className="tb__valeur">{defense}<small>Déf.</small></span>
          </span>
          <span className="tb__mot" lang="fr" style={{ '--taille-mot': `${tailleDuMot(carte.mot).toFixed(2)}em` } as CSSProperties}>{carte.mot}</span>
        </span>
        <span className="tb__mention">{carte.rarete} · {carte.type} · {anneeDuCachet(carte.attestation)}</span>
        <span className="tb__vernis" />
        <span className="tb__lueur" />
        <CachetDuTimbre faction={carte.faction} le={obtenuLe} attestation={anneeDuCachet(carte.attestation)} />
        {maitriseeLe !== null && <CachetDeMaitrise idCarte={carte.id} le={maitriseeLe} />}
      </span>
    </span></span>
  );

  const description = `${carte.mot}, ${carte.type}, ${carte.rarete}${finition === 'Normale' || horsSerie ? '' : `, finition ${finition.toLowerCase()}`}, ${carte.faction}, attaque ${attaque}, défense ${defense}${maitriseeLe !== null ? ', mot maîtrisé' : ''}`;
  const commun = {
    className: ['tb', className].filter(Boolean).join(' '),
    'data-nature': carte.type,
    'data-niveau': niveau,
    'data-finition': effet,
    'data-oblitere': oblitere || undefined,
    'data-face': verso ? (montrerVerso ? 'verso' : 'recto') : undefined,
    style: { '--encre-timbre': horsSerie ? '#17161c' : ENCRES_DU_TIMBRE[carte.type], ...style } as CSSProperties,
    onPointerMove: suitLePointeur ? eclairer : undefined,
    onPointerDown: suitLePointeur ? eclairer : undefined,
  };

  if (onChoisir) return <button type="button" {...commun} ref={racine as Ref<HTMLButtonElement>} onClick={onChoisir} aria-label={`${description} — ${action ?? 'choisir'}`}>{contenu}</button>;
  if (cliquable) return <a {...commun} ref={racine as Ref<HTMLAnchorElement>} href={lien({ ecran: 'carte', id: carte.id })} aria-label={`${description} — voir la fiche`}>{contenu}</a>;
  return <div {...commun} ref={racine as Ref<HTMLDivElement>} role="img" aria-label={montrerVerso ? (dosRenseigne ? `Timbre face cachée : ${carte.type}, attaque ${attaque}, défense ${defense}` : 'Timbre face cachée') : description}>{contenu}</div>;
}

// La rosace guillochée, unique à chaque mot, avec l'initiale au centre. Les Hors-série ont leur dessin à eux.
function VignetteDuTimbre({ carte }: { carte: CarteIndex }) {
  const id = useId();
  const illustration = VIGNETTES[carte.id];
  if (illustration) {
    return <span className="tb__vignette" aria-hidden="true"><svg viewBox="-110 -110 220 220">
      <circle className="tb__trait" r="106" strokeWidth=".7" opacity=".45" />
      <circle className="tb__trait" r="101" strokeWidth=".45" strokeDasharray="1 2.4" opacity=".55" />
      <circle className="tb__trait tb__disque" r="84" strokeWidth=".8" />
      <svg className="tb__illustration" x="-66" y="-66" width="132" height="132" viewBox="0 0 60 60">{illustration(id)}</svg>
    </svg></span>;
  }
  const [grande, petite] = tracesDeLaVignette(carte.id);
  return <span className="tb__vignette" aria-hidden="true"><svg viewBox="-110 -110 220 220">
    <circle className="tb__trait" r="106" strokeWidth=".7" opacity=".45" />
    <circle className="tb__trait" r="101" strokeWidth=".45" strokeDasharray="1 2.4" opacity=".55" />
    <path className="tb__trait" d={grande} strokeWidth=".42" opacity=".62" />
    <path className="tb__trait tb__trait--second" d={petite} strokeWidth=".38" opacity=".45" />
    <circle className="tb__trait tb__disque" r="44" strokeWidth=".8" />
    <circle className="tb__trait" r="39" strokeWidth=".4" opacity=".6" />
    <text className="tb__initiale" y="3" textAnchor="middle" dominantBaseline="middle">{carte.mot.charAt(0).toUpperCase()}</text>
  </svg></span>;
}

// Le fond vivant des Hors-série : deux grandes rosaces qui tournent lentement en sens contraire, et une poussière
// dorée et irisée qui monte en scintillant, comme le fond de la maquette. Positions propres au mot, donc stables.
const POUSSIERES = 14;
function FondDesHorsSerie({ idCarte }: { idCarte: string }) {
  const [grande, petite] = tracesDeLaVignette(`${idCarte}-fond`);
  const h = hasardReproductible(empreinte(idCarte) ^ 0x5bd1e995);
  const grains = Array.from({ length: POUSSIERES }, (_, i) => ({
    '--x': `${(4 + h() * 92).toFixed(1)}%`,
    '--y': `${(10 + h() * 85).toFixed(1)}%`,
    '--taille': `${(.22 + h() * .38).toFixed(2)}em`,
    '--duree': `${(5 + h() * 6).toFixed(1)}s`,
    '--delai': `${(-h() * 11).toFixed(1)}s`,
    '--teinte': ['#ffe3b0', '#f0c48f', '#fff8e8', '#ff8fb0', '#8fdcff', '#9dffc8'][i % 6],
  }) as CSSProperties);
  return <span className="tb__fond" aria-hidden="true">
    <svg className="tb__fond-rosace" viewBox="-110 -110 220 220"><path d={grande} /></svg>
    <svg className="tb__fond-rosace tb__fond-rosace--inverse" viewBox="-110 -110 220 220"><path d={petite} /></svg>
    {grains.map((style, i) => <span key={i} className="tb__grain" style={style} />)}
  </span>;
}

// Le cachet d'oblitération : l'origine du mot sur le tour, la date d'obtention au centre, un grain d'encre irrégulier.
// Sans date d'obtention connue (timbre d'un autre joueur, main du duel), le cachet porte l'année d'attestation du mot.
function CachetDuTimbre({ faction, le, attestation }: { faction: string; le: number | null; attestation: string }) {
  const id = useId();
  const date = new Date(le ?? Date.now());
  const jour = le === null ? 'ATTESTÉ' : jourDuCachet(date);
  const annee = le === null ? attestation : String(date.getFullYear());
  const vagues = [0, 1, 2, 3, 4].map((i) => <path key={i} d={`M110 ${36 + i * 12}q12 -7 24 0t24 0t24 0t24 0t24 0`} />);
  return <span className="tb__cachet" aria-hidden="true"><svg viewBox="0 0 232 120">
    <defs>
      <filter id={`${id}e`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed={(date.getDate() * 7 + faction.length) % 97} result="t" />
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.5 1.45" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" />
      </filter>
      <path id={`${id}c`} d="M60 60m-37 0a37 37 0 1 1 74 0a37 37 0 1 1 -74 0" />
    </defs>
    <g filter={`url(#${id}e)`}>
      <g fill="none" stroke="currentColor"><circle cx="60" cy="60" r="47" strokeWidth="3" /><circle cx="60" cy="60" r="29" strokeWidth="1.5" /><g strokeWidth="2.6">{vagues}</g></g>
      <text className="tb__cachet-tour"><textPath href={`#${id}c`}>{`${NOM_COURT[faction] ?? faction.toUpperCase()} · BUREAU DES MOTS ·`}</textPath></text>
      <text x="60" y="58" textAnchor="middle" className={le === null ? 'tb__cachet-annee' : 'tb__cachet-jour'}>{jour}</text>
      <text x="60" y="75" textAnchor="middle" className={le === null ? 'tb__cachet-jour' : 'tb__cachet-annee'}>{annee}</text>
    </g>
  </svg></span>;
}

// Un timbre vu de dos, seul (paquet à révéler, fiche retournée, aperçu des dos dans le Profil).
export function VersoDuTimbre({ dos = 'gomme', etiquette, onRetourner }: { dos?: string; etiquette: string; onRetourner?: () => void }) {
  const contenu = <span className="tb__cadre"><span className="tb__echelle"><DosDuTimbre dos={dos} /></span></span>;
  if (onRetourner) return <button type="button" className="tb tb--dos" data-modele={dos} onClick={onRetourner} aria-label={etiquette}>{contenu}</button>;
  return <div className="tb tb--dos" data-modele={dos} role="img" aria-label={etiquette}>{contenu}</div>;
}

// Le verso : papier gommé, filigrane, sceau et reflet mobile. Le sceau porte le dos choisi par le joueur.
// « renseignements » : en duel, le timbre adverse face cachée laisse lire sa nature, son attaque et sa défense.
export function DosDuTimbre({ dos = 'gomme', renseignements }: { dos?: string; renseignements?: { nature: Nature; attaque: number; defense: number } }) {
  const decor = ornement(dos);
  const personnalise = dos !== 'gomme' && decor;
  return <span className="tb__face tb__verso" data-modele={dos}>
    <span className="tb__verso-papier" />
    <span className="tb__filigrane" />
    <span className="tb__sceau" style={personnalise ? { '--teinte-dos': decor.teinte } as CSSProperties : undefined}>
      {personnalise
        ? <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><Motif nom={decor.valeur} /></svg>
        : <span>P</span>}
    </span>
    {renseignements ? <>
      <span className="tb__haut tb__haut--verso">
        <span className="tb__valeur">{renseignements.attaque}<small>Att.</small></span>
        <span className="tb__valeur">{renseignements.defense}<small>Déf.</small></span>
      </span>
      <span className="tb__note tb__note--nature" style={{ '--encre-nature': ENCRES_DU_TIMBRE[renseignements.nature] } as CSSProperties}>{renseignements.nature}</span>
    </> : <span className="tb__note">Philamots, verso gommé</span>}
    <span className="tb__gomme" />
  </span>;
}
