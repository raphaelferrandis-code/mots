// Les pages par mot (philamots.fr/mot/<adresse>/) : une page lisible sans jouer, que Google peut trouver.
// L'adresse de chaque page se calcule ici, pour le site construit comme pour le jeu (lien depuis la fiche d'un timbre,
// partage) : les deux tombent toujours d'accord.

import type { CarteIndex, Definition, Nature } from './types.ts';

// Les textes complets, lus dans le Wiktionnaire par pipeline/pages.ts (data/pages-des-mots.json).
export type TexteDUnePage = {
  definitions: Pick<Definition, 'texte' | 'registre'>[];
  etymologies: string[];
  sens: number; // nombre de sens au Wiktionnaire (la page n'en montre qu'une partie quand il y en a beaucoup)
};
export type TextesDesPages = { version: string; mots: Record<string, TexteDUnePage> };

const NATURE_DANS_L_ADRESSE: Record<Nature, string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adjectif', Adverbe: 'adverbe' };

// « Pêcher » → « pecher », « cœur » → « coeur », « aujourd’hui » → « aujourd-hui » : des adresses qui se tapent et se
// partagent sans caractère encodé.
export function adresseDuMot(mot: string): string {
  return mot.toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Deux cartes de même adresse (« beau » adjectif et nom, « chique » et « chiqué ») : chacune prend sa nature, puis,
// s'il le faut encore, un numéro dans l'ordre de l'édition.
export function adressesDesPages(cartes: Pick<CarteIndex, 'id' | 'mot' | 'type'>[]): Map<string, string> {
  const parAdresse = new Map<string, Pick<CarteIndex, 'id' | 'mot' | 'type'>[]>();
  for (const carte of cartes) {
    const adresse = adresseDuMot(carte.mot);
    parAdresse.set(adresse, [...(parAdresse.get(adresse) ?? []), carte]);
  }
  const adresses = new Map<string, string>();
  const prises = new Set<string>();
  for (const [adresse, groupe] of parAdresse) {
    for (const carte of groupe) {
      let choisie = groupe.length === 1 ? adresse : `${adresse}-${NATURE_DANS_L_ADRESSE[carte.type]}`;
      for (let n = 2; prises.has(choisie); n++) choisie = `${adresse}-${NATURE_DANS_L_ADRESSE[carte.type]}-${n}`;
      prises.add(choisie);
      adresses.set(carte.id, choisie);
    }
  }
  return adresses;
}

// Le chemin d'une page, depuis la racine du site : « mot/zakouski/ ».
export const cheminDeLaPage = (adresse: string): string => `mot/${adresse}/`;
