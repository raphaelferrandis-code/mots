// Les règles du duel. Fonctions pures : pas d'écran, pas de sauvegarde, et le hasard est fourni par l'appelant.
//
// Le duel se joue en manches, mot contre mot. À chaque manche :
//   1. l'ordinateur pose un mot de sa main, face visible ;
//   2. le joueur lui répond par une carte de la sienne ;
//   3. le joueur doit retrouver la définition de SON mot (son attaque porte, sinon « le mot lui échappe »),
//      puis celle du mot ADVERSE (il pare : les dégâts qu'il reçoit sont réduits) ;
//   4. l'attaque du joueur part la première ; si l'ordinateur tient encore debout, la sienne suit ; puis chacun pioche.
// L'ordinateur ne passe pas d'épreuve : il connaît son mot, et pare celui du joueur, selon des chances fixées
// par son niveau — et il pare d'autant moins bien que le mot du joueur est rare.

import { attaqueEnJeu, defenseEnJeu } from '../config/equilibrage.ts';
import type { EQUILIBRAGE } from '../config/equilibrage.ts';
import { RARETES_ORDINAIRES } from '../partage/types.ts';
import type { CarteIndex, Nature, Rarete } from '../partage/types.ts';
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
  derniere: CarteIndex | null; // la carte jouée à la manche précédente (pour le bonus de même origine)
};

// Ce que ferait l'attaque d'une carte contre la carte d'en face, si elle porte.
export type Prevision = {
  degats: number; // si l'attaque porte et n'est pas parée
  degatsSiParee: number;
  bonusDeRarete: number; // déjà compris dans l'attaque en jeu ; rappelé pour l'explication à l'écran
  bonusDeType: number;
  bonusDeFaction: number;
  bloques: number; // ce que retire la défense de la carte d'en face
};

export type Attaque = Prevision & {
  carte: CarteIndex;
  reussie: boolean; // le camp connaissait son mot
  paree: boolean; // l'autre camp connaissait ce mot, lui aussi
  infliges: number; // dégâts réellement infligés
};

export type Manche = { numero: number; joueur: Attaque; adversaire: Attaque };

export type Duel = {
  manche: number; // la manche en cours (ou la dernière jouée, quand le duel est fini)
  camps: Record<Cote, Camp>;
  vainqueur: Cote | 'nul' | null;
  manches: Manche[];
};

// Ce que chaque camp a su faire pendant la manche.
export type Savoirs = { joueurReussit: boolean; joueurPare: boolean; adversaireReussit: boolean; adversairePare: boolean };

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
  return { pv: regles.pointsDeVie, main: pioche.splice(0, regles.cartesEnMain), pioche, defausse: [], derniere: null };
}

export function commencerLeDuel(deckDuJoueur: readonly CarteIndex[], deckAdverse: readonly CarteIndex[], hasard: Hasard, regles: ReglesDuDuel): Duel {
  return {
    manche: 1,
    camps: { joueur: campDeDepart(deckDuJoueur, hasard, regles), adversaire: campDeDepart(deckAdverse, hasard, regles) },
    vainqueur: null,
    manches: [],
  };
}

// Nombre de cartes de chaque faction dans l'édition : il décide quelles factions sont « petites ».
export type TaillesDesFactions = ReadonlyMap<string, number>;

// L'attaque de « carte », jouée par « cote », contre la carte d'en face.
export function prevoirLAttaque(duel: Duel, cote: Cote, carte: CarteIndex, enFace: CarteIndex, tailles: TaillesDesFactions, regles: ReglesDuDuel): Prevision {
  const precedente = duel.camps[cote].derniere;
  const bonusDeType = BAT[carte.type] === enFace.type ? regles.bonusDeType : 0;
  const memeFaction = precedente !== null && precedente.faction === carte.faction;
  const bonusDeFaction = !memeFaction ? 0 : (tailles.get(carte.faction) ?? Infinity) <= regles.petiteFactionJusquA ? regles.bonusDePetiteFaction : regles.bonusDeFaction;
  const bloques = Math.round(defenseEnJeu(enFace.defense, enFace.rarete) * regles.partDeLaDefense);
  const degats = Math.max(regles.degatsMinimum, attaqueEnJeu(carte.attaque, carte.rarete) + bonusDeType + bonusDeFaction - bloques);
  return { degats, degatsSiParee: Math.floor(degats * regles.partDesDegatsApresParade), bonusDeRarete: attaqueEnJeu(carte.attaque, carte.rarete) - carte.attaque, bonusDeType, bonusDeFaction, bloques };
}

