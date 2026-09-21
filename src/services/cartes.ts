// Accès aux cartes de l'édition.
// Comme tout ce qui est dans src/services/, c'est le seul endroit du jeu qui sait d'où viennent
// les données : aujourd'hui des fichiers fabriqués par le pipeline, demain peut-être un serveur.

import { lotDeLaCarte, nomDuLot } from '../partage/lots.ts';
import type { CarteDetails, CarteIndex, IndexEdition } from '../partage/types.ts';

const EDITION = 1;
const DOSSIER = `${import.meta.env.BASE_URL}data/`;

async function lireJson<T>(chemin: string): Promise<T> {
  const reponse = await fetch(`${DOSSIER}${chemin}`);
  if (!reponse.ok) throw new Error(`Impossible de charger ${chemin} (erreur ${reponse.status})`);
  return reponse.json() as Promise<T>;
}

// Chaque fichier n'est téléchargé qu'une fois : les demandes suivantes réutilisent la première.
let index: Promise<IndexEdition> | undefined;
const lots = new Map<number, Promise<Record<string, CarteDetails>>>();

export function chargerEdition(): Promise<IndexEdition> {
  index ??= lireJson<IndexEdition>(`edition-${EDITION}.index.json`).catch((erreur) => {
    index = undefined; // permet de réessayer après une coupure de réseau
    throw erreur;
  });
  return index;
}

export async function chargerCarte(id: string): Promise<CarteIndex | undefined> {
  const edition = await chargerEdition();
  return edition.cartes.find((carte) => carte.id === id);
}

export async function chargerDetails(id: string): Promise<CarteDetails | undefined> {
  const edition = await chargerEdition();
  const lot = lotDeLaCarte(id, edition.meta.lots);
  if (!lots.has(lot)) {
    lots.set(lot, lireJson<Record<string, CarteDetails>>(`details/${nomDuLot(lot)}`).catch((erreur) => {
      lots.delete(lot);
      throw erreur;
    }));
  }
  return (await lots.get(lot)!)[id];
}
