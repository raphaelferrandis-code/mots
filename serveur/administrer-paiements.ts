// Exécution explicite uniquement. Aucun secret dans les arguments ou les journaux.
import { createHash, createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SERVEUR } from '../src/config/serveur.ts';
import { creerStripe, PRIX_PRODUCTION, verifierPrix } from '../supabase/functions/_shared/stripe.ts';

const SITE = 'https://philamots.fr';
const REF = new URL(SERVEUR.adresse).hostname.split('.')[0];
const API = `https://api.supabase.com/v1/projects/${REF}`;
const EDGE = `${SERVEUR.adresse}/functions/v1`;
const VERSION = 'philamots-paiements-v1';
export const EVENEMENTS = [
  'checkout.session.completed', 'checkout.session.expired',
  'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
  'invoice.paid', 'invoice.payment_failed', 'customer.subscription.created',
  'customer.subscription.updated', 'customer.subscription.deleted',
  'charge.refunded', 'charge.dispute.created', 'charge.dispute.closed',
];
type Action = 'verifier' | 'activer' | 'fermer';
type Options = { env: Record<string, string | undefined>; requete?: typeof fetch; attendre?: () => Promise<void>; informer?: (texte: string) => void };
const empreinte = (s: string) => createHash('sha256').update(s).digest('hex');

