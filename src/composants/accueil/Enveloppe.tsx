import { useId } from 'react';
import { SITE } from '../../config/site.ts';

// Illustration autonome, recolorable dans theme.css. Aucun texte figé dans une image.
export function Enveloppe() {
  const id = useId();
  return (
    <svg className="enveloppe" viewBox="0 0 600 380" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-papier`} x2="0.2" y2="1">
          <stop stopColor="var(--enveloppe-clair)" /><stop offset="1" stopColor="var(--enveloppe-fond)" />
        </linearGradient>
        <linearGradient id={`${id}-rabat`} x2="0" y2="1">
          <stop stopColor="var(--enveloppe-clair)" /><stop offset="1" stopColor="var(--enveloppe-ombre)" />
        </linearGradient>
        <pattern id={`${id}-bord`} width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
          <rect width="60" height="60" fill="var(--enveloppe-fond)" /><rect width="15" height="60" fill="#bcccdb" /><rect x="30" width="15" height="60" fill="#c66843" />
        </pattern>
        <pattern id={`${id}-grain`} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="#bed3e8" opacity="0.1" /><circle cx="4" cy="3" r="0.5" fill="#081526" opacity="0.2" />
        </pattern>
      </defs>
      <rect x="10" y="20" width="580" height="340" rx="3" fill={`url(#${id}-bord)`} />
      <rect x="20" y="30" width="560" height="320" fill={`url(#${id}-papier)`} />
      <path d="M20 30 304 228 580 30V350H20Z" fill="var(--enveloppe-fond)" />
      <path d="m20 350 243-182q37-27 74 0l243 182" fill={`url(#${id}-papier)`} stroke="#7798b3" strokeOpacity="0.25" />
      <path d="M20 32 278 223q22 17 44 0L580 32" fill="#071425" opacity="0.4" transform="translate(0 4)" />
      <path d="M20 30 278 216q22 17 44 0L580 30Z" fill={`url(#${id}-rabat)`} stroke="#90acc7" strokeOpacity="0.35" />
      <rect x="20" y="30" width="560" height="320" fill={`url(#${id}-grain)`} />
      <g fill="none" stroke="#acc6df" opacity="0.8">
        <circle cx="300" cy="233" r="48" /><circle cx="300" cy="233" r="40" strokeWidth="0.7" />
        <path d="M342 221c16-10 25 10 41 0s25 10 41 0 25 10 41 0M345 233c16-10 25 10 41 0s25 10 41 0 25 10 41 0M342 245c16-10 25 10 41 0s25 10 41 0 25 10 41 0" />
      </g>
      <text x="300" y="239" textAnchor="middle" fill="#c1d8ed" fontFamily="var(--police-serif)" fontSize="15" fontWeight="700" letterSpacing="0.5">{SITE.nomEnCapitales}</text>
    </svg>
  );
}
