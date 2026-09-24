import type { CarteIndex } from '../partage/types.ts';

export const MODES_DIRECTS = ['solo', 'duo_solo', 'duo_equipe'] as const;
export type ModeDirect = typeof MODES_DIRECTS[number];
export const NOMS_DIRECTS: Record<ModeDirect, string> = { solo: 'Solo', duo_solo: '2v2 solo', duo_equipe: '2v2 équipe' };
export const TEMPS_DIRECT = { pose: 8_000, reponses: 30_000, arbitrage: 5_000, bilan: 4_000 };
export type PhaseDirect = 'pose' | 'reponses' | 'arbitrage' | 'bilan' | 'fin';
export type ActionDirect =
  | { type: 'poser'; carte: string; voie: number }
  | { type: 'proposer'; cible: number; choix: number }
  | { type: 'trancher'; cible: number; choix: number }
  | { type: 'abandonner' };
export type JoueurDirect = { pseudo: string; equipe: number; main: CarteIndex[]; restantes: number; derniere: CarteIndex | null };
export type PoseDirect = { joueur: number; voie: number; carte: CarteIndex };
export type QuestionDirect = { cible: number; mot: string; propositions: string[]; reponses: Record<number, number>; decision: number | null; desaccord: boolean };
export type BilanDirect = { joueur: number; mot: string; voie: number; degats: number; paree: boolean; bonne: string; choisie: string | null };
export type VueDirect = {
  mode: ModeDirect; manche: number; phase: PhaseDirect; echeance: number; moi: number;
  joueurs: JoueurDirect[]; noms: string[]; pv: number[]; ordre: number[]; arbitres: number[];
  poses: PoseDirect[]; questions: QuestionDirect[]; bilan: BilanDirect[];
  vainqueur: number | 'nul' | null; raison: string | null;
};
export type ReponseDirect = { maintenant: number; utilisateur: string; attente: { mode: ModeDirect; equipe: string | null; partenairePret: boolean } | null;
  partie: { id: string; revision: number; vue: VueDirect; cotes: { avant: number; apres: number } | null; gains: { xp: number; encre: number; reduite: boolean } } | null };
export type ClassementDirect = { lignes: { rang: number; nom: string; cote: number; jouees: number; gagnees: number; moi: boolean }[]; total: number };
