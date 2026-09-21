// Étape 6 — Édition : choisit, dans la base complète, les cartes qui composent une édition du jeu.
//
// Principe : pour chaque rareté, un nombre de places ; ces places sont partagées entre les factions
// (petites factions gonflées, grosses plafonnées) ; dans chaque case (rareté × faction), on prend
// les cartes les mieux notées en qualité.

import { RARETES } from '../../src/partage/types.ts';
import type { Rarete } from '../../src/partage/types.ts';
import type { CONFIG } from '../config.ts';
import type { CarteComplete } from './cartes.ts';
import { empreinte, notesSurDix, repartirEntiers } from './stats.ts';

type ReglagesEdition = typeof CONFIG.edition;

const RARETES_PRECIEUSES: Rarete[] = ['Rare', 'Épique', 'Légendaire'];

// Une carte peut entrer dans une édition si on sait d'où vient le mot, si les gens interrogés
// permettent de mesurer sa rareté, et si au moins une définition peut servir en duel.
export function estEligible(carte: CarteComplete, exclusions: Set<string>): boolean {
  return carte.factionReconnue && carte.prevalenceMesuree && carte.definitionsDeDuel > 0 && !exclusions.has(carte.index.mot);
}

export function noteDeQualite(carte: CarteComplete, reglages: ReglagesEdition): number {
  const poids = reglages.qualite;
  let note = 0;

  const longueur = carte.details.definitions.find((d) => d.quiz)?.texte.length ?? 0;
  note += poids.longueurDefinition * (longueur >= 40 && longueur <= 160 ? 1 : longueur >= 25 ? 0.5 : 0);

  const p = carte.details.prevalence;
  if (p !== null) {
    const [bas, haut] = reglages.prevalenceIdeale;
    const ideale = RARETES_PRECIEUSES.includes(carte.index.rarete)
      ? (p >= bas && p <= haut ? 1 : p >= bas / 2 && p <= haut + 15 ? 0.5 : 0)
      : (p >= 90 ? 1 : p >= 75 ? 0.5 : 0);
    note += poids.prevalenceIdeale * ideale;
  }

  if (carte.index.registre.includes('Littéraire') || carte.index.registre.includes('Vieilli')) note += poids.saveur;
  if (carte.definitionsDeDuel >= 2) note += poids.plusieursDefinitions;
  if (carte.domainesDuPremierSens.some((d) => reglages.domainesTechniques.includes(d))) note += poids.domaineTechnique;
  if (carte.index.mot.includes('-')) note += poids.motCompose;
  return note;
}

// Part de l'édition attribuée à chaque faction, d'après le nombre de mots dont elle dispose.
export function partsDesFactions(tailles: Map<string, number>, exposant: number, plafond: number): Map<string, number> {
  const parts = new Map<string, number>();
  let somme = 0;
  for (const [faction, taille] of tailles) { const p = taille ** exposant; parts.set(faction, p); somme += p; }
  for (const [faction, p] of parts) parts.set(faction, p / somme);

  // Plafond : ce qui dépasse est redistribué aux autres, en proportion.
  for (let tour = 0; tour < parts.size; tour++) {
    const tropGrosses = [...parts].filter(([, p]) => p > plafond + 1e-12);
    if (tropGrosses.length === 0) break;
    const libres = [...parts].filter(([, p]) => p < plafond - 1e-12);
    const exces = tropGrosses.reduce((total, [, p]) => total + (p - plafond), 0);
    const sommeLibres = libres.reduce((total, [, p]) => total + p, 0);
    for (const [faction] of tropGrosses) parts.set(faction, plafond);
    if (sommeLibres === 0) break;
    for (const [faction, p] of libres) parts.set(faction, p + (exces * p) / sommeLibres);
  }
  return parts;
}

// Partage « total » places entre des factions selon leurs parts, sans jamais donner à une faction
// plus de places qu'elle n'a de cartes disponibles : ce qu'elle ne peut pas prendre va aux autres.
export function allouer(total: number, parts: Map<string, number>, disponibles: Map<string, number>): Map<string, number> {
  const resultat = new Map<string, number>();
  let actifs = [...parts.keys()].filter((f) => (disponibles.get(f) ?? 0) > 0);
  let restant = Math.min(total, actifs.reduce((s, f) => s + disponibles.get(f)!, 0));

  while (actifs.length > 0) {
    const somme = actifs.reduce((s, f) => s + parts.get(f)!, 0);
    const satures = actifs.filter((f) => (restant * parts.get(f)!) / somme >= disponibles.get(f)!);
    if (satures.length === 0) break;
    for (const f of satures) { resultat.set(f, disponibles.get(f)!); restant -= disponibles.get(f)!; }
    actifs = actifs.filter((f) => !satures.includes(f));
  }
  repartirEntiers(restant, actifs.map((f) => parts.get(f)!)).forEach((n, i) => resultat.set(actifs[i], n));
  return resultat;
}

