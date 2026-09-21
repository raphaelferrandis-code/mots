import { useEffect, useState } from 'react';
import { SonsDuDuel } from '../services/sonsDuDuel.ts';

// Les bruitages du duel, pour la durée de l'écran. Ils suivent le réglage « Sons du jeu », se taisent quand
// l'onglet passe à l'arrière-plan, et rendent la sortie audio en quittant l'écran.
export function useSonsDuDuel(actifs: boolean): SonsDuDuel {
  const [sons] = useState(() => new SonsDuDuel());
  useEffect(() => { sons.activer(actifs); }, [sons, actifs]);
  useEffect(() => {
    const suspendre = (): void => { if (document.hidden) sons.arreter(); };
    document.addEventListener('visibilitychange', suspendre);
    return () => { document.removeEventListener('visibilitychange', suspendre); sons.fermer(); };
  }, [sons]);
  return sons;
}
