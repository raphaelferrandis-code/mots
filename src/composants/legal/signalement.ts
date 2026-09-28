// Signaler un pseudonyme ou un nom d'équipe (décision de Raphaël du 28/09/2026 : un lien « Signaler » dans le jeu, qui
// prépare un e-mail vers le contact ; règlement européen sur les services numériques, article 16). Le message dit qui
// ou quoi ; le joueur n'a plus qu'à écrire pourquoi.
import { SITE } from '../../config/site.ts';

export type Signalement = { genre: 'joueur' | 'equipe'; nom: string };

export function lienDeSignalement({ genre, nom }: Signalement): string {
  const quoi = genre === 'equipe' ? `le nom d’équipe « ${nom} »` : `le pseudonyme « ${nom} »`;
  return courriel(`Signalement : ${genre === 'equipe' ? 'équipe' : 'joueur'} « ${nom} »`, `Je signale ${quoi} dans Philamots.`);
}

// Quand le nom n'est pas connu d'avance (le classement : le joueur dit lequel).
export function lienDeSignalementDansLeClassement(): string {
  return courriel('Signalement : un nom du classement', 'Je signale un nom du classement de Philamots : ');
}

function courriel(sujet: string, phrase: string): string {
  const corps = `Bonjour,\n\n${phrase}\n\nCe qui pose problème (insulte, harcèlement, usurpation, triche…) :\n\n\nMerci.`;
  return `mailto:${SITE.contact}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}
