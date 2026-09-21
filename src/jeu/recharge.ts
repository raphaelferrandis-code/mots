// La recharge des paquets : un paquet gratuit toutes les X minutes, jusqu'à un stock maximum.
// Tout se calcule à partir de l'heure, donc les paquets arrivent aussi quand le jeu est fermé.
// L'heure est fournie par l'appelant : aujourd'hui celle de l'appareil, plus tard celle d'un serveur.

export type EtatDesPaquets = {
  stock: number;
  reference: number; // moment (en millisecondes) où le compte à rebours en cours a commencé
};

export type ReglagesDeRecharge = {
  minutesEntreDeuxPaquets: number;
  stockMaximum: number;
};

const delai = (reglages: ReglagesDeRecharge): number => reglages.minutesEntreDeuxPaquets * 60_000;

// Ajoute les paquets gagnés depuis la dernière fois. À appeler avant toute lecture du stock.
export function rechargerLesPaquets(etat: EtatDesPaquets, maintenant: number, reglages: ReglagesDeRecharge): EtatDesPaquets {
  // Stock plein : le compte à rebours est à l'arrêt. Il repartira quand un paquet sera ouvert.
  if (etat.stock >= reglages.stockMaximum) return { stock: etat.stock, reference: maintenant };
  // L'horloge a reculé (heure de l'appareil modifiée) : aucun paquet, et on repart de maintenant.
  if (maintenant < etat.reference) return { stock: etat.stock, reference: maintenant };

  const gagnes = Math.floor((maintenant - etat.reference) / delai(reglages));
  const stock = Math.min(reglages.stockMaximum, etat.stock + gagnes);
  // Le temps déjà écoulé vers le paquet suivant est conservé, sauf si le stock vient de se remplir.
  const reference = stock >= reglages.stockMaximum ? maintenant : etat.reference + gagnes * delai(reglages);
  return { stock, reference };
}

// Millisecondes avant le prochain paquet, ou null si le stock est plein.
export function attenteAvantLeProchain(etat: EtatDesPaquets, maintenant: number, reglages: ReglagesDeRecharge): number | null {
  const aJour = rechargerLesPaquets(etat, maintenant, reglages);
  if (aJour.stock >= reglages.stockMaximum) return null;
  return aJour.reference + delai(reglages) - maintenant;
}

export function retirerUnPaquet(etat: EtatDesPaquets, maintenant: number, reglages: ReglagesDeRecharge): EtatDesPaquets {
  const aJour = rechargerLesPaquets(etat, maintenant, reglages);
  if (aJour.stock < 1) throw new Error('Aucun paquet en stock');
  return { stock: aJour.stock - 1, reference: aJour.reference };
}
