import { useEffect, useRef, useState } from 'react';
import type { ActionCombat, ChoixCombat, CombatEnLigne, RequeteCombat, ReponseServeurCombat } from '../jeu/combat.ts';
import { serveurDesCollections } from '../services/collections.ts';
import { commanderCombat } from '../services/partie.ts';
import { ErreurDuServeur } from '../services/supabase.ts';
import { messageDe } from '../partage/messages.ts';

// Une commande garde son identifiant tant que son accusé de réception manque.
// Une reprise relit toujours la partie du compte, même après un changement d'appareil.
export function useCombatServeur(pret: boolean, appliquer: (r: ReponseServeurCombat) => void) {
  const actif = serveurDesCollections.actif;
  const [combat, setCombat] = useState<CombatEnLigne | null>(null);
  const courant = useRef<CombatEnLigne | null>(null);
  const [repris, setRepris] = useState(!actif);
  const [occupe, setOccupe] = useState(false);
  const verrou = useRef(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const attente = useRef<RequeteCombat | null>(null);
  const reception = useRef(appliquer);
  reception.current = appliquer;
  const monte = useRef(true);

  async function envoyer(commande: RequeteCombat): Promise<boolean> {
    if (verrou.current) return false;
    verrou.current = true;
    attente.current = commande;
    setOccupe(true); setErreur(null);
    try {
      const reponse = await commanderCombat(commande);
      attente.current = null;
      courant.current = reponse.combat;
      if (monte.current) {
        setCombat(reponse.combat); setRepris(true);
        reception.current(reponse);
      }
      return true;
    } catch (e) {
      if (e instanceof ErreurDuServeur && e.refus) attente.current = null;
      if (monte.current) setErreur(messageDe(e));
      return false;
    } finally {
      verrou.current = false;
      if (monte.current) setOccupe(false);
    }
  }
  useEffect(() => {
    monte.current = true;
    if (actif && pret) void envoyer({type:'lire'});
    return () => { monte.current = false; };
  }, [actif, pret]);

  const bloque = occupe || !repris || erreur !== null;
  return {
    actif, combat, repris, occupe, erreur, bloque,
    reprendre: () => envoyer({type:'lire'}),
    reessayer: () => envoyer(attente.current ?? {type:'lire'}),
    commencer: (choix: ChoixCombat) => bloque ? Promise.resolve(false) : envoyer({type:'commencer',requete:crypto.randomUUID(),choix}),
    agir: (action: ActionCombat) => {
      const c = courant.current;
      return bloque || !c ? Promise.resolve(false) : envoyer({type:'agir',requete:crypto.randomUUID(),combat:c.id,revision:c.revision,action});
    },
  };
}
