// Le marché vu du jeu : les enchères telles que le serveur les décrit, et les règles pures qui les accompagnent
// (mise minimale, commission, planchers, temps restant, contrôle d'une mise en vente). Les chiffres viennent de
// src/config/equilibrage.ts ; ce qui compte pour de vrai est vérifié une seconde fois par le serveur (serveur/marche.ts).

import type { EQUILIBRAGE } from '../config/equilibrage.ts';
import { FINITIONS } from '../partage/types.ts';
import type { Finition, Rarete } from '../partage/types.ts';

export type ReglesDuMarche = typeof EQUILIBRAGE.marche;

export type EtatDEnchere = 'ouverte' | 'vendue' | 'invendue' | 'retiree';

export type Enchere = {
  id: number;
  carte: string;
  finition: Finition;
  vendeur: string; // le pseudonyme du vendeur
  mienne: boolean; // c'est ma vente
  miseDeDepart: number;
  achatImmediat: number | null;
  meilleureMise: number | null;
  enTete: boolean; // ma mise est la meilleure
  fermeLe: number; // millisecondes
  etat: EtatDEnchere;
  prixFinal: number | null;
  acheteur: string | null; // le pseudonyme de l'acheteur, une fois vendue
  remportee: boolean; // c'est moi qui l'ai remportée
  cote: number | null; // la cote du jour du timbre dans cette finition (décision n° 38), s'il en a une
  clotureeLe: number | null;
};

const estUnObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nombre = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const nombreOuNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const ETATS: EtatDEnchere[] = ['ouverte', 'vendue', 'invendue', 'retiree'];

// Relit une enchère envoyée par le serveur ; une enchère illisible est ignorée (null).
export function lireEnchere(brut: unknown): Enchere | null {
  if (!estUnObjet(brut) || typeof brut.id !== 'number' || typeof brut.carte !== 'string') return null;
  const finition = FINITIONS.find((f) => f === brut.finition) ?? 'Normale';
  const etat = ETATS.find((e) => e === brut.etat) ?? 'ouverte';
  return {
    id: brut.id,
    carte: brut.carte,
    finition,
    vendeur: typeof brut.vendeur === 'string' ? brut.vendeur : 'Un collectionneur',
    mienne: brut.mienne === true,
    miseDeDepart: nombre(brut.miseDeDepart),
    achatImmediat: nombreOuNull(brut.achatImmediat),
    meilleureMise: nombreOuNull(brut.meilleureMise),
    enTete: brut.enTete === true,
    fermeLe: nombre(brut.fermeLe),
    etat,
    prixFinal: nombreOuNull(brut.prixFinal),
    acheteur: typeof brut.acheteur === 'string' ? brut.acheteur : null,
    remportee: brut.remportee === true,
    cote: nombreOuNull(brut.cote),
    clotureeLe: nombreOuNull(brut.cloturee_le ?? brut.clotureeLe),
  };
}

export const lireDesEncheres = (brut: unknown): Enchere[] => (Array.isArray(brut) ? brut.flatMap((e) => lireEnchere(e) ?? []) : []);

// Le prix affiché d'une enchère en cours : la meilleure mise, sinon la mise de départ.
export const prixActuel = (enchere: Enchere): number => enchere.meilleureMise ?? enchere.miseDeDepart;

// La mise qu'il faut au moins proposer (même règle que le serveur).
export function miseMinimale(enchere: Enchere, regles: ReglesDuMarche): number {
  if (enchere.meilleureMise === null) return enchere.miseDeDepart;
  return Math.min(enchere.achatImmediat ?? Infinity, enchere.meilleureMise + Math.max(1, Math.ceil(enchere.meilleureMise * regles.surencherMinimale)));
}

// Ce que le vendeur reçoit : le prix moins la commission, qui disparaît.
export const commissionSur = (prix: number, regles: ReglesDuMarche): number => Math.ceil(prix * regles.commission);
export const vendeurRecoit = (prix: number, regles: ReglesDuMarche): number => prix - commissionSur(prix, regles);

export const plancherPour = (rarete: Rarete, regles: ReglesDuMarche): number => regles.planchers[rarete];

