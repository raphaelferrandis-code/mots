// Les règles des paiements du 25/09/2026 (serveur/paiements.ts, supabase/functions/_shared/paiements.ts) :
// - la fonction de paiement, avec un faux Stripe : âge au mois près, demandes mal formées, erreurs sans détail technique,
//   client ou session Stripe perdus puis retrouvés, vérification des avantages au plus toutes les 20 secondes ;
// - la base (PGlite), avec les scripts 8, 9 et 19 : suppression du compte par le joueur, abonnement à résilier d'abord,
//   collection achetée protégée d'une récupération par code, Stripe qui écrit après une suppression, date de naissance.
// Aucun appel à Stripe ni à Supabase : tout est simulé.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseDeTest } from './test-base.ts';
import { migrationPaiements } from './fabriquer-le-script.ts';
import { creerPaiements, majeur } from '../supabase/functions/_shared/paiements.ts';
import { PRIX } from '../supabase/functions/_shared/stripe.ts';

const ID = '11111111-1111-4111-8111-111111111111';
type Appel = { methode: string; chemin: string; cle: string | null; corps: string };

// Un monde simulé : Auth, la base (REST) et Stripe, en mode test.
function monde(o: {
  liaison?: Record<string, unknown>; naissance?: { annee: number | null; mois: number | null };
  recherche?: object[]; ouvertes?: object[]; panneDeStripe?: boolean;
} = {}) {
  const appels: Appel[] = [];
  const liaison: Record<string, any> = { id: 'compte', utilisateur: ID, client_stripe: 'cus_test', cree_le: new Date().toISOString(), verrou: 'verrou', sessions: {}, ...o.liaison };
  const appliques: Record<string, unknown>[] = [];
  const reseau: typeof fetch = async (entree, init) => {
    const url = new URL(String(entree));
    const methode = init?.method ?? 'GET';
    appels.push({ methode, chemin: url.pathname + url.search, cle: new Headers(init?.headers).get('idempotency-key'), corps: String(init?.body ?? '') });
    if (url.pathname === '/auth/v1/user') return Response.json({ id: ID });
    if (url.pathname === '/rest/v1/comptes') {
      if (url.searchParams.get('select')?.includes('achat_unique')) return Response.json([{ achat_unique: true, abonnement_jusqu_au: null }]);
      const n = o.naissance ?? { annee: 1990, mois: 6 };
      return Response.json([{ annee_de_naissance: n.annee, mois_de_naissance: n.mois, code_defini_le: '2026-01-01' }]);
    }
    if (url.pathname === '/rest/v1/paiements_test') return Response.json([liaison]);
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const nom = url.pathname.split('/').at(-1);
      const corps = JSON.parse(String(init?.body));
      if (nom === 'preparer_paiement_test' || nom === 'verrouiller_paiement_test') return Response.json(liaison);
      if (nom === 'enregistrer_paiement_test') { liaison.client_stripe = corps.p_client; liaison.sessions = corps.p_sessions; }
      if (nom === 'appliquer_paiement_test') appliques.push(corps);
      return Response.json(null);
    }
    // Stripe
    if (o.panneDeStripe) return Response.json({}, { status: 500 });
    if (url.pathname === '/v1/customers/search') return Response.json({ data: o.recherche ?? [], has_more: false });
    if (url.pathname === '/v1/customers' && methode === 'POST') return Response.json({ id: 'cus_nouveau', livemode: false });
    if (url.pathname === `/v1/prices/${PRIX.necessaire.id}`) return Response.json({ id: PRIX.necessaire.id, unit_amount: 599, active: true, type: 'one_time', currency: 'eur', livemode: false });
    if (url.pathname === '/v1/checkout/sessions' && methode === 'POST') return Response.json({ id: 'cs_nouvelle', url: 'https://checkout.stripe.com/nouvelle', livemode: false });
    if (url.pathname === '/v1/checkout/sessions' && url.searchParams.get('status') === 'open') return Response.json({ data: o.ouvertes ?? [], has_more: false });
    return Response.json({ data: [], has_more: false });
  };
  const app = creerPaiements({ supabase: 'https://supabase.invalid', service: 'service', stripe: 'sk_test_factice', signature: 'whsec_test', site: 'https://philamots.fr', testeurs: [ID] }, reseau);
  const demander = async (corps: unknown) => {
    const r = await app.paiement(new Request('https://edge.invalid', { method: 'POST', headers: { origin: 'https://philamots.fr', authorization: 'Bearer jeton' },
      body: typeof corps === 'string' ? corps : JSON.stringify(corps) }));
    return { statut: r.status, corps: await r.json() as Record<string, any> };
  };
  const versStripe = () => appels.filter((a) => !a.chemin.startsWith('/auth/') && !a.chemin.startsWith('/rest/'));
  return { appels, liaison, appliques, demander, versStripe };
}

