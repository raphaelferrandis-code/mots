import { useEffect, useState } from 'react';
import { messageDe } from '../partage/messages.ts';

export type Chargement<T> =
  | { etat: 'en cours' }
  | { etat: 'pret'; donnees: T }
  | { etat: 'erreur'; message: string };

// Lance un chargement à l'affichage de l'écran, et le relance si « cle » change ou si l'on appelle « relancer »
// (bouton « Réessayer » après une coupure de réseau).
export function useChargement<T>(charger: () => Promise<T>, cle: string): Chargement<T> & { relancer: () => void } {
  const [resultat, setResultat] = useState<Chargement<T>>({ etat: 'en cours' });
  const [tour, setTour] = useState(0);

  useEffect(() => {
    let actif = true;
    setResultat({ etat: 'en cours' });
    charger().then(
      (donnees) => { if (actif) setResultat({ etat: 'pret', donnees }); },
      (erreur: unknown) => { if (actif) setResultat({ etat: 'erreur', message: messageDe(erreur) }); },
    );
    return () => { actif = false; };
    // « charger » est recréée à chaque affichage : c'est « cle » qui dit quand recommencer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, tour]);

  return { ...resultat, relancer: () => setTour((t) => t + 1) };
}
