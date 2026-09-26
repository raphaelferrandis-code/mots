// Le déroulé animé d'une manche (docs/duel/BRIEF-duel.md § 3) : ce que l'écran montre, et quand. Les règles ont déjà tranché
// (Duel.tsx reçoit la manche jouée d'un coup) ; ce hook ne fait que l'égrener pour le joueur.
//
//   choix : le mot adverse arrive face cachée (nature, attaque, défense) ; il ne se retourne qu'à l'ouverture de la
//           parade (quand le joueur pose le premier, il n'arrive qu'avec elle) ;
//   bilan : « correction » (la parade montre la bonne réponse) → « bouclier » (il pare ton mot, ou sa garde se
//           fissure) → « elan » (les deux timbres s'élancent) → « choc » (éclats d'encre, tremblement, dégâts qui
//           s'envolent, barres de vie qui se vident) → « recap » (la phrase qui résume, et le bouton suivant).
// Avec le mouvement réduit, on passe de la correction au récapitulatif sans animation.

import { useEffect, useState } from 'react';
import type { Duel } from '../../jeu/duel.ts';
import type { SonsDuDuel } from '../../services/sonsDuDuel.ts';
import type { EtapeDePartie } from './Partie.tsx';

export type Temps = 'correction' | 'bouclier' | 'elan' | 'choc' | 'recap';

// Durée de chaque temps, en millisecondes (le « choc » tombe au milieu de l'élan des deux timbres).
const DUREES: Record<Exclude<Temps, 'recap'>, number> = { correction: 1600, bouclier: 650, elan: 410, choc: 900 };
const SUIVANT: Record<Exclude<Temps, 'recap'>, Temps> = { correction: 'bouclier', bouclier: 'elan', elan: 'choc', choc: 'recap' };
const ARRIVEE = 850; // le temps que le mot adverse met à arriver, avant que le joueur choisisse

export function useDeroulement({ etape, duel, reduit, sons, eclater, enAttente = false }: {
  etape: EtapeDePartie; duel: Duel; reduit: boolean; sons: SonsDuDuel; eclater: (degats: number) => void;
  enAttente?: boolean; // l'intro du duel joue encore : le mot adverse attend pour arriver
}): { temps: Temps; arrive: boolean } {
  // Le temps du bilan, recalculé pendant le rendu dès que l'étape change : sans trou entre la parade et sa correction.
  const cle = `${etape.nom}:${duel.manche}`;
  const [vue, setVue] = useState<{ cle: string; temps: Temps }>({ cle, temps: 'recap' });
  let temps = vue.temps;
  if (vue.cle !== cle) {
    temps = vue.cle.startsWith('parade:') && etape.nom === 'bilan' ? 'correction' : 'recap';
    setVue({ cle, temps });
  }

  const manche = etape.nom === 'bilan' ? etape.apres.manches.at(-1) : undefined;
  useEffect(() => {
    if (etape.nom !== 'bilan' || vue.temps === 'recap' || !manche) return;
    const infliges = manche.joueur.infliges;
    const subis = manche.adversaire.reussie ? manche.adversaire.infliges : 0;
    if (vue.temps === 'bouclier') { if (manche.joueur.paree) sons.bouclier(); else sons.fissure(); }
    if (vue.temps === 'elan') sons.souffle();
    if (vue.temps === 'choc') { sons.choc(Math.max(infliges, subis)); sons.coup(infliges); sons.coup(subis, 0.18); eclater(Math.max(infliges, subis)); }
    const suivant: Temps = reduit ? 'recap' : SUIVANT[vue.temps];
    const minuterie = window.setTimeout(() => {
      // Sans animation, les coups s'entendent quand même, au moment où le bilan s'affiche.
      if (reduit) { sons.coup(infliges); sons.coup(subis, 0.18); }
      setVue((v) => (v.cle === cle ? { ...v, temps: suivant } : v));
    }, reduit ? 700 : DUREES[vue.temps]);
    return () => window.clearTimeout(minuterie);
  }, [vue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quand l'adversaire pose le premier, son mot arrive face cachée ; le joueur choisit ensuite.
  const arrivee = etape.nom === 'choix' && etape.adverse ? `manche-${duel.manche}` : null;
  const [arriveeJouee, setArriveeJouee] = useState<string | null>(null);
  useEffect(() => {
    if (!arrivee || arriveeJouee === arrivee || enAttente) return;
    if (reduit) { setArriveeJouee(arrivee); return; }
    sons.souffle();
    if (duel.manche > 1) sons.piocher(0.15);
    const minuterie = window.setTimeout(() => { setArriveeJouee(arrivee); sons.poser(); }, ARRIVEE);
    return () => window.clearTimeout(minuterie);
  }, [arrivee, enAttente]); // eslint-disable-line react-hooks/exhaustive-deps

  return { temps, arrive: arrivee === null || reduit || arriveeJouee === arrivee };
}
