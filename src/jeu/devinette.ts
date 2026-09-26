// La devinette du jour : un mot du calendrier (data/mot-du-jour.txt) par jour, posé une fois sur deux
//   · « definition » : on voit le mot, on retrouve sa définition parmi quatre (comme la parade des duels) ;
//   · « mot » : on lit la définition et quelques indices, on retrouve le mot.
// La réponse paraît le lendemain sur les réseaux sociaux, tout de suite sur l'accueil du jeu, où les bonnes réponses
// d'affilée font une série. Fonctions pures : le calendrier, les définitions et la date sont fournis par l'appelant.

import { sansAccents } from '../partage/lettres.ts';
import type { CarteIndex } from '../partage/types.ts';
import { composerLEpreuve } from './epreuve.ts';
import type { Definitions } from './epreuve.ts';
import { hasardReproductible } from './hasard.ts';

export type Devinette =
  | { format: 'definition'; id: string; mot: string; propositions: string[]; bonne: number }
  | { format: 'mot'; id: string; mot: string; definition: string; nature: CarteIndex['type']; lettres: number; initiale: string; origine: string };

export type Devinettes = { debut: string | null; jours: Devinette[] };

// Le nombre de lettres d'un mot, sans ses traits d'union ni ses espaces.
export const lettresDuMot = (mot: string): number => [...mot.replace(/[-\s']/g, '')].length;

// Un jour sur deux, en commençant par la définition à retrouver (la plus facile) : jour 0, 2, 4… ; le mot : 1, 3, 5…
export function composerLesDevinettes(ids: readonly string[], edition: readonly CarteIndex[], definitions: Definitions, origines: ReadonlyMap<string, string>): Devinette[] {
  const parId = new Map(edition.map((c) => [c.id, c]));
  return ids.map((id, jour) => {
    const carte = parId.get(id);
    if (!carte) throw new Error(`Mot du jour inconnu : ${id}`);
    // Une graine par mot : la devinette d'un mot ne change pas quand on retouche le calendrier autour de lui.
    let graine = 0;
    for (const lettre of id) graine = Math.imul(graine ^ lettre.charCodeAt(0), 16777619);
    // Les leurres évitent les mots injurieux : la devinette part sur les réseaux sociaux.
    // Le premier tirage choisit la bonne définition parmi celles du mot : on le force à 0, pour garder le sens
    // principal (« abstrus » : « Difficile à comprendre », pas « S'applique quelquefois aux personnes »).
    const suite = hasardReproductible(graine);
    let premier = true;
    const hasard = (): number => { if (premier) { premier = false; return 0; } return suite(); };
    const epreuve = composerLEpreuve(carte, definitions, edition, ['Injurieux'], hasard);
    const bonne = epreuve.propositions[epreuve.bonne];
    if (jour % 2 === 0) return { format: 'definition', id, mot: carte.mot, propositions: epreuve.propositions, bonne: epreuve.bonne };
    return {
      format: 'mot', id, mot: carte.mot, definition: bonne, nature: carte.type,
      lettres: lettresDuMot(carte.mot), initiale: sansAccents(carte.mot)[0].toUpperCase(), origine: origines.get(id) ?? '',
    };
  });
}

// « Venu du latin », « venu de l'ancien français » : l'indice d'origine, en minuscules, avec son article.
export function venuDe(langue: string): string {
  const nom = langue.charAt(0).toLowerCase() + langue.slice(1);
  return /^(onomatopée|formation)/i.test(langue) ? nom : `venu ${/^[aeiouéèêh]/i.test(nom) ? 'de l’' : 'du '}${nom}`;
}

// La définition que la devinette a retenue (celle que la réponse doit montrer).
export const bonneDefinition = (d: Devinette): string => d.format === 'definition' ? d.propositions[d.bonne] : d.definition;

// Le jour, à l'heure de Paris : la devinette change à minuit pour tout le monde en France.
export function jourAParis(instant: number): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

// Le rang du jour dans le calendrier, ou null avant le premier jour et après le dernier.
export function rangDuJour(debut: string | null, jour: string, nombre: number): number | null {
  if (!debut) return null;
  const rang = Math.round((Date.parse(`${jour}T12:00:00Z`) - Date.parse(`${debut}T12:00:00Z`)) / 86_400_000);
  return rang >= 0 && rang < nombre ? rang : null;
}

// Une réponse tapée compte si elle donne le mot, sans tenir compte des accents, des majuscules ni des espaces autour.
export const bonMot = (saisie: string, mot: string): boolean => sansAccents(saisie.trim()).replace(/\s+/g, ' ') === sansAccents(mot);

// Pour le mot à trouver, trois essais : une faute de frappe ne coûte pas la série.
export const ESSAIS_POUR_LE_MOT = 3;

// ── La série ────────────────────────────────────────────────────────────────────────────────────────
// Rangée sur l'appareil (services/devinette.ts). Une seule réponse par jour : la première compte.

// « choix » : la réponse donnée ce jour-là (la lettre, ou le mot tapé), pour la remontrer si l'on revient sur l'accueil.
export type Serie = { jour: string | null; juste: boolean; choix: string | null; serie: number; meilleure: number };
export const SERIE_VIERGE: Serie = { jour: null, juste: false, choix: null, serie: 0, meilleure: 0 };

const veilleDe = (jour: string): string => new Date(Date.parse(`${jour}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export function repondre(etat: Serie, jour: string, juste: boolean, choix: string | null = null): Serie {
  if (etat.jour === jour) return etat;
  const serie = juste ? (etat.jour === veilleDe(jour) && etat.juste ? etat.serie + 1 : 1) : 0;
  return { jour, juste, choix, serie, meilleure: Math.max(etat.meilleure, serie) };
}

// La série telle qu'on l'affiche : elle tombe à zéro si le joueur a laissé passer un jour sans répondre.
export function serieEnCours(etat: Serie, aujourdhui: string): number {
  if (!etat.juste || !etat.jour) return 0;
  return etat.jour === aujourdhui || etat.jour === veilleDe(aujourdhui) ? etat.serie : 0;
}
