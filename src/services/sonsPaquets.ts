// Les bruitages des paquets : papier sec, souffle et petites percussions (voir sons.ts pour la fabrication).
import { SortieSonore } from './sons.ts';

export class SonsPaquets extends SortieSonore {
  ouvrir(): void {
    this.bruit(0.09, 1800, 0.45, 0.12);
    this.bruit(0.42, 2600, 0.7, 0.34);
    this.bruit(0.45, 650, 0.35, 0.73);
  }

  carte(position = 0, delai = 0): void {
    this.bruit(0.13, 1100 + position * 150, 0.35, delai);
    this.bruit(0.065, 280, 0.65, delai + 0.085);
  }

  retourner(): void { this.preparer(); this.carte(); }

  // Un timbre rare qui se découvre : un carillon, d'autant plus long et haut que le rang est élevé
  // (rien en dessous de Rare ; argent pour une Épique, or pour une Légendaire, et une volée pour un Hors-série).
  rare(niveau: number, delai = 0): void {
    const notes = niveau >= 6 ? [659.3, 830.6, 987.8, 1318.5, 1760] : niveau === 5 ? [784, 987.8, 1318.5] : niveau === 4 ? [880, 1174.7] : niveau === 3 ? [1046.5] : [];
    notes.forEach((frequence, i) => this.note(frequence, 0.45 + i * 0.12 + (niveau >= 5 ? 0.3 : 0), 0.14 + niveau * 0.015, delai + i * 0.09));
  }
}
