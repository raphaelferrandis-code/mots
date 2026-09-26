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

// ── Détacher un timbre en suivant ses pointillés ──
// Le tour d'une case est découpé en parts ; le doigt (ou la souris) en marque une dès qu'il passe assez près du bord,
// dans n'importe quel ordre. Le timbre se détache quand presque tout le tour est parcouru.
export const PARTS_DU_TOUR = 48;
export const SEUIL_DU_DETACHEMENT = 0.85;
type Cadre = { left: number; top: number; width: number; height: number };

// La position d'un point sur le tour d'un cadre (de 0 à 1, dans le sens des aiguilles d'une montre depuis le coin
// haut gauche) et sa distance au bord le plus proche, que le point soit dedans ou dehors.
export function surLeTour(x: number, y: number, c: Cadre): { t: number; distance: number } {
  const px = Math.min(c.width, Math.max(0, x - c.left)), py = Math.min(c.height, Math.max(0, y - c.top));
  const dedans = x >= c.left && x <= c.left + c.width && y >= c.top && y <= c.top + c.height;
  const bords = [py, c.width - px, c.height - py, px]; // haut, droite, bas, gauche
  const bord = bords.indexOf(Math.min(...bords));
  const tour = 2 * (c.width + c.height);
  const s = [px, c.width + py, c.width + c.height + (c.width - px), 2 * c.width + c.height + (c.height - py)][bord];
  const distance = dedans ? bords[bord] : Math.hypot(x - (c.left + px), y - (c.top + py));
  return { t: (s / tour) % 1, distance };
}

// Marque les parts parcourues entre deux positions sur le tour, par le plus court chemin. Rend le nombre de parts
// nouvellement marquées.
export function parcourir(parts: boolean[], de: number | null, a: number): number {
  const n = parts.length, fin = Math.floor(a * n) % n;
  let debut = de === null ? fin : Math.floor(de * n) % n;
  let pas = (fin - debut + n) % n;
  let sens = 1;
  if (pas > n / 2) { pas = n - pas; sens = -1; }
  let nouvelles = 0;
  for (let k = 0; k <= pas; k++) {
    if (!parts[debut]) { parts[debut] = true; nouvelles++; }
    debut = (debut + sens + n) % n;
  }
  return nouvelles;
}

export const avancement = (parts: readonly boolean[]): number => parts.filter(Boolean).length / Math.max(1, parts.length);

// Le point du tour d'une case à la position t (de 0 à 1, même sens que surLeTour), en unités de la feuille.
export function pointDuTour(r: Rectangle, t: number): [number, number] {
  let s = (((t % 1) + 1) % 1) * 2 * (r.l + r.h);
  if (s <= r.l) return [r.x + s, r.y];
  s -= r.l;
  if (s <= r.h) return [r.x + r.l, r.y + s];
  s -= r.h;
  if (s <= r.l) return [r.x + r.l - s, r.y + r.h];
  s -= r.l;
  return [r.x, r.y + r.h - s];
}

// Le tracé des pointillés déjà arrachés : une ligne par suite de parts parcourues, qui suit les coins.
export function traceDesParts(r: Rectangle, parts: readonly boolean[]): string {
  const n = parts.length, tour = 2 * (r.l + r.h);
  const coins = [0, r.l / tour, (r.l + r.h) / tour, (2 * r.l + r.h) / tour];
  if (parts.every(Boolean)) return `M${r.x} ${r.y}h${r.l}v${r.h}h${-r.l}Z`;
  let chemin = '';
  let k = parts.findIndex((p, i) => p && !parts[(i - 1 + n) % n]);
  if (k < 0) return '';
  for (let vus = 0; vus < n; vus++, k = (k + 1) % n) {
    if (!parts[k] || parts[(k - 1 + n) % n]) continue;
    let fin = k;
    while (parts[(fin + 1) % n] && (fin + 1) % n !== k) fin = (fin + 1) % n;
    const de = k / n, longueur = (((fin + 1) / n - de) % 1 + 1) % 1 || 1;
    const etapes = [de, ...coins.map((c) => (c < de ? c + 1 : c)).filter((c) => c > de && c < de + longueur), de + longueur];
    chemin += etapes.map((t, i) => `${i ? 'L' : 'M'}${pointDuTour(r, t).map((v) => v.toFixed(1)).join(' ')}`).join('');
  }
  return chemin;
}
