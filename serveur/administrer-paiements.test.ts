import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { administrerPaiements, EVENEMENTS } from './administrer-paiements.ts';
import { creerPaiements } from '../supabase/functions/_shared/paiements.ts';
import { PRIX_PRODUCTION } from '../supabase/functions/_shared/stripe.ts';
import { lireOuverturePaiements } from '../src/services/etat-paiements.ts';

const env = { SUPABASE_ACCESS_TOKEN: 'sbp_factice', STRIPE_LIVE_SECRET_KEY: 'sk_live_factice', STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_factice' };
function banc(panne?: 'prix' | 'site' | 'ouverture' | 'secret' | 'droits' | 'webhook' | 'reponse-perdue' | 'rollback') {
  let ouvert = false;
  const ecritures: boolean[] = [];
  const requete: typeof fetch = async (input, init) => {
    const u = new URL(String(input));
    if (u.hostname === 'api.stripe.com') {
      assert.equal(init?.method, 'GET', 'Aucune création de paiement pendant la vérification');
      if (u.pathname.endsWith('/account')) return Response.json({ charges_enabled: true, payouts_enabled: true, details_submitted: true });
      if (u.pathname.includes('/prices/')) {
        const album = u.pathname.endsWith(PRIX_PRODUCTION.necessaire.id);
        return Response.json({ id: u.pathname.split('/').at(-1), livemode: true, active: true, currency: 'eur', unit_amount: panne === 'prix' ? 100 : album ? 599 : 499, type: album ? 'one_time' : 'recurring', ...(album ? {} : { recurring: { interval: 'month', interval_count: 1 } }) });
      }
      if (u.pathname.endsWith('/webhook_endpoints')) return Response.json({ data: [{ livemode: true, status: 'enabled', url: 'https://cgubfyxyivgufslpwlld.supabase.co/functions/v1/stripe-webhook-production', enabled_events: panne === 'webhook' ? [] : EVENEMENTS }], has_more: false });
    }
    if (u.hostname === 'api.supabase.com') {
      if (u.pathname.endsWith('/secrets')) {
        if (init?.method === 'POST') {
          const valeurs = JSON.parse(String(init.body));
          assert.equal(valeurs.length, 1);
          assert.equal(valeurs[0].name, 'PAIEMENTS_PRODUCTION_OUVERTS');
          ouvert = valeurs[0].value === 'true'; ecritures.push(ouvert);
          if (panne === 'rollback' || (panne === 'reponse-perdue' && ouvert)) throw new Error('Réponse perdue');
          return new Response(null, { status: 201 });
        }
        return Response.json(Object.entries({ STRIPE_LIVE_SECRET_KEY: env.STRIPE_LIVE_SECRET_KEY, STRIPE_LIVE_WEBHOOK_SECRET: env.STRIPE_LIVE_WEBHOOK_SECRET, SITE_URL_PRODUCTION: 'https://philamots.fr' }).map(([name, v]) => ({ name, value: createHash('sha256').update(panne === 'secret' ? 'autre' : v).digest('hex') })));
      }
      if (u.pathname.endsWith('/functions')) return Response.json(['paiement-production', 'stripe-webhook-production'].map(slug => ({ slug, status: 'ACTIVE', verify_jwt: false })));
      if (u.pathname.endsWith('/database/query')) {
        assert.equal(JSON.parse(String(init?.body)).read_only, true);
        return Response.json([{ rls: true, anon: panne === 'droits', joueur: false, fonctions: 5 }]);
      }
    }
    if (u.hostname === 'philamots.fr') return Response.json({ version: 'philamots-paiements-v1', mode: panne === 'site' ? null : 'production' });
    if (u.pathname.endsWith('/stripe-webhook-production')) return creerPaiements({ mode: 'production', stripe: env.STRIPE_LIVE_SECRET_KEY, signature: env.STRIPE_LIVE_WEBHOOK_SECRET, site: 'https://philamots.fr', service: 'service', supabase: u.origin, testeurs: [] }).webhook(new Request(input, init));
    if (u.searchParams.get('action') === 'etat') return Response.json({ version: 'philamots-paiements-v1', mode: 'production', achatsOuverts: panne === 'ouverture' ? false : ouvert });
    throw new Error(`Requête inattendue : ${u.pathname}`);
  };
  return { requete, ecritures, attendre: async () => {}, env };
}

it('la vérification ne modifie rien ; l’activation ne change que le verrou après tous les contrôles', async () => {
  const b = banc();
  await administrerPaiements('verifier', b); assert.deepEqual(b.ecritures, []);
  await administrerPaiements('activer', b); assert.deepEqual(b.ecritures, [true]);
  await administrerPaiements('activer', b); assert.deepEqual(b.ecritures, [true]);
});

it('prix, secrets, permissions, webhook ou site incorrects empêchent toute ouverture', async () => {
  for (const erreur of ['prix', 'secret', 'droits', 'webhook', 'site'] as const) {
    const b = banc(erreur);
    await assert.rejects(administrerPaiements('activer', b));
    assert.deepEqual(b.ecritures, [], erreur);
  }
});

it('activation non confirmée ou réponse perdue : refermet ; signale explicitement un rollback non confirmé', async () => {
  for (const panne of ['ouverture', 'reponse-perdue'] as const) {
    const b = banc(panne);
    await assert.rejects(administrerPaiements('activer', b), /achats refermés/);
    assert.deepEqual(b.ecritures, [true, false]);
  }
  const b = banc('rollback');
  await assert.rejects(administrerPaiements('activer', b), /fermeture non confirmée/);
  assert.deepEqual(b.ecritures, [true, false]);
});

it('la fermeture fonctionne sans clé Stripe et malgré un site défectueux', async () => {
  const b = banc('site');
  await administrerPaiements('fermer', { ...b, env: { SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN } });
  assert.deepEqual(b.ecritures, [false]);
});

it('l’état public n’expose aucun secret et ne dépend pas de l’identité du joueur', async () => {
  for (const achatsOuverts of [true, false]) {
    const app = creerPaiements({ mode: 'production', achatsOuverts, stripe: env.STRIPE_LIVE_SECRET_KEY, signature: env.STRIPE_LIVE_WEBHOOK_SECRET, site: 'https://philamots.fr', service: 'service', supabase: 'https://supabase.invalid', testeurs: [] }, async () => { throw new Error('Aucune requête attendue'); });
    const r = await app.paiement(new Request('https://edge.invalid?action=etat'));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await r.json(), { version: 'philamots-paiements-v1', mode: 'production', achatsOuverts });
  }
});

it('l’interface reste fermée en cas d’erreur, de mauvais environnement ou d’état ambigu', async () => {
  const ouvert = { version: 'philamots-paiements-v1', mode: 'production', achatsOuverts: true };
  assert.equal(await lireOuverturePaiements(async () => Response.json(ouvert)), true);
  for (const resultat of [{ ...ouvert, achatsOuverts: false }, { ...ouvert, achatsOuverts: 'true' }, { ...ouvert, mode: 'test' }, { ...ouvert, version: 'ancienne' }]) assert.equal(await lireOuverturePaiements(async () => Response.json(resultat)), false);
  assert.equal(await lireOuverturePaiements(async () => new Response('indisponible', { status: 503 })), false);
  assert.equal(await lireOuverturePaiements(async () => { throw new Error('hors ligne'); }), false);
});
