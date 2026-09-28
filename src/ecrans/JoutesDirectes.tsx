// L'écran des joutes en direct : la partie, et seulement elle (audit de finition du 26/09/2026, chantier 6). On
// cherche un adversaire, on accepte le match et on attend dans la préparation du duel (onglets « Joutes classées » et
// « Mon équipe », ecrans/duel/Preparation.tsx) ; dès que la partie commence, elle se joue ici (direct/PartieDirecte.tsx).
// Sans partie à montrer, cet écran renvoie donc au salon : les anciens liens (#/joutes, #/joutes/duo_equipe) y mènent.
import { useEffect } from 'react';
import { useRecompensesSuspendues } from '../composants/Recompenses.tsx';
import { useJouteDirecte } from '../composants/useJouteDirecte.ts';
import { usePartie } from '../composants/usePartie.ts';
import { useSonsDuDuel } from '../composants/useSonsDuDuel.ts';
import { SALON_DE_L_EQUIPE, SALON_DES_JOUTES } from '../navigation/routes.ts';
import { serveurUtilise } from '../services/compte.ts';
import { PartieDirecte } from './direct/PartieDirecte.tsx';
import './joutesDirectes.css';

export function JoutesDirectes() {
  const partie = usePartie();
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  const inscrit = !!sauvegarde?.joutes.pseudo;
  const direct = useJouteDirecte(inscrit);
  const sons = useSonsDuDuel(sauvegarde?.reglages.sonsPaquets ?? true);
  const enCours = direct.etat?.partie ?? null;
  // Pendant la partie, les récompenses attendent la carte de fin.
  useRecompensesSuspendues(!!enCours && enCours.vue.phase !== 'fin');

  const versLEquipe = window.location.hash.endsWith('/duo_equipe') || direct.etat?.attente?.mode === 'duo_equipe' || direct.etat?.proposition?.mode === 'duo_equipe';
  const salon = versLEquipe ? SALON_DE_L_EQUIPE : SALON_DES_JOUTES;
  const allerAuSalon = !!sauvegarde && serveurUtilise && (!inscrit || (!!direct.etat && !enCours));
  useEffect(() => { if (allerAuSalon) window.location.replace(salon); }, [allerAuSalon, salon]);

  if (!serveurUtilise) return <main className="ecran direct"><p>Les joutes en direct se jouent en ligne : il faut une connexion au serveur du jeu.</p></main>;
  if (!sauvegarde || !enCours) {
    return (
      <main className="ecran direct" aria-busy={!direct.erreur}>
        {direct.erreur ? <div className="bloc bloc--alerte" role="alert"><p>{direct.erreur}</p><button type="button" className="btn-secondary sm" disabled={direct.occupe} onClick={() => void direct.retenter()}>Réessayer</button></div>
          : <p role="status">{allerAuSalon ? 'Retour au salon des joutes…' : 'Connexion à la partie…'}</p>}
      </main>
    );
  }
  return <PartieDirecte sauvegarde={sauvegarde} direct={direct} sons={sons}
    reduit={sauvegarde.reglages.reduireAnimations || window.matchMedia('(prefers-reduced-motion: reduce)').matches} />;
}
