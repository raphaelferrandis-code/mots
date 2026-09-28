// Fabrique les pages par mot dans dist/, après « vite build » (npm run build) :
//   dist/mot/<adresse>/index.html  → une page par timbre de l'édition
//   dist/mots/index.html           → la liste de tous les mots
//   dist/mentions-legales/, dist/confidentialite/, dist/conditions/
//                                  → les pages légales, lisibles sans lancer le jeu
//   dist/404.html                  → la page introuvable, que l'hébergeur sert pour toute adresse inconnue
//   dist/sitemap.xml               → le plan du site pour Google, avec toutes ces pages
//   dist/partage/question/<adresse>/ et dist/partage/reponse/<adresse>/
//                                  → les images de la devinette du jour de chaque mot du calendrier, à photographier
//                                    pour les réseaux sociaux (scripts/photographier-les-cartes.ts)
// Les textes complets viennent de data/pages-des-mots.json (npm run pages:textes) ; un mot qui n'y serait pas garde les
// textes du jeu.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { adresseDuMot, adressesDesPages } from '../src/partage/pagesDesMots.ts';
import type { TextesDesPages } from '../src/partage/pagesDesMots.ts';
import { lotDeLaCarte, nomDuLot } from '../src/partage/lots.ts';
import { SITE } from '../src/config/site.ts';
import type { CarteDetails, IndexEdition } from '../src/partage/types.ts';
import type { Devinettes } from '../src/jeu/devinette.ts';
import { adapterLeModele, enteteDeLaCarte, enteteDeLaListe, enteteDeLaPage, enteteDeLaPageIntrouvable, enteteDeLaPageLegale, planDuSite, voisinsDe } from '../src/pages/assemblage.ts';

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

  // Les mots qui s'écrivent pareil sans accent (« beau » nom et adjectif, « sale » et « salé ») : chaque page nomme les
  // autres (« Voir aussi »), et la page introuvable les propose. Deux timbres du même mot mettent leur nature dans le
  // titre (E03). Les renvois du Wiktionnaire (« → voir babiller ») mènent à la première page du mot renvoyé.
  const parAdresse = new Map<string, typeof cartes>();
  for (const carte of cartes) parAdresse.set(adresseDuMot(carte.mot), [...(parAdresse.get(adresseDuMot(carte.mot)) ?? []), carte]);
  const nombreDePages = new Map<string, number>();
  for (const carte of cartes) nombreDePages.set(carte.mot, (nombreDePages.get(carte.mot) ?? 0) + 1);
  const liens = new Map<string, string>();
  for (const carte of cartes) if (!liens.has(carte.mot)) liens.set(carte.mot, adresses.get(carte.id)!);

  let octets = 0;
  for (const carte of cartes) {
    const details = lots[lotDeLaCarte(carte.id, edition.meta.lots)][carte.id];
    const adresse = adresses.get(carte.id)!;
    const texte = textes.mots[carte.id];
    const voisins = voisinsDe(carte, cartes).map((c) => ({ carte: c, adresse: adresses.get(c.id)! }));
    const homographes = parAdresse.get(adresseDuMot(carte.mot))!.filter((c) => c.id !== carte.id).map((c) => ({ carte: c, adresse: adresses.get(c.id)! }));
    // Remplacements par une fonction : un « $ » dans une définition ne serait pas lu comme un motif.
    const html = pourUnePage
      .replace('<!--tete-->', () => `${enteteDeLaPage(carte, details, texte, adresse, nombreDePages.get(carte.mot)! > 1)}\n    ${textures}`)
      .replace('<!--page-->', () => rendu.rendrePage(carte, details, texte, voisins, { adresse, homographes, liens }));
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

  // Les pages légales fixes (/mentions-legales/, /confidentialite/, /conditions/) : lisibles sans lancer le jeu, donc
  // sans ouvrir de compte (audit de finition du 26/09/2026, E19).
  const pourUnePageFixe = adapterLeModele(modeleHtml, 1);
  for (const page of rendu.PAGES_LEGALES) {
    mkdirSync(path.join(DIST, page), { recursive: true });
    writeFileSync(path.join(DIST, page, 'index.html'), pourUnePageFixe
      .replace('<!--tete-->', () => enteteDeLaPageLegale(page, rendu.TITRES_DES_PAGES_LEGALES[page], rendu.DESCRIPTIONS_DES_PAGES_LEGALES[page]))
      .replace('<!--page-->', () => rendu.rendrePageLegale(page)));
  }

  // La page introuvable : l'hébergeur (GitHub Pages) sert dist/404.html pour toute adresse inconnue (E13). Elle connaît
  // les mots à plusieurs pages (« beau » nom et adjectif) pour les proposer.
  const homographes = Object.fromEntries([...parAdresse].filter(([, groupe]) => groupe.length > 1)
    .map(([base, groupe]) => [base, groupe.map((c) => ({ adresse: adresses.get(c.id)!, nature: c.type.toLowerCase(), mot: c.mot }))]));
  writeFileSync(path.join(DIST, '404.html'), adapterLeModele(modeleHtml, 'absolu')
    .replace('<!--tete-->', () => enteteDeLaPageIntrouvable())
    .replace('<!--page-->', () => rendu.rendrePageIntrouvable(homographes)));

  // Les images de la devinette du jour : hors du plan du site, et « noindex » (ce sont des images à fabriquer, pas
  // des pages). La question et la réponse de chaque mot du calendrier (public/data/devinettes.json).
  const pourUneCarte = adapterLeModele(modeleHtml, 3).replace('<html lang="fr">', '<html lang="fr" class="page-carte">');
  const { jours } = JSON.parse(lire('public', 'data', 'devinettes.json')) as Devinettes;
  for (const devinette of jours) {
    const carte = cartes.find((c) => c.id === devinette.id);
    if (!carte) { console.warn(`    ⚠️ Devinette d'un mot inconnu : ${devinette.id}`); continue; }
    const details = lots[lotDeLaCarte(carte.id, edition.meta.lots)][carte.id];
    for (const [genre, corps] of [['question', rendu.rendreQuestion(carte, devinette)], ['reponse', rendu.rendreReponse(carte, details, devinette)]] as const) {
      const dossier = path.join(DIST, 'partage', genre, adresses.get(carte.id)!);
      mkdirSync(dossier, { recursive: true });
      writeFileSync(path.join(dossier, 'index.html'), pourUneCarte
        .replace('<!--tete-->', () => `${enteteDeLaCarte(carte, genre)}\n    ${textures}`)
        .replace('<!--page-->', () => corps));
    }
  }

  const dates = { mots: textes.version, site: new Date().toISOString().slice(0, 10), legales: SITE.textesLegauxLe };
  writeFileSync(path.join(DIST, 'sitemap.xml'), planDuSite(mots.map((m) => m.adresse), dates, rendu.PAGES_LEGALES));
  rmSync(modele);
  console.log(`${cartes.length} pages par mot et ${jours.length} devinettes (question et réponse) fabriquées (${Math.round(octets / 1e6)} Mo) en ${Math.round((Date.now() - depart) / 1000)} s.`);
} finally {
  await vite.close();
}
