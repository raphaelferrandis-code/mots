// La recherche d'une joute classée depuis l'onglet « Joutes classées » du duel : chercher, attendre, accepter.
// Même déroulement que le salon des joutes (ecrans/JoutesDirectes.tsx) : la sonnette et le titre de l'onglet quand un
// adversaire est trouvé, l'adversaire de secours après l'attente prévue. Une fois la partie commencée, elle se joue
// sur l'écran des joutes en direct.
import { useEffect, useRef, useState } from 'react';
import { useJouteDirecte } from '../../composants/useJouteDirecte.ts';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import type { ModeDirect, PropositionDirecte } from '../../jeu/direct.ts';
import { registresMasques } from '../../jeu/partie.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import { lien } from '../../navigation/routes.ts';
import { messageDe } from '../../partage/messages.ts';
import { secoursEtParrainage, serveurUtilise } from '../../services/compte.ts';
import { commanderCombat, lireLesAdversairesDeSecours } from '../../services/partie.ts';
import { SonsDuDirect } from '../../services/sonsDuDirect.ts';
import { ErreurDuServeur } from '../../services/supabase.ts';

type Secours = { etat: 'repos' | 'en cours' } | { etat: 'erreur'; message: string };

// ouvert : l'onglet des joutes est affiché. Une recherche en cours reste suivie même quand le joueur change d'onglet
// (le serveur retire de la file un joueur qui ne donne plus signe de vie).
// onDuelDeSecours : le duel contre un joueur simulé vient d'être commencé sur le serveur des combats.
export function useRechercheEnDirect(sauvegarde: Sauvegarde, ouvert: boolean, onDuelDeSecours: () => void) {
  const inscrit = !!sauvegarde.joutes.pseudo;
  const [suivie, setSuivie] = useState(false);
  const direct = useJouteDirecte(serveurUtilise && inscrit && (ouvert || suivie));
  const attente = direct.etat?.attente ?? null;
  const proposition = direct.etat?.proposition ?? null;
  useEffect(() => { setSuivie(!!attente || !!proposition); }, [attente, proposition]);

  // La partie a commencé : elle se joue sur l'écran des joutes en direct.
  const partieEnCours = !!direct.etat?.partie && direct.etat.partie.vue.phase !== 'fin';
  useEffect(() => { if (partieEnCours) window.location.hash = lien({ ecran: 'joutes' }); }, [partieEnCours]);

  // La sonnette : prête dans le geste du joueur, elle retentit même onglet caché.
  const [sons] = useState(() => new SonsDuDirect());
  useEffect(() => { sons.activer(sauvegarde.reglages.sonsPaquets); }, [sons, sauvegarde.reglages.sonsPaquets]);
  useEffect(() => () => sons.fermer(), [sons]);
  const aRepondre = !!proposition && !proposition.jAccepte;
  useEffect(() => {
    if (!aRepondre) return;
    sons.adversaireTrouve();
    const titre = document.title;
    document.title = `⚔ Adversaire trouvé ! · ${titre}`;
    return () => { document.title = titre; };
  }, [aRepondre, proposition?.id, sons]);

  // Quand une proposition tombe, on dit pourquoi (voir JoutesDirectes.tsx).
  const [avis, setAvis] = useState('');
  const precedente = useRef<PropositionDirecte | null>(null);
  const jaiRefuse = useRef(false);
  useEffect(() => {
    const avant = precedente.current;
    precedente.current = proposition;
    if (!direct.etat || proposition || !avant) return;
    if (direct.etat.partie) setAvis('');
    else if (direct.etat.attente) setAvis('Tout le monde n’a pas accepté : tu reprends ta place dans la file.');
    else if (!jaiRefuse.current) setAvis('Tu n’as pas accepté à temps : ta recherche s’est arrêtée, sans défaite.');
    jaiRefuse.current = false;
  }, [direct.etat, proposition]);

  // L'adversaire de secours : proposé quand personne n'est libre depuis un moment (hors 2v2 équipe).
  const [debutAttente, setDebutAttente] = useState<number | null>(null);
  useEffect(() => { setDebutAttente(attente ? Date.now() : null); }, [attente?.mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [delaiEcoule, setDelaiEcoule] = useState(false);
  useEffect(() => {
    setDelaiEcoule(false);
    if (debutAttente === null) return;
    const minuterie = window.setTimeout(() => setDelaiEcoule(true), debutAttente + EQUILIBRAGE.secours.attenteAvantDeProposerEnSecondes * 1000 - Date.now());
    return () => window.clearTimeout(minuterie);
  }, [debutAttente]);
  const secoursPropose = secoursEtParrainage && !!attente && attente.mode !== 'duo_equipe' && delaiEcoule;
  const [secours, setSecours] = useState<Secours>({ etat: 'repos' });

  const chercher = async (mode: ModeDirect): Promise<void> => {
    sons.preparer(); setAvis(''); setSecours({ etat: 'repos' });
    // Le résultat d'une joute terminée reste affiché tant qu'on ne l'a pas quitté : on le quitte avant de chercher.
    if (direct.courant()?.partie) {
      await direct.quitter();
      if (direct.courant()?.partie) return;
    }
    await direct.chercher(mode, registresMasques(sauvegarde));
  };

  const repondre = (accepte: boolean): void => {
    sons.preparer(); jaiRefuse.current = !accepte; setAvis('');
    void direct.repondre(accepte);
  };

  const jouerContreUnSimule = async (): Promise<void> => {
    setSecours({ etat: 'en cours' });
    try {
      const masques = registresMasques(sauvegarde);
      const adversaires = await lireLesAdversairesDeSecours(masques);
      if (adversaires.length === 0) throw new Error('Aucun joueur simulé n’est disponible avec tes filtres de contenu.');
      await direct.annuler();
      // Un vrai joueur est peut-être arrivé entre-temps : la joute en direct (ou le match à accepter) passe avant.
      if (direct.courant()?.partie || direct.courant()?.proposition) { setSecours({ etat: 'repos' }); return; }
      let refus: unknown;
      for (const adversaire of adversaires) {
        try {
          await commanderCombat({ type: 'commencer', requete: crypto.randomUUID(), choix: {
            mode: 'amical', adversaire: adversaire.id, masques, temps: sauvegarde.reglages.tempsDeReponse,
          } });
          setSecours({ etat: 'repos' });
          onDuelDeSecours();
          return;
        } catch (erreur) {
          // Un deck adverse refusé par le serveur des combats : on essaie le joueur suivant.
          refus = erreur;
          if (!(erreur instanceof ErreurDuServeur && erreur.refus)) break;
        }
      }
      throw refus;
    } catch (erreur) {
      setSecours({ etat: 'erreur', message: messageDe(erreur) });
    }
  };

  return {
    inscrit, direct, attente, proposition, partieEnCours, avis, debutAttente, secoursPropose, secours,
    bloque: direct.occupe || direct.reessayer || secours.etat === 'en cours',
    chercher, repondre, jouerContreUnSimule,
    annuler: () => { setAvis(''); void direct.annuler(); },
  };
}
