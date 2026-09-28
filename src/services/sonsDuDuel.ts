// Les bruitages du duel, dans la même famille que ceux des paquets : du papier, un coup de tampon, et quelques
// notes brèves pour dire « juste », « faux », « gagné », « perdu ». Rien d'agressif : on joue souvent sans casque.
// La sonnette, le tic-tac, le tampon de « Duel », la cloche de la victoire et la quinte de l'égalité viennent de la
// banque commune (banqueDeSons.ts) : Raphaël les a choisis sur la page d'écoute du 28/09/2026 ; il a gardé les autres.
import { SortieSonore } from './sons.ts';

export class SonsDuDuel extends SortieSonore {
  // Le joueur pose son timbre sur la table.
  poser(): void {
    this.bruit(0.13, 1250, 0.35);
    this.bruit(0.07, 260, 0.7, 0.085);
  }

  // Bonne définition : la sonnette du guichet.
  juste(): void {
    this.banqueCommune((banque, t) => banque.sonnette(t, 1));
  }

  // Mauvaise définition, ou temps écoulé : un choc mat, et deux notes qui descendent.
  faux(): void {
    this.bruit(0.16, 160, 0.7);
    this.note(196, 0.22, 0.3, 0.02);
    this.note(146.8, 0.34, 0.3, 0.17);
  }

  // Les cinq dernières secondes d'une question : le tic-tac d'une horloge, un peu plus fort à mesure que le temps file.
  tic(restantes = 5): void {
    const r = Math.min(5, Math.max(1, restantes));
    this.banqueCommune((banque, t) => banque.tic(t, 1, r % 2 === 0, (5 - r) / 4));
  }

  // « Duel » tombe au centre de l'écran : le tampon du jeu, le même que celui des paquets.
  frappe(): void {
    this.banqueCommune((banque, t) => banque.tampon(t, 1, 0.5));
  }

  // Toucher un timbre de la main : un petit claquement de papier.
  selection(): void {
    this.bruit(0.04, 2600, 0.22);
  }

  // Un timbre tiré de la pioche glisse dans la main.
  piocher(delai = 0): void {
    this.bruit(0.16, 1800, 0.18, delai);
    this.bruit(0.05, 700, 0.2, delai + 0.12);
  }

  // Un timbre qui s'élance, ou qui arrive sur la table : un souffle.
  souffle(delai = 0): void {
    this.bruit(0.22, 900, 0.22, delai);
  }

  // L'adversaire pare ton mot : un bouclier de métal, une note claire.
  bouclier(): void {
    this.bruit(0.06, 3200, 0.3);
    this.note(987.8, 0.35, 0.16, 0.01);
    this.note(1318.5, 0.3, 0.09, 0.03);
  }

  // Il n'a pas trouvé la définition : sa garde se fissure.
  fissure(): void {
    this.bruit(0.09, 2400, 0.35);
    this.bruit(0.05, 1200, 0.28, 0.07);
  }

  // Les deux timbres se heurtent : un choc sourd, d'autant plus fort que la manche fait mal.
  choc(degats: number): void {
    const force = Math.min(1, 0.5 + degats / 16);
    this.bruit(0.25, 120, force);
    this.bruit(0.06, 1500, force * 0.45);
  }

  // Une attaque qui porte : d'autant plus sourde et forte qu'elle fait mal.
  coup(degats: number, delai = 0): void {
    if (degats <= 0) return;
    const force = Math.min(1, 0.45 + degats / 14);
    this.bruit(0.2, 190 - Math.min(90, degats * 8), force, delai);
    this.bruit(0.05, 900, force * 0.4, delai);
  }

  // La victoire : la cloche du bureau, deux notes (sol, do) ; la troisième (mi) est gardée pour une joute classée.
  victoire(classee = false): void {
    this.banqueCommune((banque, t) => banque.cloche(t, 2, classee ? 3 : 2));
  }

  // L'égalité : deux notes ensemble, à la quinte, ni joyeuses ni tristes.
  egalite(): void {
    this.banqueCommune((banque, t) => banque.quinte(t, 1));
  }

  defaite(): void {
    [440, 349.2, 293.7].forEach((frequence, i) => this.note(frequence, i === 2 ? 0.7 : 0.3, 0.26, i * 0.24));
  }
}
