// Simulateur de duel : combien de manches dure une partie, et qui gagne ?
// Des joueurs fictifs affrontent l'ordinateur avec les vraies cartes et les vraies règles.
// Sert à régler les points de vie, le poids de la défense, la parade et la force de l'ordinateur.
//
// Usage : npm run simulation:duel   → tableaux à l'écran et dans data/simulation-duel.md

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { NIVEAUX, chancesDeLOrdinateur, choisirPourLOrdinateur, commencerLeDuel, deckDeLOrdinateur, forceDeLaCarte, jouerLaManche, prevoirLAttaque, taillesDesFactions } from '../src/jeu/duel.ts';
import type { Niveau, ReglesDuDuel } from '../src/jeu/duel.ts';
import { choisir, hasardReproductible } from '../src/jeu/hasard.ts';
import type { Hasard } from '../src/jeu/hasard.ts';
import { contientUneLegendaire, ouvrirPaquet, preparerReserve } from '../src/jeu/paquets.ts';
import type { CarteIndex, IndexEdition, Rarete } from '../src/partage/types.ts';

const RACINE = path.join(import.meta.dirname, '..');
const edition: IndexEdition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8'));
const TAILLES = taillesDesFactions(edition.cartes);
const RESERVE = preparerReserve(edition.cartes);

const DUELS_PAR_LIGNE = Number(process.env.MOTS_DUELS_PAR_LIGNE ?? 3000);
if (!Number.isSafeInteger(DUELS_PAR_LIGNE) || DUELS_PAR_LIGNE < 1) throw new Error('MOTS_DUELS_PAR_LIGNE doit être un entier positif.');

// ── Les joueurs fictifs ─────────────────────────────────────────────────────
// Chance de retrouver la bonne définition, selon la rareté du mot : plus un mot est rare, moins on le connaît.
// Seule la connaissance des mots adverses règle les parades ; les attaques sont automatiques.
// (Ce sont des hypothèses : les vrais chiffres viendront des testeurs.)
type Connaissance = Record<Rarete, number>;
const HESITANT: Connaissance = { 'Commune': 0.8, 'Peu commune': 0.7, 'Rare': 0.55, 'Épique': 0.45, 'Légendaire': 0.35, 'Hors-série': 0.5 };
const LECTEUR: Connaissance = { 'Commune': 0.95, 'Peu commune': 0.9, 'Rare': 0.8, 'Épique': 0.65, 'Légendaire': 0.5, 'Hors-série': 0.7 };
const EXPERT: Connaissance = { 'Commune': 0.99, 'Peu commune': 0.97, 'Rare': 0.92, 'Épique': 0.85, 'Légendaire': 0.75, 'Hors-série': 0.9 };

type Joueur = { nom: string; adverses: Connaissance };
const JOUEURS: Joueur[] = [
  { nom: 'Joueur hésitant', adverses: HESITANT },
  { nom: 'Bon lecteur', adverses: LECTEUR },
  { nom: 'Expert des mots', adverses: EXPERT },
];
const BON_LECTEUR = JOUEURS[1];

// ── Les decks ───────────────────────────────────────────────────────────────
// Le joueur fictif ouvre de vrais paquets, puis aligne ses dix cartes les plus fortes.
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

function composerUnDeck(paquets: number, hasard: Hasard, regles: ReglesDuDuel): CarteIndex[] {
  const valeur = forceDeLaCarte;
  return [...choisir(collections.get(paquets)!, hasard)].sort((a, b) => valeur(b) - valeur(a)).slice(0, regles.tailleDuDeck);
}

// ── Un duel ─────────────────────────────────────────────────────────────────
type Bilan = { manches: number; vainqueur: 'joueur' | 'adversaire' | 'nul'; aLaLimite: boolean; degats: number[]; rares: number; parades: number; attaquesSubies: number };

