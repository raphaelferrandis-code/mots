// Le tirage d'un paquet : d'abord la rareté de chaque emplacement, puis un mot au hasard dans cette rareté.
// Règles pures : pas d'écran, pas de sauvegarde, et le hasard est fourni par l'appelant.

import { RARETES } from '../partage/types.ts';
import type { CarteIndex, Rarete, Registre } from '../partage/types.ts';
import type { ChancesParRarete } from '../config/equilibrage.ts';
import { choisir } from './hasard.ts';
import type { Hasard } from './hasard.ts';

export type ReglagesDesPaquets = {
  emplacements: ChancesParRarete[];
  paquetsAvantLegendaireGarantie: number;
};

// Les cartes rangées par rareté une fois pour toutes (le simulateur ouvre des millions de paquets).
export type Reserve = Record<Rarete, CarteIndex[]>;

// « masques » : les registres que le joueur a choisi de masquer (familiers, injurieux) ne tombent plus dans les paquets.
export function preparerReserve(cartes: readonly CarteIndex[], masques: readonly Registre[] = []): Reserve {
  const reserve: Reserve = { 'Commune': [], 'Peu commune': [], 'Rare': [], 'Épique': [], 'Légendaire': [] };
  for (const carte of cartes) {
    if (!carte.registre.some((r) => masques.includes(r))) reserve[carte.rarete].push(carte);
  }
  return reserve;
}

export function tirerRarete(chances: ChancesParRarete, hasard: Hasard): Rarete {
  const total = RARETES.reduce((somme, r) => somme + (chances[r] ?? 0), 0);
  let seuil = hasard() * total;
  for (const rarete of RARETES) {
    seuil -= chances[rarete] ?? 0;
    if (seuil < 0) return rarete;
  }
  return RARETES.findLast((r) => (chances[r] ?? 0) > 0) ?? 'Commune';
}

// Une carte de la rareté voulue, hors cartes interdites. Si la rareté n'a plus rien à offrir
// (réserve minuscule, beaucoup de cartes masquées), on descend d'une rareté, puis on remonte.
function tirerCarte(reserve: Reserve, rarete: Rarete, interdites: ReadonlySet<string>, hasard: Hasard): CarteIndex | undefined {
  const rang = RARETES.indexOf(rarete);
  const ordre = [rarete, ...RARETES.slice(0, rang).reverse(), ...RARETES.slice(rang + 1)];
  for (const r of ordre) {
    const groupe = reserve[r];
    if (groupe.length === 0) continue;
    // Presque toujours, quelques essais suffisent ; sinon on trie vraiment.
    for (let essai = 0; essai < 8; essai++) {
      const carte = choisir(groupe, hasard);
      if (!interdites.has(carte.id)) return carte;
    }
    const permises = groupe.filter((c) => !interdites.has(c.id));
    if (permises.length > 0) return choisir(permises, hasard);
  }
  return undefined;
}

export type OptionsDOuverture = {
  hasard: Hasard;
  paquetsSansLegendaire: number; // paquets ouverts d'affilée sans Légendaire, avant celui-ci
  exclure?: ReadonlySet<string>; // cartes à ne pas tirer (paquets de départ : celles déjà possédées)
};

export function ouvrirPaquet(reserve: Reserve, options: OptionsDOuverture, reglages: ReglagesDesPaquets): CarteIndex[] {
  const garantie = options.paquetsSansLegendaire + 1 >= reglages.paquetsAvantLegendaireGarantie;
  const interdites = new Set(options.exclure);
  const paquet: CarteIndex[] = [];

  reglages.emplacements.forEach((chances, position) => {
    const dernier = position === reglages.emplacements.length - 1;
    const rarete = garantie && dernier ? 'Légendaire' : tirerRarete(chances, options.hasard);
    const carte = tirerCarte(reserve, rarete, interdites, options.hasard);
    if (!carte) return;
    paquet.push(carte);
    interdites.add(carte.id); // jamais deux fois la même carte dans un paquet
  });
  return paquet;
}

export const contientUneLegendaire = (paquet: readonly CarteIndex[]): boolean => paquet.some((c) => c.rarete === 'Légendaire');

// Encre que rapporterait en moyenne un paquet dont toutes les cartes seraient des doublons :
// le maximum de ce qu'un paquet peut rendre. Sert à vérifier que l'économie ne s'emballe pas.
export function encreMaximaleMoyenneParPaquet(emplacements: ChancesParRarete[], encreParDoublon: Record<Rarete, number>): number {
  return emplacements.reduce((somme, chances) => {
    const total = RARETES.reduce((s, r) => s + (chances[r] ?? 0), 0);
    return somme + RARETES.reduce((s, r) => s + ((chances[r] ?? 0) / total) * encreParDoublon[r], 0);
  }, 0);
}
