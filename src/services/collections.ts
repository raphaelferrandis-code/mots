// Les collections côté service. Quand le serveur en est propriétaire (src/config/serveur.ts, collectionsSurLeServeur :
// BRIEF-marche.md, §5a), tout ce qui a de la valeur — les timbres, l'Encre, les paquets, le deck, les récompenses —
// passe par ses fonctions (serveur/collections.ts). Sinon, le jeu vit sur l'appareil comme avant, et ce service est inactif.

import { SERVEUR } from '../config/serveur.ts';
import type { Niveau } from '../jeu/duel.ts';
import type { Resultat } from '../jeu/progression.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import { aImporter, lireEtat } from '../jeu/synchronisation.ts';
import type { EtatDuCompte } from '../jeu/synchronisation.ts';
import { FINITIONS } from '../partage/types.ts';
import type { Finition, Registre } from '../partage/types.ts';
import { chacunSonTour, clientDuServeur, serveurUtilise } from './compte.ts';
import type { ClientSupabase } from './supabase.ts';

export type CarteTireeParLeServeur = { id: string; finition: Finition; nouvelle: boolean; nouvelleFinition: boolean; encre: number };
export type Recompense = { encre: number; reduite: boolean; etat: EtatDuCompte };

export type ServeurDesCollections = {
  actif: boolean;
  // Le compte du joueur, ou null s'il n'en a pas encore sur le serveur.
  monCompte(): Promise<EtatDuCompte | null>;
  ouvrirMonCompte(): Promise<EtatDuCompte>;
  // Importe une seule fois la partie qui vivait sur l'appareil (le serveur la ramène à ce qui est plausible).
  importer(sauvegarde: Sauvegarde): Promise<EtatDuCompte>;
  ouvrirUnPaquet(masques: readonly Registre[], achat: boolean): Promise<{ cartes: CarteTireeParLeServeur[]; etat: EtatDuCompte }>;
  // Rend le deck tel que le serveur l'a enregistré (cartes possédées seulement).
  changerDeDeck(deck: readonly string[]): Promise<string[]>;
  commencerUnDuel(niveau: Niveau): Promise<number>;
  terminerUnDuel(ticket: number, resultat: Resultat): Promise<Recompense>;
};

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const estUneFinition = (v: unknown): v is Finition => typeof v === 'string' && (FINITIONS as readonly string[]).includes(v);

function lireLesCartesTirees(brut: unknown): CarteTireeParLeServeur[] {
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((t) => (estUnObjet(t) && typeof t.id === 'string' && estUneFinition(t.finition)
    ? [{ id: t.id, finition: t.finition, nouvelle: t.nouvelle === true, nouvelleFinition: t.nouvelleFinition === true, encre: typeof t.encre === 'number' ? t.encre : 0 }]
    : []));
}

function lireLaRecompense(brut: unknown): Recompense {
  const lu = estUnObjet(brut) ? brut : {};
  return { encre: typeof lu.encre === 'number' ? lu.encre : 0, reduite: lu.reduite === true, etat: lireEtat(lu.etat) };
}

// Le service branché sur un client donné : celui du serveur dans le jeu, une doublure dans les tests.
export function serveurDesCollectionsAvec(client: ClientSupabase): ServeurDesCollections {
  return {
    actif: true,
    monCompte: async () => { const brut = await client.appeler<unknown>('mon_compte'); return brut === null ? null : lireEtat(brut); },
    ouvrirMonCompte: () => chacunSonTour(async () => lireEtat(await client.appeler<unknown>('ouvrir_mon_compte'))),
    importer: (sauvegarde) => chacunSonTour(async () => {
      const envoi = aImporter(sauvegarde);
      return lireEtat(await client.appeler<unknown>('importer_ma_collection', { p_cree_le: envoi.creeLe, p_encre: envoi.encre, p_paquets: envoi.paquets, p_cartes: envoi.cartes, p_deck: envoi.deck }));
    }),
    ouvrirUnPaquet: (masques, achat) => chacunSonTour(async () => {
      const brut = await client.appeler<unknown>(achat ? 'acheter_un_paquet' : 'ouvrir_un_paquet', { p_masques: [...masques] });
      const lu = estUnObjet(brut) ? brut : {};
      return { cartes: lireLesCartesTirees(lu.cartes), etat: lireEtat(lu.etat) };
    }),
    changerDeDeck: (deck) => chacunSonTour(async () => {
      const brut = await client.appeler<unknown>('changer_de_deck', { p_deck: [...deck] });
      return Array.isArray(brut) ? brut.filter((id): id is string => typeof id === 'string') : [];
    }),
    commencerUnDuel: (niveau) => client.appeler<number>('commencer_un_duel', { p_niveau: niveau }),
    terminerUnDuel: (ticket, resultat) => chacunSonTour(async () => lireLaRecompense(await client.appeler<unknown>('terminer_un_duel', { p_ticket: ticket, p_resultat: resultat }))),
  };
}

const jamais = (): never => { throw new Error("La collection vit sur cet appareil : le serveur n'en est pas propriétaire."); };
const inactif: ServeurDesCollections = {
  actif: false,
  monCompte: async () => null,
  ouvrirMonCompte: async () => jamais(),
  importer: async () => jamais(),
  ouvrirUnPaquet: async () => jamais(),
  changerDeDeck: async () => jamais(),
  commencerUnDuel: async () => jamais(),
  terminerUnDuel: async () => jamais(),
};

export const serveurDesCollections: ServeurDesCollections = SERVEUR.collectionsSurLeServeur && serveurUtilise ? serveurDesCollectionsAvec(clientDuServeur()) : inactif;
