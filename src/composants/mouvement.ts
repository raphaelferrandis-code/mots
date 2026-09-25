// « Réduire les animations » : le réglage du jeu (posé sur la page par App.tsx) ou celui de l'appareil. Un seul test,
// pour que chaque animation obéisse aux deux (audit du 25/09/2026 : certaines n'écoutaient que l'un ou l'autre).
export const mouvementReduit = (): boolean => typeof document !== 'undefined'
  && (document.documentElement.hasAttribute('data-animations-reduites') || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
