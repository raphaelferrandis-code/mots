// Une action qui a de la valeur — ouvrir un paquet, réclamer un cadeau, mettre un timbre en vente — porte un
// identifiant de demande. Si la réponse se perd en route (coupure, délai dépassé), la même action relancée peu après
// reprend le même identifiant : le serveur rend la réponse déjà donnée au lieu de servir deux fois (script 20,
// demandes_traitees). Une réponse du serveur, même un refus, clôt la demande ; une panne la laisse ouverte.

import { ErreurDuServeur } from './supabase.ts';
import type { ClientSupabase } from './supabase.ts';

// Au-delà, la même action est une nouvelle demande (un autre paquet, une autre vente).
export const DUREE_DE_REPRISE = 5 * 60_000;

export type AvecUneDemande = <T>(cle: string, action: (demande: string) => Promise<T>) => Promise<T>;

export function creerLesDemandes(horloge: () => number = Date.now, nouvelle: () => string = () => crypto.randomUUID()): AvecUneDemande {
  const ouvertes = new Map<string, { demande: string; le: number }>();
  return async (cle, action) => {
    const gardee = ouvertes.get(cle);
    const reprise = gardee !== undefined && horloge() - gardee.le < DUREE_DE_REPRISE;
    const demande = reprise ? gardee.demande : nouvelle();
    if (!reprise) ouvertes.set(cle, { demande, le: horloge() });
    try {
      const resultat = await action(demande);
      ouvertes.delete(cle);
      return resultat;
    } catch (erreur) {
      if (erreur instanceof ErreurDuServeur && erreur.refus) ouvertes.delete(cle);
      throw erreur;
    }
  };
}

export const avecUneDemande: AvecUneDemande = creerLesDemandes();

// L'appel d'une fonction de la base avec son identifiant de demande (« p_demande »). Un serveur qui n'a pas encore le
// script 20 ne le connaît pas (fonction introuvable avec ce paramètre) : l'appel est alors refait sans lui.
export function appelerAvecUneDemande<T>(client: Pick<ClientSupabase, 'appeler'>, demandes: AvecUneDemande, cle: string, fonction: string, parametres: Record<string, unknown>): Promise<T> {
  return demandes(cle, async (demande) => {
    try {
      return await client.appeler<T>(fonction, { ...parametres, p_demande: demande });
    } catch (erreur) {
      if (erreur instanceof ErreurDuServeur && erreur.statut === 404) return client.appeler<T>(fonction, parametres);
      throw erreur;
    }
  });
}
