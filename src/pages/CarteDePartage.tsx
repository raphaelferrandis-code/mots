// La carte du mot du jour, pour les réseaux sociaux : 1080 × 1350 (format portrait d'Instagram, qui passe aussi sur
// Facebook et Bluesky). Fabriquée en HTML comme les pages par mot (dist/partage/carte/<adresse>/), puis prise en
// photo par scripts/photographier-les-cartes.ts.

import { Timbre } from '../composants/timbre/Timbre.tsx';
import type { TexteDUnePage } from '../partage/pagesDesMots.ts';
import { definitionDeLaCarte } from './assemblage.ts';
import type { CarteDetails, CarteIndex } from '../partage/types.ts';

const NATURE: Record<CarteIndex['type'], string> = { Nom: 'nom', Verbe: 'verbe', Adjectif: 'adjectif', Adverbe: 'adverbe' };

export function CarteDePartage({ carte, details, texte }: { carte: CarteIndex; details: CarteDetails; texte: TexteDUnePage | undefined }) {
  const definition = definitionDeLaCarte(texte?.definitions ?? details.definitions);
  const origine = [NATURE[carte.type], details.langueOrigine, details.attestation].filter(Boolean).join(' · ');
  const taille = carte.mot.length > 12 ? 'carte-partage__mot--long' : '';
  return (
    <div className="carte-partage">
      <p className="carte-partage__surtitre">Le mot du jour</p>
      <div className="carte-partage__timbre"><Timbre carte={carte} cliquable={false} reagir={false} /></div>
      <h1 className={`carte-partage__mot ${taille}`}>{carte.mot}</h1>
      <p className="carte-partage__origine">{origine}</p>
      <p className="carte-partage__definition">{definition}</p>
      <p className="carte-partage__pied"><img src="../../../identite/philamots-clair.svg" alt="Philamots" width="190" height="45" /><span>philamots.fr</span></p>
    </div>
  );
}
