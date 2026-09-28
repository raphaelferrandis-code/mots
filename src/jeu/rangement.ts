// Chercher, filtrer et trier des timbres : l'album et le panneau du deck partagent les mêmes règles.
// Fonctions pures : rien n'est lu ni écrit ici.

import { attaqueEnJeu, defenseEnJeu } from '../config/equilibrage.ts';
import { sansAccents } from '../partage/lettres.ts';
import { RARETES } from '../partage/types.ts';
import type { CarteIndex, Nature, Rarete } from '../partage/types.ts';

// L'ordre alphabétique français, par un seul comparateur (bien plus rapide que localeCompare à chaque comparaison :
// l'album des gros collectionneurs trie des milliers de timbres, audit de finition P04).
export const ordreFrancais: (a: string, b: string) => number = new Intl.Collator('fr').compare;

// Le mot sans accents ni majuscules, calculé une fois par mot : la recherche le relisait à chaque lettre tapée.
const motsSansAccents = new Map<string, string>();
const motSansAccents = (mot: string): string => {
  let s = motsSansAccents.get(mot);
  if (s === undefined) { s = sansAccents(mot); motsSansAccents.set(mot, s); }
  return s;
};

// Un critère vide ne filtre rien. La recherche ignore les accents et les majuscules.
export type Filtre = { recherche?: string; rarete?: Rarete | ''; nature?: Nature | ''; origine?: string };

export function correspond(filtre: Filtre): (carte: CarteIndex) => boolean {
  const cherche = sansAccents((filtre.recherche ?? '').trim());
  return (c) => (!filtre.rarete || c.rarete === filtre.rarete) && (!filtre.nature || c.type === filtre.nature)
    && (!filtre.origine || c.faction === filtre.origine) && (!cherche || motSansAccents(c.mot).includes(cherche));
}

export type Comparaison = (a: CarteIndex, b: CarteIndex) => number;

// Les tris communs ; à égalité, trierLesCartes départage par ordre alphabétique.
export const COMPARAISONS = {
  alphabet: () => 0,
  rarete: (a, b) => RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete),
  attaque: (a, b) => attaqueEnJeu(b.attaque, b.rarete) - attaqueEnJeu(a.attaque, a.rarete),
  defense: (a, b) => defenseEnJeu(b.defense, b.rarete) - defenseEnJeu(a.defense, a.rarete),
} satisfies Record<string, Comparaison>;

export const trierLesCartes = (cartes: CarteIndex[], comparer: Comparaison): CarteIndex[] =>
  cartes.sort((a, b) => comparer(a, b) || ordreFrancais(a.mot, b.mot));
