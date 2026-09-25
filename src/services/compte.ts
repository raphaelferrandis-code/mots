// Le compte du joueur sur le serveur (Supabase) : un seul client pour les joutes et les collections, la session
// gardée sur l'appareil, une seule requête qui modifie le compte à la fois, et la règle du développement.

import { SERVEUR } from '../config/serveur.ts';
import { creerAntiRobot } from './antiRobot.ts';
import { creerLeClient } from './supabase.ts';
import type { ClientSupabase, Session } from './supabase.ts';

const CLE_DE_SESSION = 'mots.session';
export const CLE_IDENTITE = 'mots.identite-locale';
export function lireIdentiteLocale(): string | undefined {
  try { return localStorage.getItem(CLE_IDENTITE) ?? undefined; } catch { return undefined; }
}

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
// Le parrainage et l'adversaire de secours, une fois leur script installé sur le serveur.
export const secoursEtParrainage = serveurUtilise && SERVEUR.secoursEtParrainage;
// Le contrôle anti-robot, quand une clé est réglée (voir docs/GUIDE-anti-robot.md).
export const jetonAntiRobot = SERVEUR.cleAntiRobot !== '' ? creerAntiRobot(SERVEUR.cleAntiRobot) : undefined;

let client: ClientSupabase | undefined;
export function clientDuServeur(): ClientSupabase {
  // Les modules du jeu sont chargés avant le retour OAuth. Fixer l'identité
  // seulement au premier appel réseau, après le traitement de ce retour.
  let identiteInitiale: string | undefined;
  let identiteFixee = false;
  client ??= creerLeClient(SERVEUR.adresse, SERVEUR.clePublique, {
    requete: (...args) => {
      if (!identiteFixee) { identiteInitiale = lireIdentiteLocale(); identiteFixee = true; }
      if (lireIdentiteLocale() !== identiteInitiale) return Promise.reject(new Error('Le compte a changé. Recharge la page.'));
      return fetch(...args);
    },
    maintenant: () => Date.now(),
    jetonAntiRobot,
    sessionExclusive: action => typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('mots.session', action) : action(),
    lireLaSession: () => { try { return JSON.parse(localStorage.getItem(CLE_DE_SESSION) ?? 'null') as Session | null; } catch { return null; } },
    ecrireLaSession: (session) => { if (identiteFixee && lireIdentiteLocale() !== identiteInitiale) return; try { if (session) localStorage.setItem(CLE_DE_SESSION, JSON.stringify(session)); else localStorage.removeItem(CLE_DE_SESSION); } catch { /* stockage indisponible : la session vaut pour cette visite */ } },
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
