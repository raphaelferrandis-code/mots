import { it } from 'node:test';
import assert from 'node:assert/strict';
import { creerAuthentification } from './authentification.ts';

const JETONS = { access_token: 'nouveau', refresh_token: 'secret-test', expires_in: 3600 };
function monde(options: { anonyme?: boolean; refuse?: string; google?: boolean; mauvaisCompte?: boolean; jeton?: string } = {}) {
  const appels: { url: URL; methode: string; corps: Record<string, unknown>; acces: string | null }[] = [];
  const auth = creerAuthentification({
    adresse: 'https://exemple.supabase.co/', clePublique: 'publique', maintenant: () => 1000,
    lireSession: async () => ({ acces: 'invite', renouvellement: 'r', expireLe: 999999 }),
    ...(options.jeton ? { jetonAntiRobot: async () => options.jeton } : {}),
    requete: (async (entree, init) => {
      const url = new URL(String(entree)); const acces = new Headers(init?.headers).get('Authorization');
      const corps = JSON.parse(String(init?.body ?? '{}'));
      appels.push({ url, methode: init?.method ?? 'GET', corps, acces });
      if (options.refuse && url.pathname !== '/auth/v1/user') return Response.json({ error_code: options.refuse }, { status: 400 });
      if (url.pathname.endsWith('/settings')) return Response.json({ external: { google: options.google ?? true } });
      if (url.pathname.endsWith('/identities/authorize')) return Response.json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?state=opaque' });
      if (url.pathname.endsWith('/user')) return Response.json({ id: options.mauvaisCompte && acces === 'Bearer nouveau' ? 'autre' : 'joueur', is_anonymous: acces === 'Bearer nouveau' ? false : options.anonyme ?? true, email: 'joueur@example.fr' });
      if (url.pathname.endsWith('/verify') || url.pathname.endsWith('/token')) return Response.json(JETONS);
      if (url.pathname.endsWith('/logout')) return new Response(null, { status: 204 });
      return Response.json({});
    }) as typeof fetch,
  });
  return { auth, appels };
}

it('crée le compte e-mail en rattachant l’invité, puis vérifie le code et la même identité', async () => {
  const { auth, appels } = monde();
  const attente = await auth.envoyerCode(' joueur@example.fr ', 'creation');
  assert.deepEqual(attente, { email: 'joueur@example.fr', type: 'email_change', utilisateur: 'joueur' });
  const miseAJour = appels.find(a => a.methode === 'PUT')!;
  assert.equal(miseAJour.acces, 'Bearer invite'); assert.deepEqual(miseAJour.corps, { email: 'joueur@example.fr' });
  assert.deepEqual(await auth.verifierCode(attente, '123 456'), { acces: 'nouveau', renouvellement: 'secret-test', expireLe: 3601000 });
  assert.equal(appels.find(a => a.url.pathname.endsWith('/verify'))!.corps.type, 'email_change');
  assert.equal(appels.at(-1)!.acces, 'Bearer nouveau');
  assert.ok(!appels.some(a => a.url.pathname.endsWith('/signup')));
});
it('la connexion e-mail ne crée pas de compte et n’utilise pas la session invitée', async () => {
  const { auth, appels } = monde();
  const attente = await auth.envoyerCode('joueur@example.fr', 'connexion');
  assert.deepEqual(appels[0].corps, { email: 'joueur@example.fr', create_user: false });
  assert.equal(appels[0].acces, null);
  await auth.verifierCode(attente, '12345678');
  assert.equal(appels[1].corps.type, 'email');
});
it('joint le jeton anti-robot à l’envoi du code de connexion, pas à la création par rattachement', async () => {
  const { auth, appels } = monde({ jeton: 'jeton-cloudflare' });
  await auth.envoyerCode('joueur@example.fr', 'connexion');
  assert.deepEqual(appels[0].corps, { email: 'joueur@example.fr', create_user: false, gotrue_meta_security: { captcha_token: 'jeton-cloudflare' } });
  await auth.envoyerCode('joueur@example.fr', 'creation');
  assert.deepEqual(appels.find(a => a.methode === 'PUT')!.corps, { email: 'joueur@example.fr' });
  await assert.rejects(monde({ refuse: 'captcha_failed' }).auth.envoyerCode('joueur@example.fr', 'connexion'), /anti-robot/);
});
it('refuse une conversion si la collection appartient déjà à un compte permanent', async () => {
  const { auth, appels } = monde({ anonyme: false });
  await assert.rejects(auth.envoyerCode('joueur@example.fr', 'creation'), /déjà un compte/);
  assert.equal(appels.length, 1);
});
it('refuse un code incomplet, un code expiré et une identité inattendue sans installer de session', async () => {
  const { auth, appels } = monde();
  await assert.rejects(auth.verifierCode({ email: 'joueur@example.fr', type: 'email' }, '12'), /Recopie/);
  assert.equal(appels.length, 0);
  await assert.rejects(monde({ refuse: 'otp_expired' }).auth.verifierCode({ email: 'joueur@example.fr', type: 'email' }, '123456'), /expiré/);
  await assert.rejects(monde({ mauvaisCompte: true }).auth.verifierCode({ email: 'joueur@example.fr', type: 'email_change', utilisateur: 'joueur' }, '123456'), /ne correspond pas/);
});
it('rend les refus du serveur compréhensibles', async () => {
  await assert.rejects(monde({ refuse: 'over_email_send_rate_limit' }).auth.envoyerCode('joueur@example.fr', 'connexion'), /une minute/);
  await assert.rejects(monde({ google: false }).auth.preparerGoogle('connexion', 'https://jeu.fr/'), /activée/);
});
it('Google utilise PKCE, conserve le sous-dossier et échange le code avec son vérificateur', async () => {
  const { auth, appels } = monde();
  const { url, attente } = await auth.preparerGoogle('connexion', 'https://jeu.fr/mots/');
  const adresse = new URL(url);
  assert.equal(adresse.searchParams.get('redirect_to'), 'https://jeu.fr/mots/');
  assert.equal(adresse.searchParams.get('code_challenge_method'), 's256');
  assert.ok(!url.includes(attente.verificateur));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(attente.verificateur));
  assert.equal(adresse.searchParams.get('code_challenge'), Buffer.from(digest).toString('base64url'));
  await auth.terminerGoogle('code-google', attente);
  assert.deepEqual(appels.find(a => a.url.pathname.endsWith('/token'))!.corps, { auth_code: 'code-google', code_verifier: attente.verificateur });
});
it('Google rattache explicitement l’identité à l’invité lors de la création', async () => {
  const { auth, appels } = monde();
  const { attente } = await auth.preparerGoogle('creation', 'https://jeu.fr/');
  assert.equal(attente.utilisateur, 'joueur');
  const appel = appels.find(a => a.url.pathname.endsWith('/identities/authorize'))!;
  assert.equal(appel.acces, 'Bearer invite'); assert.equal(appel.url.searchParams.get('skip_http_redirect'), 'true');
});
it('refuse un retour Google expiré avant tout appel réseau', async () => {
  const { auth, appels } = monde();
  await assert.rejects(auth.terminerGoogle('code', { verificateur: 'test', creeLe: -600000 }), /expiré/);
  assert.equal(appels.length, 0);
});
it('la déconnexion révoque seulement la session courante', async () => {
  const { auth, appels } = monde(); await auth.deconnecter();
  assert.equal(appels[0].url.searchParams.get('scope'), 'local');
  assert.equal(appels[0].acces, 'Bearer invite');
});
