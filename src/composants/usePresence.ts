// La présence vue par les amis : le jeu signale le portrait du joueur à l'ouverture, quand il le change, quand il
// revient sur l'onglet et toutes les trois minutes tant que l'onglet est visible. « En ligne » = signalé il y a
// moins de cinq minutes (voir Correspondance.tsx).

import { useEffect, useRef } from 'react';
import { profilVisible } from '../jeu/personnalisation.ts';
import { amisDisponibles } from '../services/amis.ts';
import { signalerPresence } from '../services/partie.ts';
import { usePartie } from './usePartie.ts';

const INTERVALLE = 3 * 60_000;

export function usePresence(): void {
  const partie = usePartie();
  const visible = partie.etat === 'prete' ? profilVisible(partie.sauvegarde.profil, partie.compte?.formule ?? null) : null;
  const actif = amisDisponibles && !!visible?.pseudo;
  const avatar = visible?.avatar ?? '';
  const cadre = visible?.cadre ?? '';
  const dernier = useRef(0);

  useEffect(() => {
    if (!actif) return;
    const signaler = (force: boolean) => {
      if (document.visibilityState !== 'visible') return;
      if (!force && Date.now() - dernier.current < INTERVALLE - 5_000) return;
      dernier.current = Date.now();
      void signalerPresence(avatar, cadre);
    };
    signaler(true);
    const retour = () => signaler(false);
    document.addEventListener('visibilitychange', retour);
    const minuterie = window.setInterval(retour, INTERVALLE);
    return () => { document.removeEventListener('visibilitychange', retour); window.clearInterval(minuterie); };
  }, [actif, avatar, cadre]);
}
