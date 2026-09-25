// Les écrans se chargent à la demande, mais leurs feuilles de style non (stylesDesEcrans.ts) : une feuille arrivée
// avec son écran passerait après le thème et l'emporterait sur ses réglages. Ce test parcourt les imports du jeu et
// signale toute feuille qu'un écran importe sans qu'elle figure dans la liste.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.join(import.meta.dirname, '..');
const relatif = (fichier: string): string => path.relative(SRC, fichier).replaceAll('\\', '/');

function resoudre(depuis: string, specifiant: string): string {
  const base = path.resolve(path.dirname(depuis), specifiant);
  for (const essai of [base, `${base}.ts`, `${base}.tsx`]) if (existsSync(essai) && statSync(essai).isFile()) return essai;
  throw new Error(`${specifiant} introuvable depuis ${relatif(depuis)}`);
}

// Les imports relatifs d'un module (« import type » exceptés : ils disparaissent à la compilation), puis les écrans
// chargés à la demande — sauf ceux réservés au développement.
function dependances(fichier: string): string[] {
  const code = readFileSync(fichier, 'utf8');
  const trouves = [...code.matchAll(/^\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\s+from\s+)?['"](\.[^'"]+)['"]/gm)].filter((m) => !m[1]).map((m) => m[2]);
  for (const ligne of code.split('\n')) {
    if (!ligne.includes('import.meta.env.DEV')) for (const m of ligne.matchAll(/import\(['"](\.[^'"]+)['"]\)/g)) trouves.push(m[1]);
  }
  return trouves;
}

function feuillesAtteintes(depart: string): Set<string> {
  const vus = new Set<string>();
  const feuilles = new Set<string>();
  const visiter = (fichier: string): void => {
    if (vus.has(fichier)) return;
    vus.add(fichier);
    for (const specifiant of dependances(fichier)) {
      if (specifiant.endsWith('.css')) feuilles.add(path.resolve(path.dirname(fichier), specifiant));
      else visiter(resoudre(fichier, specifiant));
    }
  };
  visiter(depart);
  return feuilles;
}

it('toutes les feuilles de style des écrans sont chargées d’emblée, avant celles du thème', () => {
  const liste = dependances(path.join(SRC, 'theme', 'stylesDesEcrans.ts')).map((s) => path.resolve(SRC, 'theme', s));
  const duTheme = dependances(path.join(SRC, 'main.tsx')).filter((s) => s.endsWith('.css')).map((s) => path.resolve(SRC, s));
  const manquantes = [...feuillesAtteintes(path.join(SRC, 'main.tsx'))].filter((f) => !liste.includes(f) && !duTheme.includes(f));
  assert.deepEqual(manquantes.map(relatif), [], 'à ajouter à la fin de src/theme/stylesDesEcrans.ts');
  assert.equal(new Set(liste).size, liste.length, 'une feuille en double');
  for (const f of liste) assert.ok(existsSync(f), `${relatif(f)} n'existe plus`);
  // La liste passe avant tout le reste de l'application, et l'application avant le thème.
  assert.match(readFileSync(path.join(SRC, 'App.tsx'), 'utf8'), /^import '\.\/theme\/stylesDesEcrans\.ts';/);
  const main = readFileSync(path.join(SRC, 'main.tsx'), 'utf8');
  assert.ok(main.indexOf("from './App.tsx'") < main.indexOf("import './theme/theme.css'"));
});
