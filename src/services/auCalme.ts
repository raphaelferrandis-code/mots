// « Au calme » : l'accueil a reçu ce qu'il attend (le catalogue et les polices) et le navigateur n'a plus rien d'urgent.
// Ce qui peut attendre (le préchargement des écrans, l'installation du service worker) part alors, sans rien disputer
// au premier affichage sur un réseau lent (audit de finition du 26/09/2026, P10). Rend de quoi annuler.

import { chargerEdition } from './cartes.ts';

export function auCalme(action: () => void): () => void {
  let annule = false;
  let arreter = (): void => undefined;
  // (Les polices après le catalogue : l'accueil, affiché entre-temps, les a toutes demandées.)
  void chargerEdition().catch(() => undefined).then(() => document.fonts?.ready).then(() => {
    if (annule) return;
    // (Safari n'a pas requestIdleCallback : une petite attente le remplace.)
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(action, { timeout: 4000 });
      arreter = () => window.cancelIdleCallback(id);
    } else {
      const minuterie = window.setTimeout(action, 1000);
      arreter = () => window.clearTimeout(minuterie);
    }
  });
  return () => { annule = true; arreter(); };
}
