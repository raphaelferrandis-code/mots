// Les illustrations propres aux timbres Hors-série. Chaque mot du rang ultime a son dessin, en rapport avec
// le record qu'il détient, au lieu du motif calculé des timbres ordinaires. Tout est tracé au trait, comme une
// gravure, dans un carré de 60 de côté. Un timbre Hors-série sans dessin ici garde un motif calculé.
//
// Pour remplacer un dessin par une vraie illustration, il suffit de changer ce que rend sa fonction.

import type { ReactNode } from 'react';
import { valeurDesLettres } from '../../partage/lettres.ts';

const points = (liste: [number, number][]): string => liste.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// Les lettres d'un mot en histogramme : la hauteur de chaque barre est la valeur de la lettre.
function ValeursDesLettres({ mot, total }: { mot: string; total?: boolean }) {
  const lettres = [...mot];
  const pas = Math.min(9, 50 / lettres.length);
  const gauche = 30 - (pas * lettres.length) / 2;
  return (
    <>
      {lettres.map((lettre, i) => {
        const hauteur = valeurDesLettres(lettre) * 2.6 + 1;
        return (
          <g key={i}>
            <rect className="vig-plein" x={gauche + i * pas + pas * 0.12} y={46 - hauteur} width={pas * 0.76} height={hauteur} />
            <text className="vig-texte" x={gauche + i * pas + pas / 2} y={52} fontSize={Math.min(5, pas * 0.9)} textAnchor="middle">{lettre.toUpperCase()}</text>
          </g>
        );
      })}
      <line x1="4" y1="46" x2="56" y2="46" />
      {total && <text className="vig-texte" x="30" y="16" fontSize="11" fontWeight="700" textAnchor="middle">{valeurDesLettres(mot)}</text>}
    </>
  );
}

function arbre(x: number, y: number, longueur: number, angle: number, niveau: number): string {
  if (niveau === 0) return '';
  const x2 = x + longueur * Math.sin(angle);
  const y2 = y - longueur * Math.cos(angle);
  return `M${x.toFixed(1)} ${y.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}${arbre(x2, y2, longueur * 0.73, angle - 0.44, niveau - 1)}${arbre(x2, y2, longueur * 0.73, angle + 0.4, niveau - 1)}`;
}

const coeur = (taille: number): string => {
  let d = '';
  for (let i = 0; i <= 80; i++) {
    const t = (i / 80) * Math.PI * 2;
    const x = 30 + taille * 16 * Math.sin(t) ** 3;
    const y = 29 - taille * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
};

const spirale = (): string => {
  let d = '';
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * Math.PI * 2 * 1.85;
    const r = 24.5 - (i / 200) * 13;
    d += `${i === 0 ? 'M' : 'L'}${(30 + r * Math.cos(t - Math.PI / 2)).toFixed(1)} ${(30 + r * Math.sin(t - Math.PI / 2)).toFixed(1)}`;
  }
  return d;
};

const trace = (ligne: number): [number, number][] => Array.from({ length: 101 }, (_, i) => {
  const x = 5 + i * 0.5;
  const crise = Math.exp(-(((i - 52 - ligne * 4) / 9) ** 2));
  return [x, 14 + ligne * 10.5 + 1.6 * Math.sin(i * (0.55 + ligne * 0.13)) + 0.9 * Math.sin(i * 1.7 + ligne) + crise * 4.2 * Math.sin(i * 1.15)];
});

const etoile = (cx: number, cy: number, r: number): string => points(Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
  const rayon = i % 2 === 0 ? r : r * 0.42;
  return [cx + rayon * Math.cos(a), cy + rayon * Math.sin(a)];
}));

