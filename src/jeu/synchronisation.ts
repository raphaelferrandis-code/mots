// Quand le serveur tient la collection (BRIEF-marche.md, §5a), l'appareil n'en garde qu'une copie. Ce fichier dit
// comment l'état venu du serveur se glisse dans la sauvegarde locale, ce que l'appareil garde en propre (réglages,
// résultats en duel, maîtrise des mots, joutes), et ce qu'on envoie au serveur pour importer, une fois, une partie
// qui vivait sur l'appareil. Fonctions pures : rien n'est lu ni écrit ici.

import type { Finition } from '../partage/types.ts';
import type { CartePossedee, Sauvegarde } from './sauvegarde.ts';

// Ce que le serveur rend après chaque action (fonction etat_du_compte de serveur/collections.ts).
export type EtatDuCompte = {
  encre: number;
  paquets: { stock: number; reference: number; ouverts: number; sansLegendaire: number };
  deck: string[];
  maintenant: number; // l'heure du serveur, en millisecondes
  cartes: Record<string, { obtenueLe: number; doublons: number; finitions: Partial<Record<Finition, number>> }>;
  codeDeSecoursLe: number | null; // quand le joueur a défini son code de secours (décision n° 36), sinon null
  payant: boolean; // la version payante (décision n° 34) : sans limite au marché, avec l'histoire des cotes
};

// Ce que rend une récupération par code : l'état du compte retrouvé, et le profil de joute s'il y en a un.
export type ProfilRetrouve = { pseudo: string; cote: number; jouees: number; gagnees: number };
export type Recuperation = { etat: EtatDuCompte; profil: ProfilRetrouve | null };

export function lireRecuperation(brut: unknown): Recuperation {
  const etat = lireEtat(brut);
  const lu = estUnObjet(brut) && estUnObjet(brut.profil) ? brut.profil : null;
  const profil: ProfilRetrouve | null = lu && typeof lu.pseudo === 'string' ? { pseudo: lu.pseudo, cote: nombre(lu.cote), jouees: nombre(lu.jouees), gagnees: nombre(lu.gagnees) } : null;
  return { etat, profil };
}

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nombre = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// Relit ce que le serveur a envoyé, sans rien supposer de sa forme : une réponse abîmée donne un état vide plutôt qu'un plantage.
export function lireEtat(brut: unknown): EtatDuCompte {
  if (!estUnObjet(brut)) throw new Error('Le serveur a envoyé un état illisible.');
  const paquets = estUnObjet(brut.paquets) ? brut.paquets : {};
  const cartes: EtatDuCompte['cartes'] = {};
  if (estUnObjet(brut.cartes)) {
    for (const [id, valeur] of Object.entries(brut.cartes)) {
      if (!estUnObjet(valeur)) continue;
      const finitions: Partial<Record<Finition, number>> = {};
      if (estUnObjet(valeur.finitions)) {
        for (const [f, n] of Object.entries(valeur.finitions)) if ((f === 'Normale' || f === 'Brillante' || f === 'Holographique') && nombre(n) > 0) finitions[f] = nombre(n);
      }
      cartes[id] = { obtenueLe: nombre(valeur.obtenueLe), doublons: nombre(valeur.doublons), finitions: Object.keys(finitions).length > 0 ? finitions : { Normale: 1 } };
    }
  }
  return {
    encre: nombre(brut.encre),
    paquets: { stock: nombre(paquets.stock), reference: nombre(paquets.reference), ouverts: nombre(paquets.ouverts), sansLegendaire: nombre(paquets.sansLegendaire) },
    deck: Array.isArray(brut.deck) ? brut.deck.filter((id): id is string => typeof id === 'string') : [],
    maintenant: nombre(brut.maintenant),
    cartes,
    codeDeSecoursLe: typeof brut.codeDeSecoursLe === 'number' && Number.isFinite(brut.codeDeSecoursLe) ? brut.codeDeSecoursLe : null,
    payant: brut.payant === true,
  };
}

// Ce que le serveur tient pour vrai remplace ce que l'appareil croyait ; ce que l'appareil garde en propre reste.
export function fusionner(locale: Sauvegarde, etat: EtatDuCompte): Sauvegarde {
  const cartes: Record<string, CartePossedee> = {};
  for (const [id, possedee] of Object.entries(etat.cartes)) {
    const connue = locale.cartes[id];
    cartes[id] = {
      obtenueLe: possedee.obtenueLe,
      doublons: possedee.doublons,
      finitions: { ...possedee.finitions },
      posees: connue?.posees ?? 0,
      reussites: connue?.reussites ?? 0,
      maitriseeLe: connue?.maitriseeLe ?? null,
    };
  }
  return { ...locale, encre: etat.encre, paquets: { ...etat.paquets }, cartes, deck: etat.deck.filter((id) => id in cartes) };
}

// Une partie qui a déjà vécu sur l'appareil vaut la peine d'être importée sur le serveur (sinon : un compte neuf).
export const aQuelqueChoseAImporter = (sauvegarde: Sauvegarde): boolean =>
  sauvegarde.paquets.ouverts > 0 || Object.keys(sauvegarde.cartes).length > 0 || sauvegarde.encre > 0;

// Ce que l'on envoie au serveur pour l'importation (fonction importer_ma_collection) : rien de ce que l'appareil garde en propre.
export function aImporter(sauvegarde: Sauvegarde) {
  return {
    creeLe: sauvegarde.creeLe,
    encre: sauvegarde.encre,
    paquets: { stock: sauvegarde.paquets.stock, reference: sauvegarde.paquets.reference, ouverts: sauvegarde.paquets.ouverts, sansLegendaire: sauvegarde.paquets.sansLegendaire },
    cartes: Object.fromEntries(Object.entries(sauvegarde.cartes).map(([id, c]) => [id, { obtenueLe: c.obtenueLe, doublons: c.doublons, finitions: c.finitions }])),
    deck: sauvegarde.deck,
  };
}
