// Simulateur de collection : combien de temps faut-il pour réunir l'édition ?
// Des joueurs fictifs ouvrent leurs paquets jour après jour, avec les vraies cartes et les vraies règles.
// Sert à régler la taille de l'édition, les chances de chaque rareté et le rythme des paquets.
//
// Usage : npm run simulation:collection   → tableaux à l'écran et dans data/simulation-collection.md

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { hasardReproductible } from '../src/jeu/hasard.ts';
import { contientUneLegendaire, ouvrirPaquet, preparerReserve } from '../src/jeu/paquets.ts';
import type { Finition, IndexEdition } from '../src/partage/types.ts';

type Equilibrage = typeof EQUILIBRAGE;

const RACINE = path.join(import.meta.dirname, '..');
const edition: IndexEdition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8'));
const reserve = preparerReserve(edition.cartes);
// La collection à réunir, ce sont les cartes ordinaires ; les cartes Hors-série sont comptées à part.
const TOTAL = edition.cartes.filter((c) => c.rarete !== 'Hors-série').length;
const HORS_SERIE = edition.cartes.length - TOTAL;
const LEGENDAIRES = edition.cartes.filter((c) => c.rarete === 'Légendaire').length;

const JOUEURS_PAR_PROFIL = 20;
const JOURS_MAXIMUM = 365 * 4;
const PALIERS = [0.5, 0.9, 1];

// Paquets gratuits ouverts chaque jour. Le maximum possible est de 144 (un toutes les 10 minutes, jour et nuit).
const PROFILS: { nom: string; paquetsParJour: number }[] = [
  { nom: 'Occasionnel (une visite par jour)', paquetsParJour: 10 },
  { nom: 'Régulier (trois visites par jour)', paquetsParJour: 30 },
  { nom: 'Acharné (dix visites par jour)', paquetsParJour: 100 },
];
const REGULIER = PROFILS[1];

type Bilan = { joursParPalier: (number | null)[]; legendairesParSemaine: number; partDePaquetsAchetes: number; premiereHorsSerie: number | null; horsSerieEnUnAn: number; finitionsRaresEnUnMois: number };

function simulerUnJoueur(paquetsParJour: number, graine: number, equilibrage: Equilibrage): Bilan {
  const hasard = hasardReproductible(graine);
  const { paquets, finitions } = equilibrage;
  // Pour chaque carte possédée, les finitions déjà obtenues : seul un vrai doublon (carte et finition) devient de l'Encre.
  const possedees = new Map<string, Set<Finition>>();
  const interdites = new Set<string>();
  let ordinaires = 0, ouverts = 0, sansLegendaire = 0, legendairesDesHuitPremieresSemaines = 0;
  let premiereHorsSerie: number | null = null, horsSerieEnUnAn = 0, finitionsRaresEnUnMois = 0;
  const joursParPalier: (number | null)[] = PALIERS.map(() => null);

  const ouvrir = (jour: number): void => {
    const tirees = ouvrirPaquet(reserve, { hasard, paquetsSansLegendaire: sansLegendaire, exclure: ouverts < paquets.paquetsDeDepart ? interdites : undefined }, paquets, finitions);
    ouverts++;
    sansLegendaire = contientUneLegendaire(tirees) ? 0 : sansLegendaire + 1;
    for (const { carte, finition } of tirees) {
      if (carte.rarete === 'Légendaire' && jour <= 56) legendairesDesHuitPremieresSemaines++;
      if (carte.rarete === 'Hors-série') { premiereHorsSerie ??= jour; if (jour <= 365) horsSerieEnUnAn++; }
      if (finition !== 'Normale' && jour <= 30) finitionsRaresEnUnMois++;
      const obtenues = possedees.get(carte.id);
      if (!obtenues) { possedees.set(carte.id, new Set([finition])); interdites.add(carte.id); if (carte.rarete !== 'Hors-série') ordinaires++; }
      else if (!obtenues.has(finition)) obtenues.add(finition);
    }
  };

  // La simulation dure au moins un an (pour compter les cartes Hors-série), et jusqu'à la fin de la collection.
  for (let jour = 1; jour <= JOURS_MAXIMUM && (ordinaires < TOTAL || jour <= 365); jour++) {
    for (let i = 0; i < paquetsParJour; i++) ouvrir(jour);
    PALIERS.forEach((palier, k) => { if (joursParPalier[k] === null && ordinaires >= Math.ceil(palier * TOTAL)) joursParPalier[k] = jour; });
  }
  return { joursParPalier, legendairesParSemaine: legendairesDesHuitPremieresSemaines / 8, partDePaquetsAchetes: 0, premiereHorsSerie, horsSerieEnUnAn, finitionsRaresEnUnMois };
}

// Valeur du milieu : la moitié des joueurs fait mieux, l'autre moitié moins bien.
function mediane(valeurs: (number | null)[]): number | null {
  // « null » = jamais atteint pendant la simulation : ces joueurs-là sont rangés en dernier.
  const tries = [...valeurs].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  return tries[Math.floor(tries.length / 2)];
}

