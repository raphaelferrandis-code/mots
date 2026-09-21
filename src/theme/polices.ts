// Les polices du jeu. Elles sont livrées avec le site (licence libre OFL) : rien n'est chargé chez un tiers,
// et le rendu est le même sur tous les appareils. Le navigateur ne télécharge que les polices réellement utilisées.
//
// Trois paires sont à l'essai, le temps que Raphaël choisisse (Réglages → « Police des timbres ») ;
// les deux paires écartées seront ensuite retirées.

import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/libre-caslon-text/latin-400.css';
import '@fontsource/libre-caslon-text/latin-400-italic.css';
import '@fontsource/libre-caslon-text/latin-700.css';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';

export const POLICES = {
  playfair: 'Playfair Display — contrastée, esprit gravure',
  cormorant: 'Cormorant Garamond — fine, très littéraire',
  caslon: 'Libre Caslon — classique, esprit vieux livre',
} as const;
export type Police = keyof typeof POLICES;

const CLE = 'mots.police';
const PAR_DEFAUT: Police = 'playfair';

export function policeChoisie(): Police {
  try {
    const lue = localStorage.getItem(CLE);
    return lue && lue in POLICES ? (lue as Police) : PAR_DEFAUT;
  } catch {
    return PAR_DEFAUT;
  }
}

export function appliquerLaPolice(police: Police): void {
  document.documentElement.dataset.police = police;
  try { localStorage.setItem(CLE, police); } catch { /* stockage indisponible : le choix vaut pour cette visite */ }
}
