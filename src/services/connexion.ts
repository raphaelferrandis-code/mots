import { SERVEUR } from '../config/serveur.ts';
import { CLE_IDENTITE, clientDuServeur, jetonAntiRobot, serveurUtilise } from './compte.ts';
import { creerAuthentification } from './authentification.ts';
import type { RetourGoogle } from './authentification.ts';
import type { Session } from './supabase.ts';

const CLE_GOOGLE = 'mots.connexion-google';
export const authentification = creerAuthentification({
  adresse: SERVEUR.adresse, clePublique: SERVEUR.clePublique,
  requete: (...args) => fetch(...args), lireSession: () => clientDuServeur().lireSession(), maintenant: Date.now, jetonAntiRobot,
});

export function verifierStockageConnexion(): void {
  try { sessionStorage.setItem('mots.test-connexion', 'oui'); sessionStorage.removeItem('mots.test-connexion'); localStorage.setItem('mots.test-connexion', 'oui'); localStorage.removeItem('mots.test-connexion'); }
  catch { throw new Error('Autorise le stockage de ce site dans ton navigateur pour te connecter.'); }
}

export function installerConnexion(session: Session | null, conserverCollection: boolean): void {
  verifierStockageConnexion();
  // Invalider les anciens clients avant de rendre les nouveaux jetons visibles.
  if (!conserverCollection) localStorage.setItem(CLE_IDENTITE, crypto.randomUUID());
  if (session) localStorage.setItem('mots.session', JSON.stringify(session));
  else localStorage.removeItem('mots.session');
  localStorage.setItem('mots.connexion-modifiee', crypto.randomUUID());
}

export async function connexionGoogle(mode: 'creation' | 'connexion'): Promise<void> {
  verifierStockageConnexion();
  const retour = new URL(window.location.href);
  retour.hash = ''; retour.search = '';
  const { url, attente } = await authentification.preparerGoogle(mode, retour.href);
  sessionStorage.setItem(CLE_GOOGLE, JSON.stringify(attente));
  window.location.assign(url);
}

export let erreurDuRetour: string | null = null;
// Exécuté avant de démarrer React : aucune requête du jeu ne part avec l'ancienne identité.
export async function traiterRetourConnexion(): Promise<void> {
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('code');
  const erreur = url.searchParams.get('error') ?? fragment.get('error');
  if (!code && !erreur) return;
  url.searchParams.delete('code'); url.searchParams.delete('error');
  url.searchParams.delete('error_description'); url.searchParams.delete('error_code');
  url.hash = '/compte';
  window.history.replaceState(null, '', url);
  try {
    if (!serveurUtilise) throw new Error('La connexion nécessite le serveur du jeu.');
    if (erreur) throw new Error('La connexion Google a été annulée ou refusée. Tu peux réessayer.');
    const brut = sessionStorage.getItem(CLE_GOOGLE);
    if (!brut) throw new Error('Recommence la connexion Google depuis ce navigateur.');
    const attente = JSON.parse(brut) as RetourGoogle;
    const session = await authentification.terminerGoogle(code!, attente);
    installerConnexion(session, !!attente.utilisateur);
  } catch (e) { erreurDuRetour = e instanceof Error ? e.message : 'Connexion impossible. Réessaie.'; }
  finally { try { sessionStorage.removeItem(CLE_GOOGLE); } catch { /* erreur déjà affichée */ } }
}

export function surveillerConnexion(): void {
  window.addEventListener('storage', e => {
    if (e.key === 'mots.connexion-modifiee') window.location.reload();
  });
}
