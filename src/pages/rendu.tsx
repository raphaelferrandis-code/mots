// Le rendu en HTML des pages par mot, appelé par scripts/fabriquer-les-pages.ts à travers Vite (qui sait lire le TSX
// et ignore les feuilles de style importées par les composants).
import { renderToStaticMarkup } from 'react-dom/server';
import { allegerLesTimbres } from './assemblage.ts';
import { CarteQuestion, CarteReponse } from './CarteDePartage.tsx';
import type { Devinette } from '../jeu/devinette.ts';
import { ListeDesMots, PageDuMot } from './PageDuMot.tsx';
import type { Voisin } from './PageDuMot.tsx';
import { PageIntrouvable, PageLegale } from './PageLegale.tsx';
import type { PageLegaleFixe } from './PageLegale.tsx';
import type { TexteDUnePage } from '../partage/pagesDesMots.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';

export { TEXTURES_DU_TIMBRE } from '../composants/timbre/dessins.ts';

export function rendrePage(carte: CarteIndex, details: CarteDetails, texte: TexteDUnePage | undefined, voisins: Voisin[]): string {
  return allegerLesTimbres(renderToStaticMarkup(<PageDuMot carte={carte} details={details} texte={texte} voisins={voisins} />), '<div class="page-mot__texte">');
}

export function rendreListe(mots: { mot: string; adresse: string; type: CarteIndex['type'] }[]): string {
  return renderToStaticMarkup(<ListeDesMots mots={mots} />);
}

// Les pages légales fixes, et la page introuvable (404.html).
export function rendrePageLegale(page: PageLegaleFixe): string {
  return renderToStaticMarkup(<PageLegale page={page} />);
}

export function rendrePageIntrouvable(homographes: Record<string, { adresse: string; nature: string; mot: string }[]>): string {
  return renderToStaticMarkup(<PageIntrouvable homographes={homographes} />);
}

export { DESCRIPTIONS_DES_PAGES_LEGALES, PAGES_LEGALES, TITRES_DES_PAGES_LEGALES } from './PageLegale.tsx';

// Les images de la devinette : un seul timbre, qui garde ses guillochis (allégés au dixième).
export function rendreQuestion(carte: CarteIndex, devinette: Devinette): string {
  return allegerLesTimbres(renderToStaticMarkup(<CarteQuestion carte={carte} devinette={devinette} />), 'carte-partage__consigne');
}

export function rendreReponse(carte: CarteIndex, details: CarteDetails, devinette: Devinette): string {
  return allegerLesTimbres(renderToStaticMarkup(<CarteReponse carte={carte} details={details} devinette={devinette} />), 'carte-partage__mot');
}
