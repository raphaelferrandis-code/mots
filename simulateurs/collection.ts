// Simulateur de collection : combien de temps faut-il pour réunir l'édition ?
// Des joueurs fictifs ouvrent leurs paquets jour après jour, avec les vraies cartes et les vraies règles.
// Sert à régler la taille de l'édition, les chances de chaque rareté et le prix des paquets.
//
// Usage : npm run simulation:collection   → tableaux à l'écran et dans data/simulation-collection.md

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { hasardReproductible } from '../src/jeu/hasard.ts';
import { contientUneLegendaire, encreMaximaleMoyenneParPaquet, ouvrirPaquet, preparerReserve } from '../src/jeu/paquets.ts';
import type { IndexEdition } from '../src/partage/types.ts';

type Equilibrage = typeof EQUILIBRAGE;

const RACINE = path.join(import.meta.dirname, '..');
const edition: IndexEdition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8'));
const reserve = preparerReserve(edition.cartes);
const TOTAL = edition.cartes.length;
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

type Bilan = { joursParPalier: (number | null)[]; legendairesParSemaine: number; partDePaquetsAchetes: number };

function simulerUnJoueur(paquetsParJour: number, graine: number, equilibrage: Equilibrage): Bilan {
  const hasard = hasardReproductible(graine);
  const { paquets, encreParDoublon } = equilibrage;
  const possedees = new Set<string>();
  let encre = 0, ouverts = 0, achetes = 0, sansLegendaire = 0, legendairesDesHuitPremieresSemaines = 0;
  const joursParPalier: (number | null)[] = PALIERS.map(() => null);

  const ouvrir = (jour: number): void => {
    const cartes = ouvrirPaquet(reserve, { hasard, paquetsSansLegendaire: sansLegendaire, exclure: ouverts < paquets.paquetsDeDepart ? possedees : undefined }, paquets);
    ouverts++;
    sansLegendaire = contientUneLegendaire(cartes) ? 0 : sansLegendaire + 1;
    for (const carte of cartes) {
      if (carte.rarete === 'Légendaire' && jour <= 56) legendairesDesHuitPremieresSemaines++;
      if (possedees.has(carte.id)) encre += encreParDoublon[carte.rarete];
      else possedees.add(carte.id);
    }
  };

  for (let jour = 1; jour <= JOURS_MAXIMUM && possedees.size < TOTAL; jour++) {
    for (let i = 0; i < paquetsParJour; i++) ouvrir(jour);
    // Le joueur dépense son Encre dès qu'il peut s'offrir un paquet.
    while (encre >= paquets.prixEnEncre) { encre -= paquets.prixEnEncre; achetes++; ouvrir(jour); }
    PALIERS.forEach((palier, k) => { if (joursParPalier[k] === null && possedees.size >= Math.ceil(palier * TOTAL)) joursParPalier[k] = jour; });
  }
  return { joursParPalier, legendairesParSemaine: legendairesDesHuitPremieresSemaines / 8, partDePaquetsAchetes: achetes / ouverts };
}

// Valeur du milieu : la moitié des joueurs fait mieux, l'autre moitié moins bien.
function mediane(valeurs: (number | null)[]): number | null {
  if (valeurs.some((v) => v === null)) return null;
  const tries = (valeurs as number[]).sort((a, b) => a - b);
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
  ];
}

const tableau = (titres: string[], lignes: string[][]): string[] => [`| ${titres.join(' | ')} |`, `|${titres.map(() => '---').join('|')}|`, ...lignes.map((l) => `| ${l.join(' | ')} |`), ''];

// ── Réglages actuels ───────────────────────────────────────────────────────
const COLONNES = ['50 % de la collection', '90 %', '100 %', 'Légendaires par semaine (2 premiers mois)', "Paquets payés avec l'Encre"];
const actuels = PROFILS.map((p) => ligne(`${p.nom} — ${p.paquetsParJour} paquets gratuits par jour`, p.paquetsParJour, EQUILIBRAGE));

// ── « Et si… » : quelques variantes, pour le joueur régulier ───────────────
const avecLeTaux = (taux: number): Equilibrage['paquets']['emplacements'] => EQUILIBRAGE.paquets.emplacements.map((chances, i, tous) => (i === tous.length - 1 ? { 'Rare': 96 - taux - 22 + 4, 'Épique': 22, 'Légendaire': taux } : chances));
const VARIANTES: { nom: string; equilibrage: Equilibrage }[] = [
  { nom: 'Réglages actuels', equilibrage: EQUILIBRAGE },
  ...[50, 100, 150, 250].filter((prix) => prix !== EQUILIBRAGE.paquets.prixEnEncre).map((prix) => ({ nom: `Paquet à ${prix} Encre`, equilibrage: { ...EQUILIBRAGE, paquets: { ...EQUILIBRAGE.paquets, prixEnEncre: prix } } })),
  { nom: 'Légendaire à 2 % au lieu de 4 %', equilibrage: { ...EQUILIBRAGE, paquets: { ...EQUILIBRAGE.paquets, emplacements: avecLeTaux(2) } } },
  { nom: "Sans achat de paquets avec l'Encre", equilibrage: { ...EQUILIBRAGE, paquets: { ...EQUILIBRAGE.paquets, prixEnEncre: Number.POSITIVE_INFINITY } } },
];
const variantes = VARIANTES.map((v) => ligne(v.nom, REGULIER.paquetsParJour, v.equilibrage));

const retour = encreMaximaleMoyenneParPaquet(EQUILIBRAGE.paquets.emplacements, EQUILIBRAGE.encreParDoublon);
const rapport = [
  '# Simulation de collection',
  '',
  `*Généré par \`npm run simulation:collection\`. Édition de ${TOTAL.toLocaleString('fr-FR')} cartes dont ${LEGENDAIRES} Légendaires ; ${JOUEURS_PAR_PROFIL} joueurs simulés par ligne (on retient le joueur du milieu) ; chaque joueur dépense son Encre en paquets dès qu'il le peut. Les réglages sont dans \`src/config/equilibrage.ts\`.*`,
  '',
  '## Avec les réglages actuels',
  '',
  ...tableau(['Profil de joueur', ...COLONNES], actuels),
  `**Économie de l'Encre :** un paquet coûte ${EQUILIBRAGE.paquets.prixEnEncre} Encre et en rapporte au maximum ${retour.toFixed(1).replace('.', ',')} en moyenne (quand toutes ses cartes sont des doublons), soit ${Math.round((retour / EQUILIBRAGE.paquets.prixEnEncre) * 100)} % de son prix. Plus ce chiffre approche de 100 %, plus l'Encre multiplie les paquets.`,
  '',
  "**Cible du brief :** un joueur régulier termine l'édition en 6 mois à 1 an, avec environ une Légendaire par jour (7 par semaine).",
  '',
  `## Et si… (joueur régulier, ${REGULIER.paquetsParJour} paquets gratuits par jour)`,
  '',
  ...tableau(['Variante', ...COLONNES], variantes),
].join('\n');

writeFileSync(path.join(RACINE, 'data', 'simulation-collection.md'), rapport);
console.log(rapport);
