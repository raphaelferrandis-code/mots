// Outils de classement : rangs, notes de 1 à 10, et départage reproductible des ex æquo.

import { createHash } from 'node:crypto';

// Empreinte d'un texte. Sert à départager les ex æquo d'une façon qui ne change jamais d'une
// génération à l'autre et qui ne dépend pas de l'ordre alphabétique.
export function empreinte(texte: string): string {
  return createHash('md5').update(texte).digest('hex');
}

// Rang de chaque valeur, ramené entre 0 (la plus petite) et 1 (la plus grande).
// Les ex æquo reçoivent tous le même rang : le milieu de leur groupe.
export function rangs(valeurs: number[]): number[] {
  const ordre = valeurs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const resultat = new Array<number>(valeurs.length);
  const dernier = Math.max(1, valeurs.length - 1);
  let i = 0;
  while (i < ordre.length) {
    let j = i;
    while (j + 1 < ordre.length && ordre[j + 1][0] === ordre[i][0]) j++;
    const rang = (i + j) / 2 / dernier;
    for (let k = i; k <= j; k++) resultat[ordre[k][1]] = rang;
    i = j + 1;
  }
  return resultat;
}

// Transforme des valeurs quelconques en notes de 1 à 10 selon leur rang dans l'ensemble :
// les 10 % les plus faibles ont 1, les 10 % les plus fortes ont 10.
export function notesSurDix(valeurs: number[]): number[] {
  return rangs(valeurs).map((r) => Math.min(10, 1 + Math.floor(r * 10)));
}

// Hasard reproductible : les mêmes exemples sortent à chaque exécution.
export function creerHasard(graine: number): () => number {
  return () => {
    graine = (graine + 0x6d2b79f5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function echantillon<T>(liste: T[], n: number, hasard: () => number): T[] {
  const copie = [...liste];
  const taille = Math.min(n, copie.length);
  for (let i = 0; i < taille; i++) {
    const j = i + Math.floor(hasard() * (copie.length - i));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie.slice(0, taille);
}

// Répartit un total entier selon des parts, sans jamais perdre ni créer d'unité
// (méthode du plus fort reste).
export function repartirEntiers(total: number, parts: number[]): number[] {
  const somme = parts.reduce((a, b) => a + b, 0);
  if (somme === 0) return parts.map(() => 0);
  const exacts = parts.map((p) => (p / somme) * total);
  const entiers = exacts.map(Math.floor);
  let reste = total - entiers.reduce((a, b) => a + b, 0);
  const parReste = exacts.map((e, i) => [e - entiers[i], i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; reste > 0; k++, reste--) entiers[parReste[k % parReste.length][1]]++;
  return entiers;
}
