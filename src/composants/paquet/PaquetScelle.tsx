import { usePartie } from '../usePartie.ts';
import { PaquetDeCeremonie } from '../ceremonie/PaquetDeCeremonie.tsx';

// Le paquet scellé des aperçus (Profil, Formules) : depuis la refonte, c'est le paquet de la cérémonie.
export function PaquetScelle({ modele }: { modele?: string } = {}) {
  const partie = usePartie();
  const choix = modele ?? (partie.etat === 'prete' ? partie.sauvegarde.profil.paquet : 'original');
  return <PaquetDeCeremonie modele={choix} vivant={false} className="paquet-scelle" />;
}
