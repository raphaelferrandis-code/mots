// Simulateur de duel : combien de manches dure une partie, et qui gagne ?
// Des joueurs fictifs affrontent l'ordinateur avec les vraies cartes et les vraies règles.
// Sert à régler les points de vie, le poids de la défense et les bonus.
//
// Usage : npm run simulation:duel   → tableaux à l'écran et dans data/simulation-duel.md

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { NIVEAUX, choisirPourLOrdinateur, commencerLeDuel, deckDeLOrdinateur, evaluerLAttaque, forceDeLaCarte, jouer, taillesDesFactions } from '../src/jeu/duel.ts';
import type { Niveau, ReglesDuDuel } from '../src/jeu/duel.ts';
import { choisir, hasardReproductible } from '../src/jeu/hasard.ts';
import type { Hasard } from '../src/jeu/hasard.ts';
import { contientUneLegendaire, ouvrirPaquet, preparerReserve } from '../src/jeu/paquets.ts';
import type { CarteIndex, IndexEdition, Rarete } from '../src/partage/types.ts';

const RACINE = path.join(import.meta.dirname, '..');
const edition: IndexEdition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8'));
const TAILLES = taillesDesFactions(edition.cartes);
const RESERVE = preparerReserve(edition.cartes);

const DUELS_PAR_LIGNE = 3000;

// ── Les joueurs fictifs ─────────────────────────────────────────────────────
// Chance de retrouver la bonne définition, selon la rareté du mot : plus un mot est rare, moins on le connaît.
// (Ce sont des hypothèses : les vrais chiffres viendront des testeurs.)
type Connaissance = Record<Rarete, number>;
const JOUEURS: { nom: string; connaissance: Connaissance }[] = [
  { nom: 'Joueur hésitant', connaissance: { 'Commune': 0.8, 'Peu commune': 0.7, 'Rare': 0.55, 'Épique': 0.45, 'Légendaire': 0.35, 'Hors-série': 0.5 } },
  { nom: 'Bon lecteur', connaissance: { 'Commune': 0.95, 'Peu commune': 0.9, 'Rare': 0.8, 'Épique': 0.65, 'Légendaire': 0.5, 'Hors-série': 0.7 } },
  { nom: 'Expert des mots', connaissance: { 'Commune': 0.99, 'Peu commune': 0.97, 'Rare': 0.92, 'Épique': 0.85, 'Légendaire': 0.75, 'Hors-série': 0.9 } },
  // Le joueur qui rejoue toujours les mêmes dix cartes finit par connaître toutes leurs définitions : l'épreuve ne l'arrête plus.
  { nom: 'Connaît son deck par cœur', connaissance: { 'Commune': 1, 'Peu commune': 1, 'Rare': 1, 'Épique': 1, 'Légendaire': 1, 'Hors-série': 1 } },
];
const BON_LECTEUR = JOUEURS[1];

// ── Les decks ───────────────────────────────────────────────────────────────
// Le joueur fictif ouvre de vrais paquets, puis aligne ses dix meilleures cartes — en tenant compte de ses
// chances de connaître le mot, car une attaque qu'on rate ne vaut rien.
const COLLECTIONS_PAR_PROFIL = 40;
const COLLECTIONS: { nom: string; paquets: number }[] = [
  { nom: 'Débutant (3 paquets ouverts)', paquets: 3 },
  { nom: 'Collection moyenne (60 paquets)', paquets: 60 },
  { nom: 'Grande collection (600 paquets)', paquets: 600 },
];
const MOYENNE = COLLECTIONS[1];

function ouvrirDesPaquets(nombre: number, hasard: Hasard): CarteIndex[] {
  const cartes = new Map<string, CarteIndex>();
  let sansLegendaire = 0;
  for (let i = 0; i < nombre; i++) {
    const tirees = ouvrirPaquet(RESERVE, { hasard, paquetsSansLegendaire: sansLegendaire, exclure: i < EQUILIBRAGE.paquets.paquetsDeDepart ? new Set(cartes.keys()) : undefined }, EQUILIBRAGE.paquets, EQUILIBRAGE.finitions);
    sansLegendaire = contientUneLegendaire(tirees) ? 0 : sansLegendaire + 1;
    for (const { carte } of tirees) cartes.set(carte.id, carte);
  }
  return [...cartes.values()];
}

const collections = new Map<number, CarteIndex[][]>(COLLECTIONS.map(({ paquets }) => [paquets, Array.from({ length: COLLECTIONS_PAR_PROFIL }, (_, i) => ouvrirDesPaquets(paquets, hasardReproductible(900 + i)))]));

