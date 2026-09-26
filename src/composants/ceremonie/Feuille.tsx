// La feuille de timbres de l'ouverture d'un paquet (brief du 26/09/2026), d'après prototype-ouverture-feuille.html.
// Une seule face dans le DOM à la fois, reconstruite à partir de l'état : timbre détaché ou non, révélé ou non.
// Un timbre détaché laisse un trou sur les deux faces. Les timbres sont ceux du jeu (Timbre), sans leur dentelure :
// ce sont les perforations de la feuille qui dessinent leurs bords.

import { memo, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { CarteObtenue } from '../../jeu/partie.ts';
import { Timbre, VersoDuTimbre } from '../timbre/Timbre.tsx';
import { eclatDe } from './eclats.ts';
import { ECRAN_ETROIT, caseDuTimbre, disposition, trous } from './feuille.ts';
import type { Disposition, Rectangle } from './feuille.ts';
import './feuille.css';

export type FaceDeLaFeuille = 'recto' | 'verso';

type Props = {
  cartes: readonly CarteObtenue[]; // dans l'ordre des cases
  face: FaceDeLaFeuille;
  etroite: boolean; // 2 colonnes × 3 rangées au lieu de 3 × 2
  numero: number; // le rang de ce paquet parmi ceux que le joueur a ouverts
  edition: number;
  dos?: string; // le dos choisi par le joueur, au verso de chaque timbre
  detaches?: readonly boolean[];
  reveles?: readonly boolean[]; // au recto : cachet posé ; au verso : plus de halo
  reduire?: boolean; // réglage « Réduire les animations »
  onCase?: (i: number, parClavier: boolean) => void; // parClavier : Entrée ou Espace, pas un geste
};

// La disposition suit la largeur de l'écran, et le téléphone qu'on tourne.
export function useEcranEtroit(): boolean {
  const [etroit, setEtroit] = useState(() => window.matchMedia(ECRAN_ETROIT).matches);
  useEffect(() => {
    const media = window.matchMedia(ECRAN_ETROIT);
    const suivre = (): void => setEtroit(media.matches);
    media.addEventListener('change', suivre);
    return () => media.removeEventListener('change', suivre);
  }, []);
  return etroit;
}

const pourcent = (v: number, total: number): string => `${((v / total) * 100).toFixed(4)}%`;
const placer = (r: Rectangle, d: Disposition): CSSProperties => ({ left: pourcent(r.x, d.largeur), top: pourcent(r.y, d.hauteur), width: pourcent(r.l, d.largeur), height: pourcent(r.h, d.hauteur) });
const chiffres = (n: number, longueur: number): string => String(Math.max(0, n)).padStart(longueur, '0');

// Mémorisée : la feuille ne se redessine que si elle change (face, timbre détaché ou révélé), pas à chaque envol.
export const Feuille = memo(function Feuille({ cartes, face, etroite, numero, edition, dos = 'gomme', detaches, reveles, reduire, onCase }: Props) {
  const d = useMemo(() => disposition(cartes.length, etroite), [cartes.length, etroite]);
  const verso = face === 'verso';
  const perforations = useMemo(() => trous(d, verso).map((t) => `M${t.x - 7} ${t.y}a7 7 0 1 0 14 0a7 7 0 1 0 -14 0`).join(''), [d, verso]);
  // Le reflet de la gomme suit le pointeur.
  const reflet = (e: PointerEvent<HTMLDivElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width) e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3));
  };

  return (
    <div className={`fe fe--${face}`} data-reduit={reduire || undefined} onPointerMove={verso ? reflet : undefined}
      style={{ '--fe-l': d.largeur, aspectRatio: `${d.largeur} / ${d.hauteur}` } as CSSProperties}>
      <span className="fe__papier" />
      {verso ? <MargesDuVerso d={d} numero={numero} /> : <MargesDuRecto d={d} numero={numero} edition={edition} />}
      {cartes.map((obtenue, i) => {
        const r = caseDuTimbre(i, d, verso);
        if (detaches?.[i]) return <span key={i} className="fe__trou" style={placer(r, d)} />;
        const revele = reveles?.[i] ?? !verso;
        if (!verso) {
          return <button key={i} type="button" className="fe__case" data-i={i} style={placer(r, d)} onClick={(e) => onCase?.(i, e.detail === 0)}
            aria-label={`${obtenue.carte.mot}, ${obtenue.carte.rarete.toLowerCase()}`}>
            <Timbre carte={obtenue.carte} finition={obtenue.finition} oblitere={revele} dentele={false} cliquable={false} reagir={false} />
          </button>;
        }
        const eclat = eclatDe(obtenue);
        return <button key={i} type="button" className="fe__case fe__case--dos" data-i={i} style={placer(r, d)} onClick={(e) => onCase?.(i, e.detail === 0)}
          data-halo={!revele && eclat !== 'courant' ? eclat : undefined}
          aria-label={revele ? `${obtenue.carte.mot}, ${obtenue.carte.rarete.toLowerCase()}, vu de dos` : `Timbre ${i + 1}, face cachée. Détacher pour le découvrir`}>
          <VersoDuTimbre dos={dos} dentele={false} />
          <span className="fe__halo" />
          <span className="fe__numero">{chiffres(i + 1, 2)}</span>
        </button>;
      })}
      {verso && <span className="fe__gomme" />}
      <svg className="fe__perforations" viewBox={`0 0 ${d.largeur} ${d.hauteur}`} aria-hidden="true"><path d={perforations} /></svg>
    </div>
  );
});

