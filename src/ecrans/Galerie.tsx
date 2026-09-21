// Galerie de contrôle (n'existe que pendant le développement, à l'adresse #/galerie) : tous les timbres
// Hors-série et un échantillon de timbres ordinaires, pour juger les illustrations et les motifs d'un coup d'œil.

import { Carte } from '../composants/carte/Carte.tsx';
import { Entete } from '../composants/Entete.tsx';
import { useChargement } from '../composants/useChargement.ts';
import { FINITIONS, RARETES_ORDINAIRES } from '../partage/types.ts';
import { chargerEdition } from '../services/cartes.ts';

export function Galerie() {
  const edition = useChargement(chargerEdition, 'edition');
  if (edition.etat !== 'pret') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;

  const { cartes } = edition.donnees;
  const horsSerie = cartes.filter((c) => c.rarete === 'Hors-série');
  // Toujours les mêmes timbres d'une visite à l'autre : un sur quatre-vingt-dix-sept, dans chaque rareté.
  const ordinaires = RARETES_ORDINAIRES.flatMap((rarete) => cartes.filter((c) => c.rarete === rarete).filter((_, i) => i % 97 === 5).slice(0, 6));

  return (
    <main className="ecran ecran--large">
      <Entete surtitre="Développement" titre="Galerie de contrôle">Les {horsSerie.length} timbres Hors-série, puis un échantillon de timbres ordinaires.</Entete>
      <div className="galerie">{horsSerie.map((carte) => <Carte key={carte.id} carte={carte} />)}</div>
      <div className="galerie">{ordinaires.map((carte, i) => <Carte key={carte.id} carte={carte} finition={FINITIONS[i % 7 === 3 ? 2 : i % 5 === 2 ? 1 : 0]} />)}</div>
    </main>
  );
}
