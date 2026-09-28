// Le nom d'un joueur au marché (vendeur, acheteur) : un toucher ouvre sa fiche. Un joueur simulé y est dit tel
// (décision de Raphaël du 28/09/2026 : la mention « Joueur simulé » est sur sa fiche, pas sur chaque vente).

import { demanderConfirmation } from '../../composants/Confirmation.tsx';
import { lienDeSignalement } from '../../composants/legal/signalement.ts';

export function NomDuJoueur({ pseudo, simule }: { pseudo: string; simule: boolean }) {
  const ouvrir = (): void => {
    void demanderConfirmation({
      seul: true, surtitre: simule ? 'Joueur simulé' : 'Collectionneur', titre: pseudo, confirmer: 'Fermer',
      message: simule
        ? 'Un des joueurs créés par Philamots pour animer le marché tant qu’il y a peu de monde : il vend des timbres neufs, et rachète parfois une vente restée sans mise. Ses ventes ne comptent pas dans la cote.'
        : 'Un collectionneur de Philamots, comme toi.',
      // Un vrai joueur peut être signalé (pseudonyme déplacé, comportement) : décision de Raphaël du 28/09/2026.
      lien: simule ? undefined : { texte: 'Signaler ce pseudonyme', href: lienDeSignalement({ genre: 'joueur', nom: pseudo }) },
    });
  };
  return <button type="button" className="nom-du-joueur" onClick={ouvrir}>{pseudo}</button>;
}
