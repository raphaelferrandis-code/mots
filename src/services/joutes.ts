// Les joutes côté service : le pseudonyme public du joueur, et l'effacement de son profil.
// (Les adversaires, le classement et les joutes elles-mêmes passent par le serveur des combats et des joutes en direct.)
//
// Deux fonctionnements, selon src/config/serveur.ts :
//  • sans serveur (valeurs vides) : le pseudonyme est contrôlé sur l'appareil, face aux « joueurs maison » ;
//  • avec le serveur Supabase : il passe par publier_mon_profil, qui refuse aussi les pseudonymes déjà pris.

import { PSEUDOS_INTERDITS } from '../config/pseudos-interdits.ts';
import { fabriquerLesJoueursMaison } from '../jeu/joueursMaison.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import { cleDuPseudo, examinerLePseudo } from '../jeu/pseudo.ts';
import { chargerEdition } from './cartes.ts';
import { chacunSonTour, clientDuServeur, serveurUtilise } from './compte.ts';
import { quitterLesJoutes, toutEffacer } from './partie.ts';

export type MonProfil = Pick<ProfilDeJoute, 'pseudo' | 'deck' | 'savoirs' | 'parades'>;
export type LigneDeClassement = { rang: number; pseudo: string; cote: number; moi: boolean; maison?: boolean };
export type Publication = { accepte: true; cote: number | null } | { accepte: false; raison: string };

// (Les adversaires, le classement et les joutes elles-mêmes passent par le serveur des combats et des joutes en direct.)
export type ServeurDeJoutes = {
  enLigne: boolean;
  // Fait connaître le profil du joueur (pseudonyme, deck, résultats). Rend sa cote si c'est le serveur qui la tient.
  publier(profil: MonProfil): Promise<Publication>;
  // Cet appareil a-t-il un compte sur le serveur ? (Il peut en rester un alors que la partie a été effacée.)
  aUnCompte(): boolean;
  // Le droit à l'effacement : retire du serveur le profil du joueur, ses joutes, sa collection et son compte anonyme.
  supprimer(compteEntier?: boolean): Promise<void>;
};

// ── Sans serveur : les joueurs maison ──────────────────────────────────────
let joueurs: Promise<ProfilDeJoute[]> | undefined;
const joueursMaison = (): Promise<ProfilDeJoute[]> => (joueurs ??= chargerEdition().then((edition) => fabriquerLesJoueursMaison(edition.cartes)));

const serveurLocal: ServeurDeJoutes = {
  enLigne: false,

  async publier(profil) {
    const verdict = examinerLePseudo(profil.pseudo, PSEUDOS_INTERDITS);
    if (!verdict.accepte) return verdict;
    const pris = (await joueursMaison()).some((p) => cleDuPseudo(p.pseudo) === cleDuPseudo(verdict.pseudo));
    return pris ? { accepte: false, raison: 'Ce pseudonyme est déjà pris.' } : { accepte: true, cote: null };
  },

  aUnCompte: () => false, // sans serveur, rien ne quitte l'appareil
  supprimer: async () => {},
};

// ── Avec le serveur Supabase ───────────────────────────────────────────────
function serveurSupabase(): ServeurDeJoutes {
  const client = clientDuServeur();

  return {
    enLigne: true,

    async publier(profil) {
      // Premier contrôle dans le jeu, pour répondre tout de suite ; le serveur refait le sien, et vérifie que le pseudonyme est libre.
      const verdict = examinerLePseudo(profil.pseudo, PSEUDOS_INTERDITS);
      if (!verdict.accepte) return verdict;
      const reponse = await chacunSonTour(() => client.appeler<{ accepte: boolean; raison?: string; cote?: number }>('publier_mon_profil', { p_pseudo: verdict.pseudo, p_deck: profil.deck, p_savoirs: profil.savoirs, p_parades: profil.parades }));
      return reponse.accepte ? { accepte: true, cote: reponse.cote ?? null } : { accepte: false, raison: reponse.raison ?? "Ce pseudonyme n'est pas accepté." };
    },
    aUnCompte: () => client.aUneSession(),

    // Un appareil sans compte n'a jamais rien envoyé : on n'en ouvre pas un pour le supprimer aussitôt.
    async supprimer(compteEntier = false) {
      if (!client.aUneSession()) return;
      await chacunSonTour(() => client.appeler<null>(compteEntier ? 'supprimer_mon_compte' : 'supprimer_mon_profil'));
      if (compteEntier) client.oublierLaSession();
    },
  };
}

export const serveurDeJoutes: ServeurDeJoutes = serveurUtilise ? serveurSupabase() : serveurLocal;

// Quitter les joutes, ou effacer toute sa partie : le serveur d'abord. S'il ne répond pas, rien n'est effacé
// sur l'appareil, et le joueur peut réessayer — sinon il perdrait le moyen de retirer son profil du classement.
export async function supprimerMonProfilDeJoute(): Promise<void> {
  await serveurDeJoutes.supprimer();
  quitterLesJoutes();
}

export async function effacerLaPartieEtLeProfil(): Promise<void> {
  await serveurDeJoutes.supprimer(true);
  await toutEffacer();
}