function simulerUnDuel(paquets: number, joueur: Joueur, niveau: Niveau, regles: ReglesDuDuel, graine: number): Bilan {
  const hasard = hasardReproductible(graine);
  const deck = composerUnDeck(paquets, hasard, regles);
  let duel = commencerLeDuel(deck, deckDeLOrdinateur(deck, edition.cartes, niveau, hasard, regles), hasard, regles);
  let parades = 0, attaquesSubies = 0;
  while (duel.vainqueur === null) {
    const etat = duel;
    const adverse = choisirPourLOrdinateur(etat, niveau, hasard, TAILLES, regles);
    // Le joueur répond par la carte qui lui promet le meilleur échange : ce qu'il espère infliger, moins ce qu'il s'attend à subir.
    const saParade = joueur.adverses[adverse.rarete];
    const promesse = (c: CarteIndex): number => {
      const ordinateur = chancesDeLOrdinateur(niveau, c, regles);
      const mienne = prevoirLAttaque(etat, 'joueur', c, adverse, TAILLES, regles);
      const sienne = prevoirLAttaque(etat, 'adversaire', adverse, c, TAILLES, regles);
      const inflige = (ordinateur.parer * mienne.degatsSiParee + (1 - ordinateur.parer) * mienne.degats);
      const subi = (saParade * sienne.degatsSiParee + (1 - saParade) * sienne.degats);
      return inflige - subi;
    };
    const carte = etat.camps.joueur.main.reduce((a, b) => (promesse(b) > promesse(a) ? b : a));
    const ordinateur = chancesDeLOrdinateur(niveau, carte, regles);
    const savoirs = { joueurPare: hasard() < saParade, adversairePare: hasard() < ordinateur.parer };
    duel = jouerLaManche(etat, carte.id, adverse.id, savoirs, hasard, TAILLES, regles);
    const manche = duel.manches.at(-1)!;
    if (manche.adversaire.reussie) { attaquesSubies++; if (manche.adversaire.paree) parades++; }
  }
  return {
    manches: duel.manche,
    vainqueur: duel.vainqueur,
    aLaLimite: duel.camps.joueur.pv > 0 && duel.camps.adversaire.pv > 0,
    degats: duel.manches.flatMap((m) => [m.joueur, m.adversaire]).filter((a) => a.reussie).map((a) => a.infliges),
    rares: deck.filter((c) => c.rarete !== 'Commune' && c.rarete !== 'Peu commune').length,
    parades,
    attaquesSubies,
  };
}

// ── Les tableaux ────────────────────────────────────────────────────────────
const pourcent = (part: number): string => `${Math.round(part * 100)} %`;
const virgule = (n: number, decimales = 1): string => n.toFixed(decimales).replace('.', ',');

type Mesure = { manches: number; de: number; a: number; joueur: number; nuls: number; limite: number; degats: number; faibles: number; parades: number; rares: number };

function mesurer(paquets: number, joueur: Joueur, niveau: Niveau, regles: ReglesDuDuel, duels = DUELS_PAR_LIGNE): Mesure {
  const bilans = Array.from({ length: duels }, (_, i) => simulerUnDuel(paquets, joueur, niveau, regles, 5000 + i));
  const manches = bilans.map((b) => b.manches).sort((a, b) => a - b);
  const degats = bilans.flatMap((b) => b.degats);
  const part = (condition: (b: Bilan) => boolean): number => bilans.filter(condition).length / bilans.length;
  const somme = (valeur: (b: Bilan) => number): number => bilans.reduce((s, b) => s + valeur(b), 0);
  return {
    manches: manches.reduce((s, n) => s + n, 0) / manches.length,
    de: manches[Math.floor(manches.length * 0.1)],
    a: manches[Math.floor(manches.length * 0.9)],
    joueur: part((b) => b.vainqueur === 'joueur'),
    nuls: part((b) => b.vainqueur === 'nul'),
    limite: part((b) => b.aLaLimite),
    degats: degats.reduce((s, n) => s + n, 0) / degats.length,
    faibles: degats.filter((d) => d <= regles.degatsMinimum).length / degats.length,
    parades: somme((b) => b.parades) / Math.max(1, somme((b) => b.attaquesSubies)),
    rares: somme((b) => b.rares) / bilans.length,
  };
}

function ligne(etiquette: string, paquets: number, joueur: Joueur, niveau: Niveau, regles: ReglesDuDuel): string[] {
  const m = mesurer(paquets, joueur, niveau, regles);
  return [etiquette, virgule(m.manches), `${m.de} à ${m.a}`, pourcent(m.joueur), pourcent(m.nuls), pourcent(m.limite), virgule(m.degats), pourcent(m.faibles), pourcent(m.parades), virgule(m.rares)];
}

