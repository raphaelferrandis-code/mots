// Écrans dont le contenu arrive à la phase 3. Ils existent déjà pour que la navigation
// soit complète ; chacun dit ce qu'il contiendra.

import { AVenir, Entete } from '../composants/Entete.tsx';

export function Deck() {
  return (
    <main className="ecran">
      <Entete surtitre="Deck" titre="Ton deck de duel">Dix cartes choisies dans ta collection.</Entete>
      <AVenir phase="phase 3">Choix des dix cartes, avec un rappel du triangle des types (Nom &gt; Adjectif &gt; Verbe &gt; Nom) et des bonus de faction.</AVenir>
    </main>
  );
}

export function Duel() {
  return (
    <main className="ecran">
      <Entete surtitre="Duel" titre="Duel contre l'ordinateur">Tu choisis ta carte, puis tu prouves que tu connais le mot.</Entete>
      <AVenir phase="phase 3">
        Trois niveaux de difficulté, 20 points de vie, 3 cartes en main. Pour attaquer, il faut retrouver la définition
        de son mot parmi quatre, en 15 secondes.
      </AVenir>
    </main>
  );
}
