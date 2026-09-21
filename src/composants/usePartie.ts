import { useEffect, useState, useSyncExternalStore } from 'react';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { mettreAJour } from '../jeu/partie.ts';
import { attenteAvantLeProchain } from '../jeu/recharge.ts';
import { abonner, demarrerLaPartie, lirePartie } from '../services/partie.ts';
import type { Partie } from '../services/partie.ts';

// La partie du joueur, tenue à jour sur tous les écrans.
export function usePartie(): Partie {
  useEffect(() => { void demarrerLaPartie(); }, []);
  return useSyncExternalStore(abonner, lirePartie);
}

// L'heure, rafraîchie régulièrement : sert au compte à rebours des paquets.
export function useMaintenant(intervalleEnMs = 1000): number {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const minuterie = setInterval(() => setMaintenant(Date.now()), intervalleEnMs);
    return () => clearInterval(minuterie);
  }, [intervalleEnMs]);
  return maintenant;
}

// Le stock de paquets tel qu'il est à cet instant (les paquets gagnés depuis la dernière action sont comptés).
export function useStockDePaquets(partie: Partie): { stock: number; maximum: number; attente: number | null } | null {
  const maintenant = useMaintenant();
  if (partie.etat !== 'prete') return null;
  const aJour = mettreAJour(partie.sauvegarde, maintenant, EQUILIBRAGE);
  return { stock: aJour.paquets.stock, maximum: EQUILIBRAGE.paquets.stockMaximum, attente: attenteAvantLeProchain(aJour.paquets, maintenant, EQUILIBRAGE.paquets) };
}

export function enMinutesEtSecondes(ms: number): string {
  const secondes = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;
}
