// Les identifiants de demande (services/demandes.ts) : repris après une panne, abandonnés après une réponse, un refus ou
// quelques minutes ; et l'appel refait sans eux quand le serveur n'a pas encore le script 20.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DUREE_DE_REPRISE, appelerAvecUneDemande, creerLesDemandes } from './demandes.ts';
import { ErreurDuServeur } from './supabase.ts';

function banc() {
  let heure = 1_000;
  let compteur = 0;
  const demandes = creerLesDemandes(() => heure, () => `demande-${++compteur}`);
  const vues: string[] = [];
  const agir = (cle: string, issue: 'ok' | 'panne' | 'refus' | 'coupure') => demandes(cle, async (demande) => {
    vues.push(demande);
    if (issue === 'panne') throw new ErreurDuServeur('Le serveur du jeu ne répond pas.', false);
    if (issue === 'coupure') throw new TypeError('réseau coupé');
    if (issue === 'refus') throw new ErreurDuServeur('Aucun paquet en réserve.', true);
    return demande;
  });
  return { agir, vues, avancer: (ms: number) => { heure += ms; } };
}

describe('les identifiants de demande', () => {
  it('reprend le même identifiant après une panne, puis en prend un neuf une fois la réponse reçue', async () => {
    const b = banc();
    await assert.rejects(b.agir('paquet', 'panne'));
    await assert.rejects(b.agir('paquet', 'coupure'));
    assert.equal(await b.agir('paquet', 'ok'), 'demande-1');
    assert.equal(await b.agir('paquet', 'ok'), 'demande-2');
    assert.deepEqual(b.vues, ['demande-1', 'demande-1', 'demande-1', 'demande-2']);
  });

  it('un refus du serveur est une réponse : l’action suivante est une nouvelle demande', async () => {
    const b = banc();
    await assert.rejects(b.agir('paquet', 'refus'));
    assert.equal(await b.agir('paquet', 'ok'), 'demande-2');
  });

  it('chaque action a sa demande, et une panne ancienne ne se reprend plus', async () => {
    const b = banc();
    await assert.rejects(b.agir('paquet', 'panne'));
    assert.equal(await b.agir('cadeau:achat', 'ok'), 'demande-2');
    b.avancer(DUREE_DE_REPRISE - 1);
    await assert.rejects(b.agir('paquet', 'panne'));
    b.avancer(1);
    assert.equal(await b.agir('paquet', 'ok'), 'demande-3', 'cinq minutes après la première tentative : un autre paquet');
  });

  it('envoie l’identifiant au serveur, et refait l’appel sans lui si le serveur ne le connaît pas encore', async () => {
    const appels: object[] = [];
    const client = (sansScript20: boolean) => ({
      appeler: async <T,>(_fonction: string, parametres: object = {}): Promise<T> => {
        appels.push(parametres);
        if (sansScript20 && 'p_demande' in parametres) throw new ErreurDuServeur("Le serveur du jeu n'est pas à jour.", true, 404);
        return 'ouvert' as T;
      },
    });
    const demandes = creerLesDemandes(() => 0, () => 'demande-1');
    assert.equal(await appelerAvecUneDemande(client(false), demandes, 'paquet', 'ouvrir_un_paquet', { p_masques: [] }), 'ouvert');
    assert.equal(await appelerAvecUneDemande(client(true), demandes, 'paquet', 'ouvrir_un_paquet', { p_masques: [] }), 'ouvert');
    assert.deepEqual(appels, [{ p_masques: [], p_demande: 'demande-1' }, { p_masques: [], p_demande: 'demande-1' }, { p_masques: [] }]);
    const refus = { appeler: async (): Promise<never> => { throw new ErreurDuServeur('Aucun paquet en réserve.', true); } };
    await assert.rejects(appelerAvecUneDemande(refus, demandes, 'paquet', 'ouvrir_un_paquet', {}), /Aucun paquet/);
  });
});
