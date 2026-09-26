// Supprimer son compte (le droit à l'effacement) : tout ce que garde le serveur part, sur tous les appareils, et cet
// appareil repart en invité avec les paquets de départ. Le serveur d'abord : s'il ne répond pas, rien n'est effacé
// (src/services/joutes.ts). Sans serveur (en développement), seule existe la partie de cet appareil.
// Le bouton s'appelait « Effacer ma partie » et parlait de « cet appareil » : il supprimait pourtant le compte entier
// (audit de finition du 26/09/2026).

import { useState } from 'react';
import { demanderConfirmation } from './Confirmation.tsx';
import { usePartie } from './usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { achatsEnCours } from '../jeu/formule.ts';
import { messageDe } from '../partage/messages.ts';
import { effacerLaPartieEtLeProfil } from '../services/joutes.ts';

type Etat = { etat: 'repos' | 'en cours' | 'faite' } | { etat: 'erreur'; message: string };

export function SuppressionDuCompte() {
  const partie = usePartie();
  const [etat, setEtat] = useState<Etat>({ etat: 'repos' });
  if (partie.etat !== 'prete') return null;
  const surLeServeur = partie.serveur.etat !== 'appareil';
  const paquets = EQUILIBRAGE.paquets.paquetsDeDepart;

  const supprimer = async (): Promise<void> => {
    // Un joueur qui a payé efface lui-même son compte (décision du 25/09/2026) : il doit savoir ce qu'il perd. Un
    // abonnement qui se renouvelle encore se résilie d'abord : le serveur le rappelle s'il le faut.
    const achats = partie.compte !== null && achatsEnCours(partie.compte.formule)
      ? ' Tu perdras aussi ce que tu as acheté (« Mon album », ton abonnement).' : '';
    if (!(await demanderConfirmation(surLeServeur ? {
      titre: 'Supprimer définitivement ton compte ?',
      message: `Ta collection, ton Encre, tes paquets, ton pseudonyme, tes amis et ton équipe seront effacés du serveur, sur tous tes appareils, avec ta connexion Google ou e-mail. C’est définitif.${achats}`,
      confirmer: 'Tout supprimer', danger: true,
    } : {
      titre: 'Effacer toute ta partie ?',
      message: 'Ta collection, ton Encre et tes paquets enregistrés sur cet appareil seront effacés. C’est définitif.',
      confirmer: 'Tout effacer', danger: true,
    }))) return;
    setEtat({ etat: 'en cours' });
    try {
      await effacerLaPartieEtLeProfil();
      setEtat({ etat: 'faite' });
    } catch (erreur) {
      setEtat({ etat: 'erreur', message: messageDe(erreur) });
    }
  };

  return <>
    <button type="button" className="bouton bouton--danger" disabled={etat.etat === 'en cours'} onClick={() => void supprimer()}>
      {etat.etat === 'en cours' ? 'Suppression…' : surLeServeur ? 'Supprimer mon compte' : 'Effacer ma partie'}
    </button>
    {etat.etat === 'faite' && <p role="status" className="petit">
      {surLeServeur ? `Compte supprimé. Tu repars en invité, avec ${paquets} paquets.` : `Partie effacée : tu repars de zéro, avec ${paquets} paquets.`}
    </p>}
    {etat.etat === 'erreur' && <p role="alert" className="petit">{etat.message} Rien n’a été effacé : réessaie dans un instant.</p>}
  </>;
}
