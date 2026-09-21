// ─────────────────────────────────────────────────────────────────────────────
// ÉQUILIBRAGE DU JEU
// Tous les chiffres qui règlent le jeu sont ici, et nulle part ailleurs.
// Raphaël peut les modifier sans toucher au reste du code.
// Après une modification : « npm test » (des tests vérifient que l'économie reste saine),
// puis « npm run simulation:collection » pour voir l'effet sur la durée de la collection.
// ─────────────────────────────────────────────────────────────────────────────

import type { Finition, Rarete } from '../partage/types.ts';

// Chances (en %) d'obtenir chaque rareté à un emplacement du paquet. Le total d'une ligne doit faire 100.
export type ChancesParRarete = Partial<Record<Rarete, number>>;

export const EQUILIBRAGE = {
  // ── Stats des cartes ──────────────────────────────────────────────────────
  // Note maximale d'une statistique (attaque ou défense).
  statMaximale: 10,

  // Points de défense ajoutés selon la rareté, pour qu'une carte rare ne soit jamais
  // décevante en duel. Les mots rares ont souvent une « richesse » faible (un seul sens,
  // peu de synonymes) : ce bonus compense. Le total reste plafonné à statMaximale.
  bonusDefenseParRarete: {
    'Commune': 0,
    'Peu commune': 0,
    'Rare': 1,
    'Épique': 1,
    'Légendaire': 2,
    'Hors-série': 3,
  } satisfies Record<Rarete, number>,

  // ── Paquets ───────────────────────────────────────────────────────────────
  paquets: {
    // Un paquet gratuit arrive toutes les X minutes, que le jeu soit ouvert ou fermé…
    minutesEntreDeuxPaquets: 10,
    // …et les paquets non ouverts s'accumulent jusqu'à ce maximum. Stock plein : le compte à rebours s'arrête.
    stockMaximum: 10,
    // Paquets offerts à un nouveau joueur. Ils sont garantis sans doublon, pour pouvoir composer un deck tout de suite.
    paquetsDeDepart: 3,

    // Les cinq cartes d'un paquet, emplacement par emplacement.
    emplacements: [
      { 'Commune': 70, 'Peu commune': 25, 'Rare': 5 },
      { 'Commune': 70, 'Peu commune': 25, 'Rare': 5 },
      { 'Commune': 70, 'Peu commune': 25, 'Rare': 5 },
      { 'Peu commune': 75, 'Rare': 20, 'Épique': 5 },
      { 'Rare': 74, 'Épique': 22, 'Légendaire': 4 },
    ] as ChancesParRarete[],

    // Garantie : au plus tard au 40e paquet sans Légendaire, la dernière carte du paquet en est une.
    paquetsAvantLegendaireGarantie: 40,

    // Rang ultime : chance que la dernière carte d'un paquet soit une carte Hors-série (1 paquet sur 1 000).
    // Ces cartes ne comptent pas pour la garantie ci-dessus.
    // (Réglé d'après le simulateur : à 1 sur 300, un joueur régulier en tirait une par semaine, ce qui n'a rien
    //  de « très très rare » ; à 1 sur 1 000, sa première arrive après deux à trois semaines, et une quinzaine par an.)
    chanceHorsSerie: 1 / 1000,

    // Prix d'un paquet obtenu tout de suite, sans attendre.
    // ⚠️ Un paquet doit toujours rapporter nettement moins d'Encre (par ses doublons) qu'il n'en coûte,
    // sinon les paquets deviennent infinis. Un test le vérifie.
    // (Réglé à 150 d'après le simulateur : à 50, l'Encre doublait le nombre de paquets et un joueur régulier
    //  finissait l'édition en 4 mois ; à 150, il lui faut environ 8 mois, dans la cible de 6 mois à 1 an.)
    prixEnEncre: 150,
  },

  // ── Encre ─────────────────────────────────────────────────────────────────
  // Encre reçue quand on tire une carte que l'on possède déjà.
  encreParDoublon: {
    'Commune': 1,
    'Peu commune': 3,
    'Rare': 10,
    'Épique': 30,
    'Légendaire': 100,
    'Hors-série': 500,
  } satisfies Record<Rarete, number>,

  // ── Finitions ─────────────────────────────────────────────────────────────
  // La finition est tirée au sort pour chaque carte ordinaire, quelle que soit sa rareté : la même carte existe
  // donc avec ou sans effet. Chaque finition possédée compte à part dans la collection ; une carte reçue en
  // double ne se change en Encre que si l'on possède déjà cette finition-là.
  finitions: {
    // Chance d'obtenir chaque finition ; le reste du temps, la carte est « Normale ».
    chances: { 'Brillante': 1 / 12, 'Holographique': 1 / 80 } satisfies Partial<Record<Finition, number>>,
    // L'Encre d'un doublon est multipliée selon sa finition.
    encre: { 'Normale': 1, 'Brillante': 3, 'Holographique': 10 } satisfies Record<Finition, number>,
  },

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  // Le jeu rappelle d'exporter sa sauvegarde après ce nombre de paquets ouverts depuis le dernier export.
  paquetsEntreDeuxRappelsDExport: 100,
};

export function defenseEnJeu(defense: number, rarete: Rarete): number {
  return Math.min(EQUILIBRAGE.statMaximale, defense + EQUILIBRAGE.bonusDefenseParRarete[rarete]);
}
