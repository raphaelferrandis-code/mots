// Le bloc Duels de l'accueil (maquette) : une phrase qui dit où en est le joueur, la jauge des dix timbres du carnet,
// et le bon lien. Avec un deck complet, le bilan des duels et la ligue des joutes.

import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { ligueDe } from '../../jeu/joute.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import { lien } from '../../navigation/routes.ts';

const TAILLE = EQUILIBRAGE.duel.tailleDuDeck;

export function DuelsDuBureau({ sauvegarde, deck }: { sauvegarde: Sauvegarde; deck: number | null }) {
  const possedes = Object.keys(sauvegarde.cartes).length;
  const complet = deck === TAILLE;
  // Sans deck complet, la jauge compte les timbres de la collection, jusqu'à dix : de quoi composer le premier.
  const jauge = complet ? TAILLE : Math.min(TAILLE, possedes);
  const manque = TAILLE - jauge;
  const { joues, gagnes } = sauvegarde.duels;
  const texte = complet
    ? joues === 0 ? 'Ton carnet est prêt. Lance ton premier duel contre l’ordinateur.' : `${gagnes} victoire${gagnes > 1 ? 's' : ''} en ${joues} duel${joues > 1 ? 's' : ''}. Ton carnet t’attend pour le suivant.`
    : jauge === 0 ? `Il te faut ${TAILLE === 10 ? 'dix' : TAILLE} timbres pour composer ton carnet et lancer ton premier duel.`
      : manque > 0 ? `Encore ${manque} timbre${manque > 1 ? 's' : ''} à trouver avant ton premier duel.`
        : `Tu as de quoi composer ton carnet. Choisis tes ${TAILLE === 10 ? 'dix' : TAILLE} meilleurs mots et lance ton premier duel.`;

  return (
    <section className="duels-bureau" aria-labelledby="titre-duels-bureau">
      <h2 id="titre-duels-bureau">Duels</h2>
      <p className="duels-bureau__texte">{texte}</p>
      <div className="duels-bureau__jauge" aria-hidden="true">{Array.from({ length: TAILLE }, (_, i) => <i key={i} className={i < jauge ? 'allume' : undefined} />)}</div>
      <p className="duels-bureau__compte">{complet ? <><b>{TAILLE}</b> sur {TAILLE} timbres dans ton carnet</> : <><b>{jauge}</b> sur {TAILLE} timbres pour ton premier carnet</>}</p>
      <p className="duels-bureau__liens">
        <a className="comptoir__lien" href={lien({ ecran: complet ? 'duel' : 'deck' })}>{complet ? 'Lancer un duel' : 'Composer mon carnet'}</a>
        <a className="comptoir__lien comptoir__lien--doux" href={lien({ ecran: 'classement' })}>Classement</a>
      </p>
      {sauvegarde.joutes.cote !== null && <p className="duels-bureau__ligue">Joutes : {ligueDe(sauvegarde.joutes.cote, EQUILIBRAGE.joute).nom} · cote {sauvegarde.joutes.cote}</p>}
    </section>
  );
}
