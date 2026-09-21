// Les bruitages des paquets : papier sec, souffle et petites percussions (voir sons.ts pour la fabrication).
import { SortieSonore } from './sons.ts';

export class SonsPaquets extends SortieSonore {
  ouvrir(): void {
    this.bruit(0.07, 1800, 0.6);
    this.bruit(0.32, 2600, 0.7, 0.1);
    this.bruit(0.4, 650, 0.35, 0.23);
  }

  carte(position = 0, delai = 0): void {
    this.bruit(0.13, 1100 + position * 150, 0.35, delai);
    this.bruit(0.065, 280, 0.65, delai + 0.085);
  }

  retourner(): void { this.preparer(); this.carte(); }
}
