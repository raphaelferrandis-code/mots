// Le fil d'activité du bas de l'accueil, nourri par les vrais événements du serveur et, tant qu'il y a peu de monde,
// par ceux des joueurs simulés (src/services/filSimule.ts). Sans aucun événement, il ne s'affiche pas. Il se met à
// jour toutes les deux minutes. Il ne défile plus tout seul (décision de Raphaël du 28/09/2026 : seul le paquet bouge
// sur l'accueil) : on le fait glisser.

import { useEffect, useMemo, useState } from 'react';
import { useChargement } from '../useChargement.ts';
import { chargerLeFil, melangerLeFil, phraseDuFil } from '../../services/activite.ts';
import type { EvenementDuFil } from '../../services/activite.ts';
import { chargerEdition } from '../../services/cartes.ts';
import { evenementsSimules } from '../../services/filSimule.ts';

export function FilDActivite({ evenements: fournis }: { evenements?: EvenementDuFil[] } = {}) {
  const [charges, setCharges] = useState<EvenementDuFil[] | null>(null);
  const [instant, setInstant] = useState(Date.now);
  const edition = useChargement(chargerEdition, 'edition');
  useEffect(() => {
    if (fournis) return;
    let actif = true;
    const charger = (): void => { void chargerLeFil().then((fil) => { if (actif) { setCharges(fil); setInstant(Date.now()); } }); };
    charger();
    const minuterie = window.setInterval(() => { if (!document.hidden) charger(); }, 120_000);
    return () => { actif = false; clearInterval(minuterie); };
  }, [fournis]);

  const cartes = edition.etat === 'pret' ? edition.donnees.cartes : null;
  const evenements = useMemo(() => {
    if (fournis) return fournis;
    if (!cartes) return charges;
    return melangerLeFil(charges ?? [], evenementsSimules(instant, cartes), instant);
  }, [fournis, charges, cartes, instant]);
  if (!evenements || evenements.length === 0) return null;
  return (
    <section className="fil" aria-label="Activité récente du bureau">
      <div className="fil__fenetre" tabIndex={0}><div className="fil__piste">{evenements.map((e, i) => <span key={i} className="fil__evenement">
        <span>{phraseDuFil(e).map((m, k) => m.fort ? <b key={k}>{m.texte}</b> : m.texte)}</span><i aria-hidden="true">✦</i>
      </span>)}</div></div>
    </section>
  );
}
