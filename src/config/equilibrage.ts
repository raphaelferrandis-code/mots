// ─────────────────────────────────────────────────────────────────────────────
// ÉQUILIBRAGE DU JEU
// Tous les chiffres qui règlent le jeu sont ici, et nulle part ailleurs.
// Raphaël peut les modifier sans toucher au reste du code.
// Après une modification : « npm test » (des tests vérifient que l'économie reste saine),
// puis « npm run simulation:collection » pour voir l'effet sur la durée de la collection,
// ou « npm run simulation:duel » pour voir l'effet sur la durée et la difficulté des duels.
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

  // Points d'attaque ajoutés selon la rareté : « un mot rare est puissant, mais difficile à maîtriser ».
  // L'attaque brute vient des lettres du mot et ne dépend pas de la rareté (mesuré : 5,2 de moyenne pour une
  // Commune, 5,6 pour une Légendaire) ; sans ce bonus, une carte rare ne frappait pas plus fort qu'une autre.
  // Ce bonus n'est pas plafonné : une Légendaire peut dépasser 10 d'attaque, ce qu'aucune carte courante n'atteint.
  bonusAttaqueParRarete: {
    'Commune': 0,
    'Peu commune': 0,
    'Rare': 1,
    'Épique': 2,
    'Légendaire': 3,
    'Hors-série': 4,
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

  // ── Duel ──────────────────────────────────────────────────────────────────
  // Une manche : l'ordinateur pose un mot, le joueur lui répond par une carte ; le joueur doit retrouver la définition
  // de son mot (son attaque porte) puis celle du mot adverse (il pare). L'attaque du joueur part la première.
  // ⚠️ Tous ces chiffres ont été réglés avec « npm run simulation:duel » (rapport : data/simulation-duel.md).
  // Cible du brief : 6 à 10 manches par partie. Mesuré avec ces réglages : 5 à 9 manches selon les joueurs.
  duel: {
    tailleDuDeck: 10,
    cartesEnMain: 3,
    pointsDeVie: 25,
    // Au-delà de cette limite, le camp qui a le plus de points de vie gagne (égalité : match nul).
    manchesMaximum: 20,
    // Temps pour retrouver une définition parmi quatre (deux épreuves par manche : son mot, puis le mot adverse).
    secondesPourRepondre: 15,

    // Dégâts d'une attaque qui porte = attaque de la carte + bonus − part de la défense de la carte d'en face
    // (au moins degatsMinimum). Le brief prévoyait la défense entière (part = 1). Mesuré : attaque et défense étant
    // notées sur la même échelle, elles s'annulent dès que les decks sont bons — la moitié des attaques ne font
    // que 1 dégât et les parties s'éternisent. À 0,5 : 2 % d'attaques à 1 dégât pour une collection moyenne.
    partDeLaDefense: 0.5,
    degatsMinimum: 1,
    // La parade : qui retrouve la définition du mot adverse ne reçoit qu'une part des dégâts (arrondie en sa faveur :
    // 5 dégâts parés n'en font plus que 2). Mesuré : un bon lecteur pare 7 à 9 attaques sur 10, un joueur hésitant 5 à 8.
    partDesDegatsApresParade: 0.5,
    // Triangle des types : Nom > Adjectif > Verbe > Nom. Les adverbes sont neutres.
    bonusDeType: 2,
    // Bonus si la carte précédente du même camp était de la même faction ; plus fort pour une petite faction,
    // parce qu'enchaîner deux mots arabes est bien plus difficile que deux mots latins.
    bonusDeFaction: 1,
    bonusDePetiteFaction: 2,
    petiteFactionJusquA: 160, // nombre de cartes de la faction dans l'édition

    // ── L'ordinateur ──
    // Son deck répond carte pour carte à celui du joueur. Aux niveaux élevés, ses mots sont plus rares que ceux du
    // joueur, de ce nombre de crans (Commune → Peu commune → Rare → Épique → Légendaire) : plus forts, et surtout plus
    // difficiles à parer. C'est le réglage qui pèse le plus sur la difficulté. (1,5 = un cran ou deux, au hasard.)
    // Victoires mesurées, avec une collection moyenne, en Facile / Normal / Difficile :
    //   joueur hésitant 91 % / 57 % / 9 % · bon lecteur 99 % / 87 % / 44 % · expert 100 % / 95 % / 77 %
    //   · bon lecteur qui connaît son deck par cœur 100 % / 91 % / 73 %.
    cransDeRareteDeLOrdinateur: { 'Facile': 0, 'Normal': 1, 'Difficile': 2 },
    // Dans cette rareté, il reçoit des cartes de force comparable à celles du joueur (force = attaque + défense).
    // Écart visé, carte par carte : positif = un peu plus fortes. Pèse surtout face aux débutants, dont les cartes sont faibles.
    ecartDeForceDeLOrdinateur: { 'Facile': 1, 'Normal': 0, 'Difficile': 0 },
    // Chaque carte de l'ordinateur est tirée au hasard parmi les N cartes dont la force est la plus proche de la force visée.
    cartesProchesPourLOrdinateur: 6,
    // L'ordinateur ne passe pas l'épreuve de maîtrise : il connaît son propre mot selon une chance fixe…
    reussiteDeLOrdinateur: { 'Facile': 0.65, 'Normal': 0.85, 'Difficile': 0.9 },
    // …et il pare le mot du joueur d'autant moins souvent que ce mot est rare (chance = rareté × niveau).
    paradeDeLOrdinateur: {
      selonLaRarete: { 'Commune': 0.7, 'Peu commune': 0.6, 'Rare': 0.45, 'Épique': 0.3, 'Légendaire': 0.15, 'Hors-série': 0.1 } satisfies Record<Rarete, number>,
      selonLeNiveau: { 'Facile': 0.7, 'Normal': 1, 'Difficile': 1 },
    },

    // Récompenses. Les victoires suivantes de la journée rapportent moins, pour que l'Encre du duel ne remplace pas les paquets.
    encreParVictoire: { 'Facile': 20, 'Normal': 30, 'Difficile': 45 },
    encreParDefaite: 5,
    victoiresPleinesParJour: 3,
    partDeLEncreEnsuite: 0.25,

    // Un mot est « maîtrisé » après ce nombre de bonnes réponses en duel : son timbre reçoit un cachet daté.
    reussitesPourLaMaitrise: 5,
  },

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  // Le jeu rappelle d'exporter sa sauvegarde après ce nombre de paquets ouverts depuis le dernier export.
  paquetsEntreDeuxRappelsDExport: 100,
};

export function attaqueEnJeu(attaque: number, rarete: Rarete): number {
  return attaque + EQUILIBRAGE.bonusAttaqueParRarete[rarete];
}

export function defenseEnJeu(defense: number, rarete: Rarete): number {
  return Math.min(EQUILIBRAGE.statMaximale, defense + EQUILIBRAGE.bonusDefenseParRarete[rarete]);
}
