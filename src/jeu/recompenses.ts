import { SUCCES } from './catalogueSucces.ts';
import type { Succes } from './catalogueSucces.ts';
import { progressionDuNiveau } from './personnalisation.ts';
import type { ProfilPersonnel } from './personnalisation.ts';

export type Recompense = { type: 'niveau'; avant: number; niveau: number } | { type: 'titre'; succes: Succes };

export function resumerLesRecompenses(recompenses: readonly Recompense[]): { titre: string; detail: string } | null {
  if (!recompenses.length) return null;
  const titres = recompenses.filter(r => r.type === 'titre');
  const niveau = Math.max(0, ...recompenses.filter(r => r.type === 'niveau').map(r => r.niveau));
  const titre = titres.length > 1 ? `${titres.length} succès accomplis` : titres.length === 1 ? titres[0].succes.nom : `Niveau ${niveau} atteint`;
  const detail = titres.length === 1 ? `Titre : ${titres[0].succes.titre}` : titres.length > 1 ? 'Titres disponibles dans Profil · Succès' : 'Personnalisations disponibles dans le profil';
  return { titre, detail: titres.length && niveau ? `Niveau ${niveau} · ${detail}` : detail };
}

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