function composerUnDeck(paquets: number, connaissance: Connaissance, hasard: Hasard, regles: ReglesDuDuel): CarteIndex[] {
  const valeur = (c: CarteIndex): number => connaissance[c.rarete] * c.attaque + (forceDeLaCarte(c) - c.attaque);
  return [...choisir(collections.get(paquets)!, hasard)].sort((a, b) => valeur(b) - valeur(a)).slice(0, regles.tailleDuDeck);
}

// ── Un duel ─────────────────────────────────────────────────────────────────
type Bilan = { manches: number; vainqueur: 'joueur' | 'adversaire' | 'nul'; premierGagne: boolean; aLaLimite: boolean; degats: number[] };

function simulerUnDuel(paquets: number, connaissance: Connaissance, niveau: Niveau, regles: ReglesDuDuel, graine: number): Bilan {
  const hasard = hasardReproductible(graine);
  const deck = composerUnDeck(paquets, connaissance, hasard, regles);
  let duel = commencerLeDuel(deck, deckDeLOrdinateur(deck, edition.cartes, niveau, hasard, regles), hasard, regles);
  while (duel.vainqueur === null) {
    if (duel.aLaMain === 'joueur') {
      // Le joueur choisit la carte qui lui promet le plus de dégâts, compte tenu de ses chances de connaître le mot.
      const etat = duel;
      const promesse = (c: CarteIndex): number => connaissance[c.rarete] * evaluerLAttaque(etat, 'joueur', c, TAILLES, regles).degats;
      const carte = duel.camps.joueur.main.reduce((a, b) => (promesse(b) > promesse(a) ? b : a));
      duel = jouer(duel, carte.id, hasard() < connaissance[carte.rarete], hasard, TAILLES, regles);
    } else {
      const carte = choisirPourLOrdinateur(duel, niveau, hasard, TAILLES, regles);
      duel = jouer(duel, carte.id, hasard() < regles.reussiteDeLOrdinateur[niveau], hasard, TAILLES, regles);
    }
  }
  return {
    manches: duel.manche,
    vainqueur: duel.vainqueur,
    premierGagne: duel.vainqueur === duel.premier,
    aLaLimite: duel.camps.joueur.pv > 0 && duel.camps.adversaire.pv > 0,
    degats: duel.coups.filter((c) => c.reussi).map((c) => c.degats),
  };
}

// ── Les tableaux ────────────────────────────────────────────────────────────
const pourcent = (part: number): string => `${Math.round(part * 100)} %`;
const virgule = (n: number, decimales = 1): string => n.toFixed(decimales).replace('.', ',');

type Mesure = { manches: number; de: number; a: number; joueur: number; premier: number; limite: number; degats: number; auMinimum: number };

function mesurer(paquets: number, connaissance: Connaissance, niveau: Niveau, regles: ReglesDuDuel, duels = DUELS_PAR_LIGNE): Mesure {
  const bilans = Array.from({ length: duels }, (_, i) => simulerUnDuel(paquets, connaissance, niveau, regles, 5000 + i));
  const manches = bilans.map((b) => b.manches).sort((a, b) => a - b);
  const degats = bilans.flatMap((b) => b.degats);
  const part = (condition: (b: Bilan) => boolean): number => bilans.filter(condition).length / bilans.length;
  return {
    manches: manches.reduce((s, n) => s + n, 0) / manches.length,
    de: manches[Math.floor(manches.length * 0.1)],
    a: manches[Math.floor(manches.length * 0.9)],
    joueur: part((b) => b.vainqueur === 'joueur'),
    premier: part((b) => b.premierGagne),
    limite: part((b) => b.aLaLimite),
    degats: degats.reduce((s, n) => s + n, 0) / degats.length,
    auMinimum: degats.filter((d) => d <= regles.degatsMinimum).length / degats.length,
  };
}

function ligne(etiquette: string, paquets: number, connaissance: Connaissance, niveau: Niveau, regles: ReglesDuDuel): string[] {
  const m = mesurer(paquets, connaissance, niveau, regles);
  return [etiquette, virgule(m.manches), `${m.de} à ${m.a}`, pourcent(m.joueur), pourcent(m.premier), pourcent(m.limite), virgule(m.degats), pourcent(m.auMinimum)];
}

const tableau = (titres: string[], lignes: string[][]): string[] => [`| ${titres.join(' | ')} |`, `|${titres.map(() => '---').join('|')}|`, ...lignes.map((l) => `| ${l.join(' | ')} |`), ''];
const COLONNES = ['Manches par partie (moyenne)', '8 parties sur 10 durent', 'Victoires du joueur', 'Victoires de celui qui commence', 'Parties arrêtées par la limite', "Dégâts d'une attaque réussie (moyenne)", 'Attaques réduites au minimum'];

