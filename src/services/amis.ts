import { SERVEUR } from '../config/serveur.ts';
import type { Finition } from '../partage/types.ts';
import { lireEtat } from '../jeu/synchronisation.ts';
import { chacunSonTour, clientDuServeur, serveurUtilise } from './compte.ts';
import type { ClientSupabase } from './supabase.ts';

export type Relation = { id: string; pseudo: string; etat: 'ami' | 'recue' | 'envoyee'; defiable: boolean };
export type TimbreEchange = { carte: string; finition: Finition };
export type AlbumAmi = { carte: string; finitions: Partial<Record<Finition, number>> }[];
export type Echange = { id: string; envoye: boolean; pseudo: string; offerte: string; finition_offerte: Finition;
  demandee: string; finition_demandee: Finition; etat: 'attente' | 'accepte' | 'refuse' | 'annule' | 'expire'; expire_le: number };
export type CarnetAmis = { moi: { id: string; pseudo: string } | null; relations: Relation[]; echanges: Echange[] };
export type ActionAmitie = 'accepter' | 'refuser' | 'annuler' | 'retirer';
export type ActionEchange = Exclude<ActionAmitie, 'retirer'>;
export const amisDisponibles = SERVEUR.collectionsSurLeServeur && serveurUtilise;

export function serveurDesAmisAvec(client: ClientSupabase) {
  return {
    lire: () => client.appeler<CarnetAmis>('mes_amis'),
    demander: (pseudo: string) => chacunSonTour(() => client.appeler<void>('demander_ami', { p_pseudo: pseudo.trim() })),
    repondre: (id: string, action: ActionAmitie) => chacunSonTour(() => client.appeler<void>('repondre_ami', { p_ami: id, p_action: action })),
    album: (id: string) => client.appeler<AlbumAmi>('album_ami', { p_ami: id }),
    proposer: (id: string, ami: string, offerte: TimbreEchange, demandee: TimbreEchange) => chacunSonTour(() => client.appeler<void>('proposer_echange', {
      p_id: id, p_ami: ami, p_offerte: offerte.carte, p_finition_offerte: offerte.finition, p_demandee: demandee.carte, p_finition_demandee: demandee.finition,
    })),
    echanger: (id: string, action: ActionEchange) => chacunSonTour(async () => lireEtat(await client.appeler<unknown>('repondre_echange', { p_id: id, p_action: action }))),
  };
}
export const serveurDesAmis = () => serveurDesAmisAvec(clientDuServeur());
