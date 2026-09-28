// L'alerte des joutes en direct : « Adversaire trouvé ! ». Contrairement aux autres sons, elle sonne même onglet
// caché — c'est tout son intérêt —, si les sons du jeu sont allumés et que le joueur a touché la page auparavant
// (les navigateurs l'exigent : voir SortieSonore.preparer).
import { SortieSonore } from './sons.ts';

export class SonsDuDirect extends SortieSonore {
  protected override seTaitEnArrierePlan = false;

  // La cloche du bureau, sol-do-mi : la signature sonore du jeu (banque commune, choisie par Raphaël le 28/09/2026).
  adversaireTrouve(): void {
    this.banqueCommune((banque, t) => banque.cloche(t, 2, 3));
  }
}
