import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { lien } from '../../navigation/routes.ts';
import type { Partie } from '../../services/partie.ts';
import { enMinutesEtSecondes, useStockDePaquets } from '../usePartie.ts';
import { Enveloppe } from './Enveloppe.tsx';

export function PaquetsAccueil({ partie }: { partie: Extract<Partie, { etat: 'prete' }> }) {
  // Seul ce bloc se rafraîchit chaque seconde, pas les dessins des timbres du deck.
  const paquets = useStockDePaquets(partie)!;
  const prix = EQUILIBRAGE.paquets.prixEnEncre;
  const peutAcheter = partie.sauvegarde.encre >= prix;
  const disponible = paquets.stock > 0 || peutAcheter;
  return (
    <section className="accueil-pole" aria-labelledby="titre-paquets">
      <header className="accueil-pole__entete"><h2 id="titre-paquets">Les paquets</h2><p>{EQUILIBRAGE.paquets.emplacements.length} timbres à découvrir</p></header>
      <div className="accueil-pole__illustration"><Enveloppe /></div>
      <p className="accueil-pole__bilan"><strong>{paquets.stock}</strong> / {paquets.maximum} paquet{paquets.stock > 1 ? 's' : ''} disponible{paquets.stock > 1 ? 's' : ''}</p>
      {disponible
        ? <a className="bouton accueil-pole__action" href={lien({ ecran: 'paquet' })}>{paquets.stock > 0 ? 'Ouvrir un paquet' : `Un paquet — ${prix} Encre`}</a>
        : <button className="bouton accueil-pole__action" type="button" disabled>En attente d’un paquet</button>}
      <div className="accueil-pole__suite">
        <p className="accueil-pole__note">{paquets.attente === null ? 'Réserve pleine' : <>Prochain paquet dans <span className="accueil-compte-a-rebours" role="timer">{enMinutesEtSecondes(paquets.attente)}</span></>}</p>
        {paquets.stock > 0 && peutAcheter
          ? <a className="accueil-lien accueil-pole__detail" href={lien({ ecran: 'paquet' })}>Un paquet avec {prix} Encre</a>
          : !peutAcheter && <p className="accueil-pole__detail">Encore {(prix - partie.sauvegarde.encre).toLocaleString('fr-FR')} Encre pour un paquet supplémentaire.</p>}
      </div>
    </section>
  );
}
