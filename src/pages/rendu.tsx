// Le rendu en HTML des pages par mot, appelé par scripts/fabriquer-les-pages.ts à travers Vite (qui sait lire le TSX
// et ignore les feuilles de style importées par les composants).
import { renderToStaticMarkup } from 'react-dom/server';
import { allegerLesTimbres } from './assemblage.ts';
import { ListeDesMots, PageDuMot } from './PageDuMot.tsx';
import type { Voisin } from './PageDuMot.tsx';
import type { TexteDUnePage } from '../partage/pagesDesMots.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';

export { TEXTURES_DU_TIMBRE } from '../composants/timbre/dessins.ts';

export function rendrePage(carte: CarteIndex, details: CarteDetails, texte: TexteDUnePage | undefined, voisins: Voisin[]): string {
  return allegerLesTimbres(renderToStaticMarkup(<PageDuMot carte={carte} details={details} texte={texte} voisins={voisins} />), '<div class="page-mot__texte">');
}

export function rendreListe(mots: { mot: string; adresse: string; type: CarteIndex['type'] }[]): string {
  return renderToStaticMarkup(<ListeDesMots mots={mots} />);
}
