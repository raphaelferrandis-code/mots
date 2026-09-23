import { it } from 'node:test';
import assert from 'node:assert/strict';
import { creerLeClient } from './supabase.ts';

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
