import { nouvelleSauvegarde, relireSauvegarde } from './sauvegarde.ts';
import type { Sauvegarde } from './sauvegarde.ts';

// Une connexion charge la collection du compte choisi, jamais celle de l'invité
// précédent. Les préférences d'affichage restent propres à l'appareil.
export function sauvegardeDuCompte(lue: Sauvegarde, identite: string | undefined, maintenant: number, paquets: number): Sauvegarde {
  if (lue.identiteLocale === identite) return lue;
  return { ...nouvelleSauvegarde(maintenant, paquets), reglages: lue.reglages, identiteLocale: identite };
}

// Ce qu'un autre onglet du jeu vient d'enregistrer : adopté s'il s'agit du même compte, ignoré sinon — ou s'il est
// illisible, ou d'une version plus récente du jeu (cet onglet-ci garde alors sa partie).
export function sauvegardeVoisine(recue: unknown, identite: string | undefined, maintenant: number): Sauvegarde | null {
  if (typeof recue !== 'object' || recue === null || (recue as { identiteLocale?: unknown }).identiteLocale !== identite) return null;
  try { return relireSauvegarde(recue, maintenant); } catch { return null; }
}
