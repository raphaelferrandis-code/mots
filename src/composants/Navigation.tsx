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
  { route: { ecran: 'classement' }, nom: 'Classement', actifPour: ['classement'], icone: <svg viewBox="0 0 24 24" {...trait}><path d="M3 20V11h6v9M9 20V5h6v15M15 20v-6h6v6M2 20h20" /></svg> },
  { route: { ecran: 'marche' }, nom: 'Marché', actifPour: ['marche'], icone: <svg viewBox="0 0 24 24" {...trait}><path d="M4 4h7l9 9-7 7-9-9z" /><circle cx="8.5" cy="8.5" r="1.5" /></svg> },
  { route: { ecran: 'profil' }, nom: 'Profil', actifPour: ['profil'], icone: <svg viewBox="0 0 24 24" {...trait}><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg> },
];

export function Navigation({ ecran, encre }: { ecran: Route['ecran']; encre: number | null }) {
  return (
    <header className="entete-application">
      <a className="marque" href={lien({ ecran: 'accueil' })} aria-label={`${SITE.nom} — accueil`}>
        <img src={`${import.meta.env.BASE_URL}identite/philamots-clair.svg`} alt="" className="marque__logo" />
      </a>
      <nav className="navigation" aria-label="Navigation principale">
        <ul className="navigation__liste">
          {ONGLETS.map((onglet) => (
            <li key={onglet.nom}>
              <a className={`navigation__lien${onglet.route.ecran === 'profil' ? ' lien-profil' : ''}`} href={lien(onglet.route)} aria-label={onglet.nom} aria-current={onglet.actifPour.includes(ecran) ? 'page' : undefined}>
                <span className="navigation__icone" aria-hidden="true">{onglet.icone}</span>
                <span className="navigation__nom-long">{onglet.nom}</span>
                <span className="navigation__nom-court">{onglet.nom === 'Collection' ? 'Album' : onglet.nom === 'Classement' ? 'Rangs' : onglet.nom}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="navigation__personnel">
      <a className="lien-compte" href={lien({ ecran: 'compte' })} aria-label="Mon compte — inscription et connexion" title="Mon compte" aria-current={ecran === 'compte' ? 'page' : undefined}><svg viewBox="0 0 24 24" {...trait} aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg></a>
      <a className="lien-reglages" href={lien({ ecran: 'reglages' })} aria-label="Réglages" title="Réglages" aria-current={ecran === 'reglages' || ecran === 'confidentialite' ? 'page' : undefined}><svg viewBox="0 0 24 24" {...trait} aria-hidden="true" focusable="false"><path d="m9.5 3-.6 2.3-1.7 1-2.3-.6-2.5 4.3 1.7 1.7v2l-1.7 1.7 2.5 4.3 2.3-.6 1.7 1 .6 2.3h5l.6-2.3 1.7-1 2.3.6 2.5-4.3-1.7-1.7v-2l1.7-1.7-2.5-4.3-2.3.6-1.7-1-.6-2.3z" transform="translate(0 -1)" /><circle cx="12" cy="12" r="3" /></svg></a>
      <a className="lien-formules" href={lien({ ecran: 'formules' })} aria-label="Les formules" title="Les formules" aria-current={ecran === 'formules' ? 'page' : undefined}>
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><defs><linearGradient id="navigation-eclat" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe1a1" /><stop offset=".5" stopColor="#e1b7ff" /><stop offset="1" stopColor="#8ce4eb" /></linearGradient></defs><path d="m15 4 3.5 8.5L27 16l-8.5 3.5L15 28l-3.5-8.5L3 16l8.5-3.5Z" fill="url(#navigation-eclat)" /><path d="m26 2 1.3 3.7L31 7l-3.7 1.3L26 12l-1.3-3.7L21 7l3.7-1.3Z" fill="#f9e9bd" /></svg>
      </a>
      </div>
      <a className="reserve-encre" href={lien({ ecran: 'paquet' })} aria-label={encre === null ? 'Chargement de l’Encre' : `${encre.toLocaleString('fr-FR')} Encre — voir les paquets`}>
        <Icone nom="encre" />
        <span><strong>{encre === null ? '…' : encre.toLocaleString('fr-FR')}</strong> Encre</span>
      </a>
    </header>
  );
}
