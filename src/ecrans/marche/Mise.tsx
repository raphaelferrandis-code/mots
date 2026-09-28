// Miser et acheter tout de suite, communs à la salle des ventes et à « Tes enchères ». Le résultat d'un geste s'affiche
// là où il a été fait (audit de finition du 26/09/2026, S22 : il partait en haut d'une page longue) ; un timbre
// remporté s'annonce par une fenêtre « Adjugé », d'où que l'on soit.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { demanderConfirmation } from '../../composants/Confirmation.tsx';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { miseMinimale } from '../../jeu/marche.ts';
import type { Enchere } from '../../jeu/marche.ts';
import { lien } from '../../navigation/routes.ts';
import { messageDe } from '../../partage/messages.ts';
import { encherir } from '../../services/partie.ts';

const REGLES = EQUILIBRAGE.marche;
export type Retour = { ton: 'succes' | 'erreur'; texte: string };

// La fenêtre du timbre remporté : « Voir le timbre » mène à sa fiche.
export async function annoncerLAdjudication(enchere: Enchere, mot: string, prix: number): Promise<void> {
  if (await demanderConfirmation({ seul: true, surtitre: 'Adjugé', titre: `« ${mot} » est à toi`, message: `Pour ${prix.toLocaleString('fr-FR')} Encre : il est déjà dans ton album.`, confirmer: 'Voir le timbre' })) {
    window.location.hash = lien({ ecran: 'carte', id: enchere.carte });
  }
}

// Acheter au prix d'achat immédiat, après confirmation ; rend le retour à afficher (null : le joueur a renoncé).
export async function acheterToutDeSuite(enchere: Enchere, mot: string): Promise<Retour | null> {
  const prix = enchere.achatImmediat;
  if (prix === null) return null;
  if (!(await demanderConfirmation({
    titre: `Acheter « ${mot} » ?`, message: `Tout de suite, pour ${prix.toLocaleString('fr-FR')} Encre : l’enchère s’arrête et le timbre entre dans ton album.`, confirmer: `Acheter pour ${prix.toLocaleString('fr-FR')} Encre`,
  }))) return null;
  try {
    await encherir(enchere.id, prix);
    void annoncerLAdjudication(enchere, mot, prix);
    return { ton: 'succes', texte: `« ${mot} » est à toi.` };
  } catch (erreur) {
    return { ton: 'erreur', texte: messageDe(erreur) };
  }
}

export function FormulaireDeMise({ enchere, mot, encre, onFini, onAnnuler }: {
  enchere: Enchere; mot: string; encre: number; onFini: (retour: Retour) => void; onAnnuler: () => void;
}) {
  const minimum = miseMinimale(enchere, REGLES);
  const [montant, setMontant] = useState(String(minimum));
  const [occupe, setOccupe] = useState(false);
  const envoyer = async (evenement: FormEvent): Promise<void> => {
    evenement.preventDefault();
    const valeur = Math.floor(Number(montant));
    if (!Number.isFinite(valeur) || valeur < minimum) { onFini({ ton: 'erreur', texte: `La mise doit être d’au moins ${minimum.toLocaleString('fr-FR')} Encre.` }); return; }
    const disponible = encre + (enchere.enTete ? enchere.meilleureMise ?? 0 : 0);
    if (valeur > disponible) { onFini({ ton: 'erreur', texte: `Il te manque ${(valeur - disponible).toLocaleString('fr-FR')} Encre pour cette mise.` }); return; }
    setOccupe(true);
    try {
      const apres = await encherir(enchere.id, valeur);
      if (apres.etat === 'vendue') {
        void annoncerLAdjudication(enchere, mot, apres.prixFinal ?? valeur);
        onFini({ ton: 'succes', texte: `« ${mot} » est à toi.` });
      } else {
        onFini({ ton: 'succes', texte: `Tu es en tête avec ${valeur.toLocaleString('fr-FR')} Encre, mis de côté jusqu’à la fin de l’enchère.` });
      }
    } catch (erreur) {
      onFini({ ton: 'erreur', texte: messageDe(erreur) });
    } finally {
      setOccupe(false);
    }
  };
  return (
    <form className="formulaire-mise" onSubmit={(e) => void envoyer(e)}>
      <label htmlFor={`mise-${enchere.id}`}>Ta mise (au moins {minimum.toLocaleString('fr-FR')} Encre)</label>
      <input id={`mise-${enchere.id}`} type="number" inputMode="numeric" min={minimum} step={1} value={montant} onChange={(e) => setMontant(e.target.value)} autoFocus />
      <div className="rangee-de-boutons">
        <button type="submit" className="bouton" disabled={occupe}>{occupe ? 'Envoi…' : 'Miser'}</button>
        <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={onAnnuler}>Annuler</button>
      </div>
    </form>
  );
}