export const VIGNETTES: Partial<Record<string, (id: string) => ReactNode>> = {
  // Le plus long mot : il s'enroule en spirale pour tenir dans le timbre.
  'anticonstitutionnellement-adv': (id) => (
    <>
      <path id={`${id}-spirale`} d={spirale()} className="vig-fin" />
      <text className="vig-texte" fontSize="6.6" fontWeight="700" dy="-1.4"><textPath href={`#${id}-spirale`} startOffset="1%" textLength="196" lengthAdjust="spacing">ANTICONSTITUTIONNELLEMENT</textPath></text>
    </>
  ),
  // Le plus long palindrome : le mot et son reflet, de part et d'autre de son axe.
  'ressasser-verbe': () => (
    <>
      <text className="vig-texte" x="30" y="28" fontSize="8.6" fontWeight="700" textAnchor="middle" letterSpacing="0.5">RESSASSER</text>
      <text className="vig-texte" x="30" y="28" fontSize="8.6" fontWeight="700" textAnchor="middle" letterSpacing="0.5" transform="matrix(-1 0 0 1 60 12)" opacity="0.4">RESSASSER</text>
      <line x1="30" y1="8" x2="30" y2="52" strokeDasharray="1.4 1.4" />
      <path d="M18 47h-9m3 -3l-3 3l3 3M42 47h9m-3 -3l3 3l-3 3" />
    </>
  ),
  // Le plus vieux mot daté.
  'amour-nom': () => (
    <>
      {[1.35, 1.12, 0.9, 0.68, 0.46].map((taille) => <path key={taille} d={coeur(taille)} />)}
      <text className="vig-texte" x="30" y="31" fontSize="6.4" fontWeight="700" textAnchor="middle">842</text>
    </>
  ),
  // Soixante-dix sens : soixante-dix rayons.
  'prendre-verbe': () => (
    <>
      {Array.from({ length: 70 }, (_, i) => {
        const a = (i / 70) * Math.PI * 2;
        const r = 13 + (((i * 37) % 11) / 10) * 12.5;
        return <line key={i} x1={30 + 5.5 * Math.cos(a)} y1={30 + 5.5 * Math.sin(a)} x2={30 + r * Math.cos(a)} y2={30 + r * Math.sin(a)} />;
      })}
      <circle cx="30" cy="30" r="3.2" className="vig-plein" />
    </>
  ),
  // La plus grande famille : un arbre.
  'faire-verbe': () => <path d={arbre(30, 56, 14, 0, 8)} />,
  // Le mot le plus employé : il est partout.
  'être-verbe': () => (
    <>
      {[4, 8, 12, 16, 20, 24].map((r) => <circle key={r} cx="30" cy="30" r={r} />)}
      <circle cx="30" cy="30" r="1.7" className="vig-plein" />
    </>
  ),
  // Le mot aux synonymes les plus nombreux : un marron, entouré de ses synonymes.
  'marron-nom': () => (
    <>
      <path d="M30 17C41 17 46.5 27 43.5 36.5C40.5 45.5 19.5 45.5 16.5 36.5C13.5 27 19 17 30 17Z" />
      <path d="M20 37.5C25.5 42 34.5 42 40 37.5M30 17V12.5M24 22C27 20 33 20 36 22" />
      {Array.from({ length: 23 }, (_, i) => { const a = (i / 23) * Math.PI * 2; return <circle key={i} cx={30 + 25 * Math.cos(a)} cy={30 + 25 * Math.sin(a)} r="0.9" className="vig-plein" />; })}
    </>
  ),
  'psychophysiologique-adj': () => <ValeursDesLettres mot="psychophysiologique" total />,
  'jazzy-adj': () => <ValeursDesLettres mot="jazzy" />,
  // Cinq voyelles en six lettres : un oiseau en pliage.
  'oiseau-nom': () => (
    <>
      <polygon points="12,37 35,30 28,46" />
      <polygon points="23,33.5 37,10 41,31" />
      <polygon points="35,30 50,19 45,31" />
      <path d="M50 19L55 21.5M12 37L4 30L17 33.5M28 46L33 53M23 33.5L35 30" />
    </>
  ),
  // Treize lettres toutes différentes, pour un mot de volcan.
  'pyroclastique-adj': () => (
    <>
      <path d="M5 52L23 25L27 29.5L31 24L35 28.5L38 25L55 52Z" />
      <path d="M30 23C29 15 23 12 17 7M31 22C32 14 33 9 31 3M33 23C35 16 41 13 47 9M14 52L24 36M46 52L37 37" />
      {[[14, 12, 1.1], [22, 5, 0.8], [38, 5, 1], [45, 15, 0.8], [27, 10, 0.7], [41, 20, 0.7], [9, 20, 0.7], [51, 5, 0.9]].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className="vig-plein" />)}
    </>
  ),
  // Le plus long mot composé : le tracé lui-même.
  'électro-encéphalogramme-nom': () => <>{[0, 1, 2, 3].map((ligne) => <polyline key={ligne} points={points(trace(ligne))} />)}</>,
  // Le mot que presque personne ne connaît.
  'lexie-nom': () => (
    <>
      <circle cx="30" cy="30" r="22" strokeDasharray="2 2.2" />
      <text className="vig-texte" x="30" y="41" fontSize="32" fontWeight="700" textAnchor="middle">?</text>
    </>
  ),
  // Un hapax : une seule occurrence, une seule étoile.
  'hapax-nom': () => (
    <>
      <polygon points={etoile(30, 27, 11)} />
      {[[9, 12], [50, 9], [14, 44], [47, 40], [6, 28], [54, 25], [22, 8], [39, 50], [27, 47]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.6" className="vig-plein" />)}
      <text className="vig-texte" x="30" y="53" fontSize="5.5" textAnchor="middle" letterSpacing="1">UNE SEULE FOIS</text>
    </>
  ),
  'mot-nom': () => (
    <>
      <text className="vig-texte" x="30" y="37" fontSize="19" fontStyle="italic" fontWeight="700" textAnchor="middle">mot</text>
      <text className="vig-texte" x="6.5" y="35" fontSize="20" textAnchor="middle">«</text>
      <text className="vig-texte" x="53.5" y="35" fontSize="20" textAnchor="middle">»</text>
      <path d="M12 44H48M18 47.5H42" />
    </>
  ),
  // La maison de tous les autres : un livre ouvert.
  'dictionnaire-nom': () => (
    <>
      <path d="M30 17C24 12.5 13 12.5 6 16V47C13 43.5 24 43.5 30 48C36 43.5 47 43.5 54 47V16C47 12.5 36 12.5 30 17ZM30 17V48" />
      <path d="M10 21.5C15 19.5 21 19.5 26 22M10 27C15 25 21 25 26 27.5M10 32.5C15 30.5 21 30.5 26 33M10 38C15 36 21 36 26 38.5M34 22C39 19.5 45 19.5 50 21.5M34 27.5C39 25 45 25 50 27M34 33C39 30.5 45 30.5 50 32.5M34 38.5C39 36 45 36 50 38" className="vig-fin" />
      <path d="M40 13.5V24L42.5 21.5L45 24V13" />
    </>
  ),
};
