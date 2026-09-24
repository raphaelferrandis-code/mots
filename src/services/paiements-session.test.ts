import { it } from 'node:test';
import assert from 'node:assert/strict';
import { creerLeClient } from './supabase.ts';
import { choisirModePaiements } from './mode-paiements.ts';

it('paiements fermés par défaut ou si les deux environnements sont activés', () => {
  assert.equal(choisirModePaiements(), null);
  assert.equal(choisirModePaiements('true', 'true'), null);
  assert.equal(choisirModePaiements('true'), 'test');
  assert.equal(choisirModePaiements(undefined, 'true'), 'production');
});

it('le client appelle uniquement la fonction de son environnement', async () => {
  const urls: string[] = [];
  const client = creerLeClient('https://supabase.invalid', 'publique', {
    maintenant: () => 0, lireLaSession: () => ({ acces: 'token', renouvellement: 'refresh', expireLe: 5000 }), ecrireLaSession: () => {},
    requete: (async url => { urls.push(String(url)); return Response.json({}); }) as typeof fetch,
  });
  await client.appelerPaiement({ action: 'synchroniser' });
  await client.appelerPaiement({ action: 'synchroniser' }, 'production');
  assert.deepEqual(urls, ['https://supabase.invalid/functions/v1/paiement', 'https://supabase.invalid/functions/v1/paiement-production']);
});

it('payer ne crée jamais un compte de remplacement et ne rejoue pas une requête refusée', async () => {
  let appels = 0;
  const exterieur = { maintenant: () => 1000, lireLaSession: () => null, ecrireLaSession: () => {}, requete: (async () => { appels++; return Response.json({ erreur: 'Session refusée' }, { status: 401 }); }) as typeof fetch };
  const sansCompte = creerLeClient('https://supabase.invalid', 'publique', exterieur);
  await assert.rejects(sansCompte.appelerPaiement({ action: 'achat' }), /Session expirée/);
  assert.equal(appels, 0);
  const compte = creerLeClient('https://supabase.invalid', 'publique', { ...exterieur, lireLaSession: () => ({ acces: 'acces', renouvellement: 'refresh', expireLe: 5000 }) });
  await assert.rejects(compte.appelerPaiement({ action: 'achat' }), /Session refusée/);
  assert.equal(appels, 1);
});
