// Tests du client Supabase, avec un faux réseau : ouverture du compte anonyme, session gardée, renouvellement, refus et pannes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ErreurDuServeur, creerLeClient } from './supabase.ts';
import type { Session } from './supabase.ts';

type Appel = { adresse: string; enTetes: Record<string, string>; corps: unknown };

// Un faux Supabase : il note chaque appel, et répond ce que le test a prévu pour cette adresse.
function fauxMonde(reponses: (appel: Appel) => { statut: number; corps?: unknown } | 'panne', sessionGardee: Session | null = null, jetonAntiRobot?: () => Promise<string | undefined>) {
  const appels: Appel[] = [];
  let session = sessionGardee;
  let heure = 1_000_000;
  const client = creerLeClient('https://projet.supabase.co/', 'sb_publishable_test', {
    requete: (async (adresse: string, options: RequestInit) => {
      const appel: Appel = { adresse, enTetes: options.headers as Record<string, string>, corps: JSON.parse(String(options.body)) };
      appels.push(appel);
      const prevue = reponses(appel);
      if (prevue === 'panne') throw new TypeError('réseau coupé');
      return new Response(prevue.corps === undefined ? null : JSON.stringify(prevue.corps), { status: prevue.statut });
    }) as typeof fetch,
    lireLaSession: () => session,
    ecrireLaSession: (nouvelle) => { session = nouvelle; },
    maintenant: () => heure,
    jetonAntiRobot,
  });
  return { client, appels, session: () => session, avancer: (ms: number) => { heure += ms; } };
}

const JETONS = { access_token: 'acces-1', refresh_token: 'renouvellement-1', expires_in: 3600 };

