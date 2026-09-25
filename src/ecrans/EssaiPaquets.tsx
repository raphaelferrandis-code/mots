// Cinq paquets « sans limite », pour trouver l'effet « wahou » (développement seulement, #/maquettes).
// Chaque paquet est un petit objet vivant : couches en vraie profondeur, encre qui ondule, étoiles, film holographique,
// cuivre éclairé en temps réel. Une seule boucle anime l'inclinaison (souris, ou balancement au repos) et la lumière.

import { useEffect, useId } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { FondAnime } from '../composants/accueil/FondAnime.tsx';
import { dentelure, empreinte, hasardReproductible, rosace } from '../composants/timbre/dessins.ts';
import '../composants/accueil/refonte.css';
import './essaiPaquets.css';

// ── Pièces communes ─────────────────────────────────────────────────────────

function silhouette(): string {
  const n = 26, w = 320 / n;
  let d = 'M0 12';
  for (let i = 0; i < n; i++) d += `L${(i * w + w / 2).toFixed(1)} 0L${((i + 1) * w).toFixed(1)} 12`;
  d += 'V458';
  for (let i = n - 1; i >= 0; i--) d += `L${(i * w + w / 2).toFixed(1)} 470L${(i * w).toFixed(1)} 458`;
  return `${d}Z`;
}
const SILHOUETTE = silhouette();
const MASQUE = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 470' preserveAspectRatio='none'><path d='${SILHOUETTE}'/></svg>`)}")`;
const VUE = '0 0 320 470';

// Des points au hasard, toujours les mêmes (étoiles, fenêtres allumées).
function semis(graine: string, n: number, x0: number, x1: number, y0: number, y1: number): [number, number, number][] {
  const h = hasardReproductible(empreinte(graine));
  return Array.from({ length: n }, () => [x0 + h() * (x1 - x0), y0 + h() * (y1 - y0), h()]);
}

// Les soudures serties du haut et du bas, en cuivre.
function Soudures({ id, opacite = 1 }: { id: string; opacite?: number }) {
  return <g opacity={opacite}>
    <defs><linearGradient id={`${id}sd`} x1="0" x2="1"><stop offset="0" stopColor="#9c6431" /><stop offset=".3" stopColor="#f0c48f" /><stop offset=".6" stopColor="#c98a52" /><stop offset=".85" stopColor="#f6d6a6" /><stop offset="1" stopColor="#9c6431" /></linearGradient></defs>
    <path d={`${SILHOUETTE.split('V458')[0]}V30H0Z`} fill={`url(#${id}sd)`} />
    <path d={`M0 440H320V458${SILHOUETTE.split('V458')[1]}`} fill={`url(#${id}sd)`} />
    {Array.from({ length: 64 }, (_, i) => <g key={i}><line x1={i * 5 + 2.5} y1="6" x2={i * 5 + 2.5} y2="28" stroke="#5c3714" strokeOpacity=".35" strokeWidth=".7" /><line x1={i * 5 + 2.5} y1="442" x2={i * 5 + 2.5} y2="464" stroke="#5c3714" strokeOpacity=".35" strokeWidth=".7" /></g>)}
  </g>;
}

// Un petit timbre dentelé (flottant, dans le sachet, en lune…).
function PetitTimbre({ l, h, encre = '#2c5596', lettre = 'P', papier = '#f4ead2' }: { l: number; h: number; encre?: string; lettre?: string; papier?: string }) {
  return <g>
    <path d={dentelure(l, h, Math.max(2.2, l / 22), Math.max(6, l / 8))} fill={papier} />
    <rect x={l * .1} y={l * .1} width={l * .8} height={h - l * .2} fill={encre} />
    <circle cx={l / 2} cy={h * .45} r={l * .2} fill="none" stroke="#f6ecd6" strokeOpacity=".7" strokeWidth={l / 90} />
    <text x={l / 2} y={h * .45 + l * .09} textAnchor="middle" className="mw__serif" fontStyle="italic" fontWeight="700" fontSize={l * .26} fill="#f7eed9">{lettre}</text>
  </g>;
}