it('paiements : 18 ans révolus au mois près', () => {
  assert.equal(majeur(2008, 3, Date.UTC(2026, 2, 31)), false, 'né en mars 2008 : pas encore sûr d’avoir 18 ans en mars 2026');
  assert.equal(majeur(2008, 3, Date.UTC(2026, 3, 1)), true, 'le 1er avril 2026, si');
  assert.equal(majeur(2008, null, Date.UTC(2030, 0, 1)), false, 'sans le mois, pas de paiement');
  assert.equal(majeur(1990, 13), false);
});

it('paiements : âge au mois près, demandes mal formées, et jamais de détail technique au joueur', async () => {
  const mineur = monde({ naissance: { annee: new Date().getUTCFullYear() - 18, mois: 12 } });
  const refus = await mineur.demander({ action: 'achat', offre: 'necessaire' });
  assert.equal(refus.statut, 403);
  assert.match(refus.corps.erreur, /mois et ton année de naissance/);
  assert.equal((await monde({ naissance: { annee: 1990, mois: null } }).demander({ action: 'achat', offre: 'necessaire' })).statut, 403, 'une ancienne déclaration sans le mois ne suffit plus');
  const m = monde();
  assert.deepEqual(await m.demander('pas du json'), { statut: 400, corps: { erreur: 'Demande illisible.' } });
  assert.equal((await m.demander({ action: ['achat'] })).statut, 400);
  assert.equal((await m.demander({ action: 'achat', offre: ['necessaire'] })).statut, 400);
  // Stripe en panne : le joueur lit un message général, pas « Stripe indisponible (500) ».
  const panne = await monde({ panneDeStripe: true }).demander({ action: 'achat', offre: 'necessaire' });
  assert.equal(panne.statut, 503);
  assert.equal(panne.corps.erreur, 'Le paiement est indisponible pour l’instant. Réessaie dans un moment.');
});

it('paiements : un client Stripe créé sans réponse est retrouvé ; sinon recréé avec une nouvelle clé, sans blocage définitif', async () => {
  const ilYAUneHeure = new Date(Date.now() - 3600_000).toISOString();
  // Retrouvé par la recherche : pas de second client.
  const retrouve = monde({ liaison: { client_stripe: null, cree_le: ilYAUneHeure }, recherche: [{ id: 'cus_retrouve', livemode: false, metadata: { application: 'philamots-test', compte: 'compte' } }] });
  assert.equal((await retrouve.demander({ action: 'achat', offre: 'necessaire' })).statut, 200);
  assert.equal(retrouve.liaison.client_stripe, 'cus_retrouve');
  assert.ok(!retrouve.appels.some((a) => a.chemin === '/v1/customers' && a.methode === 'POST'));
  // Introuvable (le premier essai avait échoué) : un nouveau client, avec une nouvelle clé d'idempotence.
  const absent = monde({ liaison: { client_stripe: null, cree_le: ilYAUneHeure } });
  assert.equal((await absent.demander({ action: 'achat', offre: 'necessaire' })).statut, 200);
  const creation = absent.appels.find((a) => a.chemin === '/v1/customers' && a.methode === 'POST')!;
  assert.ok(creation.cle?.startsWith('client-compte-') && creation.cle !== 'client-compte');
  // Tout juste commencé : pas de recherche, la clé d'origine (Stripe rend alors le client déjà créé, s'il existe).
  const recent = monde({ liaison: { client_stripe: null } });
  assert.equal((await recent.demander({ action: 'achat', offre: 'necessaire' })).statut, 200);
  assert.ok(!recent.appels.some((a) => a.chemin.startsWith('/v1/customers/search')));
  assert.equal(recent.appels.find((a) => a.chemin === '/v1/customers' && a.methode === 'POST')!.cle, 'client-compte');
});

