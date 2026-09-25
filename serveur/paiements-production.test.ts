import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { creerPaiements } from '../supabase/functions/_shared/paiements.ts';
import { creerStripe, PRIX, PRIX_PRODUCTION, verifierPrix, VERSION_STRIPE } from '../supabase/functions/_shared/stripe.ts';
import { configuration } from '../supabase/functions/_shared/configuration.ts';

const config = { mode: 'production' as const, supabase: 'https://supabase.invalid', service: 'service', stripe: 'sk_live_factice', signature: 'whsec_live', site: 'https://philamots.fr', testeurs: [] };

it('Stripe : clés restreintes acceptées sans mélange des environnements ni clé publique', async () => {
  for (const mode of ['test', 'production'] as const) {
    const environnement = mode === 'production' ? 'live' : 'test';
    const cle = `rk_${environnement}_factice`;
    const stripe = creerStripe(cle, async (_url, options) => {
      assert.equal(new Headers(options?.headers).get('authorization'), `Bearer ${cle}`);
      return Response.json({ livemode: mode === 'production' });
    }, mode);
    await stripe('account');
    assert.throws(() => creerStripe(`rk_${mode === 'production' ? 'test' : 'live'}_factice`, fetch, mode), /incompatible/);
    assert.throws(() => creerStripe(`pk_${environnement}_factice`, fetch, mode), /incompatible/);
  }
});

it('production : achats fermés par défaut, sans création de client ni écriture', async () => {
  const appels: string[] = [];
  const app = creerPaiements(config, async url => {
    appels.push(String(url));
    assert.equal(String(url), 'https://supabase.invalid/auth/v1/user');
    return Response.json({ id: 'joueur' });
  });
  const r = await app.paiement(new Request('https://edge.invalid', { method: 'POST', headers: { origin: config.site, authorization: 'Bearer test' }, body: JSON.stringify({ action: 'achat', offre: 'necessaire', achatsOuverts: true, mode: 'test' }) }));
  assert.equal(r.status, 403);
  assert.match((await r.json()).erreur, /pas encore ouverts/);
  assert.equal(appels.length, 1);
  assert.throws(() => creerPaiements({ ...config, site: 'http://127.0.0.1:4175' }), /production/);
  assert.throws(() => creerStripe('sk_test_factice', fetch, 'production'), /incompatible/);
  const prix = { id: PRIX_PRODUCTION.necessaire.id, livemode: true, active: true, unit_amount: 599, currency: 'eur', type: 'one_time' };
  verifierPrix(prix, 'necessaire', 'production');
  assert.throws(() => verifierPrix({ ...prix, id: PRIX.necessaire.id }, 'necessaire', 'production'));
  const stripe = creerStripe('sk_live_factice', async () => Response.json({ data: [{ livemode: false }], has_more: false }), 'production');
  await assert.rejects(stripe('customers'), /mauvais environnement/);
});

it('configuration : secrets distincts et aucune ouverture implicite de la production', () => {
  const globalDeno = globalThis as unknown as { Deno?: { env: { get(n: string): string | undefined } } };
  const ancien = globalDeno.Deno;
  const env: Record<string, string> = { SUPABASE_URL: config.supabase, SUPABASE_SERVICE_ROLE_KEY: 'service', STRIPE_SECRET_KEY: 'sk_test_test', STRIPE_WEBHOOK_SECRET: 'whsec_test', SITE_URL: 'http://127.0.0.1:4175', STRIPE_TEST_USER_IDS: 'joueur', STRIPE_LIVE_SECRET_KEY: config.stripe, STRIPE_LIVE_WEBHOOK_SECRET: config.signature, SITE_URL_PRODUCTION: config.site };
  globalDeno.Deno = { env: { get: n => env[n] } };
  try {
    assert.equal(configuration().stripe, 'sk_test_test');
    assert.equal(configuration('production').stripe, config.stripe);
    assert.equal(configuration('production').signature, 'whsec_live');
    assert.equal(configuration('production').achatsOuverts, false);
    env.PAIEMENTS_PRODUCTION_OUVERTS = 'false';
    assert.equal(configuration('production').achatsOuverts, false);
    env.PAIEMENTS_PRODUCTION_OUVERTS = 'true';
    assert.equal(configuration('production').achatsOuverts, true);
    delete env.STRIPE_LIVE_SECRET_KEY;
    assert.throws(() => configuration('production'), /STRIPE_LIVE_SECRET_KEY/);
  } finally { if (ancien) globalDeno.Deno = ancien; else delete globalDeno.Deno; }
});

