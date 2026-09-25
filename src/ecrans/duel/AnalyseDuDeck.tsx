// L'analyse du deck (BRIEF-duel.md § 2) : le triangle des types avec la répartition du deck, une phrase qui dit
// sa force et son point faible, et les origines qui peuvent s'enchaîner. Tout vient de jeu/aidesDuDuel.ts.

import { useId } from 'react';
import { ENCRES_DU_TIMBRE } from '../../composants/timbre/Timbre.tsx';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { analyserLeDeck, pluralDe } from '../../jeu/aidesDuDuel.ts';
import type { TaillesDesFactions } from '../../jeu/duel.ts';
import type { CarteIndex, Nature } from '../../partage/types.ts';

const REGLES = EQUILIBRAGE.duel;
// Les sommets du triangle, et les arcs qui vont du type avantagé à sa cible (Nom → Adjectif → Verbe → Nom).
const SOMMETS: Record<Exclude<Nature, 'Adverbe'>, [number, number]> = { Nom: [130, 46], Adjectif: [218, 190], Verbe: [42, 190] };
const ARCS: [Exclude<Nature, 'Adverbe'>, string][] = [
  ['Nom', 'M160 60 Q200 90 210 152'],
  ['Adjectif', 'M184 206 Q130 228 76 206'],
  ['Verbe', 'M52 152 Q62 90 100 60'],
];

export function AnalyseDuDeck({ deck, tailles }: { deck: CarteIndex[]; tailles: TaillesDesFactions }) {
  const id = useId();
  const analyse = analyserLeDeck(deck, tailles, REGLES);
  const n = analyse.parNature;
  const description = `Triangle des types : le nom bat l’adjectif, l’adjectif bat le verbe, le verbe bat le nom, +${REGLES.bonusDeType} dégâts ; l’adverbe est neutre. Ton deck : ${n.Nom} ${pluralDe('Nom', n.Nom)}, ${n.Verbe} ${pluralDe('Verbe', n.Verbe)}, ${n.Adjectif} ${pluralDe('Adjectif', n.Adjectif)}, ${n.Adverbe} ${pluralDe('Adverbe', n.Adverbe)}.`;
  const sommet = (nature: Nature, [x, y]: [number, number], r = 31) => (
    <g key={nature} opacity={n[nature] ? 1 : .45}>
      <circle cx={x} cy={y} r={r} fill={ENCRES_DU_TIMBRE[nature]} fillOpacity={n[nature] ? .32 : .08} stroke={ENCRES_DU_TIMBRE[nature]} strokeWidth="1.3" />
      <text x={x} y={y - 3} textAnchor="middle" dominantBaseline="middle" className="triangle-types__nombre">{n[nature]}</text>
      <text x={x} y={y + 14} textAnchor="middle" className="triangle-types__nature">{nature}</text>
    </g>
  );

  return (
    <section className="analyse-deck" aria-label="Analyse du deck">
      <svg className="triangle-types" viewBox="0 0 290 240" role="img" aria-label={description}>
        <defs>
          {ARCS.map(([nature]) => <marker key={nature} id={`${id}-${nature}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={ENCRES_DU_TIMBRE[nature]} /></marker>)}
        </defs>
        {ARCS.map(([nature, d]) => <path key={nature} d={d} fill="none" stroke={ENCRES_DU_TIMBRE[nature]} strokeWidth="1.6" markerEnd={`url(#${id}-${nature})`} />)}
        <text x="130" y="132" textAnchor="middle" className="triangle-types__bonus">+{REGLES.bonusDeType}</text>
        <text x="130" y="150" textAnchor="middle" className="triangle-types__mention">dégâts</text>
        {(Object.entries(SOMMETS) as [Nature, [number, number]][]).map(([nature, xy]) => sommet(nature, xy))}
        {sommet('Adverbe', [260, 50], 23)}
      </svg>

      <div className="analyse-deck__texte">
        {deck.length === 0 ? <p className="analyse-deck__neutre">Ton deck est vide. Ajoute des timbres depuis ta collection.</p>
          : analyse.dominante ? <>
            <p className="analyse-deck__fort">Tes <b>{analyse.dominante.nombre} {pluralDe(analyse.dominante.nature, 2)}</b> prennent +{REGLES.bonusDeType} contre les {pluralDe(analyse.dominante.forte, 2)}.</p>
            <p className="analyse-deck__faible">Point faible : les <b>{pluralDe(analyse.dominante.faible, 2)}</b> adverses prennent +{REGLES.bonusDeType} contre eux.</p>
          </> : <p className="analyse-deck__fort">Deck équilibré : aucun type adverse ne te met vraiment en difficulté.</p>}
        {analyse.adverbes >= 3 && <p className="analyse-deck__neutre">Tes {analyse.adverbes} adverbes sont neutres : ni bonus ni faiblesse de type.</p>}
      </div>

      {analyse.origines.length > 0 && <div className="analyse-deck__origines">
          <ul className="c-pastilles" aria-label="Origines du deck">
            {analyse.origines.map((o) => o.enchainable
              ? <li key={o.nom} className="c-pastille c-dorure"><span>{o.nom} ×{o.nombre} · +{o.bonus}</span></li>
              : <li key={o.nom} className="c-pastille c-vignette">{o.nom}</li>)}
          </ul>
          <p className="analyse-deck__note">Deux mots de même origine joués à la suite : +{REGLES.bonusDeFaction} dégât, +{REGLES.bonusDePetiteFaction} pour une petite langue. Les origines dorées peuvent s’enchaîner.</p>
      </div>}
    </section>
  );
}
