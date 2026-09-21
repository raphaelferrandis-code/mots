// Les joutes côté service : d'où viennent les adversaires et le classement.
//
// ⚠️ VERSION D'ESSAI. Le jeu n'a pas encore de serveur : les adversaires sont des joueurs FICTIFS, fabriqués ici
// à partir des cartes de l'édition (toujours les mêmes d'une visite à l'autre), et la cote du joueur est rangée
// dans sa sauvegarde, sur son appareil. Le jour où un serveur existera, il suffira de fournir un autre
// « ServeurDeJoutes » : les écrans et les règles (src/jeu/joute.ts) ne changeront pas.

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { forceDeLaCarte } from '../jeu/duel.ts';
import { hasardDuSysteme, hasardReproductible } from '../jeu/hasard.ts';
import type { Hasard } from '../jeu/hasard.ts';
import { proposerDesAdversaires, rangDansLeClassement } from '../jeu/joute.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import { RARETES_ORDINAIRES } from '../partage/types.ts';
import type { CarteIndex, Rarete } from '../partage/types.ts';
import { chargerEdition } from './cartes.ts';

const REGLES = EQUILIBRAGE.joute;

export type LigneDeClassement = { rang: number; pseudo: string; cote: number; moi: boolean };
export type Classement = { joueurs: number; rang: number; tete: LigneDeClassement[]; voisins: LigneDeClassement[] };

export type ServeurDeJoutes = {
  fictif: boolean; // vrai tant que les adversaires sont fabriqués par le jeu
  adversaires(cote: number, recents: readonly string[]): Promise<ProfilDeJoute[]>;
  classement(pseudo: string, cote: number): Promise<Classement>;
};

// ── Des pseudonymes tirés des mots du jeu : pas de texte libre, donc rien à modérer ─────────────
const avecMajuscule = (mot: string): string => mot.charAt(0).toLocaleUpperCase('fr') + mot.slice(1);

function pseudonyme(cartes: readonly CarteIndex[], hasard: Hasard): string {
  // Des noms plutôt rares, d'un seul tenant, et sans registre familier ni injurieux.
  const jolis = cartes.filter((c) => c.type === 'Nom' && c.registre.length === 0 && c.rarete !== 'Commune' && /^\p{L}{5,11}$/u.test(c.mot));
  return `${avecMajuscule(jolis[Math.floor(hasard() * jolis.length)].mot)} ${10 + Math.floor(hasard() * 90)}`;
}

export async function tirerUnPseudonyme(): Promise<string> {
  return pseudonyme((await chargerEdition()).cartes, hasardDuSysteme);
}

// ── Les joueurs fictifs ────────────────────────────────────────────────────
const JOUEURS_FICTIFS = 240;
const entre = (min: number, valeur: number, max: number): number => Math.min(max, Math.max(min, valeur));

function fabriquerLesJoueurs(cartes: readonly CarteIndex[]): ProfilDeJoute[] {
  const hasard = hasardReproductible(20260921);
  // Leurs decks n'emploient aucun mot familier ou injurieux : ils conviennent à tous les réglages de contenu.
  const parRarete = new Map<Rarete, CarteIndex[]>(RARETES_ORDINAIRES.map((r) => [r, cartes.filter((c) => c.rarete === r && c.registre.length === 0)]));

  return Array.from({ length: JOUEURS_FICTIFS }, (_, i): ProfilDeJoute => {
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
    return { id: `fictif-${i}`, pseudo: pseudonyme(cartes, hasard), cote, deck: deck.map((c) => c.id), savoirs, parades, fictif: true };
  });
}

let joueurs: Promise<ProfilDeJoute[]> | undefined;
const joueursFictifs = (): Promise<ProfilDeJoute[]> => (joueurs ??= chargerEdition().then((edition) => fabriquerLesJoueurs(edition.cartes)));

export const serveurDeJoutes: ServeurDeJoutes = {
  fictif: true,

  async adversaires(cote, recents) {
    return proposerDesAdversaires(await joueursFictifs(), cote, recents, hasardDuSysteme, REGLES);
  },

  async classement(pseudo, cote) {
    const autres = await joueursFictifs();
    const rang = rangDansLeClassement(autres.map((p) => p.cote), cote);
    const tous: LigneDeClassement[] = [...autres.map((p) => ({ pseudo: p.pseudo, cote: p.cote, moi: false })), { pseudo, cote, moi: true }]
      // À cote égale, le joueur est placé devant : son rang est celui de « rangDansLeClassement ».
      .sort((a, b) => b.cote - a.cote || Number(b.moi) - Number(a.moi))
      .map((ligne, i) => ({ ...ligne, rang: i + 1 }));
    return { joueurs: tous.length, rang, tete: tous.slice(0, 10), voisins: tous.slice(Math.max(0, rang - 3), rang + 2) };
  },
};
