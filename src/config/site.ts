// Où le jeu est publié. Sert aux messages de partage (l'image d'un timbre) et à la page Confidentialité.
export const SITE = {
  nom: 'Philamots',
  // Le nom en capitales, pour les dessins (enseigne, paquet scellé).
  nomEnCapitales: 'PHILAMOTS',
  // L'initiale, pour le sceau du paquet et l'icône de l'onglet.
  initiale: 'P',
  // ⚠️ À changer pour https://philamots.fr/ le jour où le nom de domaine pointera sur le jeu (GUIDE-supabase.md).
  adresse: 'https://raphaelferrandis-code.github.io/mots/',
  adresseCourte: 'raphaelferrandis-code.github.io/mots',
  pageDuProjet: 'https://github.com/raphaelferrandis-code/mots',
} as const;
