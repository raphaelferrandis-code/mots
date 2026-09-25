// Le service des collections, avec une doublure du client : ce qu'il envoie au serveur, et comment il relit ses réponses.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nouvelleSauvegarde } from '../jeu/sauvegarde.ts';
import { serveurDesCollectionsAvec } from './collections.ts';
import { creerLesDemandes } from './demandes.ts';
import { ErreurDuServeur } from './supabase.ts';
import type { ClientSupabase } from './supabase.ts';

type Appel = { fonction: string; parametres: object };

function doublure(reponses: Record<string, unknown>) {
  const appels: Appel[] = [];
  let numero = 0;
  const client = {
    appeler: async <T,>(fonction: string, parametres: object = {}): Promise<T> => {
      appels.push({ fonction, parametres });
      if (!(fonction in reponses)) throw new Error(`fonction inconnue : ${fonction}`);
      const reponse = reponses[fonction];
      if (reponse instanceof Error) throw reponse;
      return reponse as T;
    },
    aUneSession: () => true,
    oublierLaSession: () => {},
  } as unknown as ClientSupabase;
  return { service: serveurDesCollectionsAvec(client, creerLesDemandes(() => 0, () => `demande-${++numero}`)), appels };
}

const ETAT = { encre: 12, paquets: { stock: 2, reference: 1000, ouverts: 4, sansLegendaire: 1 }, deck: ['a-nom'], maintenant: 5000, cartes: { 'a-nom': { obtenueLe: 900, doublons: 0, finitions: { Normale: 1 } } }, codeDeSecoursLe: null, formule: { niveau: 0, achatUnique: false, abonnement: 'aucun', jusquAu: null, encreAchetee: 0, anneeDeNaissance: null, moisDeNaissance: null } };

