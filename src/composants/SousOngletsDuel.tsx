import { lien } from '../navigation/routes.ts';
import './sousOngletsDuel.css';

// La rubrique Duel : jouer, composer son deck, voir les classements. L'onglet Duel de la barre du haut
// mène à la page Duel ; ces sous-onglets, en tête des trois pages, donnent le reste.
const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const ICONES_DUEL = {
  duel: <svg viewBox="0 0 24 24" {...trait}><path d="m5 4 10 10" /><path d="m19 4-10 10" /><path d="m4 17 3 3" /><path d="m20 17-3 3" /><path d="m6 15 3 3" /><path d="m18 15-3 3" /></svg>,
  deck: <svg viewBox="0 0 24 24" {...trait}><path d="m12 4 8 4-8 4-8-4z" /><path d="m4 12 8 4 8-4" /><path d="m4 16 8 4 8-4" /></svg>,
  classement: <svg viewBox="0 0 24 24" {...trait}><path d="M3 20V11h6v9M9 20V5h6v15M15 20v-6h6v6M2 20h20" /></svg>,
};

type PageDuel = 'duel' | 'deck' | 'classement';
const RUBRIQUE_DUEL: { ecran: PageDuel; nom: string }[] = [
  { ecran: 'duel', nom: 'Jouer' },
  { ecran: 'deck', nom: 'Deck' },
  { ecran: 'classement', nom: 'Classement' },
];

export function SousOngletsDuel({ actif }: { actif: PageDuel }) {
  return (
    <nav className="sous-onglets" aria-label="Rubrique Duel">
      <div className="sous-onglets__rail">
        {RUBRIQUE_DUEL.map((r) => (
          <a key={r.ecran} className="sous-onglets__lien" href={lien({ ecran: r.ecran })} aria-current={r.ecran === actif ? 'page' : undefined}>
            <span aria-hidden="true">{ICONES_DUEL[r.ecran]}</span>{r.nom}
          </a>
        ))}
      </div>
    </nav>
  );
}
