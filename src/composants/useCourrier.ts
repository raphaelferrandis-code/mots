import { useEffect, useSyncExternalStore } from 'react';
import { actualiserLeCourrier, ecouterLeCourrier, lireLeCourrier } from '../services/courrier.ts';
import type { Courrier } from '../services/courrier.ts';
import { pseudoDuJoueur } from '../services/identite.ts';
import { usePartie } from './usePartie.ts';

// Le courrier du joueur (services/courrier.ts), pour l'en-tête, l'accueil et les pages qui le lisent.
export function useCourrier(): Courrier {
  return useSyncExternalStore(ecouterLeCourrier, lireLeCourrier, lireLeCourrier);
}

const TOUTES_LES_TROIS_MINUTES = 3 * 60_000;

// Une seule fois dans l'application (App.tsx) : le courrier se relit au démarrage, au retour sur l'onglet, et toutes les
// trois minutes tant que la page est visible (au plus une fois par minute : services/courrier.ts).
export function useActualisationDuCourrier(): void {
  const partie = usePartie();
  const avecPseudonyme = partie.etat === 'prete' && partie.serveur.etat === 'en ligne' && pseudoDuJoueur(partie.sauvegarde) !== '';
  useEffect(() => {
    void actualiserLeCourrier(avecPseudonyme, true);
    const relire = (): void => { if (document.visibilityState === 'visible') void actualiserLeCourrier(avecPseudonyme); };
    window.addEventListener('focus', relire);
    document.addEventListener('visibilitychange', relire);
    const minuterie = window.setInterval(relire, TOUTES_LES_TROIS_MINUTES);
    return () => {
      window.removeEventListener('focus', relire);
      document.removeEventListener('visibilitychange', relire);
      window.clearInterval(minuterie);
    };
  }, [avecPseudonyme]);
}
