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
    'Hors-série': 6,
  } satisfies Record<Rarete, number>,

  // Les seize Hors-série seront vite reconnues : leur force vient des statistiques,
  // pas de la surprise. Même « amour » ou « mot » doit rester puissant après une parade.
  // On conserve des profils différents : attaque en jeu de 12 à 16, défense de 8 à 10.
  minimumHorsSerie: { attaque: 12, defense: 8 },

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

    // Les paquets ne s’achètent pas : l’Encre sert uniquement aux enchères.
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
  // Une manche : l'un pose un mot face cachée, l'autre lui répond par une carte (en Facile, l'ordinateur pose le premier ;
  // sinon chacun son tour) ; le joueur doit retrouver la définition du mot adverse, révélé à la parade, pour parer. Les attaques sont automatiques ; le joueur frappe le premier.
  // Duels courts : chaque carte ne se joue qu'une fois par combat.
  // Vérification de la durée avec « npm run simulation:duel » (rapport : data/simulation-duel.md).
  duel: {
    tailleDuDeck: 10,
    cartesEnMain: 3,
    pointsDeVie: 20,
    // Au-delà de cette limite, le camp qui a le plus de points de vie gagne (égalité : match nul).
    manchesMaximum: 10,
    // Temps pour retrouver une définition parmi quatre (une seule épreuve par manche : le mot adverse).
    secondesPourRepondre: 15,
    // Le temps du réseau (audit du 25/09/2026) : une réponse partie avant la fin du compte à rebours, arrivée au serveur
    // un peu après, compte encore. Le compte à rebours affiché ne change pas.
    margeDuReseauEnMillisecondes: 1500,

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
    // Victoires mesurées le 25/09/2026, avec une collection moyenne, en Facile / Normal / Difficile, depuis que le mot
    // adverse reste face cachée jusqu'à la parade, que la pose alterne et que l'ordinateur Difficile contre le type du
    // joueur quand il répond : joueur hésitant 91 % / 63 % / 40 % · bon lecteur 98 % / 78 % / 58 % · expert 100 % / 91 % / 78 %
    // (avant : 91 / 69 / 48 · 98 / 82 / 64 · 100 / 94 / 82).
    cransDeRareteDeLOrdinateur: { 'Facile': 0, 'Normal': 1, 'Difficile': 2 },
    // Dans cette rareté, il reçoit des cartes de force comparable à celles du joueur (force = attaque + défense).
    // Écart visé, carte par carte : positif = un peu plus fortes. Pèse surtout face aux débutants, dont les cartes sont faibles.
    ecartDeForceDeLOrdinateur: { 'Facile': 1, 'Normal': 0, 'Difficile': 0 },
    // Chaque carte de l'ordinateur est tirée au hasard parmi les N cartes dont la force est la plus proche de la force visée.
    cartesProchesPourLOrdinateur: 6,
    // Les attaques sont automatiques. La parade dépend de la rareté et du niveau.
    paradeDeLOrdinateur: {
      // Exception : les Hors-série sont célèbres, donc aussi souvent parées que les communes.
      selonLaRarete: { 'Commune': 0.7, 'Peu commune': 0.6, 'Rare': 0.45, 'Épique': 0.3, 'Légendaire': 0.15, 'Hors-série': 0.7 } satisfies Record<Rarete, number>,
      selonLeNiveau: { 'Facile': 0.7, 'Normal': 1, 'Difficile': 1 },
    },

    // Récompenses. Les victoires suivantes rapportent moins pour limiter la création d’Encre pour les enchères.
    encreParVictoire: { 'Facile': 20, 'Normal': 30, 'Difficile': 45 },
    encreParDefaite: 5,
    victoiresPleinesParJour: 3,
    partDeLEncreEnsuite: 0.25,

    // Un mot est « maîtrisé » après ce nombre de bonnes réponses en duel : son timbre reçoit un cachet daté.
    reussitesPourLaMaitrise: 5,
  },

  // ── Joutes : les duels classés contre d'autres joueurs ─────────────────────
  // On affronte le « double » d'un joueur absent : son deck, joué par l'ordinateur avec ses vrais résultats.
  // Les règles de la manche sont celles du duel ci-dessus ; seuls changent l'adversaire et le classement.
  joute: {
    // Classement de type Elo (celui des échecs). Chacun a une cote ; battre plus fort que soi rapporte beaucoup,
    // battre plus faible rapporte peu. « facteurK » = le plus gros gain ou la plus grosse perte possible en une joute ;
    // « echelle » = l'écart de cote à partir duquel le favori est donné gagnant à 10 contre 1.
    coteDeDepart: 1000,
    coteMinimale: 100,
    facteurK: 32,
    echelle: 400,
    // Contre la triche (décisions de Raphaël du 25/09/2026) : contre les mêmes adversaires, seules les premières
    // parties du jour font bouger la cote (heure de Paris) ; on n'apparaît au classement qu'après quelques parties
    // classées. Un profil supprimé puis recréé retrouve sa cote (serveur/classement.ts).
    rencontresClasseesParJour: 3,
    partiesPourEtreClasse: 5,
    // Les ligues, de la plus modeste à la plus haute, et la cote à partir de laquelle on y entre.
    ligues: [
      { nom: 'Apprenti', aPartirDe: 0 },
      { nom: 'Lecteur', aPartirDe: 1100 },
      { nom: 'Lettré', aPartirDe: 1250 },
      { nom: 'Érudit', aPartirDe: 1400 },
      { nom: 'Académicien', aPartirDe: 1550 },
      { nom: 'Immortel', aPartirDe: 1700 },
    ],
    // Les adversaires proposés : un par écart de cote visé (un plus faible, un égal, un plus fort), tiré au hasard
    // parmi les quelques joueurs les plus proches de cette cote, en évitant ceux que l'on vient d'affronter.
    ecartsDeCoteProposes: [-120, 0, 120],
    joueursProchesParProposition: 8,
    adversairesRecentsEvites: 6,
    // Les résultats de parade du joueur sont mêlés à une estimation tant qu'ils sont peu nombreux.
    // savoirParDefaut reste une donnée historique pour fabriquer les anciens profils ; il ne règle plus l'attaque.
    // Les Hors-série sont supposées familières ; les vrais résultats remplacent ensuite cette estimation.
    savoirParDefaut: { 'Commune': 0.9, 'Peu commune': 0.85, 'Rare': 0.75, 'Épique': 0.6, 'Légendaire': 0.5, 'Hors-série': 0.9 } satisfies Record<Rarete, number>,
    paradeParDefaut: { 'Commune': 0.85, 'Peu commune': 0.75, 'Rare': 0.6, 'Épique': 0.45, 'Légendaire': 0.3, 'Hors-série': 0.85 } satisfies Record<Rarete, number>,
    poidsDeLEstimation: 4,
    // Récompenses (même plafond quotidien que les duels d'entraînement).
    encreParVictoire: 35,
  },

  // ── Le marché : les enchères entre joueurs (docs/BRIEF-marche.md, décisions n° 37 à 42) ──
  marche: {
    // Part de l'Encre payée qui disparaît à chaque vente : c'est ce qui empêche l'Encre de s'accumuler.
    commission: 0.1,
    // Durées qu'un vendeur peut choisir, en heures.
    dureesEnHeures: [12, 24, 48],
    // Une mise dans les dernières minutes prolonge l'enchère d'autant : pas de coup de dernière seconde.
    prolongationEnMinutes: 5,
    // Une mise doit dépasser la précédente d'au moins cette part (et d'au moins 1 Encre).
    surencherMinimale: 0.05,
    // Les joueurs gratuits (la version payante n'a pas de limite).
    ventesEnCoursAuPlus: 10,
    achatsParJourAuPlus: 10,
    // Mise de départ minimale selon la rareté : on ne brade pas un timbre rare. ⚠️ À confirmer au simulateur de marché.
    planchers: { 'Commune': 5, 'Peu commune': 10, 'Rare': 30, 'Épique': 100, 'Légendaire': 300, 'Hors-série': 1000 } satisfies Record<Rarete, number>,
    // Ce que le marché montre à chaque appel, et combien d'enchères échues il clôt d'un coup.
    encheresParPage: 30,
    cloturesParAppel: 50,
    // La cote d'un timbre (décision n° 38) : la médiane des prix de ses ventes des derniers jours, par finition, calculée
    // une fois par jour et gardée jour après jour (l'historique de la version payante).
    cote: { fenetreEnJours: 30, historiqueEnJours: 90, ventesMontrees: 30, conservationEnJours: 400 },
  },

  // ── La version payante (décision n° 34) ───────────────────────────────────
  // Ce qu'un compte payant reçoit de plus. Le compte porte un drapeau « payant » (serveur/collections.ts) ;
  // personne ne l'a encore, et il n'existe aucun moyen de payer : voir docs/BRIEF-version-payante.md.
  // Avantages validés le 23 septembre 2026. Prix indicatifs, paiement non branché.
  payant: {
    // Recharge et réserve de l'abonnement uniquement.
    minutesEntreDeuxPaquets: 8,
    stockMaximum: 15,
    // Compatibilité des anciens comptes : aucun bonus d'Encre ni rente.
    multiplicateurDEncre: 1,
    renteQuotidienne: 0,
    bonusXpPourcent: 25,
    joursEntrePaquetsHebdomadaires: 7,
    dernierEmplacementHebdomadaire: { 'Épique': 89, 'Légendaire': 10, 'Hors-série': 1 } as ChancesParRarete,
    // Deux offres indépendantes. Les niveaux servent au protocole des anciens comptes.
    formules: [
      { cle: 'necessaire', niveau: 1, nom: 'Mon album', prix: 5.99, parMois: false },
      { cle: 'collectionneur', niveau: 2, nom: 'Collectionneur', prix: 4.99, parMois: true },
    ],
    // L'âge à partir duquel on peut payer (décision du 22/09/2026).
    ageMinimumPourPayer: 18,
  },

  // ── Le parrainage (décision de Raphaël du 24/09/2026) ─────────────────────
  // Un joueur partage son lien ; quand le nouveau venu termine son premier duel sans l'abandonner, chacun reçoit
  // des paquets. Le parrain n'est récompensé que pour un nombre limité de filleuls par mois (contre les faux comptes).
  // Les paquets offerts ne font jamais dépasser la réserve la plus grande du jeu : sinon, ils attendent qu'il y ait
  // de la place (serveur/parrainage.ts).
  // Décision de Raphaël du 25/09/2026 (après l'audit) : le filleul reçoit ses paquets dès son premier duel, mais le
  // parrain n'est récompensé qu'une fois le filleul « confirmé » — un compte Google ou e-mail relié, et un duel terminé
  // un autre jour que le premier, dans les jours qui suivent son arrivée. Un compte jetable ne passe ni l'un ni l'autre.
  parrainage: {
    paquetsOfferts: 3,
    filleulsRecompensesParMois: 10,
    // Un filleul se déclare dans les jours qui suivent son arrivée, avant son premier duel.
    joursPourSeDeclarer: 7,
    // Le duel d'un autre jour doit être joué dans ce délai après l'arrivée du filleul.
    joursPourRevenirJouer: 14,
  },

  // ── Les comptes neufs (décision de Raphaël du 25/09/2026) ─────────────────
  // Pendant ses premiers jours, un compte ne fait passer aucun timbre ni aucune Encre à un autre joueur : ni échange, ni
  // enchère, ni vente. Sinon, des comptes jetables videraient leurs paquets de départ vers un compte principal.
  comptesNeufs: { joursAvantLesEchanges: 3 },

  // ── Les joutes en direct : le match à accepter (décision de Raphaël du 25/09/2026) ─
  // Quand des adversaires sont trouvés, chacun doit presser « J'y vais ! » à temps ; sinon la proposition tombe, sans
  // défaite pour personne : ceux qui avaient accepté reprennent leur place dans la file, les absents en sortent.
  // Un joueur qui passe sur un autre onglet reste dans la file tant que son navigateur donne signe de vie.
  direct: {
    secondesPourAccepter: 20,
    // Sans nouvelles du navigateur pendant ce temps, le joueur sort de la file (onglet fermé, téléphone en veille).
    secondesDePresenceDansLaFile: 150,
  },

  // ── L'adversaire de secours des joutes en direct (décision de Raphaël du 24/09/2026) ─
  // Quand personne n'est libre, le jeu propose un duel contre un joueur simulé, sans effet sur le classement.
  secours: { attenteAvantDeProposerEnSecondes: 30 },

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  // Le jeu rappelle d'exporter sa sauvegarde après ce nombre de paquets ouverts depuis le dernier export.
  paquetsEntreDeuxRappelsDExport: 100,
};

