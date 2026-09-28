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
  // La source des définitions et sa licence, là où une définition quitte le site : image d'un timbre partagé, images
  // et textes de la devinette du jour (la licence CC BY-SA demande de les citer à chaque reprise).
  creditDesDefinitions: 'Définition adaptée du Wiktionnaire · licence CC BY-SA 4.0',
  // L'éditeur et le contact (décision de Raphaël du 28/09/2026 : son nom et l'adresse de contact ; l'adresse postale
  // et le numéro d'entreprise s'ajouteront avant l'ouverture de tout achat, quand la structure qui vendra existera).
  editeur: 'Raphaël Ferrandis',
  contact: 'contact@philamots.fr',
  // La date des textes légaux (année-mois-jour), affichée en haut de chacun et donnée à Google dans le plan du site : à
  // changer à chaque modification de leur contenu.
  textesLegauxLe: '2026-09-28',
  // La conservation des comptes sans visite (décision de Raphaël du 28/09/2026) ; le serveur applique les mêmes durées
  // (serveur/conservation.ts).
  conservation: { inviteMois: 12, relieAns: 3 },
} as const;

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// « 2026-09-28 » → « 28 septembre 2026 » (« 1er » le premier du mois), sans dépendre du fuseau de l'appareil.
export function dateEnToutesLettres(iso: string): string {
  const [annee, mois, jour] = iso.split('-').map(Number);
  return `${jour === 1 ? '1er' : jour} ${MOIS[mois - 1]} ${annee}`;
}