it('webhook : instantanés récents et données anciennes ne remplacent pas les lectures API épinglées', async () => {
  const liaison = { id: 'liaison', client_stripe: 'cus_live', verrou: 'verrou', sessions: {} };
  let applications = 0;
  const app = creerPaiements(config, async (input, options) => {
    const url = new URL(String(input));
    if (url.hostname === 'api.stripe.com') {
      assert.equal(new Headers(options?.headers).get('stripe-version'), VERSION_STRIPE);
      if (url.pathname === '/v1/charges/ch_live') return Response.json({ customer: 'cus_live', livemode: true });
      if (url.pathname === '/v1/customers/cus_live') return Response.json({ livemode: true, metadata: { application: 'philamots-production', compte: 'liaison' } });
      assert.ok(['/v1/checkout/sessions', '/v1/subscriptions'].includes(url.pathname));
      return Response.json({ data: [], has_more: false });
    }
    if (url.pathname === '/rest/v1/paiements_production') return Response.json([liaison]);
    if (url.pathname === '/rest/v1/rpc/verrouiller_paiement_production') return Response.json(liaison);
    if (url.pathname === '/rest/v1/rpc/appliquer_paiement_production') {
      assert.deepEqual(JSON.parse(String(options?.body)), { p_id: 'liaison', p_verrou: 'verrou', p_album: false, p_fin: null, p_ouvert: false, p_renouvele: false });
      applications++;
    } else assert.equal(url.pathname, '/rest/v1/rpc/liberer_paiement_production');
    return Response.json(null);
  });
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(config.signature), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  for (const type of ['checkout.session.completed', 'invoice.paid', 'customer.subscription.updated', 'charge.refunded', 'charge.dispute.closed']) {
    const objet = type.startsWith('charge.dispute.') ? { charge: 'ch_live' } : { customer: 'cus_live', status: 'paid', amount_paid: 499, period_end: 9999999999 };
    const corps = JSON.stringify({ api_version: '2026-08-26.dahlia', livemode: true, type, data: { object: objet } });
    const t = Math.floor(Date.now() / 1000);
    const hash = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${corps}`))).toString('hex');
    const r = await app.webhook(new Request('https://edge.invalid', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${hash}` }, body: corps }));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { recu: true });
  }
  assert.equal(applications, 5);
});

it('production fermée : portail existant accessible ; webhook signé du mauvais mode refusé', async () => {
  const appels: string[] = [];
  const liaison = { id: 'liaison', client_stripe: 'cus_live', verrou: 'verrou', sessions: {} };
  const app = creerPaiements(config, async (input, options) => {
    const path = new URL(String(input)).pathname;
    appels.push(path);
    if (path === '/auth/v1/user') return Response.json({ id: 'joueur' });
    if (path === '/rest/v1/comptes') return Response.json([{}]);
    if (path === '/rest/v1/paiements_production') return Response.json([liaison]);
    if (path === '/rest/v1/rpc/verrouiller_paiement_production') return Response.json(liaison);
    if (path === '/rest/v1/rpc/liberer_paiement_production') return Response.json(null);
    if (path === '/v1/billing_portal/configurations') return Response.json({ id: 'config_live', livemode: true });
    if (path === '/v1/billing_portal/sessions') {
      assert.equal(new URLSearchParams(String(options?.body)).get('customer'), 'cus_live');
      return Response.json({ url: 'https://billing.stripe.com/session' });
    }
    throw new Error(`Appel inattendu : ${path}`);
  });
  const r = await app.paiement(new Request('https://edge.invalid', { method: 'POST', headers: { origin: config.site, authorization: 'Bearer test' }, body: JSON.stringify({ action: 'portail' }) }));
  assert.equal(r.status, 200);
  const corps = JSON.stringify({ livemode: false, type: 'invoice.paid', data: { object: { customer: 'cus_test' } } });
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(config.signature), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hash = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${corps}`))).toString('hex');
  const avant = appels.length;
  const w = await app.webhook(new Request('https://edge.invalid', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${hash}` }, body: corps }));
  assert.equal(w.status, 400);
  assert.equal(appels.length, avant);
});

it('SQL production : isolation, droits, cadeau conservé au rachat et récupération', async () => {
  const { db, ids, joueur, admin } = await baseDeTest();
  try {
    await db.exec('create role service_role bypassrls;');
    await db.exec(readFileSync(new URL('./8-paiements-test.sql', import.meta.url), 'utf8'));
    const migration = readFileSync(new URL('./9-paiements-production.sql', import.meta.url), 'utf8');
    await db.exec(migration); await db.exec(migration);
    await joueur(0);
    await assert.rejects(db.query('select * from public.paiements_production'), /permission denied/);
    await assert.rejects(db.query('select public.preparer_paiement_production($1)', [ids[0]]), /permission denied/);
    await admin();
    await db.exec('set role service_role;');
    await db.query('select public.preparer_paiement_test($1)', [ids[0]]);
    await assert.rejects(db.query('select public.preparer_paiement_production($1)', [ids[0]]), /autre environnement/);
    const l = (await db.query<{ id: string }>("select public.preparer_paiement_production($1)->>'id' id", [ids[1]])).rows[0];
    await assert.rejects(db.query('select public.preparer_paiement_test($1)', [ids[1]]), /autre environnement/);
    const v = (await db.query<{ v: string }>("select public.verrouiller_paiement_production($1)->>'verrou' v", [l.id])).rows[0].v;
    const appliquer = (album: boolean, fin: string | null) => db.query('select public.appliquer_paiement_production($1,$2,$3,$4,$5)', [l.id, v, album, fin, !!fin]);
    await appliquer(true, '2027-01-01');
    await admin();
    await db.query('update public.comptes set cadeau_achat_reclame=true where utilisateur=$1', [ids[1]]);
    await db.exec('set role service_role;');
    await appliquer(false, null);
    await appliquer(true, '2027-02-01');
    const c = (await db.query<{ achat_unique: boolean; cadeau_achat_reclame: boolean }>('select achat_unique, cadeau_achat_reclame from public.comptes where utilisateur=$1', [ids[1]])).rows[0];
    assert.equal(c.achat_unique, true);
    assert.equal(c.cadeau_achat_reclame, true);
    await joueur(1);
    await assert.rejects(db.query('select public.supprimer_mon_compte()'), /lié à un paiement/);
    await db.query("select public.definir_un_code_de_secours('ABCDEABCDEABCDEABCDE')");
    await joueur(2);
    await db.query("select public.recuperer_par_code('ABCDEABCDEABCDEABCDE')");
    await admin();
    assert.equal((await db.query<{ utilisateur: string }>('select utilisateur from public.paiements_production where id=$1', [l.id])).rows[0].utilisateur, ids[2]);
  } finally { await db.close(); }
});
