// Valeur des lettres d'un mot : la base de la statistique d'attaque.

const VALEURS: Record<string, number> = {
  a: 1, e: 1, i: 1, l: 1, n: 1, o: 1, r: 1, s: 1, t: 1, u: 1,
  d: 2, g: 2, m: 2,
  b: 3, c: 3, p: 3,
  f: 4, h: 4, v: 4,
  j: 8, q: 8,
  k: 10, w: 10, x: 10, y: 10, z: 10,
};

// Minuscules, sans accents ni cédille, ligatures développées (« œ » → « oe »).
export function sansAccents(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Somme des valeurs des lettres ; les traits d'union et autres signes ne comptent pas.
export function valeurDesLettres(mot: string): number {
  let total = 0;
  for (const lettre of sansAccents(mot)) total += VALEURS[lettre] ?? 0;
  return total;
}
