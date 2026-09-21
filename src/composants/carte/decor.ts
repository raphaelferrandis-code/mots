// Le décor d'un timbre. Aucune carte n'est illustrée à la main : tout est calculé à partir du mot lui-même,
// si bien que chaque carte est unique et que la même carte est toujours identique.

import type { Rarete } from '../../partage/types.ts';

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

// Deux encres par faction : la première imprime le timbre, la seconde sert aux impressions à deux couleurs.
export const ENCRES_DES_FACTIONS: Record<string, [string, string]> = {
  'Latin': ['#b3261e', '#f2b705'],
  'Grec': ['#1b3fa0', '#f4f1e8'],
  'Anglais': ['#14213d', '#d62839'],
  'Italien': ['#1d7a46', '#c8102e'],
  'Espagnol et portugais': ['#d9480f', '#f2b705'],
  'Allemand et néerlandais': ['#1a1a1a', '#f2b705'],
  'Francique': ['#6b3f1d', '#e08e36'],
  'Gaulois': ['#1f5c3a', '#b08d57'],
  'Occitan': ['#a3131a', '#f0c419'],
  'Arabe': ['#0f7b5f', '#e9d8a6'],
  'Onomatopée': ['#d6246e', '#22b8cf'],
  'Vieux français': ['#23408e', '#d4af37'],
  "Langues d'ailleurs": ['#6a2c91', '#1aa6a6'],
};
export const encresDe = (faction: string): [string, string] => ENCRES_DES_FACTIONS[faction] ?? ['#444444', '#bbbbbb'];

// Rosace de guillochis : plusieurs courbes fermées légèrement décalées, comme sur les billets de banque
// et les timbres gravés. Le mot décide du nombre de lobes et de leur amplitude : chaque carte a la sienne.
export function rosaceDeGuillochis(idCarte: string, courbes: number): string[] {
  const hasard = hasardDe(idCarte);
  const k1 = entier(hasard, 5, 11);
  const k2 = entier(hasard, 3, 9) * 2 + 1;
  const a = entre(hasard, 5, 9);
  const b = entre(hasard, 2, 5);
  const chemins: string[] = [];
  for (let j = 0; j < courbes; j++) {
    const phase = (j / courbes) * Math.PI * 2;
    let d = '';
    // Moins de points qu'il n'y paraît nécessaire : à la taille d'une carte, la courbe reste parfaitement lisse.
    for (let i = 0; i <= 180; i++) {
      const t = (i / 180) * Math.PI * 2;
      const r = 17 + a * Math.sin(k1 * t + phase) + b * Math.cos(k2 * t - phase);
      d += `${i === 0 ? 'M' : 'L'}${(30 + r * Math.cos(t)).toFixed(1)} ${(30 + r * Math.sin(t)).toFixed(1)}`;
    }
    chemins.push(`${d}Z`);
  }
  return chemins;
}

// L'année à écrire sur le cachet, d'après la date de première apparition du mot (« 1786 », « XIIᵉ siècle », « c. 1100 »…).
export function anneeDuCachet(attestation: string | undefined): string {
  if (!attestation) return '····';
  return attestation.match(/\d{3,4}/)?.[0] ?? attestation.match(/[IVX]+ᵉ/)?.[0]?.concat(' s.') ?? '····';
}
