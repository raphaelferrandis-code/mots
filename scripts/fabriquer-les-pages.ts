// Fabrique les pages par mot dans dist/, après « vite build » (npm run build) :
//   dist/mot/<adresse>/index.html  → une page par timbre de l'édition
//   dist/mots/index.html           → la liste de tous les mots
//   dist/sitemap.xml               → le plan du site pour Google, avec toutes ces pages
//   dist/partage/carte/<adresse>/  → la carte du mot du jour de chaque mot du calendrier (data/mot-du-jour.txt), à
//                                    photographier pour les réseaux sociaux (scripts/photographier-les-cartes.ts)
// Les textes complets viennent de data/pages-des-mots.json (npm run pages:textes) ; un mot qui n'y serait pas garde les
// textes du jeu.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { adressesDesPages } from '../src/partage/pagesDesMots.ts';
import type { TextesDesPages } from '../src/partage/pagesDesMots.ts';
import { lotDeLaCarte, nomDuLot } from '../src/partage/lots.ts';
import type { CarteDetails, IndexEdition } from '../src/partage/types.ts';
import { lireCalendrier } from '../pipeline/etapes/motDuJour.ts';
import { adapterLeModele, enteteDeLaCarte, enteteDeLaListe, enteteDeLaPage, planDuSite, voisinsDe } from '../src/pages/assemblage.ts';

const RACINE = path.join(import.meta.dirname, '..');
const DIST = path.join(RACINE, 'dist');
const lire = (...morceaux: string[]): string => readFileSync(path.join(RACINE, ...morceaux), 'utf8');

const modele = path.join(DIST, 'mot.html');
if (!existsSync(modele)) {
  console.error('dist/mot.html est absent : lancer d\'abord « vite build » (npm run build fait les deux).');
  process.exit(1);
}

const depart = Date.now();
const edition = JSON.parse(lire('public', 'data', 'edition-1.index.json')) as IndexEdition;
const lots = Array.from({ length: edition.meta.lots }, (_, lot) => JSON.parse(lire('public', 'data', 'details', nomDuLot(lot))) as Record<string, CarteDetails>);
const textes = JSON.parse(lire('data', 'pages-des-mots.json')) as TextesDesPages;
// Tous les mots de l'édition, injurieux compris : ils font partie de la langue (décision de Raphaël, 26/09).
const cartes = edition.cartes;
const adresses = adressesDesPages(cartes);

// Vite lit les composants du jeu (TSX, feuilles de style importées) comme il le fait pour le site.
const vite = await createServer({ root: RACINE, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
try {
  const rendu = await vite.ssrLoadModule('/src/pages/rendu.tsx') as typeof import('../src/pages/rendu.tsx');
  const textures = `<style>:root { ${Object.entries(rendu.TEXTURES_DU_TIMBRE).map(([nom, valeur]) => `${nom}: ${valeur};`).join(' ')} }</style>`;
  const modeleHtml = readFileSync(modele, 'utf8');
  const pourUnePage = adapterLeModele(modeleHtml, 2);
  const pourLaListe = adapterLeModele(modeleHtml, 1);

  let octets = 0;
  for (const carte of cartes) {
    const details = lots[lotDeLaCarte(carte.id, edition.meta.lots)][carte.id];
    const adresse = adresses.get(carte.id)!;
    const texte = textes.mots[carte.id];
    const voisins = voisinsDe(carte, cartes).map((c) => ({ carte: c, adresse: adresses.get(c.id)! }));
    // Remplacements par une fonction : un « $ » dans une définition ne serait pas lu comme un motif.
    const html = pourUnePage
      .replace('<!--tete-->', () => `${enteteDeLaPage(carte, details, texte, adresse)}\n    ${textures}`)
      .replace('<!--page-->', () => rendu.rendrePage(carte, details, texte, voisins));
    const dossier = path.join(DIST, 'mot', adresse);
    mkdirSync(dossier, { recursive: true });
    writeFileSync(path.join(dossier, 'index.html'), html);
    octets += Buffer.byteLength(html);
  }

  const mots = cartes.map((c) => ({ mot: c.mot, adresse: adresses.get(c.id)!, type: c.type }))
    .sort((a, b) => a.adresse.localeCompare(b.adresse, 'fr'));
  mkdirSync(path.join(DIST, 'mots'), { recursive: true });
  writeFileSync(path.join(DIST, 'mots', 'index.html'), pourLaListe
    .replace('<!--tete-->', () => enteteDeLaListe(mots.length))
    .replace('<!--page-->', () => rendu.rendreListe(mots)));

  // Les cartes du mot du jour : hors du plan du site, et « noindex » (ce sont des images à fabriquer, pas des pages).
  const pourUneCarte = adapterLeModele(modeleHtml, 3).replace('<html lang="fr">', '<html lang="fr" class="page-carte">');
  const calendrier = lireCalendrier(lire('data', 'mot-du-jour.txt')).ids;
  for (const id of calendrier) {
    const carte = cartes.find((c) => c.id === id);
    if (!carte) { console.warn(`    ⚠️ Mot du jour inconnu dans data/mot-du-jour.txt : ${id}`); continue; }
    const details = lots[lotDeLaCarte(carte.id, edition.meta.lots)][carte.id];
    const dossier = path.join(DIST, 'partage', 'carte', adresses.get(carte.id)!);
    mkdirSync(dossier, { recursive: true });
    writeFileSync(path.join(dossier, 'index.html'), pourUneCarte
      .replace('<!--tete-->', () => `${enteteDeLaCarte(carte)}\n    ${textures}`)
      .replace('<!--page-->', () => rendu.rendreCarte(carte, details, textes.mots[carte.id])));
  }

  writeFileSync(path.join(DIST, 'sitemap.xml'), planDuSite(mots.map((m) => m.adresse), textes.version));
  rmSync(modele);
  console.log(`${cartes.length} pages par mot et ${calendrier.length} cartes du mot du jour fabriquées (${Math.round(octets / 1e6)} Mo) en ${Math.round((Date.now() - depart) / 1000)} s.`);
} finally {
  await vite.close();
}
