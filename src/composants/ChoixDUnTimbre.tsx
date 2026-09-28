// Choisir un de ses timbres (le vendre au marché, le proposer en échange) : une recherche et la grille de l'album, les
// doubles d'abord (ce qu'on cède le plus volontiers), puis les plus rares. Un toucher choisit.

import { useDeferredValue, useMemo, useState } from 'react';
import { correspond, ordreFrancais } from '../jeu/rangement.ts';
import { meilleureFinition } from '../jeu/sauvegarde.ts';
import type { CartePossedee } from '../jeu/sauvegarde.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex } from '../partage/types.ts';
import { Carte } from './carte/Carte.tsx';

const PAR_PAGE = 24;
const exemplaires = (p: CartePossedee | undefined): number => Object.values(p?.finitions ?? {}).reduce((n, x) => n + (x ?? 0), 0);

export function ChoixDUnTimbre({ cartes, possedees, action, onChoisir }: {
  cartes: readonly CarteIndex[]; possedees: Readonly<Record<string, CartePossedee>>; action: string; onChoisir: (carte: CarteIndex) => void;
}) {
  const [recherche, setRecherche] = useState('');
  const cherche = useDeferredValue(recherche);
  const [pages, setPages] = useState(1);
  const liste = useMemo(() => {
    const garder = correspond({ recherche: cherche });
    return cartes.filter((c) => exemplaires(possedees[c.id]) > 0 && garder(c))
      .sort((a, b) => Number(exemplaires(possedees[b.id]) > 1) - Number(exemplaires(possedees[a.id]) > 1)
        || RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete) || ordreFrancais(a.mot, b.mot));
  }, [cartes, possedees, cherche]);
  const doubles = liste.filter((c) => exemplaires(possedees[c.id]) > 1).length;

  return (
    <div className="choix-timbre">
      <input type="search" placeholder="Chercher un mot de ton album…" value={recherche} aria-label="Chercher un mot de ton album"
        onChange={(e) => { setRecherche(e.target.value); setPages(1); }} />
      <p className="texte-doux petit">
        {liste.length === 0 ? 'Aucun timbre ne correspond.' : `${liste.length.toLocaleString('fr-FR')} timbre${liste.length > 1 ? 's' : ''}${doubles > 0 ? `, tes doubles d’abord (${doubles})` : ''}.`}
      </p>
      <ul className="choix-timbre__grille">
        {liste.slice(0, pages * PAR_PAGE).map((carte) => {
          const possedee = possedees[carte.id];
          const n = exemplaires(possedee);
          return (
            <li key={carte.id}>
              <Carte carte={carte} finition={meilleureFinition(possedee)} obtenuLe={possedee.obtenueLe} onChoisir={() => onChoisir(carte)} action={action} />
              {n > 1 && <span className="choix-timbre__double" aria-hidden="true">×{n}</span>}
            </li>
          );
        })}
      </ul>
      {liste.length > pages * PAR_PAGE && <button type="button" className="bouton bouton--discret" onClick={() => setPages((p) => p + 1)}>Afficher plus de timbres</button>}
    </div>
  );
}
