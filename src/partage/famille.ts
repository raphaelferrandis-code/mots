// Reconnaître un mot, ou un mot de la même famille, dans un texte. Sert deux fois :
// le pipeline écarte du duel les définitions qui donnent la réponse (« datable : que l'on peut dater »),
// et le jeu masque le mot quand il doit malgré tout poser une telle définition.

import { sansAccents } from './lettres.ts';

const SUFFIXES = ['issement', 'ellement', 'ement', 'ation', 'ition', 'able', 'ible', 'ment', 'tion', 'ique', 'isme', 'iste', 'euse', 'eur', 'ite', 'age', 'ance', 'ence', 'ant', 'er', 'ir', 'ee', 'e'];

// Les débuts de mot qui trahissent le mot : le mot sans ses dernières lettres, et le mot sans son suffixe
// (« datable » → « dat »). Un mot très court ne se reconnaît qu'en entier.
function racinesDe(cible: string): { racines: string[]; entier: boolean } {
  if (cible.length <= 4) return { racines: [cible], entier: true };
  const racines = [cible.slice(0, Math.max(4, cible.length - 3))];
  const suffixe = SUFFIXES.find((s) => cible.endsWith(s) && cible.length - s.length >= 3);
  if (suffixe) racines.push(cible.slice(0, cible.length - suffixe.length));
  return { racines, entier: false };
}

export function contientLeMot(definition: string, mot: string): boolean {
  const texte = sansAccents(definition);
  const { racines, entier } = racinesDe(sansAccents(mot).replace(/-/g, ' '));
  return racines.some((racine) => new RegExp(`(^|[^a-z])${racine}${entier ? '([^a-z]|$)' : ''}`).test(texte));
}

// Contrôle plus sévère, propre au duel : la définition nomme-t-elle un proche parent du mot ?
// (« cabalistique : qui a rapport à la cabale », « carnavalesque : relatif au carnaval ».) Deux mots sont parents
// s'ils commencent par les mêmes lettres : au moins cinq, et la plus grande partie du plus court des deux.
// ⚠️ Le pipeline n'applique pas encore ce contrôle : le jeu s'en sert pour préférer, quand un mot a plusieurs
// définitions, celle qui ne donne pas la réponse.
export function trahitLeMot(definition: string, mot: string): boolean {
  if (contientLeMot(definition, mot)) return true;
  const cible = sansAccents(mot);
  return sansAccents(definition).split(/[^a-z]+/).some((ecrit) => {
    let commun = 0;
    while (commun < ecrit.length && commun < cible.length && ecrit[commun] === cible[commun]) commun++;
    return commun >= 5 && commun / Math.min(ecrit.length, cible.length) >= 0.6;
  });
}

// Remplace dans la définition le mot et ceux de sa famille par « ⋯ », sans toucher au reste.
// Un mot composé est masqué morceau par morceau (« porte-monnaie » : « porte » et « monnaie »).
export function masquerLeMot(definition: string, mot: string): string {
  const parties = sansAccents(mot).split(/[^a-z]+/).filter(Boolean);
  // Dans un mot composé, les petits mots de liaison (« de », « à ») ne sont pas masqués.
  const morceaux = (parties.length > 1 ? parties.filter((m) => m.length >= 3) : parties).map(racinesDe);
  return definition.replace(/[\p{L}]+/gu, (ecrit) => {
    const simple = sansAccents(ecrit);
    return morceaux.some(({ racines, entier }) => racines.some((racine) => (entier ? simple === racine : simple.startsWith(racine)))) ? '⋯' : ecrit;
  });
}
