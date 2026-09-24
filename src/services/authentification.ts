import type { Session } from './supabase.ts';

export type Utilisateur = { id: string; email?: string; is_anonymous: boolean };
export type ModeConnexion = 'creation' | 'connexion';
export type VerificationMail = { email: string; type: 'email' | 'email_change'; utilisateur?: string };
export type RetourGoogle = { verificateur: string; utilisateur?: string; creeLe: number };
type Jetons = { access_token?: string; refresh_token?: string; expires_in?: number };

const PANNE = 'La connexion est indisponible. Vérifie ton réseau et réessaie.';
const ERREURS: Record<string, string> = {
  otp_expired: 'Ce code est incorrect ou a expiré. Demande un nouveau code.',
  over_email_send_rate_limit: 'Patiente une minute avant de demander un nouveau code.',
  over_request_rate_limit: 'Trop de tentatives. Patiente quelques instants avant de réessayer.',
  email_exists: 'Cette adresse possède déjà un compte. Choisis « Se connecter ».',
  user_already_exists: 'Cette adresse possède déjà un compte. Choisis « Se connecter ».',
  identity_already_exists: 'Ce compte Google est déjà utilisé. Choisis « Se connecter ».',
  manual_linking_disabled: 'La création avec Google doit encore être activée pour le jeu.',
  provider_disabled: 'La connexion avec Google doit encore être activée pour le jeu.',
  email_provider_disabled: 'La connexion par e-mail doit encore être activée pour le jeu.',
  signup_disabled: 'La création de comptes est momentanément indisponible.',
  email_address_invalid: 'Vérifie ton adresse e-mail.',
  email_address_not_authorized: 'L’envoi d’e-mails doit encore être configuré pour le jeu.',
  validation_failed: 'Vérifie les informations saisies et réessaie.',
};

export function creerAuthentification(io: {
  adresse: string; clePublique: string; requete: typeof fetch;
  lireSession(): Promise<Session>; maintenant(): number;
}) {
  const base = `${io.adresse.replace(/\/+$/, '')}/auth/v1`;
  async function demander<T>(chemin: string, methode = 'GET', corps?: object, acces?: string): Promise<T> {
    let reponse: Response;
    try {
      reponse = await io.requete(`${base}/${chemin}`, {
        method: methode,
        headers: { apikey: io.clePublique, 'Content-Type': 'application/json', ...(acces ? { Authorization: `Bearer ${acces}` } : {}) },
        ...(corps ? { body: JSON.stringify(corps) } : {}), signal: AbortSignal.timeout(20_000),
      });
    } catch { throw new Error(PANNE); }
    const lu = reponse.status === 204 ? null : await reponse.json().catch(() => null);
    if (!reponse.ok) throw new Error(ERREURS[lu?.error_code ?? lu?.code] ?? (reponse.status === 429 ? ERREURS.over_request_rate_limit : reponse.status >= 500 ? PANNE : 'Connexion refusée. Vérifie tes informations ou demande un nouveau code.'));
    return lu as T;
  }

  async function utilisateur(acces?: string): Promise<Utilisateur> {
    const lu = await demander<Utilisateur>('user', 'GET', undefined, acces ?? (await io.lireSession()).acces);
    if (!lu || typeof lu.id !== 'string' || typeof lu.is_anonymous !== 'boolean') throw new Error(PANNE);
    return lu;
  }
  async function invite(): Promise<{ acces: string; id: string }> {
    const { acces } = await io.lireSession();
    const u = await utilisateur(acces);
    if (!u.is_anonymous) throw new Error('Tu as déjà un compte. Déconnecte-toi pour en utiliser un autre.');
    return { acces, id: u.id };
  }
  // Les jetons reçus ne deviennent actifs qu'après validation du compte par Supabase.
  async function verifierSession(jetons: Jetons, attendu?: string): Promise<Session> {
    if (!jetons?.access_token || !jetons.refresh_token || typeof jetons.expires_in !== 'number' || jetons.expires_in <= 0) throw new Error(PANNE);
    const u = await utilisateur(jetons.access_token);
    if (u.is_anonymous || (attendu && u.id !== attendu)) throw new Error('Le compte retourné ne correspond pas à cette création. Recommence depuis Mon compte.');
    return { acces: jetons.access_token, renouvellement: jetons.refresh_token, expireLe: io.maintenant() + jetons.expires_in * 1000 };
  }
  async function envoyerCode(saisie: string, mode: ModeConnexion): Promise<VerificationMail> {
    const email = saisie.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Saisis une adresse e-mail valide.');
    if (mode === 'creation') {
      const u = await invite();
      await demander('user', 'PUT', { email }, u.acces);
      return { email, type: 'email_change', utilisateur: u.id };
    }
    await demander('otp', 'POST', { email, create_user: false });
    return { email, type: 'email' };
  }
  async function verifierCode(attente: VerificationMail, saisie: string): Promise<Session> {
    const token = saisie.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(token)) throw new Error('Recopie le code reçu par e-mail.');
    const jetons = await demander<Jetons>('verify', 'POST', { email: attente.email, type: attente.type, token });
    return verifierSession(jetons, attente.utilisateur);
  }
  async function preparerGoogle(mode: ModeConnexion, retour: string): Promise<{ url: string; attente: RetourGoogle }> {
    const reglages = await demander<{ external?: { google?: boolean } }>('settings');
    if (!reglages?.external?.google) throw new Error(ERREURS.provider_disabled);
    const u = mode === 'creation' ? await invite() : undefined;
    const verificateur = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
    const empreinte = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificateur)));
    const challenge = btoa(String.fromCharCode(...empreinte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const parametres = new URLSearchParams({ provider: 'google', redirect_to: retour, code_challenge: challenge, code_challenge_method: 's256', scopes: 'email profile' });
    let url = `${base}/authorize?${parametres}`;
    if (u) {
      parametres.set('skip_http_redirect', 'true');
      const reponse = await demander<{ url: string }>(`user/identities/authorize?${parametres}`, 'GET', undefined, u.acces);
      url = reponse?.url;
      // Le serveur d'authentification choisit la destination Google, jamais une entrée du formulaire.
      if (!url || new URL(url).protocol !== 'https:') throw new Error(PANNE);
    }
    return { url, attente: { verificateur, utilisateur: u?.id, creeLe: io.maintenant() } };
  }
  async function terminerGoogle(code: string, attente: RetourGoogle): Promise<Session> {
    if (!attente?.verificateur || !Number.isFinite(attente.creeLe) || io.maintenant() - attente.creeLe > 10 * 60_000) throw new Error('Cette connexion a expiré. Recommence avec Google.');
    return verifierSession(await demander<Jetons>('token?grant_type=pkce', 'POST', { auth_code: code, code_verifier: attente.verificateur }), attente.utilisateur);
  }
  async function deconnecter(): Promise<void> {
    const { acces } = await io.lireSession();
    await demander('logout?scope=local', 'POST', undefined, acces);
  }
  return { utilisateur, envoyerCode, verifierCode, preparerGoogle, terminerGoogle, deconnecter };
}
