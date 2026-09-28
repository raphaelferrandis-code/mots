// Les dessins du timbre, repris de la maquette de la cérémonie (prototype-ceremonie.html) : dentelure, rosace
// guillochée et textures. Tout est calculé, rien n'est téléchargé. Même mot, même dessin, à chaque fois.

// Empreinte d'un texte (FNV-1a), puis hasard reproductible (xorshift) : les réglages de la rosace en dépendent.
export function empreinte(texte: string): number {
  let h = 2166136261 >>> 0;
  for (const lettre of texte) {
    h ^= lettre.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function hasardReproductible(graine: number): () => number {
  let s = (graine >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function pgcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

// Une rosace de spirographe (hypotrochoïde) : un cercle de rayon r roule dans un cercle de rayon R.
// « parBoucle » : points par boucle. 90 (et deux décimales) pour un grand dessin ; 48 (et une décimale) suffisent à la
// taille d'un timbre d'album, pour deux fois moins de données (audit de finition, P04 : l'album de 1 000 timbres pesait
// plus de 170 Mo, dont 30 de tracés). Comparé à l'œil le 28/09/2026 : à 24 ou 36, le cercle intérieur crénelait.
export function rosace(rayon: number, R: number, r: number, d: number, cx = 0, cy = 0, rotation = 0, parBoucle = 90): string {
  const boucles = r / pgcd(R, r);
  const pas = Math.min(parBoucle * 27, Math.max(parBoucle * 4, boucles * parBoucle));
  const decimales = parBoucle >= 60 ? 2 : 1;
  const T = Math.PI * 2 * boucles;
  const k = (R - r) / r;
  const echelle = rayon / ((R - r) + d);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let chemin = '';
  for (let i = 0; i <= pas; i++) {
    const t = (T * i) / pas;
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t);
    chemin += `${i ? 'L' : 'M'}${(cx + (x * cos - y * sin) * echelle).toFixed(decimales)} ${(cy + (x * sin + y * cos) * echelle).toFixed(decimales)}`;
  }
  return `${chemin}Z`;
}

// Le contour dentelé d'un timbre : des demi-cercles réguliers creusés sur les quatre bords.
export function dentelure(largeur: number, hauteur: number, rayon: number, pas: number): string {
  const nx = Math.round(largeur / pas);
  const ny = Math.round(hauteur / pas);
  const px = largeur / nx;
  const py = hauteur / ny;
  let d = 'M0 0';
  for (let i = 0; i < nx; i++) { const x = (i + 0.5) * px; d += `L${x - rayon} 0A${rayon} ${rayon} 0 0 0 ${x + rayon} 0`; }
  d += `L${largeur} 0`;
  for (let i = 0; i < ny; i++) { const y = (i + 0.5) * py; d += `L${largeur} ${y - rayon}A${rayon} ${rayon} 0 0 0 ${largeur} ${y + rayon}`; }
  d += `L${largeur} ${hauteur}`;
  for (let i = nx - 1; i >= 0; i--) { const x = (i + 0.5) * px; d += `L${x + rayon} ${hauteur}A${rayon} ${rayon} 0 0 0 ${x - rayon} ${hauteur}`; }
  d += `L0 ${hauteur}`;
  for (let i = ny - 1; i >= 0; i--) { const y = (i + 0.5) * py; d += `L0 ${y + rayon}A${rayon} ${rayon} 0 0 0 0 ${y - rayon}`; }
  return `${d}Z`;
}

// Les deux tracés de la vignette d'un timbre, gardés pour les 400 derniers timbres dessinés (l'album en affiche des
// centaines ; sans plafond, le souvenir de tous les tracés restait en mémoire). « fin » : pour un grand timbre (fiche,
// gros plan de la cérémonie, image de partage) ; sinon, la finesse d'un timbre d'album.
const vignettes = new Map<string, [string, string]>();
const PLAFOND_DES_TRACES = 400;
export function tracesDeLaVignette(idCarte: string, fin = false): [string, string] {
  const cle = fin ? `${idCarte}:fin` : idCarte;
  const deja = vignettes.get(cle);
  if (deja) { vignettes.delete(cle); vignettes.set(cle, deja); return deja; }
  const h = hasardReproductible(empreinte(idCarte) ^ 0x9e3779b9);
  const R = 60 + Math.floor(h() * 40), r = 11 + Math.floor(h() * 18), d = r * (0.7 + h() * 0.8);
  const R2 = 48 + Math.floor(h() * 30), r2 = 7 + Math.floor(h() * 14), d2 = r2 * (0.6 + h() * 0.9);
  const parBoucle = fin ? 90 : 48;
  const traces: [string, string] = [rosace(100, R, r, d, 0, 0, 0, parBoucle), rosace(70, R2, r2, d2, 0, 0, h() * 3, parBoucle)];
  vignettes.set(cle, traces);
  if (vignettes.size > PLAFOND_DES_TRACES) vignettes.delete(vignettes.keys().next().value!);
  return traces;
}

// Les textures partagées par tous les timbres, posées une fois sur la page en variables CSS :
// --perf (masque dentelé, ratio 30/38), --grain-papier (bruit du papier) et --filigrane (verso).
const enUrl = (svg: string): string => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
export const TEXTURES_DU_TIMBRE = {
  '--perf': enUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 380' preserveAspectRatio='none'><path d='${dentelure(300, 380, 7, 20)}'/></svg>`),
  '--grain-papier': enUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45 0 0 0 0 .38 0 0 0 0 .3 0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`),
  '--filigrane': enUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 46 46'><text x='10' y='20' font-family='Georgia,serif' font-style='italic' font-size='15' fill='rgba(150,110,60,.22)'>P</text><text x='32' y='41' font-family='Georgia,serif' font-style='italic' font-size='15' fill='rgba(150,110,60,.22)'>P</text></svg>`),
} as const;

let texturesPosees = false;
export function poserLesTextures(): void {
  if (texturesPosees || typeof document === 'undefined') return;
  texturesPosees = true;
  for (const [nom, valeur] of Object.entries(TEXTURES_DU_TIMBRE)) document.documentElement.style.setProperty(nom, valeur);
}

// Le cachet date du jour, en chiffres romains pour le mois, comme sur la maquette.
const MOIS_ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const jourDuCachet = (date: Date): string => `${date.getDate()}·${MOIS_ROMAINS[date.getMonth()]}`;

// Taille du mot imprimé : les mots longs rapetissent pour tenir sur une ligne.
export const tailleDuMot = (mot: string): number => Math.min(2.5, 24 / [...mot].length);
