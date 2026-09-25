// Le fil d'activité défilant du bas de l'accueil (maquette : ticker), nourri par les vrais événements du serveur.
// Sans événement (ou sans serveur), il ne s'affiche pas. Il se met à jour toutes les deux minutes.

import { useEffect, useState } from 'react';
import { chargerLeFil, phraseDuFil } from '../../services/activite.ts';
import type { EvenementDuFil } from '../../services/activite.ts';

export function FilDActivite({ evenements: fournis }: { evenements?: EvenementDuFil[] } = {}) {
  const [charges, setCharges] = useState<EvenementDuFil[] | null>(null);
  useEffect(() => {
    if (fournis) return;
    let actif = true;
    const charger = (): void => { void chargerLeFil().then((fil) => { if (actif) setCharges(fil); }); };
    charger();
    const minuterie = window.setInterval(() => { if (!document.hidden) charger(); }, 120_000);
    return () => { actif = false; clearInterval(minuterie); };
  }, [fournis]);

  const evenements = fournis ?? charges;
  if (!evenements || evenements.length === 0) return null;
  // Deux fois la même suite : le défilement boucle sans à-coup (il s'arrête au survol).
  const suite = (copie: number) => evenements.map((e, i) => <span key={`${copie}-${i}`} className="fil__evenement" aria-hidden={copie === 1 || undefined}>
    <span>{phraseDuFil(e).map((m, k) => m.fort ? <b key={k}>{m.texte}</b> : m.texte)}</span><i aria-hidden="true">✦</i>
  </span>);
  return (
    <section className="fil" aria-label="Activité récente du bureau">
      <div className="fil__piste" style={{ animationDuration: `${Math.max(40, evenements.length * 9)}s` }}>{suite(0)}{suite(1)}</div>
    </section>
  );
}
