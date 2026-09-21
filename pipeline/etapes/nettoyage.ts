// Nettoyage des textes du Wiktionnaire et préparation des définitions d'une carte.

import type { Definition, Registre } from '../../src/partage/types.ts';
import { sansAccents } from '../../src/partage/lettres.ts';

// Retire les résidus de mise en forme laissés par l'extraction.
export function nettoyerTexte(texte: string): string {
  return texte
    .replace(/\s*\^\(\[[^\]]*\]\)/g, '') // appels de note : « ^([1]) »
    .replace(/\^\(([^)]*)\)/g, '$1') // exposants : « XVII^(ème) » → « XVIIème »
    .replace(/^ou\s+(?=[(\p{Lu}])/u, '') // résidu en tête : « ou Donner corps à… », « ou (En parlant des personnes.) … »
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;])/g, '$1')
    .trim();
}

// Une définition qui ne fait que renvoyer à un autre mot n'apprend rien : « Pluriel de cheval. »
// Le renvoi doit viser un seul mot : « Variante de la belote » est une vraie définition.
// Entre les deux, seuls des mots de grammaire sont admis : « Variante du jeu de dames » aussi est une vraie définition.
const RENVOI = /^(?:pluriel|féminin|masculin|singulier|variante|autre orthographe|ancienne orthographe|orthographe|graphie|participe (?:passé|présent)|(?:première|deuxième|troisième) personne)(?: (?:orthographique|ancienne|alternative|masculin|féminin|singulier|pluriel|populaire|familière|régionale|vieillie|rare|archaïque))* d(?:e |u |es |’|')(?:l’|l')?[^\s.,;:]+\s*\.?$/i;

// « Autre orthographe, plus ancienne, de lansquiner. »
const RENVOI_ORTHOGRAPHIQUE = /^(?:autre|ancienne|variante)\s+(?:orthographe|orthographique|graphie|forme)\b[^.]{0,40}\bd(?:e |u |’|')(?:l’|l')?[^\s.,;:]+\s*\.?$/i;

export function estRenvoi(definition: string): boolean {
  return RENVOI.test(definition) || RENVOI_ORTHOGRAPHIQUE.test(definition);
}

// Coupe proprement un texte trop long, à la fin d'un mot.
export function couper(texte: string, longueurMaximale: number): string {
  if (texte.length <= longueurMaximale) return texte;
  const coupe = texte.slice(0, longueurMaximale - 1);
  const dernierEspace = coupe.lastIndexOf(' ');
  return `${coupe.slice(0, dernierEspace > longueurMaximale * 0.6 ? dernierEspace : coupe.length).replace(/[,;:\s]+$/, '')}…`;
}

// La définition contient-elle le mot lui-même, ou un mot de la même famille ?
// (« datable : que l'on peut dater » donnerait la réponse en duel.)
const SUFFIXES = ['issement', 'ellement', 'ement', 'ation', 'ition', 'able', 'ible', 'ment', 'tion', 'ique', 'isme', 'iste', 'euse', 'eur', 'ite', 'age', 'ance', 'ence', 'ant', 'er', 'ir', 'ee', 'e'];

export function contientLeMot(definition: string, mot: string): boolean {
  const texte = sansAccents(definition);
  const cible = sansAccents(mot).replace(/-/g, ' ');
  if (cible.length <= 4) return new RegExp(`(^|[^a-z])${cible}([^a-z]|$)`).test(texte);

  // Deux racines possibles : le mot sans ses dernières lettres, et le mot sans son suffixe (« datable » → « dat »).
  const racines = [cible.slice(0, Math.max(4, cible.length - 3))];
  const suffixe = SUFFIXES.find((s) => cible.endsWith(s) && cible.length - s.length >= 3);
  if (suffixe) racines.push(cible.slice(0, cible.length - suffixe.length));
  return racines.some((racine) => new RegExp(`(^|[^a-z])${racine}`).test(texte));
}

export type SensPropre = { definition: string; registre: Registre[] };

export function construireDefinitions(
  mot: string,
  sens: SensPropre[],
  reglages: { maximumParCarte: number; longueurMaximale: number; longueurMinimalePourLeDuel: number },
): Definition[] {
  return sens.slice(0, reglages.maximumParCarte).map((s) => {
    const definition: Definition = {
      texte: couper(s.definition, reglages.longueurMaximale),
      quiz: s.definition.length >= reglages.longueurMinimalePourLeDuel && !contientLeMot(s.definition, mot),
    };
    if (s.registre.length) definition.registre = s.registre;
    return definition;
  });
}
