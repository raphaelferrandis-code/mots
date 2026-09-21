// Dans un groupe d'onglets ou de boutons radio, les flèches du clavier passent d'un choix à l'autre et le
// sélectionnent ; Tab sort du groupe. C'est ce qu'attendent les lecteurs d'écran quand ils annoncent « onglet »
// ou « bouton radio ». À poser sur le conteneur (role="tablist" ou "radiogroup") ; chaque choix porte
// tabIndex={choisi ? 0 : -1}.

import type { KeyboardEvent } from 'react';

export function choisirAuxFleches<T>(choix: readonly T[], actuel: T, choisir: (choix: T) => void) {
  return (evenement: KeyboardEvent<HTMLElement>): void => {
    const pas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[evenement.key];
    const position = evenement.key === 'Home' ? 0 : evenement.key === 'End' ? choix.length - 1 : pas === undefined ? null : (choix.indexOf(actuel) + pas + choix.length) % choix.length;
    if (position === null) return;
    evenement.preventDefault();
    choisir(choix[position]);
    // Le choix suit le clavier : une fois l'écran mis à jour, on donne la main au nouvel élément sélectionné.
    const groupe = evenement.currentTarget;
    requestAnimationFrame(() => groupe.querySelector<HTMLElement>('[aria-selected="true"], [aria-checked="true"]')?.focus());
  };
}
