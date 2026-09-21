import { registresMasques } from '../../jeu/partie.ts';
import { cartesDuDeck } from '../../jeu/progression.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import type { CarteIndex } from '../../partage/types.ts';

// Données d'affichage uniquement : les règles et la sauvegarde restent dans jeu/ et services/.
export function preparerAccueil(sauvegarde: Sauvegarde, cartes: readonly CarteIndex[]) {
  const masques = registresMasques(sauvegarde);
  const visibles = cartes.filter((c) => !c.registre.some((r) => masques.includes(r)));
  const ordinaires = visibles.filter((c) => c.rarete !== 'Hors-série');
  const horsSerie = visibles.filter((c) => c.rarete === 'Hors-série');
  const possedees = visibles.filter((c) => c.id in sauvegarde.cartes);
  return {
    recentes: [...possedees].sort((a, b) => sauvegarde.cartes[b.id].obtenueLe - sauvegarde.cartes[a.id].obtenueLe || a.mot.localeCompare(b.mot, 'fr')).slice(0, 6),
    deck: cartesDuDeck(sauvegarde, new Map(possedees.map((c) => [c.id, c]))),
    collection: {
      possedees: ordinaires.filter((c) => c.id in sauvegarde.cartes).length,
      total: ordinaires.length,
      horsSeriePossedees: horsSerie.filter((c) => c.id in sauvegarde.cartes).length,
      horsSerieTotal: horsSerie.length,
      maitrisees: possedees.filter((c) => sauvegarde.cartes[c.id].maitriseeLe !== null).length,
    },
  };
}

export type VueAccueil = ReturnType<typeof preparerAccueil>;