const SEPIA = '#6b5236', MARINE = '#16284a', CUIVRE = '#c8914b';

// Un texte trop long pour la feuille (paquet d'un seul timbre) est resserré pour tenir entre les marges.
function ajuste(texte: string, taille: number, espacement: number, place: number): { textLength?: number; lengthAdjust?: 'spacingAndGlyphs' } {
  const estimee = [...texte].length * (taille * 0.56 + espacement);
  return estimee > place ? { textLength: place, lengthAdjust: 'spacingAndGlyphs' } : {};
}

// Le recto : titre sur une bande guillochée, mention du paquet, coin daté, mention d'imprimerie.
function MargesDuRecto({ d, numero, edition }: { d: Disposition; numero: number; edition: number }) {
  const { largeur: W, hauteur: H, gauche: L } = d;
  const large = d.colonnes > 2;
  const bande = useMemo(() => Array.from({ length: 12 }, (_, k) => {
    let chemin = '';
    for (let x = 30; x <= W - 30; x += 8) chemin += `${x === 30 ? 'M' : 'L'}${x} ${(58 + Math.sin(x / 40 + k * 0.5) * 22 + Math.sin(x / 12 + k) * 2).toFixed(1)}`;
    return chemin;
  }), [W]);
  const date = new Date();
  const titre = Math.min(large ? 50 : 44, (W - 160) / 6.75);
  const mention = `PAQUET N° ${chiffres(numero, 4)} · ÉDITION ${edition} · ${d.timbres} TIMBRE${d.timbres > 1 ? 'S' : ''}`;
  const tailleMention = large ? 14 : 13;
  return <svg className="fe__marges" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
    {bande.map((chemin, k) => <path key={k} d={chemin} fill="none" stroke={CUIVRE} strokeWidth=".6" opacity=".4" />)}
    <text className="fe__titre" x={W / 2} y={large ? 72 : 70} textAnchor="middle" fontSize={titre} letterSpacing="10" fill={MARINE} stroke="#f5ecd6" strokeWidth="10" paintOrder="stroke" strokeLinejoin="round">PHILAMOTS</text>
    <text className="fe__etroit" x={W / 2} y={large ? 104 : 100} textAnchor="middle" fontSize={tailleMention} letterSpacing="4" fill={SEPIA} {...ajuste(mention, tailleMention, 4, W - 40)}>{mention}</text>
    <rect x={W - L - 150} y={H - 66} width="150" height="48" fill="none" stroke={SEPIA} strokeWidth="1.4" />
    <text className="fe__etroit" x={W - L - 75} y={H - 38} textAnchor="middle" fontWeight="600" fontSize="20" fill={MARINE}>{`${chiffres(date.getDate(), 2)}·${chiffres(date.getMonth() + 1, 2)}·${String(date.getFullYear()).slice(2)}`}</text>
    <text className="fe__etroit" x={W - L - 75} y={H - 24} textAnchor="middle" fontSize="9" letterSpacing="2" fill={SEPIA}>COIN DATÉ</text>
    {d.colonnes > 1 && <text className="fe__etroit" x={L} y={H - 34} fontSize="13" letterSpacing="3" fill={SEPIA}>IMPRIMERIE DES MOTS · TAILLE-DOUCE</text>}
  </svg>;
}

// Le verso : papier gommé, mention de la gomme et numéro de la feuille.
function MargesDuVerso({ d, numero }: { d: Disposition; numero: number }) {
  const { largeur: W, hauteur: H, gauche: L, haut: T } = d;
  const gomme = 'VERSO GOMMÉ · HUMECTER POUR COLLER';
  return <svg className="fe__marges" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
    <text className="fe__etroit" x={W / 2} y={T - 46} textAnchor="middle" fontSize="15" letterSpacing="6" fill={SEPIA} opacity=".45" {...ajuste(gomme, 15, 6, W - 40)}>{gomme}</text>
    <text className="fe__etroit" x={W - L} y={H - 34} textAnchor="end" fontSize="13" letterSpacing="3" fill={SEPIA} opacity=".45">N° {chiffres(numero, 6)}</text>
  </svg>;
}
