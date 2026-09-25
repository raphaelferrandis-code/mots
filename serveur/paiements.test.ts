import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { creerStripe, lireDroits, liste, PRIX, verifierPrix, verifierSignature } from '../supabase/functions/_shared/stripe.ts';
import type { Objet, Stripe } from '../supabase/functions/_shared/stripe.ts';
import { creerPaiements } from '../supabase/functions/_shared/paiements.ts';
import { PRIX as PRIX_TEST, PRIX_PRODUCTION } from '../supabase/functions/_shared/stripe.ts';

const signature = async (corps: string, temps = Math.floor(Date.now() / 1000)) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_test'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${temps}.${corps}`)));
  return `t=${temps},v1=${Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('')}`;
};

it('Stripe : refuse une clé réelle, un prix erroné, une signature altérée ou périmée', async () => {
  assert.throws(() => creerStripe('sk_live_interdit'), /test/);
  const prix = { id: PRIX.collectionneur.id, livemode: false, active: true, currency: 'eur', unit_amount: 499, type: 'recurring', recurring: { interval: 'month', interval_count: 1 } };
  verifierPrix(prix, 'collectionneur');
  assert.throws(() => verifierPrix({ ...prix, unit_amount: 500 }, 'collectionneur'));
  assert.throws(() => verifierPrix({ ...prix, livemode: true }, 'collectionneur'));
  const corps = '{"id":"evt_test"}';
  assert.equal(await verifierSignature(corps, await signature(corps), 'whsec_test'), true);
  assert.equal(await verifierSignature(corps + ' ', await signature(corps), 'whsec_test'), false);
  assert.equal(await verifierSignature(corps, await signature(corps, 1000), 'whsec_test'), false);
});

for (const mode of ['test', 'production'] as const) it(`Stripe ${mode} : droits, renouvellement, refus, résiliation et remboursement`, async () => {
  const PRIX = mode === 'production' ? PRIX_PRODUCTION : PRIX_TEST;
  const reel = mode === 'production';
  let rembourseAlbum = 0; let rembourseAbonnement = 0; let finAbonnement: number | null = null;
  let facturePayee = true; let renouvellement = false; let litige = false; let aEcheance = false;
  const stripe: Stripe = async path => {
    const p = new URL(`https://stripe.invalid/${path}`);
    const result = (data: Objet[]) => ({ data, has_more: false });
    if (p.pathname === '/checkout/sessions') return result([{ id: 'cs_album', livemode: reel, metadata: { compte: 'compte', offre: 'necessaire' }, mode: 'payment', status: 'complete', payment_status: 'paid', payment_intent: 'pi_album' }]);
    if (p.pathname === '/checkout/sessions/cs_album/line_items') return result([{ price: { id: PRIX.necessaire.id }, quantity: 1 }]);
    if (p.pathname === '/charges') {
      const album = p.searchParams.get('payment_intent') === 'pi_album';
      return result([{ livemode: reel, customer: 'cus_test', paid: true, status: 'succeeded', amount: album ? 599 : 499, amount_refunded: album ? rembourseAlbum : rembourseAbonnement, disputed: litige }]);
    }
    if (p.pathname === '/subscriptions') return result([{ id: 'sub_test', livemode: reel, metadata: { compte: 'compte', offre: 'collectionneur' }, status: finAbonnement ? 'canceled' : 'active', ended_at: finAbonnement, cancel_at_period_end: aEcheance }]);
    if (p.pathname === '/invoices') return result(facturePayee ? [{ id: 'in_test', livemode: reel, customer: 'cus_test', paid: true, amount_paid: 499, payment_intent: 'pi_sub' }] : []);
    if (p.pathname === '/invoices/in_test/lines') return result([{ price: { id: PRIX.collectionneur.id }, quantity: 1, proration: false, period: { end: renouvellement ? 3000 : 2000 } }]);
    throw new Error(path);
  };
  const droits = () => lireDroits(stripe, 'cus_test', 'compte', mode);
  const initial = await droits();
  assert.deepEqual(initial, { album: true, ouvert: true, fin: new Date(2000_000).toISOString(), renouvele: true });
  assert.deepEqual(await droits(), initial, 'répéter une notification ne change pas les droits');
  facturePayee = false;
  assert.equal((await droits()).fin, null, 'abonnement actif sans facture payée ne suffit pas');
  facturePayee = true; renouvellement = true;
  assert.equal((await droits()).fin, new Date(3000_000).toISOString());
  // Résilié à l'échéance : l'abonnement court encore (ouvert), mais ne se renouvellera plus.
  aEcheance = true;
  assert.deepEqual([(await droits()).ouvert, (await droits()).renouvele], [true, false]);
  aEcheance = false;
  finAbonnement = 2500;
  assert.deepEqual(await droits(), { album: true, ouvert: false, fin: new Date(2500_000).toISOString(), renouvele: false });
  rembourseAlbum = 100;
  assert.equal((await droits()).album, true, 'remboursement partiel : droits conservés');
  rembourseAlbum = 599; rembourseAbonnement = 499;
  assert.deepEqual(await droits(), { album: false, ouvert: false, fin: null, renouvele: false });
  rembourseAlbum = 0; rembourseAbonnement = 0; litige = true;
  assert.deepEqual(await droits(), { album: false, ouvert: false, fin: null, renouvele: false });
});

