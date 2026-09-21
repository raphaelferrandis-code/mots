// L'épreuve de maîtrise : avant d'attaquer, le joueur doit retrouver la définition de son mot parmi quatre.
// Fonctions pures : les définitions et le hasard sont fournis par l'appelant.

import { contientLeMot, masquerLeMot, trahitLeMot } from '../partage/famille.ts';
import { sansAccents } from '../partage/lettres.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex, Definition, Registre } from '../partage/types.ts';
import { melanger } from './duel.ts';
import type { Hasard } from './hasard.ts';

export const NOMBRE_DE_PROPOSITIONS = 4;

export type Epreuve = {
  idCarte: string;
  mot: string;
  propositions: string[];
  bonne: number; // position de la bonne définition dans « propositions »
};

// Les définitions de toutes les cartes, par identifiant de carte.
export type Definitions = ReadonlyMap<string, readonly Definition[]>;

const estVisible = (definition: Definition, masques: readonly Registre[]): boolean => !definition.registre?.some((r) => masques.includes(r));

// Les définitions d'une carte que l'on peut poser en duel : celles que le pipeline a jugées utilisables
// (assez longues, et qui ne contiennent pas le mot), en laissant de côté les sens que le joueur a choisi de masquer.
// Parmi elles, on préfère celles qui ne nomment même pas un proche parent du mot (« cabale » pour « cabalistique »).
function definitionsDeDuel(mot: string, definitions: readonly Definition[] | undefined, masques: readonly Registre[]): string[] {
  const utilisables = (definitions ?? []).filter((d) => d.quiz);
  const visibles = utilisables.filter((d) => estVisible(d, masques));
  // Certaines définitions du Wiktionnaire se terminent par un renvoi (« → voir solécisme ») : il n'apprend rien,
  // et ferait reconnaître la définition à sa seule forme.
  const textes = (visibles.length > 0 ? visibles : utilisables).map((d) => d.texte.replace(/\s*→\s*voir\b.*$/i, '').trim());
  // Un simple renvoi (« Synonyme de sériole couronnée. ») ne définit rien : on l'évite tant que le mot a autre chose.
  const vraies = textes.filter((texte) => !/^(?:synonyme|antonyme) d/i.test(texte));
  const discretes = (vraies.length > 0 ? vraies : textes).filter((texte) => !trahitLeMot(texte, mot));
  return discretes.length > 0 ? discretes : vraies.length > 0 ? vraies : textes;
}

// Les mots qui portent le sens d'une définition (les petits mots de grammaire ne comptent pas).
const motsImportants = (texte: string): Set<string> => new Set(sansAccents(texte).split(/[^a-z]+/).filter((m) => m.length >= 5));

// Deux définitions qui se ressemblent trop rendraient la question injuste : ce sont souvent deux synonymes.
function seRessemblent(a: string, b: string): boolean {
  const [petit, grand] = [motsImportants(a), motsImportants(b)].sort((x, y) => x.size - y.size);
  if (petit.size === 0) return false;
  const communs = [...petit].filter((m) => grand.has(m)).length;
  return communs >= 2 && communs / petit.size >= 0.5;
}

export function composerLEpreuve(carte: CarteIndex, definitions: Definitions, edition: readonly CarteIndex[], masques: readonly Registre[], hasard: Hasard): Epreuve {
  // La bonne définition : une de celles du mot, tirée au sort, pour que la question change d'une fois sur l'autre.
  // Les rares cartes sans définition utilisable sont posées quand même, avec le mot masqué dans le texte.
  const possibles = definitionsDeDuel(carte.mot, definitions.get(carte.id), masques);
  const bonne = possibles.length > 0 ? possibles[Math.floor(hasard() * possibles.length)] : masquerLeMot(definitions.get(carte.id)?.[0]?.texte ?? carte.definition, carte.mot);

  // Les leurres : des mots de même nature et de rareté voisine, en élargissant la recherche s'il en manque.
  const rang = RARETES.indexOf(carte.rarete);
  const leurres: string[] = [];
  for (const ecartMaximum of [1, RARETES.length]) {
    const candidates = melanger(edition.filter((c) => c.id !== carte.id && c.type === carte.type && Math.abs(RARETES.indexOf(c.rarete) - rang) <= ecartMaximum && !c.registre.some((r) => masques.includes(r))), hasard);
    for (const candidate of candidates) {
      if (leurres.length === NOMBRE_DE_PROPOSITIONS - 1) break;
      const textes = definitionsDeDuel(candidate.mot, definitions.get(candidate.id), masques);
      if (textes.length === 0) continue;
      const texte = textes[Math.floor(hasard() * textes.length)];
      // Un leurre ne doit ni nommer le mot demandé, ni être nommé par la bonne définition, ni lui ressembler.
      if (trahitLeMot(texte, carte.mot) || contientLeMot(bonne, candidate.mot)) continue;
      if ([bonne, ...leurres].some((autre) => autre === texte || seRessemblent(autre, texte))) continue;
      leurres.push(texte);
    }
    if (leurres.length === NOMBRE_DE_PROPOSITIONS - 1) break;
  }

  const propositions = melanger([bonne, ...leurres], hasard);
  return { idCarte: carte.id, mot: carte.mot, propositions, bonne: propositions.indexOf(bonne) };
}
