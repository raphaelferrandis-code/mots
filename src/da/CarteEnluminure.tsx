// Piste 1 — « Enluminure » : la carte est une entrée de manuscrit. L'illustration est la lettrine,
// c'est-à-dire la première lettre du mot elle-même, posée sur un fond ornemental propre à chaque mot.

import { useId } from 'react';
import type { CSSProperties } from 'react';
import { defenseEnJeu } from '../config/equilibrage.ts';
import type { CarteIndex } from '../partage/types.ts';
import { ABREVIATION, NIVEAU, ORIGINE_EN_TOUTES_LETTRES, couleursDe, enChiffresRomains, entier, hasardDe } from './outils.ts';

// Trois familles d'ornements ; le mot décide laquelle, et à quelle échelle.
function Ornement({ id, motif, pas }: { id: string; motif: number; pas: number }) {
  const m = pas / 2;
  return (
    <pattern id={id} width={pas} height={pas} patternUnits="userSpaceOnUse">
      {motif === 0 && (<><circle cx={m} cy={0} r={m * 0.62} /><circle cx={m} cy={pas} r={m * 0.62} /><circle cx={0} cy={m} r={m * 0.62} /><circle cx={pas} cy={m} r={m * 0.62} /></>)}
      {motif === 1 && (<><path d={`M${m} 0 L${pas} ${m} L${m} ${pas} L0 ${m} Z`} /><circle cx={m} cy={m} r={m * 0.22} /></>)}
      {motif === 2 && (<><path d={`M0 ${m} Q${m / 2} 0 ${m} ${m} T${pas} ${m}`} /><path d={`M0 ${pas} Q${m / 2} ${m} ${m} ${pas} T${pas} ${pas}`} /><circle cx={m} cy={m * 0.35} r={m * 0.16} /></>)}
    </pattern>
  );
}

export function CarteEnluminure({ carte }: { carte: CarteIndex }) {
  const id = useId();
  const hasard = hasardDe(carte.id);
  const motif = entier(hasard, 0, 2);
  const pas = entier(hasard, 9, 15);
  const [pigment] = couleursDe(carte.faction);

  const initiale = carte.mot.charAt(0).toUpperCase();
  const suite = carte.mot.slice(1);
  const tailleDeLaSuite = Math.min(12.5, 86 / Math.max(1, suite.length));

  return (
    <article className="enl" data-niveau={NIVEAU[carte.rarete]} style={{ '--pigment': pigment } as CSSProperties} aria-label={`${carte.mot}, ${carte.rarete}`}>
      <div className="enl__cadre">
        <header className="enl__rubrique">{carte.rarete}</header>

        <div className="enl__entree">
          <div className="enl__lettrine" aria-hidden="true">
            <svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice">
              <defs><Ornement id={id} motif={motif} pas={pas} /></defs>
              <rect width="60" height="60" className="enl__fond" />
              <rect width="60" height="60" fill={`url(#${id})`} className="enl__ornement" />
              <rect x="2.5" y="2.5" width="55" height="55" className="enl__filet" />
            </svg>
            <span>{initiale}</span>
          </div>
          <div className="enl__mot">
            <span className="enl__suite" style={{ fontSize: `${tailleDeLaSuite}cqi` }}>{suite}</span>
            <span className="enl__nature">{ABREVIATION[carte.type]} — {ORIGINE_EN_TOUTES_LETTRES[carte.faction] ?? carte.faction}</span>
          </div>
        </div>

        <p className="enl__definition" lang="fr">{carte.definition}</p>

        <footer className="enl__pied">
          <span><small>Attaque</small>{enChiffresRomains(carte.attaque)}</span>
          <span className="enl__fleuron" aria-hidden="true">❦</span>
          <span><small>Défense</small>{enChiffresRomains(defenseEnJeu(carte.defense, carte.rarete))}</span>
        </footer>
      </div>
    </article>
  );
}
