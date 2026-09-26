// La feuille de timbres de l'ouverture d'un paquet (brief du 26/09/2026) : sa géométrie, sans écran.
// Unités de la maquette (prototype-ouverture-feuille.html) : une case mesure 300 × 380, au ratio du timbre ; les trous
// de perforation (rayon 7, tous les 20) sont ceux de la dentelure du timbre détaché (timbre/dessins.ts), pour que les
// dents du timbre tombent exactement dans les trous qu'il laisse dans la feuille.

import { empreinte, hasardReproductible } from '../timbre/dessins.ts';

export const CASE = { largeur: 300, hauteur: 380, pas: 20, rayon: 7 } as const;
const MARGE = { cote: 64, haut: 124, hautEtroit: 146, bas: 84 } as const;
// Sous cette largeur d'écran, la feuille passe de 3 colonnes × 2 rangées à 2 colonnes × 3 rangées.
export const ECRAN_ETROIT = '(max-width: 699.98px)';

export type Disposition = { colonnes: number; rangees: number; timbres: number; gauche: number; haut: number; largeur: number; hauteur: number };
export type Rectangle = { x: number; y: number; l: number; h: number };
export type Trou = { x: number; y: number };

export function disposition(timbres: number, etroite: boolean): Disposition {
  const colonnes = Math.max(1, Math.min(etroite ? 2 : 3, timbres));
  const rangees = Math.max(1, Math.ceil(timbres / colonnes));
  const haut = etroite ? MARGE.hautEtroit : MARGE.haut;
  return { colonnes, rangees, timbres, gauche: MARGE.cote, haut, largeur: MARGE.cote * 2 + CASE.largeur * colonnes, hauteur: haut + MARGE.bas + CASE.hauteur * rangees };
}

// La case du i-ème timbre. Au verso, la feuille est vue de dos : la colonne c devient (colonnes − 1 − c), si bien
// qu'un timbre détaché d'un côté laisse son trou au bon endroit de l'autre.
export function caseDuTimbre(i: number, d: Disposition, verso: boolean): Rectangle {
  const rangee = Math.floor(i / d.colonnes);
  const colonne = verso ? d.colonnes - 1 - (i % d.colonnes) : i % d.colonnes;
  return { x: d.gauche + colonne * CASE.largeur, y: d.haut + rangee * CASE.hauteur, l: CASE.largeur, h: CASE.hauteur };
}

// Les trous de perforation : le long des quatre bords de chaque case occupée, une seule fois par bord partagé.
export function trous(d: Disposition, verso: boolean): Trou[] {
  const bords = new Set<string>();
  const liste: Trou[] = [];
  const nx = Math.round(CASE.largeur / CASE.pas), ny = Math.round(CASE.hauteur / CASE.pas);
  const px = CASE.largeur / nx, py = CASE.hauteur / ny;
  for (let i = 0; i < d.timbres; i++) {
    const r = caseDuTimbre(i, d, verso);
    for (const x of [r.x, r.x + r.l]) {
      if (bords.has(`v${x},${r.y}`)) continue;
      bords.add(`v${x},${r.y}`);
      for (let k = 0; k < ny; k++) liste.push({ x, y: r.y + (k + 0.5) * py });
    }
    for (const y of [r.y, r.y + r.h]) {
      if (bords.has(`h${r.x},${y}`)) continue;
      bords.add(`h${r.x},${y}`);
      for (let k = 0; k < nx; k++) liste.push({ x: r.x + (k + 0.5) * px, y });
    }
  }
  return liste;
}

// La place des timbres sur la feuille : un simple mélange d'affichage (le serveur rend le plus rare en dernier).
// Il dépend du paquet, jamais de l'instant : la feuille redessinée garde ses timbres où ils étaient.
export function melanger<T>(liste: readonly T[], cle: string): T[] {
  const hasard = hasardReproductible(empreinte(cle) ^ 0x2545f491);
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}
