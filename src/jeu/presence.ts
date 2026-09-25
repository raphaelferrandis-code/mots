// Ce qu'on dit du dernier passage d'un ami. Le jeu signale la présence toutes les trois minutes tant que l'onglet
// est visible (usePresence.ts) : un signe de moins de cinq minutes veut dire « en ligne ».

export const DELAI_EN_LIGNE = 5 * 60_000;

export function presence(vuLe: number | null | undefined, maintenant: number): { enLigne: boolean; texte: string } | null {
  if (!vuLe) return null;
  const ecart = Math.max(0, maintenant - vuLe);
  if (ecart < DELAI_EN_LIGNE) return { enLigne: true, texte: 'En ligne' };
  const minutes = Math.floor(ecart / 60_000);
  if (minutes < 60) return { enLigne: false, texte: `Passage il y a ${minutes} min` };
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return { enLigne: false, texte: `Passage il y a ${heures} h` };
  const jours = Math.floor(heures / 24);
  if (jours === 1) return { enLigne: false, texte: 'Passage hier' };
  if (jours < 7) return { enLigne: false, texte: `Passage il y a ${jours} jours` };
  return { enLigne: false, texte: `Passage le ${new Date(vuLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` };
}
