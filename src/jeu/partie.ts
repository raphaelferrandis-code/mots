// Les actions du joueur sur sa sauvegarde : ouvrir un paquet de la réserve. L’Encre sert uniquement aux enchères.
// Fonctions pures : elles reçoivent une sauvegarde et en rendent une nouvelle, sans rien écrire nulle part.

import type { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { CarteIndex, Finition, Registre } from '../partage/types.ts';
import type { Hasard } from './hasard.ts';
import { contientUneLegendaire, ouvrirPaquet } from './paquets.ts';
import type { Reserve } from './paquets.ts';
import { rechargerLesPaquets, retirerUnPaquet } from './recharge.ts';
import type { Sauvegarde } from './sauvegarde.ts';

type Equilibrage = typeof EQUILIBRAGE;

export type CarteObtenue = {
  carte: CarteIndex;
  finition: Finition;
  nouvelle: boolean; // première fois que le joueur obtient cette carte
  nouvelleFinition: boolean; // carte déjà possédée, mais pas encore dans cette finition
  encre: number; // Encre reçue si c'est un vrai doublon (carte et finition déjà possédées)
};

export type Ouverture = { sauvegarde: Sauvegarde; cartes: CarteObtenue[] };

export function registresMasques(sauvegarde: Sauvegarde): Registre[] {
  const masques: Registre[] = [];
  if (sauvegarde.reglages.masquerFamiliers) masques.push('Familier');
  if (sauvegarde.reglages.masquerInjurieux) masques.push('Injurieux');
  return masques;
}

// Remet une sauvegarde d'aplomb par rapport aux règles actuelles (stock plafonné, paquets gagnés depuis la dernière
// visite). « payant » : la version payante recharge plus vite et garde une réserve plus grande (décision n° 34).
export function mettreAJour(sauvegarde: Sauvegarde, maintenant: number, equilibrage: Equilibrage, payant = false): Sauvegarde {
  const reglages = payant ? equilibrage.payant : equilibrage.paquets;
  const plafonne = { ...sauvegarde.paquets, stock: Math.min(sauvegarde.paquets.stock, Math.max(equilibrage.paquets.stockMaximum, equilibrage.payant.stockMaximum)) };
  return { ...sauvegarde, paquets: { ...plafonne, ...rechargerLesPaquets(plafonne, maintenant, reglages) } };
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
    equilibrage.finitions,
  );

  const cartes = { ...sauvegarde.cartes };
  let encre = sauvegarde.encre;
  const obtenues: CarteObtenue[] = tirees.map(({ carte, finition }) => {
    const possedee = cartes[carte.id];
    if (!possedee) {
      cartes[carte.id] = { obtenueLe: maintenant, doublons: 0, finitions: { [finition]: 1 }, posees: 0, reussites: 0, maitriseeLe: null };
      return { carte, finition, nouvelle: true, nouvelleFinition: true, encre: 0 };
    }
    const dejaDansCetteFinition = (possedee.finitions[finition] ?? 0) > 0;
    const finitions = { ...possedee.finitions, [finition]: (possedee.finitions[finition] ?? 0) + 1 };
    // Une finition que le joueur n'avait pas encore se garde : elle compte à part dans la collection.
    if (!dejaDansCetteFinition) {
      cartes[carte.id] = { ...possedee, finitions };
      return { carte, finition, nouvelle: false, nouvelleFinition: true, encre: 0 };
    }
    const gain = equilibrage.encreParDoublon[carte.rarete] * equilibrage.finitions.encre[finition];
    cartes[carte.id] = { ...possedee, doublons: possedee.doublons + 1, finitions };
    encre += gain;
    return { carte, finition, nouvelle: false, nouvelleFinition: false, encre: gain };
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