// Une couche du paquet, à sa profondeur (px vers l'arrière).
// Les couches du fond sont découpées à la forme du sachet : rien ne dépasse, même incliné.
function Couche({ z = 0, children, className }: { z?: number; children: ReactNode; className?: string }) {
  return <div className={['mw__couche', className].filter(Boolean).join(' ')} style={{ transform: `translateZ(${-z}px)`, ...(z > 0 ? { WebkitMask: `${MASQUE} center / 100% 100% no-repeat`, mask: `${MASQUE} center / 100% 100% no-repeat` } : {}) }}>
    <svg viewBox={VUE} aria-hidden="true">{children}</svg>
  </div>;
}

// ── 1. Le Diorama : les toits des mots, en couches ─────────────────────────

const ARCHE = 'M40 395V210a120 120 0 0 1 240 0V395Z';
function Diorama({ id }: { id: string }) {
  const etoiles = semis('diorama-etoiles', 70, 20, 300, 20, 300);
  const fenetres = semis('diorama-fenetres', 60, 30, 290, 300, 380);
  return <>
    <Couche z={90}>
      <defs><linearGradient id={`${id}ciel`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#071126" /><stop offset=".55" stopColor="#1a3566" /><stop offset=".8" stopColor="#6d4a52" /><stop offset="1" stopColor="#e39b5c" /></linearGradient>
        <radialGradient id={`${id}lune`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fbe0b4" /><stop offset=".5" stopColor="#d89a5c" /><stop offset="1" stopColor="#7a4418" /></radialGradient></defs>
      <rect x="-30" y="-30" width="380" height="530" fill={`url(#${id}ciel)`} />
      {etoiles.map(([x, y, t], i) => <circle key={i} className="mw__scintille" style={{ '--d': `${(t * 4).toFixed(2)}s` } as CSSProperties} cx={x} cy={y} r={.5 + t * 1.1} fill="#fff4dc" />)}
      <g transform="translate(222 150)"><circle r="30" fill={`url(#${id}lune)`} /><circle r="30" fill="none" stroke="#fbe0b4" strokeOpacity=".4" strokeWidth="6" className="mw__halo" /><circle r="22" fill="none" stroke="#5c2d0c" strokeOpacity=".4" /><text y="11" textAnchor="middle" className="mw__serif" fontStyle="italic" fontWeight="700" fontSize="30" fill="#5c2d0c" fillOpacity=".75">P</text></g>
    </Couche>
    <Couche z={60}>
      <path d="M-20 330L10 330L10 300L30 292L50 300L50 285L58 285L58 300L80 300L95 280L110 300L110 318L140 318L140 296L150 290L160 296L175 296L175 270L182 262L189 270L189 296L205 296L215 284L230 296L250 296L250 305L270 305L280 290L292 305L340 305V520H-20Z" fill="#132a52" />
      {fenetres.slice(0, 26).map(([x, y], i) => y > 312 ? <rect key={i} x={x} y={y} width="3" height="4" fill="#f0c48f" fillOpacity=".75" /> : null)}
    </Couche>
    <Couche z={32}>
      <defs><pattern id={`${id}fen`} width="9" height="12" patternUnits="userSpaceOnUse"><rect width="9" height="12" fill="#0a1730" /><rect x="3" y="4" width="3" height="4" fill="#f0c48f" fillOpacity=".8" /></pattern></defs>
      <text x="160" y="392" textAnchor="middle" className="mw__serif" fontWeight="900" fontSize="46" letterSpacing="-1" fill={`url(#${id}fen)`} stroke="#0a1730" strokeWidth="1">PHILAMOTS</text>
      <rect x="-20" y="388" width="360" height="120" fill="#0a1730" />
    </Couche>
    <Couche z={12} className="mw__vol">
      <g transform="translate(70 230) rotate(-12)" className="mw__flotte"><PetitTimbre l={34} h={43} /></g>
      <g transform="translate(236 250) rotate(10)" className="mw__flotte mw__flotte--2"><PetitTimbre l={28} h={35} encre="#b0404b" lettre="M" /></g>
      <g transform="translate(150 196) rotate(4)" className="mw__flotte mw__flotte--3"><PetitTimbre l={22} h={28} encre="#3c7a66" lettre="O" /></g>
    </Couche>
    <Couche>
      <defs><linearGradient id={`${id}corps`} x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stopColor="#21427a" /><stop offset="1" stopColor="#0b1a33" /></linearGradient>
        <linearGradient id={`${id}vitre`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".4" stopColor="#fff" stopOpacity="0" /><stop offset=".47" stopColor="#fff" stopOpacity=".12" /><stop offset=".52" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
      <path d={`${SILHOUETTE}${ARCHE}`} fillRule="evenodd" fill={`url(#${id}corps)`} />
      <Soudures id={id} />
      <path d={ARCHE} fill={`url(#${id}vitre)`} />
      <path d={ARCHE} fill="none" stroke="#f0c48f" strokeWidth="2.2" />
      <path d="M33 402V210a127 127 0 0 1 254 0V402" fill="none" stroke="#d89a5c" strokeOpacity=".5" strokeWidth=".8" strokeDasharray="1 3" />
      <text x="160" y="58" textAnchor="middle" className="mw__etroit" fontSize="10" letterSpacing="4" fill="#f1e7d0">PHILAMOTS · LES TOITS DES MOTS</text>
      <text x="160" y="424" textAnchor="middle" className="mw__serif" fontStyle="italic" fontSize="16" fill="#f0c48f">Cinq timbres à découvrir</text>
    </Couche>
  </>;
}

// ── 2. L'Encre vivante : papier marbré qui ondule ──────────────────────────

function EncreVivante({ id }: { id: string }) {
  const bandes = ['#0b1a33', '#1f3f76', '#f1e7d0', '#0b1a33', '#c77b3e', '#162f5c', '#f0c48f', '#0b1a33', '#2c5596', '#e8d6b0', '#0e2142', '#b0703a', '#1f3f76', '#0b1a33', '#f1e7d0', '#14284d', '#d89a5c', '#0b1a33', '#2c5596', '#0e2142'];
  const hauteurs = [30, 12, 5, 22, 8, 26, 4, 18, 14, 6, 28, 7, 16, 24, 5, 20, 9, 30, 12, 26];
  return <Couche>
    <defs>
      <clipPath id={`${id}s`}><path d={SILHOUETTE} /></clipPath>
      <filter id={`${id}m`} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0045 0.011" numOctaves="2" seed="11" result="t">
          <animate attributeName="baseFrequency" dur="26s" values="0.0045 0.011;0.006 0.009;0.0045 0.011" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="120" xChannelSelector="R" yChannelSelector="G">
          <animate attributeName="scale" dur="15s" values="105;150;105" repeatCount="indefinite" />
        </feDisplacementMap>
      </filter>
      <radialGradient id={`${id}e`} cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#fcf6e6" /><stop offset=".8" stopColor="#efe2c4" /><stop offset="1" stopColor="#dcc79c" /></radialGradient>
    </defs>
    <g clipPath={`url(#${id}s)`}>
      <g filter={`url(#${id}m)`}>
        {bandes.map((c, i) => <rect key={i} x="-80" y={-80 + hauteurs.slice(0, i).reduce((s, h) => s + h, 0) * 1.95} width="480" height={hauteurs[i] * 1.95 + 1} fill={c} />)}
      </g>
    </g>
    <rect x="14" y="40" width="292" height="392" fill="none" stroke="#f0c48f" strokeWidth="1.4" />
    <rect x="19" y="45" width="282" height="382" fill="none" stroke="#f0c48f" strokeOpacity=".5" strokeWidth=".6" />
    <g filter="drop-shadow(0 8px 10px rgba(0,0,0,.5))">
      <ellipse cx="160" cy="235" rx="104" ry="70" fill={`url(#${id}e)`} />
      <ellipse cx="160" cy="235" rx="96" ry="62" fill="none" stroke="#c77b3e" strokeWidth="1.2" />
      <ellipse cx="160" cy="235" rx="92" ry="58" fill="none" stroke="#c77b3e" strokeOpacity=".5" strokeWidth=".6" />
    </g>
    <text x="160" y="214" textAnchor="middle" className="mw__etroit" fontSize="8.5" letterSpacing="3" fill="#9c6431">ENCRE ORIGINALE</text>
    <text x="160" y="250" textAnchor="middle" className="mw__serif" fontStyle="italic" fontWeight="700" fontSize="38" fill="#14284d">Philamots</text>
    <text x="160" y="270" textAnchor="middle" className="mw__serif" fontStyle="italic" fontSize="12" fill="#9c6431">cinq timbres-mots</text>
    <Soudures id={id} />
  </Couche>;
}

// ── 3. La Constellation : un ciel en trois plans, une plume tracée d'étoile en étoile ──

const PLUME: [number, number][] = [[112, 320], [132, 276], [152, 232], [178, 186], [206, 144], [236, 108], [256, 90]];
const BARBES: [number, number, number, number][] = [[152, 232, 118, 200], [178, 186, 146, 150], [206, 144, 184, 106], [178, 186, 214, 196], [206, 144, 240, 150], [152, 232, 188, 246]];
function Constellation({ id }: { id: string }) {
  const lointaines = semis('ciel-loin', 110, 20, 300, 40, 370);
  const proches = semis('ciel-pres', 26, 26, 294, 46, 364);
  const lettres = 'PHILAMOTS';
  const chemin = PLUME.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
  return <>
    <Couche z={70}>
      <defs>
        <radialGradient id={`${id}n1`} cx=".35" cy=".35" r=".5"><stop offset="0" stopColor="#6a3d8f" stopOpacity=".7" /><stop offset="1" stopColor="#6a3d8f" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}n2`} cx=".7" cy=".65" r=".5"><stop offset="0" stopColor="#c77b3e" stopOpacity=".55" /><stop offset="1" stopColor="#c77b3e" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}n3`} cx=".55" cy=".2" r=".5"><stop offset="0" stopColor="#2c7ab0" stopOpacity=".55" /><stop offset="1" stopColor="#2c7ab0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="-30" y="-30" width="380" height="530" fill="#05091a" />
      <rect x="-30" y="-30" width="380" height="530" fill={`url(#${id}n1)`} /><rect x="-30" y="-30" width="380" height="530" fill={`url(#${id}n2)`} /><rect x="-30" y="-30" width="380" height="530" fill={`url(#${id}n3)`} />
      {lointaines.map(([x, y, t], i) => <circle key={i} cx={x} cy={y} r={.3 + t * .7} fill="#dfe8ff" fillOpacity={.35 + t * .5} />)}
    </Couche>
    <Couche z={36}>
      {proches.map(([x, y, t], i) => i % 3 === 0
        ? <text key={i} className="mw__scintille mw__serif" style={{ '--d': `${(t * 5).toFixed(2)}s` } as CSSProperties} x={x} y={y} fontSize={6 + t * 5} fontStyle="italic" fill="#fff1d6">{lettres[i % lettres.length]}</text>
        : <circle key={i} className="mw__scintille" style={{ '--d': `${(t * 5).toFixed(2)}s` } as CSSProperties} cx={x} cy={y} r={.8 + t * 1.2} fill="#fff6e6" />)}
    </Couche>
    <Couche z={14}>
      <defs><filter id={`${id}g`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      <g stroke="#f0c48f" strokeWidth=".9" strokeOpacity=".75" fill="none" className="mw__trace">
        <path d={chemin} pathLength={1} />
        {BARBES.map(([x1, y1, x2, y2], i) => <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} pathLength={1} style={{ '--d': `${(.35 + i * .12).toFixed(2)}s` } as CSSProperties} />)}
      </g>
      <g filter={`url(#${id}g)`}>
        {[...PLUME, ...BARBES.map(([, , x, y]) => [x, y] as [number, number])].map(([x, y], i) => <circle key={i} className="mw__scintille" style={{ '--d': `${(i * .37).toFixed(2)}s` } as CSSProperties} cx={x} cy={y} r={i === 5 ? 3.4 : 2} fill={i === 5 ? '#ffe2b4' : '#fff6e6'} />)}
      </g>
    </Couche>
    <Couche>
      <defs><linearGradient id={`${id}cadre`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f1d38" /><stop offset="1" stopColor="#070d1c" /></linearGradient></defs>
      <path d={`${SILHOUETTE}M22 44H298V372Q298 382 288 382H32Q22 382 22 372Z`} fillRule="evenodd" fill={`url(#${id}cadre)`} />
      <path d="M22 44H298V372Q298 382 288 382H32Q22 382 22 372Z" fill="none" stroke="#d89a5c" strokeWidth="1.2" />
      <Soudures id={id} />
      <text x="160" y="414" textAnchor="middle" className="mw__serif" fontStyle="italic" fontWeight="700" fontSize="28" fill="#f1e7d0">Philamots</text>
      <text x="160" y="432" textAnchor="middle" className="mw__etroit" fontSize="8" letterSpacing="3" fill="#d89a5c">LA CONSTELLATION DES MOTS · 5 TIMBRES</text>
    </Couche>
  </>;
}

// ── 4. Le Cristal : un sachet transparent et irisé, les timbres à l'intérieur ──

function Cristal({ id }: { id: string }) {
  const couleurs = ['#3c7a66', '#b0404b', '#75519a', '#2c5596'];
  return <>
    <Couche z={34}>
      <path d={SILHOUETTE} fill="#081226" fillOpacity=".92" />
      <path d={SILHOUETTE} fill="none" stroke="#9fc3ff" strokeOpacity=".15" strokeWidth="2" />
    </Couche>
    <Couche z={18} className="mw__contenu">
      {couleurs.map((c, i) => <g key={c} transform={`translate(${72 + i * 3} ${108 - i * 3}) rotate(${(i - 1.5) * 3.5} 88 110)`}><PetitTimbre l={176} h={222} encre={c} lettre={'AMOR'[i]} /></g>)}
      <g transform="translate(84 96) rotate(-2 88 110)">
        <PetitTimbre l={152} h={192} encre="#1f3f76" lettre="P" />
        <text x="76" y="176" textAnchor="middle" className="mw__etroit" fontWeight="600" fontSize="15" letterSpacing="2" fill="#f7eed9">PALIMPSESTE</text>
      </g>
    </Couche>
    <Couche className="mw__film">
      <defs><linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".92" /><stop offset="1" stopColor="#e9f1ff" stopOpacity=".92" /></linearGradient></defs>
      <path d={SILHOUETTE} fill="#dff0ff" fillOpacity=".05" />
      {[[40, .12], [58, .05], [250, .09], [268, .04]].map(([x, o]) => <path key={x} d={`M${x} 34C${x + 6} 160 ${x - 8} 300 ${x + 4} 438`} fill="none" stroke="#fff" strokeOpacity={o} strokeWidth="6" />)}
      <text x="160" y="72" textAnchor="middle" className="mw__etroit" fontWeight="600" fontSize="17" letterSpacing="9" fill={`url(#${id}p)`}>PHILAMOTS</text>
      <line x1="120" y1="84" x2="200" y2="84" stroke="#fff" strokeOpacity=".7" />
      <rect x="0" y="392" width="320" height="42" fill="#fff" fillOpacity=".9" />
      <text x="160" y="418" textAnchor="middle" className="mw__etroit" fontSize="11" letterSpacing="4" fill="#14284d">5 TIMBRES · ÉDITION CRISTAL</text>
      <Soudures id={id} />
    </Couche>
  </>;
}

// ── 5. Le Cuivre repoussé : une vraie lumière suit la souris ───────────────

function Cuivre({ id }: { id: string }) {
  const lumiere = <fePointLight className="mw__lumiere" x="160" y="120" z="170" />;
  return <Couche>
    <defs>
      <clipPath id={`${id}s`}><path d={SILHOUETTE} /></clipPath>
      <linearGradient id={`${id}plaque`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a4f22" /><stop offset=".5" stopColor="#b8733c" /><stop offset="1" stopColor="#6e3a14" /></linearGradient>
      <filter id={`${id}bross`} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="2" seed="4" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .8  0 0 0 .18 0" /></filter>
      <filter id={`${id}lum`} x="0" y="0" width="100%" height="100%">
        <feDiffuseLighting in="SourceAlpha" surfaceScale="0" diffuseConstant="1.25" lightingColor="#fff" result="d">{lumiere}</feDiffuseLighting>
        <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.1" />
      </filter>
      <filter id={`${id}rel`} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="h" />
        <feDiffuseLighting in="h" surfaceScale="4.5" diffuseConstant="1.15" lightingColor="#fff" result="d">{lumiere}</feDiffuseLighting>
        <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.25" result="c" />
        <feSpecularLighting in="h" surfaceScale="4.5" specularConstant="1.3" specularExponent="24" lightingColor="#ffe7c4" result="s">{lumiere}</feSpecularLighting>
        <feComposite in="s" in2="SourceAlpha" operator="in" result="s2" />
        <feComposite in="c" in2="s2" operator="arithmetic" k2="1" k3="1" />
      </filter>
    </defs>
    <g clipPath={`url(#${id}s)`}>
      <g filter={`url(#${id}lum)`}><rect width="320" height="470" fill={`url(#${id}plaque)`} /></g>
      <rect width="320" height="470" filter={`url(#${id}bross)`} />
    </g>
    <g filter={`url(#${id}rel)`} fill="#c98c55" stroke="#c98c55">
      <rect x="18" y="44" width="284" height="382" fill="none" strokeWidth="3" />
      <rect x="26" y="52" width="268" height="366" fill="none" strokeWidth="1.2" />
      <path d={rosace(112, 96, 35, 44, 160, 246)} fill="none" strokeWidth="1.1" />
      <circle cx="160" cy="246" r="118" fill="none" strokeWidth="2.4" />
      <circle cx="160" cy="246" r="42" stroke="none" />
      <text x="160" y="104" textAnchor="middle" className="mw__serif" fontWeight="900" fontSize="40" letterSpacing="2" stroke="none">PHILAMOTS</text>
      <text x="160" y="398" textAnchor="middle" className="mw__etroit" fontSize="13" fontWeight="600" letterSpacing="6" stroke="none">CINQ TIMBRES</text>
    </g>
    <text x="160" y="262" textAnchor="middle" className="mw__serif" fontStyle="italic" fontWeight="700" fontSize="46" fill="#4a230a" fillOpacity=".55">P</text>
    <Soudures id={id} opacite={.9} />
  </Couche>;
}

// ── La page ────────────────────────────────────────────────────────────────

type Maquette = { nom: string; idee: string; wahou: string; dessin: (id: string) => ReactNode };
const MAQUETTES: Maquette[] = [
  { nom: 'Le Diorama', idee: 'Par une arche, un paysage en couches : ciel, lune en cachet de cire, toits, une ville faite des lettres de PHILAMOTS, des timbres qui flottent.', wahou: 'Vraie profondeur : chaque couche bouge à sa distance quand on l’incline.', dessin: (id) => <Diorama id={id} /> },
  { nom: 'L’Encre vivante', idee: 'Papier marbré à la cuve, nuit, cuivre et crème, et une étiquette « Philamots, encre originale ».', wahou: 'L’encre ondule en direct, lentement, sans jamais se répéter.', dessin: (id) => <EncreVivante id={id} /> },
  { nom: 'La Constellation', idee: 'Un ciel profond, des étoiles dont certaines sont des lettres, et une plume tracée d’étoile en étoile.', wahou: 'Trois plans d’étoiles en profondeur, qui scintillent ; la plume se dessine.', dessin: (id) => <Constellation id={id} /> },
  { nom: 'Le Cristal', idee: 'Un sachet transparent et irisé : on voit les timbres qui attendent à l’intérieur.', wahou: 'Le film holographique change de couleur ; les timbres flottent derrière.', dessin: (id) => <Cristal id={id} /> },
  { nom: 'Le Cuivre repoussé', idee: 'Un paquet de cuivre massif, rosace, cadre et nom en relief, comme une plaque gravée.', wahou: 'Une vraie lumière suit la souris et fait briller chaque relief.', dessin: (id) => <Cuivre id={id} /> },
];

function survoler(e: PointerEvent<HTMLDivElement>): void {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.dataset.px = String(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  e.currentTarget.dataset.py = String(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)));
}
function quitter(e: PointerEvent<HTMLDivElement>): void { delete e.currentTarget.dataset.px; delete e.currentTarget.dataset.py; }

function MaquettePaquet({ maquette, numero }: { maquette: Maquette; numero: number }) {
  const id = useId().replaceAll(':', '');
  return <figure className="maquettes__carte">
    <div className="mw" data-i={numero} style={{ '--masque': MASQUE } as CSSProperties} onPointerMove={survoler} onPointerLeave={quitter}>
      <div className="mw__incline">{maquette.dessin(id)}<div className="mw__reflet" /></div>
    </div>
    <figcaption><b>{numero}. {maquette.nom}</b><span>{maquette.idee}</span><em>✦ {maquette.wahou}</em></figcaption>
  </figure>;
}

export function EssaiPaquets() {
  // Une seule boucle pour tous les paquets : inclinaison (souris, ou balancement au repos) et position de la lumière.
  useEffect(() => {
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const etats = new WeakMap<HTMLElement, { rx: number; ry: number; mx: number; my: number }>();
    let cadre = 0;
    const boucle = (t: number): void => {
      document.querySelectorAll<HTMLElement>('.mw').forEach((el) => {
        const i = Number(el.dataset.i);
        const e = etats.get(el) ?? { rx: 0, ry: 0, mx: .5, my: .5 };
        const survol = el.dataset.px !== undefined;
        const px = survol ? Number(el.dataset.px) : .5 + (reduit ? 0 : Math.sin(t / 1900 + i * 1.3) * .42);
        const py = survol ? Number(el.dataset.py) : .5 + (reduit ? 0 : Math.cos(t / 2600 + i) * .3);
        const k = survol ? .14 : .05;
        e.ry += ((px - .5) * 34 - e.ry) * k; e.rx += ((.5 - py) * 22 - e.rx) * k;
        e.mx += (px - e.mx) * k; e.my += (py - e.my) * k;
        etats.set(el, e);
        el.style.setProperty('--rx', `${e.rx.toFixed(2)}deg`); el.style.setProperty('--ry', `${e.ry.toFixed(2)}deg`);
        el.style.setProperty('--mx', e.mx.toFixed(3)); el.style.setProperty('--my', e.my.toFixed(3));
        el.querySelectorAll('.mw__lumiere').forEach((l) => { l.setAttribute('x', (e.mx * 320).toFixed(1)); l.setAttribute('y', (e.my * 470).toFixed(1)); });
      });
      cadre = requestAnimationFrame(boucle);
    };
    cadre = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(cadre);
  }, []);

  return (
    <main className="ecran ecran--large accueil-refonte maquettes">
      <FondAnime />
      <Entete surtitre="Développement · maquettes, série 2" titre="Cinq paquets sans limite">Survole un paquet : il s’incline, sa lumière et ses profondeurs bougent. Au repos, ils se balancent.</Entete>
      <div className="maquettes__grille">{MAQUETTES.map((m, i) => <MaquettePaquet key={m.nom} maquette={m} numero={i + 1} />)}</div>
    </main>
  );
}
