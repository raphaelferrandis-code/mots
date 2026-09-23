// Le duel côté service : il réunit ce dont un duel a besoin (cartes, définitions, deck du joueur, hasard)
// et applique les règles de src/jeu/. L'écran ne fait qu'afficher. Le jour où les duels se joueront
// contre un serveur, seul ce fichier changera.

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { chancesDeLOrdinateur, choisirPourLOrdinateur, commencerLeDuel, deckDeLOrdinateur, jouerLaManche, taillesDesFactions } from '../jeu/duel.ts';
import type { Duel, Niveau, TaillesDesFactions } from '../jeu/duel.ts';
import { composerLEpreuve } from '../jeu/epreuve.ts';
import type { Definitions, Epreuve } from '../jeu/epreuve.ts';
import { hasardDuSysteme } from '../jeu/hasard.ts';
import { chancesDuDouble } from '../jeu/joute.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import { registresMasques } from '../jeu/partie.ts';
import { cartesDuDeck } from '../jeu/progression.ts';
import type { CarteIndex, Registre } from '../partage/types.ts';
import { chargerEdition, chargerLesDefinitions } from './cartes.ts';
import { lirePartie } from './partie.ts';

const REGLES = EQUILIBRAGE.duel;

// Contre qui l'on joue : l'ordinateur à l'entraînement, ou le double d'un autre joueur en joute classée.
export type Adversaire = { type: 'entrainement'; niveau: Niveau } | { type: 'joute'; profil: ProfilDeJoute };

// Tout ce qui reste fixe pendant un duel.
export type Terrain = {
  adversaire: Adversaire;
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

export async function preparerUnDuel(adversaire: Adversaire): Promise<{ terrain: Terrain; duel: Duel }> {
  const partie = lirePartie();
  if (partie.etat !== 'prete') throw new Error("La partie n'est pas encore chargée");
  const masques = registresMasques(partie.sauvegarde);
  const [edition, definitions] = await Promise.all([chargerEdition(), chargerLesDefinitions()]);
  const visibles = edition.cartes.filter((c) => !c.registre.some((r) => masques.includes(r)));
  const deck = cartesDuDeck(partie.sauvegarde, new Map(visibles.map((c) => [c.id, c])));
  if (deck.length !== REGLES.tailleDuDeck) throw new Error(`Ton deck doit compter ${REGLES.tailleDuDeck} cartes.`);

  // À l'entraînement, l'ordinateur reçoit un deck à la mesure de celui du joueur ; en joute, c'est le deck de l'autre joueur.
  let adverse: CarteIndex[];
  if (adversaire.type === 'entrainement') adverse = deckDeLOrdinateur(deck, visibles, adversaire.niveau, hasardDuSysteme, REGLES);
  else {
    const connues = new Map(visibles.map((c) => [c.id, c]));
    adverse = adversaire.profil.deck.flatMap((id) => connues.get(id) ?? []);
    if (adverse.length !== REGLES.tailleDuDeck) throw new Error("Le deck de cet adversaire contient des cartes que ton jeu ne peut pas afficher. Choisis-en un autre.");
  }
  return {
    terrain: { adversaire, visibles, definitions, masques, tailles: taillesDesFactions(edition.cartes) },
    duel: commencerLeDuel(deck, adverse, hasardDuSysteme, REGLES),
  };
}

// Début de manche : l'adversaire pose son mot. (Le double d'un joueur pose toujours sa carte la plus solide.)
export const motDeLOrdinateur = (terrain: Terrain, duel: Duel): CarteIndex => choisirPourLOrdinateur(duel, terrain.adversaire.type === 'entrainement' ? terrain.adversaire.niveau : 'Normal', hasardDuSysteme, terrain.tailles, REGLES);

// L'épreuve sur un mot. L'autre mot de la manche est écarté des leurres : sa définition sera demandée à son tour.
export function poserLEpreuve(terrain: Terrain, carte: CarteIndex, autreMotDeLaManche: CarteIndex): Epreuve {
  return composerLEpreuve(carte, terrain.definitions, terrain.visibles.filter((c) => c.id !== autreMotDeLaManche.id), terrain.masques, hasardDuSysteme);
}

// Règle la manche : le joueur a su (ou non) retrouver son mot, puis parer le mot adverse. L'ordinateur, lui, connaît
// son mot et pare celui du joueur selon les chances de son niveau ; le double d'un joueur, selon les résultats de ce joueur.
export function reglerLaManche(terrain: Terrain, duel: Duel, carte: CarteIndex, adverse: CarteIndex, reussi: boolean, pare: boolean): Duel {
  const chances = terrain.adversaire.type === 'entrainement' ? chancesDeLOrdinateur(terrain.adversaire.niveau, carte, REGLES) : chancesDuDouble(terrain.adversaire.profil, adverse, carte, EQUILIBRAGE.joute);
  const savoirs = { joueurReussit: reussi, joueurPare: pare, adversaireReussit: hasardDuSysteme() < chances.reussir, adversairePare: hasardDuSysteme() < chances.parer };
  return jouerLaManche(duel, carte.id, adverse.id, savoirs, hasardDuSysteme, terrain.tailles, REGLES);
}
