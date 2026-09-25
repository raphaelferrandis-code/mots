// L'atelier du deck vit désormais dans la préparation du duel (refonte du Duel, lot 3) : #/deck ouvre la même page,
// avec le panneau deck déjà en édition. L'adresse reste valable pour tous les liens existants.

import { Duel } from './Duel.tsx';

export function Deck() {
  return <Duel editionDuDeck />;
}
