import { useId } from 'react';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { encresDe } from './carte/decor.ts';
import './conseilsComposition.css';

const REGLES = EQUILIBRAGE.duel;

export function ConseilsComposition() {
  const id = useId();
  const types = [
    { nom: 'Nom' as const, x: 220, y: 60 },
    { nom: 'Adjectif' as const, x: 350, y: 248 },
    { nom: 'Verbe' as const, x: 90, y: 248 },
  ];
  const adverbe = encresDe('Adverbe');

  return <div className="conseils-composition">
    <figure className="cycle-types">
      <figcaption>Avantages de type</figcaption>
      <div className="cycle-types__schema">
        <svg className="cycle-types__triangle" viewBox="0 0 440 330" role="img" aria-labelledby={`${id}-titre ${id}-description`}>
          <title id={`${id}-titre`}>Cycle des types : +{REGLES.bonusDeType} dégâts</title>
          <desc id={`${id}-description`}>Le nom a l’avantage sur l’adjectif, l’adjectif sur le verbe, le verbe sur le nom. Les flèches vont du type avantagé à sa cible.</desc>
          <defs>
            {types.map(({ nom }) => <marker key={nom} id={`${id}-${nom}`} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="m2 2 8 4-8 4" fill="none" stroke={encresDe(nom)[1]} strokeWidth="1.5" />
            </marker>)}
          </defs>
          <g aria-hidden="true">
            <circle cx="220" cy="184" r="111" fill="none" stroke="currentColor" className="cycle-types__orbite" />
            <circle cx="220" cy="184" r="101" fill="none" stroke="currentColor" strokeDasharray="1 9" className="cycle-types__orbite" />
            <g fill="none" strokeWidth="2">
              <path d="M278 77 Q352 112 354 185" stroke={encresDe('Nom')[1]} markerEnd={`url(#${id}-Nom)`} />
              <path d="M294 276 Q220 317 146 276" stroke={encresDe('Adjectif')[1]} markerEnd={`url(#${id}-Adjectif)`} />
              <path d="M86 185 Q88 112 162 77" stroke={encresDe('Verbe')[1]} markerEnd={`url(#${id}-Verbe)`} />
            </g>
            <text x="220" y="184" textAnchor="middle" className="cycle-types__bonus">+{REGLES.bonusDeType}</text>
            <text x="220" y="207" textAnchor="middle" className="cycle-types__mention">DÉGÂTS</text>
            {types.map(({ nom, x, y }) => <g key={nom} transform={`translate(${x} ${y})`}>
              <circle r="54" fill={encresDe(nom)[0]} fillOpacity=".22" stroke={encresDe(nom)[1]} />
              <circle r="47" fill="none" stroke={encresDe(nom)[1]} strokeOpacity=".35" />
              <path d="m0-39 3 4-3 4-3-4Z" fill={encresDe(nom)[1]} />
              <text y="8" textAnchor="middle" fill={encresDe(nom)[2]} className="cycle-types__nom">{nom}</text>
              <path d="M-12 25H12" stroke={encresDe(nom)[1]} strokeOpacity=".65" />
            </g>)}
          </g>
        </svg>
        <div className="cycle-types__neutre">
          <svg viewBox="0 0 124 124" role="img" aria-label="Adverbe : neutre, aucun bonus de type">
            <circle cx="62" cy="62" r="54" fill={adverbe[0]} fillOpacity=".22" stroke={adverbe[1]} />
            <circle cx="62" cy="62" r="47" fill="none" stroke={adverbe[1]} strokeOpacity=".35" />
            <path d="m62 23 3 4-3 4-3-4Z" fill={adverbe[1]} />
            <text x="62" y="70" textAnchor="middle" fill={adverbe[2]} className="cycle-types__nom">Adverbe</text>
          </svg>
          <p><strong>Neutre</strong><span>Aucun bonus de type</span></p>
        </div>
      </div>
    </figure>
    <dl className="conseils-composition__notes">
      <div><dt>Rareté</dt><dd>Les mots rares frappent plus fort et sont moins souvent parés. Les Hors-série privilégient la puissance, mais sont plus faciles à parer.</dd><dd className="conseils-composition__precision">À l’entraînement, la rareté du deck adverse suit celle du tien.</dd></div>
      <div><dt>Origine commune</dt><dd>Deux mots de même origine joués à la suite : <strong>+{REGLES.bonusDeFaction} dégât</strong>, ou <strong>+{REGLES.bonusDePetiteFaction}</strong> pour une petite langue.</dd></div>
      <div><dt>Attaque & parade</dt><dd>Attaque automatique. Une bonne définition du mot adverse divise les dégâts reçus par deux.</dd><dd className="conseils-composition__precision">Sur le timbre : attaque à gauche, défense à droite.</dd></div>
    </dl>
  </div>;
}
