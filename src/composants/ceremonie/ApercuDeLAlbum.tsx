// L'album en aperçu, sous le comptoir (maquette : « Ta collection ») : le compte réel des timbres, les douze
// dernières trouvailles dans leurs cases dentelées, les Hors-série et le lien vers l'album complet.
// Pendant l'envol d'un paquet, les cases qui attendent leur timbre restent vides et le compte monte à chaque arrivée.

import type { Ref } from 'react';
import { meilleureFinition } from '../../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex } from '../../partage/types.ts';
import { preparerAccueil } from '../accueil/modeleAccueil.ts';
import { Timbre } from '../timbre/Timbre.tsx';
import { useNombreAnime } from './compteurs.ts';

export const CASES_DE_L_APERCU = 12;

// Les douze timbres obtenus le plus récemment, du plus ancien au plus récent (les nouveaux arrivent à droite).
export function dernieresTrouvailles(sauvegarde: Sauvegarde, cartes: readonly CarteIndex[]): CarteIndex[] {
  return cartes.filter((c) => c.id in sauvegarde.cartes)
    .sort((a, b) => sauvegarde.cartes[a.id].obtenueLe - sauvegarde.cartes[b.id].obtenueLe || a.mot.localeCompare(b.mot, 'fr'))
    .slice(-CASES_DE_L_APERCU);
}

type Props = {
  sauvegarde: Sauvegarde;
  cartes: readonly CarteIndex[] | null;
  cachees?: ReadonlySet<string>; // timbres encore en vol : leur case reste vide
  compte?: number | null; // compte affiché pendant l'envol, à la place du vrai
  refAlbum?: Ref<HTMLElement>;
};

export function ApercuDeLAlbum({ sauvegarde, cartes, cachees, compte = null, refAlbum }: Props) {
  const collection = cartes ? preparerAccueil(sauvegarde, cartes).collection : null;
  const affiche = useNombreAnime(compte ?? collection?.possedees ?? null, 250);
  const trouvailles = cartes ? dernieresTrouvailles(sauvegarde, cartes) : [];

  return (
    <section className="album-apercu" id="album-apercu" ref={refAlbum} aria-labelledby="titre-album-apercu">
      <div className="album-apercu__tete">
        <h2 id="titre-album-apercu">Ta collection</h2>
        <p className="album-apercu__compte"><b>{affiche === null ? '…' : affiche.toLocaleString('fr-FR')}</b> sur {collection ? collection.total.toLocaleString('fr-FR') : '…'} timbres</p>
      </div>
      <ul className="album-apercu__cases" aria-label="Tes dernières trouvailles">
        {Array.from({ length: CASES_DE_L_APERCU }, (_, i) => {
          const carte = trouvailles[i];
          const possedee = carte ? sauvegarde.cartes[carte.id] : null;
          return <li key={carte?.id ?? `vide-${i}`} className={`album-apercu__case${carte ? ' album-apercu__case--pleine' : ''}`} data-id={carte?.id}>
            {carte && possedee && <Timbre carte={carte} finition={meilleureFinition(possedee)} oblitere obtenuLe={possedee.obtenueLe} maitriseeLe={possedee.maitriseeLe}
              style={cachees?.has(carte.id) ? { opacity: 0 } : undefined} />}
          </li>;
        })}
      </ul>
      <p className="album-apercu__pied">
        <span>{collection ? `${collection.horsSeriePossedees} sur ${collection.horsSerieTotal} hors-série` : ''}</span>
        <a className="comptoir__lien" href={lien({ ecran: 'collection' })}>Ouvrir l’album</a>
      </p>
    </section>
  );
}
