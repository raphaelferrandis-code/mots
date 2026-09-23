import { SUCCES } from './catalogueSucces.ts';
import type { Succes } from './catalogueSucces.ts';
import { progressionDuNiveau } from './personnalisation.ts';
import type { ProfilPersonnel } from './personnalisation.ts';

export type Recompense = { type: 'niveau'; avant: number; niveau: number } | { type: 'titre'; succes: Succes };

// Comparaison d'observations de la sauvegarde : aucun gain n'est attribué ici.
// Plusieurs niveaux gagnés ensemble donnent une seule annonce.
export function nouvellesRecompenses(avant: Pick<ProfilPersonnel, 'xp' | 'succes'>, apres: Pick<ProfilPersonnel, 'xp' | 'succes'>): Recompense[] {
  const debut = progressionDuNiveau(avant.xp).niveau;
  const fin = progressionDuNiveau(apres.xp).niveau;
  return [
    ...(fin > debut ? [{ type: 'niveau' as const, avant: debut, niveau: fin }] : []),
    ...SUCCES.filter(s => apres.succes.includes(s.id) && !avant.succes.includes(s.id)).map(s => ({ type: 'titre' as const, succes: s })),
  ];
}
