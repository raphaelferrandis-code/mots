// Les bruitages du duel, dans la même famille que ceux des paquets : du papier, un coup de tampon, et quelques
// notes brèves pour dire « juste », « faux », « gagné », « perdu ». Rien d'agressif : on joue souvent sans casque.
import { SortieSonore } from './sons.ts';

export class SonsDuDuel extends SortieSonore {
  // Le joueur pose son timbre sur la table.
  poser(): void {
    this.bruit(0.13, 1250, 0.35);
    this.bruit(0.07, 260, 0.7, 0.085);
  }

  // Bonne définition : un coup de tampon, et deux notes qui montent.
  juste(): void {
    this.bruit(0.07, 220, 0.75);
    this.note(659.3, 0.2, 0.32, 0.03);
    this.note(880, 0.32, 0.32, 0.13);
  }

  // Mauvaise définition, ou temps écoulé : un choc mat, et deux notes qui descendent.
  faux(): void {
    this.bruit(0.16, 160, 0.7);
    this.note(196, 0.22, 0.3, 0.02);
    this.note(146.8, 0.34, 0.3, 0.17);
  }

  // Les cinq dernières secondes d'une question.
  tic(): void {
    this.bruit(0.03, 3000, 0.22);
  }

  // Une attaque qui porte : d'autant plus sourde et forte qu'elle fait mal.
  coup(degats: number, delai = 0): void {
    if (degats <= 0) return;
    const force = Math.min(1, 0.45 + degats / 14);
    this.bruit(0.2, 190 - Math.min(90, degats * 8), force, delai);
    this.bruit(0.05, 900, force * 0.4, delai);
  }

  // Un mot vient de recevoir son cachet « Maîtrisé ».
  cachet(delai = 0): void {
    this.bruit(0.08, 240, 0.8, delai);
    this.note(1318.5, 0.25, 0.2, delai + 0.05);
    this.note(1760, 0.45, 0.2, delai + 0.17);
  }

  victoire(): void {
    [440, 554.4, 659.3, 880].forEach((frequence, i) => this.note(frequence, i === 3 ? 0.7 : 0.24, 0.3, i * 0.15));
  }

  defaite(): void {
    [440, 349.2, 293.7].forEach((frequence, i) => this.note(frequence, i === 2 ? 0.7 : 0.3, 0.26, i * 0.24));
  }
}