it('Stripe : parcourt toutes les pages au lieu de perdre les anciens achats', async () => {
  const appels: string[] = [];
  const stripe: Stripe = async path => { appels.push(path); return path.includes('starting_after') ? { data: [{ id: 'b' }], has_more: false } : { data: [{ id: 'a' }], has_more: true }; };
  assert.equal((await liste(stripe, 'checkout/sessions?customer=cus_test')).length, 2);
  assert.match(appels[1], /starting_after=a/);
});

it('paiements SQL : privilèges, verrou, répétition, récupération et remboursement', async () => {
  const { db, ids, joueur, admin } = await baseDeTest();
  try {
    await db.exec('create role service_role bypassrls;');
    const migration = readFileSync(new URL('./8-paiements-test.sql', import.meta.url), 'utf8');
    await db.exec(migration); await db.exec(migration);
    await joueur(0);
    await assert.rejects(db.query('select public.preparer_paiement_test($1)', [ids[0]]), /permission denied/);
    await assert.rejects(db.query('select * from public.paiements_test'), /permission denied/);
    await admin();
    await db.exec('set role service_role;');
    const prepare = (await db.query<{ id: string }>("select public.preparer_paiement_test($1)->>'id' as id", [ids[0]])).rows[0];
    const verrou = async () => (await db.query<{ verrou: string }>("select public.verrouiller_paiement_test($1)->>'verrou' as verrou", [prepare.id])).rows[0].verrou;
    const v = await verrou();
    await assert.rejects(verrou(), /synchronisation/);
    const appliquer = (token: string, album: boolean, fin: string | null) => db.query('select public.appliquer_paiement_test($1,$2,$3,$4,$5)', [prepare.id, token, album, fin, fin !== null]);
    const fin = new Date(Date.now() + 30 * 86400_000).toISOString();
    await appliquer(v, true, fin);
    const lecture = async () => (await db.query<{ achat_unique: boolean; reference: string; prochain_hebdo: string; cadeau_achat_reclame: boolean }>('select achat_unique, reference, prochain_hebdo, cadeau_achat_reclame from public.comptes where utilisateur=$1', [ids[0]])).rows[0];
    const premier = await lecture();
    await appliquer(v, true, fin);
    assert.deepEqual(await lecture(), premier, 'aucun changement de rythme ni nouveau cadeau');
    await db.query('select public.liberer_paiement_test($1,$2)', [prepare.id, v]);
    const v2 = await verrou();
    await assert.rejects(appliquer(v, false, null), /expirée/);
    await appliquer(v2, false, null);
    assert.equal((await lecture()).achat_unique, false);
    await db.query('select public.liberer_paiement_test($1,$2)', [prepare.id, v2]);
    await admin();
    await db.query('update public.comptes set cadeau_achat_reclame=true where utilisateur=$1', [ids[0]]);
    await joueur(0);
    await assert.rejects(db.query('select public.supprimer_mon_compte()'), /lié à un test/);
    await db.query("select public.definir_un_code_de_secours('ABCDEABCDEABCDEABCDE')");
    await joueur(1);
    await db.query("select public.recuperer_par_code('ABCDEABCDEABCDEABCDE')");
    await admin();
    const transfere = (await db.query<{ utilisateur: string }>('select utilisateur from public.paiements_test where id=$1', [prepare.id])).rows[0];
    assert.equal(transfere.utilisateur, ids[1], 'le client Stripe suit la collection');
    assert.equal((await db.query<{ cadeau_achat_reclame: boolean }>('select cadeau_achat_reclame from public.comptes where utilisateur=$1', [ids[1]])).rows[0].cadeau_achat_reclame, true);
  } finally { await db.close(); }
});

it('HTTP : refus sans session, hors liste de test, origine étrangère et webhook non signé', async () => {
  const config = { supabase: 'https://supabase.invalid', service: 'service_test', stripe: 'sk_test_factice', signature: 'whsec_test', site: 'https://philamots.fr', testeurs: ['autorise'] };
  let appels = 0;
  const app = creerPaiements(config, async () => { appels++; return Response.json({ id: 'autre' }); });
  const request = (headers: Record<string, string>) => new Request('https://edge.invalid', { method: 'POST', headers, body: JSON.stringify({ action: 'achat', offre: 'necessaire', utilisateur: 'autorise' }) });
  assert.equal((await app.paiement(request({ origin: 'https://etranger.invalid' }))).status, 403);
  assert.equal((await app.paiement(request({ origin: 'https://philamots.fr' }))).status, 401);
  assert.equal(appels, 0);
  assert.equal((await app.paiement(request({ origin: 'https://philamots.fr', authorization: 'Bearer jeton' }))).status, 403);
  assert.equal((await app.webhook(request({}))).status, 400);
  assert.equal(appels, 1);
});

