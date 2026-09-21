// ─────────────────────────────────────────────────────────────────────────────
// ÉQUILIBRAGE DU JEU
// Tous les chiffres qui règlent le jeu sont ici, et nulle part ailleurs.
// Raphaël peut les modifier sans toucher au reste du code.
// Après une modification : « npm test » (des tests vérifient que l'économie reste saine),
// puis « npm run simulation:collection » pour voir l'effet sur la durée de la collection.
// ─────────────────────────────────────────────────────────────────────────────

import type { Rarete } from '../partage/types.ts';

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
  } satisfies Record<Rarete, number>,

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  // Le jeu rappelle d'exporter sa sauvegarde après ce nombre de paquets ouverts depuis le dernier export.
  paquetsEntreDeuxRappelsDExport: 100,
};

export function defenseEnJeu(defense: number, rarete: Rarete): number {
  return Math.min(EQUILIBRAGE.statMaximale, defense + EQUILIBRAGE.bonusDefenseParRarete[rarete]);
}
