// Piste 3 — « Passeport » : les mots sont des voyageurs. Chaque carte est le papier d'identité d'un mot entré
// en français : tampon de sa langue d'origine, date d'entrée (sa première apparition connue), rosace de
// sécurité unique comme sur un billet de banque, et ligne « lisible par une machine » en bas.

import { useId } from 'react';
import type { CSSProperties } from 'react';
import { defenseEnJeu } from '../config/equilibrage.ts';
import type { CarteIndex } from '../partage/types.ts';
import { NIVEAU, NOM_COURT, couleursDe, entier, entre, hasardDe, ligneMachine } from './outils.ts';

// Rosace de guillochis : plusieurs courbes fermées légèrement décalées, comme sur les billets de banque.
function rosace(idCarte: string, courbes: number): string[] {
  const hasard = hasardDe(idCarte);
  const k1 = entier(hasard, 5, 11);
  const k2 = entier(hasard, 3, 9) * 2 + 1;
  const a = entre(hasard, 5, 9);
  const b = entre(hasard, 2, 5);
  const chemins: string[] = [];
  for (let j = 0; j < courbes; j++) {
    const phase = (j / courbes) * Math.PI * 2;
    let d = '';
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * Math.PI * 2;
      const r = 17 + a * Math.sin(k1 * t + phase) + b * Math.cos(k2 * t - phase);
      d += `${i === 0 ? 'M' : 'L'}${(30 + r * Math.cos(t)).toFixed(2)} ${(30 + r * Math.sin(t)).toFixed(2)}`;
    }
    chemins.push(`${d}Z`);
  }
  return chemins;
}

function vagues(idCarte: string): string[] {
  const hasard = hasardDe(`${idCarte}-fond`);
  const frequence = entre(hasard, 0.12, 0.22);
  const amplitude = entre(hasard, 2, 4.5);
  return Array.from({ length: 30 }, (_, ligne) => {
    let d = '';
    for (let x = 0; x <= 100; x += 2) {
      const y = ligne * 5 - 4 + amplitude * Math.sin(x * frequence + ligne * 0.55);
      d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(2)}`;
    }
    return d;
  });
}

const CODE_RARETE = { 'Commune': 'COM', 'Peu commune': 'PEU', 'Rare': 'RAR', 'Épique': 'EPI', 'Légendaire': 'LEG' } as const;

export function CartePasseport({ carte, attestation }: { carte: CarteIndex; attestation?: string }) {
  const id = useId();
  const niveau = NIVEAU[carte.rarete];
  const [encre] = couleursDe(carte.faction);
  const hasard = hasardDe(`${carte.id}-tampon`);
  const rotation = entre(hasard, -19, 14);
  const numero = Math.floor(hasardDe(carte.id)() * 0xffffff).toString(16).toUpperCase().padStart(6, '0');
  const defense = defenseEnJeu(carte.defense, carte.rarete);
  const annee = attestation?.match(/\d{3,4}/)?.[0] ?? 'XXXX';

  return (
    <article className="pas" data-niveau={niveau} style={{ '--encre-tampon': encre } as CSSProperties} aria-label={`${carte.mot}, ${carte.rarete}`}>
      <svg className="pas__fond" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
        {vagues(carte.id).map((d) => <path key={d.slice(0, 24)} d={d} />)}
      </svg>
      {niveau >= 4 && <div className="pas__hologramme" aria-hidden="true" />}
      {niveau >= 3 && <div className="pas__microtexte" aria-hidden="true">{`${carte.mot} · `.repeat(40)}</div>}

      <header className="pas__entete">
        <span>Passeport des mots</span>
        <span>{carte.rarete}</span>
      </header>

      <div className="pas__corps">
        <svg className="pas__rosace" viewBox="0 0 60 60" aria-hidden="true">
          {rosace(carte.id, niveau >= 4 ? 9 : niveau >= 2 ? 6 : 3).map((d, i) => <path key={i} d={d} />)}
        </svg>
        <dl className="pas__champs">
          <div className="pas__champ pas__champ--nom"><dt>Nom</dt><dd style={{ fontSize: `${Math.min(8.5, 66 / carte.mot.length)}cqi` }}>{carte.mot}</dd></div>
          <div className="pas__champ"><dt>Nature</dt><dd>{carte.type}</dd></div>
          <div className="pas__champ"><dt>Origine</dt><dd>{carte.faction}</dd></div>
          <div className="pas__champ"><dt>Entrée en français</dt><dd>{attestation ?? 'date inconnue'}</dd></div>
        </dl>
      </div>

      <div className="pas__signalement">
        <span>Signalement</span>
        <p lang="fr">{carte.definition}</p>
      </div>

      <div className="pas__valeurs">
        <span><small>Attaque</small>{String(carte.attaque).padStart(2, '0')}</span>
        <span><small>Défense</small>{String(defense).padStart(2, '0')}</span>
      </div>

      <svg className="pas__tampon" viewBox="0 0 100 100" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
        <defs>
          <path id={`${id}c`} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
          <filter id={`${id}f`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={entier(hasard, 1, 90)} />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.4" />
            <feComposite in="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${id}f)`}>
          <circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="42.5" className="pas__tampon-fin" /><circle cx="50" cy="50" r="27" className="pas__tampon-fin" />
          <text className="pas__tampon-tour"><textPath href={`#${id}c`} startOffset="0" textLength="220" lengthAdjust="spacing">{`★ ORIGINE CONTRÔLÉE ★ ${carte.faction.toUpperCase()}`}</textPath></text>
          <text x="50" y="47" textAnchor="middle" className="pas__tampon-centre">{NOM_COURT[carte.faction] ?? carte.faction.toUpperCase()}</text>
          <text x="50" y="59" textAnchor="middle" className="pas__tampon-date">{annee}</text>
        </g>
      </svg>

      <footer className="pas__machine" aria-hidden="true">
        <span>{ligneMachine(['M', 'FRA', carte.mot, carte.type.slice(0, 3), numero], 32)}</span>
        <span>{ligneMachine([`ATT${String(carte.attaque).padStart(2, '0')}`, `DEF${String(defense).padStart(2, '0')}`, CODE_RARETE[carte.rarete], annee], 32)}</span>
      </footer>
    </article>
  );
}
