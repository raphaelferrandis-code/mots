// Le paquet du jeu : « l'Encre vivante » (choisi par Raphaël le 25/09/2026 parmi les maquettes de #/maquettes).
// Un papier marbré à la cuve dont l'encre ondule lentement, une étiquette crème au centre, des soudures en cuivre.
// La languette du haut est détachable en deux couches (« attachée » et « arrachée ») : la cérémonie la déchire au doigt.
// Les couleurs du marbré viennent du modèle de paquet choisi par le joueur (personnalisation) ; chaque paquet a son
// propre marbré. « vivant » : l'encre bouge (le paquet qu'on regarde) ; sinon elle est figée (pile, aperçus).

import { useId } from 'react';
import type { CSSProperties } from 'react';
import { SITE } from '../../config/site.ts';
import { PAQUETS } from '../../jeu/personnalisation.ts';
import { empreinte } from '../timbre/dessins.ts';
import { mouvementReduit } from '../mouvement.ts';
import './ceremonie.css';

function cheminDuCorps(): string {
  let d = 'M0 0H320V406';
  const n = 32, w = 320 / n;
  for (let i = 1; i <= n; i++) { const x = 320 - i * w; d += `L${(x + w / 2).toFixed(1)} 422L${x.toFixed(1)} 406`; }
  return `${d}Z`;
}
function cheminDeLaLanguette(): string {
  let d = 'M0 9';
  const n = 32, w = 320 / n;
  for (let i = 0; i < n; i++) { const x = i * w; d += `L${(x + w / 2).toFixed(1)} 0L${(x + w).toFixed(1)} 9`; }
  return `${d}V52H0Z`;
}
const CORPS = cheminDuCorps();
const LANGUETTE = cheminDeLaLanguette();
export const MASQUE_DU_PAQUET = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 422' preserveAspectRatio='none'><path d='${CORPS}'/></svg>`)}")`;

const CREME = '#f1e7d0';
const CREME_2 = '#e8d6b0';
// Les épaisseurs des bandes d'encre, avant que la cuve ne les fasse onduler.
const EPAISSEURS = [30, 12, 5, 22, 8, 26, 4, 18, 14, 6, 28, 7, 16, 24, 5, 20, 9, 30, 12, 26];

// Les teintes du modèle « original » sont celles de la maquette ; les autres modèles tissent leurs propres couleurs.
function teintes(modele: string) {
  const design = PAQUETS.find((p) => p.id === modele) ?? PAQUETS[0];
  const original = design.id === 'original';
  const clairMetal = `color-mix(in srgb, ${design.metal} 60%, #fff)`;
  const sombreMetal = `color-mix(in srgb, ${design.metal} 65%, #1a0f06)`;
  return {
    design,
    original,
    bandes: original
      ? ['#0b1a33', '#1f3f76', CREME, '#0b1a33', '#c77b3e', '#162f5c', '#f0c48f', '#0b1a33', '#2c5596', CREME_2, '#0e2142', '#b0703a', '#1f3f76', '#0b1a33', CREME, '#14284d', '#d89a5c', '#0b1a33', '#2c5596', '#0e2142']
      : [design.ombre, design.fond, CREME, design.ombre, design.metal, design.fond, clairMetal, design.ombre, design.clair, CREME_2, design.ombre, sombreMetal, design.fond, design.ombre, CREME, design.fond, design.metal, design.ombre, design.clair, design.ombre],
    languette: original
      ? ['#c7884c', '#f0c48f', '#d3955a', '#f3cf9d', '#bf7f45']
      : [`color-mix(in srgb, ${design.metal} 70%, #3a2412)`, design.metal, `color-mix(in srgb, ${design.metal} 80%, #3a2412)`, `color-mix(in srgb, ${design.metal} 70%, #fff)`, `color-mix(in srgb, ${design.metal} 65%, #3a2412)`],
    filet: original ? '#f0c48f' : design.metal,
    accent: original ? '#9c6431' : `color-mix(in srgb, ${design.metal} 55%, #2a1a0c)`,
  };
}