function enDuree(jours: number | null): string {
  if (jours === null) return `plus de ${Math.round(JOURS_MAXIMUM / 365)} ans`;
  if (jours < 60) return `${jours} jours`;
  if (jours < 365 * 2) return `${(jours / 30.4).toFixed(1).replace('.', ',')} mois`;
  return `${(jours / 365).toFixed(1).replace('.', ',')} ans`;
}

function ligne(etiquette: string, paquetsParJour: number, equilibrage: Equilibrage): string[] {
  const bilans = Array.from({ length: JOUEURS_PAR_PROFIL }, (_, i) => simulerUnJoueur(paquetsParJour, 1000 + i, equilibrage));
  const moyenne = (valeur: (b: Bilan) => number): number => bilans.reduce((s, b) => s + valeur(b), 0) / bilans.length;
  return [
    etiquette,
    ...PALIERS.map((_, k) => enDuree(mediane(bilans.map((b) => b.joursParPalier[k])))),
    moyenne((b) => b.legendairesParSemaine).toFixed(1).replace('.', ','),
    `${Math.round(moyenne((b) => b.partDePaquetsAchetes) * 100)} %`,
    enDuree(mediane(bilans.map((b) => b.premiereHorsSerie))),
    moyenne((b) => b.horsSerieEnUnAn).toFixed(1).replace('.', ','),
    String(Math.round(moyenne((b) => b.finitionsRaresEnUnMois))),
  ];
}

const tableau = (titres: string[], lignes: string[][]): string[] => [`| ${titres.join(' | ')} |`, `|${titres.map(() => '---').join('|')}|`, ...lignes.map((l) => `| ${l.join(' | ')} |`), ''];

// ── Réglages actuels ───────────────────────────────────────────────────────
const COLONNES = ['50 % de la collection', '90 %', '100 %', 'Légendaires par semaine (2 premiers mois)', "Paquets payés avec l'Encre", 'Première carte Hors-série', `Cartes Hors-série tirées en un an (il en existe ${HORS_SERIE})`, 'Cartes brillantes ou holographiques le premier mois'];
const actuels = PROFILS.map((p) => ligne(`${p.nom} — ${p.paquetsParJour} paquets gratuits par jour`, p.paquetsParJour, EQUILIBRAGE));

// ── « Et si… » : quelques variantes, pour le joueur régulier ───────────────
// Chaque emplacement qui peut donner une Légendaire (les deux derniers) passe au taux voulu.
const avecLeTaux = (taux: number): Equilibrage['paquets']['emplacements'] => EQUILIBRAGE.paquets.emplacements.map((chances) => (chances['Légendaire'] ? { 'Rare': 96 - taux - 22 + 4, 'Épique': 22, 'Légendaire': taux } : chances));
const VARIANTES: { nom: string; equilibrage: Equilibrage }[] = [
  { nom: 'Réglages actuels', equilibrage: EQUILIBRAGE },
  // Les réglages d'avant le 26/09/2026, pour comparer : cinq timbres par paquet, Légendaire garantie au 40e paquet.
  { nom: 'Avant le 26/09 : cinq timbres, garantie au 40e paquet', equilibrage: { ...EQUILIBRAGE, paquets: { ...EQUILIBRAGE.paquets, emplacements: EQUILIBRAGE.paquets.emplacements.slice(0, 5), paquetsAvantLegendaireGarantie: 40 } } },
  { nom: 'Légendaire à 2 % au lieu de 4 %', equilibrage: { ...EQUILIBRAGE, paquets: { ...EQUILIBRAGE.paquets, emplacements: avecLeTaux(2) } } },
  ...[300, 3000].map((n) => ({ nom: `Carte Hors-série : 1 paquet sur ${n}`, equilibrage: { ...EQUILIBRAGE, paquets: { ...EQUILIBRAGE.paquets, chanceHorsSerie: 1 / n } } })),
];
const variantes = VARIANTES.map((v) => ligne(v.nom, REGULIER.paquetsParJour, v.equilibrage));

const rapport = [
  '# Simulation de collection',
  '',
  `*Généré par \`npm run simulation:collection\`. Édition de ${TOTAL.toLocaleString('fr-FR')} cartes ordinaires dont ${LEGENDAIRES} Légendaires, plus ${HORS_SERIE} cartes Hors-série comptées à part ; ${JOUEURS_PAR_PROFIL} joueurs simulés par ligne (on retient le joueur du milieu) ; les joueurs ouvrent uniquement les paquets reçus avec le temps. Les réglages sont dans \`src/config/equilibrage.ts\`.*`,
  '',
  '## Avec les réglages actuels',
  '',
  ...tableau(['Profil de joueur', ...COLONNES], actuels),
  "**Économie de l’Encre :** l’Encre sert uniquement aux enchères. Aucun paquet ne peut être acheté. Cette simulation ne modélise pas les échanges du marché.",
  '',
  "**Cible du brief :** un joueur régulier termine l'édition en 6 mois à 1 an, avec environ une Légendaire par jour (7 par semaine).",
  '',
  `## Et si… (joueur régulier, ${REGULIER.paquetsParJour} paquets gratuits par jour)`,
  '',
  ...tableau(['Variante', ...COLONNES], variantes),
].join('\n');

writeFileSync(path.join(RACINE, 'data', 'simulation-collection.md'), rapport);
console.log(rapport);
