import { PSEUDOS_INTERDITS } from '../config/pseudos-interdits.ts';
import { examinerLePseudo } from '../jeu/pseudo.ts';
import type { Sauvegarde } from '../jeu/sauvegarde.ts';
import type { MonProfil, Publication } from './joutes.ts';

export const pseudoDuJoueur = (s: Sauvegarde): string => s.profil.pseudo || s.joutes.pseudo;

// Prépare une seule identité. Pour un joueur inscrit, l'acceptation du serveur
// précède toujours l'enregistrement local : un refus ne change aucun des deux noms.
export async function verifierIdentite(s: Sauvegarde, saisie: string, rejoindre: boolean, publier: (p: MonProfil) => Promise<Publication>) {
  const verdict = examinerLePseudo(saisie, PSEUDOS_INTERDITS);
  if (!verdict.accepte) throw new Error(verdict.raison);
  const publique = rejoindre || s.joutes.pseudo !== '';
  if (!publique) return { pseudo: verdict.pseudo, publique, cote: null };
  const savoirs: MonProfil['savoirs'] = {};
  for (const id of s.deck) {
    const carte = s.cartes[id];
    if (carte) savoirs[id] = { posees: carte.posees, reussies: carte.reussites };
  }
  const resultat = await publier({ pseudo: verdict.pseudo, deck: s.deck, savoirs, parades: s.parades });
  if (!resultat.accepte) throw new Error(resultat.raison);
  return { pseudo: verdict.pseudo, publique, cote: resultat.cote };
}

export function appliquerIdentite(s: Sauvegarde, identite: Awaited<ReturnType<typeof verifierIdentite>>): Sauvegarde {
  return { ...s, profil: { ...s.profil, pseudo: identite.pseudo },
    joutes: identite.publique ? { ...s.joutes, pseudo: identite.pseudo, cote: identite.cote ?? s.joutes.cote } : s.joutes };
}