it('paiements : une session de paiement créée sans réponse est reprise si elle est encore ouverte ; sinon une nouvelle', async () => {
  const perdue = { necessaire: { cle: 'ancienne', cree: Date.now() - 3600_000 } };
  const ouverte = monde({ liaison: { sessions: structuredClone(perdue) }, ouvertes: [{ id: 'cs_perdue', url: 'https://checkout.stripe.com/perdue', status: 'open', livemode: false, metadata: { compte: 'compte', offre: 'necessaire' } }] });
  const r = await ouverte.demander({ action: 'achat', offre: 'necessaire' });
  assert.deepEqual(r, { statut: 200, corps: { url: 'https://checkout.stripe.com/perdue' } });
  assert.ok(!ouverte.appels.some((a) => a.chemin === '/v1/checkout/sessions' && a.methode === 'POST'), 'pas de seconde session');
  assert.equal(ouverte.liaison.sessions.necessaire.id, 'cs_perdue');
  const expiree = monde({ liaison: { sessions: structuredClone(perdue) } });
  assert.equal((await expiree.demander({ action: 'achat', offre: 'necessaire' })).corps.url, 'https://checkout.stripe.com/nouvelle');
  const creation = expiree.appels.find((a) => a.chemin === '/v1/checkout/sessions' && a.methode === 'POST')!;
  assert.ok(creation.cle?.startsWith('achat-') && creation.cle !== 'achat-ancienne', 'une nouvelle tentative, pas l’ancienne clé');
});

it('paiements : « Vérifier mes avantages » interroge Stripe au plus une fois toutes les 20 secondes', async () => {
  const juste = monde({ liaison: { synchronise_le: new Date(Date.now() - 5_000).toISOString(), abonnement_ouvert: true, abonnement_renouvele: false } });
  const r = await juste.demander({ action: 'synchroniser' });
  assert.deepEqual(r, { statut: 200, corps: { album: true, fin: null, ouvert: true, renouvele: false, recent: true } });
  assert.deepEqual(juste.versStripe(), [], 'aucun appel à Stripe');
  const ancien = monde({ liaison: { synchronise_le: new Date(Date.now() - 60_000).toISOString() } });
  assert.equal((await ancien.demander({ action: 'synchroniser' })).statut, 200);
  assert.ok(ancien.versStripe().length > 0);
  assert.equal(ancien.appliques.length, 1);
  assert.equal(ancien.appliques[0].p_renouvele, false);
});

// ── La base : scripts 8, 9 et 19 ────────────────────────────────────────────

async function laboratoire() {
  const b = await baseDeTest();
  await b.db.exec('create role service_role bypassrls;');
  for (const script of ['8-paiements-test.sql', '9-paiements-production.sql']) await b.db.exec(readFileSync(new URL(`./${script}`, import.meta.url), 'utf8'));
  await b.db.exec(migrationPaiements());
  await b.db.exec(migrationPaiements()); // rejouable
  const service = async () => { await b.admin(); await b.db.exec('set role service_role;'); };
  // Un paiement réel dans Stripe pour le joueur i : client créé, puis droits appliqués comme par un webhook.
  const payer = async (i: number, droits: { album: boolean; fin: string | null; ouvert: boolean; renouvele: boolean }) => {
    await service();
    const id = (await b.db.query<{ id: string }>("select public.preparer_paiement_production($1)->>'id' id", [b.ids[i]])).rows[0].id;
    await b.db.query('select public.liberer_paiement_production($1, (select verrou from public.paiements_production where id=$1))', [id]);
    const v = (await b.db.query<{ v: string }>("select public.verrouiller_paiement_production($1)->>'verrou' v", [id])).rows[0].v;
    await b.db.query("select public.enregistrer_paiement_production($1,$2,$3,'{}')", [id, v, `cus_${i}`]);
    await b.db.query('select public.appliquer_paiement_production($1,$2,$3,$4,$5,$6)', [id, v, droits.album, droits.fin, droits.ouvert, droits.renouvele]);
    await b.db.query('select public.liberer_paiement_production($1,$2)', [id, v]);
    await b.admin();
    return id;
  };
  const dansUnMois = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return { ...b, service, payer, dansUnMois };
}

it('paiements (base) : un clic sur « acheter » sans paiement n’empêche plus de supprimer son compte', async () => {
  const l = await laboratoire();
  try {
    await l.service();
    await l.db.query('select public.preparer_paiement_production($1)', [l.ids[0]]);
    await l.joueur(0);
    await l.db.query('select public.supprimer_mon_compte()');
    await l.admin();
    assert.equal((await l.db.query<{ n: number }>('select count(*)::int n from public.comptes where utilisateur=$1', [l.ids[0]])).rows[0].n, 0);
  } finally { await l.db.close(); }
});

