import { nouvelleSauvegarde } from './sauvegarde.ts';
import type { Sauvegarde } from './sauvegarde.ts';

// Une connexion charge la collection du compte choisi, jamais celle de l'invité
// précédent. Les préférences d'affichage restent propres à l'appareil.
export function sauvegardeDuCompte(lue: Sauvegarde, identite: string | undefined, maintenant: number, paquets: number): Sauvegarde {
  if (lue.identiteLocale === identite) return lue;
  return { ...nouvelleSauvegarde(maintenant, paquets), reglages: lue.reglages, identiteLocale: identite };
}