export async function administrerPaiements(action: Action, options: Options): Promise<void> {
  const { env, requete = fetch, attendre = () => new Promise<void>(r => setTimeout(r, 2_000)), informer = () => {} } = options;
  const requis = (nom: string) => { const v = env[nom]?.trim(); if (!v) throw new Error(`Accès manquant : ${nom}.`); return v; };
  const token = requis('SUPABASE_ACCESS_TOKEN');
  const appel = async (url: string, init: RequestInit = {}) => {
    const r = await requete(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`Vérification impossible (${new URL(url).hostname}, HTTP ${r.status}).`);
    const texte = await r.text();
    return texte ? JSON.parse(texte) : null;
  };
  const management = (path: string, body?: unknown) => appel(`${API}/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const etat = async () => {
    const r = await appel(`${EDGE}/paiement-production?action=etat`, { cache: 'no-store', headers: { apikey: SERVEUR.clePublique } });
    if (r?.version !== VERSION || r.mode !== 'production' || typeof r.achatsOuverts !== 'boolean') throw new Error('Fonction de production absente ou incompatible.');
    return r.achatsOuverts as boolean;
  };
  const changer = (ouvert: boolean) => management('secrets', [{ name: 'PAIEMENTS_PRODUCTION_OUVERTS', value: String(ouvert) }]);
  const constater = async (ouvert: boolean) => {
    for (let n = 0; n < 15; n++) {
      try { if (await etat() === ouvert) return; } catch { /* propagation ou erreur transitoire */ }
      await attendre();
    }
    throw new Error('Le serveur ne confirme pas le nouvel état.');
  };

  // La fermeture ne dépend ni de Stripe ni du site, pour rester possible en panne.
  if (action === 'fermer') {
    await changer(false);
    await constater(false);
    informer('Nouvelles sessions d’achat fermées. Abonnements et Checkouts existants inchangés.');
    return;
  }
  const cle = requis('STRIPE_LIVE_SECRET_KEY');
  const signature = requis('STRIPE_LIVE_WEBHOOK_SECRET');
  if (!signature.startsWith('whsec_')) throw new Error('Secret de signature invalide.');
  const stripe = creerStripe(cle, requete, 'production');
  const compte = await stripe('account');
  if (!compte.charges_enabled || !compte.payouts_enabled || !compte.details_submitted) throw new Error('Le compte Stripe ne permet pas encore les paiements et les virements.');
  for (const offre of ['necessaire', 'collectionneur'] as const) verifierPrix(await stripe(`prices/${PRIX_PRODUCTION[offre].id}`), offre, 'production');
  informer('Compte Stripe et deux tarifs de production vérifiés.');

  const secrets = await management('secrets');
  // Supabase renvoie les SHA-256 des valeurs. Une valeur différente est bloquante.
  for (const [nom, valeur] of Object.entries({ STRIPE_LIVE_SECRET_KEY: cle, STRIPE_LIVE_WEBHOOK_SECRET: signature, SITE_URL_PRODUCTION: SITE })) {
    if (!Array.isArray(secrets) || secrets.find(s => s.name === nom)?.value !== empreinte(valeur)) throw new Error(`Secret serveur absent ou différent : ${nom}.`);
  }
  const fonctions = await management('functions');
  for (const slug of ['paiement-production', 'stripe-webhook-production']) {
    const f = Array.isArray(fonctions) && fonctions.find(f => f.slug === slug);
    if (!f || f.status !== 'ACTIVE' || f.verify_jwt !== false) throw new Error(`Fonction non prête : ${slug}.`);
  }
  const lignes = await management('database/query', { query: `select
    (select relrowsecurity from pg_class where oid = 'public.paiements_production'::regclass) as rls,
    has_table_privilege('anon', 'public.paiements_production', 'SELECT,INSERT,UPDATE,DELETE') as anon,
    has_table_privilege('authenticated', 'public.paiements_production', 'SELECT,INSERT,UPDATE,DELETE') as joueur,
    (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('preparer_paiement_production','verrouiller_paiement_production','enregistrer_paiement_production','appliquer_paiement_production','liberer_paiement_production')
      and p.prosecdef and has_function_privilege('service_role',p.oid,'EXECUTE')
      and not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('authenticated',p.oid,'EXECUTE')) as fonctions;`, read_only: true });
  const db = lignes?.[0];
  if (!db?.rls || db.anon !== false || db.joueur !== false || db.fonctions !== 5) throw new Error('Migration ou permissions de production incomplètes.');
  informer('Secrets, fonctions et permissions de la base vérifiés.');

  let suite = '';
  let webhook = false;
  for (let page = 0; page < 20; page++) {
    const liste = await stripe(`webhook_endpoints?limit=100${suite}`);
    webhook ||= liste.data.some((w: any) => w.url === `${EDGE}/stripe-webhook-production` && w.status === 'enabled' && w.livemode === true && (w.enabled_events.includes('*') || EVENEMENTS.every(e => w.enabled_events.includes(e))));
    if (webhook || !liste.has_more) break;
    if (!liste.data.length) break;
    suite = `&starting_after=${encodeURIComponent(liste.data.at(-1).id)}`;
  }
  if (!webhook) throw new Error('Webhook Stripe de production ou événements requis manquants.');
  const t = Math.floor(Date.now() / 1000);
  const corps = JSON.stringify({ livemode: true, type: 'philamots.verification', data: { object: {} } });
  const hmac = createHmac('sha256', signature).update(`${t}.${corps}`).digest('hex');
  const sonde = await appel(`${EDGE}/stripe-webhook-production`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': `t=${t},v1=${hmac}` }, body: corps });
  if (sonde?.ignore !== true) throw new Error('Sonde du webhook invalide.');
  informer('Webhook joignable et signature acceptée, sans création de paiement.');
  const site = await appel(`${SITE}/paiements-version.json?verification=${Date.now()}`, { cache: 'no-store' });
  if (site?.version !== VERSION || site.mode !== 'production') throw new Error('Publier la nouvelle interface de production avant activation.');
  const ouvert = await etat();
  if (action === 'verifier') { informer(`Vérifications techniques réussies. Achats ${ouvert ? 'ouverts' : 'fermés'}.`); return; }
  if (ouvert) { informer('Les achats sont déjà ouverts ; aucune modification.'); return; }
  try {
    await changer(true);
    await constater(true);
    informer('Paiements ouverts et état confirmé par le serveur.');
  } catch {
    // Une réponse perdue n’est pas une preuve d’échec de l’écriture : refermer même dans ce cas.
    try { await changer(false); await constater(false); }
    catch { throw new Error('Activation non confirmée ET fermeture non confirmée. Vérifier immédiatement PAIEMENTS_PRODUCTION_OUVERTS dans Supabase.'); }
    throw new Error('Activation non confirmée : achats refermés et fermeture vérifiée.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (existsSync('.env.paiements.local')) process.loadEnvFile('.env.paiements.local');
    const action = process.argv[2];
    if (!['verifier', 'activer', 'fermer'].includes(action)) throw new Error('Commande attendue : verifier, activer ou fermer.');
    await administrerPaiements(action as Action, { env: process.env, informer: console.log });
  } catch (e) { console.error(e instanceof Error ? e.message : 'Opération interrompue.'); process.exitCode = 1; }
}
