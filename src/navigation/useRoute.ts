import { useSyncExternalStore } from 'react';
import { lireRoute } from './routes.ts';
import type { Route } from './routes.ts';

function ecouter(prevenir: () => void): () => void {
  window.addEventListener('hashchange', prevenir);
  return () => window.removeEventListener('hashchange', prevenir);
}

// L'écran affiché suit l'adresse : liens, bouton « retour » et rechargement de la page fonctionnent d'eux-mêmes.
export function useRoute(): Route {
  const hash = useSyncExternalStore(ecouter, () => window.location.hash);
  return lireRoute(hash);
}
