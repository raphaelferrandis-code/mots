// Outils communs aux trois pistes de direction artistique.
// Aucune carte n'est illustrée à la main : tout le décor est calculé à partir du mot lui-même,
// si bien que chaque carte est unique et que la même carte est toujours identique.

import { sansAccents } from '../partage/lettres.ts';
import type { Nature, Rarete } from '../partage/types.ts';

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

export const NIVEAU: Record<Rarete, number> = { 'Commune': 1, 'Peu commune': 2, 'Rare': 3, 'Épique': 4, 'Légendaire': 5 };

export const ABREVIATION: Record<Nature, string> = { Nom: 'n.', Verbe: 'v.', Adjectif: 'adj.', Adverbe: 'adv.' };

const CHIFFRES_ROMAINS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const enChiffresRomains = (n: number): string => CHIFFRES_ROMAINS[n] ?? String(n);

// « du grec », « de l'arabe »… pour écrire l'origine comme dans un dictionnaire.
export const ORIGINE_EN_TOUTES_LETTRES: Record<string, string> = {
  'Latin': 'du latin',
  'Grec': 'du grec',
  'Anglais': 'de l’anglais',
  'Italien': 'de l’italien',
  'Espagnol et portugais': 'de l’espagnol ou du portugais',
  'Allemand et néerlandais': 'de l’allemand ou du néerlandais',
  'Francique': 'du francique',
  'Gaulois': 'du gaulois',
  'Occitan': 'de l’occitan',
  'Arabe': 'de l’arabe',
  'Onomatopée': 'onomatopée',
  'Vieux français': 'du vieux français',
  "Langues d'ailleurs": 'd’une langue d’ailleurs',
};

// Nom court de la faction, pour le centre d'un tampon.
export const NOM_COURT: Record<string, string> = {
  'Latin': 'LATIN', 'Grec': 'GREC', 'Anglais': 'ANGLAIS', 'Italien': 'ITALIEN',
  'Espagnol et portugais': 'IBÉRIQUE', 'Allemand et néerlandais': 'GERMANIQUE', 'Francique': 'FRANCIQUE',
  'Gaulois': 'GAULOIS', 'Occitan': 'OCCITAN', 'Arabe': 'ARABE', 'Onomatopée': 'BRUIT',
  'Vieux français': 'VIEUX FR.', "Langues d'ailleurs": 'AILLEURS',
};

// Deux couleurs par faction. La première sert de pigment principal, la seconde de contraste.
export const COULEURS_DES_FACTIONS: Record<string, [string, string]> = {
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
export const couleursDe = (faction: string): [string, string] => COULEURS_DES_FACTIONS[faction] ?? ['#444444', '#bbbbbb'];

const VOYELLES = 'aeiouyàâäéèêëîïôöùûüœæ';
const estVoyelle = (lettre: string | undefined): boolean => lettre !== undefined && VOYELLES.includes(lettre.toLowerCase());
// Groupes de consonnes qui ne se séparent pas : « tru-chement », jamais « truc-hement ».
const INSEPARABLES = /^(?:ch|ph|th|gn|qu|gu|[bcdfgptv][rl])/i;

// Endroits où l'on peut couper un mot sans le défigurer : entre deux syllabes, à peu près.
function coupuresPossibles(mot: string): number[] {
  const coupures: number[] = [];
  for (let i = 2; i <= mot.length - 2; i++) {
    if (mot[i - 1] === '-') { coupures.push(i); continue; }
    if (estVoyelle(mot[i]) || mot[i] === '-') continue;
    const avantVoyelle = estVoyelle(mot[i - 1]);
    const suiteInseparable = INSEPARABLES.test(mot.slice(i, i + 2));
    const suivieDUneVoyelle = estVoyelle(mot[i + 1]) || (suiteInseparable && estVoyelle(mot[i + 2]));
    // voyelle | consonne + voyelle (« bille|vesée »), ou consonne | consonne + voyelle (« cas|quette »)
    if (suivieDUneVoyelle && (avantVoyelle || (!INSEPARABLES.test(mot.slice(i - 1, i + 1)) && estVoyelle(mot[i - 2])))) coupures.push(i);
  }
  return coupures;
}

// Coupe un mot en lignes de longueur voisine, entre deux syllabes, pour les compositions en très gros caractères.
export function enLignes(mot: string, longueurMaximale: number): string[] {
  if (mot.length <= longueurMaximale) return [mot];
  const nombre = Math.ceil(mot.length / longueurMaximale);
  const possibles = coupuresPossibles(mot);
  const coupures: number[] = [];
  for (let k = 1; k < nombre; k++) {
    const ideale = (mot.length * k) / nombre;
    const libres = possibles.filter((c) => c > (coupures.at(-1) ?? 0) + 1);
    coupures.push(libres.length ? libres.reduce((a, b) => (Math.abs(b - ideale) < Math.abs(a - ideale) ? b : a)) : Math.round(ideale));
  }
  const bornes = [0, ...coupures, mot.length];
  return bornes.slice(1).map((fin, i) => {
    const ligne = mot.slice(bornes[i], fin);
    return i < nombre - 1 && !ligne.endsWith('-') ? `${ligne}-` : ligne;
  });
}

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
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * Math.PI * 2;
      const r = 17 + a * Math.sin(k1 * t + phase) + b * Math.cos(k2 * t - phase);
      d += `${i === 0 ? 'M' : 'L'}${(30 + r * Math.cos(t)).toFixed(2)} ${(30 + r * Math.sin(t)).toFixed(2)}`;
    }
    chemins.push(`${d}Z`);
  }
  return chemins;
}

// L'année à écrire sur un cachet, d'après la date de première apparition du mot (« 1786 », « XIIᵉ siècle », « c. 1100 »…).
export function anneeDuCachet(attestation: string | undefined): string {
  if (!attestation) return '····';
  return attestation.match(/\d{3,4}/)?.[0] ?? attestation.match(/[IVX]+ᵉ/)?.[0]?.concat(' s.') ?? '····';
}

// Ligne « lisible par une machine », comme au bas d'un passeport : majuscules, sans accents, complétée par des « < ».
export function ligneMachine(morceaux: string[], longueur: number): string {
  const texte = morceaux.map((m) => sansAccents(m).toUpperCase().replace(/[^A-Z0-9]+/g, '<')).join('<<');
  return texte.padEnd(longueur, '<').slice(0, longueur);
}
