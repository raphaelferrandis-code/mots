// Ce que l'écran du duel dit au joueur pour l'aider : l'analyse de son deck (lot 3 de la refonte du Duel),
// puis, pendant la partie, les aides réservées au niveau Facile et l'historique des manches (lot 4).
// Fonctions pures, sans écran ni hasard. Tout vient des règles de jeu/duel.ts et de l'équilibrage :
// le triangle des types (BAT), le bonus de type, et le bonus d'enchaînement d'origine (petite langue ou non).

import type { CarteIndex, Nature } from '../partage/types.ts';
import { BAT, prevoirLAttaque } from './duel.ts';
import type { Cote, Duel, Manche, Niveau, Prevision, ReglesDuDuel, TaillesDesFactions } from './duel.ts';

export const NATURES: readonly Nature[] = ['Nom', 'Verbe', 'Adjectif', 'Adverbe'];

// « nom » → « noms », « adjectif » → « adjectifs »…
export const pluralDe = (nature: Nature, nombre: number): string => `${nature.toLowerCase()}${nombre > 1 ? 's' : ''}`;

// Le type que « nature » bat, et celui qui la bat. Les adverbes sont neutres : ni l'un ni l'autre.
export const bat = (nature: Nature): Nature | null => BAT[nature] ?? null;
export const battuPar = (nature: Nature): Nature | null => (Object.keys(BAT) as Nature[]).find((n) => BAT[n] === nature) ?? null;

export type Origine = { nom: string; nombre: number; bonus: number; petiteLangue: boolean; enchainable: boolean };

export type AnalyseDuDeck = {
  parNature: Record<Nature, number>;
  // Le point fort et le point faible, s'il se dégage un type majoritaire (la moitié du deck ou plus).
  dominante: { nature: Nature; nombre: number; forte: Nature; faible: Nature } | null;
  adverbes: number;
  origines: Origine[]; // de la plus représentée à la moins représentée
};

export function analyserLeDeck(deck: readonly CarteIndex[], tailles: TaillesDesFactions, regles: ReglesDuDuel): AnalyseDuDeck {
  const parNature = Object.fromEntries(NATURES.map((n) => [n, deck.filter((c) => c.type === n).length])) as Record<Nature, number>;
  const typees = NATURES.filter((n) => bat(n) !== null).sort((a, b) => parNature[b] - parNature[a]);
  const majoritaire = typees[0];
  const seuil = Math.ceil(regles.tailleDuDeck / 2);
  const dominante = deck.length > 0 && parNature[majoritaire] >= seuil
    ? { nature: majoritaire, nombre: parNature[majoritaire], forte: bat(majoritaire)!, faible: battuPar(majoritaire)! }
    : null;

  const comptes = new Map<string, number>();
  for (const carte of deck) comptes.set(carte.faction, (comptes.get(carte.faction) ?? 0) + 1);
  const origines = [...comptes].map(([nom, nombre]) => {
    const petiteLangue = (tailles.get(nom) ?? Infinity) <= regles.petiteFactionJusquA;
    return { nom, nombre, petiteLangue, bonus: petiteLangue ? regles.bonusDePetiteFaction : regles.bonusDeFaction, enchainable: nombre >= 2 };
  }).sort((a, b) => b.nombre - a.nombre || a.nom.localeCompare(b.nom, 'fr'));

  return { parNature, dominante, adverbes: parNature.Adverbe, origines };
}

// ── Pendant la partie ────────────────────────────────────────────────────────
// Les aides de calcul (indice, rapport de type, dégâts prévus, détail du calcul, enchaînement) sont une règle de
// game design : elles ne s'affichent qu'en Facile contre l'ordinateur. La condition se lit sur l'adversaire du duel
// en cours (celui que renvoie le serveur des combats), jamais sur un réglage de l'écran.
export function aidesPermises(adversaire: { type: 'entrainement'; niveau: Niveau } | { type: 'joute' }): boolean {
  return adversaire.type === 'entrainement' && adversaire.niveau === 'Facile';
}

// Qui a l'avantage de type entre ma carte et la sienne.
export function rapportDeType(moi: Nature, lui: Nature): 'pour' | 'contre' | 'neutre' {
  if (bat(moi) === lui) return 'pour';
  if (bat(lui) === moi) return 'contre';
  return 'neutre';
}

// L'indice sur le mot adverse : ce qu'il bat, et le type qui le bat (null pour un adverbe, neutre).
export function indiceSurLeMot(adverse: Nature): { bat: Nature; contre: Nature } | null {
  const cible = bat(adverse);
  const contre = battuPar(adverse);
  return cible && contre ? { bat: cible, contre } : null;
}

// Le bonus d'enchaînement qu'aurait « carte », jouée par « cote » après le dernier mot de son camp (0 sinon).
// C'est celui que calculent les règles : il ne dépend pas de la carte d'en face.
export function enchainement(duel: Duel, cote: Cote, carte: CarteIndex, tailles: TaillesDesFactions, regles: ReglesDuDuel): number {
  return prevoirLAttaque(duel, cote, carte, carte, tailles, regles).bonusDeFaction;
}

// Ce que donnerait la manche si le joueur jouait « carte » contre « adverse » : les deux attaques des règles
// (prevoirLAttaque), et si le coup du joueur achève l'adversaire, auquel cas il ne riposte pas.
export type PrevisionDeLaManche = {
  moi: Prevision; lui: Prevision;
  acheve: 'toujours' | 'sans-parade' | 'non'; // « sans-parade » : seulement si l'ordinateur ne pare pas
};
export function prevoirLaManche(duel: Duel, carte: CarteIndex, adverse: CarteIndex, tailles: TaillesDesFactions, regles: ReglesDuDuel): PrevisionDeLaManche {
  const moi = prevoirLAttaque(duel, 'joueur', carte, adverse, tailles, regles);
  const lui = prevoirLAttaque(duel, 'adversaire', adverse, carte, tailles, regles);
  const pv = duel.camps.adversaire.pv;
  return { moi, lui, acheve: moi.degatsSiParee >= pv ? 'toujours' : moi.degats >= pv ? 'sans-parade' : 'non' };
}

// Le résultat d'une manche jouée, pour l'historique : gagnée si l'on a infligé plus de dégâts qu'on en a subi.
// (Un choix d'affichage : les règles ne connaissent que les points de vie.)
export function resultatDeLaManche(manche: Manche): 'gagnee' | 'perdue' | 'nulle' {
  const infliges = manche.joueur.infliges;
  const subis = manche.adversaire.infliges;
  return infliges > subis ? 'gagnee' : infliges < subis ? 'perdue' : 'nulle';
}
