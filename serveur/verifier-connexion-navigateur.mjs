// Parcours complets sur des réponses locales : aucune requête vers Supabase/Google.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const vite = await createServer({ server: { host: '127.0.0.1', port: 5188, strictPort: true } });
let navigateur;
try {
  await vite.listen();
  navigateur = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
  const erreurs = []; const appels = [];
  let permanent = false; let codeInvalide = false; let google = false; let retourCreation = false;
  const origine = 'http://127.0.0.1:5188/';
  const jetons = acces => ({ access_token: acces, refresh_token: 'refresh-local', expires_in: 3600 });
  const etat = acces => ({ encre: acces === 'autre' ? 90 : acces === 'nouvel-invite' ? 0 : 40, cartes: {}, deck: [],
    paquets: { stock: 3, ouverts: 0, sansLegendaire: 0, reference: Date.now() }, maintenant: Date.now(), codeDeSecoursLe: null,
    progression: { version: 1, id: acces === 'autre' ? 'autre' : 'joueur', xp: 0, bonusXpReste: 0, heritageImporte: true, duels: { joues: 0, gagnes: 0 }, parades: {}, apprentissages: {} } });
  await contexte.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.hostname === '127.0.0.1') return route.continue();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const body = req.postDataJSON() ?? {}; const acces = req.headers().authorization?.replace('Bearer ', '');
    appels.push({ path: url.pathname, acces, body, method: req.method() });
    const repondre = (json, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(json) });
    if (url.hostname === 'accounts.google.com' || url.pathname === '/auth/v1/authorize') return route.fulfill({ status: 302, headers: { location: `${origine}?code=google-local` } });
    if (!url.hostname.endsWith('.supabase.co')) { erreurs.push(`Hôte inattendu : ${url.hostname}`); return route.abort(); }
    switch (url.pathname) {
      case '/auth/v1/settings': return repondre({ external: { google } });
      case '/auth/v1/signup': return repondre(jetons('nouvel-invite'));
      case '/auth/v1/user': return repondre({ id: acces === 'autre' ? 'autre' : 'joueur', email: permanent || acces === 'autre' ? 'joueur@example.fr' : undefined, is_anonymous: acces !== 'autre' && !permanent });
      case '/auth/v1/otp': return repondre({});
      case '/auth/v1/verify':
        if (codeInvalide) return repondre({ error_code: 'otp_expired' }, 403);
        permanent = body.type === 'email_change'; return repondre(jetons(permanent ? 'invite' : 'autre'));
      case '/auth/v1/user/identities/authorize': retourCreation = true; return repondre({ url: 'https://accounts.google.com/o/oauth2/v2/auth' });
      case '/auth/v1/token': permanent = retourCreation; return repondre(jetons(retourCreation ? 'invite' : 'autre'));
      case '/auth/v1/logout': permanent = false; return route.fulfill({ status: 204, headers });
      case '/rest/v1/rpc/mon_compte': return repondre(etat(acces));
      default: erreurs.push(`Requête inattendue : ${url.pathname}`); return repondre({}, 500);
    }
  });
  await contexte.addInitScript(() => {
    localStorage.setItem('mots.vrai-serveur', 'oui');
    if (!localStorage.getItem('initialise-test')) {
      localStorage.setItem('initialise-test', 'oui');
      localStorage.setItem('mots.session', JSON.stringify({ acces: 'invite', renouvellement: 'r', expireLe: Date.now() + 3600000 }));
    }
  });
  const page = await contexte.newPage(); page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(`${origine}#/compte`);
  await page.getByRole('button', { name: 'Recevoir mon code', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Continuer avec Google' }).click();
  await page.getByRole('alert').filter({ hasText: 'activée' }).waitFor();
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('joueur@example.fr');
  await page.getByRole('button', { name: 'Recevoir mon code', exact: true }).click();
  await page.getByLabel('Code de vérification', { exact: true }).fill('123456');
  codeInvalide = true;
  await page.getByRole('button', { name: 'Valider mon compte', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'expiré' }).waitFor();
  codeInvalide = false;
  await page.getByRole('button', { name: 'Valider mon compte', exact: true }).click();
  await page.getByText('Ta collection te suit', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mots.session')).acces), 'invite');
  assert.match(await page.locator('.reserve-encre').innerText(), /40/);
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('joueur@example.fr');
  await page.getByRole('button', { name: 'Recevoir mon code', exact: true }).click();
  await page.getByLabel('Code de vérification', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await page.getByText('Ta collection te suit', { exact: true }).waitFor();
  assert.match(await page.locator('.reserve-encre').innerText(), /90/);
  const autreOnglet = await contexte.newPage();
  await autreOnglet.goto(`${origine}#/compte`);
  await autreOnglet.getByText('Ta collection te suit', { exact: true }).waitFor();
  assert.equal(appels.find(a => a.path === '/auth/v1/otp').body.create_user, false);
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('button', { name: 'Recevoir mon code', exact: true }).waitFor();
  await autreOnglet.getByRole('button', { name: 'Recevoir mon code', exact: true }).waitFor();
  await autreOnglet.close();
  // Création Google : retour traité avant le premier appel RPC du jeu.
  google = true; const debutGoogle = appels.length;
  await page.getByRole('button', { name: 'Continuer avec Google' }).click();
  await page.getByText('Ta collection te suit', { exact: true }).waitFor();
  const apresGoogle = appels.slice(debutGoogle);
  const echange = apresGoogle.findIndex(a => a.path === '/auth/v1/token');
  assert.ok(echange >= 0);
  assert.ok(apresGoogle.slice(echange + 1).find(a => a.path === '/rest/v1/rpc/mon_compte' && a.acces === 'invite'));
  assert.equal(new URL(page.url()).searchParams.has('code'), false);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('mots.connexion-google')), null);
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  retourCreation = false;
  await page.getByRole('button', { name: 'Continuer avec Google' }).click();
  await page.getByText('Ta collection te suit', { exact: true }).waitFor();
  assert.match(await page.locator('.reserve-encre').innerText(), /90/);
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('button', { name: 'Recevoir mon code', exact: true }).waitFor();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `débordement à ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.AUTH_SCREENSHOT) await page.screenshot({ path: process.env.AUTH_SCREENSHOT, fullPage: true });
  await page.goto(`${origine}?error=access_denied&error_description=private#/compte`);
  await page.getByRole('alert').filter({ hasText: 'annulée' }).waitFor();
  assert.equal(new URL(page.url()).search, '');
  assert.deepEqual(erreurs, []);
  console.log('Connexion validée : création e-mail, code refusé, connexion existante, déconnexion, Google PKCE simulé, annulation, collections séparées, mobile 320/390 px. Aucun appel externe.');
} finally { await navigateur?.close(); await vite.close(); }