const REGLES = EQUILIBRAGE.duel;
const parNiveau = COLLECTIONS.flatMap((deck) => NIVEAUX.map((niveau) => ligne(`${deck.nom} — ordinateur ${niveau}`, deck.paquets, BON_LECTEUR.connaissance, niveau, REGLES)));
const parJoueur = JOUEURS.flatMap((joueur) => NIVEAUX.map((niveau) => ligne(`${joueur.nom} — ordinateur ${niveau}`, MOYENNE.paquets, joueur.connaissance, niveau, REGLES)));

const VARIANTES: { nom: string; regles: ReglesDuDuel }[] = [
  { nom: 'Réglages actuels', regles: REGLES },
  ...[1, 0.75, 0.5, 0.25, 0].filter((p) => p !== REGLES.partDeLaDefense).map((p) => ({ nom: p === 1 ? 'La défense compte entièrement (formule du brief)' : p === 0 ? 'La défense ne compte pas' : `La défense compte pour ${pourcent(p)}`, regles: { ...REGLES, partDeLaDefense: p } })),
  ...[15, 20, 25, 30].filter((pv) => pv !== REGLES.pointsDeVie).map((pv) => ({ nom: `${pv} points de vie`, regles: { ...REGLES, pointsDeVie: pv } })),
  { nom: 'Défense entière et 12 points de vie', regles: { ...REGLES, partDeLaDefense: 1, pointsDeVie: 12 } },
  { nom: 'Sans triangle des types ni bonus de faction', regles: { ...REGLES, bonusDeType: 0, bonusDeFaction: 0, bonusDePetiteFaction: 0 } },
];
const variantes = VARIANTES.map((v) => ligne(v.nom, MOYENNE.paquets, BON_LECTEUR.connaissance, 'Normal', v.regles));

// ── La grille : durée d'une partie selon les points de vie et le poids de la défense ─────────────
const DUELS_PAR_CASE = 1000;
const POINTS_DE_VIE = [20, 25, 30, 35, 40];
const PARTS_DE_LA_DEFENSE = [1, 0.75, 0.5];
const grille = (motEnJeuAuDepart: boolean): string[][] => PARTS_DE_LA_DEFENSE.map((p) => [
  p === 1 ? 'Défense entière (formule du brief)' : `Défense à ${pourcent(p)}`,
  ...POINTS_DE_VIE.map((pv) => {
    const m = mesurer(MOYENNE.paquets, BON_LECTEUR.connaissance, 'Normal', { ...REGLES, partDeLaDefense: p, pointsDeVie: pv, motEnJeuAuDepart }, DUELS_PAR_CASE);
    return `${virgule(m.manches)} manches · ${pourcent(m.premier)} · ${pourcent(m.auMinimum)}`;
  }),
]);

const rapport = [
  '# Simulation de duel',
  '',
  `*Généré par \`npm run simulation:duel\`. ${DUELS_PAR_LIGNE.toLocaleString('fr-FR')} duels simulés par ligne, avec les vraies cartes de l'édition. Une manche = chaque camp a joué une fois. Le joueur fictif choisit la carte qui lui promet le plus de dégâts ; ses chances de connaître un mot baissent avec la rareté (hypothèses en tête de \`simulateurs/duel.ts\`). Il aligne les dix meilleures cartes de sa collection ; l'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans \`src/config/equilibrage.ts\`.*`,
  '',
  '**Cible du brief :** 6 à 10 manches par partie.',
  '',
  `## Avec les réglages actuels — un « ${BON_LECTEUR.nom.toLowerCase()} », selon son deck`,
  '',
  ...tableau(['Deck et niveau', ...COLONNES], parNiveau),
  '## Selon le joueur (collection moyenne)',
  '',
  ...tableau(['Joueur et niveau', ...COLONNES], parJoueur),
  `## Et si… (${BON_LECTEUR.nom.toLowerCase()}, collection moyenne, ordinateur Normal)`,
  '',
  ...tableau(['Variante', ...COLONNES], variantes),
  '## Grille de réglage (même joueur, même deck, ordinateur Normal)',
  '',
  `Dans chaque case : **durée moyenne · victoires de celui qui commence · attaques réussies réduites au minimum**. ${DUELS_PAR_CASE.toLocaleString('fr-FR')} duels par case.`,
  '',
  '**Chaque camp commence avec un mot en jeu**',
  '',
  ...tableau(['', ...POINTS_DE_VIE.map((pv) => `${pv} points de vie`)], grille(true)),
  '**Sans mot en jeu au départ (la première attaque ne rencontre aucune défense)**',
  '',
  ...tableau(['', ...POINTS_DE_VIE.map((pv) => `${pv} points de vie`)], grille(false)),
].join('\n');

writeFileSync(path.join(RACINE, 'data', 'simulation-duel.md'), rapport);
console.log(rapport);
