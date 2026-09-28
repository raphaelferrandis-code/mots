// Choisir un timbre dans une collection (la sienne pour vendre ou donner, celle d'un ami pour recevoir) : une recherche
// et la grille, comme l'album, avec en tête ce qui compte le plus (ses doubles, ou ce qui manque à son album), marqué
// d'un badge. Un toucher choisit. (Étape 5 des finitions, chantier 7 : le marché et l'échange montrent les timbres.)

import { useDeferredValue, useMemo, useState } from 'react';
import { correspond, ordreFrancais } from '../jeu/rangement.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex, Finition } from '../partage/types.ts';
import { Carte } from './carte/Carte.tsx';
import './choixDUnTimbre.css';

const PAR_PAGE = 24;
export type Exemplaires = Partial<Record<Finition, number>>;
export const nombreDExemplaires = (e: Exemplaires | undefined): number => Object.values(e ?? {}).reduce((n, x) => n + (x ?? 0), 0);
const ORDRE_DES_FINITIONS: Finition[] = ['Holographique', 'Brillante', 'Normale'];
const plusBelleFinition = (e: Exemplaires | undefined): Finition => ORDRE_DES_FINITIONS.find((f) => (e?.[f] ?? 0) > 0) ?? 'Normale';

export function ChoixDUnTimbre({ cartes, collection, dates, action, recherche: invite = 'Chercher un mot…', choisie = null, avant, legende, onChoisir }: {
  cartes: readonly CarteIndex[];
  collection: ReadonlyMap<string, Exemplaires>; // ce que possède celui dont c'est la collection
  dates?: ReadonlyMap<string, number>; // la date d'obtention (oblitération), pour sa propre collection
  action: string;
  recherche?: string;
  choisie?: string | null;
  avant: (carte: CarteIndex) => string | null; // le badge de ce qui passe en tête (null : l'ordre ordinaire)
  legende: (total: number, enTete: number) => string;
  onChoisir: (carte: CarteIndex) => void;
}) {
  const [recherche, setRecherche] = useState('');
  const cherche = useDeferredValue(recherche);
  const [pages, setPages] = useState(1);
  const liste = useMemo(() => {
    const garder = correspond({ recherche: cherche });
    return cartes.filter((c) => nombreDExemplaires(collection.get(c.id)) > 0 && garder(c))
      .map((carte) => ({ carte, badge: avant(carte) }))
      .sort((a, b) => Number(b.badge !== null) - Number(a.badge !== null)
        || RARETES.indexOf(b.carte.rarete) - RARETES.indexOf(a.carte.rarete) || ordreFrancais(a.carte.mot, b.carte.mot));
  }, [cartes, collection, cherche, avant]);
  const enTete = liste.filter((l) => l.badge !== null).length;

  return (
    <div className="choix-timbre">
      <input type="search" placeholder={invite} value={recherche} aria-label={invite} onChange={(e) => { setRecherche(e.target.value); setPages(1); }} />
      <p className="texte-doux petit">{liste.length === 0 ? 'Aucun timbre ne correspond.' : legende(liste.length, enTete)}</p>
      <ul className="choix-timbre__grille">
        {liste.slice(0, pages * PAR_PAGE).map(({ carte, badge }) => (
          <li key={carte.id} data-choisie={carte.id === choisie || undefined}>
            <Carte carte={carte} finition={plusBelleFinition(collection.get(carte.id))} obtenuLe={dates?.get(carte.id) ?? null} onChoisir={() => onChoisir(carte)} action={action} />
            {badge && <span className="choix-timbre__badge" aria-hidden="true">{badge}</span>}
          </li>
        ))}
      </ul>
      {liste.length > pages * PAR_PAGE && <button type="button" className="bouton bouton--discret" onClick={() => setPages((p) => p + 1)}>Afficher plus de timbres</button>}
    </div>
  );
}
