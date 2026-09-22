import type { ReactNode } from 'react';
import { SITE } from '../config/site.ts';
import { lien } from '../navigation/routes.ts';
import type { Route } from '../navigation/routes.ts';
import { Icone } from './Icone.tsx';
import './navigation.css';

type Onglet = { route: Route; nom: string; icone: ReactNode; actifPour: Route['ecran'][] };

const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ONGLETS: Onglet[] = [
  { route: { ecran: 'accueil' }, nom: 'Accueil', actifPour: ['accueil', 'paquet'], icone: <svg viewBox="0 0 24 24" {...trait}><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></svg> },
  { route: { ecran: 'collection' }, nom: 'Collection', actifPour: ['collection', 'carte'], icone: <svg viewBox="0 0 24 24" {...trait}><rect x="4" y="6" width="11" height="14" rx="2" /><path d="M8 3h10a2 2 0 0 1 2 2v12" /></svg> },
  { route: { ecran: 'deck' }, nom: 'Deck', actifPour: ['deck'], icone: <svg viewBox="0 0 24 24" {...trait}><path d="m12 4 8 4-8 4-8-4z" /><path d="m4 12 8 4 8-4" /><path d="m4 16 8 4 8-4" /></svg> },
  { route: { ecran: 'duel' }, nom: 'Duel', actifPour: ['duel'], icone: <svg viewBox="0 0 24 24" {...trait}><path d="m5 4 10 10" /><path d="m19 4-10 10" /><path d="m4 17 3 3" /><path d="m20 17-3 3" /><path d="m6 15 3 3" /><path d="m18 15-3 3" /></svg> },
  { route: { ecran: 'marche' }, nom: 'Marché', actifPour: ['marche'], icone: <svg viewBox="0 0 24 24" {...trait}><path d="M4 4h7l9 9-7 7-9-9z" /><circle cx="8.5" cy="8.5" r="1.5" /></svg> },
  { route: { ecran: 'reglages' }, nom: 'Réglages', actifPour: ['reglages', 'confidentialite'], icone: <svg viewBox="0 0 24 24" {...trait}><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h2" /><path d="M10 17h10" /><circle cx="8" cy="17" r="2" /></svg> },
];

export function Navigation({ ecran, encre }: { ecran: Route['ecran']; encre: number | null }) {
  return (
    <header className="entete-application">
      <a className="marque" href={lien({ ecran: 'accueil' })} aria-label={`${SITE.nom} — accueil`}>{SITE.nom}</a>
      <nav className="navigation" aria-label="Navigation principale">
        <ul className="navigation__liste">
          {ONGLETS.map((onglet) => (
            <li key={onglet.nom}>
              <a className="navigation__lien" href={lien(onglet.route)} aria-current={onglet.actifPour.includes(ecran) ? 'page' : undefined}>
                <span className="navigation__icone" aria-hidden="true">{onglet.icone}</span>
                <span>{onglet.nom}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <a className="reserve-encre" href={lien({ ecran: 'paquet' })} aria-label={encre === null ? 'Chargement de l’Encre' : `${encre.toLocaleString('fr-FR')} Encre — voir les paquets`}>
        <Icone nom="encre" />
        <span><strong>{encre === null ? '…' : encre.toLocaleString('fr-FR')}</strong> Encre</span>
      </a>
    </header>
  );
}
