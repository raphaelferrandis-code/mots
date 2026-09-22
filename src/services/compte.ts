// Le compte du joueur sur le serveur (Supabase) : un seul client pour les joutes et les collections, la session
// gardée sur l'appareil, une seule requête qui modifie le compte à la fois, et la règle du développement.

import { SERVEUR } from '../config/serveur.ts';
import { creerLeClient } from './supabase.ts';
import type { ClientSupabase, Session } from './supabase.ts';

const CLE_DE_SESSION = 'mots.session';

// Pendant le développement (« npm run dev »), le jeu ne touche pas au vrai serveur : chaque essai y créerait un vrai
// joueur, visible dans le classement de tout le monde. Pour l'essayer quand même, dans la console du navigateur :
//   localStorage.setItem('mots.vrai-serveur', 'oui')   puis recharger la page (removeItem pour revenir en arrière).
export function vraiServeurPermis(): boolean {
  // (Dans les tests, lancés par Node, il n'y a ni « import.meta.env » ni localStorage.)
  if (import.meta.env?.DEV !== true) return true;
  try { return localStorage.getItem('mots.vrai-serveur') === 'oui'; } catch { return false; }
}

export const serveurRegle = SERVEUR.adresse !== '' && SERVEUR.clePublique !== '';
// Le serveur est réglé, et l'on a le droit de lui parler.
export const serveurUtilise = serveurRegle && vraiServeurPermis();

let client: ClientSupabase | undefined;
export function clientDuServeur(): ClientSupabase {
  client ??= creerLeClient(SERVEUR.adresse, SERVEUR.clePublique, {
    requete: (...args) => fetch(...args),
    maintenant: () => Date.now(),
    lireLaSession: () => { try { return JSON.parse(localStorage.getItem(CLE_DE_SESSION) ?? 'null') as Session | null; } catch { return null; } },
    ecrireLaSession: (session) => { try { if (session) localStorage.setItem(CLE_DE_SESSION, JSON.stringify(session)); else localStorage.removeItem(CLE_DE_SESSION); } catch { /* stockage indisponible : la session vaut pour cette visite */ } },
  });
  return client;
}

// Une requête qui modifie le compte à la fois. Constaté à la première mise en route des joutes (21/09/2026) : deux envois
// simultanés du tout premier profil d'un joueur se gênaient sur le serveur, et le second revenait en erreur (« 409 »).
let file: Promise<unknown> = Promise.resolve();
export function chacunSonTour<T>(tache: () => Promise<T>): Promise<T> {
  const resultat = file.then(tache, tache);
  file = resultat.catch(() => undefined);
  return resultat;
}
