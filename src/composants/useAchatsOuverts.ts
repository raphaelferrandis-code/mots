import { useEffect, useState } from 'react';
import { paiementsDeTest, paiementsDisponibles } from '../services/paiements.ts';
import { lireOuverturePaiements } from '../services/etat-paiements.ts';

export function useAchatsOuverts(): boolean {
  const [ouverts, setOuverts] = useState(paiementsDeTest);
  useEffect(() => {
    if (!paiementsDisponibles || paiementsDeTest) return;
    let fini = false;
    let enCours = false;
    const actualiser = async () => {
      if (enCours) return;
      enCours = true;
      const valeur = await lireOuverturePaiements();
      enCours = false;
      if (!fini) setOuverts(valeur);
    };
    void actualiser();
    // Une question au serveur de paiement par minute au plus, et aucune quand l'onglet est caché.
    const intervalle = window.setInterval(() => { if (!document.hidden) void actualiser(); }, 60_000);
    window.addEventListener('focus', actualiser);
    return () => { fini = true; window.clearInterval(intervalle); window.removeEventListener('focus', actualiser); };
  }, []);
  return ouverts;
}
