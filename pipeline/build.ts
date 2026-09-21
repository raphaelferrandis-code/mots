// Fabrique les cartes du jeu à partir des données brutes.
// Usage : npm run pipeline   (après « npm run sources »)
//
// Produit :
//   public/data/edition-1.index.json et public/data/details/  → les fichiers du jeu
//   data/rapport.md                                            → le rapport à relire
//   data/mots-sensibles.md                                     → mots injurieux, vulgaires ou péjoratifs de l'édition
//   data/intermediaire/base-complete.jsonl                     → toutes les cartes possibles (hors Git)

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CONFIG, estUneOrigineConnue } from './config.ts';
import { assemblerCartes } from './etapes/cartes.ts';
import { composerEdition, renoterDansLEdition } from './etapes/edition.ts';
import { chargerLexique } from './etapes/lexique.ts';
import { redigerMotsSensibles, redigerRapport } from './etapes/rapport.ts';
import { ecrireBaseComplete, ecrireEdition } from './etapes/sortie.ts';
import { lireWiktionnaire } from './etapes/wiktionnaire.ts';

const RACINE = path.join(import.meta.dirname, '..');
const chemin = (...morceaux: string[]): string => path.join(RACINE, ...morceaux);

// Une liste de mots tenue par Raphaël : un mot par ligne, les lignes commençant par # sont des commentaires.
function lireListe(fichier: string): Set<string> {
  if (!existsSync(fichier)) return new Set();
  return new Set(readFileSync(fichier, 'utf8').split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#')));
}

// Corrections d'origine tenues par Raphaël : « mot = Faction ».
function lireCorrections(fichier: string): { corrections: Map<string, string>; erreurs: string[] } {
  const corrections = new Map<string, string>();
  const erreurs: string[] = [];
  if (!existsSync(fichier)) return { corrections, erreurs };
  for (const ligne of readFileSync(fichier, 'utf8').split(/\r?\n/).map((l) => l.trim())) {
    if (!ligne || ligne.startsWith('#')) continue;
    const [mot, origine] = ligne.split('=').map((morceau) => morceau.trim());
    if (!mot || !origine || !estUneOrigineConnue(origine)) { erreurs.push(ligne); continue; }
    corrections.set(mot.toLowerCase(), origine);
  }
  return { corrections, erreurs };
}

const depart = Date.now();
const sources = chemin('data', 'brut', 'sources.json');
if (!existsSync(sources)) {
  console.error('Les données brutes sont absentes. Lancer d\'abord : npm run sources');
  process.exit(1);
}
// La version des données est la date d'extraction du Wiktionnaire : deux générations faites
// à partir des mêmes fichiers donnent exactement le même résultat.
const manifeste = JSON.parse(readFileSync(sources, 'utf8'));
const version = new Date(manifeste.wiktionnaire.derniereModificationServeur).toISOString().slice(0, 10);

console.log('1/5 Lecture de Lexique 4…');
const lexique = chargerLexique(chemin('data', 'brut', 'Lexique4', 'Lexique4.tsv'));
console.log(`    ${lexique.lemmes.size.toLocaleString('fr-FR')} mots de base`);

console.log('2/5 Lecture du Wiktionnaire (environ 30 secondes)…');
const { mots, compteurs } = await lireWiktionnaire(chemin('data', 'brut', 'raw-wiktextract-data.jsonl.gz'), lexique.lemmes, (n) => process.stdout.write(`\r    ${n.toLocaleString('fr-FR')} entrées lues`));
process.stdout.write('\n');

console.log('3/5 Fabrication des cartes (origines, stats, rareté)…');
const { corrections, erreurs: correctionsIllisibles } = lireCorrections(chemin('data', 'corrections-factions.txt'));
for (const ligne of correctionsIllisibles) console.warn(`    ⚠️ Ligne ignorée dans corrections-factions.txt (faction inconnue ?) : ${ligne}`);
const cartes = assemblerCartes(mots, CONFIG, corrections);
console.log(`    ${cartes.length.toLocaleString('fr-FR')} cartes possibles`);

console.log(`4/5 Composition de l'Édition ${CONFIG.edition.numero}…`);
const exclusions = lireListe(chemin('data', 'exclusions.txt'));
const coupsDeCoeur = lireListe(chemin('data', 'coups-de-coeur.txt'));
const composition = composerEdition(cartes, { exclusions, coupsDeCoeur }, CONFIG.edition, CONFIG.rarete.parts);
const journal = composition.journal;
const edition = CONFIG.edition.notesCalculeesSur === 'edition' ? renoterDansLEdition(composition.edition) : composition.edition;
console.log(`    ${edition.length.toLocaleString('fr-FR')} cartes retenues`);

console.log('5/5 Écriture des fichiers…');
const poids = ecrireEdition(chemin('public', 'data'), edition, CONFIG.edition.numero, CONFIG.edition.lots, version);
ecrireBaseComplete(chemin('data', 'intermediaire', 'base-complete.jsonl'), cartes);
writeFileSync(chemin('data', 'rapport.md'), redigerRapport({ lexique, compteurs, motsCroises: mots.size, cartes, edition, journal, exclusions, corrections, correctionsIllisibles, poids, dureeSecondes: (Date.now() - depart) / 1000, version }));
writeFileSync(chemin('data', 'mots-sensibles.md'), redigerMotsSensibles(edition));

console.log(`Terminé en ${Math.round((Date.now() - depart) / 1000)} secondes. À relire : data/rapport.md`);
