// Un timbre avec sa légende : le mot et ses deux valeurs, écrits en clair sous le timbre. Sert partout où les
// timbres sont affichés en petit (deck, main du duel), là où le texte gravé sur le timbre devient trop fin pour être lu.

import type { ComponentProps } from 'react';
import { attaqueEnJeu, defenseEnJeu } from '../../config/equilibrage.ts';
import { Carte } from './Carte.tsx';

export function CarteLegendee(props: ComponentProps<typeof Carte>) {
  const { carte } = props;
  return (
    <figure className="carte-legendee">
      <Carte {...props} />
      <figcaption aria-hidden="true">
        <strong lang="fr">{carte.mot}</strong>
        <span>{carte.type} · {attaqueEnJeu(carte.attaque, carte.rarete)} / {defenseEnJeu(carte.defense, carte.rarete)}</span>
      </figcaption>
    </figure>
  );
}
