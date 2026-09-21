import { useId } from 'react';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import './paquet.css';

// Un dessin vectoriel commun à l'accueil et à l'ouverture. Les groupes séparés
// permettent d'animer le sceau et la bande sans déformer le reste du paquet.
export function PaquetScelle() {
  const id = useId();
  return (
    <svg className="paquet-scelle" viewBox="0 0 320 440" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-papier`} x2="1" y2="1">
          <stop stopColor="#37688c" /><stop offset="0.45" stopColor="#153b5b" /><stop offset="1" stopColor="#0c243b" />
        </linearGradient>
        <linearGradient id={`${id}-cuivre`}><stop stopColor="#aa592e" /><stop offset="0.45" stopColor="#ffbf7d" /><stop offset="1" stopColor="#d77642" /></linearGradient>
        <pattern id={`${id}-grain`} width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 1h4M1 0v4" stroke="#b1d0e9" strokeWidth="0.3" opacity="0.12" /></pattern>
        <pattern id={`${id}-pli`} width="7" height="8" patternUnits="userSpaceOnUse"><path d="M2 0v8" stroke="#8cabc3" opacity="0.35" /></pattern>
      </defs>
      <g className="paquet-scelle__corps">
        <path d={`M22 20H298V418${Array.from({ length: 39 }, (_, i) => `l-7 ${i % 2 === 0 ? 7 : -7}`).join('')}L22 418Z`} fill={`url(#${id}-papier)`} stroke="#6385a0" />
        <path d="M34 47h252v350H34Z" fill="none" stroke="#a9c5dc" strokeOpacity="0.45" />
        <path d="M42 55h236v334H42Z" fill="none" stroke="#a9c5dc" strokeOpacity="0.2" />
        <rect x="23" y="22" width="274" height="394" fill={`url(#${id}-grain)`} />
        <rect x="23" y="402" width="274" height="16" fill={`url(#${id}-pli)`} />
        <text x="160" y="82" textAnchor="middle" fill="#bdd2e3" fontSize="10" letterSpacing="3">LE BUREAU DU COLLECTIONNEUR</text>
        <text x="160" y="145" textAnchor="middle" fill="#f2e9d7" fontFamily="var(--police-serif)" fontSize="55" fontWeight="700" letterSpacing="-2">MOTS</text>
        <g fill="none" stroke="#a2c3dc" strokeWidth="0.65" opacity="0.6">
          {Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx="160" cy="242" rx="67" ry="29" transform={`rotate(${i * 15} 160 242)`} />)}
          <circle cx="160" cy="242" r="76" /><circle cx="160" cy="242" r="81" strokeDasharray="1 5" />
          <path d="M61 170h198M61 337h198" />
        </g>
        <text x="160" y="250" textAnchor="middle" fill="#f4dfbf" fontFamily="var(--police-serif)" fontSize="23" fontStyle="italic">À découvrir</text>
        <text x="160" y="363" textAnchor="middle" fill="#f2e9d7" fontSize="16" letterSpacing="4">{EQUILIBRAGE.paquets.emplacements.length} TIMBRES</text>
        <text x="160" y="382" textAnchor="middle" fill="#bdd2e3" fontSize="8" letterSpacing="2.5">DES MOTS À COLLECTIONNER</text>
      </g>
      <g className="paquet-scelle__bande">
        <rect x="19" y="16" width="282" height="31" rx="2" fill={`url(#${id}-cuivre)`} />
        <path d="M28 40h264" stroke="#653c2a" strokeDasharray="3 4" opacity="0.65" />
        <text x="160" y="33" textAnchor="middle" fill="#382920" fontSize="9" fontWeight="700" letterSpacing="3">MOTS · ÉDITION ORIGINALE</text>
        <path d="m286 25 7 5-7 5" fill="none" stroke="#382920" />
      </g>
      <g className="paquet-scelle__sceau">
        <circle cx="270" cy="58" r="23" fill={`url(#${id}-cuivre)`} stroke="#e8b47d" />
        <circle cx="270" cy="58" r="18" fill="none" stroke="#714127" />
        <text x="270" y="65" textAnchor="middle" fontFamily="var(--police-serif)" fontSize="21" fontWeight="700" fill="#50311f">M</text>
      </g>
    </svg>
  );
}
