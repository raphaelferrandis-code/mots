// Où le jeu est publié. Sert aux messages de partage (l'image d'un timbre) et à la page Confidentialité.
export const SITE = {
  nom: 'Philamots',
  // Le nom en capitales, pour les dessins (enseigne, paquet scellé).
  nomEnCapitales: 'PHILAMOTS',
  // L'initiale, pour le sceau du paquet et l'icône de l'onglet.
  initiale: 'P',
  // Complète le nom dans le titre de l'accueil, celui que Google affiche. Même phrase que dans index.html.
  accroche: 'collectionne les mots de la langue française',
  adresse: 'https://philamots.fr/',
  adresseCourte: 'philamots.fr',
  pageDuProjet: 'https://github.com/raphaelferrandis-code/mots',
} as const;
