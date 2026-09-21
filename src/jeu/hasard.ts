// Le hasard du jeu. Toutes les règles reçoivent leur source de hasard en paramètre : le vrai hasard
// dans le jeu, un hasard reproductible (toujours la même suite) dans les tests et les simulateurs.

export type Hasard = () => number; // un nombre entre 0 (inclus) et 1 (exclu)

export function hasardReproductible(graine: number): Hasard {
  return () => {
    graine = (graine + 0x6d2b79f5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hasardDuSysteme: Hasard = () => {
  const tirage = new Uint32Array(1);
  crypto.getRandomValues(tirage);
  return tirage[0] / 4294967296;
};

export function choisir<T>(liste: readonly T[], hasard: Hasard): T {
  return liste[Math.floor(hasard() * liste.length)];
}
