// La page Confidentialité du jeu : le texte commun (composants/legal/TexteConfidentialite.tsx, le même que la page fixe
// /confidentialite/), avec ici le bouton qui supprime le pseudonyme public.

import { useState } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { TexteConfidentialite } from '../composants/legal/TexteConfidentialite.tsx';
import { SERVEUR } from '../config/serveur.ts';
import { SITE, dateEnToutesLettres } from '../config/site.ts';
import { lien } from '../navigation/routes.ts';
import { serveurDesCollections } from '../services/collections.ts';
import { supprimerMonProfilDeJoute } from '../services/joutes.ts';
import { demanderConfirmation } from '../composants/Confirmation.tsx';
import { messageDe } from '../partage/messages.ts';

type Suppression = { etat: 'repos' } | { etat: 'en cours' } | { etat: 'faite' } | { etat: 'erreur'; message: string };

export function Confidentialite() {
  const partie = usePartie();
  const [suppression, setSuppression] = useState<Suppression>({ etat: 'repos' });

  if (partie.etat !== 'prete') return <main className="ecran"><h1 className="visuellement-cache">Confidentialité</h1><p className="texte-doux">Chargement…</p></main>;
  const aUnPseudonyme = partie.sauvegarde.joutes.pseudo !== '';

  const supprimer = async (): Promise<void> => {
    if (!(await demanderConfirmation({
      titre: 'Supprimer ton pseudonyme public ?',
      message: 'Ton pseudonyme, tes joutes, tes amis et tes propositions d’échange seront effacés du serveur. Ta cote reste attachée à ton compte, sans être visible : tu la retrouveras si tu choisis à nouveau un pseudonyme.',
      confirmer: 'Supprimer mon pseudonyme', danger: true,
    }))) return;
    setSuppression({ etat: 'en cours' });
    try {
      await supprimerMonProfilDeJoute();
      setSuppression({ etat: 'faite' });
    } catch (erreur) {
      setSuppression({ etat: 'erreur', message: messageDe(erreur) });
    }
  };

  const effacer = <>
    {suppression.etat === 'faite'
      ? <p role="status"><strong>Pseudonyme public supprimé.</strong> Ta collection et ton compte sont conservés.</p>
      : aUnPseudonyme
        ? <button type="button" className="bouton bouton--danger" disabled={suppression.etat === 'en cours'} onClick={() => void supprimer()}>{suppression.etat === 'en cours' ? 'Suppression…' : 'Supprimer mon pseudonyme public'}</button>
        : <p className="texte-doux">Tu n’as pas de pseudonyme public : rien n’est publié à ton nom.</p>}
    {suppression.etat === 'erreur' && <p className="joute__refus" role="alert">{suppression.message} Rien n’a été effacé : réessaie dans un instant.</p>}
  </>;

  return (
    <main className="ecran confidentialite">
      <Entete titre="Confidentialité" actions={<a className="bouton outil" href={lien({ ecran: 'reglages' })}>Retour aux réglages</a>} />
      <p className="texte-doux petit confidentialite__date">Mise à jour le {dateEnToutesLettres(SITE.textesLegauxLe)}</p>
      <TexteConfidentialite enLigne={serveurDesCollections.actif} antiRobot={!!SERVEUR.cleAntiRobot} parrainage={!!SERVEUR.secoursEtParrainage}
        liens={{ compte: lien({ ecran: 'compte' }), reglages: lien({ ecran: 'reglages' }) }} effacer={effacer} />
    </main>
  );
}