function Languette({ modele }: { modele: string }) {
  const id = useId();
  const { design, languette } = teintes(modele);
  return <svg viewBox="0 0 320 52" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}g`} x1="0" x2="1">{languette.map((c, i) => <stop key={i} offset={[0, .3, .55, .8, 1][i]} style={{ stopColor: c }} />)}</linearGradient>
      <pattern id={`${id}t`} width="5" height="52" patternUnits="userSpaceOnUse"><rect x="2" width=".8" height="52" fill="rgba(80,45,15,.3)" /></pattern>
    </defs>
    <path d={LANGUETTE} fill={`url(#${id}g)`} /><path d={LANGUETTE} fill={`url(#${id}t)`} />
    <text x="150" y="33" textAnchor="middle" className="cp__texte-etroit" fontSize="11" fontWeight="600" letterSpacing="2.6" fill="#4a2a0c">{SITE.nomEnCapitales} · {design.nom.toLocaleUpperCase('fr')}</text>
    <line x1="4" y1="48" x2="316" y2="48" stroke="#5c3714" strokeWidth="1.3" strokeDasharray="3 3" />
    <path d="M296 22l6 6-6 6" fill="none" stroke="#4a2a0c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function Corps({ modele, vivant, graine }: { modele: string; vivant: boolean; graine: number }) {
  const id = useId();
  const { design, original, bandes, languette, filet, accent } = teintes(modele);
  let y = -80;
  return <svg viewBox="0 0 320 422" aria-hidden="true">
    <defs>
      <clipPath id={`${id}c`}><path d={CORPS} /></clipPath>
      <filter id={`${id}m`} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0045 0.011" numOctaves="2" seed={graine} result="t">
          {vivant && <animate attributeName="baseFrequency" dur="26s" values="0.0045 0.011;0.006 0.009;0.0045 0.011" repeatCount="indefinite" />}
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="120" xChannelSelector="R" yChannelSelector="G">
          {vivant && <animate attributeName="scale" dur="15s" values="105;150;105" repeatCount="indefinite" />}
        </feDisplacementMap>
      </filter>
      <radialGradient id={`${id}e`} cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#fcf6e6" /><stop offset=".8" stopColor="#efe2c4" /><stop offset="1" stopColor="#dcc79c" /></radialGradient>
      <linearGradient id={`${id}s`} x1="0" x2="1">{languette.map((c, i) => <stop key={i} offset={[0, .3, .55, .8, 1][i]} style={{ stopColor: c }} />)}</linearGradient>
    </defs>
    <g clipPath={`url(#${id}c)`}>
      <g filter={`url(#${id}m)`}>
        {bandes.map((c, i) => { const h = EPAISSEURS[i] * 1.8; const r = <rect key={i} x="-80" y={y} width="480" height={h + 1} style={{ fill: c }} />; y += h; return r; })}
      </g>
      {/* La soudure du bas, en cuivre strié. */}
      <rect x="0" y="392" width="320" height="40" fill={`url(#${id}s)`} />
      {Array.from({ length: 64 }, (_, i) => <line key={i} x1={i * 5 + 2.5} y1="394" x2={i * 5 + 2.5} y2="422" stroke="#5c3714" strokeOpacity=".3" strokeWidth=".7" />)}
    </g>
    <rect x="14" y="8" width="292" height="376" fill="none" style={{ stroke: filet }} strokeWidth="1.4" />
    <rect x="19" y="13" width="282" height="366" fill="none" style={{ stroke: filet }} strokeOpacity=".5" strokeWidth=".6" />
    <g filter="drop-shadow(0 8px 10px rgba(0,0,0,.5))">
      <ellipse cx="160" cy="196" rx="104" ry="70" fill={`url(#${id}e)`} />
      <ellipse cx="160" cy="196" rx="96" ry="62" fill="none" style={{ stroke: accent }} strokeWidth="1.2" />
      <ellipse cx="160" cy="196" rx="92" ry="58" fill="none" style={{ stroke: accent }} strokeOpacity=".5" strokeWidth=".6" />
    </g>
    <text x="160" y="175" textAnchor="middle" className="cp__texte-etroit" fontSize="8.5" letterSpacing="3" style={{ fill: accent }}>{original ? 'ENCRE ORIGINALE' : design.nom.toLocaleUpperCase('fr')}</text>
    <text x="160" y="211" textAnchor="middle" className="cp__texte-serif" fontStyle="italic" fontWeight="700" fontSize="38" fill="#14284d">Philamots</text>
    <text x="160" y="231" textAnchor="middle" className="cp__texte-serif" fontStyle="italic" fontSize="12" style={{ fill: accent }}>cinq timbres-mots</text>
  </svg>;
}

// « cp » : le paquet. La languette attachée et la languette arrachée sont deux copies du même dessin,
// découpées au fil de la déchirure par la cérémonie (clip-path).
export function PaquetDeCeremonie({ modele = 'original', vivant = true, className, style }: { modele?: string; vivant?: boolean; className?: string; style?: CSSProperties }) {
  const id = useId();
  // Un marbré par paquet : deux paquets côte à côte ne se ressemblent jamais tout à fait.
  const graine = 1 + (empreinte(id) % 89);
  // L'encre ne bouge pas si le joueur a demandé moins d'animations.
  const reduit = mouvementReduit();
  return <div className={['cp', className].filter(Boolean).join(' ')} style={{ '--masque-paquet': MASQUE_DU_PAQUET, ...style } as CSSProperties}>
    <div className="cp__inclinaison">
      <div className="cp__corps"><Corps modele={modele} vivant={vivant && !reduit} graine={graine} /><div className="cp__vernis" /><div className="cp__lueur" /></div>
      <div className="cp__languette">
        <div className="cp__bande cp__bande--attachee"><Languette modele={modele} /></div>
        <div className="cp__bande cp__bande--arrachee" style={{ clipPath: 'inset(0 100% 0 0)' }}><Languette modele={modele} /></div>
        <span className="cp__indice" />
      </div>
    </div>
  </div>;
}
