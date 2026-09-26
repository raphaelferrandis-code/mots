// Les collections côté service. Quand le serveur en est propriétaire (src/config/serveur.ts, collectionsSurLeServeur :
// docs/BRIEF-marche.md, §5a), tout ce qui a de la valeur — les timbres, l'Encre, les paquets, le deck, les récompenses —
// passe par ses fonctions (serveur/collections.ts). Sinon, le jeu vit sur l'appareil comme avant, et ce service est inactif.

import { SERVEUR } from '../config/serveur.ts';
import { lireApparence } from '../jeu/personnalisation.ts';
import type { Apparence } from '../jeu/personnalisation.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import { aImporter, lireEtat, lireRecuperation } from '../jeu/synchronisation.ts';
import type { EtatDuCompte, Recuperation } from '../jeu/synchronisation.ts';
import { FINITIONS } from '../partage/types.ts';
import type { Finition, Registre } from '../partage/types.ts';
import { chacunSonTour, clientDuServeur, serveurUtilise } from './compte.ts';
import { appelerAvecUneDemande, avecUneDemande } from './demandes.ts';
import type { AvecUneDemande } from './demandes.ts';
import { ErreurDuServeur } from './supabase.ts';
import type { ClientSupabase } from './supabase.ts';

export type CarteTireeParLeServeur = { id: string; finition: Finition; nouvelle: boolean; nouvelleFinition: boolean; encre: number };

export type ServeurDesCollections = {
  actif: boolean;
  // Le compte du joueur, ou null s'il n'en a pas encore sur le serveur.
  monCompte(): Promise<EtatDuCompte | null>;
  ouvrirMonCompte(): Promise<EtatDuCompte>;
  // Importe une seule fois la partie qui vivait sur l'appareil (le serveur la ramène à ce qui est plausible).
  importer(sauvegarde: Sauvegarde): Promise<EtatDuCompte>;
  reclamerRecompense(type: 'achat' | 'hebdomadaire', masques: readonly Registre[]): Promise<{ cartes: CarteTireeParLeServeur[]; etat: EtatDuCompte }>;
  ouvrirUnPaquet(masques: readonly Registre[]): Promise<{ cartes: CarteTireeParLeServeur[]; etat: EtatDuCompte }>;
  // Rend le deck tel que le serveur l'a enregistré (cartes possédées seulement).
  changerDeDeck(deck: readonly string[]): Promise<string[]>;
  // Enregistre des choix d'apparence (les autres restent) ; rend toute l'apparence que le serveur garde.
  changerDApparence(choix: Partial<Apparence>): Promise<Partial<Apparence> | null>;
  // Le code de secours (décision n° 36) : le définir, ou retrouver une collection avec.
  definirUnCode(code: string): Promise<EtatDuCompte>;
  declarerMaNaissance(annee: number, mois: number): Promise<EtatDuCompte>;
  recupererParCode(code: string): Promise<Recuperation>;
};

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const estUneFinition = (v: unknown): v is Finition => typeof v === 'string' && (FINITIONS as readonly string[]).includes(v);

function lireLesCartesTirees(brut: unknown): CarteTireeParLeServeur[] {
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((t) => (estUnObjet(t) && typeof t.id === 'string' && estUneFinition(t.finition)
    ? [{ id: t.id, finition: t.finition, nouvelle: t.nouvelle === true, nouvelleFinition: t.nouvelleFinition === true, encre: typeof t.encre === 'number' ? t.encre : 0 }]
    : []));
}

// Le service branché sur un client donné : celui du serveur dans le jeu, une doublure dans les tests. Un paquet ou un
// cadeau redemandé après une coupure reprend son identifiant de demande (services/demandes.ts).
export function serveurDesCollectionsAvec(client: ClientSupabase, demandes: AvecUneDemande = avecUneDemande): ServeurDesCollections {
  return {
    actif: true,
    // Dans la file, comme les actions : une lecture partie avant un achat ne peut pas revenir après lui.
    monCompte: () => chacunSonTour(async () => { const brut = await client.appeler<unknown>('mon_compte'); return brut === null ? null : lireEtat(brut); }),
    ouvrirMonCompte: () => chacunSonTour(async () => lireEtat(await client.appeler<unknown>('ouvrir_mon_compte'))),
    importer: (sauvegarde) => chacunSonTour(async () => {
      const envoi = aImporter(sauvegarde);
      return lireEtat(await client.appeler<unknown>('importer_ma_collection', { p_cree_le: envoi.creeLe, p_encre: envoi.encre, p_paquets: envoi.paquets, p_cartes: envoi.cartes, p_deck: envoi.deck }));
    }),
    ouvrirUnPaquet: (masques) => chacunSonTour(async () => {
      const brut = await appelerAvecUneDemande<unknown>(client, demandes, 'paquet', 'ouvrir_un_paquet', { p_masques: [...masques] });
      const lu = estUnObjet(brut) ? brut : {};
      return { cartes: lireLesCartesTirees(lu.cartes), etat: lireEtat(lu.etat) };
    }),
    reclamerRecompense: (type, masques) => chacunSonTour(async () => {
      const brut = await appelerAvecUneDemande<unknown>(client, demandes, `cadeau:${type}`, 'reclamer_recompense', { p_type: type, p_masques: [...masques] });
      const lu = estUnObjet(brut) ? brut : {};
      return { cartes: lireLesCartesTirees(lu.cartes), etat: lireEtat(lu.etat) };
    }),
    changerDeDeck: (deck) => chacunSonTour(async () => {
      const brut = await client.appeler<unknown>('changer_de_deck', { p_deck: [...deck] });
      return Array.isArray(brut) ? brut.filter((id): id is string => typeof id === 'string') : [];
    }),
    changerDApparence: (choix) => chacunSonTour(async () => lireApparence(await client.appeler<unknown>('changer_d_apparence', { p_apparence: { ...choix } }))),
    definirUnCode: (code) => chacunSonTour(async () => lireEtat(await client.appeler<unknown>('definir_un_code_de_secours', { p_code: code }))),
    declarerMaNaissance: (annee, mois) => chacunSonTour(async () => lireEtat(await client.appeler<unknown>('declarer_ma_naissance', { p_annee: annee, p_mois: mois }))),
    recupererParCode: (code) => chacunSonTour(async () => {
      const brut = await client.appeler<unknown>('recuperer_par_code', { p_code: code });
      // Un mauvais code : un refus motivé, que le joueur peut lire tel quel (et qui ne met pas l'appareil hors ligne).
      if (estUnObjet(brut) && typeof brut.refus === 'string') throw new ErreurDuServeur(brut.refus, true);
      return lireRecuperation(brut);
    }),
  };
}

const jamais = (): never => { throw new Error("La collection vit sur cet appareil : le serveur n'en est pas propriétaire."); };
const inactif: ServeurDesCollections = {
  actif: false,
  monCompte: async () => null,
  ouvrirMonCompte: async () => jamais(),
  importer: async () => jamais(),
  ouvrirUnPaquet: async () => jamais(),
  reclamerRecompense: async () => jamais(),
  changerDeDeck: async () => jamais(),
  changerDApparence: async () => jamais(),
  definirUnCode: async () => jamais(),
  declarerMaNaissance: async () => jamais(),
  recupererParCode: async () => jamais(),
};

export const serveurDesCollections: ServeurDesCollections = SERVEUR.collectionsSurLeServeur && serveurUtilise ? serveurDesCollectionsAvec(clientDuServeur()) : inactif;
