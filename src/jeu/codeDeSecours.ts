// Le code de secours (décision n° 36) : vingt caractères que le joueur note, et qui lui rendent sa collection sur un
// autre appareil. Le serveur n'en garde que l'empreinte. Règles pures : le hasard est fourni par l'appelant.

import type { Hasard } from './hasard.ts';

// Ni I, ni L, ni O, ni 0, ni 1 : rien qui se confonde à la lecture. 31 signes × 20 = près de 100 bits.
export const ALPHABET_DU_CODE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const LONGUEUR_DU_CODE = 20;
const PREFIXE = 'MOTS';

export function fabriquerUnCode(hasard: Hasard): string {
  let code = '';
  for (let i = 0; i < LONGUEUR_DU_CODE; i++) code += ALPHABET_DU_CODE[Math.floor(hasard() * ALPHABET_DU_CODE.length)];
  return code;
}

// « MOTS-ABCDE-FGHJK-MNPQR-STUVW » : le préfixe dit de quoi il s'agit, les tirets aident à recopier.
export function afficherUnCode(code: string): string {
  return [PREFIXE, ...(code.match(/.{1,5}/g) ?? [])].join('-');
}

// Ce que le joueur a tapé, ramené au code lui-même : majuscules, sans tirets ni espaces, sans le préfixe.
export function normaliserUnCode(saisie: string): string {
  const propre = saisie.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return propre.startsWith(PREFIXE) && propre.length === PREFIXE.length + LONGUEUR_DU_CODE ? propre.slice(PREFIXE.length) : propre;
}

export const estUnCodeValable = (code: string): boolean => code.length === LONGUEUR_DU_CODE && [...code].every((c) => ALPHABET_DU_CODE.includes(c));
