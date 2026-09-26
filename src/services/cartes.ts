// Accès aux cartes de l'édition.
// Comme tout ce qui est dans src/services/, c'est le seul endroit du jeu qui sait d'où viennent
// les données : aujourd'hui des fichiers fabriqués par le pipeline, demain peut-être un serveur.

import { SITE } from '../config/site.ts';
import { lotDeLaCarte, nomDuLot } from '../partage/lots.ts';
import { adressesDesPages, cheminDeLaPage } from '../partage/pagesDesMots.ts';
import type { Devinettes } from '../jeu/devinette.ts';
import type { CarteDetails, CarteIndex, Definition, IndexEdition } from '../partage/types.ts';

export const EDITION = 1;
const DOSSIER = `${import.meta.env.BASE_URL}data/`;
// L'empreinte des données (vite.config.ts) : une nouvelle édition a une nouvelle adresse, qu'aucun vieux cache ne connaît.
const VERSION: string = import.meta.env?.VITE_VERSION_DES_DONNEES ?? '';

async function lireJson<T>(chemin: string): Promise<T> {
  const reponse = await fetch(`${DOSSIER}${chemin}${VERSION ? `?v=${VERSION}` : ''}`);
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

// Les devinettes du jour (public/data/devinettes.json, fabriqué depuis le calendrier du mot du jour).
let devinettes: Promise<Devinettes> | undefined;
export function chargerLesDevinettes(): Promise<Devinettes> {
  devinettes ??= lireJson<Devinettes>('devinettes.json').catch((erreur) => {
    devinettes = undefined;
    throw erreur;
  });
  return devinettes;
}

// L'adresse publique de la page d'un timbre (philamots.fr/mot/…/), calculée comme pour le site construit.
let adresses: Promise<Map<string, string>> | undefined;
export async function pageDuTimbre(id: string): Promise<string | undefined> {
  adresses ??= chargerEdition().then((edition) => adressesDesPages(edition.cartes));
  const adresse = (await adresses).get(id);
  return adresse ? `${SITE.adresse}${cheminDeLaPage(adresse)}` : undefined;
}

function chargerLot(lot: number): Promise<Record<string, CarteDetails>> {
  if (!lots.has(lot)) {
    lots.set(lot, lireJson<Record<string, CarteDetails>>(`details/${nomDuLot(lot)}`).catch((erreur) => {
      lots.delete(lot);
      throw erreur;
    }));
  }
  return lots.get(lot)!;
}

export async function chargerDetails(id: string): Promise<CarteDetails | undefined> {
  const edition = await chargerEdition();
  return (await chargerLot(lotDeLaCarte(id, edition.meta.lots)))[id];
}

// Les définitions de toutes les cartes, pour l'épreuve de maîtrise du duel : la bonne définition vient du mot
// joué, les leurres de n'importe quel autre. (Environ 450 Ko à télécharger, une seule fois.)
export async function chargerLesDefinitions(): Promise<Map<string, Definition[]>> {
  const edition = await chargerEdition();
  const tous = await Promise.all(Array.from({ length: edition.meta.lots }, (_, lot) => chargerLot(lot)));
  const definitions = new Map<string, Definition[]>();
  for (const lot of tous) for (const [id, details] of Object.entries(lot)) definitions.set(id, details.definitions);
  return definitions;
}
