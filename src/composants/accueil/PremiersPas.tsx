// Les premiers pas du nouveau venu, sous le bouton du comptoir : trois étapes qui se cochent seules (ses paquets de
// départ, son carnet, sa première victoire), puis un mot de félicitations et deux suites (audit de finition du
// 26/09/2026 : rien ne guidait le débutant après son premier paquet). Un joueur qui a déjà gagné plusieurs duels ne
// voit rien.

import { useState } from 'react';
import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import { lien } from '../../navigation/routes.ts';

const CLE = 'mots.premiers-pas';
const lire = (): boolean => { try { return localStorage.getItem(CLE) === 'fini'; } catch { return false; } };

export function PremiersPas({ sauvegarde, carnet }: { sauvegarde: Sauvegarde; carnet: number }) {
  const [ferme, setFerme] = useState(lire);
  const { paquetsDeDepart } = EQUILIBRAGE.paquets;
  const taille = EQUILIBRAGE.duel.tailleDuDeck;
  const { joues, gagnes } = sauvegarde.duels;
  const timbres = Object.keys(sauvegarde.cartes).length;
  const paquets = sauvegarde.paquets.ouverts >= paquetsDeDepart;
  const carnetPret = carnet >= taille;
  const victoire = gagnes > 0;

  if (ferme || joues > 5) return null;
  if (victoire) {
    const fermer = (): void => { try { localStorage.setItem(CLE, 'fini'); } catch { /* il reviendra à la prochaine visite */ } setFerme(true); };
    return (
      <section className="premiers-pas premiers-pas--fin" aria-labelledby="titre-premiers-pas">
        <h2 id="titre-premiers-pas">Bravo, tu connais le jeu !</h2>
        <p>La suite : les joutes classées, contre d’autres joueurs, ou un ami à inviter ({EQUILIBRAGE.parrainage.paquetsOfferts} paquets pour lui à son premier duel).</p>
        <p className="premiers-pas__liens">
          <a className="comptoir__lien" href={`${lien({ ecran: 'duel' })}/joutes`}>Les joutes classées</a>
          <a className="comptoir__lien" href={lien({ ecran: 'amis' })}>Inviter un ami</a>
          <button type="button" className="premiers-pas__fermer" onClick={fermer}>Fermer</button>
        </p>
      </section>
    );
  }

  const etapes = [
    { fait: paquets, texte: `Ouvre tes ${paquetsDeDepart === 3 ? 'trois' : paquetsDeDepart} paquets de départ` },
    { fait: carnetPret, texte: timbres >= taille ? 'Ton carnet se compose tout seul au Duel' : `Réunis ${taille === 10 ? 'dix' : taille} timbres pour ton carnet`, lien: !carnetPret && timbres >= taille ? lien({ ecran: 'duel' }) : undefined },
    { fait: victoire, texte: 'Gagne ton premier duel', lien: carnetPret ? lien({ ecran: 'duel' }) : undefined },
  ];
  return (
    <section className="premiers-pas" aria-labelledby="titre-premiers-pas">
      <h2 id="titre-premiers-pas">Tes premiers pas</h2>
      <ol>
        {etapes.map((e, i) => (
          <li key={i} data-fait={e.fait}>
            <span className="premiers-pas__case" aria-hidden="true">{e.fait ? '✓' : i + 1}</span>
            {e.lien && !e.fait ? <a href={e.lien}>{e.texte}</a> : <span>{e.texte}</span>}
            {e.fait && <span className="visuellement-cache"> : fait</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
