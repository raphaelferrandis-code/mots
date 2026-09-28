// Le fond de la page est posé sur body : tant que html n'en a pas, le navigateur l'étend à toute la fenêtre, sous les
// calques en z-index -1 de FondAnime (rosaces, grain et vignette de l'accueil et du duel). Un fond donné à html (ou à
// :root) fait peindre celui de body PAR-DESSUS ces calques : les rosaces ont ainsi disparu du 25 au 28/09/2026 (règle
// « html, body » de l'écran d'attente d'index.html), sans que rien d'autre ne casse.

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const RACINE = path.join(import.meta.dirname, '..', '..');

// Les règles d'une feuille, commentaires ôtés : [sélecteurs, déclarations]. Celles d'un @media sont lues aussi.
function regles(css: string): [string[], string][] {
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...sansCommentaires.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].split(',').map((s) => s.trim()), m[2]]);
}
const donneUnFond = (declarations: string): boolean => /(?:^|;)\s*background(?:-color|-image)?\s*:/.test(declarations);
const surLaRacine = (selecteur: string): boolean => /^(?:html|:root)(?:[.:#[][^\s>+~]*)?$/.test(selecteur);

it('le fond de la page est posé sur body, jamais sur html : il recouvrirait les rosaces', () => {
  const page = readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const stylesDeLaPage = [...page.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const feuilles: [string, string][] = readdirSync(path.join(RACINE, 'src'), { recursive: true, withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith('.css'))
    .map((f) => path.join(f.parentPath, f.name))
    .map((f) => [path.relative(RACINE, f).replaceAll('\\', '/'), readFileSync(f, 'utf8')]);
  const fautives = [['index.html', stylesDeLaPage] as [string, string], ...feuilles].flatMap(([nom, css]) => regles(css)
    .filter(([selecteurs, declarations]) => selecteurs.some(surLaRacine) && donneUnFond(declarations))
    .map(([selecteurs]) => `${nom} : ${selecteurs.join(', ')}`));
  assert.deepEqual(fautives, [], 'le fond va sur body');
  // L'écran d'attente, peint avant les feuilles du jeu, a bien son fond de nuit (sinon : un éclair blanc au chargement).
  assert.ok(regles(stylesDeLaPage).some(([selecteurs, declarations]) => selecteurs.includes('body') && donneUnFond(declarations)));
});