// Les chances de l'ordinateur pour cette manche : connaître son propre mot, et parer celui du joueur.
export function chancesDeLOrdinateur(niveau: Niveau, carteDuJoueur: CarteIndex, regles: ReglesDuDuel): { reussir: number; parer: number } {
  return { reussir: regles.reussiteDeLOrdinateur[niveau], parer: regles.paradeDeLOrdinateur.selonLaRarete[carteDuJoueur.rarete] * regles.paradeDeLOrdinateur.selonLeNiveau[niveau] };
}

function apresLaManche(camp: Camp, jouee: CarteIndex, subis: number): Camp {
  // Une carte jouée est épuisée pour ce duel, même si l'attaque échoue.
  // Quand la pioche est vide, on termine avec les cartes encore en main.
  const pioche = camp.pioche;
  const defausse = [...camp.defausse, jouee];
  return { pv: camp.pv - subis, main: [...camp.main.filter((c) => c.id !== jouee.id), ...pioche.slice(0, 1)], pioche: pioche.slice(1), defausse, derniere: jouee };
}

// Règle une manche : les deux cartes s'affrontent. L'attaque du joueur part la première : si elle met l'ordinateur
// à zéro, le duel s'arrête là et l'attaque adverse ne porte pas (les deux camps ne tombent donc jamais ensemble).
export function jouerLaManche(duel: Duel, idDuJoueur: string, idAdverse: string, savoirs: Savoirs, _hasard: Hasard, tailles: TaillesDesFactions, regles: ReglesDuDuel): Duel {
  if (duel.vainqueur !== null) throw new Error('Le duel est terminé');
  const carteDuJoueur = duel.camps.joueur.main.find((c) => c.id === idDuJoueur);
  const carteAdverse = duel.camps.adversaire.main.find((c) => c.id === idAdverse);
  if (!carteDuJoueur || !carteAdverse) throw new Error("Cette carte n'est pas dans la main");

  const attaque = (cote: Cote, carte: CarteIndex, enFace: CarteIndex, reussie: boolean, paree: boolean): Attaque => {
    const prevision = prevoirLAttaque(duel, cote, carte, enFace, tailles, regles);
    return { ...prevision, carte, reussie, paree: reussie && paree, infliges: !reussie ? 0 : paree ? prevision.degatsSiParee : prevision.degats };
  };
  const duJoueur = attaque('joueur', carteDuJoueur, carteAdverse, savoirs.joueurReussit, savoirs.adversairePare);
  const terrasse = duJoueur.infliges >= duel.camps.adversaire.pv;
  const adverse = attaque('adversaire', carteAdverse, carteDuJoueur, savoirs.adversaireReussit && !terrasse, savoirs.joueurPare);

  const camps: Record<Cote, Camp> = {
    joueur: apresLaManche(duel.camps.joueur, carteDuJoueur, adverse.infliges),
    adversaire: apresLaManche(duel.camps.adversaire, carteAdverse, duJoueur.infliges),
  };

  // Un camp à zéro a perdu. À la limite de manches ou à épuisement d'une main,
  // le mieux portant l'emporte (égalité : match nul).
  for (const cote of ['joueur', 'adversaire'] as const) camps[cote] = { ...camps[cote], pv: Math.max(0, camps[cote].pv) };
  const fini = camps.joueur.pv === 0 || camps.adversaire.pv === 0 || duel.manche >= regles.manchesMaximum
    || camps.joueur.main.length === 0 || camps.adversaire.main.length === 0;
  const vainqueur: Duel['vainqueur'] = !fini ? null : camps.joueur.pv === camps.adversaire.pv ? 'nul' : camps.joueur.pv > camps.adversaire.pv ? 'joueur' : 'adversaire';

  return { manche: fini ? duel.manche : duel.manche + 1, camps, vainqueur, manches: [...duel.manches, { numero: duel.manche, joueur: duJoueur, adversaire: adverse }] };
}

