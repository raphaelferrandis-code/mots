// La cote d'un timbre (BRIEF-marche.md, brique E ; décision n° 38), telle que le serveur la décrit : par finition, la
// médiane des prix de ses ventes des derniers jours, relevée une fois par jour (serveur/marche.ts). Tout le monde voit
// la cote du jour ; la version payante voit son histoire : la série jour par jour, les dernières ventes, les
// statistiques. Fonctions pures : relecture de ce que le serveur envoie, texte en clair, courbe prête à dessiner.

import { FINITIONS } from '../partage/types.ts';
import type { Finition } from '../partage/types.ts';

export type CoteDeFinition = { finition: Finition; cote: number; ventes: number }; // ventes : celles qui ont compté
export type CotesDUnTimbre = { jour: string | null; cotes: CoteDeFinition[] }; // jour du relevé : « 2026-09-22 »
export type PointDeCote = { jour: string; finition: Finition; cote: number; ventes: number };
export type VenteConclue = { quand: number; finition: Finition; prix: number };
export type StatistiqueDeFinition = { finition: Finition; mini: number; maxi: number; nombre: number };
export type HistoireDeLaCote = { serie: PointDeCote[]; ventes: VenteConclue[]; stats: StatistiqueDeFinition[] };

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nombre = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const finitionDe = (v: unknown): Finition | null => FINITIONS.find((f) => f === v) ?? null;
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// Relit les cotes d'un timbre ; une ligne illisible ou sans cote est ignorée.
export function lireCotes(brut: unknown): CotesDUnTimbre {
  const lu = estUnObjet(brut) ? brut : {};
  const cotes = liste(lu.cotes).flatMap((c): CoteDeFinition[] => {
    if (!estUnObjet(c)) return [];
    const finition = finitionDe(c.finition);
    return finition && nombre(c.cote) > 0 ? [{ finition, cote: nombre(c.cote), ventes: nombre(c.ventes) }] : [];
  });
  // Dans l'ordre des finitions du jeu (normale, brillante, holographique), pas dans celui de l'alphabet.
  cotes.sort((a, b) => FINITIONS.indexOf(a.finition) - FINITIONS.indexOf(b.finition));
  return { jour: typeof lu.jour === 'string' ? lu.jour : null, cotes };
}

// Relit l'histoire d'une cote (version payante).
export function lireHistoire(brut: unknown): HistoireDeLaCote {
  const lu = estUnObjet(brut) ? brut : {};
  const serie = liste(lu.serie).flatMap((p): PointDeCote[] => {
    if (!estUnObjet(p) || typeof p.jour !== 'string') return [];
    const finition = finitionDe(p.finition);
    return finition && nombre(p.cote) > 0 ? [{ jour: p.jour, finition, cote: nombre(p.cote), ventes: nombre(p.ventes) }] : [];
  });
  const ventes = liste(lu.ventes).flatMap((v): VenteConclue[] => {
    if (!estUnObjet(v) || typeof v.quand !== 'number') return [];
    const finition = finitionDe(v.finition);
    return finition && nombre(v.prix) > 0 ? [{ quand: v.quand, finition, prix: nombre(v.prix) }] : [];
  });
  const stats = liste(lu.stats).flatMap((s): StatistiqueDeFinition[] => {
    if (!estUnObjet(s)) return [];
    const finition = finitionDe(s.finition);
    return finition ? [{ finition, mini: nombre(s.mini), maxi: nombre(s.maxi), nombre: nombre(s.nombre) }] : [];
  });
  stats.sort((a, b) => FINITIONS.indexOf(a.finition) - FINITIONS.indexOf(b.finition));
  return { serie, ventes, stats };
}

export const coteDe = (cotes: CotesDUnTimbre, finition: Finition): CoteDeFinition | null => cotes.cotes.find((c) => c.finition === finition) ?? null;

// Les cotes en clair : « 120 Encre · brillante 300 Encre » (la finition normale va sans dire) ; null s'il n'y en a aucune.
export function decrireLesCotes(cotes: CotesDUnTimbre): string | null {
  if (cotes.cotes.length === 0) return null;
  return cotes.cotes.map((c) => (c.finition === 'Normale' ? `${c.cote} Encre` : `${c.finition.toLowerCase()} ${c.cote} Encre`)).join(' · ');
}

// La courbe d'une finition, prête pour un dessin : des points dans un cadre largeur × hauteur (l'axe du temps est
// commun à toutes les finitions du timbre), et l'échelle des prix. Une cote constante se dessine à mi-hauteur.
export type Courbe = { points: { x: number; y: number; jour: string; cote: number }[]; mini: number; maxi: number };
export function tracerLaCourbe(serie: PointDeCote[], finition: Finition, largeur: number, hauteur: number): Courbe | null {
  const jours = [...new Set(serie.map((p) => p.jour))].sort();
  const siens = serie.filter((p) => p.finition === finition).sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));
  if (siens.length === 0) return null;
  const mini = Math.min(...siens.map((p) => p.cote));
  const maxi = Math.max(...siens.map((p) => p.cote));
  const x = (jour: string): number => (jours.length < 2 ? largeur / 2 : (jours.indexOf(jour) / (jours.length - 1)) * largeur);
  const y = (cote: number): number => (maxi === mini ? hauteur / 2 : hauteur - ((cote - mini) / (maxi - mini)) * hauteur);
  return { points: siens.map((p) => ({ x: x(p.jour), y: y(p.cote), jour: p.jour, cote: p.cote })), mini, maxi };
}
