// Les détails des cartes (définitions, étymologie) sont rangés dans plusieurs petits fichiers, les « lots »,
// que le jeu charge à la demande. Cette fonction dit dans quel lot se trouve une carte ;
// le pipeline et le jeu utilisent la même, pour être toujours d'accord.

export function lotDeLaCarte(id: string, nombreDeLots: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % nombreDeLots;
}

export function nomDuLot(lot: number): string {
  return `lot-${String(lot).padStart(2, '0')}.json`;
}
