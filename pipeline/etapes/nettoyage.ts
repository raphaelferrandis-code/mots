// Nettoyage des textes du Wiktionnaire et préparation des définitions d'une carte.

import type { Definition, Registre } from '../../src/partage/types.ts';
import { contientLeMot } from '../../src/partage/famille.ts';

// Retire les résidus de mise en forme laissés par l'extraction.
export function nettoyerTexte(texte: string): string {
  return sansNotesDeCouleur(sansCodesDeCouleur(texte))
    .replace(/\s*\^\(\[[^\]]*\]\)/g, '') // appels de note : « ^([1]) »
    .replace(/\^\(([^)]*)\)/g, '$1') // exposants : « XVII^(ème) » → « XVIIème »
    .replace(/^ou\s+(?=[(\p{Lu}])/u, '') // résidu en tête : « ou Donner corps à… », « ou (En parlant des personnes.) … »
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;])/g, '$1')
    .trim();
}

// Le modèle {{couleur}} du Wiktionnaire laisse son code dans le texte : « De la couleur du ciel… dégagé. #0000FF »,
// jusqu'en duel, sur les pages des mots et dans les devinettes (audit de finition du 26/09/2026). Après un point, la
// phrase qui suit reprend sa majuscule : « le teint brun. #8B6C42, de couleur brune » → « le teint brun. De couleur brune ».
export function sansCodesDeCouleur(texte: string): string {
  return texte.replace(/\s*(?:#[0-9A-Fa-f]{6}\b[\s,]*)+(\p{L}?)/gu, (_code: string, lettre: string, position: number, tout: string) => {
    if (!lettre) return '';
    const apresUnPoint = /[.!?…]\s*$/.test(tout.slice(0, position));
    return ` ${apresUnPoint ? lettre.toUpperCase() : lettre}`;
  });
}

// Le renvoi du Wiktionnaire à sa note de bas de page sur l'accord des couleurs n'a pas de sens hors de la page.
const NOTE_DES_COULEURS = /\s*Voir la note sur les accords grammaticaux des noms de couleurs[^.]*\./g;
const sansNotesDeCouleur = (texte: string): string => texte.replace(NOTE_DES_COULEURS, '');

// Une définition qui ne fait que renvoyer à un autre mot n'apprend rien : « Pluriel de cheval. »
// Le renvoi doit viser un seul mot : « Variante de la belote » est une vraie définition.
// Entre les deux, seuls des mots de grammaire sont admis : « Variante du jeu de dames » aussi est une vraie définition.
const RENVOI = /^(?:pluriel|féminin|masculin|singulier|variante|autre orthographe|ancienne orthographe|orthographe|graphie|participe (?:passé|présent)|(?:première|deuxième|troisième) personne)(?: (?:orthographique|ancienne|alternative|masculin|féminin|singulier|pluriel|populaire|familière|régionale|vieillie|rare|archaïque))* d(?:e |u |es |’|')(?:l’|l')?[^\s.,;:]+\s*\.?$/i;

// « Autre orthographe, plus ancienne, de lansquiner. »
const RENVOI_ORTHOGRAPHIQUE = /^(?:autre|ancienne|variante)\s+(?:orthographe|orthographique|graphie|forme)\b[^.]{0,40}\bd(?:e |u |’|')(?:l’|l')?[^\s.,;:]+\s*\.?$/i;

export function estRenvoi(definition: string): boolean {
  return RENVOI.test(definition) || RENVOI_ORTHOGRAPHIQUE.test(definition);
}

// Un sens que personne n'a encore rédigé porte un texte d'attente du Wiktionnaire : « Définition manquante ou à
// compléter. (Ajouter) », parfois après un début de phrase (« En ski, Définition manquante… »), ou « Exemple
// d'utilisation manquant. (Ajouter) » à la place de la définition. En duel, ce serait une réponse vide.
const DEFINITION_VIDE = /définition manquante|définition à compléter|sens à compléter|exemple d[’']utilisation manquant|manquante ou incomplète/i;

export function estUneDefinitionVide(definition: string): boolean {
  return DEFINITION_VIDE.test(definition);
}

// Une note du Wiktionnaire (référence d'un livre) reste parfois collée au texte : « …apprécier »)Michiel de Vaan,
// Dictionary…, 2008, 825 pages, ISBN 978-90-04-16797-1, qui donne aussi… ». On la retire.
export function sansReferences(texte: string): string {
  return texte.replace(/(?<=[)»\]])\p{Lu}[^]*?ISBN [\dXx-]+,?\s*/gu, ' ').replace(/\s+([,.;])/g, '$1').replace(/\s+/g, ' ').trim();
}

// Coupe proprement un texte trop long, à la fin d'un mot.
export function couper(texte: string, longueurMaximale: number): string {
  if (texte.length <= longueurMaximale) return texte;
  const coupe = texte.slice(0, longueurMaximale - 1);
  const dernierEspace = coupe.lastIndexOf(' ');
  return `${coupe.slice(0, dernierEspace > longueurMaximale * 0.6 ? dernierEspace : coupe.length).replace(/[,;:\s]+$/, '')}…`;
}

// La définition contient-elle le mot lui-même, ou un mot de la même famille ? (« datable : que l'on peut dater »
// donnerait la réponse en duel.) La règle est partagée avec le jeu : elle vit dans src/partage/famille.ts.
export { contientLeMot };

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
