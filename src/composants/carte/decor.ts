// Le décor d'un timbre. Aucune carte n'est illustrée à la main : tout est calculé à partir du mot lui-même,
// si bien que chaque carte est unique et que la même carte est toujours identique.

import type { Nature, Rarete } from '../../partage/types.ts';

// Hasard reproductible, déterminé par l'identifiant de la carte.
export function hasardDe(texte: string): () => number {
  let graine = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    graine ^= texte.charCodeAt(i);
    graine = Math.imul(graine, 0x01000193);
  }
  return () => {
    graine = (graine + 0x6d2b79f5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const entre = (hasard: () => number, min: number, max: number): number => min + hasard() * (max - min);
export const entier = (hasard: () => number, min: number, max: number): number => Math.floor(entre(hasard, min, max + 1));

// Qualité d'impression du timbre : de 1 (une seule encre) à 6 (papier noir, impression irisée).
export const NIVEAU: Record<Rarete, number> = { 'Commune': 1, 'Peu commune': 2, 'Rare': 3, 'Épique': 4, 'Légendaire': 5, 'Hors-série': 6 };

// Nom court de la faction, pour le centre du cachet.
export const NOM_COURT: Record<string, string> = {
  'Latin': 'LATIN', 'Grec': 'GREC', 'Anglais': 'ANGLAIS', 'Italien': 'ITALIEN',
  'Espagnol et portugais': 'IBÉRIQUE', 'Allemand et néerlandais': 'GERMANIQUE', 'Francique': 'FRANCIQUE',
  'Gaulois': 'GAULOIS', 'Occitan': 'OCCITAN', 'Arabe': 'ARABE', 'Onomatopée': 'BRUIT',
  'Vieux français': 'VIEUX FR.', "Langues d'ailleurs": 'AILLEURS',
};

// Une famille d'encre par nature : bleu, vermillon, vert et violet.
// La seconde encre reste dans la même famille ; la claire se lit sur le papier noir des Hors-série.
export const ENCRES_DES_NATURES: Record<Nature, [string, string, string]> = {
  Nom: ['#234b83', '#7298bf', '#abcdf3'],
  Verbe: ['#a33128', '#d17c59', '#f3b3a0'],
  Adjectif: ['#286044', '#77a184', '#addebc'],
  Adverbe: ['#703d88', '#ac82bd', '#d9b9ee'],
};
export const encresDe = (nature: Nature): [string, string, string] => ENCRES_DES_NATURES[nature];

// ── Le motif gravé au centre du timbre ──────────────────────────────────────
// Chaque mot a le sien, calculé à partir de son identifiant : toujours le même pour le même mot,
// différent d'un mot à l'autre. Quatre familles de courbes (celles des billets de banque et du
// spirographe), et dans chaque famille des dizaines de réglages : lobes, boucles, amplitude, rotation.

const CENTRE = 30;
const RAYON = 25;

function tracer(points: number, tours: number, position: (t: number) => [number, number]): string {
  let d = '';
  for (let i = 0; i <= points; i++) {
    const [x, y] = position((i / points) * Math.PI * 2 * tours);
    d += `${i === 0 ? 'M' : 'L'}${(CENTRE + x).toFixed(1)} ${(CENTRE + y).toFixed(1)}`;
  }
  return `${d}Z`;
}

// Fractions irréductibles p/q : la courbe se referme après p tours et dessine q boucles.
const FRACTIONS: [number, number][] = [[1, 3], [1, 4], [2, 5], [1, 5], [3, 7], [2, 7], [3, 8], [1, 6], [4, 9], [2, 9], [3, 10], [5, 12]];

export function motifDuTimbre(idCarte: string, couches: number): string[] {
  const hasard = hasardDe(idCarte);
  const famille = entier(hasard, 0, 3);
  const rotation = entre(hasard, 0, Math.PI * 2);
  const tourne = ([x, y]: [number, number]): [number, number] => [x * Math.cos(rotation) - y * Math.sin(rotation), x * Math.sin(rotation) + y * Math.cos(rotation)];
  const chemins: string[] = [];

  if (famille === 0) {
    // Guillochis : un cercle dont le rayon ondule, redessiné plusieurs fois avec un léger décalage.
    const k1 = entier(hasard, 5, 13);
    const k2 = entier(hasard, 2, 9) * 2 + 1;
    const a = entre(hasard, 4, 8);
    const b = entre(hasard, 1.5, 4.5);
    for (let j = 0; j < couches + 2; j++) {
      const phase = (j / (couches + 2)) * Math.PI * 2;
      chemins.push(tracer(180, 1, (t) => { const r = 16.5 + a * Math.sin(k1 * t + phase) + b * Math.cos(k2 * t - phase); return tourne([r * Math.cos(t), r * Math.sin(t)]); }));
    }
  } else if (famille === 1 || famille === 2) {
    // Spirographe : un petit cercle roule dans un grand (famille 1) ou autour de lui (famille 2).
    const [p, q] = FRACTIONS[entier(hasard, 0, FRACTIONS.length - 1)];
    const r = p / q;
    const signe = famille === 1 ? -1 : 1;
    for (let j = 0; j < couches; j++) {
      const d = r * entre(hasard, 0.55, 1.35) * (1 - j * 0.12);
      const taille = RAYON / (1 + signe * r + d) * (1 - j * 0.06);
      chemins.push(tracer(Math.min(600, 120 * p + 120), p, (t) => tourne([taille * ((1 + signe * r) * Math.cos(t) - signe * d * Math.cos(((1 + signe * r) / r) * t)), taille * ((1 + signe * r) * Math.sin(t) - d * Math.sin(((1 + signe * r) / r) * t))])));
    }
  } else {
    // Rosace à pétales : plusieurs fleurs emboîtées, de plus en plus petites.
    const [p, q] = FRACTIONS[entier(hasard, 0, FRACTIONS.length - 1)];
    const k = q / p;
    const creux = entre(hasard, 0.15, 0.5);
    for (let j = 0; j < couches + 1; j++) {
      const taille = RAYON * (1 - j * (0.62 / (couches + 1)));
      const decalage = j * entre(hasard, 0.05, 0.22);
      chemins.push(tracer(Math.min(600, 150 * p + 90), p, (t) => { const rr = taille * (creux + (1 - creux) * Math.abs(Math.cos(k * t / 2 + decalage))); return tourne([rr * Math.cos(t), rr * Math.sin(t)]); }));
    }
  }
  return chemins;
}

// L'année à écrire sur le cachet, d'après la date de première apparition du mot (« 1786 », « XIIᵉ siècle », « c. 1100 »…).
export function anneeDuCachet(attestation: string | undefined): string {
  if (!attestation) return '····';
  return attestation.match(/\d{3,4}/)?.[0] ?? attestation.match(/[IVX]+ᵉ/)?.[0]?.concat(' s.') ?? '····';
}
