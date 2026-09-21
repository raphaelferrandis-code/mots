// Piste 3 — « Passeport » : les mots sont des voyageurs. Chaque carte est le papier d'identité d'un mot entré
// en français : tampon de sa langue d'origine, date d'entrée (sa première apparition connue), rosace de
// sécurité unique comme sur un billet de banque, et ligne « lisible par une machine » en bas.

import type { CSSProperties } from 'react';
import { defenseEnJeu } from '../config/equilibrage.ts';
import type { CarteIndex } from '../partage/types.ts';
import { Tampon } from './Tampon.tsx';
import { NIVEAU, anneeDuCachet, couleursDe, entre, hasardDe, ligneMachine, rosaceDeGuillochis } from './outils.ts';

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
  const niveau = NIVEAU[carte.rarete];
  const [encre] = couleursDe(carte.faction);
  const numero = Math.floor(hasardDe(carte.id)() * 0xffffff).toString(16).toUpperCase().padStart(6, '0');
  const defense = defenseEnJeu(carte.defense, carte.rarete);
  const annee = anneeDuCachet(attestation);

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
          {rosaceDeGuillochis(carte.id, niveau >= 4 ? 9 : niveau >= 2 ? 6 : 3).map((d, i) => <path key={i} d={d} />)}
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

      <Tampon idCarte={carte.id} faction={carte.faction} date={annee} className="pas__tampon" />

      <footer className="pas__machine" aria-hidden="true">
        <span>{ligneMachine(['M', 'FRA', carte.mot, carte.type.slice(0, 3), numero], 32)}</span>
        <span>{ligneMachine([`ATT${String(carte.attaque).padStart(2, '0')}`, `DEF${String(defense).padStart(2, '0')}`, CODE_RARETE[carte.rarete], annee], 32)}</span>
      </footer>
    </article>
  );
}
