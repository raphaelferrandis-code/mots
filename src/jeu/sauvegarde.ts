// La sauvegarde du joueur : ce qu'elle contient, comment on en crée une, et comment on relit
// une sauvegarde venue d'ailleurs (fichier importé, ancienne version du jeu) sans jamais planter.

import type { EtatDesPaquets } from './recharge.ts';

export const VERSION_DE_SAUVEGARDE = 1;

export type CartePossedee = {
  obtenueLe: number; // date de la première obtention (millisecondes)
  doublons: number; // nombre de fois où la carte a été retirée depuis
};

export type ReglagesDuJoueur = {
  masquerFamiliers: boolean;
  masquerInjurieux: boolean;
  reduireAnimations: boolean;
};

export type Sauvegarde = {
  version: number;
  creeLe: number;
  encre: number;
  paquets: EtatDesPaquets & {
    ouverts: number; // total de paquets ouverts
    sansLegendaire: number; // paquets ouverts d'affilée sans Légendaire (pour la garantie)
  };
  // Clé : identifiant de carte. Une carte qui n'existe plus dans l'édition est conservée mais ignorée par le jeu.
  cartes: Record<string, CartePossedee>;
  reglages: ReglagesDuJoueur;
  dernierExport: { le: number; paquetsOuverts: number } | null;
};

export function nouvelleSauvegarde(maintenant: number, paquetsDeDepart: number): Sauvegarde {
  return {
    version: VERSION_DE_SAUVEGARDE,
    creeLe: maintenant,
    encre: 0,
    paquets: { stock: paquetsDeDepart, reference: maintenant, ouverts: 0, sansLegendaire: 0 },
    cartes: {},
    reglages: { masquerFamiliers: false, masquerInjurieux: false, reduireAnimations: false },
    dernierExport: null,
  };
}

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const entierPositif = (v: unknown, defaut: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : defaut);

// Relit une sauvegarde inconnue. Ce qui est absent ou abîmé est remplacé par une valeur saine ;
// seul un contenu qui n'est pas une sauvegarde du tout est refusé.
export function relireSauvegarde(brut: unknown, maintenant: number): Sauvegarde {
  if (!estUnObjet(brut) || typeof brut.version !== 'number' || !estUnObjet(brut.cartes)) {
    throw new Error("Ce fichier n'est pas une sauvegarde du jeu.");
  }
  if (brut.version > VERSION_DE_SAUVEGARDE) {
    throw new Error('Cette sauvegarde vient d\'une version plus récente du jeu. Mets le jeu à jour avant de l\'importer.');
  }
  // (Quand une version 2 existera, les sauvegardes de version 1 seront converties ici.)

  const paquets = estUnObjet(brut.paquets) ? brut.paquets : {};
  const reglages = estUnObjet(brut.reglages) ? brut.reglages : {};
  const cartes: Record<string, CartePossedee> = {};
  for (const [id, valeur] of Object.entries(brut.cartes)) {
    if (!estUnObjet(valeur)) continue;
    cartes[id] = { obtenueLe: entierPositif(valeur.obtenueLe, maintenant), doublons: entierPositif(valeur.doublons, 0) };
  }
  const exporte = estUnObjet(brut.dernierExport) ? brut.dernierExport : null;

  return {
    version: VERSION_DE_SAUVEGARDE,
    creeLe: entierPositif(brut.creeLe, maintenant),
    encre: entierPositif(brut.encre, 0),
    paquets: {
      stock: entierPositif(paquets.stock, 0),
      // Une date dans le futur donnerait des paquets gratuits à l'import : on la ramène à maintenant.
      reference: Math.min(entierPositif(paquets.reference, maintenant), maintenant),
      ouverts: entierPositif(paquets.ouverts, 0),
      sansLegendaire: entierPositif(paquets.sansLegendaire, 0),
    },
    cartes,
    reglages: {
      masquerFamiliers: reglages.masquerFamiliers === true,
      masquerInjurieux: reglages.masquerInjurieux === true,
      reduireAnimations: reglages.reduireAnimations === true,
    },
    dernierExport: exporte ? { le: entierPositif(exporte.le, maintenant), paquetsOuverts: entierPositif(exporte.paquetsOuverts, 0) } : null,
  };
}