// Le temps qui reste, en clair : « 2 j 3 h », « 5 h 12 min », « 3 min », « moins d'une minute », « terminée ».
export function tempsRestant(fermeLe: number, maintenant: number): string {
  const reste = fermeLe - maintenant;
  if (reste <= 0) return 'terminée';
  const minutes = Math.floor(reste / 60_000);
  if (minutes < 1) return "moins d'une minute";
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `${heures} h ${String(minutes % 60).padStart(2, '0')} min`;
  return heures % 24 === 0 ? `${heures / 24} j` : `${Math.floor(heures / 24)} j ${heures % 24} h`;
}

// Où en est une de mes enchères (une vente à moi, ou une mise sur celle d'un autre), en un mot clair (audit de finition
// du 26/09/2026, chantier 7 : « Mes enchères » en tête, avec des états nets). Le ton colore l'étiquette.
export type StatutDEnchere = {
  cle: 'depassee' | 'en-tete' | 'en-vente' | 'remportee' | 'vendue' | 'invendue' | 'perdue' | 'retiree' | 'annulee';
  libelle: string; ton: 'alerte' | 'bon' | 'neutre' | 'fini';
};
export function statutDeMonEnchere(e: Enchere): StatutDEnchere {
  if (e.mienne) {
    if (e.etat === 'ouverte') return { cle: 'en-vente', libelle: 'En vente', ton: 'neutre' };
    if (e.etat === 'vendue') return { cle: 'vendue', libelle: 'Vendue', ton: 'bon' };
    if (e.etat === 'invendue') return { cle: 'invendue', libelle: 'Invendue', ton: 'fini' };
    return { cle: 'retiree', libelle: 'Retirée', ton: 'fini' };
  }
  if (e.etat === 'ouverte') return e.enTete ? { cle: 'en-tete', libelle: 'En tête', ton: 'bon' } : { cle: 'depassee', libelle: 'Dépassée', ton: 'alerte' };
  if (e.etat === 'vendue') return e.remportee ? { cle: 'remportee', libelle: 'Remportée', ton: 'bon' } : { cle: 'perdue', libelle: 'Perdue', ton: 'fini' };
  return { cle: 'annulee', libelle: 'Annulée', ton: 'fini' };
}

// Mes enchères dans l'ordre où elles demandent de l'attention : dépassées, en cours, puis terminées (les plus récentes
// d'abord). Une enchère ne paraît qu'une fois, même si elle figure dans mes ventes et dans mes mises.
const ORDRE_DES_STATUTS: StatutDEnchere['cle'][] = ['depassee', 'en-tete', 'en-vente', 'remportee', 'vendue', 'invendue', 'perdue', 'retiree', 'annulee'];
export function mesEncheresEnOrdre(ventes: readonly Enchere[], mises: readonly Enchere[]): Enchere[] {
  const vues = new Set<number>();
  const toutes = [...ventes, ...mises].filter((e) => (vues.has(e.id) ? false : (vues.add(e.id), true)));
  const rang = (e: Enchere): number => ORDRE_DES_STATUTS.indexOf(statutDeMonEnchere(e).cle);
  const quand = (e: Enchere): number => (e.etat === 'ouverte' ? e.fermeLe : -(e.clotureeLe ?? e.fermeLe));
  return toutes.sort((a, b) => rang(a) - rang(b) || quand(a) - quand(b));
}

export type MiseEnVente = { rarete: Rarete; mise: number; achatImmediat: number | null; heures: number };

// Ce qui cloche dans une mise en vente, dit au joueur avant d'appeler le serveur ; null si tout va bien.
export function verifierLaMiseEnVente(v: MiseEnVente, regles: ReglesDuMarche): string | null {
  const plancher = plancherPour(v.rarete, regles);
  if (!Number.isInteger(v.mise) || v.mise < plancher) return `La mise de départ d'un timbre ${v.rarete.toLowerCase()} est d'au moins ${plancher} Encre.`;
  if (v.achatImmediat !== null && (!Number.isInteger(v.achatImmediat) || v.achatImmediat < v.mise)) return "Le prix d'achat immédiat ne peut pas être plus bas que la mise de départ.";
  if (!regles.dureesEnHeures.includes(v.heures)) return `La durée doit être de ${regles.dureesEnHeures.join(', ')} heures.`;
  if (v.mise > 1_000_000 || (v.achatImmediat ?? 0) > 1_000_000) return 'Ce prix est déraisonnable.';
  return null;
}
