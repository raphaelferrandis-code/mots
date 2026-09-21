// Le duel côté service : il réunit ce dont un duel a besoin (cartes, définitions, deck du joueur, hasard)
// et applique les règles de src/jeu/. L'écran ne fait qu'afficher. Le jour où les duels se joueront
// contre un serveur, seul ce fichier changera.

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { choisirPourLOrdinateur, commencerLeDuel, deckDeLOrdinateur, evaluerLAttaque, jouer, taillesDesFactions } from '../jeu/duel.ts';
import type { Coup, Duel, Niveau, TaillesDesFactions } from '../jeu/duel.ts';
import { composerLEpreuve } from '../jeu/epreuve.ts';
import type { Definitions, Epreuve } from '../jeu/epreuve.ts';
import { hasardDuSysteme } from '../jeu/hasard.ts';
import { registresMasques } from '../jeu/partie.ts';
import { cartesDuDeck } from '../jeu/progression.ts';
import type { CarteIndex, Registre } from '../partage/types.ts';
import { chargerEdition, chargerLesDefinitions } from './cartes.ts';
import { lirePartie } from './partie.ts';

const REGLES = EQUILIBRAGE.duel;

// Tout ce qui reste fixe pendant un duel.
export type Terrain = {
  niveau: Niveau;
  visibles: CarteIndex[]; // les cartes de l'édition que le joueur accepte de voir
  definitions: Definitions;
  tailles: TaillesDesFactions;
  masques: Registre[];
};

// Le deck du joueur tel qu'il peut être joué maintenant (cartes possédées et non masquées).
export async function deckJouable(): Promise<CarteIndex[]> {
  const partie = lirePartie();
  if (partie.etat !== 'prete') return [];
  const masques = registresMasques(partie.sauvegarde);
  const visibles = (await chargerEdition()).cartes.filter((c) => !c.registre.some((r) => masques.includes(r)));
  return cartesDuDeck(partie.sauvegarde, new Map(visibles.map((c) => [c.id, c])));
}

export async function preparerUnDuel(niveau: Niveau): Promise<{ terrain: Terrain; duel: Duel }> {
  const partie = lirePartie();
  if (partie.etat !== 'prete') throw new Error("La partie n'est pas encore chargée");
  const masques = registresMasques(partie.sauvegarde);
  const [edition, definitions] = await Promise.all([chargerEdition(), chargerLesDefinitions()]);
  const visibles = edition.cartes.filter((c) => !c.registre.some((r) => masques.includes(r)));
  const deck = cartesDuDeck(partie.sauvegarde, new Map(visibles.map((c) => [c.id, c])));
  if (deck.length !== REGLES.tailleDuDeck) throw new Error(`Ton deck doit compter ${REGLES.tailleDuDeck} cartes.`);

  const adverse = deckDeLOrdinateur(deck, visibles, niveau, hasardDuSysteme, REGLES);
  return {
    terrain: { niveau, visibles, definitions, masques, tailles: taillesDesFactions(edition.cartes) },
    duel: commencerLeDuel(deck, adverse, hasardDuSysteme, REGLES),
  };
}

// Ce que ferait une carte de la main si le joueur réussissait son épreuve.
export const prevoirLAttaque = (terrain: Terrain, duel: Duel, carte: CarteIndex): Omit<Coup, 'cote' | 'carte' | 'reussi'> => evaluerLAttaque(duel, duel.aLaMain, carte, terrain.tailles, REGLES);

export const poserLEpreuve = (terrain: Terrain, carte: CarteIndex): Epreuve => composerLEpreuve(carte, terrain.definitions, terrain.visibles, terrain.masques, hasardDuSysteme);

export const jouerLaCarte = (terrain: Terrain, duel: Duel, idCarte: string, reussi: boolean): Duel => jouer(duel, idCarte, reussi, hasardDuSysteme, terrain.tailles, REGLES);

// Le tour de l'ordinateur : il choisit sa carte, et connaît son mot ou non selon son niveau.
export function tourDeLOrdinateur(terrain: Terrain, duel: Duel): Duel {
  const carte = choisirPourLOrdinateur(duel, terrain.niveau, hasardDuSysteme, terrain.tailles, REGLES);
  return jouer(duel, carte.id, hasardDuSysteme() < REGLES.reussiteDeLOrdinateur[terrain.niveau], hasardDuSysteme, terrain.tailles, REGLES);
}
