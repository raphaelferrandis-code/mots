// L'alerte des joutes en direct : « Adversaire trouvé ! ». Contrairement aux autres sons, elle sonne même onglet
// caché — c'est tout son intérêt —, si les sons du jeu sont allumés et que le joueur a touché la page auparavant
// (les navigateurs l'exigent : voir SortieSonore.preparer).
import { SortieSonore } from './sons.ts';

export class SonsDuDirect extends SortieSonore {
  protected override seTaitEnArrierePlan = false;

  // Trois notes qui montent, comme une sonnette de guichet.
  adversaireTrouve(): void {
    this.note(784, 0.28, 0.3);
    this.note(1046.5, 0.36, 0.3, 0.16);
    this.note(1318.5, 0.5, 0.24, 0.32);
  }
}
