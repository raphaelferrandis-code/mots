// Les joutes côté service : d'où viennent les adversaires, le classement, et qui tient la cote du joueur.
//
// Deux fonctionnements, selon src/config/serveur.ts :
//  • sans serveur (valeurs vides) : les adversaires sont les « joueurs maison » fabriqués par le jeu, et la cote du
//    joueur est calculée et rangée sur son appareil ;
//  • avec le serveur Supabase : tout passe par les fonctions de serveur/supabase.sql. C'est alors le serveur qui
//    tient la cote, choisit les adversaires et refuse les pseudonymes déjà pris.
// Les écrans et les règles (src/jeu/joute.ts) sont les mêmes dans les deux cas.

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { PSEUDOS_INTERDITS } from '../config/pseudos-interdits.ts';
import { SERVEUR } from '../config/serveur.ts';
import { hasardDuSysteme } from '../jeu/hasard.ts';
import { fabriquerLesJoueursMaison, pseudonymeAuHasard } from '../jeu/joueursMaison.ts';
import { proposerDesAdversaires, rangDansLeClassement } from '../jeu/joute.ts';
import type { ProfilDeJoute } from '../jeu/joute.ts';
import type { Resultat } from '../jeu/progression.ts';
import { cleDuPseudo, examinerLePseudo } from '../jeu/pseudo.ts';
import { chargerEdition } from './cartes.ts';
import { creerLeClient } from './supabase.ts';
import type { Session } from './supabase.ts';

const REGLES = EQUILIBRAGE.joute;

export type MonProfil = Pick<ProfilDeJoute, 'pseudo' | 'deck' | 'savoirs' | 'parades'>;
export type LigneDeClassement = { rang: number; pseudo: string; cote: number; moi: boolean };
export type Classement = { joueurs: number; rang: number; tete: LigneDeClassement[]; voisins: LigneDeClassement[] };
export type Publication = { accepte: true; cote: number | null } | { accepte: false; raison: string };

export type ServeurDeJoutes = {
  enLigne: boolean;
  // Fait connaître le profil du joueur (pseudonyme, deck, résultats). Rend sa cote si c'est le serveur qui la tient.
  publier(profil: MonProfil): Promise<Publication>;
  adversaires(cote: number, recents: readonly string[]): Promise<ProfilDeJoute[]>;
  // Début et fin d'une joute. Sans serveur, il n'y a ni ticket ni cote imposée : le jeu calcule lui-même.
  commencer(adversaire: ProfilDeJoute): Promise<number | null>;
  terminer(ticket: number | null, resultat: Resultat): Promise<{ avant: number; apres: number } | null>;
  classement(pseudo: string, cote: number): Promise<Classement>;
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

  async classement(pseudo, cote) {
    const autres = await joueursMaison();
    const rang = rangDansLeClassement(autres.map((p) => p.cote), cote);
    const tous: LigneDeClassement[] = [...autres.map((p) => ({ pseudo: p.pseudo, cote: p.cote, moi: false })), { pseudo, cote, moi: true }]
      // À cote égale, le joueur est placé devant : son rang est celui de « rangDansLeClassement ».
      .sort((a, b) => b.cote - a.cote || Number(b.moi) - Number(a.moi))
      .map((ligne, i) => ({ ...ligne, rang: i + 1 }));
    return { joueurs: tous.length, rang, tete: tous.slice(0, 10), voisins: tous.slice(Math.max(0, rang - 3), rang + 2) };
  },
};

// ── Avec le serveur Supabase ───────────────────────────────────────────────
const CLE_DE_SESSION = 'mots.session';

function serveurSupabase(): ServeurDeJoutes {
  const client = creerLeClient(SERVEUR.adresse, SERVEUR.clePublique, {
    requete: (...args) => fetch(...args),
    maintenant: () => Date.now(),
    lireLaSession: () => { try { return JSON.parse(localStorage.getItem(CLE_DE_SESSION) ?? 'null') as Session | null; } catch { return null; } },
    ecrireLaSession: (session) => { try { if (session) localStorage.setItem(CLE_DE_SESSION, JSON.stringify(session)); else localStorage.removeItem(CLE_DE_SESSION); } catch { /* stockage indisponible : la session vaut pour cette visite */ } },
  });

  return {
    enLigne: true,

    async publier(profil) {
      // Premier contrôle dans le jeu, pour répondre tout de suite ; le serveur refait le sien, et vérifie que le pseudonyme est libre.
      const verdict = examinerLePseudo(profil.pseudo, PSEUDOS_INTERDITS);
      if (!verdict.accepte) return verdict;
      const reponse = await client.appeler<{ accepte: boolean; raison?: string; cote?: number }>('publier_mon_profil', { p_pseudo: verdict.pseudo, p_deck: profil.deck, p_savoirs: profil.savoirs, p_parades: profil.parades });
      return reponse.accepte ? { accepte: true, cote: reponse.cote ?? null } : { accepte: false, raison: reponse.raison ?? "Ce pseudonyme n'est pas accepté." };
    },

    adversaires: () => client.appeler<ProfilDeJoute[]>('adversaires'),
    commencer: (adversaire) => client.appeler<number>('commencer_une_joute', { p_adversaire: adversaire.id }),
    terminer: (ticket, resultat) => client.appeler<{ avant: number; apres: number }>('terminer_une_joute', { p_ticket: ticket, p_resultat: resultat }),
    classement: () => client.appeler<Classement>('classement'),
  };
}

export const serveurDeJoutes: ServeurDeJoutes = SERVEUR.adresse !== '' && SERVEUR.clePublique !== '' ? serveurSupabase() : serveurLocal;
