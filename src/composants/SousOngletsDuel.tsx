
// Les icônes de la rubrique Duel (barre de navigation). Depuis la refonte du Duel, Jouer et Deck ne forment
// plus qu'une page et le Classement est un lien : les anciens sous-onglets ont disparu.
const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const ICONES_DUEL = {
  duel: <svg viewBox="0 0 24 24" {...trait}><path d="m5 4 10 10" /><path d="m19 4-10 10" /><path d="m4 17 3 3" /><path d="m20 17-3 3" /><path d="m6 15 3 3" /><path d="m18 15-3 3" /></svg>,
  deck: <svg viewBox="0 0 24 24" {...trait}><path d="m12 4 8 4-8 4-8-4z" /><path d="m4 12 8 4 8-4" /><path d="m4 16 8 4 8-4" /></svg>,
  classement: <svg viewBox="0 0 24 24" {...trait}><path d="M3 20V11h6v9M9 20V5h6v15M15 20v-6h6v6M2 20h20" /></svg>,
};