describe('le service des collections', () => {
  it('distingue « pas de compte » d’un compte vide, et relit l’état du serveur', async () => {
    const { service } = doublure({ mon_compte: null });
    assert.equal(await service.monCompte(), null);
    const { service: avec } = doublure({ mon_compte: ETAT });
    assert.deepEqual(await avec.monCompte(), ETAT);
  });

  it('importe la partie de l’appareil avec les seuls champs qui ont de la valeur', async () => {
    const sauvegarde = nouvelleSauvegarde(1_700_000_000_000, 3);
    sauvegarde.encre = 40;
    sauvegarde.cartes['a-nom'] = { obtenueLe: 1, doublons: 2, finitions: { Normale: 3 }, posees: 9, reussites: 9, maitriseeLe: 5 };
    sauvegarde.deck = ['a-nom'];
    const { service, appels } = doublure({ importer_ma_collection: ETAT });
    await service.importer(sauvegarde);
    assert.equal(appels[0].fonction, 'importer_ma_collection');
    assert.deepEqual(appels[0].parametres, {
      p_cree_le: 1_700_000_000_000, p_encre: 40,
      p_paquets: { stock: 3, reference: 1_700_000_000_000, ouverts: 0, sansLegendaire: 0 },
      p_cartes: { 'a-nom': { obtenueLe: 1, doublons: 2, finitions: { Normale: 3 } } },
      p_deck: ['a-nom'],
    });
  });

  it('ouvre un paquet de la réserve, avec les registres masqués, et ignore une carte tirée mal formée', async () => {
    const tirage = { cartes: [{ id: 'b-nom', finition: 'Brillante', nouvelle: true, nouvelleFinition: true, encre: 0 }, { id: 'c-nom', finition: 'Dorée' }, 'rien'], etat: ETAT };
    const { service, appels } = doublure({ ouvrir_un_paquet: tirage });
    const ouvert = await service.ouvrirUnPaquet(['Familier']);
    assert.deepEqual(appels[0], { fonction: 'ouvrir_un_paquet', parametres: { p_masques: ['Familier'], p_demande: 'demande-1' } });
    assert.deepEqual(ouvert.cartes, [{ id: 'b-nom', finition: 'Brillante', nouvelle: true, nouvelleFinition: true, encre: 0 }]);
    assert.equal(ouvert.etat.encre, 12);
    await service.ouvrirUnPaquet([]);
    assert.deepEqual(appels[1], { fonction: 'ouvrir_un_paquet', parametres: { p_masques: [], p_demande: 'demande-2' } }, 'un nouveau paquet, une nouvelle demande');
  });

  it('un paquet ou un cadeau redemandé après une panne garde son identifiant de demande', async () => {
    const reponses: Record<string, unknown> = { ouvrir_un_paquet: new ErreurDuServeur('Le serveur du jeu ne répond pas.', false), reclamer_recompense: new ErreurDuServeur('Le serveur du jeu ne répond pas.', false) };
    const { service, appels } = doublure(reponses);
    await assert.rejects(service.ouvrirUnPaquet([]));
    await assert.rejects(service.reclamerRecompense('achat', []));
    reponses.ouvrir_un_paquet = { cartes: [], etat: ETAT };
    reponses.reclamer_recompense = { cartes: [], etat: ETAT };
    await service.ouvrirUnPaquet(['Familier']);
    await service.reclamerRecompense('achat', []);
    assert.deepEqual(appels.map((a) => [a.fonction, (a.parametres as { p_demande?: string }).p_demande]), [
      ['ouvrir_un_paquet', 'demande-1'], ['reclamer_recompense', 'demande-2'], ['ouvrir_un_paquet', 'demande-1'], ['reclamer_recompense', 'demande-2'],
    ]);
  });

  it('enregistre le deck, et joue les duels avec un ticket', async () => {
    const { service, appels } = doublure({ changer_de_deck: ['a-nom'], commencer_un_duel: 7, terminer_un_duel: { encre: 30, reduite: false, etat: ETAT } });
    assert.deepEqual(await service.changerDeDeck(['a-nom', 'inconnue-nom']), ['a-nom']);
    assert.equal(await service.commencerUnDuel('Normal'), 7);
    const fin = await service.terminerUnDuel(7, 'victoire');
    assert.deepEqual({ encre: fin.encre, reduite: fin.reduite, total: fin.etat.encre }, { encre: 30, reduite: false, total: 12 });
    assert.deepEqual(appels.map((a) => a.fonction), ['changer_de_deck', 'commencer_un_duel', 'terminer_un_duel']);
    assert.deepEqual(appels[2].parametres, { p_ticket: 7, p_resultat: 'victoire' });
  });

  it('définit un code de secours et retrouve une collection avec', async () => {
    const { service, appels } = doublure({ definir_un_code_de_secours: { ...ETAT, codeDeSecoursLe: 777 }, recuperer_par_code: { ...ETAT, profil: { pseudo: 'Zeugma 12', cote: 1016, jouees: 3, gagnees: 2 } } });
    assert.equal((await service.definirUnCode('ABCDEFGHJKMNPQRSTUVW')).codeDeSecoursLe, 777);
    const retrouvee = await service.recupererParCode('ABCDEFGHJKMNPQRSTUVW');
    assert.equal(Object.keys(retrouvee.etat.cartes).length, 1);
    assert.equal(retrouvee.profil?.pseudo, 'Zeugma 12');
    assert.deepEqual(appels.map((a) => [a.fonction, a.parametres]), [['definir_un_code_de_secours', { p_code: 'ABCDEFGHJKMNPQRSTUVW' }], ['recuperer_par_code', { p_code: 'ABCDEFGHJKMNPQRSTUVW' }]]);
    const { service: refus } = doublure({ recuperer_par_code: { refus: 'Ce code ne correspond à aucune collection.' } });
    await assert.rejects(refus.recupererParCode('ZZZZZZZZZZZZZZZZZZZZ'), (e: unknown) => e instanceof ErreurDuServeur && e.refus && e.message.includes('aucune collection'));
  });
});
