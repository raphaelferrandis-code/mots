// L'historique du duel (BRIEF-duel.md § 3) : un losange par manche possible, gagnée, perdue ou nulle,
// et la manche en cours en surbrillance. Il remplace le texte « Manche 1 / 10 ».

import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { resultatDeLaManche } from '../../jeu/aidesDuDuel.ts';
import type { Manche } from '../../jeu/duel.ts';

const TOTAL = EQUILIBRAGE.duel.manchesMaximum;

export function Historique({ manches, enCours }: { manches: Manche[]; enCours: number | null }) {
  const resultats = manches.map(resultatDeLaManche);
  const compte = (r: string) => resultats.filter((x) => x === r).length;
  const numero = enCours ?? manches.length;
  const resume = `Manche ${numero} sur ${TOTAL}${resultats.length ? ` : ${compte('gagnee')} gagnée${compte('gagnee') > 1 ? 's' : ''}, ${compte('perdue')} perdue${compte('perdue') > 1 ? 's' : ''}, ${compte('nulle')} nulle${compte('nulle') > 1 ? 's' : ''}` : ''}`;
  return (
    <div className="historique">
      <ol className="historique__losanges" role="img" aria-label={resume}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <li key={i} data-resultat={resultats[i] ?? 'a-jouer'} data-en-cours={enCours === i + 1} />
        ))}
      </ol>
      <span className="historique__manche" aria-hidden="true">Manche {numero}</span>
    </div>
  );
}