it('paiements (base) : un abonnement qui se renouvelle se résilie d’abord ; ensuite le joueur supprime tout seul, et Stripe peut encore écrire', async () => {
  const l = await laboratoire();
  try {
    const id = await l.payer(1, { album: true, fin: l.dansUnMois, ouvert: true, renouvele: true });
    await l.joueur(1);
    await assert.rejects(l.db.query('select public.supprimer_mon_compte()'), /se renouvelle encore : résilie-le d'abord/);
    // Résilié à l'échéance (portail Stripe), le webhook le dit : l'abonnement court encore, mais ne se renouvelle plus.
    await l.payer(1, { album: true, fin: l.dansUnMois, ouvert: true, renouvele: false });
    await l.joueur(1);
    await l.db.query('select public.supprimer_mon_compte()');
    await l.admin();
    const reste = (await l.db.query<{ utilisateur: string | null; client_stripe: string }>('select utilisateur, client_stripe from public.paiements_production where id=$1', [id])).rows[0];
    assert.deepEqual(reste, { utilisateur: null, client_stripe: 'cus_1' }, 'la trace du paiement reste pour la comptabilité, sans le joueur');
    // Un remboursement annoncé après coup : appliqué sans erreur (sinon Stripe renverrait l'événement en boucle).
    await l.service();
    const v = (await l.db.query<{ v: string }>("select public.verrouiller_paiement_production($1)->>'verrou' v", [id])).rows[0].v;
    await l.db.query('select public.appliquer_paiement_production($1,$2,false,null,false,false)', [id, v]);
  } finally { await l.db.close(); }
});

it('paiements (base) : une collection avec des achats n’est pas remplacée par une récupération par code', async () => {
  const l = await laboratoire();
  try {
    await l.payer(2, { album: true, fin: null, ouvert: false, renouvele: false });
    await l.joueur(0);
    await l.db.query("select public.definir_un_code_de_secours('ABCDEABCDEABCDEABCDE')");
    await l.joueur(2);
    await assert.rejects(l.db.query("select public.recuperer_par_code('ABCDEABCDEABCDEABCDE')"), /a des achats : sa collection ne peut pas être remplacée/);
    await l.admin();
    assert.equal((await l.db.query<{ achat_unique: boolean }>('select achat_unique from public.comptes where utilisateur=$1', [l.ids[2]])).rows[0].achat_unique, true);
  } finally { await l.db.close(); }
});

it('paiements (base) : le mois et l’année de naissance, vérifiés et déclarés une fois pour toutes', async () => {
  const l = await laboratoire();
  try {
    type Etat = { formule: { anneeDeNaissance: number | null; moisDeNaissance: number | null } };
    const declarer = (annee: number, mois: number) => l.db.query<{ r: Etat }>('select public.declarer_ma_naissance($1,$2) r', [annee, mois]);
    const maintenant = new Date();
    await l.joueur(0);
    await assert.rejects(declarer(1990, 13), /pas possible/);
    await assert.rejects(declarer(maintenant.getFullYear() + 1, 1), /pas possible/, 'pas dans le futur');
    const etat = (await declarer(1990, 6)).rows[0].r;
    assert.deepEqual([etat.formule.anneeDeNaissance, etat.formule.moisDeNaissance], [1990, 6]);
    await assert.rejects(declarer(1991, 6), /déjà déclarée. Pour la corriger, écris à contact@philamots.fr/);
    await assert.rejects(l.db.query('select public.declarer_mon_age(1990)'), /Recharge la page/, 'un jeu resté ouvert sur l’ancienne question');
    // Une ancienne déclaration de l'année seule se complète une fois, par la même année.
    await l.admin(); await l.db.query('update public.comptes set annee_de_naissance=1985 where utilisateur=$1', [l.ids[1]]);
    await l.joueur(1);
    await assert.rejects(declarer(1986, 3), /déjà déclarée/);
    assert.equal((await declarer(1985, 3)).rows[0].r.formule.moisDeNaissance, 3);
    await l.admin(); await l.db.exec('set role anon;');
    await assert.rejects(declarer(1990, 6), /permission denied/);
  } finally { await l.db.close(); }
});
