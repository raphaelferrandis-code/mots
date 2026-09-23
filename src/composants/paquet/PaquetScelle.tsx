import { Motif } from '../cosmetiques/Gravures.tsx';
import { usePartie } from '../usePartie.ts';
import { PAQUETS } from '../../jeu/personnalisation.ts';
import { useId } from 'react';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { SITE } from '../../config/site.ts';
import './paquet.css';

// Un dessin vectoriel commun à l'accueil et à l'ouverture. Les groupes séparés
// permettent d'animer le sceau et la bande sans déformer le reste du paquet.
export function PaquetScelle({ modele }: { modele?: string } = {}) {
  const partie = usePartie();
  const choix = modele ?? (partie.etat === 'prete' ? partie.sauvegarde.profil.paquet : 'original');
  const design = PAQUETS.find((p) => p.id === choix) ?? PAQUETS[0];
  const id = useId();
  return (
    <svg className="paquet-scelle" viewBox="0 0 320 440" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-papier`} x2="1" y2="1">
          <stop stopColor={design.clair} /><stop offset="0.45" stopColor={design.fond} /><stop offset="1" stopColor={design.ombre} />
        </linearGradient>
        <linearGradient id={`${id}-cuivre`}><stop stopColor={design.metal} stopOpacity=".6" /><stop offset="0.45" stopColor={design.metal} /><stop offset="1" stopColor={design.metal} stopOpacity=".7" /></linearGradient>
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
        <text x="160" y="143" textAnchor="middle" fill="#f2e9d7" fontFamily="var(--police-serif)" fontSize="38" fontWeight="700" letterSpacing="-1.5">{SITE.nomEnCapitales}</text>
        <g fill="none" stroke="#a2c3dc" strokeWidth="0.65" opacity="0.6">
          {design.motif === 'rosace' && Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx="160" cy="242" rx="67" ry="29" transform={`rotate(${i * 15} 160 242)`} />)}
          {design.motif === 'feuilles' && <g strokeWidth="1.4"><path d="M160 310V178" />{Array.from({ length: 5 }, (_, i) => <g key={i} transform={`translate(160 ${190 + i * 23})`}><path d="M0 15Q-65 5-47-18Q-12-20 0 15ZM0 15Q65 5 47-18Q12-20 0 15Z" /></g>)}</g>}
          {design.motif === 'etoiles' && <g strokeWidth="1.5"><path d="m160 173 14 49 49 20-49 14-14 49-14-49-49-14 49-20Z" /><circle cx="160" cy="242" r="52" strokeDasharray="2 8" />{[[-55,-48],[59,-35],[-47,52],[51,53]].map(([x,y],i)=><path key={i} transform={`translate(${160+x} ${242+y})`} d="M-6 0H6M0-6V6" />)}</g>}
          {design.motif === 'boussole' && <g strokeWidth="1.4"><circle cx="160" cy="242" r="57" /><path d="m160 169 14 59 59 14-59 14-14 59-14-59-59-14 59-14ZM108 190l104 104m0-104L108 294" /><path d="M61 180h20m-20 10h30m148 112h20m-30 10h30" /></g>}
          <circle cx="160" cy="242" r="76" /><circle cx="160" cy="242" r="81" strokeDasharray="1 5" />
          <path d="M61 170h198M61 337h198" />
        </g>
        {['papillon', 'cristal', 'vagues', 'dragon'].includes(design.motif) && <svg x="98" y="180" width="124" height="124" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: design.metal }}><Motif nom={design.motif} /></svg>}
        <text x="160" y="250" textAnchor="middle" fill="#f4dfbf" fontFamily="var(--police-serif)" fontSize="23" fontStyle="italic">{design.motif === 'rosace' ? 'À découvrir' : ''}</text>
        <text x="160" y="363" textAnchor="middle" fill="#f2e9d7" fontSize="16" letterSpacing="4">{EQUILIBRAGE.paquets.emplacements.length} TIMBRES</text>
        <text x="160" y="382" textAnchor="middle" fill="#bdd2e3" fontSize="8" letterSpacing="2.5">DES MOTS À COLLECTIONNER</text>
      </g>
      <g className="paquet-scelle__bande">
        <rect x="19" y="16" width="282" height="31" rx="2" fill={`url(#${id}-cuivre)`} />
        <path d="M28 40h264" stroke="#653c2a" strokeDasharray="3 4" opacity="0.65" />
        <text x="160" y="33" textAnchor="middle" fill="#382920" fontSize="9" fontWeight="700" letterSpacing="2">{SITE.nomEnCapitales} · {design.nom.toLocaleUpperCase('fr')}</text>
        <path d="m286 25 7 5-7 5" fill="none" stroke="#382920" />
      </g>
      <g className="paquet-scelle__sceau">
        <circle cx="270" cy="58" r="23" fill={`url(#${id}-cuivre)`} stroke={design.metal} />
        <circle cx="270" cy="58" r="18" fill="none" stroke="#714127" />
        <text x="270" y="65" textAnchor="middle" fontFamily="var(--police-serif)" fontSize="21" fontWeight="700" fill="#50311f">{SITE.initiale}</text>
      </g>
    </svg>
  );
}
