// Ce que le duel change dans la sauvegarde : le deck, la maîtrise des mots, les récompenses.
// Fonctions pures : elles reçoivent une sauvegarde et en rendent une nouvelle, sans rien écrire nulle part.

import type { Niveau, ReglesDuDuel } from './duel.ts';
import type { Sauvegarde } from './sauvegarde.ts';

// ── Le deck ─────────────────────────────────────────────────────────────────
// Le deck enregistré peut être incomplet (on le compose carte après carte) ; il ne contient que des cartes
// possédées, chacune une seule fois, et jamais plus que la taille prévue.
export function enregistrerLeDeck(sauvegarde: Sauvegarde, ids: readonly string[], regles: ReglesDuDuel): Sauvegarde {
  const deck = [...new Set(ids)].filter((id) => id in sauvegarde.cartes).slice(0, regles.tailleDuDeck);
  return { ...sauvegarde, deck };
}

// Le deck tel qu'on peut le jouer : les cartes que le jeu connaît et que le joueur a le droit de voir
// (« jouables » = cartes de l'édition, débarrassées des registres masqués).
export function cartesDuDeck<T extends { id: string }>(sauvegarde: Sauvegarde, jouables: ReadonlyMap<string, T>): T[] {
  return sauvegarde.deck.flatMap((id) => (id in sauvegarde.cartes ? jouables.get(id) ?? [] : []));
}

// ── La maîtrise ─────────────────────────────────────────────────────────────
export type Reponse = { sauvegarde: Sauvegarde; vientDEtreMaitrisee: boolean };

// Une bonne réponse en duel compte pour la maîtrise du mot ; une mauvaise ne retire rien.
export function noterUneReponse(sauvegarde: Sauvegarde, idCarte: string, reussi: boolean, maintenant: number, regles: ReglesDuDuel): Reponse {
  const carte = sauvegarde.cartes[idCarte];
  if (!carte || !reussi) return { sauvegarde, vientDEtreMaitrisee: false };
  const reussites = carte.reussites + 1;
  const vientDEtreMaitrisee = carte.maitriseeLe === null && reussites >= regles.reussitesPourLaMaitrise;
  return {
    sauvegarde: { ...sauvegarde, cartes: { ...sauvegarde.cartes, [idCarte]: { ...carte, reussites, maitriseeLe: vientDEtreMaitrisee ? maintenant : carte.maitriseeLe } } },
    vientDEtreMaitrisee,
  };
}

// ── Les récompenses ─────────────────────────────────────────────────────────
export type Resultat = 'victoire' | 'defaite' | 'nul';
export type Recompense = { sauvegarde: Sauvegarde; encre: number; reduite: boolean };

// Le jour du joueur (à l'heure de son appareil), pour le plafond quotidien.
export function jourDe(maintenant: number): string {
  const date = new Date(maintenant);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Les premières victoires de la journée rapportent toute leur Encre, les suivantes une petite part :
// le duel récompense, mais ne remplace pas les paquets.
export function terminerUnDuel(sauvegarde: Sauvegarde, niveau: Niveau, resultat: Resultat, maintenant: number, regles: ReglesDuDuel): Recompense {
  const jour = jourDe(maintenant);
  const victoiresDuJour = sauvegarde.duels.jour === jour ? sauvegarde.duels.victoiresDuJour : 0;
  const gagne = resultat === 'victoire';
  const reduite = gagne && victoiresDuJour >= regles.victoiresPleinesParJour;
  const encre = !gagne ? regles.encreParDefaite : reduite ? Math.max(1, Math.round(regles.encreParVictoire[niveau] * regles.partDeLEncreEnsuite)) : regles.encreParVictoire[niveau];
  return {
    encre,
    reduite,
    sauvegarde: {
      ...sauvegarde,
      encre: sauvegarde.encre + encre,
      duels: { joues: sauvegarde.duels.joues + 1, gagnes: sauvegarde.duels.gagnes + (gagne ? 1 : 0), jour, victoiresDuJour: victoiresDuJour + (gagne ? 1 : 0) },
    },
  };
}
