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
// Des adversaires sont trouvés : chacun doit accepter avant « accepterAvant » (heure du serveur) pour que la partie
// commence. Ni noms ni cotes avant d'accepter : on ne choisit pas ses adversaires en refusant les plus forts.
export type PropositionDirecte = { id: string; mode: ModeDirect; accepterAvant: number; acceptes: number; total: number; jAccepte: boolean };
export type ReponseDirect = { maintenant: number; utilisateur: string; attente: { mode: ModeDirect; equipe: string | null; partenairePret: boolean } | null;
  partie: { id: string; revision: number; vue: VueDirect; cotes: { avant: number; apres: number } | null; gains: { xp: number; encre: number; reduite: boolean } } | null;
  // Absente d'un serveur d'avant le match à accepter.
  proposition?: PropositionDirecte | null };
export type ClassementDirect = { lignes: { rang: number; nom: string; cote: number; jouees: number; gagnees: number; moi: boolean }[]; total: number };

// Quand relire l'état des joutes (en millisecondes). Le temps réel du serveur prévient dès qu'une partie, une
// proposition ou la file change pour le joueur ; on relit aussi juste après chaque échéance (fin d'une phase, fin du
// délai pour accepter), car c'est une lecture qui fait avancer la partie, et de temps en temps par sécurité. Sans temps
// réel (connexion coupée), on relit plus souvent. En file, assez souvent pour y garder sa place, même onglet caché
// (EQUILIBRAGE.direct.secondesDePresenceDansLaFile) : avant, le jeu relisait toutes les 2,5 s quoi qu'il arrive.
export const RYTHME_DIRECT = {
  apresEcheance: 400,
  premiereLecture: 5_000,
  enDirect: { partie: 15_000, proposition: 15_000, file: 15_000, repos: 60_000 },
  sansDirect: { partie: 3_000, proposition: 2_000, file: 5_000, repos: 30_000 },
};
export function prochaineLecture(r: ReponseDirect | null, connecte: boolean, heureDuServeur: number): number {
  if (!r) return RYTHME_DIRECT.premiereLecture;
  const rythme = connecte ? RYTHME_DIRECT.enDirect : RYTHME_DIRECT.sansDirect;
  const juste = (echeance: number, auPlus: number) => Math.min(auPlus, Math.max(0, echeance - heureDuServeur) + RYTHME_DIRECT.apresEcheance);
  const v = r.partie?.vue;
  if (v && v.phase !== 'fin') return juste(v.echeance, rythme.partie);
  if (r.proposition) return juste(r.proposition.accepterAvant, rythme.proposition);
  return r.attente ? rythme.file : rythme.repos;
}
