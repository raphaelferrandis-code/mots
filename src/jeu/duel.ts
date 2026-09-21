// Les règles du duel. Fonctions pures : pas d'écran, pas de sauvegarde, et le hasard est fourni par l'appelant.
//
// Chaque camp a un deck, trois cartes en main et un « mot en jeu » (la dernière carte posée), qui le défend.
// À son tour, un camp choisit une carte de sa main et tente de prouver qu'il connaît le mot :
//   réussite → la carte attaque ; échec → « le mot lui échappe », pas d'attaque.
// Dans les deux cas la carte devient le nouveau mot en jeu, et le camp pioche.

import { defenseEnJeu } from '../config/equilibrage.ts';
import type { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { CarteIndex, Nature } from '../partage/types.ts';
import { choisir } from './hasard.ts';
import type { Hasard } from './hasard.ts';

export type Niveau = 'Facile' | 'Normal' | 'Difficile';
export const NIVEAUX: Niveau[] = ['Facile', 'Normal', 'Difficile'];
export type Cote = 'joueur' | 'adversaire';
export type ReglesDuDuel = (typeof EQUILIBRAGE)['duel'];

export type Camp = {
  pv: number;
  pioche: CarteIndex[];
  main: CarteIndex[];
  defausse: CarteIndex[];
  enJeu: CarteIndex | null;
};

export type Coup = {
  cote: Cote;
  carte: CarteIndex;
  reussi: boolean;
  degats: number;
  bonusDeType: number;
  bonusDeFaction: number;
  defenseAdverse: number;
};

export type Duel = {
  manche: number;
  aLaMain: Cote;
  premier: Cote;
  camps: Record<Cote, Camp>;
  vainqueur: Cote | 'nul' | null;
  coups: Coup[];
};

const autre = (cote: Cote): Cote => (cote === 'joueur' ? 'adversaire' : 'joueur');

// Triangle des types : chaque type bat le suivant. Les adverbes sont neutres.
const BAT: Partial<Record<Nature, Nature>> = { Nom: 'Adjectif', Adjectif: 'Verbe', Verbe: 'Nom' };

export function melanger<T>(liste: readonly T[], hasard: Hasard): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function campDeDepart(deck: readonly CarteIndex[], hasard: Hasard, regles: ReglesDuDuel): Camp {
  const pioche = melanger(deck, hasard);
  // Selon les réglages, la première carte du deck est retournée d'office : c'est le premier mot en jeu du camp.
  const enJeu = regles.motEnJeuAuDepart ? pioche.shift() ?? null : null;
  return { pv: regles.pointsDeVie, main: pioche.splice(0, regles.cartesEnMain), pioche, defausse: [], enJeu };
}

export function commencerLeDuel(deckDuJoueur: readonly CarteIndex[], deckAdverse: readonly CarteIndex[], hasard: Hasard, regles: ReglesDuDuel): Duel {
  const premier: Cote = hasard() < 0.5 ? 'joueur' : 'adversaire';
  return {
    manche: 1,
    aLaMain: premier,
    premier,
    camps: { joueur: campDeDepart(deckDuJoueur, hasard, regles), adversaire: campDeDepart(deckAdverse, hasard, regles) },
    vainqueur: null,
    coups: [],
  };
}

// Nombre de cartes de chaque faction dans l'édition : il décide quelles factions sont « petites ».
export type TaillesDesFactions = ReadonlyMap<string, number>;

// Ce que ferait la carte si son attaque réussissait.
export function evaluerLAttaque(duel: Duel, cote: Cote, carte: CarteIndex, tailles: TaillesDesFactions, regles: ReglesDuDuel): Omit<Coup, 'cote' | 'carte' | 'reussi'> {
  const adverse = duel.camps[autre(cote)].enJeu;
  const precedente = duel.camps[cote].enJeu;
  const bonusDeType = adverse && BAT[carte.type] === adverse.type ? regles.bonusDeType : 0;
  const memeFaction = precedente !== null && precedente.faction === carte.faction;
  const bonusDeFaction = !memeFaction ? 0 : (tailles.get(carte.faction) ?? Infinity) <= regles.petiteFactionJusquA ? regles.bonusDePetiteFaction : regles.bonusDeFaction;
  const defenseAdverse = adverse ? Math.round(defenseEnJeu(adverse.defense, adverse.rarete) * regles.partDeLaDefense) : 0;
  const degats = Math.max(regles.degatsMinimum, carte.attaque + bonusDeType + bonusDeFaction - defenseAdverse);
  return { degats, bonusDeType, bonusDeFaction, defenseAdverse };
}

// Le camp qui a la main joue une carte de sa main ; « reussi » dit s'il a prouvé qu'il connaissait le mot.
export function jouer(duel: Duel, idCarte: string, reussi: boolean, hasard: Hasard, tailles: TaillesDesFactions, regles: ReglesDuDuel): Duel {
  if (duel.vainqueur !== null) throw new Error('Le duel est terminé');
  const cote = duel.aLaMain;
  const camp = duel.camps[cote];
  const carte = camp.main.find((c) => c.id === idCarte);
  if (!carte) throw new Error("Cette carte n'est pas dans la main");

  const attaque = evaluerLAttaque(duel, cote, carte, tailles, regles);
  const coup: Coup = { cote, carte, reussi, ...attaque, degats: reussi ? attaque.degats : 0 };

  // La carte devient le mot en jeu ; l'ancien part à la défausse ; on pioche (la défausse reforme la pioche au besoin).
  let pioche = camp.pioche;
  let defausse = camp.enJeu ? [...camp.defausse, camp.enJeu] : camp.defausse;
  if (pioche.length === 0) { pioche = melanger(defausse, hasard); defausse = []; }
  const main = [...camp.main.filter((c) => c.id !== idCarte), ...pioche.slice(0, 1)];
  const nouveauCamp: Camp = { ...camp, main, pioche: pioche.slice(1), defausse, enJeu: carte };

  const adversaire = duel.camps[autre(cote)];
  const camps = { [cote]: nouveauCamp, [autre(cote)]: { ...adversaire, pv: Math.max(0, adversaire.pv - coup.degats) } } as Record<Cote, Camp>;

  // La manche se termine quand le second camp a joué.
  const finDeManche = cote !== duel.premier;
  const manche = finDeManche ? duel.manche + 1 : duel.manche;
  let vainqueur: Duel['vainqueur'] = null;
  if (camps[autre(cote)].pv <= 0) vainqueur = cote;
  else if (finDeManche && manche > regles.manchesMaximum) vainqueur = camps.joueur.pv === camps.adversaire.pv ? 'nul' : camps.joueur.pv > camps.adversaire.pv ? 'joueur' : 'adversaire';

  return { ...duel, manche: vainqueur ? duel.manche : manche, aLaMain: autre(cote), camps, vainqueur, coups: [...duel.coups, coup] };
}

// L'ordinateur choisit sa carte : au hasard en Facile, celle qui ferait le plus de dégâts sinon.
export function choisirPourLOrdinateur(duel: Duel, niveau: Niveau, hasard: Hasard, tailles: TaillesDesFactions, regles: ReglesDuDuel): CarteIndex {
  const main = duel.camps[duel.aLaMain].main;
  if (niveau === 'Facile') return choisir(main, hasard);
  return main.reduce((meilleure, carte) => (evaluerLAttaque(duel, duel.aLaMain, carte, tailles, regles).degats > evaluerLAttaque(duel, duel.aLaMain, meilleure, tailles, regles).degats ? carte : meilleure));
}

// La force d'une carte : ce qu'on lit dans les coins du timbre, défense en jeu comprise.
export const forceDeLaCarte = (carte: CarteIndex): number => carte.attaque + defenseEnJeu(carte.defense, carte.rarete);

// Le deck de l'ordinateur : pour chaque carte du joueur, une carte de la même rareté et de force comparable
// (un peu plus faible en Facile, un peu plus forte en Difficile). Le duel reste donc équitable quel que soit
// l'avancement de la collection : un joueur qui aligne ses dix meilleures cartes trouve un adversaire à sa mesure.
export function deckDeLOrdinateur(deckDuJoueur: readonly CarteIndex[], edition: readonly CarteIndex[], niveau: Niveau, hasard: Hasard, regles: ReglesDuDuel): CarteIndex[] {
  const prises = new Set(deckDuJoueur.map((c) => c.id));
  return deckDuJoueur.map((modele) => {
    const cible = forceDeLaCarte(modele) + regles.ecartDeForceDeLOrdinateur[niveau];
    // Une carte au hasard parmi les quelques cartes de cette rareté dont la force est la plus proche de la cible.
    // (Prendre « toutes les cartes à un point près » affaiblirait l'ordinateur face aux meilleurs decks : près du
    // sommet, il existe bien plus de cartes un peu moins fortes que de cartes un peu plus fortes.)
    // On range les cartes par écart à la cible, puis on prend les écarts du plus petit au plus grand ; seul le dernier
    // groupe, s'il déborde, est départagé au hasard. (Bien plus rapide que de trier toute l'édition à chaque carte.)
    const parEcart = new Map<number, CarteIndex[]>();
    for (const c of edition) {
      if (c.rarete !== modele.rarete || prises.has(c.id)) continue;
      const ecart = Math.abs(forceDeLaCarte(c) - cible);
      const groupe = parEcart.get(ecart);
      if (groupe) groupe.push(c); else parEcart.set(ecart, [c]);
    }
    const candidates: CarteIndex[] = [];
    for (const ecart of [...parEcart.keys()].sort((a, b) => a - b)) {
      const manquantes = regles.cartesProchesPourLOrdinateur - candidates.length;
      if (manquantes <= 0) break;
      const groupe = parEcart.get(ecart)!;
      candidates.push(...(groupe.length <= manquantes ? groupe : melanger(groupe, hasard).slice(0, manquantes)));
    }
    const carte = candidates.length > 0 ? choisir(candidates, hasard) : modele;
    prises.add(carte.id);
    return carte;
  });
}

// « Composer pour moi » : les cartes les plus fortes de la collection.
export function meilleurDeck(cartes: readonly CarteIndex[], regles: ReglesDuDuel): CarteIndex[] {
  return [...cartes].sort((a, b) => forceDeLaCarte(b) - forceDeLaCarte(a) || a.id.localeCompare(b.id)).slice(0, regles.tailleDuDeck);
}

export function taillesDesFactions(edition: readonly CarteIndex[]): Map<string, number> {
  const tailles = new Map<string, number>();
  for (const carte of edition) tailles.set(carte.faction, (tailles.get(carte.faction) ?? 0) + 1);
  return tailles;
}