// La force d'une carte : ce qu'on lit dans les coins du timbre (bonus de rareté compris).
export const forceDeLaCarte = (carte: CarteIndex): number => attaqueEnJeu(carte.attaque, carte.rarete) + defenseEnJeu(carte.defense, carte.rarete);

// L'ordinateur pose son mot le premier, sans savoir ce que le joueur répondra : au hasard en Facile,
// sa carte la plus solide sinon (son attaque, son éventuel bonus de même origine, et ce que bloque sa défense).
export function choisirPourLOrdinateur(duel: Duel, niveau: Niveau, hasard: Hasard, tailles: TaillesDesFactions, regles: ReglesDuDuel): CarteIndex {
  const { main, derniere } = duel.camps.adversaire;
  if (niveau === 'Facile') return choisir(main, hasard);
  const valeur = (carte: CarteIndex): number => {
    const enchaine = derniere !== null && derniere.faction === carte.faction;
    const bonus = !enchaine ? 0 : (tailles.get(carte.faction) ?? Infinity) <= regles.petiteFactionJusquA ? regles.bonusDePetiteFaction : regles.bonusDeFaction;
    return attaqueEnJeu(carte.attaque, carte.rarete) + bonus + defenseEnJeu(carte.defense, carte.rarete) * regles.partDeLaDefense;
  };
  return main.reduce((meilleure, carte) => (valeur(carte) > valeur(meilleure) ? carte : meilleure));
}

// Le deck de l'ordinateur : pour chaque carte du joueur, une carte de la même rareté et de force comparable
// (selon le niveau). Le duel reste donc équitable quel que soit l'avancement de la collection : un joueur qui
// aligne ses dix meilleures cartes trouve un adversaire à sa mesure — et qui joue des mots rares affronte des mots rares.
export function deckDeLOrdinateur(deckDuJoueur: readonly CarteIndex[], edition: readonly CarteIndex[], niveau: Niveau, hasard: Hasard, regles: ReglesDuDuel): CarteIndex[] {
  const prises = new Set(deckDuJoueur.map((c) => c.id));
  return deckDuJoueur.map((modele) => {
    const rarete = rareteAdverse(modele.rarete, regles.cransDeRareteDeLOrdinateur[niveau], hasard);
    // La force visée est celle de la carte du joueur, augmentée de ce qu'apportent les crans de rareté en plus.
    const cible = forceDeLaCarte(modele) + regles.ecartDeForceDeLOrdinateur[niveau] + (forceDeLaCarte({ ...modele, rarete }) - forceDeLaCarte(modele));
    // Une carte au hasard parmi les quelques cartes de cette rareté dont la force est la plus proche de la cible.
    // (Prendre « toutes les cartes à un point près » affaiblirait l'ordinateur face aux meilleurs decks : près du
    // sommet, il existe bien plus de cartes un peu moins fortes que de cartes un peu plus fortes.)
    // On range les cartes par écart à la cible, puis on prend les écarts du plus petit au plus grand ; seul le dernier
    // groupe, s'il déborde, est départagé au hasard. (Bien plus rapide que de trier toute l'édition à chaque carte.)
    const parEcart = new Map<number, CarteIndex[]>();
    for (const c of edition) {
      if (c.rarete !== rarete || prises.has(c.id)) continue;
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

// La rareté des cartes de l'ordinateur : celle de la carte du joueur, montée de quelques crans (sans dépasser
// Légendaire ; une carte Hors-série trouve toujours une carte Hors-série en face). Un nombre de crans à virgule
// se tire au sort carte par carte : 1,5 cran = un cran pour une carte sur deux, deux crans pour les autres.
function rareteAdverse(rarete: Rarete, crans: number, hasard: Hasard): Rarete {
  const rang = RARETES_ORDINAIRES.indexOf(rarete);
  if (rang < 0) return rarete;
  const entiers = Math.floor(crans) + (hasard() < crans - Math.floor(crans) ? 1 : 0);
  return RARETES_ORDINAIRES[Math.min(RARETES_ORDINAIRES.length - 1, rang + entiers)];
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