describe('le client Supabase', () => {
  it('deux onglets qui repartent en invité partagent une seule création de session', async () => {
    let gardee: Session | null = null;
    let file: Promise<unknown> = Promise.resolve();
    let creations = 0;
    const io = {
      maintenant: () => 1000, lireLaSession: () => gardee, ecrireLaSession: (s: Session | null) => { gardee = s; },
      sessionExclusive: <T>(action: () => Promise<T>): Promise<T> => { const r = file.then(action); file = r.catch(() => {}); return r; },
      requete: (async (adresse: string) => {
        if (adresse.includes('/signup')) { creations++; return Response.json(JETONS); }
        return Response.json({});
      }) as typeof fetch,
    };
    const a = creerLeClient('https://projet.supabase.co', 'publique', io);
    const b = creerLeClient('https://projet.supabase.co', 'publique', io);
    await Promise.all([a.appeler('mon_compte'), b.appeler('mon_compte')]);
    assert.equal(creations, 1);
  });
  it('renouvelle un combat avec exactement la même commande et conserve les conflits explicites', async () => {
    const corps={type:'agir',requete:'commande-unique',revision:2,action:{type:'repondre',choisie:1}};
    const monde=fauxMonde(a => a.adresse.includes('/auth/') ? {statut:200,corps:JETONS}
      : a.enTetes.Authorization==='Bearer perime' ? {statut:401} : {statut:409,corps:{erreur:'La partie a avancé.'}},
      {acces:'perime',renouvellement:'ancien',expireLe:9_999_999_999});
    await assert.rejects(monde.client.appelerCombat(corps),e => e instanceof ErreurDuServeur && e.statut===409 && e.refus);
    const combats=monde.appels.filter(a=>a.adresse.endsWith('/functions/v1/combats'));
    assert.equal(combats.length,2); assert.deepEqual(combats.map(a=>a.corps),[corps,corps]);
    assert.equal(combats[1].enTetes.Authorization,'Bearer acces-1');
  });
  it('ne remplace jamais un compte pendant la reprise d’un combat si son renouvellement est refusé', async () => {
    const monde=fauxMonde(()=>({statut:401}),{acces:'ancien',renouvellement:'refuse',expireLe:0});
    await assert.rejects(monde.client.appelerCombat({type:'lire'}),/Session expirée/);
    assert.equal(monde.appels.length,1); assert.ok(!monde.appels[0].adresse.includes('/signup'));
    assert.equal(monde.session()!.acces,'ancien');
  });
  it('conserve aussi le compte lors d’une synchronisation refusée, puis permet une récupération explicitement demandée', async () => {
    const monde=fauxMonde(a=>a.adresse.includes('refresh_token')?{statut:401}:a.adresse.includes('/signup')?{statut:200,corps:JETONS}:{statut:200,corps:{retrouve:true}},
      {acces:'ancien',renouvellement:'refuse',expireLe:0});
    await assert.rejects(monde.client.appeler('mon_compte'),/Session expirée/);
    assert.equal(monde.appels.length,1);
    assert.deepEqual(await monde.client.appeler('recuperer_par_code',{p_code:'code-explicite'}),{retrouve:true});
    assert.equal(monde.appels.filter(a=>a.adresse.includes('/signup')).length,1);
  });
  it('conserve sa session en mémoire quand le stockage est indisponible', async () => {
    let inscriptions = 0;
    const client = creerLeClient('https://test.invalid', 'publique', {
      maintenant: () => 1000,
      lireLaSession: () => null,
      ecrireLaSession: () => {},
      requete: async (url) => {
        if (String(url).includes('/signup')) { inscriptions++; return new Response(JSON.stringify(JETONS)); }
        return new Response('{}');
      },
    });
    await client.appeler('mon_compte'); await client.appeler('mon_compte');
    assert.equal(inscriptions, 1);
    assert.equal(client.aUneSession(), true);
    client.oublierLaSession(); assert.equal(client.aUneSession(), false);
  });
  it('ouvre un compte anonyme à la première visite, puis appelle la fonction avec la session', async () => {
    const monde = fauxMonde((appel) => (appel.adresse.includes('/auth/v1/signup') ? { statut: 200, corps: JETONS } : { statut: 200, corps: { accepte: true, cote: 1000 } }));
    const reponse = await monde.client.appeler<{ cote: number }>('publier_mon_profil', { p_pseudo: 'Zeugma' });
    assert.equal(reponse.cote, 1000);
    assert.deepEqual(monde.appels.map((a) => a.adresse), ['https://projet.supabase.co/auth/v1/signup', 'https://projet.supabase.co/rest/v1/rpc/publier_mon_profil']);
    assert.equal(monde.appels[0].enTetes.apikey, 'sb_publishable_test');
    assert.equal(monde.appels[0].enTetes.Authorization, undefined, "la clé publique ne va pas dans l'en-tête Authorization");
    assert.equal(monde.appels[1].enTetes.Authorization, 'Bearer acces-1');
    assert.deepEqual(monde.appels[1].corps, { p_pseudo: 'Zeugma' });
    assert.equal(monde.session()?.renouvellement, 'renouvellement-1');
  });

  it('joint le jeton anti-robot à l’ouverture du compte, et seulement à elle', async () => {
    let controles = 0;
    const monde = fauxMonde((appel) => (appel.adresse.includes('/signup') ? { statut: 200, corps: JETONS } : { statut: 200, corps: [] }), null, async () => { controles++; return 'jeton-cloudflare'; });
    await Promise.all([monde.client.appeler('mon_compte'), monde.client.appeler('classement')]);
    await monde.client.appeler('mon_compte');
    assert.equal(controles, 1, 'un seul contrôle pour un seul compte');
    const ouverture = monde.appels.find((a) => a.adresse.includes('/signup'))!;
    assert.deepEqual(ouverture.corps, { data: {}, gotrue_meta_security: { captcha_token: 'jeton-cloudflare' } });
    assert.ok(monde.appels.filter((a) => !a.adresse.includes('/signup')).every((a) => !JSON.stringify(a.corps).includes('jeton-cloudflare')));
  });

  it('sans contrôle réglé, ouvre le compte comme avant ; contrôle échoué, le dit au joueur', async () => {
    const sans = fauxMonde((appel) => (appel.adresse.includes('/signup') ? { statut: 200, corps: JETONS } : { statut: 200, corps: [] }));
    await sans.client.appeler('mon_compte');
    assert.deepEqual(sans.appels[0].corps, { data: {}, gotrue_meta_security: {} });
    const echoue = fauxMonde((appel) => (appel.adresse.includes('/signup') ? { statut: 400, corps: { error_code: 'captcha_failed' } } : { statut: 200, corps: [] }), null, async () => undefined);
    await assert.rejects(echoue.client.appeler('mon_compte'), /vérification anti-robot/);
    assert.deepEqual(echoue.appels[0].corps, { data: {}, gotrue_meta_security: {} });
    assert.equal(echoue.session(), null);
  });

  it('réutilise la session gardée, et ne crée jamais deux comptes pour deux appels simultanés', async () => {
    const monde = fauxMonde((appel) => (appel.adresse.includes('/signup') ? { statut: 200, corps: JETONS } : { statut: 200, corps: [] }));
    await Promise.all([monde.client.appeler('adversaires'), monde.client.appeler('classement')]);
    assert.equal(monde.appels.filter((a) => a.adresse.includes('/signup')).length, 1);
    await monde.client.appeler('adversaires');
    assert.equal(monde.appels.filter((a) => a.adresse.includes('/auth/')).length, 1, 'la session encore valable est réutilisée');
  });

  it('renouvelle une session qui expire, sans changer de compte', async () => {
    const gardee: Session = { acces: 'vieux', renouvellement: 'renouvellement-0', expireLe: 1_000_000 + 30_000 };
    const monde = fauxMonde((appel) => (appel.adresse.includes('grant_type=refresh_token') ? { statut: 200, corps: { ...JETONS, access_token: 'acces-2' } } : { statut: 200, corps: [] }), gardee);
    await monde.client.appeler('adversaires');
    assert.deepEqual(monde.appels[0].corps, { refresh_token: 'renouvellement-0' });
    assert.equal(monde.appels[1].enTetes.Authorization, 'Bearer acces-2');
    assert.ok(!monde.appels.some((a) => a.adresse.includes('/signup')));
  });

  it('renouvelle puis réessaie une fois quand le serveur ne reconnaît plus la session', async () => {
    const gardee: Session = { acces: 'perime', renouvellement: 'renouvellement-0', expireLe: 9_999_999_999 };
    const monde = fauxMonde((appel) => {
      if (appel.adresse.includes('/auth/')) return { statut: 200, corps: { ...JETONS, access_token: 'acces-neuf' } };
      return appel.enTetes.Authorization === 'Bearer perime' ? { statut: 401, corps: { message: 'JWT expired' } } : { statut: 200, corps: 42 };
    }, gardee);
    assert.equal(await monde.client.appeler<number>('commencer_une_joute', { p_adversaire: 'x' }), 42);
    assert.deepEqual(monde.appels.map((a) => a.adresse.split('/').at(-1)), ['commencer_une_joute', 'token?grant_type=refresh_token', 'commencer_une_joute']);
  });

  it('après un refus (401), relance un vrai renouvellement même si une ouverture de session était déjà en cours', async () => {
    let gardee: Session | null = { acces: 'refuse', renouvellement: 'renouvellement-0', expireLe: 9_999_999_999 };
    let renouvellements = 0;
    const porte = () => { let ouvrir: () => void = () => {}; const p = new Promise<void>((r) => { ouvrir = r; }); return { p, ouvrir: () => ouvrir() }; };
    const reponseDeA = porte(); // retient le refus reçu par le premier appel
    const verrou = porte(); // retient l'ouverture de session du second appel (le verrou partagé entre onglets)
    let exclusives = 0;
    const io = {
      maintenant: () => 1_000_000, lireLaSession: () => gardee, ecrireLaSession: (s: Session | null) => { gardee = s; },
      requete: (async (adresse: string, options: RequestInit) => {
        if (adresse.includes('refresh_token')) { renouvellements++; return Response.json({ ...JETONS, access_token: `acces-${renouvellements + 1}` }); }
        const jeton = (options.headers as Record<string, string>).Authorization;
        if (adresse.endsWith('/a') && jeton === 'Bearer refuse') await reponseDeA.p;
        return jeton === 'Bearer refuse' ? new Response('{}', { status: 401 }) : Response.json(jeton);
      }) as typeof fetch,
      sessionExclusive: async <T,>(action: () => Promise<T>): Promise<T> => { if (++exclusives === 2) await verrou.p; return action(); },
    };
    const client = creerLeClient('https://projet.supabase.co', 'publique', io);
    const tour = () => new Promise((r) => setTimeout(r, 0));
    const a = client.appeler<string>('a'); // A a sa session et attend sa réponse
    await tour();
    const b = client.appeler<string>('b'); // B ouvre une session, retenue par le verrou
    await tour();
    reponseDeA.ouvrir(); // A reçoit son refus pendant l'ouverture de B
    await tour();
    verrou.ouvrir();
    assert.equal(await a, 'Bearer acces-2', 'la nouvelle tentative de A porte un jeton neuf');
    assert.equal(await b, 'Bearer acces-2');
    assert.equal(renouvellements, 1, 'un seul renouvellement pour les deux');
  });

  it('une page HTML glissée par un intermédiaire est une panne, pas « Unexpected token < »', async () => {
    const page = '<!doctype html><html><body>Connexion au Wi-Fi</body></html>';
    const monde = (session: Session | null) => {
      const client = creerLeClient('https://projet.supabase.co', 'publique', {
        maintenant: () => 1_000_000, lireLaSession: () => session, ecrireLaSession: () => {},
        requete: (async () => new Response(page, { status: 200, headers: { 'Content-Type': 'text/html' } })) as typeof fetch,
      });
      return client;
    };
    const valable: Session = { acces: 'a', renouvellement: 'r', expireLe: 9_999_999_999 };
    const panne = (erreur: unknown) => erreur instanceof ErreurDuServeur && !erreur.refus && erreur.message.includes('ne répond pas');
    await assert.rejects(monde(valable).appeler('mon_compte'), panne);
    await assert.rejects(monde(null).appeler('mon_compte'), panne, 'ouverture de session');
    await assert.rejects(monde(null).lireSansCompte('fil_d_activite'), panne);
  });

  it("ne crée pas de nouveau compte sur une simple panne de réseau : il signale la panne", async () => {
    const gardee: Session = { acces: 'vieux', renouvellement: 'renouvellement-0', expireLe: 0 };
    const monde = fauxMonde(() => 'panne', gardee);
    await assert.rejects(monde.client.appeler('adversaires'), (erreur: unknown) => erreur instanceof ErreurDuServeur && !erreur.refus);
    assert.equal(monde.appels.length, 1);
    assert.equal(monde.session()?.renouvellement, 'renouvellement-0', 'la session gardée est intacte');
  });

  it('transmet au joueur le refus motivé par une fonction de la base, et cache les autres erreurs derrière un message de panne', async () => {
    const refus = fauxMonde((appel) => (appel.adresse.includes('/signup') ? { statut: 200, corps: JETONS } : { statut: 400, corps: { code: 'P0001', message: 'Trop de joutes en peu de temps : fais une pause.' } }));
    await assert.rejects(refus.client.appeler('commencer_une_joute'), (erreur: unknown) => erreur instanceof ErreurDuServeur && erreur.refus && erreur.message.startsWith('Trop de joutes'));

    const interne = fauxMonde((appel) => (appel.adresse.includes('/signup') ? { statut: 200, corps: JETONS } : { statut: 500, corps: { code: 'XX000', message: 'détail technique' } }));
    await assert.rejects(interne.client.appeler('classement'), (erreur: unknown) => erreur instanceof ErreurDuServeur && !erreur.refus && !erreur.message.includes('technique'));

    const absente = fauxMonde((appel) => (appel.adresse.includes('/signup') ? { statut: 200, corps: JETONS } : { statut: 404, corps: { code: 'PGRST202', message: 'Could not find the function public.recuperer_par_code' } }));
    await assert.rejects(absente.client.appeler('recuperer_par_code'), (erreur: unknown) => erreur instanceof ErreurDuServeur && erreur.refus && erreur.statut === 404 && erreur.message.includes("pas à jour"));

    const ferme = fauxMonde(() => ({ statut: 422, corps: { msg: 'Anonymous sign-ins are disabled' } }));
    await assert.rejects(ferme.client.appeler('classement'), (erreur: unknown) => erreur instanceof ErreurDuServeur && erreur.message.includes("n'accepte pas"));
  });

  it("sait si l'appareil a un compte, et l'oublie après la suppression du profil (réponse vide du serveur)", async () => {
    const monde = fauxMonde((appel) => (appel.adresse.includes('/signup') ? { statut: 200, corps: JETONS } : { statut: 204 }));
    assert.equal(monde.client.aUneSession(), false, "avant toute joute, rien n'a été envoyé : pas de compte");
    assert.equal(monde.appels.length, 0, 'poser la question ne crée pas de compte');

    await monde.client.appeler('publier_mon_profil');
    assert.equal(monde.client.aUneSession(), true);

    assert.equal(await monde.client.appeler<null>('supprimer_mon_profil'), null);
    monde.client.oublierLaSession();
    assert.equal(monde.client.aUneSession(), false);
    assert.equal(monde.session(), null);

    // Revenir aux joutes plus tard ouvre un compte neuf, sans lien avec l'ancien.
    await monde.client.appeler('publier_mon_profil');
    assert.equal(monde.appels.filter((a) => a.adresse.includes('/signup')).length, 2);
  });
});
