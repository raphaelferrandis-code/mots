// Les « joueurs maison » : des adversaires fabriqués par le jeu à partir des cartes de l'édition, pour que les joutes
// aient du monde dès le premier jour. Toujours les mêmes d'une fois sur l'autre (le hasard est reproductible).
// Ils servent deux fois : dans le jeu tant qu'il n'a pas de serveur, et dans le script du serveur, qui les installe
// dans la base (marqués « maison », pour pouvoir les retirer quand il y aura assez de vrais joueurs).

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { PSEUDOS_INTERDITS } from '../config/pseudos-interdits.ts';
import { RARETES_ORDINAIRES } from '../partage/types.ts';
import type { CarteIndex, Rarete } from '../partage/types.ts';
import { forceDeLaCarte } from './duel.ts';
import { hasardReproductible } from './hasard.ts';
import type { Hasard } from './hasard.ts';
import type { ProfilDeJoute } from './joute.ts';
import { examinerLePseudo } from './pseudo.ts';

export const NOMBRE_DE_JOUEURS_MAISON = 240;
const REGLES = EQUILIBRAGE.joute;
const entre = (min: number, valeur: number, max: number): number => Math.min(max, Math.max(min, valeur));
const avecMajuscule = (mot: string): string => mot.charAt(0).toLocaleUpperCase('fr') + mot.slice(1);

// Un pseudonyme tiré des mots du jeu : un nom plutôt rare, d'un seul tenant, suivi d'un nombre (« Frangipane 43 »).
export function pseudonymeAuHasard(cartes: readonly CarteIndex[], hasard: Hasard): string {
  const jolis = cartes.filter((c) => c.type === 'Nom' && c.registre.length === 0 && c.rarete !== 'Commune' && /^\p{L}{5,11}$/u.test(c.mot));
  for (let essai = 0; essai < 50; essai++) {
    const pseudo = `${avecMajuscule(jolis[Math.floor(hasard() * jolis.length)].mot)} ${10 + Math.floor(hasard() * 90)}`;
    if (examinerLePseudo(pseudo, PSEUDOS_INTERDITS).accepte) return pseudo;
  }
  return `Joueur ${1000 + Math.floor(hasard() * 9000)}`;
}

export function fabriquerLesJoueursMaison(cartes: readonly CarteIndex[]): ProfilDeJoute[] {
  const hasard = hasardReproductible(20260921);
  // Leurs decks n'emploient aucun mot familier ou injurieux : ils conviennent à tous les réglages de contenu.
  const parRarete = new Map<Rarete, CarteIndex[]>(RARETES_ORDINAIRES.map((r) => [r, cartes.filter((c) => c.rarete === r && c.registre.length === 0)]));
  const pseudosPris = new Set<string>();

  return Array.from({ length: NOMBRE_DE_JOUEURS_MAISON }, (_, i): ProfilDeJoute => {
    // Des cotes en cloche autour de 1 150 (la somme de trois tirages donne une courbe assez régulière).
    const cote = Math.round(entre(750, 1150 + (hasard() + hasard() + hasard() - 1.5) * 420, 1950));
    const niveau = (cote - 750) / 1200; // de 0 (débutant) à 1 (champion)

    // Plus le joueur est fort, plus son deck compte de cartes rares, mieux elles sont choisies, et mieux il connaît ses mots.
    const parts = [0.6 - 0.5 * niveau, 0.3 - 0.1 * niveau, 0.1 + 0.2 * niveau, 0.25 * niveau, 0.15 * niveau];
    const deck: CarteIndex[] = [];
    while (deck.length < EQUILIBRAGE.duel.tailleDuDeck) {
      let tirage = hasard();
      const rarete = RARETES_ORDINAIRES[parts.findIndex((part) => (tirage -= part) < 0)] ?? 'Commune';
      const essais = Array.from({ length: 1 + Math.round(niveau * 5) }, () => parRarete.get(rarete)![Math.floor(hasard() * parRarete.get(rarete)!.length)]).filter((c) => !deck.includes(c));
      if (essais.length > 0) deck.push(essais.reduce((a, b) => (forceDeLaCarte(b) > forceDeLaCarte(a) ? b : a)));
    }

    const savoirs: ProfilDeJoute['savoirs'] = {};
    for (const carte of deck) {
      const posees = 8 + Math.floor(niveau * 30);
      savoirs[carte.id] = { posees, reussies: Math.round(posees * entre(0.3, REGLES.savoirParDefaut[carte.rarete] - 0.25 + niveau * 0.4, 0.99)) };
    }
    const parades: ProfilDeJoute['parades'] = {};
    for (const rarete of RARETES_ORDINAIRES) {
      const posees = 10 + Math.floor(niveau * 40);
      parades[rarete] = { posees, reussies: Math.round(posees * entre(0.1, REGLES.paradeParDefaut[rarete] - 0.25 + niveau * 0.45, 0.97)) };
    }

    let pseudo = pseudonymeAuHasard(cartes, hasard);
    while (pseudosPris.has(pseudo)) pseudo = pseudonymeAuHasard(cartes, hasard);
    pseudosPris.add(pseudo);
    // Un identifiant fixe, au format attendu par la base du serveur.
    return { id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, pseudo, cote, deck: deck.map((c) => c.id), savoirs, parades, maison: true };
  });
}
