// Où le jeu est publié, et qui en répond. Sert aux messages de partage (l'image d'un timbre), aux pages légales
// (mentions légales, confidentialité, conditions d'utilisation : composants/legal/) et au pied de page.
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
  // L'éditeur et le contact (décision de Raphaël du 28/09/2026 : son nom et l'adresse de contact ; l'adresse postale
  // et le numéro d'entreprise s'ajouteront avant l'ouverture de tout achat, quand la structure qui vendra existera).
  editeur: 'Raphaël Ferrandis',
  contact: 'contact@philamots.fr',
  // La date des textes légaux, affichée en haut de chacun : à changer à chaque modification de leur contenu.
  textesLegauxDu: '28 septembre 2026',
  // La conservation des comptes sans visite (décision de Raphaël du 28/09/2026) ; le serveur applique les mêmes durées
  // (serveur/conservation.ts).
  conservation: { inviteMois: 12, relieAns: 3 },
} as const;
