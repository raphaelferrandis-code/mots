// Le cachet « Premier jour » (audit de finition du 26/09/2026) : en philatélie, l'oblitération spéciale du premier jour
// d'émission d'un timbre. Ici, le plus ancien timbre de chaque grande rareté de l'album la porte : la première Épique,
// la première Légendaire, la première Hors-série. Aucune donnée nouvelle : il se déduit des dates d'obtention (à égalité,
// l'identifiant départage), par le même calcul partout (cérémonie, album, fiche).

import type { CarteIndex, Rarete } from '../partage/types.ts';

export const RARETES_DU_PREMIER_JOUR: readonly Rarete[] = ['Épique', 'Légendaire', 'Hors-série'];

type RareteDe = (id: string) => Rarete | undefined;
export const rareteDansLEdition = (cartes: readonly CarteIndex[]): RareteDe => {
  const raretes = new Map(cartes.map((c) => [c.id, c.rarete]));
  return (id) => raretes.get(id);
};

// Les timbres de l'album qui portent le cachet : un par grande rareté possédée.
export function premiersJours(cartes: Readonly<Record<string, { obtenueLe: number }>>, rareteDe: RareteDe): ReadonlySet<string> {
  const premiers = new Map<Rarete, { id: string; le: number }>();
  for (const [id, { obtenueLe }] of Object.entries(cartes)) {
    const rarete = rareteDe(id);
    if (!rarete || !RARETES_DU_PREMIER_JOUR.includes(rarete)) continue;
    const actuel = premiers.get(rarete);
    if (!actuel || obtenueLe < actuel.le || (obtenueLe === actuel.le && id < actuel.id)) premiers.set(rarete, { id, le: obtenueLe });
  }
  return new Set([...premiers.values()].map((p) => p.id));
}

// Pendant l'ouverture d'un paquet : ceux de ses timbres qui inaugurent une rareté, absente de l'album avant lui.
export function premiersJoursDuPaquet(avant: Readonly<Record<string, unknown>>, apres: Readonly<Record<string, { obtenueLe: number }>>, rareteDe: RareteDe): ReadonlySet<string> {
  const dejaLa = new Set(Object.keys(avant).map(rareteDe));
  return new Set([...premiersJours(apres, rareteDe)].filter((id) => !dejaLa.has(rareteDe(id))));
}
