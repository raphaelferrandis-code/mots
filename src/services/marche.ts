// Le marché côté service : les appels au serveur (serveur/marche.ts). Inactif tant que le serveur ne tient pas les
// collections — le marché n'existe pas sans lui.

import { SERVEUR } from '../config/serveur.ts';
import { lireCotes, lireHistoire } from '../jeu/cote.ts';
import type { CotesDUnTimbre, HistoireDeLaCote } from '../jeu/cote.ts';
import { lireDesEncheres, lireEnchere } from '../jeu/marche.ts';
import type { Enchere } from '../jeu/marche.ts';
import { lireEtat } from '../jeu/synchronisation.ts';
import type { EtatDuCompte } from '../jeu/synchronisation.ts';
import type { Finition } from '../partage/types.ts';
import { chacunSonTour, clientDuServeur, serveurUtilise } from './compte.ts';
import { appelerAvecUneDemande, avecUneDemande } from './demandes.ts';
import type { AvecUneDemande } from './demandes.ts';
import type { ClientSupabase } from './supabase.ts';

export type PageDuMarche = { encheres: Enchere[]; total: number; maintenant: number };
export type MesEncheres = { ventes: Enchere[]; mises: Enchere[]; maintenant: number };
export type ReponseDuMarche = { enchere: Enchere; etat: EtatDuCompte };

export type ServeurDuMarche = {
  actif: boolean;
  marche(recherche: string, page: number): Promise<PageDuMarche>;
  mesEncheres(): Promise<MesEncheres>;
  mettreEnVente(carte: string, finition: Finition, mise: number, achatImmediat: number | null, heures: number): Promise<ReponseDuMarche>;
  retirer(id: number): Promise<EtatDuCompte>;
  encherir(id: number, montant: number): Promise<ReponseDuMarche>;
  cotes(carte: string): Promise<CotesDUnTimbre>;
  histoire(carte: string): Promise<HistoireDeLaCote>; // version payante : le serveur refuse aux autres
};

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nombre = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function lireLaReponse(brut: unknown): ReponseDuMarche {
  const lu = estUnObjet(brut) ? brut : {};
  const enchere = lireEnchere(lu.enchere);
  if (!enchere) throw new Error('Le serveur a envoyé une enchère illisible.');
  return { enchere, etat: lireEtat(lu.etat) };
}

// Une mise en vente redemandée après une coupure reprend son identifiant de demande (services/demandes.ts).
export function serveurDuMarcheAvec(client: ClientSupabase, demandes: AvecUneDemande = avecUneDemande): ServeurDuMarche {
  return {
    actif: true,
    marche: async (recherche, page) => {
      const lu = await client.appeler<unknown>('marche', { p_recherche: recherche, p_page: page });
      const brut = estUnObjet(lu) ? lu : {};
      return { encheres: lireDesEncheres(brut.encheres), total: nombre(brut.total), maintenant: nombre(brut.maintenant) };
    },
    mesEncheres: async () => {
      const lu = await client.appeler<unknown>('mes_encheres');
      const brut = estUnObjet(lu) ? lu : {};
      return { ventes: lireDesEncheres(brut.ventes), mises: lireDesEncheres(brut.mises), maintenant: nombre(brut.maintenant) };
    },
    mettreEnVente: (carte, finition, mise, achatImmediat, heures) => chacunSonTour(async () => {
      const parametres = { p_carte: carte, p_finition: finition, p_mise: mise, p_achat_immediat: achatImmediat, p_heures: heures };
      return lireLaReponse(await appelerAvecUneDemande<unknown>(client, demandes, `vente:${JSON.stringify(parametres)}`, 'mettre_en_vente', parametres));
    }),
    retirer: (id) => chacunSonTour(async () => lireEtat(await client.appeler<unknown>('retirer_de_la_vente', { p_enchere: id }))),
    encherir: (id, montant) => chacunSonTour(async () => lireLaReponse(await client.appeler<unknown>('encherir', { p_enchere: id, p_montant: montant }))),
    cotes: async (carte) => lireCotes(await client.appeler<unknown>('cotes', { p_carte: carte })),
    histoire: async (carte) => lireHistoire(await client.appeler<unknown>('historique_de_la_cote', { p_carte: carte })),
  };
}

const jamais = (): never => { throw new Error('Le marché a besoin du serveur du jeu.'); };
const inactif: ServeurDuMarche = {
  actif: false,
  marche: async () => jamais(),
  mesEncheres: async () => jamais(),
  mettreEnVente: async () => jamais(),
  retirer: async () => jamais(),
  encherir: async () => jamais(),
  cotes: async () => jamais(),
  histoire: async () => jamais(),
};

export const serveurDuMarche: ServeurDuMarche = SERVEUR.collectionsSurLeServeur && serveurUtilise ? serveurDuMarcheAvec(clientDuServeur()) : inactif;
