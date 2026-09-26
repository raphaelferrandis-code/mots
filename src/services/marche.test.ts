// Le service du marché, avec une doublure du client : ce qu'il envoie, et comment il relit les réponses.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { serveurDuMarcheAvec } from './marche.ts';
import { creerLesDemandes } from './demandes.ts';
import type { ClientSupabase } from './supabase.ts';

type Appel = { fonction: string; parametres: object };

function doublure(reponses: Record<string, unknown>) {
  const appels: Appel[] = [];
  const client = {
    appeler: async <T,>(fonction: string, parametres: object = {}): Promise<T> => {
      appels.push({ fonction, parametres });
      if (!(fonction in reponses)) throw new Error(`fonction inconnue : ${fonction}`);
      return reponses[fonction] as T;
    },
    aUneSession: () => true,
    oublierLaSession: () => {},
  } as unknown as ClientSupabase;
  return { service: serveurDuMarcheAvec(client, creerLesDemandes(() => 0, () => 'demande-1')), appels };
}

const ETAT = { encre: 12, paquets: { stock: 2, reference: 1000, ouverts: 4, sansLegendaire: 1 }, deck: [], maintenant: 5000, cartes: {}, codeDeSecoursLe: null };
const ENCHERE = { id: 3, carte: 'zeugma-nom', finition: 'Normale', vendeur: 'Zeugma 12', mienne: true, miseDeDepart: 30, achatImmediat: null, meilleureMise: null, enTete: false, fermeLe: 99_000, etat: 'ouverte', prixFinal: null, acheteur: null, cloturee_le: null };

describe('le service du marché', () => {
  it('lit le marché et mes enchères, en ignorant les lignes illisibles', async () => {
    const { service, appels } = doublure({ marche: { encheres: [ENCHERE, 'rien'], total: 1, maintenant: 5000 }, mes_encheres: { ventes: [ENCHERE], mises: [], maintenant: 5000 } });
    const page = await service.marche('zeu', 0);
    assert.deepEqual(appels[0], { fonction: 'marche', parametres: { p_recherche: 'zeu', p_page: 0 } });
    assert.equal(page.encheres.length, 1);
    assert.equal(page.total, 1);
    const miennes = await service.mesEncheres();
    assert.equal(miennes.ventes[0]?.mienne, true);
  });

  it('met en vente, mise et retire, avec les bons paramètres', async () => {
    const { service, appels } = doublure({ mettre_en_vente: { enchere: ENCHERE, etat: ETAT }, encherir: { enchere: { ...ENCHERE, meilleureMise: 30, enTete: true }, etat: ETAT }, retirer_de_la_vente: ETAT });
    const vente = await service.mettreEnVente('zeugma-nom', 'Normale', 30, null, 24);
    assert.equal(vente.enchere.id, 3);
    assert.equal(vente.etat.encre, 12);
    const mise = await service.encherir(3, 30);
    assert.equal(mise.enchere.enTete, true);
    assert.equal((await service.retirer(3)).encre, 12);
    assert.deepEqual(appels.map((a) => [a.fonction, a.parametres]), [
      ['mettre_en_vente', { p_carte: 'zeugma-nom', p_finition: 'Normale', p_mise: 30, p_achat_immediat: null, p_heures: 24, p_demande: 'demande-1' }],
      ['encherir', { p_enchere: 3, p_montant: 30 }],
      ['retirer_de_la_vente', { p_enchere: 3 }],
    ]);
  });

  it('lit la cote et son histoire', async () => {
    const { service, appels } = doublure({ cotes: { jour: '2026-09-22', cotes: [{ finition: 'Normale', cote: 120, ventes: 3 }] }, historique_de_la_cote: { serie: [], ventes: [{ quand: 1, finition: 'Normale', prix: 120 }], stats: [] } });
    assert.equal((await service.cotes('zeugma-nom')).cotes[0]?.cote, 120);
    assert.equal((await service.histoire('zeugma-nom')).ventes.length, 1);
    assert.deepEqual(appels.map((a) => [a.fonction, a.parametres]), [['cotes', { p_carte: 'zeugma-nom' }], ['historique_de_la_cote', { p_carte: 'zeugma-nom' }]]);
  });

  it('refuse une réponse sans enchère lisible', async () => {
    const { service } = doublure({ encherir: { enchere: 'rien', etat: ETAT } });
    await assert.rejects(service.encherir(3, 30), /pas pu être lue/);
  });
});