export type JournalEdition = {
  eligibles: number;
  places: Map<Rarete, number>;
  partsDesFactions: Map<string, number>;
  eligiblesParFaction: Map<string, number>;
  manques: string[]; // cases où il n'y avait pas assez de cartes
  coupsDeCoeurAjoutes: string[];
  coupsDeCoeurImpossibles: string[]; // mot → raison
};

export function composerEdition(
  cartes: CarteComplete[],
  listes: { exclusions: Set<string>; coupsDeCoeur: Set<string> },
  reglages: ReglagesEdition,
  partsDesRaretes: [Rarete, number][],
): { edition: CarteComplete[]; journal: JournalEdition } {
  const journal: JournalEdition = { eligibles: 0, places: new Map(), partsDesFactions: new Map(), eligiblesParFaction: new Map(), manques: [], coupsDeCoeurAjoutes: [], coupsDeCoeurImpossibles: [] };

  // Coups de cœur : ils entrent d'office, à condition d'exister et d'avoir une origine connue.
  const imposees = new Set<CarteComplete>();
  for (const mot of listes.coupsDeCoeur) {
    const trouvees = cartes.filter((c) => c.index.mot === mot);
    if (trouvees.length === 0) { journal.coupsDeCoeurImpossibles.push(`${mot} : absent de la base (inconnu de Lexique ou du Wiktionnaire)`); continue; }
    for (const carte of trouvees) {
      if (!carte.factionReconnue) { journal.coupsDeCoeurImpossibles.push(`${carte.index.id} : origine du mot non reconnue, donc pas de faction`); continue; }
      imposees.add(carte);
      journal.coupsDeCoeurAjoutes.push(carte.index.id);
    }
  }

  const eligibles = cartes.filter((c) => imposees.has(c) || estEligible(c, listes.exclusions));
  journal.eligibles = eligibles.length;
  for (const c of eligibles) journal.eligiblesParFaction.set(c.index.faction, (journal.eligiblesParFaction.get(c.index.faction) ?? 0) + 1);
  journal.partsDesFactions = partsDesFactions(journal.eligiblesParFaction, reglages.exposantFactions, reglages.plafondParFaction);

  // Places par rareté, dans l'ordre de RARETES.
  const placesParRarete = repartirEntiers(reglages.taille, RARETES.map((r) => partsDesRaretes.find(([nom]) => nom === r)?.[1] ?? 0));
  RARETES.forEach((r, i) => journal.places.set(r, placesParRarete[i]));

  const qualite = new Map(eligibles.map((c) => [c, noteDeQualite(c, reglages)]));
  const edition: CarteComplete[] = [];

  for (const rarete of RARETES) {
    const deLaRarete = eligibles.filter((c) => c.index.rarete === rarete);
    const disponibles = new Map<string, number>();
    for (const c of deLaRarete) disponibles.set(c.index.faction, (disponibles.get(c.index.faction) ?? 0) + 1);

    const places = journal.places.get(rarete)!;
    const allocation = allouer(places, journal.partsDesFactions, disponibles);
    const obtenues = [...allocation.values()].reduce((a, b) => a + b, 0);
    if (obtenues < places) journal.manques.push(`${rarete} : ${places} places, seulement ${obtenues} cartes disponibles`);

    for (const [faction, nombre] of allocation) {
      const candidates = deLaRarete
        .filter((c) => c.index.faction === faction)
        .sort((a, b) => qualite.get(b)! - qualite.get(a)! || (empreinte(a.index.id) < empreinte(b.index.id) ? -1 : 1));

      // Les coups de cœur entrent toujours, même s'ils dépassent la place prévue pour leur case.
      const forcees = candidates.filter((c) => imposees.has(c));
      edition.push(...forcees);

      // Le reste des places est partagé entre les types de mots, puis les meilleures cartes de chaque type sont prises.
      const libres = candidates.filter((c) => !imposees.has(c));
      const disponiblesParType = new Map<string, number>();
      for (const c of libres) disponiblesParType.set(c.index.type, (disponiblesParType.get(c.index.type) ?? 0) + 1);
      const placesParType = allouer(Math.max(0, nombre - forcees.length), new Map(Object.entries(reglages.partsDesTypes)), disponiblesParType);
      for (const [type, places] of placesParType) edition.push(...libres.filter((c) => c.index.type === type).slice(0, places));
    }
  }

  return { edition, journal };
}

// Recalcule les notes d'attaque et de défense entre les seules cartes de l'édition.
export function renoterDansLEdition(edition: CarteComplete[]): CarteComplete[] {
  const attaques = notesSurDix(edition.map((c) => c.valeurLettres));
  const defenses = notesSurDix(edition.map((c) => c.richesse));
  return edition.map((c, i) => ({ ...c, index: { ...c.index, attaque: attaques[i], defense: defenses[i] } }));
}
