// Piste 2 — « Affiche » : la carte est une affiche typographique. Le mot, en capitales énormes, remplit
// la carte ; des formes géométriques propres à chaque mot jouent avec lui. La rareté se lit à la richesse
// de l'impression : une encre, deux encres, surimpression, puis encre métallisée.

import type { CSSProperties } from 'react';
import { defenseEnJeu } from '../config/equilibrage.ts';
import type { CarteIndex } from '../partage/types.ts';
import { NIVEAU, couleursDe, enLignes, entier, entre, hasardDe } from './outils.ts';

function Formes({ id, niveau }: { id: string; niveau: number }) {
  const hasard = hasardDe(id);
  const cote = hasard() < 0.5 ? -1 : 1;
  const cx = cote < 0 ? entre(hasard, -8, 22) : entre(hasard, 78, 108);
  const cy = entre(hasard, 18, 62);
  const r = entre(hasard, 26, 40);
  const angle = entier(hasard, 0, 3) * 90;
  const px = cote < 0 ? entre(hasard, 55, 80) : entre(hasard, 8, 30);
  const py = entre(hasard, 50, 78);
  const inclinaison = entre(hasard, -32, -14);

  return (
    <>
    {/* Carte Légendaire : le grand disque est imprimé à l'encre irisée, un dégradé animé que le dessin vectoriel ne sait pas faire. */}
    {niveau === 5 && <div className="aff__disque-irise" style={{ left: `${cx - r}%`, top: `${((cy - r) / 140) * 100}%`, width: `${r * 2}%` }} aria-hidden="true" />}
    <svg className="aff__formes" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
      {niveau < 5 && <circle cx={cx} cy={cy} r={r} className="aff__forme-a" />}
      {niveau >= 3 && <path d={`M${px} ${py} h24 a24 24 0 0 1 -24 24 Z`} transform={`rotate(${angle} ${px + 12} ${py + 12})`} className="aff__forme-b" />}
      {niveau >= 4 && (
        <g transform={`rotate(${inclinaison} 50 70)`} className="aff__rayures">
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-20} y={96 + i * 3.4} width={140} height={1.5} />)}
        </g>
      )}
    </svg>
    </>
  );
}

export function CarteAffiche({ carte }: { carte: CarteIndex }) {
  const niveau = NIVEAU[carte.rarete];
  const [a, b] = couleursDe(carte.faction);
  const lignes = enLignes(carte.mot.toUpperCase(), carte.mot.length > 14 ? 6 : 7);
  const plusLongue = Math.max(...lignes.map((l) => l.length));
  const taille = Math.min(lignes.length >= 3 ? 21 : 30, 172 / plusLongue);

  return (
    <article className="aff" data-niveau={niveau} style={{ '--a': a, '--b': b } as CSSProperties} aria-label={`${carte.mot}, ${carte.rarete}`}>
      <Formes id={carte.id} niveau={niveau} />

      <header className="aff__bandeau">
        <span>{carte.type}</span>
        <span>{carte.faction}</span>
      </header>

      <div className="aff__mot" style={{ fontSize: `${taille}cqi` }} aria-hidden="true">
        {lignes.map((ligne) => <span key={ligne}>{ligne}</span>)}
      </div>

      <div className="aff__bas">
        <p className="aff__definition" lang="fr">{carte.definition}</p>
        <footer className="aff__pied">
          <span className="aff__stat">{carte.attaque}<small>att.</small></span>
          <span className="aff__rarete">
            <span aria-hidden="true">{'●'.repeat(niveau)}{'○'.repeat(5 - niveau)}</span>
            {carte.rarete}
          </span>
          <span className="aff__stat">{defenseEnJeu(carte.defense, carte.rarete)}<small>déf.</small></span>
        </footer>
      </div>
    </article>
  );
}