export function attaqueEnJeu(attaque: number, rarete: Rarete): number {
  const valeur = attaque + EQUILIBRAGE.bonusAttaqueParRarete[rarete];
  return rarete === 'Hors-série' ? Math.max(EQUILIBRAGE.minimumHorsSerie.attaque, valeur) : valeur;
}

export function defenseEnJeu(defense: number, rarete: Rarete): number {
  const valeur = defense + EQUILIBRAGE.bonusDefenseParRarete[rarete];
  return Math.min(EQUILIBRAGE.statMaximale, rarete === 'Hors-série' ? Math.max(EQUILIBRAGE.minimumHorsSerie.defense, valeur) : valeur);
}

// La recharge des paquets d'un joueur, selon qu'il a la version payante ou non. Le serveur applique la même règle
// (fonction « recharger » de serveur/collections.ts) : c'est lui qui fait foi, le jeu ne fait qu'afficher la même chose.
export function reglagesDeRecharge(payant: boolean): { minutesEntreDeuxPaquets: number; stockMaximum: number } {
  return payant ? { ...EQUILIBRAGE.payant } : { minutesEntreDeuxPaquets: EQUILIBRAGE.paquets.minutesEntreDeuxPaquets, stockMaximum: EQUILIBRAGE.paquets.stockMaximum };
}
