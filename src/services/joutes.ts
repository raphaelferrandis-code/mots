// Les joutes côté service : d'où viennent les adversaires, le classement, et qui tient la cote du joueur.
//
// Deux fonctionnements, selon src/config/serveur.ts :
//  • sans serveur (valeurs vides) : les adversaires sont les « joueurs maison » fabriqués par le jeu, et la cote du
//    joueur est calculée et rangée sur son appareil ;
//  • avec le serveur Supabase : tout passe par les fonctions de serveur/1-structure.sql. C'est alors le serveur qui
//    tient la cote, choisit les adversaires et refuse les pseudonymes déjà pris.
// Les écrans et les règles (src/jeu/joute.ts) sont les mêmes dans les deux cas.

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { PSEUDOS_INTERDITS } from '../config/pseudos-interdits.ts';
import { hasardDuSysteme } from '../jeu/hasard.ts';
import { fabriquerLesJoueursMaison, pseudonymeAuHasard } from '../jeu/joueursMaison.ts';
import { proposerDesAdversaires, rangDansLeClassement } from '../jeu/joute.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import type { Resultat } from '../jeu/progression.ts';
import { cleDuPseudo, examinerLePseudo } from '../jeu/pseudo.ts';
import { chargerEdition } from './cartes.ts';
import { chacunSonTour, clientDuServeur, serveurUtilise } from './compte.ts';
import { quitterLesJoutes, toutEffacer } from './partie.ts';

const REGLES = EQUILIBRAGE.joute;

export type MonProfil = Pick<ProfilDeJoute, 'pseudo' | 'deck' | 'savoirs' | 'parades'>;
export type LigneDeClassement = { rang: number; pseudo: string; cote: number; moi: boolean; maison?: boolean };
export type Classement = { joueurs: number; rang: number; tete: LigneDeClassement[]; voisins: LigneDeClassement[] };
export type Publication = { accepte: true; cote: number | null } | { accepte: false; raison: string };
// La fin d'une joute vue par le serveur : la cote avant et après ; et l'Encre versée, quand il tient aussi la collection.
export type FinDeJouteDuServeur = { avant: number; apres: number; encre?: number; reduite?: boolean };

export type ServeurDeJoutes = {
  enLigne: boolean;
  // Fait connaître le profil du joueur (pseudonyme, deck, résultats). Rend sa cote si c'est le serveur qui la tient.
  publier(profil: MonProfil): Promise<Publication>;
  adversaires(cote: number, recents: readonly string[]): Promise<ProfilDeJoute[]>;
  // Début et fin d'une joute. Sans serveur, il n'y a ni ticket ni cote imposée : le jeu calcule lui-même.
  commencer(adversaire: ProfilDeJoute): Promise<number | null>;
  terminer(ticket: number | null, resultat: Resultat): Promise<FinDeJouteDuServeur | null>;
  classement(pseudo: string, cote: number): Promise<Classement>;
  // Cet appareil a-t-il un compte sur le serveur ? (Il peut en rester un alors que la partie a été effacée.)
  aUnCompte(): boolean;
  // Le droit à l'effacement : retire du serveur le profil du joueur, ses joutes, sa collection et son compte anonyme.
  supprimer(): Promise<void>;
};

export async function tirerUnPseudonyme(): Promise<string> {
  return pseudonymeAuHasard((await chargerEdition()).cartes, hasardDuSysteme);
}

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

  async adversaires(cote, recents) {
    return proposerDesAdversaires(await joueursMaison(), cote, recents, hasardDuSysteme, REGLES);
  },

  commencer: async () => null,
  terminer: async () => null,
  aUnCompte: () => false, // sans serveur, rien ne quitte l'appareil
  supprimer: async () => {},

  async classement(pseudo, cote) {
    const autres = await joueursMaison();
    const rang = rangDansLeClassement(autres.map((p) => p.cote), cote);
    const tous: LigneDeClassement[] = [...autres.map((p) => ({ pseudo: p.pseudo, cote: p.cote, moi: false, maison: p.maison === true })), { pseudo, cote, moi: true, maison: false }]
      // À cote égale, le joueur est placé devant : son rang est celui de « rangDansLeClassement ».
      .sort((a, b) => b.cote - a.cote || Number(b.moi) - Number(a.moi))
      .map((ligne, i) => ({ ...ligne, rang: i + 1 }));
    return { joueurs: tous.length, rang, tete: tous.slice(0, 10), voisins: tous.slice(Math.max(0, rang - 3), rang + 2) };
  },
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

    adversaires: () => client.appeler<ProfilDeJoute[]>('adversaires'),
    commencer: (adversaire) => client.appeler<number>('commencer_une_joute', { p_adversaire: adversaire.id }),
    terminer: (ticket, resultat) => chacunSonTour(() => client.appeler<FinDeJouteDuServeur>('terminer_une_joute', { p_ticket: ticket, p_resultat: resultat })),
    classement: () => client.appeler<Classement>('classement'),
    aUnCompte: () => client.aUneSession(),

    // Un appareil sans compte n'a jamais rien envoyé : on n'en ouvre pas un pour le supprimer aussitôt.
    async supprimer() {
      if (!client.aUneSession()) return;
      await chacunSonTour(() => client.appeler<null>('supprimer_mon_profil'));
      client.oublierLaSession();
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
  await serveurDeJoutes.supprimer();
  await toutEffacer();
}
