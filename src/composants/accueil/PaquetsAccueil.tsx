import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { lien } from '../../navigation/routes.ts';
import type { Partie } from '../../services/partie.ts';
import { enMinutesEtSecondes, useStockDePaquets } from '../usePartie.ts';
import { PaquetScelle } from '../paquet/PaquetScelle.tsx';

export function PaquetsAccueil({ partie }: { partie: Extract<Partie, { etat: 'prete' }> }) {
  // Seul ce bloc se rafraîchit chaque seconde, pas les dessins des timbres du deck.
  const paquets = useStockDePaquets(partie)!;
  const prix = EQUILIBRAGE.paquets.prixEnEncre;
  const peutAcheter = partie.sauvegarde.encre >= prix;
  const disponible = paquets.stock > 0 || peutAcheter;
  return (
    <section className="accueil-pole" aria-labelledby="titre-paquets">
      <header className="accueil-pole__entete"><h2 id="titre-paquets">Les paquets</h2><p>{EQUILIBRAGE.paquets.emplacements.length} timbres par paquet</p></header>
      <div className="accueil-pole__illustration"><PaquetScelle /></div>
      <p className="accueil-pole__bilan"><strong>{paquets.stock}</strong> / {paquets.maximum} en réserve</p>
      {disponible
        ? <a className="bouton accueil-pole__action" href={lien({ ecran: 'paquet' })}>{paquets.stock > 0 ? 'Ouvrir un paquet' : `Un paquet — ${prix} Encre`}</a>
        : <button className="bouton accueil-pole__action" type="button" disabled>En attente d’un paquet</button>}
      <div className="accueil-pole__suite">
        {paquets.attente !== null && <p className="accueil-pole__note">Prochain paquet dans <span className="accueil-compte-a-rebours" role="timer">{enMinutesEtSecondes(paquets.attente)}</span></p>}
        {paquets.stock === 0 && !peutAcheter && <p className="accueil-pole__detail">Ou {prix} Encre par paquet.</p>}
      </div>
    </section>
  );
}
