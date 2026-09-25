// Couper un texte en lignes qui tiennent dans une largeur donnée, avec une fonction de mesure fournie par
// l'appelant (celle d'un canevas, ou une règle simple dans les tests). Sert à l'image de partage du timbre
// (la définition, sous le mot).

export function couperEnLignes(texte: string, largeurMaximum: number, mesurer: (texte: string) => number, lignesMaximum = Infinity): string[] {
  const mots = texte.trim().split(/\s+/).filter(Boolean);
  const lignes: string[] = [];
  let ligne = '';
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (mesurer(essai) <= largeurMaximum || ligne === '') ligne = essai;
    else { lignes.push(ligne); ligne = mot; }
  }
  if (ligne) lignes.push(ligne);
  if (lignes.length <= lignesMaximum) return lignes;
  // Trop long : on garde les premières lignes, et la dernière se termine par des points de suspension.
  const gardees = lignes.slice(0, lignesMaximum);
  let derniere = gardees[gardees.length - 1];
  while (derniere.length > 1 && mesurer(`${derniere}…`) > largeurMaximum) derniere = derniere.replace(/\s*\S+$/, '') || derniere.slice(0, -1);
  gardees[gardees.length - 1] = `${derniere}…`;
  return gardees;
}

// Le nom du fichier image et le message qui l'accompagne quand on partage un timbre.
export const nomDuFichierImage = (idCarte: string): string => `philamots-timbre-${idCarte}.png`;
export function texteDePartage(mot: string, rarete: string, faction: string, adresse: string): string {
  return `« ${mot} » — un timbre ${rarete.toLowerCase()} venu de la faction ${faction}, dans Philamots, le jeu de cartes des mots français. ${adresse}`;
}
