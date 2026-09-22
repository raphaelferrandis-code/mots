// Tests du client Supabase, avec un faux réseau : ouverture du compte anonyme, session gardée, renouvellement, refus et pannes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ErreurDuServeur, creerLeClient } from './supabase.ts';
import type { Session } from './supabase.ts';

type Appel = { adresse: string; enTetes: Record<string, string>; corps: unknown };

// Un faux Supabase : il note chaque appel, et répond ce que le test a prévu pour cette adresse.
function fauxMonde(reponses: (appel: Appel) => { statut: number; corps?: unknown } | 'panne', sessionGardee: Session | null = null) {
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
  });
  return { client, appels, session: () => session, avancer: (ms: number) => { heure += ms; } };
}

const JETONS = { access_token: 'acces-1', refresh_token: 'renouvellement-1', expires_in: 3600 };

describe('le client Supabase', () => {
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
    await assert.rejects(absente.client.appeler('recuperer_par_code'), (erreur: unknown) => erreur instanceof ErreurDuServeur && erreur.refus && erreur.message.includes("pas à jour"));

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
