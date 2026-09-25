import { chacunSonTour, clientDuServeur } from './compte.ts';
import type { Apparence } from './amis.ts';
import type { ClientSupabase } from './supabase.ts';

export const EMBLEMES = [
  { id: 'plume', signe: '✒', nom: 'Plume' }, { id: 'etoile', signe: '✦', nom: 'Étoile' },
  { id: 'feuille', signe: '❧', nom: 'Feuille' }, { id: 'eclair', signe: 'ϟ', nom: 'Éclair' },
  { id: 'lune', signe: '☾', nom: 'Lune' }, { id: 'soleil', signe: '☼', nom: 'Soleil' },
] as const;
export type Embleme = typeof EMBLEMES[number]['id'];
export type Equipe = { id: string; nom: string; embleme: Embleme; cote?: number | null;
  membres: (Apparence & { id: string; pseudo: string; capitaine: boolean })[];
  invitation: { id: string; pseudo: string; expire_le: number } | null };
export type MonEquipe = { moi: string | null; equipe: Equipe | null;
  invitations: { id: string; nom: string; embleme: Embleme; capitaine: string; expire_le: number }[];
  amis: { id: string; pseudo: string }[] };

export function serveurEquipesAvec(client: ClientSupabase) {
  const modifier = (nom: string, args: Record<string, unknown>) => chacunSonTour(() => client.appeler<void>(nom, args));
  return {
    lire: () => client.appeler<MonEquipe>('mon_equipe'),
    creer: (id: string, nom: string, embleme: Embleme) => modifier('creer_equipe', { p_id: id, p_nom: nom.trim(), p_embleme: embleme }),
    modifier: (id: string, nom: string, embleme: Embleme) => modifier('modifier_equipe', { p_equipe: id, p_nom: nom.trim(), p_embleme: embleme }),
    inviter: (equipe: string, ami: string) => modifier('inviter_equipier', { p_equipe: equipe, p_ami: ami }),
    repondre: (id: string, action: 'accepter' | 'refuser' | 'annuler') => modifier('repondre_invitation_equipe', { p_id: id, p_action: action }),
    quitter: (id: string) => modifier('quitter_equipe', { p_equipe: id }),
    dissoudre: (id: string) => modifier('dissoudre_equipe', { p_equipe: id }),
  };
}
export const serveurEquipes = () => serveurEquipesAvec(clientDuServeur());