for (const mode of ['test', 'production'] as const) it(`HTTP ${mode} : Checkout unique et droits uniquement après confirmation`, async () => {
  const PRIX = mode === 'production' ? PRIX_PRODUCTION : PRIX_TEST;
  const reel = mode === 'production';
  const id = '11111111-1111-4111-8111-111111111111';
  const liaison: Objet = { id: 'compte', utilisateur: id, client_stripe: 'cus_test', verrou: 'verrou', sessions: {} };
  let checkout = 0; let paye = false; let album = false; let panne = false;
  const network: typeof fetch = async (input, options) => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/user') return Response.json({ id });
    if (url.pathname === '/rest/v1/comptes') return Response.json([{ annee_de_naissance: 1990, mois_de_naissance: 6, code_defini_le: '2026-01-01' }]);
    if (url.pathname === `/rest/v1/paiements_${mode}`) return Response.json([liaison]);
    if (url.pathname.includes('/rest/v1/rpc/')) {
      const nom = url.pathname.split('/').at(-1)?.replace('_production', '_test');
      const body = JSON.parse(String(options?.body));
      if (nom === 'preparer_paiement_test') { assert.equal(body.p_utilisateur, id); return Response.json(liaison); }
      if (nom === 'verrouiller_paiement_test') return Response.json(liaison);
      if (nom === 'enregistrer_paiement_test') liaison.sessions = body.p_sessions;
      if (nom === 'appliquer_paiement_test') album = body.p_album;
      return Response.json(null);
    }
    if (panne) return Response.json({}, { status: 500 });
    if (url.pathname === `/v1/prices/${PRIX.necessaire.id}`) return Response.json({ id: PRIX.necessaire.id, unit_amount: 599, active: true, type: 'one_time', currency: 'eur', livemode: reel });
    if (url.pathname === '/v1/checkout/sessions' && options?.method === 'POST') {
      checkout++;
      const body = new URLSearchParams(String(options.body));
      assert.equal(body.get('line_items[0][price]'), PRIX.necessaire.id);
      assert.equal(body.get('customer'), 'cus_test');
      assert.equal(body.get('client_reference_id'), 'compte');
      return Response.json({ id: 'cs_test', url: 'https://checkout.stripe.com/test', livemode: reel });
    }
    if (url.pathname === '/v1/checkout/sessions/cs_test') return Response.json({ status: 'open', url: 'https://checkout.stripe.com/test' });
    if (url.pathname === '/v1/customers/cus_test') return Response.json({ metadata: { application: `philamots-${mode}`, compte: 'compte' }, livemode: reel });
    let data: Objet[] = [];
    if (paye && url.pathname === '/v1/checkout/sessions') data = [{ id: 'cs_test', livemode: reel, metadata: { compte: 'compte', offre: 'necessaire' }, mode: 'payment', status: 'complete', payment_status: 'paid', payment_intent: 'pi_test' }];
    if (url.pathname === '/v1/checkout/sessions/cs_test/line_items') data = [{ price: { id: PRIX.necessaire.id }, quantity: 1 }];
    if (url.pathname === '/v1/charges') data = [{ livemode: reel, customer: 'cus_test', paid: true, status: 'succeeded', amount: 599, amount_refunded: 0 }];
    return Response.json({ data, has_more: false });
  };
  const app = creerPaiements({ supabase: 'https://supabase.invalid', service: 'service', stripe: reel ? 'sk_live_factice' : 'sk_test_factice', signature: 'whsec_test', site: 'https://philamots.fr', testeurs: [id], mode, achatsOuverts: true }, network);
  const achat = () => app.paiement(new Request('https://edge.invalid', { method: 'POST', headers: { origin: 'https://philamots.fr', authorization: 'Bearer jeton' }, body: JSON.stringify({ action: 'achat', offre: 'necessaire', prix: 'price_faux', utilisateur: 'autre' }) }));
  assert.equal((await achat()).status, 200);
  assert.equal((await achat()).status, 200);
  assert.equal(checkout, 1);
  assert.equal(album, false, 'ouvrir Checkout ne débloque rien');
  paye = true;
  const event = JSON.stringify({ id: 'evt_test', livemode: reel, type: 'checkout.session.completed', data: { object: { customer: 'cus_test' } } });
  const notifier = async () => app.webhook(new Request('https://edge.invalid', { method: 'POST', headers: { 'stripe-signature': await signature(event) }, body: event }));
  assert.equal((await notifier()).status, 200);
  assert.equal(album, true);
  assert.equal((await notifier()).status, 200);
  assert.equal((await achat()).status, 409, 'pas de second achat actif');
  panne = true;
  assert.equal((await notifier()).status, 503, 'Stripe doit réessayer si la synchronisation échoue');
});
