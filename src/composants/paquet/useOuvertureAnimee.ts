import { useEffect, useRef, useState } from 'react';
import type { CarteObtenue } from '../../jeu/partie.ts';
import { NIVEAU } from '../carte/decor.ts';
import { SonsPaquets } from '../../services/sonsPaquets.ts';
import { RYTHME_PAQUET } from './rythme.ts';

type Ouverture = { cartes: CarteObtenue[]; retournees: boolean[] };
type Phase = 'repos' | 'chargement' | 'ouverture' | 'cartes';

export function useOuvertureAnimee(sonsActifs: boolean, reduireAnimations: boolean) {
  const [ouverture, setOuverture] = useState<Ouverture | null>(null);
  const [phase, setPhase] = useState<Phase>('repos');
  const [erreur, setErreur] = useState<string | null>(null);
  const [arriveeAnimee, setArriveeAnimee] = useState(false);
  const [sons] = useState(() => new SonsPaquets());
  const monte = useRef(false);
  const verrou = useRef(false);
  const revelees = useRef(new Set<number>());
  const minuteries = useRef(new Set<ReturnType<typeof setTimeout>>());
  const nombreCartes = useRef(0);

  const arreter = (): void => {
    for (const minuterie of minuteries.current) clearTimeout(minuterie);
    minuteries.current.clear();
    sons.arreter();
  };
  const montrer = (anime: boolean): void => {
    arreter();
    verrou.current = false;
    setArriveeAnimee(anime);
    setPhase('cartes');
    if (anime) for (let i = 0; i < nombreCartes.current; i++) sons.carte(i, (RYTHME_PAQUET.arrivee + i * RYTHME_PAQUET.intervalle) / 1000);
  };

  useEffect(() => {
    monte.current = true;
    const suspendre = (): void => { if (document.hidden) sons.arreter(); };
    document.addEventListener('visibilitychange', suspendre);
    return () => {
      monte.current = false;
      for (const minuterie of minuteries.current) clearTimeout(minuterie);
      minuteries.current.clear();
      sons.fermer();
      document.removeEventListener('visibilitychange', suspendre);
    };
  }, [sons]);
  useEffect(() => { sons.activer(sonsActifs); }, [sons, sonsActifs]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const adapter = (): void => { if (phase === 'ouverture' && (preference.matches || reduireAnimations)) montrer(false); };
    adapter();
    preference.addEventListener('change', adapter);
    return () => preference.removeEventListener('change', adapter);
  }, [phase, reduireAnimations]);

  const lancer = async (action: () => Promise<CarteObtenue[]>): Promise<void> => {
    // Verrou synchrone : deux clics avant le rendu ne tirent pas deux paquets.
    if (verrou.current) return;
    verrou.current = true;
    arreter();
    sons.activer(sonsActifs);
    sons.preparer();
    setErreur(null);
    setPhase('chargement');
    setOuverture(null);
    try {
      const cartes = await action();
      if (!monte.current) return;
      nombreCartes.current = cartes.length;
      revelees.current.clear();
      setOuverture({ cartes, retournees: cartes.map(() => false) });
      if (reduireAnimations || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        montrer(false);
        sons.carte();
        return;
      }
      setPhase('ouverture');
      sons.ouvrir();
      cartes.forEach((_, i) => sons.carte(i, (RYTHME_PAQUET.sortie + i * RYTHME_PAQUET.intervalle) / 1000));
      const minuterie = setTimeout(() => { minuteries.current.delete(minuterie); montrer(true); }, RYTHME_PAQUET.ouverture);
      minuteries.current.add(minuterie);
    } catch (e) {
      if (!monte.current) return;
      verrou.current = false;
      arreter();
      setPhase('repos');
      setErreur(e instanceof Error ? e.message : String(e));
    }
  };

  const retourner = (position: number): void => {
    if (phase !== 'cartes' || revelees.current.has(position)) return;
    revelees.current.add(position);
    sons.retourner();
    const carte = ouverture?.cartes[position]?.carte;
    if (carte) sons.rare(NIVEAU[carte.rarete], 0.18);
    setOuverture((o) => o && { ...o, retournees: o.retournees.map((r, i) => r || i === position) });
  };
  const toutRetourner = (): void => {
    if (!ouverture || phase !== 'cartes') return;
    sons.preparer();
    // Le carillon ne sonne qu'une fois, pour le plus rare des timbres qui se découvrent.
    let plusRare = 0;
    let quand = 0;
    ouverture.cartes.forEach((obtenue, i) => {
      if (revelees.current.has(i)) return;
      sons.carte(i, i * 0.06);
      const niveau = NIVEAU[obtenue.carte.rarete];
      if (niveau > plusRare) { plusRare = niveau; quand = i * 0.06 + 0.18; }
      revelees.current.add(i);
    });
    sons.rare(plusRare, quand);
    setOuverture((o) => o && { ...o, retournees: o.retournees.map(() => true) });
  };

  return { ouverture, phase, erreur, arriveeAnimee, lancer, retourner, toutRetourner, passer: () => montrer(false) };
}
