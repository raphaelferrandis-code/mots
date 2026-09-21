// Les actions du joueur sur sa sauvegarde : ouvrir un paquet gratuit, en acheter un avec de l'Encre.
// Fonctions pures : elles reçoivent une sauvegarde et en rendent une nouvelle, sans rien écrire nulle part.

import type { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { CarteIndex, Registre } from '../partage/types.ts';
import type { Hasard } from './hasard.ts';
import { contientUneLegendaire, ouvrirPaquet } from './paquets.ts';
import type { Reserve } from './paquets.ts';
import { rechargerLesPaquets, retirerUnPaquet } from './recharge.ts';
import type { Sauvegarde } from './sauvegarde.ts';

type Equilibrage = typeof EQUILIBRAGE;

export type CarteObtenue = {
  carte: CarteIndex;
  nouvelle: boolean;
  encre: number; // Encre reçue si c'est un doublon
};

export type Ouverture = { sauvegarde: Sauvegarde; cartes: CarteObtenue[] };

export function registresMasques(sauvegarde: Sauvegarde): Registre[] {
  const masques: Registre[] = [];
  if (sauvegarde.reglages.masquerFamiliers) masques.push('Familier');
  if (sauvegarde.reglages.masquerInjurieux) masques.push('Injurieux');
  return masques;
}

// Remet une sauvegarde d'aplomb par rapport aux règles actuelles (stock plafonné, paquets gagnés depuis la dernière visite).
export function mettreAJour(sauvegarde: Sauvegarde, maintenant: number, equilibrage: Equilibrage): Sauvegarde {
  const plafonne = { ...sauvegarde.paquets, stock: Math.min(sauvegarde.paquets.stock, equilibrage.paquets.stockMaximum) };
  return { ...sauvegarde, paquets: { ...plafonne, ...rechargerLesPaquets(plafonne, maintenant, equilibrage.paquets) } };
}

export type Contexte = {
  reserve: Reserve; // cartes disponibles, déjà débarrassées des registres masqués
  maintenant: number;
  hasard: Hasard;
  equilibrage: Equilibrage;
};

function ouvrir(sauvegarde: Sauvegarde, contexte: Contexte): Ouverture {
  const { equilibrage, maintenant } = contexte;
  // Les paquets de départ ne contiennent que des cartes nouvelles, pour pouvoir composer un deck tout de suite.
  const deDepart = sauvegarde.paquets.ouverts < equilibrage.paquets.paquetsDeDepart;
  const tirees = ouvrirPaquet(
    contexte.reserve,
    { hasard: contexte.hasard, paquetsSansLegendaire: sauvegarde.paquets.sansLegendaire, exclure: deDepart ? new Set(Object.keys(sauvegarde.cartes)) : undefined },
    equilibrage.paquets,
  );

  const cartes = { ...sauvegarde.cartes };
  let encre = sauvegarde.encre;
  const obtenues: CarteObtenue[] = tirees.map((carte) => {
    const possedee = cartes[carte.id];
    if (!possedee) {
      cartes[carte.id] = { obtenueLe: maintenant, doublons: 0 };
      return { carte, nouvelle: true, encre: 0 };
    }
    const gain = equilibrage.encreParDoublon[carte.rarete];
    cartes[carte.id] = { ...possedee, doublons: possedee.doublons + 1 };
    encre += gain;
    return { carte, nouvelle: false, encre: gain };
  });

  return {
    cartes: obtenues,
    sauvegarde: {
      ...sauvegarde,
      encre,
      cartes,
      paquets: { ...sauvegarde.paquets, ouverts: sauvegarde.paquets.ouverts + 1, sansLegendaire: contientUneLegendaire(tirees) ? 0 : sauvegarde.paquets.sansLegendaire + 1 },
    },
  };
}

export function ouvrirUnPaquetGratuit(sauvegarde: Sauvegarde, contexte: Contexte): Ouverture {
  const aJour = mettreAJour(sauvegarde, contexte.maintenant, contexte.equilibrage);
  const paquets = { ...aJour.paquets, ...retirerUnPaquet(aJour.paquets, contexte.maintenant, contexte.equilibrage.paquets) };
  return ouvrir({ ...aJour, paquets }, contexte);
}

export function acheterUnPaquet(sauvegarde: Sauvegarde, contexte: Contexte): Ouverture {
  const prix = contexte.equilibrage.paquets.prixEnEncre;
  if (sauvegarde.encre < prix) throw new Error("Pas assez d'Encre");
  const aJour = mettreAJour(sauvegarde, contexte.maintenant, contexte.equilibrage);
  return ouvrir({ ...aJour, encre: aJour.encre - prix }, contexte);
}
