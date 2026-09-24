// Contrat public du combat. Les réponses correctes ne sont présentes qu'après correction.
import type { CarteIndex, Registre } from '../partage/types.ts';
import type { Duel, Niveau } from './duel.ts';
import type { Epreuve } from './epreuve.ts';
import type { ProfilDeJoute } from './joute.ts';
import type { Resultat } from './progression.ts';
import type { TempsDeReponse } from './sauvegarde.ts';
import type { EtatDuCompte } from './synchronisation.ts';

export type AdversaireCombat = { type: 'entrainement'; niveau: Niveau } | { type: 'joute'; profil: ProfilDeJoute; amical?: boolean };
export type ReponseCombat = { epreuve: Epreuve; choisie: number | null; juste: boolean; maitrise: boolean };
export type EtapeCombat =
  | { nom: 'choix'; adverse: CarteIndex; choisie: string | null }
  | { nom: 'reprise' } // une ancienne manche doit passer à la nouvelle épreuve de parade
  | { nom: 'parade'; adverse: CarteIndex; carte: CarteIndex; epreuve: Epreuve; debut: number }
  | { nom: 'bilan'; adverse: CarteIndex; carte: CarteIndex; parade: ReponseCombat; apres: Duel }
  | { nom: 'fin'; resultat: Resultat; abandonne: boolean; expire: boolean };
export type ChoixCombat = { mode: 'entrainement'; niveau: Niveau; masques: Registre[]; temps: TempsDeReponse }
  | { mode: 'joute' | 'amical'; adversaire: string; masques: Registre[]; temps: TempsDeReponse };
export type ActionCombat = { type: 'choisir'; carte: string } | { type: 'repondre'; choisie: number | null }
  | { type: 'continuer' } | { type: 'abandonner' } | { type: 'quitter' };
export type RequeteCombat = { type: 'lire' }
  | { type: 'commencer'; requete: string; choix: ChoixCombat }
  | { type: 'agir'; requete: string; combat: string; revision: number; action: ActionCombat };
export type VueCombat = {
  duel: Duel; etape: EtapeCombat; adversaire: AdversaireCombat; temps: TempsDeReponse;
  creeLe: number; expireLe: number; termine: boolean;
  bilan: { attaques: number; attaquesReussies: number; parades: number; paradesReussies: number; maitrises: string[] };
};
export type CombatEnLigne = {
  id: string; revision: number; vue: VueCombat; xp: number;
  recompense: { encre: number; reduite: boolean; cote: { avant: number; apres: number } | null } | null;
};
export type ReponseServeurCombat = { combat: CombatEnLigne | null; etat: EtatDuCompte };
