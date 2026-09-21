// Les joutes : des duels classés contre d'autres joueurs. L'adversaire n'est pas connecté : on affronte son
// « double », c'est-à-dire son deck, joué par l'ordinateur avec ses vrais résultats (s'il retrouve « callipyge »
// quatre fois sur cinq, son double aussi). Fonctions pures : les profils et le hasard sont fournis par l'appelant.

import type { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { CarteIndex, Rarete } from '../partage/types.ts';
import type { Hasard } from './hasard.ts';
import type { Resultat } from './progression.ts';
import type { Savoir } from './sauvegarde.ts';

export type ReglesDesJoutes = (typeof EQUILIBRAGE)['joute'];

export type { Savoir };

// Ce qu'un joueur publie pour que les autres puissent affronter son double.
export type ProfilDeJoute = {
  id: string;
  pseudo: string;
  cote: number;
  deck: string[]; // identifiants de ses dix cartes
  savoirs: Record<string, Savoir>; // ses résultats sur chacun de ses mots
  parades: Partial<Record<Rarete, Savoir>>; // ses résultats sur les mots des autres, par rareté
  maison?: boolean; // joueur fabriqué par le jeu (src/jeu/joueursMaison.ts), pour que les joutes aient du monde dès le premier jour
};

// Une fréquence observée, mêlée à une estimation tant que les observations sont peu nombreuses.
function estimer(observe: Savoir | undefined, estimation: number, poids: number): number {
  return ((observe?.reussies ?? 0) + estimation * poids) / ((observe?.posees ?? 0) + poids);
}

// Les chances du double pour cette manche : retrouver son propre mot, et parer celui du joueur.
export function chancesDuDouble(profil: ProfilDeJoute, carteDuDouble: CarteIndex, carteDuJoueur: CarteIndex, regles: ReglesDesJoutes): { reussir: number; parer: number } {
  return {
    reussir: estimer(profil.savoirs[carteDuDouble.id], regles.savoirParDefaut[carteDuDouble.rarete], regles.poidsDeLEstimation),
    parer: estimer(profil.parades[carteDuJoueur.rarete], regles.paradeParDefaut[carteDuJoueur.rarete], regles.poidsDeLEstimation),
  };
}

// ── Le classement ───────────────────────────────────────────────────────────

// La part de victoires que l'on attend du joueur face à cet adversaire, d'après les deux cotes (entre 0 et 1).
export function victoireAttendue(cote: number, coteAdverse: number, regles: ReglesDesJoutes): number {
  return 1 / (1 + 10 ** ((coteAdverse - cote) / regles.echelle));
}

// La cote du joueur après une joute. Un match nul vaut une demi-victoire.
export function coteApres(cote: number, coteAdverse: number, resultat: Resultat, regles: ReglesDesJoutes): number {
  const obtenu = resultat === 'victoire' ? 1 : resultat === 'nul' ? 0.5 : 0;
  return Math.max(regles.coteMinimale, Math.round(cote + regles.facteurK * (obtenu - victoireAttendue(cote, coteAdverse, regles))));
}

export type Ligue = { nom: string; rang: number; aPartirDe: number; suivante: { nom: string; aPartirDe: number } | null };

export function ligueDe(cote: number, regles: ReglesDesJoutes): Ligue {
  const rang = Math.max(0, regles.ligues.findLastIndex((l) => cote >= l.aPartirDe));
  return { ...regles.ligues[rang], rang, suivante: regles.ligues[rang + 1] ?? null };
}

// ── Le choix des adversaires ────────────────────────────────────────────────

// Quelques adversaires à la mesure du joueur : un par écart de cote visé (plus faible, égal, plus fort), tiré au
// hasard parmi les joueurs les plus proches de cette cote. On évite ceux que l'on vient d'affronter, tant que c'est possible.
export function proposerDesAdversaires(profils: readonly ProfilDeJoute[], cote: number, recents: readonly string[], hasard: Hasard, regles: ReglesDesJoutes): ProfilDeJoute[] {
  const proposes: ProfilDeJoute[] = [];
  for (const ecart of regles.ecartsDeCoteProposes) {
    const libres = profils.filter((p) => !proposes.includes(p));
    const frais = libres.filter((p) => !recents.includes(p.id));
    const proches = [...(frais.length > 0 ? frais : libres)]
      .sort((a, b) => Math.abs(a.cote - cote - ecart) - Math.abs(b.cote - cote - ecart) || a.id.localeCompare(b.id))
      .slice(0, regles.joueursProchesParProposition);
    if (proches.length > 0) proposes.push(proches[Math.floor(hasard() * proches.length)]);
  }
  return proposes.sort((a, b) => a.cote - b.cote);
}

// Le rang du joueur dans un classement (1 = premier), et ses voisins.
export function rangDansLeClassement(cotes: readonly number[], cote: number): number {
  return 1 + cotes.filter((autre) => autre > cote).length;
}