const tableau = (titres: string[], lignes: string[][]): string[] => [`| ${titres.join(' | ')} |`, `|${titres.map(() => '---').join('|')}|`, ...lignes.map((l) => `| ${l.join(' | ')} |`), ''];
const COLONNES = ['Manches par partie (moyenne)', '8 parties sur 10 durent', 'Victoires du joueur', 'Matchs nuls', 'Parties arrêtées par la limite', "Dégâts d'une attaque qui porte (moyenne)", 'Attaques à 1 dégât ou moins', "Attaques de l'ordinateur parées par le joueur", 'Cartes rares ou mieux dans le deck (sur 10)'];

const REGLES = EQUILIBRAGE.duel;
const parNiveau = COLLECTIONS.flatMap((deck) => NIVEAUX.map((niveau) => ligne(`${deck.nom} — ordinateur ${niveau}`, deck.paquets, BON_LECTEUR, niveau, REGLES)));
const parJoueur = JOUEURS.flatMap((joueur) => NIVEAUX.map((niveau) => ligne(`${joueur.nom} — ordinateur ${niveau}`, MOYENNE.paquets, joueur, niveau, REGLES)));

const VARIANTES: { nom: string; regles: ReglesDuDuel }[] = [
  { nom: 'Réglages actuels', regles: REGLES },
  ...[1, 0.75, 0.5].filter((p) => p !== REGLES.partDeLaDefense).map((p) => ({ nom: p === 1 ? 'La défense compte entièrement' : `La défense compte pour ${pourcent(p)}`, regles: { ...REGLES, partDeLaDefense: p } })),
  ...[15, 20, 25, 30].filter((pv) => pv !== REGLES.pointsDeVie).map((pv) => ({ nom: `${pv} points de vie`, regles: { ...REGLES, pointsDeVie: pv } })),
  { nom: "Une parade annule toute l'attaque", regles: { ...REGLES, partDesDegatsApresParade: 0 } },
  { nom: "Sans parade (ni pour le joueur, ni pour l'ordinateur)", regles: { ...REGLES, partDesDegatsApresParade: 1 } },
  { nom: 'Sans triangle des types ni bonus de faction', regles: { ...REGLES, bonusDeType: 0, bonusDeFaction: 0, bonusDePetiteFaction: 0 } },
];
const variantes = VARIANTES.map((v) => ligne(v.nom, MOYENNE.paquets, BON_LECTEUR, 'Normal', v.regles));

const rapport = [
  '# Simulation de duel',
  '',
  `*Généré par \`npm run simulation:duel\`. ${DUELS_PAR_LIGNE.toLocaleString('fr-FR')} duels simulés par ligne, avec les vraies cartes de l'édition. À chaque manche, l'ordinateur pose un mot, le joueur lui répond, et les deux attaques sont réglées ensemble. Le joueur fictif aligne les dix meilleures cartes de sa collection et répond par la carte qui lui promet le meilleur échange ; les attaques sont automatiques et ses chances de parer baissent avec la rareté du mot adverse (hypothèses en tête de \`simulateurs/duel.ts\`). L'ordinateur reçoit un deck des mêmes raretés et de force comparable, selon le niveau. Les réglages sont dans \`src/config/equilibrage.ts\`.*`,
  '',
  `**Format actuel :** ${REGLES.pointsDeVie} PV, ${REGLES.manchesMaximum} manches maximum. Chaque carte ne se joue qu’une fois ; à épuisement d’un camp, les PV restants départagent les joueurs.`,
  '',
  '**Limite du modèle :** le joueur simulé calcule le meilleur échange immédiat. En jeu, les dégâts ne sont révélés qu’après la manche ; ces résultats ne mesurent pas la difficulté de ce choix pour un humain.',
  '',
  `## Avec les réglages actuels — un « ${BON_LECTEUR.nom.toLowerCase()} », selon sa collection`,
  '',
  ...tableau(['Collection et niveau', ...COLONNES], parNiveau),
  '## Selon le joueur (collection moyenne)',
  '',
  ...tableau(['Joueur et niveau', ...COLONNES], parJoueur),
  `## Et si… (${BON_LECTEUR.nom.toLowerCase()}, collection moyenne, ordinateur Normal)`,
  '',
  ...tableau(['Variante', ...COLONNES], variantes),
].join('\n');

writeFileSync(path.join(RACINE, 'data', 'simulation-duel.md'), rapport);
console.log(rapport);
