// Ce que le duel change dans la sauvegarde : le deck, la maîtrise des mots, les récompenses.
// Fonctions pures : elles reçoivent une sauvegarde et en rendent une nouvelle, sans rien écrire nulle part.

import type { Rarete } from '../partage/types.ts';
import type { Niveau, ReglesDuDuel } from './duel.ts';
import { coteApres } from './joute.ts';
import type { ProfilDeJoute, ReglesDesJoutes } from './joute.ts';
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

// Une bonne réponse en duel compte pour la maîtrise du mot ; une mauvaise ne retire rien à la maîtrise, mais
// elle est comptée : le « double » du joueur, dans les joutes, connaîtra ce mot ni mieux ni moins bien que lui.
export function noterUneReponse(sauvegarde: Sauvegarde, idCarte: string, reussi: boolean, maintenant: number, regles: ReglesDuDuel): Reponse {
  const carte = sauvegarde.cartes[idCarte];
  if (!carte) return { sauvegarde, vientDEtreMaitrisee: false };
  // Les réponses déjà données comptent encore après la vente d'un timbre.
  const totalDefinitions = Math.max(sauvegarde.profil.progressionSucces.definitions ?? 0, Object.values(sauvegarde.cartes).reduce((n, c) => n + c.reussites, 0));
  const profil = reussi ? { ...sauvegarde.profil, progressionSucces: { ...sauvegarde.profil.progressionSucces, definitions: totalDefinitions + 1 } } : sauvegarde.profil;
  const reussites = carte.reussites + (reussi ? 1 : 0);
  const vientDEtreMaitrisee = reussi && carte.maitriseeLe === null && reussites >= regles.reussitesPourLaMaitrise;
  return {
    sauvegarde: { ...sauvegarde, profil, cartes: { ...sauvegarde.cartes, [idCarte]: { ...carte, posees: carte.posees + 1, reussites, maitriseeLe: vientDEtreMaitrisee ? maintenant : carte.maitriseeLe } } },
    vientDEtreMaitrisee,
  };
}

// Une tentative de parade : le joueur a-t-il reconnu le mot adverse ? Comptée par rareté, pour son double.
export function noterUneParade(sauvegarde: Sauvegarde, rarete: Rarete, reussie: boolean): Sauvegarde {
  const avant = sauvegarde.parades[rarete] ?? { posees: 0, reussies: 0 };
  return { ...sauvegarde, parades: { ...sauvegarde.parades, [rarete]: { posees: avant.posees + 1, reussies: avant.reussies + (reussie ? 1 : 0) } } };
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
  return recompenser(sauvegarde, regles.encreParVictoire[niveau], resultat, maintenant, regles);
}

function recompenser(sauvegarde: Sauvegarde, encrePleine: number, resultat: Resultat, maintenant: number, regles: ReglesDuDuel): Recompense {
  const jour = jourDe(maintenant);
  const victoiresDuJour = sauvegarde.duels.jour === jour ? sauvegarde.duels.victoiresDuJour : 0;
  const gagne = resultat === 'victoire';
  const reduite = gagne && victoiresDuJour >= regles.victoiresPleinesParJour;
  const encre = !gagne ? regles.encreParDefaite : reduite ? Math.max(1, Math.round(encrePleine * regles.partDeLEncreEnsuite)) : encrePleine;
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

// ── Les joutes ──────────────────────────────────────────────────────────────
export type FinDeJoute = Recompense & { coteAvant: number; coteApres: number };

// Fin d'une joute : la cote du joueur bouge selon la force de l'adversaire, et l'Encre est versée
// (même plafond quotidien que pour les duels d'entraînement).
// Quand un serveur tient le classement, c'est lui qui donne la cote (« coteDuServeur ») ; sinon le jeu la calcule.
export function terminerUneJoute(sauvegarde: Sauvegarde, adversaire: Pick<ProfilDeJoute, 'id' | 'cote'>, resultat: Resultat, maintenant: number, regles: ReglesDuDuel, joutes: ReglesDesJoutes, coteDuServeur?: { avant: number; apres: number }): FinDeJoute {
  const coteAvant = coteDuServeur?.avant ?? sauvegarde.joutes.cote ?? joutes.coteDeDepart;
  const nouvelleCote = coteDuServeur?.apres ?? coteApres(coteAvant, adversaire.cote, resultat, joutes);
  const recompense = recompenser(sauvegarde, joutes.encreParVictoire, resultat, maintenant, regles);
  return {
    ...recompense,
    coteAvant,
    coteApres: nouvelleCote,
    sauvegarde: {
      ...recompense.sauvegarde,
      joutes: {
        ...sauvegarde.joutes,
        cote: nouvelleCote,
        jouees: sauvegarde.joutes.jouees + 1,
        gagnees: sauvegarde.joutes.gagnees + (resultat === 'victoire' ? 1 : 0),
        recents: [...sauvegarde.joutes.recents.filter((id) => id !== adversaire.id), adversaire.id].slice(-joutes.adversairesRecentsEvites),
      },
    },
  };
}
