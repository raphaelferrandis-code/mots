// Les textes complets des pages par mot (philamots.fr/mot/…), lus dans le Wiktionnaire.
// Usage : npm run pages:textes   (après « npm run sources »)
//
// Le jeu garde des textes courts : trois définitions au plus, coupées à 200 caractères, et une étymologie coupée à
// 400. Les pages, elles, montrent tout. Ce script ne touche pas aux fichiers du jeu (public/data) : il écrit seulement
// data/pages-des-mots.json, que la fabrication du site (scripts/fabriquer-les-pages.ts) transforme en pages.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { IndexEdition } from '../src/partage/types.ts';
import type { TextesDesPages } from '../src/partage/pagesDesMots.ts';
import { cle, chargerLexique } from './etapes/lexique.ts';
import { registresDuSens, sensActuelsDAbord } from './etapes/registre.ts';
import { sansReferences } from './etapes/nettoyage.ts';
import { lireWiktionnaire } from './etapes/wiktionnaire.ts';

const RACINE = path.join(import.meta.dirname, '..');
const chemin = (...morceaux: string[]): string => path.join(RACINE, ...morceaux);

// Au-delà, la page deviendrait une liste interminable (« faire » a plus de cent sens) : les premiers suffisent.
const DEFINITIONS_AU_PLUS = 12;

if (!existsSync(chemin('data', 'brut', 'sources.json'))) {
  console.error('Les données brutes sont absentes. Lancer d\'abord : npm run sources');
  process.exit(1);
}
const manifeste = JSON.parse(readFileSync(chemin('data', 'brut', 'sources.json'), 'utf8'));
const version = new Date(manifeste.wiktionnaire.derniereModificationServeur).toISOString().slice(0, 10);
const edition = JSON.parse(readFileSync(chemin('public', 'data', 'edition-1.index.json'), 'utf8')) as IndexEdition;

console.log('Lecture de Lexique 4 et du Wiktionnaire (environ 30 secondes)…');
const lexique = chargerLexique(chemin('data', 'brut', 'Lexique4', 'Lexique4.tsv'));
const { mots } = await lireWiktionnaire(chemin('data', 'brut', 'raw-wiktextract-data.jsonl.gz'), lexique.lemmes);

const textes: TextesDesPages = { version, mots: {} };
const absents: string[] = [];
for (const carte of edition.cartes) {
  const m = mots.get(cle(carte.mot, carte.type));
  if (!m || m.sens.length === 0) { absents.push(carte.id); continue; }
  const vus = new Set<string>();
  const definitions = sensActuelsDAbord(m.sens, (s) => registresDuSens(s.etiquettes))
    .filter((s) => !vus.has(s.definition) && vus.add(s.definition))
    .slice(0, DEFINITIONS_AU_PLUS)
    .map((s) => {
      const registre = registresDuSens(s.etiquettes);
      return registre.length ? { texte: s.definition, registre } : { texte: s.definition };
    });
  textes.mots[carte.id] = { definitions, etymologies: [...new Set(m.etymologies.map(sansReferences))], sens: m.sens.length };
}

// Un mot introuvable garde les textes du jeu : sa page existe quand même.
for (const id of absents) console.warn(`    ⚠️ ${id} : absent de cette version du Wiktionnaire, la page reprendra les textes du jeu`);
writeFileSync(chemin('data', 'pages-des-mots.json'), `${JSON.stringify(textes)}\n`);
const nombre = Object.keys(textes.mots).length;
console.log(`${nombre} mots écrits dans data/pages-des-mots.json (Wiktionnaire du ${version}).`);
