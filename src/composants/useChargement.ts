import { useEffect, useState } from 'react';

export type Chargement<T> =
  | { etat: 'en cours' }
  | { etat: 'pret'; donnees: T }
  | { etat: 'erreur'; message: string };

// Lance un chargement à l'affichage de l'écran, et le relance si « cle » change.
export function useChargement<T>(charger: () => Promise<T>, cle: string): Chargement<T> {
  const [resultat, setResultat] = useState<Chargement<T>>({ etat: 'en cours' });

  useEffect(() => {
    let actif = true;
    setResultat({ etat: 'en cours' });
    charger().then(
      (donnees) => { if (actif) setResultat({ etat: 'pret', donnees }); },
      (erreur: unknown) => { if (actif) setResultat({ etat: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) }); },
    );
    return () => { actif = false; };
    // « charger » est recréée à chaque affichage : c'est « cle » qui dit quand recommencer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  return resultat;
}
